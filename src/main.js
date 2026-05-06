import { Actor } from 'apify';
import { PuppeteerCrawler, log } from 'crawlee';
import puppeteerExtra from 'puppeteer-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';

import { router } from './routes.js';
import {
    LABELS,
    SEARCH_URL_TEMPLATE,
    randomUserAgent,
    NAVIGATION_TIMEOUT,
    REQUEST_HANDLER_TIMEOUT,
    MAX_RETRIES,
} from './constants.js';
import { buildCityQueries } from './urlBuilder.js';

// Register stealth plugin to evade bot detection
puppeteerExtra.use(stealthPlugin());

await Actor.init();

// ========== INPUT VALIDATION ==========

const input = (await Actor.getInput()) || {};
const {
    scrapeMode = 'deep',
    city = '',
    businessType = '',
    searchQueries = [],
    placeUrls = [],
    maxResults = 20,
    language = 'en',
    deepScrape = true,
    debugSelectors = false,
    maxConcurrency = 3,
} = input;

// ========== INPUT VALIDATION ==========

if ((city.trim() && !businessType.trim()) || (!city.trim() && businessType.trim())) {
    throw new Error('Both "city" and "businessType" must be provided together. Example: { "city": "Hyderabad", "businessType": "dentist" }');
}

// ========== BUILD REQUEST LIST ==========

const requests = [];

// Priority 1: City + BusinessType → auto-expand to area searches
if (city.trim() && businessType.trim()) {
    const areaUrls = buildCityQueries(businessType.trim(), city.trim(), language);
    log.info(`City mode: "${businessType}" in "${city}" → ${areaUrls.length} area queries (scrapeMode: ${scrapeMode})`);
    for (const { url, searchString } of areaUrls) {
        requests.push({
            url,
            label: LABELS.SEARCH_RESULTS,
            userData: { searchQuery: searchString, maxResults, scrapeMode, deepScrape, debugSelectors },
        });
    }
}

// Priority 2: Search queries → direct search
for (const query of searchQueries) {
    requests.push({
        url: SEARCH_URL_TEMPLATE(query, language),
        label: LABELS.SEARCH_RESULTS,
        userData: { searchQuery: query, maxResults, scrapeMode, deepScrape, debugSelectors },
    });
}

// Priority 3: Place URLs → always deep, direct profile scrape
for (const url of placeUrls) {
    requests.push({
        url,
        label: LABELS.PLACE_DETAIL,
        userData: { deepScrape: true, debugSelectors },
    });
}

if (requests.length === 0) {
    throw new Error(
        'No input provided. Use one of:\n' +
        '  1. "city" + "businessType" (e.g., "Hyderabad" + "dentist") → auto-expands to all areas\n' +
        '  2. "searchQueries" (e.g., ["restaurants in Austin, TX"]) → direct search\n' +
        '  3. "placeUrls" (direct Google Maps place URLs) → full profile scrape',
    );
}

log.info(`Starting GBP Scraper — ${requests.length} total requests (mode: ${scrapeMode})`);
log.info(`Settings: maxResults=${maxResults}, language=${language}, scrapeMode=${scrapeMode}, deepScrape=${deepScrape}`);

// ========== CONFIGURE CRAWLER ==========

// RESIDENTIAL proxy — real IPs, Google treats as real user
let proxyConfiguration = null;
try {
    proxyConfiguration = await Actor.createProxyConfiguration({
        groups: ['RESIDENTIAL'],
        countryCode: 'US',
    });
    log.info('Using RESIDENTIAL proxy (US) — $8/GB');
} catch (err) {
    log.warning(`Residential failed: ${err.message} — trying datacenter`);
    try {
        proxyConfiguration = await Actor.createProxyConfiguration({ groups: ['BUYPROXIES94952'] });
        log.info('Fallback: BUYPROXIES94952');
    } catch { log.warning('No proxy'); }
}

const crawler = new PuppeteerCrawler({
    requestHandler: router,
    ...(proxyConfiguration ? { proxyConfiguration } : {}),
    launchContext: {
        launcher: puppeteerExtra,
        launchOptions: {
            headless: 'new',
            ignoreDefaultArgs: ['--enable-automation'], // Critical: hides "Chrome is being controlled"
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-infobars',
                '--enable-gpu',
                '--use-gl=egl',
                '--enable-webgl',
                '--window-size=1920,1080',
                '--window-position=0,0',
                '--disable-blink-features=AutomationControlled',
                `--lang=${language}`,
            ],
        },
        useChrome: true,
    },
    maxRequestRetries: MAX_RETRIES,
    maxConcurrency,
    navigationTimeoutSecs: NAVIGATION_TIMEOUT / 1000,
    requestHandlerTimeoutSecs: REQUEST_HANDLER_TIMEOUT / 1000,

    preNavigationHooks: [
        async ({ page, request }) => {
            // CDP patch: hide navigator.webdriver on every new page
            await page.evaluateOnNewDocument(() => {
                Object.defineProperty(navigator, 'webdriver', { get: () => false });
                Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
                Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
                window.chrome = { runtime: {} };
            });

            await page.setUserAgent(randomUserAgent());
            await page.setViewport({ width: 1920, height: 1080 });
            await page.setExtraHTTPHeaders({
                'Accept-Language': `${language},en;q=0.9`,
            });

            // ========== COST OPTIMIZATION: Block heavy resources ==========
            // Google Maps loads ~5-10 MB per page (images, map tiles, fonts, ads).
            // We don't need any of those — only HTML + JS for the data extraction.
            // Blocking saves ~70-80% of proxy bandwidth which is the main cost.
            //
            // For deep mode (PLACE_DETAIL), we DO need photo URLs from the page,
            // so we keep `image` requests but block them at runtime AFTER we've
            // already extracted URLs from the rendered DOM/API. For SEARCH_RESULTS
            // we're aggressive — block everything heavy.
            const isQuickMode = request.userData?.scrapeMode === 'quick' || request.label === 'SEARCH_RESULTS';

            if (!page._gbpInterceptionSet) {
                page._gbpInterceptionSet = true;
                await page.setRequestInterception(true);
                page.on('request', (req) => {
                    const type = req.resourceType();
                    const url = req.url();

                    // Always block: ads, analytics, fonts, media, websockets, manifest
                    if (
                        type === 'font' ||
                        type === 'media' ||
                        type === 'manifest' ||
                        type === 'websocket' ||
                        type === 'eventsource' ||
                        url.includes('doubleclick.net') ||
                        url.includes('googletagmanager.com') ||
                        url.includes('google-analytics.com') ||
                        url.includes('googleadservices.com') ||
                        url.includes('googlesyndication.com') ||
                        url.includes('adservice.google') ||
                        url.includes('beacon.gstatic.com') ||
                        url.includes('/maps/vt/')   // Google Maps map tiles — huge bandwidth, not needed
                    ) {
                        req.abort();
                        return;
                    }

                    // For QUICK mode (search results): block all images
                    // Keep stylesheets (some selectors depend on CSS-rendered state).
                    if (isQuickMode) {
                        if (type === 'image') {
                            req.abort();
                            return;
                        }
                    } else {
                        // For DEEP mode: block large image content but allow tiny thumbnails
                        // (we need photo URLs from img.src). Don't block stylesheets — review
                        // dropdown menus need them to detect open/closed state.
                        if (type === 'image' && url.includes('googleusercontent.com')) {
                            // Allow loading photo URLs (small thumbnails) — they appear in DOM
                            // but block large profile photos that come in via /=w800-h600
                            if (url.match(/=w[5-9]\d{2,}/) || url.match(/=s[5-9]\d{2,}/)) {
                                req.abort();
                                return;
                            }
                        }
                    }

                    req.continue();
                });
            }
        },
    ],

    failedRequestHandler: async ({ request, log }, error) => {
        log.error(`Request failed after ${MAX_RETRIES} retries: ${request.url}`, {
            error: error?.message,
        });
    },
});

// ========== RUN ==========

await crawler.addRequests(requests);
await crawler.run();

log.info('Scraping complete.');
await Actor.exit();
