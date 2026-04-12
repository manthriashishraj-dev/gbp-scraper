export const SELECTOR_VERSION = '2026-04-12-v1';

export const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
];

export const DELAY = {
    MIN: 2000,
    MAX: 5000,
    SCROLL_PAUSE: 1500,
    CLICK_PAUSE: 800,
};

export const GOOGLE_MAPS_BASE_URL = 'https://www.google.com/maps';

export const SEARCH_URL_TEMPLATE = (query, lang = 'en') =>
    `https://www.google.com/maps/search/${encodeURIComponent(query)}/?hl=${lang}`;

export const LABELS = {
    SEARCH_RESULTS: 'SEARCH_RESULTS',
    PLACE_DETAIL: 'PLACE_DETAIL',
};

export const MAX_RETRIES = 3;
export const NAVIGATION_TIMEOUT = 120000;  // 2 min — residential proxy is slower
export const REQUEST_HANDLER_TIMEOUT = 600000;  // 10 min — deep scrape with KP + photos + website

export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function randomDelay() {
    const ms = DELAY.MIN + Math.random() * (DELAY.MAX - DELAY.MIN);
    return sleep(ms);
}

export function randomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export function randomScrollDelay() {
    return sleep(DELAY.SCROLL_PAUSE + Math.random() * 1000);
}
