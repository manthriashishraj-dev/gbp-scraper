import { createPuppeteerRouter } from 'crawlee';
import { Actor } from 'apify';
import { SELECTORS, resolveSelector, resolveSelectorAll } from './selectors.js';
import { LABELS, sleep, randomDelay, DELAY } from './constants.js';
import { extractAllPlaceData } from './extractors.js';
import { auditSelectors, captureDebugScreenshot } from './selectorDebugger.js';

export const router = createPuppeteerRouter();

// Track whether debug has been run (only run once)
let selectorDebugDone = false;

// ========== SEARCH RESULTS HANDLER ==========

router.addHandler(LABELS.SEARCH_RESULTS, async ({ page, request, log, crawler }) => {
    const { searchQuery, maxResults = 20, deepScrape = false, debugSelectors = false } = request.userData;

    log.info(`Processing search query: "${searchQuery}" (maxResults: ${maxResults})`);

    // Handle cookie consent
    await handleCookieConsent(page, log);

    // Wait for the search results feed to load
    const { element: feed } = await resolveSelector(page, SELECTORS.searchResults.feedContainer, {
        waitFor: true,
        timeout: 60000,
        log,
    });

    if (!feed) {
        log.error('Search results feed not found. The page may not have loaded correctly.');
        return;
    }

    await randomDelay();

    // Scroll to load results up to maxResults
    await scrollSearchResults(page, maxResults, log);

    // Extract listing URLs
    const listingEls = await resolveSelectorAll(page, SELECTORS.searchResults.listingLink, { log });
    const urls = [];

    for (const el of listingEls.slice(0, maxResults)) {
        try {
            const href = await el.evaluate((a) => a.href);
            if (href && href.includes('/maps/place/')) {
                urls.push(href);
            }
        } catch {
            // Skip invalid element
        }
    }

    log.info(`Found ${urls.length} listings for query "${searchQuery}"`);

    // Enqueue each listing for detailed scraping
    const requests = urls.map((url) => ({
        url,
        label: LABELS.PLACE_DETAIL,
        userData: { searchQuery, deepScrape, debugSelectors },
    }));

    await crawler.addRequests(requests);
});

// ========== PLACE DETAIL HANDLER ==========

router.addHandler(LABELS.PLACE_DETAIL, async ({ page, request, log, pushData }) => {
    const { deepScrape = false, debugSelectors = false, searchQuery = null } = request.userData;

    log.info(`Scraping place: ${request.url}`);

    // Handle cookie consent
    await handleCookieConsent(page, log);

    // Wait for the business name to confirm the page loaded
    const { element: nameEl } = await resolveSelector(page, SELECTORS.placeDetail.businessName, {
        waitFor: true,
        timeout: 60000,
        log,
    });

    if (!nameEl) {
        // Take debug screenshot to see what the page looks like
        try {
            const screenshot = await page.screenshot({ fullPage: false, type: 'png' });
            await Actor.setValue('DEBUG_PAGE_LOAD_FAILED', screenshot, { contentType: 'image/png' });
            log.info('Debug screenshot saved as DEBUG_PAGE_LOAD_FAILED');
        } catch { /* */ }
        log.error('Business name not found — page may not have loaded. Will retry.');
        throw new Error('Place page did not load properly');
    }

    // Anti-bot: random delay + human-like scrolling
    await randomDelay();
    await humanScroll(page);

    // Debug: save screenshot of what the page looks like after load
    try {
        const screenshot = await page.screenshot({ fullPage: false, type: 'png' });
        await Actor.setValue('DEBUG_PAGE_AFTER_LOAD', screenshot, { contentType: 'image/png' });
        log.info('Debug screenshot saved as DEBUG_PAGE_AFTER_LOAD');
        // Also log the current URL and some DOM info
        const debugInfo = await page.evaluate(() => ({
            url: window.location.href.substring(0, 150),
            title: document.title,
            h1: document.querySelector('h1')?.textContent?.trim()?.substring(0, 80),
            tabCount: document.querySelectorAll('.hh2c6').length,
            reviewIdCount: document.querySelectorAll('[data-review-id]').length,
            bodyTextStart: document.body.innerText.substring(0, 200),
        }));
        log.info(`Debug DOM: ${JSON.stringify(debugInfo)}`);
    } catch { /* */ }

    // Run selector debug audit on first page only
    if (debugSelectors && !selectorDebugDone) {
        try {
            log.info('Running selector health audit...');
            const report = await auditSelectors(page, log);
            await Actor.setValue('SELECTOR_HEALTH_REPORT', report);
            log.info('Selector health report saved to key-value store as SELECTOR_HEALTH_REPORT');
            selectorDebugDone = true;
        } catch (err) {
            log.warning(`Selector audit failed: ${err.message}`);
        }
    }

    // Extract all data
    const data = await extractAllPlaceData(page, log, deepScrape);

    // Add selector health summary if debug mode
    let selectorHealthSummary = null;
    if (debugSelectors) {
        try {
            const report = await Actor.getValue('SELECTOR_HEALTH_REPORT');
            if (report) {
                selectorHealthSummary = {
                    healthy: report.healthy,
                    fallback: report.fallbackUsed,
                    broken: report.broken,
                };
            }
        } catch {
            // Non-critical
        }
    }

    // Push to dataset
    await pushData({
        ...data,
        selectorHealthSummary,
        sourceUrl: request.url,
        searchQuery,
    });

    log.info(`Scraped: ${data.name || 'Unknown'} — ${data.fullAddress || request.url}`);
});

// ========== DEFAULT HANDLER (fallback) ==========

router.addDefaultHandler(async ({ page, request, log }) => {
    log.warning(`Unhandled route for URL: ${request.url}. Skipping.`);
});

// ========== HELPER FUNCTIONS ==========

async function handleCookieConsent(page, log) {
    try {
        const { element: btn } = await resolveSelector(page, SELECTORS.cookieConsent.acceptButton, {
            timeout: 3000,
        });
        if (btn) {
            await btn.click();
            log.info('Dismissed cookie consent dialog.');
            await sleep(1000);
        }
    } catch {
        // No consent dialog present — continue
    }
}

async function humanScroll(page) {
    try {
        const scrollDistance = 300 + Math.floor(Math.random() * 400);
        await page.evaluate((dist) => window.scrollBy(0, dist), scrollDistance);
        await sleep(500 + Math.random() * 500);
        // Scroll back slightly (human-like behavior)
        const scrollBack = 30 + Math.floor(Math.random() * 50);
        await page.evaluate((dist) => window.scrollBy(0, -dist), scrollBack);
        await sleep(300 + Math.random() * 300);
    } catch {
        // Non-critical
    }
}

async function scrollSearchResults(page, maxResults, log) {
    let previousCount = 0;
    let stuckIterations = 0;

    for (let i = 0; i < 100; i++) {
        // Count current listings
        const currentLinks = await page.$$(SELECTORS.searchResults.listingLink.primary);
        const currentCount = currentLinks.length;

        if (currentCount >= maxResults) {
            log.info(`Reached maxResults (${maxResults}), found ${currentCount} listings. Stopping scroll.`);
            break;
        }

        // Check for end-of-results marker
        const endMarker = await page.$(SELECTORS.searchResults.endOfResults.primary);
        if (endMarker) {
            log.info(`Reached end of search results with ${currentCount} listings.`);
            break;
        }

        // Scroll the feed container
        await page.evaluate(() => {
            const feed = document.querySelector('div[role="feed"]') ||
                document.querySelector('.m6QErb[aria-label]');
            if (feed) {
                feed.scrollTo(0, feed.scrollHeight);
            }
        });

        await sleep(DELAY.SCROLL_PAUSE + Math.random() * 1000);

        if (currentCount === previousCount) {
            stuckIterations++;
            if (stuckIterations >= 5) {
                log.info(`Scroll appears stuck after ${stuckIterations} attempts with ${currentCount} listings. Stopping.`);
                break;
            }
        } else {
            stuckIterations = 0;
        }
        previousCount = currentCount;
    }
}
