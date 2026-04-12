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

// Use GOOGLE_SERP proxy — $0.0025/search, works for both Maps and Search
// This proxy is specifically designed for Google pages and won't get CAPTCHA'd
let proxyConfiguration = null;
try {
    proxyConfiguration = await Actor.createProxyConfiguration({
        groups: ['GOOGLE_SERP'],
    });
    log.info('Using GOOGLE_SERP proxy ($0.0025/page)');
} catch (err) {
    log.warning(`GOOGLE_SERP proxy failed: ${err.message} — trying BUYPROXIES94952`);
    try {
        proxyConfiguration = await Actor.createProxyConfiguration({
            groups: ['BUYPROXIES94952'],
        });
        log.info('Using BUYPROXIES94952 datacenter proxy');
    } catch {
        log.warning('No proxy available — running without proxy');
    }
}

const crawler = new PuppeteerCrawler({
    requestHandler: router,
    ...(proxyConfiguration ? { proxyConfiguration } : {}),
    launchContext: {
        launcher: puppeteerExtra,
        launchOptions: {
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
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
            // Set a random user agent before each navigation
            await page.setUserAgent(randomUserAgent());

            // Set viewport to a common desktop resolution
            await page.setViewport({ width: 1366, height: 768 });

            // Set accept-language header
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
