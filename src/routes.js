import { createPuppeteerRouter } from 'crawlee';
import { Actor } from 'apify';
import { SELECTORS, resolveSelector } from './selectors.js';
import { LABELS, sleep, randomDelay } from './constants.js';
import { SELECTOR_VERSION } from './selectors.js';
import { parsePreviewPlaceResponse, extractBusinessFromApi, extractReviewsFromApi } from './apiExtractor.js';
import { extractWebsiteInfo, extractFullKnowledgePanel } from './extractors.js';

export const router = createPuppeteerRouter();

// ========== SEARCH RESULTS HANDLER ==========

router.addHandler(LABELS.SEARCH_RESULTS, async ({ page, request, log, crawler }) => {
    const { searchQuery, maxResults = 20, deepScrape = false, debugSelectors = false } = request.userData;

    log.info(`Processing search query: "${searchQuery}" (maxResults: ${maxResults})`);

    // Wait for feed
    await page.waitForSelector('div[role="feed"], .m6QErb[aria-label]', { timeout: 30000 }).catch(() => null);
    await randomDelay();

    // Scroll to load results
    let prevCount = 0;
    let stuck = 0;
    for (let i = 0; i < 100; i++) {
        const links = await page.$$('a.hfpxzc');
        if (links.length >= maxResults) break;
        if (links.length === prevCount) { stuck++; if (stuck >= 5) break; } else { stuck = 0; }
        prevCount = links.length;
        await page.evaluate(() => {
            const feed = document.querySelector('div[role="feed"]');
            if (feed) feed.scrollTo(0, feed.scrollHeight);
        });
        await sleep(1500);
    }

    // Extract listing URLs
    const urls = await page.$$eval('a.hfpxzc', (els) => els.map(el => el.href).filter(Boolean));
    log.info(`Found ${urls.length} listings for "${searchQuery}"`);

    await crawler.addRequests(urls.slice(0, maxResults).map((url) => ({
        url,
        label: LABELS.PLACE_DETAIL,
        userData: { searchQuery, deepScrape, debugSelectors },
    })));
});

// ========== PLACE DETAIL HANDLER (API INTERCEPTION) ==========

router.addHandler(LABELS.PLACE_DETAIL, async ({ page, request, log, pushData }) => {
    const { deepScrape = false, searchQuery = null } = request.userData;

    log.info(`Scraping place: ${request.url}`);

    // ===== STEP 1: Intercept the /maps/preview/place API response =====
    let apiResponseText = null;
    page.on('response', async (response) => {
        if (response.url().includes('preview/place')) {
            try {
                apiResponseText = await response.text();
            } catch { /* response body not available */ }
        }
    });

    // Navigate to the Maps page
    await page.goto(request.url, { waitUntil: 'networkidle2', timeout: 120000 });
    await sleep(3000);

    // ===== STEP 2: Parse the API response =====
    let business = null;
    let reviews = null;

    if (apiResponseText) {
        log.info(`Got preview/place API response: ${apiResponseText.length} chars`);

        const placeData = parsePreviewPlaceResponse(apiResponseText);
        if (placeData) {
            business = extractBusinessFromApi(placeData);
            reviews = extractReviewsFromApi(placeData);
            log.info(`API extraction: name=${business?.name?.substring(0, 40)}, rating=${business?.rating}, reviewCount=${business?.reviewCount}, reviews=${reviews?.length || 0}`);
        }
    } else {
        log.warning('No preview/place API response captured — falling back to DOM scraping');
        // Fallback: basic DOM scraping for name, address, phone
        business = {
            name: await page.$eval('h1', el => el.textContent?.trim()).catch(() => null),
            fullAddress: await page.$eval('button[data-item-id="address"]', el => el.textContent?.trim()).catch(() => null),
            phone: await page.$eval('button[data-item-id^="phone:"]', el => el.textContent?.trim()).catch(() => null),
            website: await page.$eval('a[data-item-id="authority"]', el => el.href).catch(() => null),
            latitude: null,
            longitude: null,
        };
        // Parse coordinates from URL
        const coordMatch = page.url().match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (coordMatch) {
            business.latitude = parseFloat(coordMatch[1]);
            business.longitude = parseFloat(coordMatch[2]);
        }
    }

    if (!business?.name) {
        log.error('No business data extracted — page may not have loaded');
        throw new Error('No business data');
    }

    // ===== STEP 3: Knowledge Panel (description, social, posts) =====
    let kp = { description: null, socialProfiles: [], thirdPartyRatings: [], kpPosts: [], kpReviewSnippets: [] };
    if (business.name) {
        log.info('Extracting Knowledge Panel data...');
        for (let attempt = 1; attempt <= 3; attempt++) {
            kp = await extractFullKnowledgePanel(page, log, business.name);
            if (kp.description || kp.socialProfiles.length > 0) {
                log.info(`KP succeeded on attempt ${attempt}`);
                break;
            }
            if (attempt < 3) {
                log.warning(`KP attempt ${attempt} empty — retrying...`);
                await sleep(2000);
            }
        }
    }

    // Use KP description if API didn't have it
    if (!business.description && kp.description) {
        business.description = kp.description;
    }

    // ===== STEP 4: Website check =====
    let websiteInfo = null;
    if (business.website) {
        log.info('Checking website speed & schema...');
        websiteInfo = await extractWebsiteInfo(page, log, business.website);
    }

    // ===== STEP 5: Build review metadata =====
    let reviewsMeta = null;
    if (reviews && reviews.length > 0) {
        const withReply = reviews.filter(r => r.ownerResponseText).length;
        reviewsMeta = {
            totalReviewsOnProfile: business.reviewCount,
            reviewsExtracted: reviews.length,
            gotAllReviews: reviews.length >= (business.reviewCount || 0),
            newestReviewDate: reviews[0]?.date || null,
            oldestReviewDate: reviews[reviews.length - 1]?.date || null,
            missingReviews: Math.max(0, (business.reviewCount || 0) - reviews.length),
            ownerRepliedCount: withReply,
            ownerNotRepliedCount: reviews.length - withReply,
            ownerReplyRate: `${withReply}/${reviews.length}`,
            ownerReplyRatePercent: reviews.length > 0 ? Math.round((withReply / reviews.length) * 100) : 0,
            starBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        };
        for (const r of reviews) {
            if (r.rating >= 1 && r.rating <= 5) reviewsMeta.starBreakdown[r.rating]++;
        }
    }

    // ===== STEP 6: Build audit metrics =====
    const descLen = business.description?.length || 0;
    const auditMetrics = {
        descriptionLength: descLen,
        hasDescription: descLen > 0,
        secondaryCategoriesCount: business.additionalCategories?.length || 0,
        reviewCount: business.reviewCount,
        rating: business.rating,
        replyRatePercent: reviewsMeta?.ownerReplyRatePercent || null,
        hoursCompleteness: business.weeklyHours ? Object.keys(business.weeklyHours).length >= 7 ? 'All 7 days set' : 'Some days' : 'No hours set',
        websiteSpeed: websiteInfo?.websiteSpeed || null,
        hasSchemaMarkup: websiteInfo?.hasSchemaMarkup || false,
        isHttps: websiteInfo?.isHttps || false,
    };

    // ===== PUSH FINAL OUTPUT =====
    const output = {
        ...business,
        reviews: reviews || null,
        reviewsMeta,
        socialProfiles: kp.socialProfiles,
        thirdPartyRatings: kp.thirdPartyRatings,
        kpPosts: kp.kpPosts,
        kpReviewSnippets: kp.kpReviewSnippets,
        websiteInfo,
        auditMetrics,
        selectorVersion: SELECTOR_VERSION,
        scrapedAt: new Date().toISOString(),
        sourceUrl: request.url,
        searchQuery,
    };

    await pushData(output);
    log.info(`Scraped: ${business.name?.substring(0, 50)} — ${business.fullAddress?.substring(0, 50)}`);
});

// ========== DEFAULT HANDLER ==========

router.addDefaultHandler(async ({ request, log }) => {
    log.warning(`Unhandled route: ${request.url}`);
});
