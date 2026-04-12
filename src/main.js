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

// Register stealth plugin to evade bot detection
puppeteerExtra.use(stealthPlugin());

await Actor.init();

// ========== INPUT VALIDATION ==========

const input = (await Actor.getInput()) || {};
const {
    searchQueries = [],
    placeUrls = [],
    maxResults = 20,
    language = 'en',
    deepScrape = false,
    debugSelectors = false,
    maxConcurrency = 3,
} = input;

if (searchQueries.length === 0 && placeUrls.length === 0) {
    throw new Error(
        'At least one of "searchQueries" or "placeUrls" must be provided. ' +
        'Example: { "searchQueries": ["restaurants in Austin, TX"] } or ' +
        '{ "placeUrls": ["https://www.google.com/maps/place/..."] }',
    );
}

log.info(`Starting GBP Scraper — ${searchQueries.length} search queries, ${placeUrls.length} direct URLs`);
log.info(`Settings: maxResults=${maxResults}, language=${language}, deepScrape=${deepScrape}, debugSelectors=${debugSelectors}`);

// ========== BUILD REQUEST LIST ==========

const requests = [];

for (const query of searchQueries) {
    requests.push({
        url: SEARCH_URL_TEMPLATE(query, language),
        label: LABELS.SEARCH_RESULTS,
        userData: { searchQuery: query, maxResults, deepScrape, debugSelectors },
    });
}

for (const url of placeUrls) {
    requests.push({
        url,
        label: LABELS.PLACE_DETAIL,
        userData: { deepScrape, debugSelectors },
    });
}

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
