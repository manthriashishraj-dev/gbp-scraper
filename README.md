# Google Business Profile Scraper

An Apify Actor that scrapes comprehensive data from Google Business Profile (GBP) listings on Google Maps. Accepts search queries or direct place URLs and extracts all available business information.

## Features

- Scrape from **search queries** (e.g., "plumber in Mumbai") or **direct place URLs**
- Extract 50+ data fields per business listing
- **Deep scrape mode** for reviews, photos, and Q&A
- **Selector health monitoring** with debug mode and auto-heal hints
- Anti-bot measures: stealth plugin, randomized delays, UA rotation
- Automatic retry logic (3 retries per URL)

## Input Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `searchQueries` | string[] | `[]` | Google Maps search queries |
| `placeUrls` | string[] | `[]` | Direct Google Maps place URLs |
| `maxResults` | integer | `20` | Max listings per search query (1-120) |
| `language` | string | `"en"` | Language code for Google Maps |
| `deepScrape` | boolean | `false` | Scrape reviews, photos, Q&A in detail |
| `debugSelectors` | boolean | `false` | Run selector health audit |
| `maxConcurrency` | integer | `3` | Parallel browser pages (1-10) |

At least one of `searchQueries` or `placeUrls` must be provided.

## Usage Examples

### Search query mode

```json
{
  "searchQueries": ["restaurants in Austin, TX", "plumber in Mumbai"],
  "maxResults": 10,
  "deepScrape": false
}
```

### Direct URL mode

```json
{
  "placeUrls": [
    "https://www.google.com/maps/place/Example+Business/..."
  ],
  "deepScrape": true
}
```

### Debug selectors

```json
{
  "placeUrls": ["https://www.google.com/maps/place/..."],
  "debugSelectors": true
}
```

## Output Format

Each business listing is output as a JSON object to the default Apify dataset:

```json
{
  "name": "Joe's Coffee",
  "placeId": "ChIJ...",
  "cid": "12345678901234567890",
  "primaryCategory": "Coffee shop",
  "additionalCategories": ["Cafe", "Breakfast restaurant"],
  "fullAddress": "123 Main St, Austin, TX 78701, USA",
  "street": "123 Main St",
  "city": "Austin",
  "state": "TX",
  "zipCode": "78701",
  "country": "USA",
  "plusCode": "862G+V3 Austin, Texas",
  "latitude": 30.2672,
  "longitude": -97.7431,
  "phone": "+1 512-555-0123",
  "website": "https://joescoffee.com",
  "googleMapsUrl": "https://www.google.com/maps/place/...",
  "menuUrl": null,
  "orderUrls": [],
  "appointmentUrl": null,
  "rating": 4.5,
  "reviewCount": 1234,
  "ratingDistribution": { "5": 60, "4": 20, "3": 10, "2": 5, "1": 5 },
  "reviewHighlights": ["Great coffee", "Friendly staff"],
  "reviews": null,
  "priceLevel": "$$",
  "weeklyHours": { "Monday": "7 AM-5 PM", "Tuesday": "7 AM-5 PM" },
  "currentStatus": "Open",
  "temporarilyClosed": false,
  "permanentlyClosed": false,
  "coverPhotoUrl": "https://lh5.googleusercontent.com/...",
  "photoCount": 45,
  "photoUrls": null,
  "attributes": {
    "Service options": ["Dine-in", "Takeout", "Delivery"],
    "Accessibility": ["Wheelchair accessible entrance"]
  },
  "popularTimes": null,
  "liveVisitData": null,
  "description": "A cozy coffee shop in downtown Austin...",
  "fromTheBusiness": null,
  "identifiesAs": [],
  "peopleAlsoSearchFor": [{ "name": "...", "placeId": "...", "url": "..." }],
  "posts": null,
  "products": null,
  "services": null,
  "qna": null,
  "selectorVersion": "2026-04-12-v1",
  "selectorHealthSummary": null,
  "scrapedAt": "2026-04-12T14:30:00.000Z",
  "sourceUrl": "https://www.google.com/maps/place/...",
  "searchQuery": "coffee shops in Austin TX"
}
```

Fields return `null` when data is not available on the listing or when `deepScrape` is disabled.

## Selector Debug System

Google Maps frequently changes its DOM. This actor includes a built-in selector health monitoring system.

### How to use

1. Run with `debugSelectors: true`
2. Check the **SELECTOR_HEALTH_REPORT** in the Apify key-value store
3. The report shows which selectors are healthy, using fallbacks, or broken
4. Broken selectors include DOM snippets and suggested replacement selectors

### Health report format

```json
{
  "selectorVersion": "2026-04-12-v1",
  "totalSelectors": 47,
  "healthy": 41,
  "fallbackUsed": 3,
  "broken": 3,
  "details": [
    { "field": "placeDetail.businessName", "status": "OK", "usedSelector": "h1.DUwDvf" },
    { "field": "placeDetail.rating", "status": "FALLBACK", "usedSelector": "span.ceNzKf" },
    { "field": "placeDetail.popularTimes", "status": "BROKEN", "suggestedSelectors": ["..."] }
  ]
}
```

### Updating selectors

1. Edit `src/selectors.js` — update the `primary` or `fallbacks` for broken selectors
2. Bump `SELECTOR_VERSION` in `src/constants.js`
3. Test with `debugSelectors: true` to verify fixes

## Running Locally

```bash
npm install
echo '{ "searchQueries": ["coffee in Austin TX"], "maxResults": 3 }' > INPUT.json
APIFY_LOCAL_STORAGE_DIR=./storage npx apify-cli run -p
```

## Deploying to Apify

```bash
npx apify-cli push
```

## Limitations

- Google Maps may show CAPTCHAs for high-volume scraping. This actor does not solve CAPTCHAs — it relies on stealth and rate limiting to avoid them.
- Maximum ~120 results per search query (Google Maps limit).
- Selectors may break when Google updates their DOM. Use `debugSelectors` to identify and fix broken selectors.
- Popular times data requires the section to be visible on the page.
- Deep scrape mode is significantly slower due to additional page interactions.

## Project Structure

```
.actor/
  actor.json        - Apify actor metadata
  Dockerfile        - Docker build configuration
src/
  main.js           - Entry point, crawler setup
  routes.js         - Search results + place detail handlers
  extractors.js     - All data extraction functions
  selectors.js      - Centralized selector registry + utilities
  selectorDebugger.js - Selector health audit system
  constants.js      - Configuration, delays, user agents
INPUT_SCHEMA.json   - Apify input schema
package.json
README.md
```
