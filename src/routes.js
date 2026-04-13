import { createPuppeteerRouter } from 'crawlee';
import { Actor } from 'apify';
import { SELECTORS, resolveSelector } from './selectors.js';
import { LABELS, sleep, randomDelay } from './constants.js';
import { SELECTOR_VERSION } from './selectors.js';
import { parsePreviewPlaceResponse, extractBusinessFromApi, extractReviewsFromApi, extractReviewMetaFromApi, extractPhotosFromApi, extractAttributesFromApi, extractPopularTimesFromApi, extractPeopleAlsoSearchFromApi, extractServicesFromApi, extractPostsFromApi, extractPhotoMetaFromApi, extractMentionKeywordsFromReviews } from './apiExtractor.js';
import { extractWebsiteInfo, extractFullKnowledgePanel } from './extractors.js';

export const router = createPuppeteerRouter();

// Global dedup set for quick mode — tracks URLs already pushed across all area searches
const quickModeSeenUrls = new Set();

// ========== SEARCH RESULTS HANDLER ==========

router.addHandler(LABELS.SEARCH_RESULTS, async ({ page, request, log, crawler, pushData }) => {
    const { searchQuery, maxResults = 20, scrapeMode = 'deep', deepScrape = false, debugSelectors = false } = request.userData;

    log.info(`Processing: "${searchQuery}" (maxResults: ${maxResults}, mode: ${scrapeMode})`);

    // Wait for feed
    await page.waitForSelector('div[role="feed"], .m6QErb[aria-label]', { timeout: 30000 }).catch(() => null);
    await randomDelay();

    // Scroll to load ALL results — keep going until Google shows "end of results" or nothing new loads
    let prevCount = 0;
    let stuck = 0;
    for (let i = 0; i < 500; i++) {
        const feedState = await page.evaluate(() => {
            const feed = document.querySelector('div[role="feed"]');
            if (feed) feed.scrollTo(0, feed.scrollHeight);
            const links = document.querySelectorAll('a.hfpxzc');
            // Check if Google shows "You've reached the end of the list" or similar
            const endText = document.querySelector('.HlvSq')?.textContent || '';
            const reachedEnd = endText.includes('end of') || endText.includes('No more');
            return { count: links.length, reachedEnd };
        });
        if (feedState.reachedEnd) {
            log.info(`Reached end of results at ${feedState.count} listings`);
            break;
        }
        if (feedState.count === prevCount) {
            stuck++;
            if (stuck >= 10) break; // Google truly stopped loading
        } else {
            stuck = 0;
        }
        prevCount = feedState.count;
        await sleep(1500);
    }

    // Extract card-level data from each result in the feed
    const cards = await page.evaluate(() => {
        const results = [];
        const seen = new Set();
        const items = document.querySelectorAll('a.hfpxzc');

        for (const link of items) {
            const url = link.href;
            if (!url || seen.has(url)) continue;
            seen.add(url);

            // The parent container holds all the card data
            const card = link.closest('.Nv2PK') || link.parentElement;
            if (!card) continue;

            // Business name — from aria-label on the link or nearby heading
            const name = link.getAttribute('aria-label') || card.querySelector('.qBF1Pd, .fontHeadlineSmall')?.textContent?.trim() || null;

            // Rating — from aria-label like "4.8 stars"
            const ratingEl = card.querySelector('.MW4etd, span[role="img"][aria-label*="star"]');
            let rating = null;
            if (ratingEl) {
                const text = ratingEl.textContent?.trim() || ratingEl.getAttribute('aria-label') || '';
                const m = text.match(/([\d.]+)/);
                if (m) rating = parseFloat(m[1]);
            }

            // Review count — from "(123)" pattern
            const reviewEl = card.querySelector('.UY7F9');
            let reviewCount = null;
            if (reviewEl) {
                const m = reviewEl.textContent?.match(/\(([\d,]+)\)/);
                if (m) reviewCount = parseInt(m[1].replace(/,/g, ''));
            }

            // Category + Address — from the info lines below the name
            const infoSpans = card.querySelectorAll('.W4Efsd span, .W4Efsd .lund');
            let category = null;
            let address = null;
            let phone = null;
            for (const span of infoSpans) {
                const text = span.textContent?.trim();
                if (!text || text.length < 2) continue;
                // Phone pattern
                if (!phone && text.match(/^\+?\d[\d\s()-]{7,}/)) {
                    phone = text;
                }
                // Address (contains comma or number)
                else if (!address && (text.includes(',') || text.match(/^\d/)) && text.length > 10) {
                    address = text;
                }
                // Category (short text, no comma, not a price indicator)
                else if (!category && text.length > 2 && text.length < 40 && !text.includes(',') && !text.match(/^[\$₹€£]/) && !text.match(/^\d/) && !text.includes('·')) {
                    category = text;
                }
            }

            // Open/Closed status
            const statusEl = card.querySelector('.ZDu9vd, .eXlrNe');
            const isOpen = statusEl ? !statusEl.textContent?.toLowerCase().includes('closed') : null;

            // Website URL — from the card's website link button
            const websiteEl = card.querySelector('a[data-value="Website"], a[href*="http"]:not([href*="google.com"])');
            const website = websiteEl?.href || null;

            // Extract placeId and featureId from URL
            const placeIdMatch = url.match(/ChIJ[A-Za-z0-9_-]+/);
            const fidMatch = url.match(/!1s(0x[a-f0-9]+:0x[a-f0-9]+)/);

            results.push({
                businessName: name,
                placeId: placeIdMatch ? placeIdMatch[0] : null,
                featureId: fidMatch ? fidMatch[1] : null,
                primaryCategory: category,
                address,
                rating,
                reviewCount,
                phone,
                website,
                googleMapsUrl: url,
                isOpen,
            });
        }

        return results;
    });

    log.info(`Found ${cards.length} listings for "${searchQuery}"`);

    // ===== QUICK MODE: push card data directly (with cross-area dedup) =====
    if (scrapeMode === 'quick') {
        let pushed = 0;
        let dupes = 0;
        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            const dedupKey = card.googleMapsUrl?.split('?')[0] || card.googleMapsUrl;
            if (quickModeSeenUrls.has(dedupKey)) { dupes++; continue; }
            quickModeSeenUrls.add(dedupKey);
            await pushData({
                ...card,
                rank: i + 1,
                searchQuery,
                scrapedAt: new Date().toISOString(),
                scrapeMode: 'quick',
            });
            pushed++;
        }
        log.info(`Quick mode: ${pushed} new + ${dupes} dupes skipped (total unique: ${quickModeSeenUrls.size})`);
        return;
    }

    // ===== DEEP MODE: enqueue each for full profile scrape =====
    await crawler.addRequests(cards.map((card, i) => ({
        url: card.googleMapsUrl,
        label: LABELS.PLACE_DETAIL,
        uniqueKey: card.googleMapsUrl.split('?')[0], // cross-area dedup
        userData: { searchQuery, deepScrape, debugSelectors, quickData: card, rank: i + 1 },
    })));
    log.info(`Deep mode: enqueued ${limitedCards.length} profiles for full scrape`);
});

// ========== PLACE DETAIL HANDLER (API INTERCEPTION) ==========

router.addHandler(LABELS.PLACE_DETAIL, async ({ page, request, log, pushData }) => {
    const { deepScrape = false, searchQuery = null } = request.userData;

    log.info(`Scraping place: ${request.url}`);

    // ===== STEP 1: Intercept the /maps/preview/place API response =====
    let apiResponseText = null;
    page.on('response', async (response) => {
        if (response.url().includes('preview/place')) {
            try {
                apiResponseText = await response.text();
            } catch { /* response body not available */ }
        }
    });

    // Navigate to the Maps page
    await page.goto(request.url, { waitUntil: 'networkidle2', timeout: 120000 });
    await sleep(3000);

    // ===== STEP 1b: Cookie warmup — reload if response is too small =====
    // The FIRST navigation to Google (cold, no cookies) returns a stripped ~42KB
    // response with NO reviews. After cookies are established, subsequent loads
    // return the full ~98KB response WITH reviews and richer data.
    if (apiResponseText && apiResponseText.length < 60000) {
        log.info(`API response small (${apiResponseText.length} chars) — reloading for full data (cookie warmup)...`);
        if (apiResponseText.length < 5000) {
            log.warning(`Very small response — might be error/consent page. Content: ${apiResponseText.substring(0, 300)}`);
        }
        apiResponseText = null;
        await page.reload({ waitUntil: 'networkidle2', timeout: 120000 });
        await sleep(3000);
        log.info(`After reload: ${apiResponseText?.length || 0} chars`);

        // If still small, try navigating to google.com first then back
        if (!apiResponseText || apiResponseText.length < 10000) {
            log.info('Still small — warming up with google.com visit...');
            await page.goto('https://www.google.com/', { waitUntil: 'networkidle2', timeout: 30000 });
            await sleep(2000);
            apiResponseText = null;
            await page.goto(request.url, { waitUntil: 'networkidle2', timeout: 120000 });
            await sleep(3000);
            log.info(`After warmup: ${apiResponseText?.length || 0} chars`);
        }
    }

    // ===== STEP 2: Parse the API response =====
    let business = null;
    let reviews = null;
    let photoData = null;
    let placeData = null;

    if (apiResponseText) {
        log.info(`Got preview/place API response: ${apiResponseText.length} chars`);

        placeData = parsePreviewPlaceResponse(apiResponseText);
        if (placeData) {
            business = extractBusinessFromApi(placeData);

            // Extract reviews from API (works with data= URL format)
            const apiReviews = extractReviewsFromApi(placeData);
            if (apiReviews && apiReviews.length > 0) {
                reviews = apiReviews;
            }

            // Extract photo data from API
            photoData = extractPhotosFromApi(placeData);

            // Review metadata
            const reviewMeta = extractReviewMetaFromApi(placeData);

            log.info(`API extraction: name=${business?.name?.substring(0, 40)}, rating=${business?.rating}, reviewCount=${business?.reviewCount}, apiReviews=${reviews?.length || 0}, photos=${photoData?.photos?.length || 0} (total: ${photoData?.photoCount || 'N/A'})`);

            // Extract additional data from API
            business.attributes = extractAttributesFromApi(placeData);
            business.popularTimes = extractPopularTimesFromApi(placeData);
            business.peopleAlsoSearch = extractPeopleAlsoSearchFromApi(placeData);
            business.services = extractServicesFromApi(placeData);
            business.posts = extractPostsFromApi(placeData);
            business.photoMeta = extractPhotoMetaFromApi(placeData);

            const attrCount = Object.keys(business.attributes || {}).length;
            const ptDays = Object.keys(business.popularTimes?.days || {}).length;
            const svcCount = business.services?.length || 0;
            const relatedCount = business.peopleAlsoSearch?.length || 0;
            const postCount = business.posts?.length || 0;
            log.info(`API extras: ${attrCount} attr sections, ${ptDays} popular time days, ${svcCount} services, ${relatedCount} related, ${postCount} posts`);
        }
    } else {
        log.warning('No preview/place API response captured — falling back to DOM scraping');
        // Fallback: basic DOM scraping for name, address, phone
        business = {
            name: await page.$eval('h1', el => el.textContent?.trim()).catch(() => null),
            fullAddress: await page.$eval('button[data-item-id="address"]', el => el.textContent?.trim()).catch(() => null),
            phone: await page.$eval('button[data-item-id^="phone:"]', el => el.textContent?.trim()).catch(() => null),
            website: await page.$eval('a[data-item-id="authority"]', el => el.href).catch(() => null),
            latitude: null,
            longitude: null,
        };
        // Parse coordinates from URL
        const urlCoordMatch = page.url().match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (urlCoordMatch) {
            business.latitude = parseFloat(urlCoordMatch[1]);
            business.longitude = parseFloat(urlCoordMatch[2]);
        }
    }

    if (!business?.name) {
        log.error('No business data extracted — page may not have loaded');
        throw new Error('No business data');
    }

    // NOTE: Reviews and Photos are extracted BEFORE KP because KP navigates
    // away from Maps to Google Search. All Maps-based work must happen first.

    // ===== STEP 3b: Full review extraction via Reviews tab + DOM scraping =====
    // After KP extraction, navigate back to the Maps page and load ALL reviews
    // by clicking the Reviews tab and scrolling through them.
    if (deepScrape && business.reviewCount > 0) {
        log.info(`Loading all ${business.reviewCount} reviews via Maps Reviews tab...`);
        try {
            // Navigate back to the Maps place page (we're on Google Search after KP)
            await page.goto(request.url, { waitUntil: 'networkidle2', timeout: 120000 });
            await sleep(3000);

            // Click the Reviews tab
            const reviewsTabClicked = await page.evaluate(() => {
                // Strategy 1: Tab buttons (most reliable)
                const tabs = document.querySelectorAll('button.hh2c6, div[role="tab"]');
                for (const t of tabs) {
                    if (t.textContent?.includes('Review') && !t.textContent?.includes('Write')) {
                        t.click();
                        return 'tab-button';
                    }
                }
                // Strategy 2: Review count link
                const links = document.querySelectorAll('button, span, a');
                for (const el of links) {
                    if (el.textContent?.match(/^\d+\s*reviews?$/i) && el.offsetParent !== null) {
                        el.click();
                        return 'review-count';
                    }
                }
                return null;
            });

            if (reviewsTabClicked) {
                log.info(`Clicked Reviews tab via: ${reviewsTabClicked}`);
                await sleep(3000);

                // Sort by Newest for chronological order
                const sortBtn = await page.$('button[aria-label*="Sort"], button.g88MCb');
                if (sortBtn) {
                    await sortBtn.click();
                    await sleep(1000);
                    await page.evaluate(() => {
                        const items = document.querySelectorAll('div[role="menuitemradio"], div[data-index]');
                        for (const item of items) {
                            if (item.textContent?.trim() === 'Newest' || item.getAttribute('data-index') === '1') {
                                item.click(); return;
                            }
                        }
                    });
                    await sleep(3000);
                }

                // Scroll to load ALL reviews
                let prevCount = 0;
                let stuck = 0;
                const maxReviews = business.reviewCount || 200;

                for (let i = 0; i < 500; i++) {
                    const count = await page.evaluate(() => {
                        const scrollable = document.querySelector('.m6QErb.DxyBCb');
                        if (scrollable) scrollable.scrollTo(0, scrollable.scrollHeight);
                        return document.querySelectorAll('.jftiEf').length;
                    });

                    if (count >= maxReviews) break;
                    if (count === prevCount) {
                        stuck++;
                        if (stuck >= 20) break;
                    } else {
                        stuck = 0;
                    }
                    prevCount = count;
                    await sleep(500);
                }

                log.info(`Loaded ${prevCount} review cards in DOM`);

                // Expand "More" buttons to get full review text
                await page.evaluate(() => {
                    document.querySelectorAll('button.w8nwRe, button[aria-label="See more"], button.review-more-link')
                        .forEach(b => { try { b.click(); } catch {} });
                }).catch(() => {});
                await sleep(1000);

                // DOM scrape all reviews with FULL detail
                const domReviews = await page.evaluate(() => {
                    const results = [];
                    const seen = new Set();
                    const els = document.querySelectorAll('.jftiEf');

                    for (const el of els) {
                        try {
                            // Review ID
                            const reviewId = el.getAttribute('data-review-id') ||
                                             el.querySelector('[data-review-id]')?.getAttribute('data-review-id') || null;

                            // Rating
                            const ratingEl = el.querySelector('.kvMYJc, span[role="img"][aria-label*="star"]');
                            let rating = null;
                            if (ratingEl) {
                                const m = (ratingEl.getAttribute('aria-label') || '').match(/(\d)/);
                                if (m) rating = parseInt(m[1], 10);
                            }

                            // Author name + URL + photo
                            const authorName = el.querySelector('.d4r55')?.textContent?.trim() || null;
                            const authorUrl = el.querySelector('button.WEBjve')?.getAttribute('data-href') ||
                                              el.querySelector('a[href*="contrib"]')?.href || null;
                            const authorPhotoUrl = el.querySelector('img.NBa7we, button.WEBjve img')?.src || null;

                            // Author info (review count, photo count, local guide level)
                            const infoText = el.querySelector('.RfnDt')?.textContent?.trim() || '';
                            let authorReviewCount = null;
                            let authorPhotoCount = null;
                            const rcMatch = infoText.match(/(\d+)\s*review/i);
                            const pcMatch = infoText.match(/(\d+)\s*photo/i);
                            if (rcMatch) authorReviewCount = parseInt(rcMatch[1]);
                            if (pcMatch) authorPhotoCount = parseInt(pcMatch[1]);
                            const isLocalGuide = infoText.toLowerCase().includes('local guide');
                            const lvlMatch = infoText.match(/Level\s*(\d+)/i);
                            const localGuideLevel = lvlMatch ? parseInt(lvlMatch[1]) : null;

                            // Date
                            const dateText = el.querySelector('.rsqaWe')?.textContent?.trim() || null;
                            const isEdited = dateText?.toLowerCase().includes('edited') || false;

                            // Full review text (after "More" expansion)
                            const text = el.querySelector('span.wiI7pd')?.textContent?.trim() || null;

                            // Review photos
                            const reviewPhotos = [];
                            el.querySelectorAll('button.Tya61d img, div.KtCyie img').forEach(img => {
                                const src = img.src || img.getAttribute('data-src');
                                if (src && src.includes('googleusercontent') && !src.includes('AAAAAAAAAAI')) {
                                    reviewPhotos.push(src.replace(/=w\d+-h\d+[^"&]*/, '=w800-h600'));
                                }
                            });

                            // Likes count
                            let likesCount = null;
                            const likeBtn = el.querySelector('button[aria-label*="like"]');
                            if (likeBtn) {
                                const m = (likeBtn.getAttribute('aria-label') || '').match(/(\d+)\s*like/i);
                                if (m) likesCount = parseInt(m[1]);
                            }

                            // Owner response
                            const ownerBlock = el.querySelector('.CDe7pd');
                            const ownerResponseText = ownerBlock?.querySelector('.wiI7pd')?.textContent?.trim() || null;
                            // Reply date is in span.DZSIDd inside the owner block
                            const ownerResponseDate = ownerBlock?.querySelector('.DZSIDd')?.textContent?.trim() || null;

                            if (!authorName && !rating && !text) continue;

                            const key = authorUrl || (authorName + '|' + dateText + '|' + rating);
                            if (seen.has(key)) continue;
                            seen.add(key);

                            results.push({
                                reviewId,
                                author: authorName,
                                authorUrl,
                                authorPhotoUrl,
                                authorReviewCount,
                                authorPhotoCount,
                                isLocalGuide,
                                localGuideLevel,
                                rating,
                                date: dateText,
                                isEdited,
                                text,
                                textLength: text?.length || 0,
                                reviewPhotos: reviewPhotos.length > 0 ? reviewPhotos : null,
                                reviewPhotoCount: reviewPhotos.length,
                                likesCount,
                                ownerReplied: !!ownerBlock || !!ownerResponseText,
                                ownerResponseText,
                                ownerResponseDate,
                            });
                        } catch {}
                    }
                    return results;
                }).catch(() => []);

                if (domReviews.length > 0) {
                    reviews = domReviews;
                    log.info(`DOM Reviews: extracted ${reviews.length}/${business.reviewCount} reviews`);
                }
            } else {
                log.warning('Reviews tab not found — using API reviews only');
            }
        } catch (err) {
            log.warning(`Review tab extraction failed: ${err.message} — using API reviews`);
        }
    }

    // ===== STEP 3b1.5: AI Review Summary + People Mention from Overview DOM =====
    if (deepScrape && reviews && reviews.length > 0) {
        try {
            // We're still on the Reviews tab — switch to Overview to get AI summary
            await page.evaluate(() => {
                const tabs = document.querySelectorAll('button.hh2c6');
                for (const t of tabs) { if (t.textContent?.trim() === 'Overview') { t.click(); return; } }
            });
            await sleep(2000);

            // Scroll down to find the review summary section
            for (let i = 0; i < 10; i++) {
                await page.evaluate(() => {
                    const s = document.querySelector('.m6QErb.DxyBCb');
                    if (s) s.scrollTo(0, s.scrollHeight);
                });
                await sleep(300);
            }

            const summaryData = await page.evaluate(() => {
                const result = { aiSummary: null, peopleMention: [] };

                // AI Review Summary — Google generates a paragraph summarizing all reviews
                // Usually in a div near "Review summary" heading
                const summaryEl = document.querySelector('.fontBodyMedium .PbZDve, .review-summary, [data-attrid*="review_summary"]');
                if (summaryEl) {
                    result.aiSummary = summaryEl.textContent?.trim()?.substring(0, 500) || null;
                }

                // People mention keywords — shown as chips like "treatment (14)", "doctor (7)"
                document.querySelectorAll('.KNfEk .uEubGf, .e2moi, button.GCxVpd').forEach(chip => {
                    const text = chip.textContent?.trim();
                    if (text && text.length > 1 && text.length < 50) {
                        result.peopleMention.push(text);
                    }
                });

                return result;
            });

            if (summaryData.aiSummary) {
                business.aiReviewSummary = summaryData.aiSummary;
                log.info(`AI review summary: ${summaryData.aiSummary.substring(0, 60)}...`);
            }
            if (summaryData.peopleMention.length > 0) {
                business.peopleMention = summaryData.peopleMention;
                log.info(`People mention: ${summaryData.peopleMention.join(', ')}`);
            }
        } catch (err) {
            log.warning(`Review summary extraction: ${err.message}`);
        }
    }

    // ===== STEP 3b2: About tab — DOM attributes (supplement API d[100]) =====
    if (deepScrape && (!business.attributes || Object.keys(business.attributes).length === 0)) {
        try {
            // Navigate back to place page if needed
            if (!page.url().includes('maps/place')) {
                await page.goto(request.url, { waitUntil: 'networkidle2', timeout: 120000 });
                await sleep(3000);
            }
            // Click About tab
            const aboutClicked = await page.evaluate(() => {
                const tabs = document.querySelectorAll('button.hh2c6');
                for (const t of tabs) { if (t.textContent?.trim() === 'About') { t.click(); return true; } }
                return false;
            });
            if (aboutClicked) {
                await sleep(2000);
                business.attributes = await page.evaluate(() => {
                    const result = {};
                    const sections = document.querySelectorAll('.iP2t7d');
                    for (const section of sections) {
                        const heading = section.querySelector('.iNvpkb, h2, .fontTitleSmall')?.textContent?.trim();
                        if (!heading) continue;
                        const items = [];
                        section.querySelectorAll('.hpLkke, .CK16pd').forEach(item => {
                            const t = item.textContent?.trim();
                            if (t && t.length > 1) items.push({ name: t, available: true });
                        });
                        if (items.length > 0) result[heading] = items;
                    }
                    return result;
                });
                log.info(`About tab: ${Object.keys(business.attributes).length} attribute sections from DOM`);
            }
        } catch (err) {
            log.warning(`About tab extraction: ${err.message}`);
        }
    }

    // ===== STEP 3b3: Load ALL posts via localposts API scroll =====
    if (deepScrape && business.posts && business.posts.length > 0) {
        try {
            // Navigate back to Maps place page
            await page.goto(request.url, { waitUntil: 'networkidle2', timeout: 120000 });
            await sleep(3000);

            // Scroll overview to find posts section
            for (let i = 0; i < 20; i++) {
                await page.evaluate(() => {
                    const s = document.querySelector('.m6QErb.DxyBCb');
                    if (s) s.scrollTo(0, s.scrollHeight);
                });
                await sleep(300);
            }

            // Intercept localposts API
            const localPostTexts = [];
            const localPostHandler = async (resp) => {
                if (resp.url().includes('preview/localposts')) {
                    try {
                        const t = await resp.text();
                        if (t.length > 500) localPostTexts.push(t);
                    } catch {}
                }
            };
            page.on('response', localPostHandler);

            // Click "See local posts" to open detail + trigger first API call
            await page.evaluate(() => {
                const btn = document.querySelector('button[aria-label="See local posts"]');
                if (btn) btn.click();
            });
            await sleep(3000);

            // Scroll the post detail panel to trigger pagination
            let prevCount = localPostTexts.length;
            let stuck = 0;
            for (let i = 0; i < 200; i++) {
                await page.evaluate(() => {
                    document.querySelectorAll('div').forEach(d => {
                        if (d.scrollHeight > d.clientHeight + 50 && d.clientHeight > 100) {
                            d.scrollTo(0, d.scrollHeight);
                        }
                    });
                });
                await sleep(400);
                if (localPostTexts.length > prevCount) {
                    stuck = 0;
                    prevCount = localPostTexts.length;
                } else {
                    stuck++;
                    if (stuck >= 25) break;
                }
            }

            // Parse all localposts responses
            const postMap = new Map();
            // First add existing API posts
            for (const p of business.posts) {
                const key = (p.date || '') + '|' + (p.text || '').substring(0, 40);
                postMap.set(key, p);
            }
            // Then add from localposts pagination
            for (const text of localPostTexts) {
                try {
                    const cleaned = text.replace(/^\)\]\}'\s*/, '');
                    const parsed = JSON.parse(cleaned);
                    const findPosts = (arr, depth) => {
                        if (depth > 10 || !Array.isArray(arr)) return;
                        for (const item of arr) {
                            if (!Array.isArray(item)) continue;
                            const hasText = item[1] && Array.isArray(item[1]);
                            const hasTs = item[2] && Array.isArray(item[2]) && typeof item[2][0] === 'number' && item[2][0] > 1700000000;
                            if (hasText && hasTs) {
                                const postText = item[1]?.[0]?.[0]?.[0] || null;
                                const ts = item[2][0];
                                const date = new Date(ts * 1000).toISOString().split('T')[0];
                                const cta = item[4]?.[2] || null;
                                const s = JSON.stringify(item);
                                const imgId = (s.match(/(AF1Qip[A-Za-z0-9_-]+)/) || [])[1] || null;
                                const key = date + '|' + (postText || '').substring(0, 40);
                                if (!postMap.has(key)) {
                                    postMap.set(key, { date, text: postText, cta, imageId: imgId, imageUrl: imgId ? `https://lh3.googleusercontent.com/geougc/${imgId}=w800-h600` : null });
                                }
                            } else { findPosts(item, depth + 1); }
                        }
                    };
                    findPosts(parsed, 0);
                } catch {}
            }

            business.posts = [...postMap.values()].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
            log.info(`Posts: ${business.posts.length} total (${localPostTexts.length} API pages loaded)`);

            // Go back to overview
            await page.evaluate(() => {
                const back = document.querySelector('button[aria-label="Back"]');
                if (back) back.click();
            });
            await sleep(1000);

            page.off('response', localPostHandler);
        } catch (err) {
            log.warning(`Post scroll extraction: ${err.message}`);
        }
    }

    // ===== STEP 3c: Photo extraction via Maps gallery + contributor page =====
    if (deepScrape && business.photoCount > 0) {
        log.info(`Loading photos (total: ${business.photoCount})...`);
        try {
            // Navigate to the Maps place page
            await page.goto(request.url, { waitUntil: 'networkidle2', timeout: 120000 });
            await sleep(3000);

            // Click cover photo to enter gallery
            await page.evaluate(() => {
                const btn = document.querySelector('button.aoRNLd');
                if (btn) btn.click();
            });
            await sleep(3000);

            // Click "All" tab in gallery
            await page.evaluate(() => {
                const tabs = document.querySelectorAll('button.hh2c6');
                for (const t of tabs) { if (t.textContent?.trim() === 'All') { t.click(); return; } }
            });
            await sleep(2000);

            // Scroll gallery to load photos
            let prevPhotoCount = 0;
            let photoStuck = 0;
            for (let i = 0; i < 200; i++) {
                const count = await page.evaluate(() => {
                    const s = document.querySelector('.m6QErb.DxyBCb');
                    if (s) s.scrollTo(0, s.scrollHeight);
                    return document.querySelectorAll('a.OKAoZd, [style*="background-image"][style*="googleusercontent"]').length;
                });
                if (count >= (business.photoCount || 100)) break;
                if (count === prevPhotoCount) { photoStuck++; if (photoStuck >= 15) break; }
                else { photoStuck = 0; }
                prevPhotoCount = count;
                await sleep(400);
            }

            // Also scroll "By owner" tab
            await page.evaluate(() => {
                const tabs = document.querySelectorAll('button.hh2c6');
                for (const t of tabs) { if (t.textContent?.trim() === 'By owner') { t.click(); return; } }
            });
            await sleep(2000);
            for (let i = 0; i < 50; i++) {
                await page.evaluate(() => {
                    const s = document.querySelector('.m6QErb.DxyBCb');
                    if (s) s.scrollTo(0, s.scrollHeight);
                });
                await sleep(400);
            }

            // Extract all photo URLs from gallery
            const galleryPhotos = await page.evaluate(() => {
                const urls = new Set();
                document.querySelectorAll('[style*="background-image"]').forEach(el => {
                    const style = el.getAttribute('style') || '';
                    if (style.includes('googleusercontent')) {
                        const m = style.match(/url\("?([^")\s]+)"?\)/);
                        if (m) urls.add(m[1]);
                    }
                });
                document.querySelectorAll('img[src*="googleusercontent"]').forEach(img => {
                    if (img.src && img.naturalWidth > 30) urls.add(img.src);
                });
                return [...urls];
            });

            // Navigate to contributor page for owner photos
            if (business.ownerContributorId) {
                const contribUrl = `https://www.google.com/maps/contrib/${business.ownerContributorId}/photos`;
                log.info(`Loading owner photos from contributor: ${contribUrl.substring(0, 80)}`);
                await page.goto(contribUrl, { waitUntil: 'networkidle2', timeout: 60000 });
                await sleep(3000);

                // Scroll contributor page
                let prevC = 0, stuckC = 0;
                for (let i = 0; i < 100; i++) {
                    const c = await page.evaluate(() => {
                        window.scrollTo(0, document.body.scrollHeight);
                        const s = document.querySelector('.m6QErb');
                        if (s) s.scrollTo(0, s.scrollHeight);
                        return document.querySelectorAll('img[src*="googleusercontent"]').length;
                    });
                    if (c === prevC) { stuckC++; if (stuckC >= 12) break; } else { stuckC = 0; }
                    prevC = c;
                    await sleep(400);
                }

                // Extract contributor photos
                const contribPhotos = await page.evaluate(() => {
                    const urls = [];
                    document.querySelectorAll('img[src*="googleusercontent"]').forEach(img => {
                        if (img.src && img.naturalWidth > 30) urls.push(img.src);
                    });
                    document.querySelectorAll('[style*="background-image"]').forEach(el => {
                        const style = el.getAttribute('style') || '';
                        if (style.includes('googleusercontent')) {
                            const m = style.match(/url\("?([^")\s]+)"?\)/);
                            if (m) urls.push(m[1]);
                        }
                    });
                    return urls;
                });
                galleryPhotos.push(...contribPhotos);
            }

            // Dedup all photos by unique photo ID
            const seen = new Set();
            const dedupedPhotos = [];
            for (const url of galleryPhotos) {
                const af1 = url.match(/(AF1Qip[A-Za-z0-9_-]+)/);
                const gpsCs = url.match(/(gps-cs-s\/[A-Za-z0-9_]+)/);
                const pathId = url.match(/\/p\/([A-Za-z0-9_-]+)/);
                const key = af1?.[1] || gpsCs?.[1] || pathId?.[1] || url.replace(/=.*$/, '');
                if (url.includes('AAAAAAAAAAI') || url.includes('branding') || url.includes('product/1x')) continue;
                if (!seen.has(key)) {
                    seen.add(key);
                    dedupedPhotos.push(url.replace(/=w\d+-h\d+[^"&]*/, '=w1200-h900').replace(/=s\d+(-[^"&]*)?/, '=s1200'));
                }
            }

            if (dedupedPhotos.length > 0) {
                photoData = photoData || { photoCount: business.photoCount, photos: [], ownerPhotos: [] };
                photoData.photos = dedupedPhotos;
                log.info(`Photos extracted: ${dedupedPhotos.length}/${business.photoCount}`);
            }
        } catch (err) {
            log.warning(`Photo extraction: ${err.message}`);
        }
    }

    // ===== STEP 4: Knowledge Panel (navigates away from Maps → Google Search) =====
    let kp = { description: null, socialProfiles: [], thirdPartyRatings: [], kpPosts: [], kpReviewSnippets: [] };
    if (business.name) {
        log.info('Extracting Knowledge Panel data...');
        for (let attempt = 1; attempt <= 2; attempt++) {
            kp = await extractFullKnowledgePanel(page, log, business.name);
            if (kp.description || kp.socialProfiles.length > 0) {
                log.info(`KP succeeded on attempt ${attempt}`);
                break;
            }
            if (attempt < 2) {
                log.warning(`KP attempt ${attempt} empty — retrying...`);
                await sleep(2000);
            }
        }
    }

    // Use KP description if API didn't have it
    if (!business.description && kp.description) {
        business.description = kp.description;
    }

    // ===== STEP 5: Website check =====
    let websiteInfo = null;
    if (business.website) {
        log.info('Checking website speed & schema...');
        websiteInfo = await extractWebsiteInfo(page, log, business.website);
    }

    // ===== STEP 5: Build review metadata =====
    let reviewsMeta = null;
    if (reviews && reviews.length > 0) {
        const withReply = reviews.filter(r => r.ownerReplied || r.ownerResponseText).length;
        reviewsMeta = {
            totalReviewsOnProfile: business.reviewCount,
            reviewsExtracted: reviews.length,
            gotAllReviews: reviews.length >= (business.reviewCount || 0),
            newestReviewDate: reviews[0]?.date || null,
            oldestReviewDate: reviews[reviews.length - 1]?.date || null,
            missingReviews: Math.max(0, (business.reviewCount || 0) - reviews.length),
            ownerRepliedCount: withReply,
            ownerNotRepliedCount: reviews.length - withReply,
            ownerReplyRate: `${withReply}/${reviews.length}`,
            ownerReplyRatePercent: reviews.length > 0 ? Math.round((withReply / reviews.length) * 100) : 0,
            starBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        };
        for (const r of reviews) {
            if (r.rating >= 1 && r.rating <= 5) reviewsMeta.starBreakdown[r.rating]++;
        }
    }

    // Compute mention keywords from review text
    business.mentionKeywords = extractMentionKeywordsFromReviews(reviews || []);

    // ===== STEP 6: Build audit metrics =====
    const descLen = business.description?.length || 0;
    const auditMetrics = {
        descriptionLength: descLen,
        hasDescription: descLen > 0,
        secondaryCategoriesCount: business.additionalCategories?.length || 0,
        reviewCount: business.reviewCount,
        rating: business.rating,
        replyRatePercent: reviewsMeta?.ownerReplyRatePercent || null,
        hoursCompleteness: business.hours ? Object.keys(business.hours).length >= 7 ? 'All 7 days set' : `${Object.keys(business.hours).length} days set` : 'No hours set',
        websiteSpeed: websiteInfo?.websiteSpeed || null,
        hasSchemaMarkup: websiteInfo?.hasSchemaMarkup || false,
        isHttps: websiteInfo?.isHttps || false,
    };

    // ===== PUSH FINAL OUTPUT =====
    const output = {
        ...business,
        reviews: reviews || null,
        reviewsMeta,
        photoData: photoData || null,
        socialProfiles: kp.socialProfiles,
        thirdPartyRatings: kp.thirdPartyRatings,
        kpPosts: kp.kpPosts,
        kpReviewSnippets: kp.kpReviewSnippets,
        websiteInfo,
        auditMetrics,
        selectorVersion: SELECTOR_VERSION,
        scrapedAt: new Date().toISOString(),
        sourceUrl: request.url,
        searchQuery,
    };

    await pushData(output);
    log.info(`Scraped: ${business.name?.substring(0, 50)} — ${business.fullAddress?.substring(0, 50)}`);
});

// ========== DEFAULT HANDLER ==========

router.addDefaultHandler(async ({ request, log }) => {
    log.warning(`Unhandled route: ${request.url}`);
});
