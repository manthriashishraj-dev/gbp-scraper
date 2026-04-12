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
        primaryCategory: null,
        additionalCategories: [],
        fullAddress: null,
        street: null,
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
        appointmentUrl: null,
        ownerName: null,
        ownerContributorId: null,
        hours: null,
        coverPhotoUrl: null,
        photoCount: null,
        googleMapsUrl: null,
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

    // -- appointmentUrl --
    try {
        biz.appointmentUrl = safeGet(d, 75, 0, 0, 2, 0, 1, 2, 0) ?? null;
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

    // -- photoCount --
    try {
        // Photo count is often embedded as a number in the photos section
        const count = safeGet(d, 37, 0, 0, 0, 6);
        if (typeof count === 'number') biz.photoCount = count;
    } catch { /* ignore */ }

    // -- googleMapsUrl --
    try {
        biz.googleMapsUrl = safeGet(d, 96, 10, 1, 0, 0, 2, 1) || null;
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
 * Reviews live in d[175] which is a large (~25 KB) nested blob.  The exact
 * structure can vary, so this performs best-effort extraction with try/catch
 * around every review and every field.
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

    // The reviews blob is typically an array of review entries.  Each entry is
    // itself a deeply nested array.  We iterate and try several known structural
    // layouts to maximise extraction coverage.
    for (const entry of reviewsBlob) {
        try {
            const review = extractSingleReview(entry);
            if (review) {
                reviews.push(review);
            }
        } catch {
            // Skip entries we cannot parse.
        }
    }

    return reviews;
}

// ---------------------------------------------------------------------------
// extractSingleReview (internal)
// ---------------------------------------------------------------------------

/**
 * Attempt to extract a single review object from a review entry array.
 *
 * The layout observed in live responses is roughly:
 *   entry[0]  - review ID / contribution ID
 *   entry[1]  - author sub-array
 *     [1][4]  - author link / URL
 *     [1][1]  - author display name
 *   entry[2]  - rating (integer 1-5)
 *   entry[3]  - review text body
 *   entry[4]  - date / timestamp info
 *   entry[9]  - owner response sub-array
 *     [9][1]  - owner response text
 *     [9][3]  - owner response date string
 *
 * Alternate layouts have been observed where indices shift.  The function
 * tries both primary and fallback positions.
 *
 * @param {Array} entry - A single review entry from d[175].
 * @returns {Object|null} Parsed review or null if nothing useful was extracted.
 */
function extractSingleReview(entry) {
    if (!Array.isArray(entry)) {
        return null;
    }

    const review = {
        reviewId: null,
        author: null,
        authorUrl: null,
        rating: null,
        text: null,
        date: null,
        ownerResponseText: null,
        ownerResponseDate: null,
    };

    // -- reviewId --
    try {
        // Commonly at entry[0] or entry[0][0].
        const rawId = entry[0];
        review.reviewId = (typeof rawId === 'string')
            ? rawId
            : (Array.isArray(rawId) ? rawId[0] ?? null : String(rawId ?? ''));
        if (review.reviewId === '') review.reviewId = null;
    } catch { /* ignore */ }

    // -- author name --
    try {
        // Primary: entry[1][1], Fallback: entry[1][0][1]
        const authorName = safeGet(entry, 1, 1) ?? safeGet(entry, 1, 0, 1);
        review.author = typeof authorName === 'string' ? authorName : null;
    } catch { /* ignore */ }

    // -- authorUrl --
    try {
        // Primary: entry[1][4], Fallback: entry[1][0][4]
        const url = safeGet(entry, 1, 4) ?? safeGet(entry, 1, 0, 4);
        review.authorUrl = typeof url === 'string' ? url : null;
    } catch { /* ignore */ }

    // -- rating --
    try {
        const r = entry[2];
        if (typeof r === 'number' && r >= 1 && r <= 5) {
            review.rating = r;
        } else {
            // Sometimes wrapped in a sub-array.
            const rAlt = safeGet(entry, 2, 0);
            if (typeof rAlt === 'number' && rAlt >= 1 && rAlt <= 5) {
                review.rating = rAlt;
            }
        }
    } catch { /* ignore */ }

    // -- text --
    try {
        const txt = entry[3];
        if (typeof txt === 'string') {
            review.text = txt;
        } else {
            // Fallback: sometimes text is nested one level deeper.
            const txtAlt = safeGet(entry, 3, 0);
            if (typeof txtAlt === 'string') {
                review.text = txtAlt;
            }
        }
    } catch { /* ignore */ }

    // -- date --
    try {
        // entry[4] may be a human-readable string ("2 months ago") or a nested
        // timestamp array.  Accept both.
        const raw = entry[4];
        if (typeof raw === 'string') {
            review.date = raw;
        } else if (typeof raw === 'number') {
            // Might be a unix timestamp in seconds or milliseconds.
            review.date = raw > 1e12 ? new Date(raw).toISOString() : new Date(raw * 1000).toISOString();
        } else {
            // Try nested string representation.
            const altDate = safeGet(entry, 4, 0);
            if (typeof altDate === 'string') {
                review.date = altDate;
            } else if (typeof altDate === 'number') {
                review.date = altDate > 1e12
                    ? new Date(altDate).toISOString()
                    : new Date(altDate * 1000).toISOString();
            }
        }
    } catch { /* ignore */ }

    // -- owner response --
    try {
        // Primary: entry[9][1] for text, entry[9][3] for date.
        const ownerResp = entry[9];
        if (Array.isArray(ownerResp)) {
            const respText = ownerResp[1];
            if (typeof respText === 'string') {
                review.ownerResponseText = respText;
            }
            const respDate = ownerResp[3];
            if (typeof respDate === 'string') {
                review.ownerResponseDate = respDate;
            } else if (typeof respDate === 'number') {
                review.ownerResponseDate = respDate > 1e12
                    ? new Date(respDate).toISOString()
                    : new Date(respDate * 1000).toISOString();
            }
        }
    } catch { /* ignore */ }

    // Only return if we managed to extract at least one meaningful field.
    const hasContent = review.author || review.text || review.rating || review.reviewId;
    return hasContent ? review : null;
}
