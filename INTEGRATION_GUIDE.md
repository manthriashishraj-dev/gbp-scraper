# GBP Scraper — Complete Integration Guide

> Hand this document to any AI agent or developer to integrate the Google Business Profile scraper into an app.
> Last updated: 2026-04-21

---

## 1. What This Scraper Does

This is a Node.js Apify Actor that scrapes Google Business Profile (GBP) listings from Google Maps. It has **two modes**:

- **Quick mode**: Extracts 21 fields per business from search results. No profile visits. ~24 seconds per search. Cheap.
- **Deep mode**: Visits each profile individually. Extracts 62+ fields including all reviews, posts, photos, attributes, popular times, services, competitors, website audit. ~1.5-2.5 minutes per profile. More expensive.

**Works for all 300+ niches** — dentists, restaurants, hotels, gyms, salons, lawyers, etc. Same code, dynamic extraction.

---

## 2. Where It Lives

| Thing | Location |
|---|---|
| GitHub repo | https://github.com/manthriashishraj-dev/gbp-scraper.git |
| Apify Actor | https://console.apify.com/actors/e4bUd0goaGEZq8pwf |
| Actor ID | `quiescent_boxer/gbp-scraper` |
| Actor internal ID | `e4bUd0goaGEZq8pwf` |
| Production code | `C:\Users\ashu\Apify scaper\` |
| Safe backup | `C:\Users\ashu\Desktop\GBP-scraper-backup-v1.0\` |
| Git fallback tag | `v1.0-complete` |

---

## 3. How to Call the Actor from Your App

### Apify API — Synchronous (wait for result)

```javascript
const response = await fetch(
    'https://api.apify.com/v2/acts/quiescent_boxer~gbp-scraper/run-sync-get-dataset-items?token=YOUR_APIFY_TOKEN',
    {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            searchQueries: ["dentist in Hyderabad"],
            scrapeMode: "quick"
        })
    }
);
const results = await response.json();  // Array of business objects
```

### Apify API — Asynchronous (start, poll for completion)

```javascript
// 1. Start the run
const startResponse = await fetch(
    'https://api.apify.com/v2/acts/quiescent_boxer~gbp-scraper/runs?token=YOUR_APIFY_TOKEN',
    {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            city: "Hyderabad",
            businessType: "dentist",
            scrapeMode: "quick"
        })
    }
);
const { data: run } = await startResponse.json();
const runId = run.id;

// 2. Poll until finished (or use webhooks)
let runStatus;
do {
    await new Promise(r => setTimeout(r, 5000));
    const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=YOUR_APIFY_TOKEN`);
    runStatus = (await statusRes.json()).data.status;
} while (runStatus === 'RUNNING' || runStatus === 'READY');

// 3. Get the dataset
const datasetRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=YOUR_APIFY_TOKEN`);
const results = await datasetRes.json();
```

### Apify JS SDK

```javascript
import { ApifyClient } from 'apify-client';
const client = new ApifyClient({ token: 'YOUR_APIFY_TOKEN' });

const run = await client.actor('quiescent_boxer/gbp-scraper').call({
    city: "Hyderabad",
    businessType: "dentist",
    scrapeMode: "quick"
});

const { items } = await client.dataset(run.defaultDatasetId).listItems();
// `items` is array of business objects
```

---

## 4. Input Schema — Three Ways to Call It

### Option A: City + Business Type (BEST for bulk discovery)

```json
{
    "city": "Hyderabad",
    "businessType": "dentist",
    "scrapeMode": "quick"
}
```

**What happens**: Scraper auto-expands into 52 area searches (Banjara Hills, Jubilee Hills, Hitech City, Kondapur, etc.). Dedups across areas. Returns all unique businesses.

**Cities supported**: 43 Indian cities (Mumbai, Delhi, Bengaluru, Hyderabad, Chennai, Kolkata, Pune, Ahmedabad, Warangal, etc.). See `src/cityAreas.js` for full list.

### Option B: Search Queries (for non-Indian cities or custom searches)

```json
{
    "searchQueries": ["restaurants in Austin, TX", "cafes in San Francisco"],
    "scrapeMode": "quick",
    "maxResults": 50
}
```

### Option C: Direct Place URLs (always deep mode — forces full scrape)

```json
{
    "placeUrls": [
        "https://www.google.com/maps/place/Business1/...",
        "https://www.google.com/maps/place/Business2/..."
    ],
    "deepScrape": true
}
```

**⚠️ Important**: `placeUrls` ALWAYS triggers deep mode regardless of what `scrapeMode` says. If you want quick data from a known profile URL, extract the businessName and use `searchQueries` instead.

### All Input Parameters

| Parameter | Type | Default | Purpose |
|---|---|---|---|
| `scrapeMode` | `"quick"` \| `"deep"` | `"deep"` | Mode of scraping |
| `city` | string | `""` | City name (one of 43) |
| `businessType` | string | `""` | Niche (dentist, restaurant, etc.) |
| `searchQueries` | string[] | `[]` | Custom search queries |
| `placeUrls` | string[] | `[]` | Direct Google Maps place URLs |
| `maxResults` | integer | 20 | Max listings per area/search |
| `language` | string | `"en"` | Language code |
| `deepScrape` | boolean | `true` | Load all reviews, photos, posts in deep mode |
| `debugSelectors` | boolean | `false` | Run selector health audit |
| `maxConcurrency` | integer | 10 | Parallel profile fetches (max 30) |

---

## 5. Output Structure

### Quick Mode — 21 fields per business

```json
{
    "businessName": "VINODA DENTAL HOSPITAL",
    "placeId": "ChIJByziBH1PMzoRQN2lBF60u14",
    "featureId": "0x3a334f7d04e22c07:0x5ebbb45e04a5dd40",
    "primaryCategory": "Dental clinic",
    "address": "Kaloji Marg, opposite Hayagrivachary Ground",
    "neighborhood": "Kaloji Marg",
    "city": "Hanamkonda",
    "postalCode": "506001",
    "latitude": 18.0006247,
    "longitude": 79.5635304,
    "rating": 4.9,
    "reviewCount": 1017,
    "phone": "+91 98854 32424",
    "website": "https://vinodahospital.com/",
    "googleMapsUrl": "https://www.google.com/maps/place/...",
    "isOpen": true,
    "hoursHint": "Open 24 hours",
    "rank": 1,
    "searchQuery": "dentist in Hanamkonda",
    "scrapedAt": "2026-04-21T15:14:44.970Z",
    "scrapeMode": "quick"
}
```

**Key field for matching in your DB**: `placeId` (format `ChIJ...`). This is Google's unique identifier — same placeId across all scrapes.

### Deep Mode — 62+ fields per business

```json
{
    "name": "Aishwarya Dental Clinic | Dental Implants, Root Canal, Clear Aligners & Kids Dentist | Hanamkonda",
    "placeId": "ChIJh6WgjoJFMzoRN7GR12_9AjM",
    "cid": "9258622234575898699",
    "featureId": "0x3a3345828ea0a587:0x3302fd6fd791b137",
    "kgmId": "/g/11gff6mz25",
    "businessType": "dentist",
    "businessStatus": "OPERATIONAL",
    "yearEstablished": 2014,

    "primaryCategory": "Dental clinic",
    "additionalCategories": ["Cosmetic dentist", "Dental implants periodontist", "Dentist", "Oral surgeon", "Orthodontist", "Pediatric dentist"],
    "categorySlugs": ["dental_clinic", "cosmetic_dentist", ...],

    "fullAddress": "Vijaya Theater Road, Kakaji Colony, Kakaji Nagar Colony, Hanamkonda, Telangana 506011, India",
    "street": "Vijaya Theater Road",
    "neighborhood": "Kakaji Colony",
    "city": "Hanamkonda",
    "state": "Telangana",
    "countryCode": "IN",
    "latitude": 18.003794,
    "longitude": 79.5692814,
    "plusCode": "2H39+GP Hanamkonda, Telangana, India",
    "timezone": "Asia/Calcutta",
    "nearbyLandmarks": [],

    "phone": "+91 98497 94593",
    "website": "https://www.aishwaryadental.com/",
    "websiteDomain": "aishwaryadental.com",
    "appointmentUrl": "https://www.aishwaryadental.com/appointment.html",
    "orderUrls": null,
    "appointmentSlots": ["15 min", "30 min", "1 hr", "2 hr"],
    "ctaLabel": "Plan your visit",
    "reviewsUrl": "https://search.google.com/local/reviews?placeid=...",

    "description": "Aishwarya Dental Clinic is the best dental clinic in Hanamkonda... (721 chars)",
    "rating": 4.8,
    "reviewCount": 95,
    "photoCount": 84,
    "hours": {
        "Monday": "9 AM–9 PM",
        "Tuesday": "9 AM–9 PM",
        ...
    },
    "coverPhotoUrl": "https://lh5.googleusercontent.com/...",
    "logoUrl": "https://lh5.googleusercontent.com/...",

    "ownerName": "Aishwarya Dental Clinic (Owner)",
    "ownerContributorId": "110502276896581095576",

    "reviews": [
        {
            "reviewId": "Ci9DQUlR...",
            "author": "Gaddam Sunitha",
            "authorUrl": "https://www.google.com/maps/contrib/.../reviews",
            "authorPhotoUrl": "https://lh3.googleusercontent.com/...",
            "authorReviewCount": 2,
            "authorPhotoCount": null,
            "isLocalGuide": false,
            "localGuideLevel": null,
            "rating": 5,
            "date": "8 months ago",
            "isEdited": false,
            "text": "I got root canal treatment done here...",
            "textLength": 217,
            "reviewPhotos": null,
            "reviewPhotoCount": 0,
            "likesCount": 1,
            "ownerReplied": false,
            "ownerResponseText": null,
            "ownerResponseDate": null
        }
        // ... all 95 reviews
    ],
    "reviewsMeta": {
        "totalReviewsOnProfile": 95,
        "reviewsExtracted": 95,
        "gotAllReviews": true,
        "newestReviewDate": "a week ago",
        "oldestReviewDate": "8 years ago",
        "ownerRepliedCount": 4,
        "ownerReplyRate": "4/95",
        "ownerReplyRatePercent": 4,
        "starBreakdown": { "5": 88, "4": 2, "3": 2, "2": 0, "1": 3 }
    },

    "reviewSnippets": [
        { "text": "Great service and very friendly staff!", "keywords": ["service", "staff"] }
    ],
    "mentionKeywords": [
        { "keyword": "treatment", "mentions": 14 },
        { "keyword": "friendly", "mentions": 10 }
    ],

    "posts": [
        {
            "date": "2026-04-03",
            "dateDisplay": "Apr 3, 2026",
            "postType": "update",
            "text": "Regular dental cleaning removes debris...",
            "cta": "Call now",
            "ctaUrl": "tel:+919849794593",
            "imageId": "AF1QipNu...",
            "imageUrl": "https://lh3.googleusercontent.com/..."
        }
    ],

    "photoMeta": {
        "totalCount": 84,
        "uploadDates": ["2026-04-03", "2026-03-24", ...],
        "uploadFrequency": "Bi-weekly"
    },
    "photoData": {
        "photoCount": 84,
        "photos": ["url1", "url2", ...],  // 30-40 high-res URLs
        "ownerPhotos": [],
        "af1QipIds": [...]
    },

    "attributes": {
        "Service options": [{ "name": "Onsite services", "available": true }],
        "Offerings": [{ "name": "Pediatric care", "available": true }],
        "Amenities": [{ "name": "Gender-neutral restroom", "available": true }],
        "Planning": [{ "name": "Appointment required", "available": true }],
        "Payments": [{ "name": "Google Pay", "available": true }]
    },

    "services": [
        {
            "category": "Dental Clinic",
            "name": "Braces",
            "description": "Braces corrects your teeth magically...",
            "price": "₹25,000.00"
        }
    ],

    "popularTimes": {
        "liveStatus": "Now: Usually a little busy",
        "days": {
            "Monday": [
                { "hour": 9, "busyness": 40, "label": "Usually not too busy", "display": "9 AM" }
            ]
        }
    },

    "peopleAlsoSearch": [
        {
            "featureId": "0x0:0x17ab...",
            "name": "K & H Dental",
            "rating": 4.8,
            "reviewCount": 24,
            "category": "Dental clinic",
            "latitude": 18.0027732,
            "longitude": 79.5698264
        }
    ],

    "websiteInfo": {
        "websiteSpeed": "Slow",
        "websiteLoadTimeMs": 11833,
        "websiteStatus": 200,
        "hasSchemaMarkup": true,
        "schemaTypes": ["WebSite", "LocalBusiness", "Organization"],
        "schemaDetails": [...],
        "isHttps": true,
        "isMobileFriendly": true,
        "metaTitle": "Best Dental Clinic in Warangal...",
        "metaDescription": "...",
        "websitePerformance": { "domContentLoaded": 9530, "ttfb": 1639 }
    },

    "auditMetrics": {
        "descriptionLength": 721,
        "hasDescription": true,
        "secondaryCategoriesCount": 6,
        "reviewCount": 95,
        "rating": 4.8,
        "replyRatePercent": 4,
        "hoursCompleteness": "All 7 days set",
        "websiteSpeed": "Slow",
        "hasSchemaMarkup": true,
        "isHttps": true
    },

    "scrapedAt": "2026-04-21T...",
    "sourceUrl": "https://www.google.com/maps/place/...",
    "searchQuery": null,
    "selectorVersion": "2026-04-12-v1"
}
```

---

## 6. Typical Integration Workflow

### Scenario A: Lead Discovery (use quick mode)

```
1. User enters: city="Hyderabad", niche="dentist"
2. Your app calls Apify actor with { city, businessType: niche, scrapeMode: "quick" }
3. Wait ~5-10 minutes (52 areas, lots of data)
4. Receive ~200-400 unique dentists with placeId, name, rating, phone, etc.
5. Save to your database keyed by placeId
6. Show in UI as lead list
```

### Scenario B: Deep Audit (use deep mode)

```
1. User picks a specific lead/client from quick-scan results
2. Your app calls Apify actor with { placeUrls: [savedGoogleMapsUrl], deepScrape: true }
3. Wait ~2-3 minutes
4. Receive full 62-field profile with all reviews, posts, photos, attributes
5. Run audit logic: reply rate, description length, hours completeness, etc.
6. Generate report
```

### Scenario C: Batch Deep Scan

```
1. Select 10 clients from DB
2. Call actor once with { placeUrls: [url1, url2, ... url10], deepScrape: true }
3. Actor processes in parallel (maxConcurrency: 10)
4. Takes ~4-5 minutes total (not 30 min sequentially)
5. Receive 10 full profiles
```

---

## 7. Critical Gotchas / Things to Know

### 1. `placeUrls` always forces deep mode
Even if you set `scrapeMode: "quick"`, passing `placeUrls` triggers full profile scrape. This is by design — if someone knows a specific URL, they want the full data.

### 2. `placeId` is your unique key
Every scrape returns the same `placeId` for the same business. Use it for:
- Deduping across multiple scrapes
- Matching quick-scan result to later deep-scan
- Primary key in your DB

### 3. Cookie warmup is automatic but takes extra time
When using `placeUrls`, the scraper visits `google.com` first to set cookies, then navigates to the profile. This prevents Google returning a stripped 1333-byte placeholder. Adds ~2-3 seconds per profile.

### 4. Quick mode doesn't include description/hours
Quick mode only has what's visible on search result cards. For description, hours, services, reviews — use deep mode.

### 5. Knowledge Panel data is NOT available
Google Search Knowledge Panel (social profiles, third-party ratings, older posts) is blocked by bot detection. These fields are always empty in output. Not a bug — Google blocks this.

### 6. Review count in quick mode may be null
If `.UY7F9` selector fails (rare), reviewCount falls back to regex matching. Sometimes still returns null. Deep mode always has accurate reviewCount from API.

### 7. Photo count is correct but photo URLs are partial
`photoCount` (e.g., 84) is accurate. `photoData.photos` array has 30-40 URLs because gallery scroll stops at that point. The 84 total exists but extracting all would take 2+ more minutes.

### 8. Cost on Apify
- Quick mode: ~$0.05-0.15 per search query
- Deep mode: ~$0.20-0.40 per profile
- City expansion: multiplies by number of areas (52 for Hyderabad × $0.05 = ~$2.60 for quick city scan)

---

## 8. How the Scraper Works Internally (Brief)

1. **API Interception**: Intercepts Google Maps' internal `/maps/preview/place` endpoint which returns 98KB JSON with all business data in nested arrays at `d[0]` through `d[259]`.
2. **Parsing**: `src/apiExtractor.js` maps each `d[N]` index to a field (e.g., `d[11]` = name, `d[154]` = description, `d[175]` = reviews, `d[100]` = attributes).
3. **DOM scraping for reviews**: Clicks Reviews tab, scrolls to load all reviews, reads DOM elements (`.jftiEf`, `.d4r55`, `.kvMYJc`, etc.) for 20 fields per review.
4. **Posts pagination**: Clicks "See local posts", scrolls to trigger `/maps/preview/localposts` API calls with pagination tokens.
5. **Photos**: Clicks cover photo to enter gallery, scrolls, extracts background-image URLs.
6. **Website audit**: Fetches the business website, parses schema.org JSON-LD, measures TTFB and load time.

Full details in `ARCHITECTURE.md`.

---

## 9. Suggested Improvements (For Future AI Agent)

### High Value
1. **Q&A extraction** — Currently skipped. Some businesses have 5-20 questions. Would need DOM scraping from Q&A section.
2. **Review photos** — Currently returns empty. Reviewers sometimes upload photos with their review. Visible in DOM but not captured yet.
3. **Get more photo URLs** — Currently 30-40 of 84. Could add photo gallery pagination via scroll + network interception of photo-list API.
4. **Service images** — Services come back with name/price/description but no image. Images exist in API at a different index.

### Medium Value
5. **Parallel API + DOM** — Currently API extraction runs first, then DOM scraping sequentially. Could parallelize.
6. **Smarter concurrency** — Currently fixed at 10. Could auto-scale based on proxy response times.
7. **Retry on 1333-byte responses** — Sometimes even with warmup, Google returns placeholder. Could retry with different proxy IP.
8. **Multi-language reviews** — Currently extracts text in whatever language it's in. Could add translation.

### Low Value / Nice to Have
9. **Cache cityAreas.js data** — Currently loads 700 area names on every run. Could cache.
10. **Webhook notifications** — Currently app must poll. Apify supports webhooks on run completion.
11. **Progress streaming** — Long deep scans give no progress updates. Could push to key-value store.

---

## 10. File Structure Reference

```
C:\Users\ashu\Apify scaper\
├── .actor/
│   ├── actor.json          # Apify metadata
│   └── Dockerfile          # Container config
├── src/
│   ├── main.js             # Entry point, input validation, request building
│   ├── routes.js           # SEARCH_RESULTS + PLACE_DETAIL handlers
│   ├── apiExtractor.js     # Parses /maps/preview/place API (62 fields)
│   ├── extractors.js       # DOM extraction fallback, website audit
│   ├── selectors.js        # CSS selector registry
│   ├── selectorDebugger.js # Health audit
│   ├── constants.js        # Config, user agents, delays
│   ├── cityAreas.js        # 43 cities, 700+ areas
│   └── urlBuilder.js       # Search URL construction
├── INPUT_SCHEMA.json       # Apify input schema
├── package.json            # Node dependencies
├── ARCHITECTURE.md         # Internal tech docs (API indices, selectors)
└── INTEGRATION_GUIDE.md    # This file
```

---

## 11. Self-Healing — When Google Changes DOM

Google occasionally changes class names (`.jftiEf`, `.d4r55`, etc.). When scraping breaks:

1. Run with `debugSelectors: true`
2. Check the KV store for `SELECTOR_HEALTH_REPORT`
3. It lists broken selectors with DOM snippets
4. Update `src/selectors.js` — change primary selector
5. Bump `SELECTOR_VERSION` in `src/constants.js`
6. Redeploy: `npx apify-cli push`

For API changes (Google restructures `d[]` indices):

1. Use dev tools to capture a fresh `/maps/preview/place` response
2. Find the new index for the missing field
3. Update `src/apiExtractor.js` — change `d[X]` path
4. No version bump needed — API extractor is independent

Full guide in `ARCHITECTURE.md`.

---

## 12. Quick Reference Card

| Task | Call |
|---|---|
| Find all dentists in Hyderabad | `{ city: "Hyderabad", businessType: "dentist", scrapeMode: "quick" }` |
| Custom search | `{ searchQueries: ["pharma in Mumbai"], scrapeMode: "quick" }` |
| Full audit of one business | `{ placeUrls: ["https://google.com/maps/place/..."], deepScrape: true }` |
| Batch audit 10 businesses | `{ placeUrls: [url1, url2, ...], deepScrape: true, maxConcurrency: 10 }` |

---

**Done. Hand this file to the next agent.** They'll know exactly what the scraper does, how to call it, what it returns, and where to extend it.
