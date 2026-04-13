# GBP Scraper -- Architecture Guide

> Practical reference for maintaining and extending the Google Business Profile scraper.
> Last updated: 2026-04-13 | Selector version: `2026-04-12-v1`

---

## Table of Contents

1. [Overview](#1-overview)
2. [API Field Mapping](#2-api-field-mapping)
3. [DOM Selectors Used](#3-dom-selectors-used)
4. [Step-by-Step Scraping Flow](#4-step-by-step-scraping-flow)
5. [How to Update When Google Changes](#5-how-to-update-when-google-changes)
6. [How to Add New Fields](#6-how-to-add-new-fields)
7. [Key Tricks and Gotchas](#7-key-tricks-and-gotchas)

---

## 1. Overview

### Pipeline Diagram

```
                        +------------------+
                        |   Actor Input    |
                        |  (3 methods)     |
                        +--------+---------+
                                 |
                  +--------------+--------------+
                  |              |              |
          city+bizType     searchQueries    placeUrls
                  |              |              |
          urlBuilder.js     direct URL      direct URL
          (cityAreas.js)        |              |
                  |              |              |
                  +--------------+--------------+
                                 |
                       +---------v----------+
                       |      main.js       |
                       | PuppeteerCrawler   |
                       | + stealth plugin   |
                       | + residential proxy|
                       +---------+----------+
                                 |
                   +-------------+-------------+
                   |                           |
         SEARCH_RESULTS handler      PLACE_DETAIL handler
            (routes.js)                 (routes.js)
                   |                           |
          +--------+--------+        +---------+---------+
          |                 |        |                   |
       Quick Mode      Deep Mode     |                   |
       (card data)    (enqueue       |                   |
       10 fields       profiles)     |                   |
          |                 |        |                   |
          v                 +------->+                   |
       pushData()                    |                   |
                            +--------v--------+   +------v-------+
                            | API Interception|   | DOM Scraping |
                            | apiExtractor.js |   | extractors.js|
                            +---------+-------+   +------+-------+
                                      |                  |
                                      +--------+---------+
                                               |
                                      +--------v--------+
                                      |  Final Output   |
                                      | 62+ fields per  |
                                      | business        |
                                      +-----------------+
```

### Three Input Methods

| Method | Input Fields | What Happens |
|---|---|---|
| **City + Business Type** | `city`, `businessType` | Expands via `cityAreas.js` into one search per area (e.g., "dentist in Banjara Hills Hyderabad"). 43 cities, 700+ areas mapped. |
| **Search Queries** | `searchQueries[]` | Each query becomes a direct Google Maps search URL. |
| **Place URLs** | `placeUrls[]` | Bypasses search entirely. Each URL goes straight to PLACE_DETAIL. Always deep mode. |

### Two Scrape Modes

| Mode | Speed | Output Fields | What It Does |
|---|---|---|---|
| **Quick** | Fast (~2s/listing) | ~10 fields | Scrapes card data from search results feed. No profile visits. |
| **Deep** | Slow (~30-60s/listing) | 62+ fields | Visits each profile. Intercepts API. Loads reviews, photos, posts. Navigates to Google Search for KP. Checks website. |

Quick mode fields: `businessName`, `primaryCategory`, `address`, `rating`, `reviewCount`, `phone`, `googleMapsUrl`, `isOpen`, `rank`, `searchQuery`.

### Source File Responsibilities

| File | Role |
|---|---|
| `src/main.js` | Entry point. Input validation. Builds request list. Configures PuppeteerCrawler with stealth, proxies, anti-detection. |
| `src/routes.js` | Two handlers: SEARCH_RESULTS (scroll feed, extract cards, enqueue) and PLACE_DETAIL (API interception, reviews, photos, posts, KP, website). |
| `src/apiExtractor.js` | Parses `/maps/preview/place` API responses. 10 exported extraction functions covering 62+ fields across business data, reviews, photos, posts, attributes, popular times, services. |
| `src/extractors.js` | DOM-based extraction. Core info, ratings, hours, photos, popular times, owner photos, Knowledge Panel, website audit. Used as fallback and supplement to API data. |
| `src/selectors.js` | Central CSS selector registry. Every selector has `primary`, `fallbacks[]`, and `description`. Resolution utilities: `resolveSelector()`, `resolveSelectorAll()`, `resolveSelectorText()`. |
| `src/selectorDebugger.js` | Runs health audit against all registered selectors. Reports OK/FALLBACK/BROKEN status. Generates auto-heal hints for broken selectors. |
| `src/constants.js` | Config values: user agents (12), delays, timeouts (nav=2min, handler=10min), retry count (3), URL templates. |
| `src/cityAreas.js` | Maps 43 Indian cities (Tier 1/2/3) to 700+ constituent areas. Handles merged towns (e.g., Hanamkonda inside Warangal). |
| `src/urlBuilder.js` | `buildCityQueries()` expands city to area queries. `buildSearchUrls()` encodes queries to Maps URLs. `normaliseProfileUrl()` canonicalizes place URLs. |

---

## 2. API Field Mapping

All fields are extracted from the `/maps/preview/place` API response. After stripping the anti-XSSI prefix (`)]}'`) and `JSON.parse()`, the main business data lives at `placeData[6]`, referred to as `d` below.

### Core Business Fields

| d[N] Path | Field(s) | Function |
|---|---|---|
| `d[11]` | `name` | `extractBusinessFromApi()` |
| `d[78]` | `placeId` | `extractBusinessFromApi()` |
| `d[10]` | `featureId` (hex) | `extractBusinessFromApi()` |
| `d[89]` | `kgmId` (Knowledge Graph ID) | `extractBusinessFromApi()` |
| `d[13][0]` | `primaryCategory` | `extractBusinessFromApi()` |
| `d[13][1..]` | `additionalCategories` | `extractBusinessFromApi()` |
| `d[76]` | `categorySlugs` (e.g., `["dental_clinic",null,5]`) | `extractBusinessFromApi()` |
| `d[39]` | `fullAddress` | `extractBusinessFromApi()` |
| `d[2][0]` | `street` | `extractBusinessFromApi()` |
| `d[14]` | `neighborhood` | `extractBusinessFromApi()` |
| `d[82]` | parsed address parts (neighborhood, street, city) | `extractBusinessFromApi()` |
| `d[166]` | `city`, `state` (comma-separated string) | `extractBusinessFromApi()` |
| `d[243]` | `countryCode` | `extractBusinessFromApi()` |
| `d[9][2]` | `latitude` | `extractBusinessFromApi()` |
| `d[9][3]` | `longitude` | `extractBusinessFromApi()` |
| `d[178][0][1][1][0]` | `phone` (primary path) | `extractBusinessFromApi()` |
| `d[178][0][0]` | `phone` (fallback path) | `extractBusinessFromApi()` |
| `d[7][0]` | `website` | `extractBusinessFromApi()` |
| `d[7][1]` | `websiteDomain` | `extractBusinessFromApi()` |
| `d[154][0][0]` | `description` | `extractBusinessFromApi()` |
| `d[4][7]` | `rating` | `extractBusinessFromApi()` |
| `d[4][8]` | `reviewCount` | `extractBusinessFromApi()` |
| `d[4][3][0]` | `reviewsUrl` | `extractBusinessFromApi()` |
| `d[183][2][2][0]` | `plusCode` | `extractBusinessFromApi()` |
| `d[30]` | `timezone` | `extractBusinessFromApi()` |
| `d[88][1]` | `businessType` (e.g., `SearchResult.TYPE_DENTIST`) | `extractBusinessFromApi()` |
| `d[145][0]` | `ctaLabel` (e.g., "Plan your visit") | `extractBusinessFromApi()` |

### Owner and Status Fields

| d[N] Path | Field(s) | Function |
|---|---|---|
| `d[57][1]` | `ownerName` | `extractBusinessFromApi()` |
| `d[57][2]` | `ownerContributorId` | `extractBusinessFromApi()` |
| `d[43]` | `businessStatus` (1 = OPERATIONAL) | `extractBusinessFromApi()` |
| `d[96]` | closed status strings (serialized check for "temporarily_closed"/"permanently_closed") | `extractBusinessFromApi()` |
| `d[181][5]` | `cid` (decimal) | `extractBusinessFromApi()` |

### Booking, Orders, Appointments

| d[N] Path | Field(s) | Function |
|---|---|---|
| `d[75]` | `appointmentUrl`, `orderUrls` -- all booking/order links (Swiggy, Zomato, Practo, Booking.com, etc.) | `extractBusinessFromApi()` |
| `d[229][1]` | `appointmentSlots` | `extractBusinessFromApi()` |

### Photos and Media

| d[N] Path | Field(s) | Function |
|---|---|---|
| `d[37][1]` | `photoCount` | `extractBusinessFromApi()`, `extractPhotosFromApi()`, `extractPhotoMetaFromApi()` |
| `d[122]` | Main photo gallery (googleusercontent URLs, AF1Qip IDs) | `extractPhotosFromApi()` |
| `d[122][0][1]` | `coverPhotoUrl` | `extractBusinessFromApi()` |
| `d[122][1]` | Google Posts (business updates) with images | `extractPostsFromApi()` |
| `d[72]` | Owner photos (latest uploads/updates) | `extractPhotosFromApi()` |
| `d[157]` | `logoUrl` (fallback cover photo) | `extractBusinessFromApi()` |

### Hours

| d[N] Path | Field(s) | Function |
|---|---|---|
| `d[203]` | `hours` -- weekly schedule parsed into `{ Monday: "9 am - 9 pm", ... }` | `extractBusinessFromApi()` via `parseHours()` |

### Reviews

| d[N] Path | Field(s) | Function |
|---|---|---|
| `d[175]` | Reviews blob (entire review section) | `extractReviewsFromApi()` |
| `d[175][9][0][0]` | Array of individual review entries | `extractReviewsFromApi()` |
| `d[175][3][4]` | Total available review count | `extractReviewMetaFromApi()` |
| `d[31][1]` | `reviewSnippets` (highlighted text + keyword positions) | `extractBusinessFromApi()` |

Each review entry (`d[175][9][0][0][i][0]` = `r`) contains:

| r[N] Path | Field |
|---|---|
| `r[0]` | reviewId (base64 string) |
| `r[1][4][5][0]` | author display name |
| `r[1][4][5][1]` | author photo URL |
| `r[1][4][2][0]` | author profile URL |
| `r[1][6]` | human-readable date ("4 months ago") |
| `r[1][2]` | timestamp in microseconds |
| `r[2][0][0]` | star rating (1-5) |
| `r[2][15][0][0]` | review text |
| `r[2][14][0]` | language code |
| `r[3]` | owner response block (URLs for reply/delete-reply) |

### Attributes and Amenities

| d[N] Path | Field(s) | Function |
|---|---|---|
| `d[100][1]` | Attribute sections -- array of `[section_id, section_name, [items]]` | `extractAttributesFromApi()` |

Each attribute item: `[attr_path, attr_name, [has_flag, ...]]` where `has_flag[0]` = 1 means available.

### Popular Times

| d[N] Path | Field(s) | Function |
|---|---|---|
| `d[84][0]` | Array of 7 day entries, each with hourly busyness data | `extractPopularTimesFromApi()` |
| `d[84][6]` | Live busyness string (e.g., "Now: Usually a little busy") | `extractPopularTimesFromApi()` |

Each hour entry: `[hour, busynessPercent, label, "", displayHour, null, shortHour]`.

### Related Places

| d[N] Path | Field(s) | Function |
|---|---|---|
| `d[99][0][0][1]` | "People also search for" entries | `extractPeopleAlsoSearchFromApi()` |

Each related entry contains `data[11]` (name), `data[4][7]` (rating), `data[4][8]` (reviewCount), `data[13]` (category), `data[9][2..3]` (lat/lng).

### Services and Products

| d[N] Path | Field(s) | Function |
|---|---|---|
| `d[125][0][0][1]` | Service/product categories with items | `extractServicesFromApi()` |

Each item: `[[name, description], [price]]`.

### Nearby Landmarks

| d[N] Path | Field(s) | Function |
|---|---|---|
| `d[245][0]` | `nearbyLandmarks` -- array of `[null, relevance, [name]]` | `extractBusinessFromApi()` |

### Google Maps URL

| d[N] Path | Field(s) | Function |
|---|---|---|
| `d[96][10][1][0][0][2][1]` | `googleMapsUrl` (canonical) | `extractBusinessFromApi()` |

---

## 3. DOM Selectors Used

All selectors are defined in `src/selectors.js` with `primary` + `fallbacks[]`. The PLACE_DETAIL handler in `routes.js` uses these directly in `page.evaluate()` blocks.

### Review Selectors (DOM scraping in routes.js)

| Selector | Purpose | Context |
|---|---|---|
| `.jftiEf` | Individual review container | Review list parent |
| `.d4r55` | Reviewer display name | Inside `.jftiEf` |
| `.kvMYJc` | Star rating (aria-label has "N stars") | Inside `.jftiEf` |
| `span.wiI7pd` | Review body text (full, after "More" expansion) | Inside `.jftiEf` |
| `.CDe7pd` | Owner response block | Inside `.jftiEf` |
| `.CDe7pd .wiI7pd` | Owner response text | Inside owner block |
| `.DZSIDd` | Owner reply date | Inside `.CDe7pd` (NOT `.rsqaWe`) |
| `.rsqaWe` | Review date (reviewer's date, e.g., "2 months ago") | Inside `.jftiEf` |
| `.RfnDt` | Local Guide badge + level + review/photo counts | Inside `.jftiEf` |
| `button.w8nwRe` | "More" button to expand truncated review text | Inside `.jftiEf` |
| `button.WEBjve` | Reviewer profile link (data-href) | Inside `.jftiEf` |
| `img.NBa7we` | Reviewer avatar photo | Inside `.jftiEf` |
| `button.Tya61d img` | Photos attached to a review | Inside `.jftiEf` |

### Photo Selectors (routes.js gallery extraction)

| Selector | Purpose |
|---|---|
| `button.aoRNLd` | Cover photo button (click to enter gallery) |
| `a.OKAoZd` | Photo items in gallery grid |
| `.m6QErb.DxyBCb` | Scrollable gallery container |
| `[style*="background-image"]` | Photos rendered as CSS background images |
| `img[src*="googleusercontent"]` | Photos rendered as `<img>` elements |

### Tab Selectors

| Selector | Purpose |
|---|---|
| `button.hh2c6` | Tab buttons (Reviews, About, Overview, All, By owner) |
| `button.hh2c6[aria-label*="Reviews"]` | Reviews tab specifically |
| `button.hh2c6[aria-label*="About"]` | About tab for attributes |

### Sort Selectors

| Selector | Purpose |
|---|---|
| `button[aria-label*="Sort"]`, `button.g88MCb` | Sort reviews dropdown trigger |
| `div[data-index="1"]` | "Newest" sort option (data-index 0=Relevant, 1=Newest) |
| `div[role="menuitemradio"]` | Sort option items |

### Post Selectors

| Selector | Purpose |
|---|---|
| `button[aria-label="See local posts"]` | Opens post detail panel |
| Scrollable `div` detection (scrollHeight > clientHeight + 50) | Post panel pagination via scroll |

### Search Results Selectors

| Selector | Purpose |
|---|---|
| `div[role="feed"]` | Feed container holding search results |
| `a.hfpxzc` | Individual listing link in search results |
| `.Nv2PK` | Card container for each listing |
| `.MW4etd` | Rating value on card |
| `.UY7F9` | Review count on card |
| `.W4Efsd span` | Category, address, phone info lines |

---

## 4. Step-by-Step Scraping Flow

### SEARCH_RESULTS Handler

1. Wait for `div[role="feed"]` (30s timeout)
2. Scroll feed to load listings: check `a.hfpxzc` count vs `maxResults`, stuck detection after 5 unchanged rounds
3. Extract card data from each `.Nv2PK` container (name, rating, reviewCount, category, address, phone, isOpen, URL)
4. **Quick mode**: push card data directly with rank and timestamp
5. **Deep mode**: enqueue each URL as PLACE_DETAIL with cross-area dedup via `uniqueKey`

### PLACE_DETAIL Handler

This is the complex handler. Every step must happen in a specific order.

#### Step 1: API Interception Setup

```javascript
page.on('response', async (response) => {
    if (response.url().includes('preview/place')) {
        apiResponseText = await response.text();
    }
});
```

The interceptor captures the `/maps/preview/place` API response that Google sends when the page loads. This response contains nearly all business data.

#### Step 1b: Cookie Warmup Trick

The **first** navigation to Google Maps (cold, no cookies) returns a stripped response of ~42KB with NO reviews. After cookies are established, subsequent loads return the full ~98KB response WITH reviews.

```
First load:  ~42KB  -->  basic info only, no d[175] reviews
Reload:      ~98KB  -->  full data including reviews, rich attributes
```

Logic:
1. If `apiResponseText.length < 60000` --> reload the page
2. If still small after reload --> navigate to `google.com` first (warms cookies), then back to Maps
3. After warmup, the 98KB response arrives with complete data

#### Step 2: Parse API Response

1. `parsePreviewPlaceResponse()` -- strips anti-XSSI prefix, JSON.parse
2. `extractBusinessFromApi()` -- 62+ fields from `placeData[6]`
3. `extractReviewsFromApi()` -- reviews from `d[175][9][0][0]`
4. `extractPhotosFromApi()` -- photos from `d[122]`, `d[72]`, `d[37]`
5. `extractAttributesFromApi()` -- amenities from `d[100]`
6. `extractPopularTimesFromApi()` -- busyness from `d[84]`
7. `extractPeopleAlsoSearchFromApi()` -- related places from `d[99]`
8. `extractServicesFromApi()` -- services from `d[125]`
9. `extractPostsFromApi()` -- Google Posts from `d[122][1]`
10. `extractPhotoMetaFromApi()` -- photo dates and frequency from `d[37]`, `d[122][1]`

#### Step 3b: Reviews (Deep Scrape Only)

The API only returns ~8-10 reviews. To get ALL reviews, the scraper uses DOM scraping:

1. Navigate back to Maps place page
2. Click Reviews tab: `button.hh2c6` containing "Review"
3. Sort by Newest: click `button.g88MCb` --> select `div[data-index="1"]`
4. Scroll to load ALL reviews: loop up to 500 iterations, scrolling `.m6QErb.DxyBCb`, checking `.jftiEf` count against `reviewCount`
5. Expand all "More" buttons: `button.w8nwRe`
6. DOM scrape each `.jftiEf` element extracting 20 fields per review:

| Field | Selector |
|---|---|
| reviewId | `[data-review-id]` attribute |
| author | `.d4r55` |
| authorUrl | `button.WEBjve[data-href]` or `a[href*="contrib"]` |
| authorPhotoUrl | `img.NBa7we` |
| rating | `.kvMYJc` aria-label |
| date | `.rsqaWe` |
| text | `span.wiI7pd` |
| ownerResponseText | `.CDe7pd .wiI7pd` |
| ownerResponseDate | `.CDe7pd .DZSIDd` |
| isLocalGuide | `.RfnDt` text contains "Local Guide" |
| localGuideLevel | `.RfnDt` text match `Level N` |
| reviewPhotos | `button.Tya61d img` |
| likesCount | `button[aria-label*="like"]` |

#### Step 3b1.5: AI Review Summary

1. Switch to Overview tab: click `button.hh2c6` with text "Overview"
2. Scroll down to find review summary section
3. Extract AI summary from `.fontBodyMedium .PbZDve`
4. Extract "People mention" chips from `.KNfEk .uEubGf` / `.e2moi` / `button.GCxVpd`

#### Step 3b2: About Tab (Attributes Supplement)

Only runs if API `d[100]` returned no attributes:

1. Click About tab: `button.hh2c6` with text "About"
2. Scrape attribute sections: `.iP2t7d` containers, `.iNvpkb` headings, `.hpLkke` items

#### Step 3b3: Posts via Localposts API

1. Navigate back to Maps place page
2. Scroll overview to find posts section
3. Set up response interceptor for `preview/localposts`
4. Click `button[aria-label="See local posts"]` to open detail panel
5. Scroll the post detail panel (any div with scrollHeight > clientHeight + 50) for up to 200 iterations
6. Each scroll triggers a new `/maps/preview/localposts` API response
7. Parse each response (strip anti-XSSI, JSON.parse, recursive search for timestamp + text structures)
8. Dedup posts by `date|text` key, merge with API posts, sort by date descending

#### Step 3c: Photo Extraction

1. Navigate to Maps place page
2. Click cover photo: `button.aoRNLd`
3. Click "All" tab in gallery: `button.hh2c6` with text "All"
4. Scroll gallery: `.m6QErb.DxyBCb` for up to 200 iterations, checking `a.OKAoZd` count
5. Also scroll "By owner" tab
6. Extract all photo URLs from `[style*="background-image"]` and `img[src*="googleusercontent"]`
7. If `ownerContributorId` is known, navigate to contributor page (`/maps/contrib/{id}/photos`) and scrape there too
8. Dedup ALL photos by unique ID: `AF1Qip*` ID > `gps-cs-s/*` path > `/p/*` path > URL base
9. Filter out avatars (AAAAAAAAAAI), branding, and 1x product images
10. Upscale URLs: `=w1200-h900` or `=s1200`

#### Step 4: Knowledge Panel (MUST BE LAST Maps-based step)

**KP navigates AWAY from Maps to Google Search.** All Maps-based work must be done before this.

1. Navigate to `google.com`
2. Type business name in search box (humanized typing with delay)
3. Press Enter, wait for results
4. Click "More" on description: `[data-attrid="kc:/local:merchant_description"] button`
5. Extract from KP:
   - `description` -- from `[data-attrid="kc:/local:merchant_description"]`
   - `socialProfiles` -- from `[data-attrid*="social media"]` links
   - `thirdPartyRatings` -- from `[data-attrid*="third_party"]` (Justdial, Practo, Yelp, etc.)
   - `kpPosts` -- from `[data-attrid="kc:/local:posts"]` with exact dates
   - `kpReviewSnippets` -- from `[data-attrid*="review_summary"]`
   - `kpBusyness` -- from `[data-attrid*="busyness"]`
   - `kpAppointmentUrl` -- from `[data-attrid*="appointment"]`

#### Step 5: Website Audit

If the business has a website URL:

1. Navigate to the website
2. Measure load time (Fast <= 3s, Average <= 5s, Slow > 5s)
3. Get Performance API metrics (TTFB, domContentLoaded, domInteractive, fullyLoaded)
4. Extract JSON-LD and Microdata schema markup
5. Extract Open Graph tags
6. Extract meta title and description
7. Check HTTPS and mobile viewport

#### Step 6: Build Output

Assemble final object with all collected data:

```
business fields (62+)
  + reviews[] (20 fields per review)
  + reviewsMeta (reply rate, star breakdown, etc.)
  + photoData (URLs, counts, deduped)
  + socialProfiles (from KP)
  + thirdPartyRatings (from KP)
  + kpPosts, kpReviewSnippets (from KP)
  + websiteInfo (speed, schema, OG, meta)
  + auditMetrics (description length, reply rate, hours completeness, etc.)
  + mentionKeywords (frequency analysis of review text)
```

Push to Apify dataset via `pushData()`.

---

## 5. How to Update When Google Changes

### Quick Diagnosis

1. Run with `debugSelectors: true` in input
2. Check `SELECTOR_HEALTH_REPORT` in Apify key-value store
3. The report shows every selector as `OK`, `FALLBACK`, or `BROKEN`
4. Broken selectors include a DOM snippet and auto-generated selector hints

### Fixing DOM Selectors

1. Open `src/selectors.js`
2. Find the broken selector entry
3. Update the `primary` selector to match Google's new DOM
4. Move the old primary to `fallbacks[]` (so it works if Google reverts)
5. Bump `SELECTOR_VERSION` in `src/constants.js`:
   ```javascript
   export const SELECTOR_VERSION = '2026-04-13-v2';
   ```

### Fixing API Changes

The `/maps/preview/place` response is an unlabeled nested array. When Google changes the structure:

1. Run `test-approach3-explore-api.js` to scan all indices in a live response
2. Compare output against the current field mapping in `src/apiExtractor.js`
3. Find the new index for the moved field
4. Update the relevant `d[N]` path in `extractBusinessFromApi()` or the specific extractor
5. Every field extraction is wrapped in `try/catch`, so a single broken index never crashes the whole scraper

### Testing Changes

```bash
# Run with a single known place URL to verify changes
# Input: { "placeUrls": ["https://www.google.com/maps/place/..."], "debugSelectors": true }
```

Check the output dataset for completeness and compare field values against the Maps page.

---

## 6. How to Add New Fields

### Adding an API Field

1. **Find the index**: Run `test-approach3-explore-api.js` or manually inspect a response to find which `d[N]` holds the data you need.

2. **Add extraction** in `src/apiExtractor.js`:
   ```javascript
   // In extractBusinessFromApi(), add to biz object:
   biz.newField = null;
   
   // Then add the extraction:
   try { biz.newField = safeGet(d, NEW_INDEX, SUB_INDEX) ?? null; } catch { /* ignore */ }
   ```

3. **Add to output** in `src/routes.js`: The `output` object in PLACE_DETAIL already spreads `...business`, so any new field on the `biz` object is automatically included.

### Adding a DOM Field

1. **Add selector** in `src/selectors.js`:
   ```javascript
   newField: {
       primary: '.some-class',
       fallbacks: ['.alternate-class', '[aria-label*="something"]'],
       description: 'Description of what this selector targets',
   },
   ```

2. **Add extraction** in the appropriate `page.evaluate()` block in `src/routes.js` or `src/extractors.js`.

3. **Add to output** in the result object of the extraction function.

### Adding a New City

1. Open `src/cityAreas.js`
2. Add the city to `CITY_TIER` with appropriate tier (1/2/3)
3. Add the city key to `CITY_AREAS` with an array of area names:
   ```javascript
   newcity: [
       'Area1 NewCity', 'Area2 NewCity', 'Area3 NewCity',
   ],
   ```
4. If the city has alternate spellings, add alias entries:
   ```javascript
   alternate_name: null, // alias -- resolved in getAreasForCity
   ```

---

## 7. Key Tricks and Gotchas

### Anti-XSSI Prefix

All Google Maps API responses start with `)]}'\n`. This prevents JSON hijacking. Must strip before `JSON.parse()`:

```javascript
let cleaned = responseText;
if (cleaned.startsWith(')]}\'\n')) {
    cleaned = cleaned.slice(5);
}
const parsed = JSON.parse(cleaned);
```

### Cookie Warmup

The biggest gotcha in the scraper. The first navigation to Google Maps with a fresh session returns a stripped ~42KB response. The `d[175]` reviews blob is **completely absent**.

```
Cold session:   42KB response  --> no reviews, limited attributes
After cookies:  98KB response  --> full reviews, all data
```

The warmup logic in routes.js:
1. Check `apiResponseText.length < 60000`
2. If small, reload the page (cookies now set)
3. If still small, visit `google.com` first, then navigate back

### Review Sort Order

To get newest reviews first:

```javascript
// Click sort button
await page.$eval('button.g88MCb', btn => btn.click());
await sleep(1000);
// Select "Newest" (data-index="1")
await page.$eval('div[data-index="1"]', el => el.click());
```

`data-index` values: 0 = Most relevant, 1 = Newest, 2 = Highest rating, 3 = Lowest rating.

### Localposts Pagination

Google Posts are paginated via scroll-triggered API calls. There is no "next page" button. Scrolling the post detail panel triggers `/maps/preview/localposts` responses that contain additional posts.

### Photo Deduplication

Google serves the same photo from multiple URLs with different size parameters. Use the `AF1Qip` ID as the canonical dedup key:

```javascript
const af1 = url.match(/(AF1Qip[A-Za-z0-9_-]+)/);
const key = af1?.[1] || url.replace(/=.*$/, '');
```

Filter out non-photo URLs:
- `AAAAAAAAAAI` = default avatar/profile icon
- `branding` = Google branding assets
- `product/1x` = low-res product thumbnails

### Owner Reply Date Selector

The owner reply date is in `span.DZSIDd` inside the `.CDe7pd` block. Do **NOT** use `.rsqaWe` inside `.CDe7pd` -- that selector may match the reviewer's date instead of the reply date.

```javascript
// CORRECT
const ownerResponseDate = ownerBlock?.querySelector('.DZSIDd')?.textContent?.trim();

// WRONG -- may pick up reviewer date
const ownerResponseDate = ownerBlock?.querySelector('.rsqaWe')?.textContent?.trim();
```

### KP Must Be Last

The Knowledge Panel extraction navigates from Google Maps to Google Search. This destroys the Maps page context. Therefore:

1. Extract everything from Maps FIRST (reviews, photos, posts, attributes)
2. THEN do KP extraction
3. After KP, the scraper navigates to the business website for the audit

### Stealth and Anti-Detection

The scraper uses multiple layers to avoid detection:

- `puppeteer-extra-plugin-stealth` -- patches WebDriver detection
- `navigator.webdriver = false` via `evaluateOnNewDocument`
- Random user agents (12 Chrome variants rotated per page)
- Random delays between actions (2-5s)
- Residential proxies (US) as primary, datacenter as fallback
- `--disable-blink-features=AutomationControlled`
- Fake `navigator.plugins` and `navigator.languages`
- KP search uses typed input (not direct URL) for higher trust

### Timeout Configuration

| Setting | Value | Why |
|---|---|---|
| Navigation timeout | 120s (2 min) | Residential proxy is slower |
| Request handler timeout | 600s (10 min) | Deep scrape with reviews + photos + KP + website |
| Max retries | 3 | Balance between completeness and cost |
| Scroll pause | 1500ms | Enough for Google to load next batch |
| Click pause | 800ms | Mimics human interaction speed |

### Cross-Area Deduplication

When using city expansion, the same business may appear in multiple area searches. The scraper deduplicates using `uniqueKey`:

```javascript
uniqueKey: card.googleMapsUrl.split('?')[0]  // strip query params
```

This ensures each business profile is only scraped once regardless of how many area searches return it.
