/**
 * Google Maps Internal API Response Parser
 *
 * Parses the deeply nested array response from the /maps/preview/place endpoint.
 * After removing the ")]}'" prefix and JSON.parse(), the main business data lives
 * at placeData[6] (referred to as `d` throughout this module).
 *
 * Field mapping was determined through live testing against the API.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Safely access a deeply nested property path without throwing.
 * @param {*} obj - Root object/array to traverse.
 * @param  {...(string|number)} path - Sequence of keys/indices.
 * @returns {*} The value at the path, or undefined if any step is nullish.
 */
function safeGet(obj, ...path) {
    let current = obj;
    for (const key of path) {
        if (current == null) return undefined;
        current = current[key];
    }
    return current;
}

/** Day names in the order Google Maps returns them (Sunday = 0 through Saturday = 6). */
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ---------------------------------------------------------------------------
// parsePreviewPlaceResponse
// ---------------------------------------------------------------------------

/**
 * Parse the raw HTTP response text from the /maps/preview/place endpoint.
 *
 * The response is prefixed with ")]}'" (an anti-XSSI prefix) that must be
 * stripped before the payload can be parsed as JSON.
 *
 * @param {string} responseText - The raw response body as a string.
 * @returns {Array|null} The parsed top-level array, or null on failure.
 */
export function parsePreviewPlaceResponse(responseText) {
    try {
        if (typeof responseText !== 'string' || responseText.length === 0) {
            return null;
        }

        // Strip the anti-XSSI prefix.  It is typically ")]}'" but we handle
        // slight variations (with or without trailing newline / whitespace).
        let cleaned = responseText;
        if (cleaned.startsWith(')]}\'\n')) {
            cleaned = cleaned.slice(5);
        } else if (cleaned.startsWith(')]}\'\r\n')) {
            cleaned = cleaned.slice(6);
        } else if (cleaned.startsWith(')]}\'')) {
            cleaned = cleaned.slice(4);
        }

        const parsed = JSON.parse(cleaned);
        if (!Array.isArray(parsed)) {
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

// ---------------------------------------------------------------------------
// extractBusinessFromApi
// ---------------------------------------------------------------------------

/**
 * Extract a clean business data object from the parsed placeData array.
 *
 * Pulls data from placeData[6] (`d`) using the confirmed field mapping.
 * Every individual field extraction is wrapped in a try/catch so that a
 * single unexpected structure change never crashes the entire extraction.
 *
 * @param {Array} placeData - The top-level parsed array from parsePreviewPlaceResponse().
 * @returns {Object|null} A business data object, or null if placeData is unusable.
 */
export function extractBusinessFromApi(placeData) {
    if (!Array.isArray(placeData) || placeData[6] == null) {
        return null;
    }

    const d = placeData[6];

    const biz = {
        name: null,
        placeId: null,
        cid: null,
        featureId: null,
        kgmId: null,
        primaryCategory: null,
        additionalCategories: [],
        categorySlugs: [],
        fullAddress: null,
        street: null,
        neighborhood: null,
        city: null,
        state: null,
        countryCode: null,
        latitude: null,
        longitude: null,
        phone: null,
        website: null,
        websiteDomain: null,
        description: null,
        rating: null,
        reviewCount: null,
        reviewsUrl: null,
        plusCode: null,
        timezone: null,
        businessType: null,
        appointmentUrl: null,
        orderUrls: null,
        appointmentSlots: null,
        ctaLabel: null,
        ownerName: null,
        ownerContributorId: null,
        hours: null,
        coverPhotoUrl: null,
        photoCount: null,
        googleMapsUrl: null,
        nearbyLandmarks: [],
        yearEstablished: null,
        logoUrl: null,
        businessStatus: null,
        reviewSnippets: [],
    };

    // -- name --
    try { biz.name = d[11] ?? null; } catch { /* ignore */ }

    // -- placeId --
    try { biz.placeId = d[78] ?? null; } catch { /* ignore */ }

    // -- primaryCategory --
    try { biz.primaryCategory = safeGet(d, 13, 0) ?? null; } catch { /* ignore */ }

    // -- additionalCategories --
    try {
        const cats = d[13];
        if (Array.isArray(cats) && cats.length > 1) {
            biz.additionalCategories = cats.slice(1);
        }
    } catch { /* ignore */ }

    // -- fullAddress --
    try { biz.fullAddress = d[39] ?? null; } catch { /* ignore */ }

    // -- street --
    try { biz.street = safeGet(d, 2, 0) ?? null; } catch { /* ignore */ }

    // -- latitude / longitude --
    try { biz.latitude = safeGet(d, 9, 2) ?? null; } catch { /* ignore */ }
    try { biz.longitude = safeGet(d, 9, 3) ?? null; } catch { /* ignore */ }

    // -- phone --
    // Primary path:  d[178][0][1][1][0]
    // Fallback path: d[178][0][0]
    try {
        const primary = safeGet(d, 178, 0, 1, 1, 0);
        const fallback = safeGet(d, 178, 0, 0);
        biz.phone = primary ?? fallback ?? null;
    } catch { /* ignore */ }

    // -- website / websiteDomain --
    try { biz.website = safeGet(d, 7, 0) ?? null; } catch { /* ignore */ }
    try { biz.websiteDomain = safeGet(d, 7, 1) ?? null; } catch { /* ignore */ }

    // -- description --
    try { biz.description = safeGet(d, 154, 0, 0) ?? null; } catch { /* ignore */ }

    // -- rating --
    try { biz.rating = safeGet(d, 4, 7) ?? null; } catch { /* ignore */ }

    // -- reviewCount --
    try { biz.reviewCount = safeGet(d, 4, 8) ?? null; } catch { /* ignore */ }

    // -- reviewsUrl --
    try { biz.reviewsUrl = safeGet(d, 4, 3, 0) ?? null; } catch { /* ignore */ }

    // -- plusCode --
    try { biz.plusCode = safeGet(d, 183, 2, 2, 0) ?? null; } catch { /* ignore */ }

    // -- appointmentUrl + orderUrls (d[75] has ALL booking/order links) --
    // Dental: appointment URL. Restaurant: Swiggy/Zomato/UberEats order links + reservation.
    // Hotel: booking.com link. All structured the same way.
    try {
        const bookingSection = d[75];
        if (Array.isArray(bookingSection)) {
            // Extract ALL URLs from d[75] — each sub-array is a different provider
            const allBookingUrls = [];
            const bookingStr = JSON.stringify(bookingSection);
            const urlMatches = bookingStr.match(/https?:\/\/[^\s"\\,\]]+/g) || [];
            const seen = new Set();
            for (const url of urlMatches) {
                // Clean URL (remove tracking params)
                const clean = url.split(',')[0].replace(/\\/g, '');
                if (clean.includes('google.com') || seen.has(clean)) continue;
                seen.add(clean);
                allBookingUrls.push(clean);
            }

            // First URL is typically the primary booking/appointment URL
            biz.appointmentUrl = allBookingUrls[0] || null;

            // Additional URLs = order providers (Swiggy, Zomato, UberEats, etc.)
            if (allBookingUrls.length > 1) {
                biz.orderUrls = allBookingUrls.slice(1).map(url => {
                    let provider = 'unknown';
                    if (url.includes('swiggy')) provider = 'Swiggy';
                    else if (url.includes('zomato')) provider = 'Zomato';
                    else if (url.includes('ubereats') || url.includes('uber.com')) provider = 'Uber Eats';
                    else if (url.includes('dineout')) provider = 'Dineout';
                    else if (url.includes('eazydiner')) provider = 'EazyDiner';
                    else if (url.includes('booking.com')) provider = 'Booking.com';
                    else if (url.includes('goibibo')) provider = 'Goibibo';
                    else if (url.includes('makemytrip')) provider = 'MakeMyTrip';
                    else if (url.includes('agoda')) provider = 'Agoda';
                    else if (url.includes('expedia')) provider = 'Expedia';
                    else if (url.includes('trivago')) provider = 'Trivago';
                    else if (url.includes('practo')) provider = 'Practo';
                    else if (url.includes('justdial')) provider = 'Justdial';
                    else {
                        try { provider = new URL(url).hostname.replace('www.', ''); } catch {}
                    }
                    return { provider, url };
                });
            }
        }
    } catch { /* ignore */ }

    // -- ownerName / ownerContributorId --
    try { biz.ownerName = safeGet(d, 57, 1) ?? null; } catch { /* ignore */ }
    try { biz.ownerContributorId = safeGet(d, 57, 2) ?? null; } catch { /* ignore */ }

    // -- hours --
    try {
        biz.hours = parseHours(d[203]);
    } catch { /* ignore */ }

    // -- coverPhotoUrl (from d[37] or d[122]) --
    try {
        // Look for googleusercontent URL in the data
        const photoUrl = safeGet(d, 122, 0, 1);
        if (typeof photoUrl === 'string' && photoUrl.includes('googleusercontent')) {
            biz.coverPhotoUrl = photoUrl.replace(/=w\d+-h\d+[^!]*/, '=w800-h600');
        }
        // Fallback: try d[157]
        if (!biz.coverPhotoUrl) {
            const altUrl = d[157];
            if (typeof altUrl === 'string' && altUrl.includes('googleusercontent')) {
                biz.coverPhotoUrl = altUrl.replace(/=s\d+/, '=s800');
            }
        }
    } catch { /* ignore */ }

    // -- photoCount (from d[37][1]) --
    try {
        const count = safeGet(d, 37, 1);
        if (typeof count === 'number') biz.photoCount = count;
    } catch { /* ignore */ }

    // -- googleMapsUrl --
    try {
        biz.googleMapsUrl = safeGet(d, 96, 10, 1, 0, 0, 2, 1) || null;
    } catch { /* ignore */ }

    // -- cid (decimal) from d[181][5] --
    try { biz.cid = safeGet(d, 181, 5) ?? null; } catch { /* ignore */ }

    // -- featureId (hex) from d[10] --
    try { biz.featureId = d[10] ?? null; } catch { /* ignore */ }

    // -- kgmId (Knowledge Graph ID) from d[89] --
    try { biz.kgmId = d[89] ?? null; } catch { /* ignore */ }

    // -- categorySlugs from d[76] e.g. [["dental_clinic",null,5],...] --
    try {
        const slugs = d[76];
        if (Array.isArray(slugs)) {
            biz.categorySlugs = slugs.map(s => s?.[0]).filter(Boolean);
        }
    } catch { /* ignore */ }

    // -- neighborhood from d[14] --
    try { biz.neighborhood = d[14] ?? null; } catch { /* ignore */ }

    // -- city + state from d[166] e.g. "Hanamkonda, Telangana" --
    try {
        const cityState = d[166];
        if (typeof cityState === 'string' && cityState.includes(',')) {
            const parts = cityState.split(',').map(s => s.trim());
            biz.city = parts[0] || null;
            biz.state = parts[1] || null;
        } else if (typeof cityState === 'string') {
            biz.city = cityState;
        }
    } catch { /* ignore */ }

    // -- parsed address parts from d[82] --
    try {
        const parts = d[82];
        if (Array.isArray(parts)) {
            // d[82] = ["neighborhood", "street", "street2", "city"]
            // Fill in any missing fields
            if (!biz.neighborhood && parts[0]) biz.neighborhood = parts[0];
            if (!biz.city && parts[3]) biz.city = parts[3];
        }
    } catch { /* ignore */ }

    // -- countryCode from d[243] --
    try { biz.countryCode = d[243] ?? null; } catch { /* ignore */ }

    // -- timezone from d[30] --
    try { biz.timezone = d[30] ?? null; } catch { /* ignore */ }

    // -- businessType from d[88][1] e.g. "SearchResult.TYPE_DENTIST" --
    try {
        const bt = safeGet(d, 88, 1);
        if (typeof bt === 'string') {
            biz.businessType = bt.replace('SearchResult.TYPE_', '').toLowerCase();
        }
    } catch { /* ignore */ }

    // -- ctaLabel from d[145][0] e.g. "Plan your visit" --
    try { biz.ctaLabel = safeGet(d, 145, 0) ?? null; } catch { /* ignore */ }

    // -- appointmentSlots from d[229][1] --
    try {
        const slots = safeGet(d, 229, 1);
        if (Array.isArray(slots)) {
            biz.appointmentSlots = slots
                .map(s => safeGet(s, 0, 1, 1))
                .filter(Boolean);
        }
    } catch { /* ignore */ }

    // -- nearbyLandmarks from d[245] --
    try {
        const landmarks = safeGet(d, 245, 0);
        if (Array.isArray(landmarks)) {
            for (const lm of landmarks) {
                const name = safeGet(lm, 2, 0);
                const relevance = lm?.[1];
                if (typeof name === 'string') {
                    biz.nearbyLandmarks.push({ name, relevance: typeof relevance === 'number' ? relevance : null });
                }
            }
        }
    } catch { /* ignore */ }

    // -- yearEstablished (parse from description) --
    try {
        if (biz.description) {
            const yearMatch = biz.description.match(/since\s+(\d{4})/i) || biz.description.match(/established\s+(?:in\s+)?(\d{4})/i) || biz.description.match(/founded\s+(?:in\s+)?(\d{4})/i) || biz.description.match(/(\d{4})\s*onwards/i);
            if (yearMatch) biz.yearEstablished = parseInt(yearMatch[1]);
        }
    } catch { /* ignore */ }

    // -- logoUrl from d[157] --
    try { biz.logoUrl = d[157] ?? null; } catch { /* ignore */ }

    // -- businessStatus: operational if d[43]=1, d[61]=1 --
    try {
        if (d[43] === 1) biz.businessStatus = 'OPERATIONAL';
        // Check for closed indicators in d[96]
        const d96str = JSON.stringify(d[96] || '');
        if (d96str.includes('temporarily_closed') || d96str.includes('CLOSED_TEMPORARILY')) biz.businessStatus = 'CLOSED_TEMPORARILY';
        if (d96str.includes('permanently_closed') || d96str.includes('CLOSED_PERMANENTLY')) biz.businessStatus = 'CLOSED_PERMANENTLY';
        if (!biz.businessStatus) biz.businessStatus = 'OPERATIONAL';
    } catch { /* ignore */ }

    // -- reviewSnippets from d[31] --
    try {
        const snippets = safeGet(d, 31, 1);
        if (Array.isArray(snippets)) {
            for (const s of snippets) {
                if (!Array.isArray(s)) continue;
                const text = s[1];
                const highlights = s[4];
                if (typeof text === 'string') {
                    // Extract highlighted keywords from position pairs
                    const keywords = [];
                    if (Array.isArray(highlights)) {
                        for (const h of highlights) {
                            if (Array.isArray(h) && h.length >= 2) {
                                keywords.push(text.substring(h[0], h[1]));
                            }
                        }
                    }
                    biz.reviewSnippets.push({ text: text.replace(/^"/, '').replace(/"$/, ''), keywords });
                }
            }
        }
    } catch { /* ignore */ }

    return biz;
}

// ---------------------------------------------------------------------------
// parseHours (internal)
// ---------------------------------------------------------------------------

/**
 * Parse the opening-hours array from d[203] into a human-friendly object.
 *
 * Each element of the array represents one day and has the shape:
 *   [dayName, dayNumber, [year, month, day], [["9 am - 9 pm", [[openH], [closeH]]]], status, isOpen]
 *
 * The first string inside the nested time-slots array (index [3][0][0]) holds
 * the human-readable time range (e.g. "9 am - 9 pm").  If a day is closed the
 * slot may be absent or the status string may indicate "Closed".
 *
 * @param {Array|null|undefined} hoursArray - The d[203] value.
 * @returns {Object|null} E.g. { Monday: "9 am - 9 pm", Tuesday: "Closed", ... } or null.
 */
function parseHours(hoursArray) {
    if (!Array.isArray(hoursArray) || hoursArray.length === 0) {
        return null;
    }

    const hours = {};

    // d[203] structure: each top-level entry is an array wrapping day entries
    // d[203][0] = [["Monday", 1, [2026,4,13], [["9 am–9 pm", [[9],[21]]]], 0, 1]]
    // We need to flatten one level and then parse each day
    for (const wrapper of hoursArray) {
        try {
            if (!Array.isArray(wrapper)) continue;

            // Check if this is a day entry directly or a wrapper
            const entries = (typeof wrapper[0] === 'string') ? [wrapper] : wrapper;

            for (const entry of entries) {
                if (!Array.isArray(entry)) continue;
                if (typeof entry[0] !== 'string') continue;

                // Skip status entries like "Closed · Opens 9 am"
                if (entry[0].includes('Closed') || entry[0].includes('Opens')) continue;

                const dayName = entry[0]; // "Monday", "Tuesday", etc.
                if (!DAY_NAMES.includes(dayName) && !['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].includes(dayName)) continue;

                const timeSlots = entry[3];
                if (Array.isArray(timeSlots) && timeSlots.length > 0) {
                    const ranges = [];
                    for (const slot of timeSlots) {
                        const label = safeGet(slot, 0);
                        if (typeof label === 'string' && label.length > 0) {
                            ranges.push(label);
                        }
                    }
                    hours[dayName] = ranges.length > 0 ? ranges.join(', ') : 'Closed';
                } else {
                    hours[dayName] = 'Closed';
                }
            }
        } catch {
            // Skip malformed entries
        }
    }

    return Object.keys(hours).length > 0 ? hours : null;
}

// ---------------------------------------------------------------------------
// extractReviewsFromApi
// ---------------------------------------------------------------------------

/**
 * Extract individual reviews from the parsed placeData array.
 *
 * Reviews live in d[175][9][0][0] — a nested array of review entries.
 * Each entry is structured as:
 *   entry[0] = main review data array (r)
 *     r[0]         = review ID (base64 string starting with "Ci9" or "Chd")
 *     r[1][4][5][0] = author display name
 *     r[1][4][5][1] = author photo URL
 *     r[1][4][2][0] = author profile URL (maps/contrib/...)
 *     r[1][6]       = human-readable date ("4 months ago")
 *     r[1][2]       = timestamp in microseconds
 *     r[2][0][0]    = rating (1-5)
 *     r[2][15][0][0] = review text
 *     r[2][14][0]   = language code
 *     r[3]          = owner response data (URLs for reply/delete-reply)
 *
 * The API returns at most ~8-10 reviews per page (sorted by most relevant
 * or newest).  d[175][3][4] contains the total available review count.
 *
 * @param {Array} placeData - The top-level parsed array from parsePreviewPlaceResponse().
 * @returns {Array<Object>} Array of review objects (may be empty on failure).
 */
export function extractReviewsFromApi(placeData) {
    if (!Array.isArray(placeData) || placeData[6] == null) {
        return [];
    }

    const d = placeData[6];
    const reviewsBlob = d[175];

    if (!Array.isArray(reviewsBlob) || reviewsBlob.length === 0) {
        return [];
    }

    const reviews = [];

    // Primary path: d[175][9][0][0] contains an array of review entries
    const reviewArray = safeGet(reviewsBlob, 9, 0, 0);
    if (Array.isArray(reviewArray)) {
        for (const entry of reviewArray) {
            try {
                const review = extractSingleReview(entry);
                if (review) reviews.push(review);
            } catch { /* skip unparseable entries */ }
        }
    }

    // Fallback: if primary path fails, try iterating d[175] directly
    // (handles potential future layout changes)
    if (reviews.length === 0) {
        for (const entry of reviewsBlob) {
            try {
                const review = extractSingleReview(entry);
                if (review) reviews.push(review);
            } catch { /* skip */ }
        }
    }

    return reviews;
}

/**
 * Extract review metadata from d[175].
 * @param {Array} placeData
 * @returns {Object} { totalAvailable, sortOrder }
 */
export function extractReviewMetaFromApi(placeData) {
    const reviewsBlob = safeGet(placeData, 6, 175);
    if (!Array.isArray(reviewsBlob)) return { totalAvailable: null };

    const metaArray = reviewsBlob[3]; // e.g. [3, 0, 2, 2, 88]
    return {
        totalAvailable: Array.isArray(metaArray) ? metaArray[4] ?? null : null,
    };
}

// ---------------------------------------------------------------------------
// extractPhotosFromApi
// ---------------------------------------------------------------------------

/**
 * Extract photo data from the parsed placeData array.
 *
 * Photo data is spread across several indices:
 *   d[37]  - Photo section: d[37][1] = total photo count
 *   d[72]  - Owner photos (latest Google Posts / updates)
 *   d[122] - Main photo gallery with AF1Qip IDs and googleusercontent URLs
 *
 * @param {Array} placeData - The top-level parsed array.
 * @returns {Object} { photoCount, photos: [...], ownerPhotos: [...] }
 */
export function extractPhotosFromApi(placeData) {
    if (!Array.isArray(placeData) || placeData[6] == null) {
        return { photoCount: null, photos: [], ownerPhotos: [] };
    }

    const d = placeData[6];
    const result = { photoCount: null, photos: [], ownerPhotos: [] };

    // -- photoCount from d[37][1] --
    try {
        const count = safeGet(d, 37, 1);
        if (typeof count === 'number') result.photoCount = count;
    } catch { /* ignore */ }

    // -- Main photos from d[122] --
    try {
        const photoSection = d[122];
        if (Array.isArray(photoSection)) {
            const photoStr = JSON.stringify(photoSection);

            // Extract all googleusercontent URLs
            const urlMatches = photoStr.match(/https:\/\/lh\d\.googleusercontent\.com\/[^\s"\\]+/g);
            if (urlMatches) {
                const seen = new Set();
                for (const url of urlMatches) {
                    // Normalize URL (remove size params for dedup)
                    const baseUrl = url.replace(/=s\d+.*$/, '').replace(/=w\d+-h\d+.*$/, '');
                    if (!seen.has(baseUrl)) {
                        seen.add(baseUrl);
                        // Set a good resolution
                        const highRes = url.includes('=') ? url.replace(/=s\d+/, '=s800').replace(/=w\d+-h\d+[^"]*/, '=w800-h600') : url;
                        result.photos.push(highRes);
                    }
                }
            }

            // Extract AF1Qip photo IDs
            const af1Matches = photoStr.match(/AF1Qip[A-Za-z0-9_-]+/g);
            if (af1Matches) {
                result.af1QipIds = [...new Set(af1Matches)];
            }
        }
    } catch { /* ignore */ }

    // -- Owner photos from d[72] --
    try {
        const ownerSection = d[72];
        if (Array.isArray(ownerSection)) {
            const ownerStr = JSON.stringify(ownerSection);
            const urls = ownerStr.match(/https:\/\/lh\d\.googleusercontent\.com\/[^\s"\\]+/g);
            if (urls) {
                const seen = new Set();
                for (const url of urls) {
                    const base = url.replace(/=s\d+.*$/, '').replace(/=w\d+-h\d+.*$/, '');
                    if (!seen.has(base)) {
                        seen.add(base);
                        result.ownerPhotos.push(url);
                    }
                }
            }
        }
    } catch { /* ignore */ }

    return result;
}

// ---------------------------------------------------------------------------
// extractPostsFromApi
// ---------------------------------------------------------------------------

/**
 * Extract Google Posts (business updates) from d[122][1].
 *
 * Each post entry structure:
 *   post[1][0][0][0] = post text
 *   post[2] = [startEpochSec, endEpochSec]
 *   post[4][2] = CTA button text ("Call now", "Learn more", "Book", etc.)
 *   Image: search for AF1Qip ID in the post JSON
 *
 * @param {Array} placeData
 * @returns {Array} [{ date, dateISO, text, cta, imageId, imageUrl }, ...]
 */
export function extractPostsFromApi(placeData) {
    if (!Array.isArray(placeData) || placeData[6] == null) return [];

    const postArray = safeGet(placeData, 6, 122, 1);
    if (!Array.isArray(postArray) || postArray.length === 0) return [];

    const results = [];
    for (const post of postArray) {
        if (!Array.isArray(post)) continue;
        try {
            const text = safeGet(post, 1, 0, 0, 0) || null;
            const startTs = safeGet(post, 2, 0);
            const endTs = safeGet(post, 2, 1);
            const cta = safeGet(post, 4, 2) || null;

            // Date from timestamp
            let dateISO = null;
            if (typeof startTs === 'number') {
                dateISO = new Date(startTs * 1000).toISOString().split('T')[0];
            }

            // Find image URL in the post
            const postStr = JSON.stringify(post);
            const imgMatch = postStr.match(/(AF1Qip[A-Za-z0-9_-]+)/);
            const imageId = imgMatch ? imgMatch[1] : null;
            const urlMatch = postStr.match(/https:\/\/lh3\.googleusercontent\.com\/geougc\/[^\s"\\]+/);
            const imageUrl = urlMatch ? urlMatch[0] : (imageId ? `https://lh3.googleusercontent.com/geougc/${imageId}=w800-h600` : null);

            if (text || dateISO) {
                // Post type from post[15]: 1=update, 2=event, 3=offer (observed)
                const typeCode = post[15];
                let postType = 'update';
                if (typeCode === 2) postType = 'event';
                else if (typeCode === 3) postType = 'offer';

                // Human-readable date from post[12]
                const dateDisplay = post[12] || null;

                // CTA URL: phone from post[4][5][1][5][0], or search URL from post[9]
                const ctaUrl = safeGet(post, 4, 5, 1, 5, 0) || safeGet(post, 9) || null;

                results.push({
                    date: dateISO,
                    dateDisplay: typeof dateDisplay === 'string' ? dateDisplay : null,
                    postType,
                    text: typeof text === 'string' ? text : null,
                    cta: typeof cta === 'string' ? cta : null,
                    ctaUrl: typeof ctaUrl === 'string' ? ctaUrl : null,
                    imageId,
                    imageUrl,
                });
            }
        } catch { /* skip */ }
    }

    return results;
}

// ---------------------------------------------------------------------------
// extractPhotoMetaFromApi
// ---------------------------------------------------------------------------

/**
 * Extract photo metadata (count, upload dates, frequency) from the API.
 *
 * Photo count: d[37][1]
 * Post dates in d[122][1] also serve as owner photo upload dates.
 * Gallery tab counts from d[171].
 *
 * @param {Array} placeData
 * @returns {Object} { totalCount, ownerPhotoCount, uploadDates, uploadFrequency }
 */
export function extractPhotoMetaFromApi(placeData) {
    if (!Array.isArray(placeData) || placeData[6] == null) return { totalCount: null };

    const d = placeData[6];
    const result = {
        totalCount: safeGet(d, 37, 1) || null,
        uploadDates: [],
        uploadFrequency: null,
    };

    // Extract dates from posts (which are also photo uploads)
    const postArray = safeGet(d, 122, 1);
    if (Array.isArray(postArray)) {
        for (const post of postArray) {
            try {
                const ts = safeGet(post, 2, 0);
                if (typeof ts === 'number') {
                    result.uploadDates.push(new Date(ts * 1000).toISOString().split('T')[0]);
                }
            } catch {}
        }
    }

    // Calculate upload frequency
    if (result.uploadDates.length >= 2) {
        const dates = result.uploadDates.map(d => new Date(d).getTime()).sort((a, b) => b - a);
        const totalDays = (dates[0] - dates[dates.length - 1]) / (1000 * 60 * 60 * 24);
        const avgDaysBetween = totalDays / (dates.length - 1);
        if (avgDaysBetween <= 7) result.uploadFrequency = 'Weekly';
        else if (avgDaysBetween <= 14) result.uploadFrequency = 'Bi-weekly';
        else if (avgDaysBetween <= 31) result.uploadFrequency = 'Monthly';
        else result.uploadFrequency = `Every ~${Math.round(avgDaysBetween)} days`;
    }

    return result;
}

// ---------------------------------------------------------------------------
// extractSingleReview (internal)
// ---------------------------------------------------------------------------

/**
 * Extract a single review from a review entry.
 *
 * Each entry in d[175][9][0][0] is structured as:
 *   entry[0] = main review data array
 *   entry[2] = pagination/session token
 *   entry[4] = tracking token
 *
 * The main data (r = entry[0]) has:
 *   r[0]         = review ID
 *   r[1]         = author/meta info
 *   r[1][4][5]   = [authorName, authorPhotoUrl, ...]
 *   r[1][4][2]   = [authorProfileUrl]
 *   r[1][6]      = human-readable date string ("4 months ago")
 *   r[1][2]      = timestamp in microseconds
 *   r[2]         = review content
 *   r[2][0][0]   = star rating (1-5)
 *   r[2][14][0]  = language code
 *   r[2][15][0]  = [reviewText, null, [charStart, charEnd]]
 *   r[3]         = owner response block (has URLs if responded)
 *
 * @param {Array} entry - A review entry from d[175][9][0][0].
 * @returns {Object|null} Parsed review or null.
 */
function extractSingleReview(entry) {
    if (!Array.isArray(entry)) return null;

    const r = entry[0];
    if (!Array.isArray(r)) return null;

    const review = {
        reviewId: null,
        author: null,
        authorUrl: null,
        authorPhotoUrl: null,
        rating: null,
        text: null,
        date: null,
        dateISO: null,
        language: null,
        ownerReplied: false,
        ownerResponseText: null,
    };

    // -- reviewId --
    try {
        review.reviewId = typeof r[0] === 'string' ? r[0] : null;
    } catch { /* ignore */ }

    // -- author name --
    try {
        review.author = safeGet(r, 1, 4, 5, 0) ?? null;
    } catch { /* ignore */ }

    // -- authorUrl --
    try {
        review.authorUrl = safeGet(r, 1, 4, 2, 0) ?? null;
    } catch { /* ignore */ }

    // -- authorPhotoUrl --
    try {
        review.authorPhotoUrl = safeGet(r, 1, 4, 5, 1) ?? null;
    } catch { /* ignore */ }

    // -- rating --
    try {
        const rating = safeGet(r, 2, 0, 0);
        if (typeof rating === 'number' && rating >= 1 && rating <= 5) {
            review.rating = rating;
        }
    } catch { /* ignore */ }

    // -- text --
    try {
        const txt = safeGet(r, 2, 15, 0, 0);
        if (typeof txt === 'string') review.text = txt;
    } catch { /* ignore */ }

    // -- date (human-readable) --
    try {
        const dateStr = safeGet(r, 1, 6);
        if (typeof dateStr === 'string') review.date = dateStr;
    } catch { /* ignore */ }

    // -- dateISO (from microsecond timestamp) --
    try {
        const tsMicro = safeGet(r, 1, 2);
        if (typeof tsMicro === 'number' && tsMicro > 1e12) {
            review.dateISO = new Date(tsMicro / 1000).toISOString();
        }
    } catch { /* ignore */ }

    // -- language --
    try {
        review.language = safeGet(r, 2, 14, 0) ?? null;
    } catch { /* ignore */ }

    // -- owner response detection --
    try {
        const resp = r[3];
        if (Array.isArray(resp)) {
            // Owner replied if there's a reply URL at r[3][5] or deletereply at r[3][7]
            const replyUrl = resp[5];
            const deleteReplyUrl = resp[7];
            if ((typeof replyUrl === 'string' && replyUrl.includes('reply')) ||
                (typeof deleteReplyUrl === 'string' && deleteReplyUrl.includes('deletereply'))) {
                review.ownerReplied = true;
            }

            // Check all string fields in r[3] for actual response text
            for (let i = 0; i < resp.length; i++) {
                if (typeof resp[i] === 'string' &&
                    !resp[i].includes('http') &&
                    !resp[i].includes('/local/') &&
                    resp[i].length > 10) {
                    review.ownerResponseText = resp[i];
                    review.ownerReplied = true;
                    break;
                }
            }
        }
    } catch { /* ignore */ }

    // Only return if we have meaningful content
    const hasContent = review.author || review.text || review.rating || review.reviewId;
    return hasContent ? review : null;
}

// ---------------------------------------------------------------------------
// extractAttributesFromApi
// ---------------------------------------------------------------------------

/**
 * Extract business attributes from d[100].
 *
 * Structure: d[100][1] = array of sections, each:
 *   [section_id, section_name, [items]]
 *   where each item = [attr_path, attr_name, [has_flag, ...], ...]
 *   has_flag[0] = 1 means "yes", 0 = "no"
 *
 * @param {Array} placeData
 * @returns {Object} E.g. { "Service options": ["On-site services"], "Payments": ["Google Pay", "NFC mobile payments"] }
 */
export function extractAttributesFromApi(placeData) {
    if (!Array.isArray(placeData) || placeData[6] == null) return {};

    const d = placeData[6];
    const raw = safeGet(d, 100, 1);
    if (!Array.isArray(raw)) return {};

    const result = {};
    try {
        for (const section of raw) {
            if (!Array.isArray(section) || section.length < 3) continue;
            const sectionName = section[1];
            const items = section[2];
            if (typeof sectionName !== 'string' || !Array.isArray(items)) continue;

            const attrs = [];
            for (const item of items) {
                const attrName = item?.[1];
                const hasFlag = safeGet(item, 2, 0);
                if (typeof attrName === 'string') {
                    attrs.push({ name: attrName, available: hasFlag === 1 });
                }
            }
            if (attrs.length > 0) result[sectionName] = attrs;
        }
    } catch { /* ignore */ }

    return result;
}

// ---------------------------------------------------------------------------
// extractPopularTimesFromApi
// ---------------------------------------------------------------------------

/**
 * Extract popular times / busyness data from d[84].
 *
 * Structure: d[84][0] = array of 7 day entries, each:
 *   [dayIndex, [[hour, busynessPercent, label, "", displayHour, null, shortHour], ...], 0]
 *   dayIndex: 0=Sunday, 1=Monday, ... 6=Saturday, 7=Sunday(alt)
 *
 * d[84][6] = live busyness string like "Now: Usually a little busy"
 *
 * @param {Array} placeData
 * @returns {Object|null} { days: { Monday: [{hour, busyness, label},...], ... }, liveStatus }
 */
export function extractPopularTimesFromApi(placeData) {
    if (!Array.isArray(placeData) || placeData[6] == null) return null;

    const raw = placeData[6][84];
    if (!Array.isArray(raw) || raw.length === 0) return null;

    // Map dayIndex: Google uses 0=Sun,1=Mon...6=Sat,7=Sun(alt)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const result = { days: {}, liveStatus: null };

    try {
        // d[84][0] contains the array of 7 day entries
        const dayEntries = Array.isArray(raw[0]) ? raw[0] : raw;

        for (const dayEntry of dayEntries) {
            if (!Array.isArray(dayEntry) || dayEntry.length < 2) continue;
            const dayIdx = dayEntry[0];
            const hourlyData = dayEntry[1];
            if (typeof dayIdx !== 'number' || !Array.isArray(hourlyData)) continue;

            const dayName = dayNames[dayIdx] || `Day${dayIdx}`;
            const hours = [];
            for (const h of hourlyData) {
                if (!Array.isArray(h)) continue;
                hours.push({
                    hour: h[0],
                    busyness: h[1] || 0,
                    label: h[2] || '',
                    display: h[4] || '',
                });
            }
            if (hours.length > 0) result.days[dayName] = hours;
        }

        // Live status at d[84][6]
        if (typeof raw[6] === 'string') {
            result.liveStatus = raw[6]; // e.g. "Now: Usually a little busy"
        }
    } catch { /* ignore */ }

    return Object.keys(result.days).length > 0 ? result : null;
}

// ---------------------------------------------------------------------------
// extractPeopleAlsoSearchFromApi
// ---------------------------------------------------------------------------

/**
 * Extract "People also search for" from d[99].
 *
 * Structure: d[99][0] = [heading, [entries...]]
 * Each entry: [featureId, [sessionId, trackingId, null, null,
 *   [null, null, null, null, null, null, null, rating, reviewCount],
 *   null, null, null, null, [null, null, lat, lng],
 *   featureId, name, null, [category], ...]]
 *
 * @param {Array} placeData
 * @returns {Array} [{ name, featureId, rating, reviewCount, category, lat, lng }, ...]
 */
export function extractPeopleAlsoSearchFromApi(placeData) {
    if (!Array.isArray(placeData) || placeData[6] == null) return [];

    const raw = safeGet(placeData, 6, 99);
    if (!Array.isArray(raw)) return [];

    const results = [];
    try {
        // d[99] = [[ [heading, [entries]] ]]
        // d[99][0][0] = [heading, [entries]]
        // d[99][0][0][0] = "People also search for"
        // d[99][0][0][1] = [[fid, data], ...]
        const entries = safeGet(raw, 0, 0, 1);

        if (!Array.isArray(entries)) return results;

        for (const entry of entries) {
            if (!Array.isArray(entry) || entry.length < 2) continue;

            const fid = entry[0]; // "0x0:0x..."
            const data = entry[1]; // nested array with business info
            if (!Array.isArray(data)) continue;

            // Parse the business data
            const name = data[11] || null;
            const rating = safeGet(data, 4, 7) || null;
            const reviewCount = safeGet(data, 4, 8) || null;
            const catArray = data[13];
            const category = Array.isArray(catArray) ? catArray[0] : (typeof catArray === 'string' ? catArray : null);
            const lat = safeGet(data, 9, 2) || null;
            const lng = safeGet(data, 9, 3) || null;

            if (name || fid) {
                results.push({
                    featureId: typeof fid === 'string' ? fid : null,
                    name: typeof name === 'string' ? name : null,
                    rating: typeof rating === 'number' ? rating : null,
                    reviewCount: typeof reviewCount === 'number' ? reviewCount : null,
                    category: typeof category === 'string' ? category : null,
                    latitude: lat,
                    longitude: lng,
                });
            }
        }
    } catch { /* ignore */ }

    return results;
}

// ---------------------------------------------------------------------------
// extractServicesFromApi
// ---------------------------------------------------------------------------

/**
 * Extract services/products from d[125].
 *
 * Structure: d[125][0][0][1][0] = [[category_name], [services_array]]
 * where services_array items = [[[name, description], [price]], ...]
 *
 * @param {Array} placeData
 * @returns {Array} [{ category, name, description, price }, ...]
 */
export function extractServicesFromApi(placeData) {
    if (!Array.isArray(placeData) || placeData[6] == null) return [];

    const raw = placeData[6][125];
    if (!Array.isArray(raw)) return [];

    const results = [];
    try {
        // d[125][0][0][1] = array of category sections
        // Each section: [["Category Name"], [[[services_array]]]]
        const categoryBlocks = safeGet(raw, 0, 0, 1);
        if (!Array.isArray(categoryBlocks)) return results;

        for (const block of categoryBlocks) {
            if (!Array.isArray(block)) continue;

            // block[0] = ["Category Name"]
            const category = safeGet(block, 0, 0) || null;

            // block[1] = [[service_items]] — one more level of nesting
            const itemsWrapper = safeGet(block, 1, 0);
            if (!Array.isArray(itemsWrapper)) continue;

            for (const item of itemsWrapper) {
                if (!Array.isArray(item)) continue;
                // item = [[name, description], [price]]
                const name = safeGet(item, 0, 0) || null;
                const description = safeGet(item, 0, 1) || null;
                const price = safeGet(item, 1, 0) || null;

                if (name) {
                    results.push({
                        category: typeof category === 'string' ? category : null,
                        name,
                        description: typeof description === 'string' ? description : null,
                        price: typeof price === 'string' ? price : null,
                    });
                }
            }
        }
    } catch { /* ignore */ }

    return results;
}

// ---------------------------------------------------------------------------
// extractMentionKeywordsFromReviews
// ---------------------------------------------------------------------------

/**
 * Extract "People mention" keywords by analyzing review text frequency.
 * Computes the most common meaningful words across all review texts.
 */
export function extractMentionKeywordsFromReviews(reviews) {
    if (!Array.isArray(reviews) || reviews.length === 0) return [];

    const stopWords = new Set(['the','a','an','is','was','were','are','am','be','been','being','have','has','had','do','does','did','will','would','shall','should','may','might','must','can','could','i','me','my','we','our','you','your','he','she','it','they','them','their','this','that','these','those','and','but','or','nor','for','so','yet','in','on','at','to','from','with','by','of','as','into','through','during','before','after','above','below','between','out','off','over','under','again','further','then','once','here','there','when','where','why','how','all','both','each','few','more','most','other','some','such','no','not','only','own','same','than','too','very','just','about','also','up','down','if','which','who','whom','what','its','like','got','get','go','going','went','went','one','two','good','great','very','really','much','well','best','even','every','back','make','made','many','time','first','new','now','way','right','still','know','take','come','could','would','give','use','need','find','tell','ask','work','seem','feel','try','leave','call','keep','long','let','begin','high','last','never','next','old','small','large','also','think','see','look','want','day','most']);

    const wordCount = {};
    for (const review of reviews) {
        if (!review.text) continue;
        const words = review.text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
        const seen = new Set();
        for (const word of words) {
            if (word.length < 3 || stopWords.has(word) || seen.has(word)) continue;
            seen.add(word);
            wordCount[word] = (wordCount[word] || 0) + 1;
        }
    }

    return Object.entries(wordCount)
        .filter(([_, count]) => count >= 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([word, count]) => ({ keyword: word, mentions: count }));
}
