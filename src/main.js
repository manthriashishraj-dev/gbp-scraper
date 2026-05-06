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
        async ({ page }) => {
            // CDP patch: hide navigator.webdriver on every new page
            await page.evaluateOnNewDocument(() => {
                Object.defineProperty(navigator, 'webdriver', { get: () => false });
                // Also hide Chrome automation indicators
                Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
                Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
                window.chrome = { runtime: {} };
            });

            await page.setUserAgent(randomUserAgent());
            await page.setViewport({ width: 1920, height: 1080 });
            await page.setExtraHTTPHeaders({
                'Accept-Language': `${language},en;q=0.9`,
            });
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
