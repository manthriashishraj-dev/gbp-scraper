import { SELECTORS, SELECTOR_VERSION, resolveSelector, resolveSelectorAll, resolveSelectorText, resolveSelectorAttr } from './selectors.js';
import { sleep, randomDelay, DELAY } from './constants.js';

// ========== CORE BUSINESS INFO ==========

export async function extractCoreInfo(page, log) {
    const result = {
        name: null,
        placeId: null,
        cid: null,
        primaryCategory: null,
        additionalCategories: [],
        fullAddress: null,
        street: null,
        city: null,
        state: null,
        zipCode: null,
        country: null,
        plusCode: null,
        latitude: null,
        longitude: null,
        phone: null,
        phones: [],
        website: null,
        googleMapsUrl: null,
        menuUrl: null,
        orderProviders: [],
        appointmentUrl: null,
        priceLevel: null,
        openingDate: null,
        temporarilyClosed: false,
        permanentlyClosed: false,
        wheelchairAccessible: null,
        knowledgePanelSummary: null,
    };

    try {
        const url = page.url();
        result.googleMapsUrl = url;

        // Business name
        result.name = await resolveSelectorText(page, SELECTORS.placeDetail.businessName, { log });

        // Primary category
        result.primaryCategory = await resolveSelectorText(page, SELECTORS.placeDetail.primaryCategory, { log });

        // Additional/secondary categories — try multiple strategies
        const catEls = await resolveSelectorAll(page, SELECTORS.placeDetail.additionalCategories, { log });
        if (catEls.length > 0) {
            result.additionalCategories = await Promise.all(
                catEls.map((el) => el.evaluate((e) => e.textContent?.trim() || null)),
            );
            result.additionalCategories = result.additionalCategories.filter(Boolean);
        }
        // Fallback: extract all category-like buttons near the business name area
        if (result.additionalCategories.length === 0) {
            const allCats = await page.evaluate(() => {
                const cats = [];
                // Google sometimes lists categories as clickable buttons/spans near the name
                const els = document.querySelectorAll('button[jsaction*="category"], .DkEaL, .LrzXr button, .skqShb button');
                els.forEach((el, i) => {
                    if (i > 0) { // skip first (primary)
                        const t = el.textContent?.trim();
                        if (t) cats.push(t);
                    }
                });
                return cats;
            });
            if (allCats.length > 0) result.additionalCategories = allCats;
        }

        // Address — extract text from button
        const addressText = await resolveSelectorText(page, SELECTORS.placeDetail.address, { log });
        if (addressText) {
            result.fullAddress = addressText;
            const parsed = parseAddress(addressText);
            Object.assign(result, parsed);
        }

        // Phone(s) — extract ALL phone numbers
        const phoneEls = await resolveSelectorAll(page, SELECTORS.placeDetail.phone, { log });
        if (phoneEls.length > 0) {
            for (const phoneEl of phoneEls) {
                try {
                    const text = await phoneEl.evaluate((el) => el.textContent?.trim() || null);
                    if (text) {
                        const cleaned = text.replace(/Phone:\s*/i, '').trim();
                        if (cleaned) result.phones.push(cleaned);
                    }
                } catch { /* skip */ }
            }
            result.phone = result.phones[0] || null; // Primary phone for backwards compat
        }

        // Website
        const { element: websiteEl } = await resolveSelector(page, SELECTORS.placeDetail.website, { log });
        if (websiteEl) {
            result.website = await websiteEl.evaluate((el) => el.href || el.getAttribute('href'));
        }

        // Plus code
        const plusText = await resolveSelectorText(page, SELECTORS.placeDetail.plusCode, { log });
        if (plusText) {
            result.plusCode = plusText.replace(/Plus code:\s*/i, '').trim();
        }

        // Menu URL
        const { element: menuEl } = await resolveSelector(page, SELECTORS.placeDetail.menuUrl, { log });
        if (menuEl) {
            result.menuUrl = await menuEl.evaluate((el) => el.href || null);
        }

        // Order providers with names and URLs
        const orderEls = await resolveSelectorAll(page, SELECTORS.placeDetail.orderUrl, { log });
        if (orderEls.length > 0) {
            result.orderProviders = await Promise.all(
                orderEls.map((el) => el.evaluate((e) => {
                    const url = e.href || null;
                    // Extract provider name from aria-label, text, or URL domain
                    let name = e.getAttribute('aria-label') || e.textContent?.trim() || null;
                    if (!name && url) {
                        try {
                            const domain = new URL(url).hostname.replace('www.', '').split('.')[0];
                            name = domain.charAt(0).toUpperCase() + domain.slice(1);
                        } catch { /* skip */ }
                    }
                    return { provider: name, url };
                })),
            );
            result.orderProviders = result.orderProviders.filter((p) => p.url);
        }

        // Appointment URL
        const { element: apptEl } = await resolveSelector(page, SELECTORS.placeDetail.appointmentUrl, { log });
        if (apptEl) {
            result.appointmentUrl = await apptEl.evaluate((el) => el.href || null);
        }

        // Price level
        const priceText = await resolveSelectorText(page, SELECTORS.placeDetail.priceLevel, { log });
        if (priceText) {
            const priceMatch = priceText.match(/[$$€£]+/);
            result.priceLevel = priceMatch ? priceMatch[0] : priceText.trim();
        }

        // Coordinates from URL
        const coordMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (coordMatch) {
            result.latitude = parseFloat(coordMatch[1]);
            result.longitude = parseFloat(coordMatch[2]);
        } else {
            // Try !3d / !4d pattern
            const lat3d = url.match(/!3d(-?\d+\.\d+)/);
            const lng4d = url.match(/!4d(-?\d+\.\d+)/);
            if (lat3d) result.latitude = parseFloat(lat3d[1]);
            if (lng4d) result.longitude = parseFloat(lng4d[1]);
        }

        // Place ID from URL
        const placeIdMatch = url.match(/place\/[^/]+\/([^/]+)/);
        if (placeIdMatch && placeIdMatch[1].startsWith('Ch')) {
            result.placeId = placeIdMatch[1];
        }
        // Try alternative pattern from data param
        if (!result.placeId) {
            const dataMatch = url.match(/!1s(0x[a-f0-9]+:0x[a-f0-9]+)/);
            if (dataMatch) result.placeId = dataMatch[1];
        }
        // Also try extracting from page
        if (!result.placeId) {
            result.placeId = await page.evaluate(() => {
                const el = document.querySelector('[data-place-id]');
                return el?.getAttribute('data-place-id') || null;
            });
        }

        // CID from URL and page source
        const cidMatch = url.match(/ludocid=(\d+)/);
        if (cidMatch) {
            result.cid = cidMatch[1];
        }
        // Try extracting CID from page HTML (Google embeds it in script tags and data attributes)
        if (!result.cid) {
            result.cid = await page.evaluate(() => {
                // Check for data-cid attribute
                const cidEl = document.querySelector('[data-cid]');
                if (cidEl) return cidEl.getAttribute('data-cid');
                // Check in page source for ludocid pattern
                const html = document.documentElement.innerHTML;
                const match = html.match(/ludocid[\\"]?[:=][\\"]?(\d{10,})/);
                if (match) return match[1];
                // Check for CID in JSON-LD or embedded data
                const match2 = html.match(/"cid"[:\s]*"?(\d{10,})"?/);
                if (match2) return match2[1];
                return null;
            });
        }

        // Opening date
        const openingText = await resolveSelectorText(page, SELECTORS.placeDetail.openingDate, { log });
        if (openingText) {
            result.openingDate = openingText.replace(/Opened?\s*/i, '').trim();
        }

        // Knowledge panel summary
        result.knowledgePanelSummary = await resolveSelectorText(page, SELECTORS.placeDetail.knowledgePanelSummary, { log });

        // Temporarily closed
        const { element: tempClosed } = await resolveSelector(page, SELECTORS.placeDetail.temporarilyClosed);
        result.temporarilyClosed = !!tempClosed;

        // Permanently closed
        const { element: permClosed } = await resolveSelector(page, SELECTORS.placeDetail.permanentlyClosed);
        result.permanentlyClosed = !!permClosed;

        // Wheelchair accessible — check aria-label and attribute chips
        result.wheelchairAccessible = await page.evaluate(() => {
            // Check in accessibility attributes
            const chips = document.querySelectorAll('.CK16pd, .Ufn4mc, li.hpLkke');
            for (const chip of chips) {
                const text = (chip.textContent || '').toLowerCase();
                if (text.includes('wheelchair') && text.includes('accessible')) {
                    // Check if it's not crossed out
                    const isCrossed = chip.classList.contains('hgKrVf') || chip.querySelector('.hgKrVf');
                    return !isCrossed;
                }
            }
            // Also check aria-labels
            const ariaEls = document.querySelectorAll('[aria-label*="wheelchair" i], [aria-label*="Wheelchair" i]');
            if (ariaEls.length > 0) return true;
            return null; // unknown
        });
    } catch (err) {
        log.warning(`extractCoreInfo error: ${err.message}`);
    }

    return result;
}

/**
 * Best-effort address parsing. Google's address format varies by country.
 */
function parseAddress(address) {
    const result = { street: null, city: null, state: null, zipCode: null, country: null };
    if (!address) return result;

    // Try US-style: "123 Main St, Austin, TX 78701, USA"
    const usParts = address.split(',').map((s) => s.trim());
    if (usParts.length >= 3) {
        result.street = usParts[0] || null;
        result.city = usParts[1] || null;
        // State + zip
        const stateZip = usParts[2];
        const szMatch = stateZip?.match(/^([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
        if (szMatch) {
            result.state = szMatch[1];
            result.zipCode = szMatch[2];
        } else {
            result.state = stateZip || null;
        }
        if (usParts.length >= 4) {
            result.country = usParts[usParts.length - 1] || null;
        }
    } else if (usParts.length === 2) {
        result.street = usParts[0];
        result.city = usParts[1];
    } else {
        result.street = address;
    }

    return result;
}

// ========== RATINGS & REVIEWS ==========

export async function extractRatingsAndReviews(page, log, deepScrape = false) {
    const result = {
        rating: null,
        reviewCount: null,
        ratingDistribution: null,
        reviewHighlights: [],
        reviews: null,
    };

    try {
        // Rating value
        const ratingText = await resolveSelectorText(page, SELECTORS.placeDetail.ratingValue, { log });
        if (ratingText) {
            result.rating = parseFloat(ratingText.replace(',', '.'));
            if (isNaN(result.rating)) result.rating = null;
        }

        // Review count
        const countText = await resolveSelectorText(page, SELECTORS.placeDetail.reviewCount, { log });
        if (countText) {
            const digits = countText.replace(/[^0-9]/g, '');
            result.reviewCount = digits ? parseInt(digits, 10) : null;
        }

        // Rating distribution from histogram (pass reviewCount to convert percentages to counts)
        result.ratingDistribution = await extractRatingDistribution(page, log, result.reviewCount);

        // Review highlights
        const highlightEls = await resolveSelectorAll(page, SELECTORS.placeDetail.reviewHighlights, { log });
        if (highlightEls.length > 0) {
            result.reviewHighlights = await Promise.all(
                highlightEls.map((el) => el.evaluate((e) => e.textContent?.trim() || null)),
            );
            result.reviewHighlights = result.reviewHighlights.filter(Boolean);
        }

        // Deep scrape reviews
        if (deepScrape) {
            result.reviews = await extractDetailedReviews(page, log);
        }
    } catch (err) {
        log.warning(`extractRatingsAndReviews error: ${err.message}`);
    }

    return result;
}

async function extractRatingDistribution(page, log, totalReviewCount = null) {
    const rows = await resolveSelectorAll(page, SELECTORS.placeDetail.ratingDistribution, { log });
    if (rows.length === 0) return null;

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let hasPercentages = false;

    for (const row of rows) {
        try {
            const ariaLabel = await row.evaluate((el) => el.getAttribute('aria-label') || el.textContent || '');
            // Pattern: "5 stars, 45%" or "5 stars 234 reviews"
            const starMatch = ariaLabel.match(/(\d)\s*star/i);
            const countMatch = ariaLabel.match(/(\d[\d,]*)\s*review/i);
            const pctMatch = ariaLabel.match(/(\d+)%/);

            if (starMatch) {
                const stars = parseInt(starMatch[1], 10);
                if (countMatch) {
                    // Direct count — best case
                    distribution[stars] = parseInt(countMatch[1].replace(/,/g, ''), 10);
                } else if (pctMatch) {
                    // Percentage — we'll convert to counts if we have totalReviewCount
                    distribution[stars] = parseInt(pctMatch[1], 10);
                    hasPercentages = true;
                }
            }
        } catch {
            // Skip malformed row
        }
    }

    // Convert percentages to estimated counts
    if (hasPercentages && totalReviewCount) {
        for (const star of [5, 4, 3, 2, 1]) {
            distribution[star] = Math.round((distribution[star] / 100) * totalReviewCount);
        }
    }

    return distribution;
}

async function extractDetailedReviews(page, log) {
    const reviews = [];

    try {
        // Click "More reviews" button to open review panel
        const { element: moreBtn } = await resolveSelector(page, SELECTORS.placeDetail.moreReviewsButton, { log });
        if (moreBtn) {
            await moreBtn.click();
            await sleep(2000);
        }

        // Sort by newest
        const { element: sortBtn } = await resolveSelector(page, SELECTORS.placeDetail.reviewsSortButton, { log });
        if (sortBtn) {
            await sortBtn.click();
            await sleep(1000);
            const { element: newestOpt } = await resolveSelector(page, SELECTORS.placeDetail.reviewsSortNewest, { log });
            if (newestOpt) {
                await newestOpt.click();
                await sleep(2000);
            }
        }

        // Scroll to load reviews (up to 100)
        await scrollReviewsPanel(page, log, 100);

        // Expand ALL truncated review texts BEFORE extraction
        // Click all "More" buttons multiple times (new ones appear as we scroll)
        for (let expandPass = 0; expandPass < 3; expandPass++) {
            const moreButtons = await page.$$(SELECTORS.placeDetail.reviewMoreButton.primary);
            if (moreButtons.length === 0) break;
            for (const btn of moreButtons) {
                try {
                    await btn.click();
                    await sleep(200);
                } catch { /* button may already be expanded */ }
            }
            await sleep(500);
        }

        // Extract individual reviews
        const reviewEls = await resolveSelectorAll(page, SELECTORS.placeDetail.reviewItem, { log });

        for (const reviewEl of reviewEls.slice(0, 100)) {
            try {
                const review = await reviewEl.evaluate((el) => {
                    const getText = (sel) => el.querySelector(sel)?.textContent?.trim() || null;
                    const getAttr = (sel, attr) => el.querySelector(sel)?.getAttribute(attr) || null;
                    const getHref = (sel) => el.querySelector(sel)?.href || null;

                    // Rating from aria-label like "5 stars" or "Rated 4.0 out of 5"
                    const ratingEl = el.querySelector('.kvMYJc') || el.querySelector('span[role="img"]');
                    let stars = null;
                    if (ratingEl) {
                        const ariaLabel = ratingEl.getAttribute('aria-label') || '';
                        const m = ariaLabel.match(/(\d)/);
                        if (m) stars = parseInt(m[1], 10);
                    }

                    // Local Guide
                    const guideBadge = el.querySelector('.RfnDt span') || el.querySelector('.QV3IV');
                    let isLocalGuide = false;
                    let localGuideLevel = null;
                    if (guideBadge) {
                        isLocalGuide = true;
                        const lvlMatch = guideBadge.textContent?.match(/Level\s*(\d+)/i);
                        if (lvlMatch) localGuideLevel = parseInt(lvlMatch[1], 10);
                    }

                    // Review photos
                    const photoEls = el.querySelectorAll('.KtCyie button img, div[data-review-id] img[src*="googleusercontent"]');
                    const photos = Array.from(photoEls)
                        .map((img) => img.src)
                        .filter((src) => src && src.includes('googleusercontent'));

                    // Likes count
                    const likesEl = el.querySelector('button.GBkF3d span') || el.querySelector('span.pkWtMe');
                    let likes = 0;
                    if (likesEl) {
                        const n = parseInt(likesEl.textContent?.trim(), 10);
                        if (!isNaN(n)) likes = n;
                    }

                    // Owner response
                    const ownerRespText = getText('.CDe7pd .wiI7pd') || getText('.ODSEW .wiI7pd');
                    const ownerRespDate = getText('.CDe7pd .rsqaWe') || getText('.ODSEW .DU9Pgb');

                    return {
                        author: getText('.d4r55') || getText('.WNxzHc'),
                        authorUrl: getHref('.WNxzHc a') || getHref('button.WEBjve'),
                        rating: stars,
                        text: getText('span.wiI7pd') || getText('.MyEned span'),
                        date: getText('.rsqaWe') || getText('.DU9Pgb'),
                        ownerResponseText: ownerRespText,
                        ownerResponseDate: ownerRespDate,
                        likesCount: likes,
                        reviewPhotos: photos,
                        isLocalGuide,
                        localGuideLevel,
                    };
                });

                reviews.push(review);
            } catch (err) {
                log.warning(`Failed to extract a review: ${err.message}`);
            }
        }

        // Navigate back to place page
        await page.keyboard.press('Escape');
        await sleep(1000);
    } catch (err) {
        log.warning(`extractDetailedReviews error: ${err.message}`);
    }

    return reviews.length > 0 ? reviews : null;
}

async function scrollReviewsPanel(page, log, maxReviews) {
    let previousCount = 0;
    let stuckCount = 0;

    for (let i = 0; i < 50; i++) {
        const currentCount = (await page.$$(SELECTORS.placeDetail.reviewItem.primary)).length;
        if (currentCount >= maxReviews) break;

        if (currentCount === previousCount) {
            stuckCount++;
            if (stuckCount >= 3) break;
        } else {
            stuckCount = 0;
        }
        previousCount = currentCount;

        // Scroll the review panel (it's typically a scrollable div)
        await page.evaluate(() => {
            const scrollable = document.querySelector('.m6QErb.DxyBCb.kA9KIf.dS8AEf') ||
                document.querySelector('.m6QErb.DxyBCb') ||
                document.querySelector('div[role="main"]');
            if (scrollable) {
                scrollable.scrollTo(0, scrollable.scrollHeight);
            }
        });

        await sleep(DELAY.SCROLL_PAUSE + Math.random() * 1000);
    }
}

// ========== HOURS ==========

export async function extractHours(page, log) {
    const result = {
        weeklyHours: null,
        specialHours: null,
        currentStatus: null,
    };

    try {
        // Try expanding hours
        const { element: expandBtn } = await resolveSelector(page, SELECTORS.placeDetail.hoursExpandButton, { log });
        if (expandBtn) {
            try {
                await expandBtn.click();
                await sleep(1000);
            } catch {
                // May already be expanded or not clickable
            }
        }

        // Current status
        result.currentStatus = await resolveSelectorText(page, SELECTORS.placeDetail.hoursCurrentStatus, { log });

        // Weekly hours from table
        const rows = await resolveSelectorAll(page, SELECTORS.placeDetail.hoursTable, { log });
        if (rows.length > 0) {
            result.weeklyHours = {};
            for (const row of rows) {
                try {
                    const cells = await row.evaluate((tr) => {
                        const tds = tr.querySelectorAll('td');
                        if (tds.length >= 2) {
                            return {
                                day: tds[0].textContent?.trim() || null,
                                hours: tds[1].getAttribute('aria-label') || tds[1].textContent?.trim() || null,
                            };
                        }
                        // Sometimes it's a different structure
                        const texts = Array.from(tr.children).map((c) => c.textContent?.trim());
                        return { day: texts[0] || null, hours: texts[1] || null };
                    });
                    if (cells.day) {
                        result.weeklyHours[cells.day] = cells.hours;
                    }
                } catch {
                    // Skip malformed row
                }
            }
            if (Object.keys(result.weeklyHours).length === 0) {
                result.weeklyHours = null;
            }
        }

        // Special/holiday hours
        const specialRows = await resolveSelectorAll(page, SELECTORS.placeDetail.specialHoursRow, { log });
        if (specialRows.length > 0) {
            result.specialHours = [];
            for (const row of specialRows) {
                try {
                    const data = await row.evaluate((tr) => {
                        const cells = tr.querySelectorAll('td');
                        if (cells.length >= 2) {
                            return {
                                date: cells[0].textContent?.trim() || null,
                                hours: cells[1].textContent?.trim() || null,
                            };
                        }
                        return null;
                    });
                    if (data) result.specialHours.push(data);
                } catch {
                    // Skip
                }
            }
            if (result.specialHours.length === 0) result.specialHours = null;
        }
    } catch (err) {
        log.warning(`extractHours error: ${err.message}`);
    }

    return result;
}

// ========== PHOTOS ==========

export async function extractPhotos(page, log, deepScrape = false) {
    const result = {
        coverPhotoUrl: null,
        photoCount: null,
        videoCount: null,
        photosByCategory: null,
        recentPhotos: null,
        latestPhotoDate: null,
        latestPhotoUploader: null,
    };

    try {
        // Cover photo
        const { element: coverEl } = await resolveSelector(page, SELECTORS.placeDetail.coverPhoto, { log });
        if (coverEl) {
            result.coverPhotoUrl = await coverEl.evaluate((img) => {
                const src = img.src || img.getAttribute('src') || '';
                return src.replace(/=w\d+-h\d+/, '=w800-h600') || src;
            });
        }

        // Photo count
        const countText = await resolveSelectorText(page, SELECTORS.placeDetail.photoCount, { log });
        if (countText) {
            const digits = countText.replace(/[^0-9]/g, '');
            result.photoCount = digits ? parseInt(digits, 10) : null;
        }

        // Deep scrape photos
        if (deepScrape) {
            const galleryData = await extractPhotoGallery(page, log);
            result.photosByCategory = galleryData.photos;
            result.latestPhotoDate = galleryData.latestPhotoDate;
            result.latestPhotoUploader = galleryData.latestPhotoUploader;
            result.videoCount = galleryData.videoCount;
            result.recentPhotos = galleryData.recentPhotos;
        }
    } catch (err) {
        log.warning(`extractPhotos error: ${err.message}`);
    }

    return result;
}

async function extractPhotoGallery(page, log) {
    const categorizedPhotos = {};
    let latestPhotoDate = null;
    let latestPhotoUploader = null;
    let videoCount = 0;
    const recentPhotos = [];

    try {
        // Click on the cover photo or photos tab to open gallery
        const { element: photoTab } = await resolveSelector(page, SELECTORS.placeDetail.photoTab, { log });
        if (photoTab) {
            await photoTab.click();
            await sleep(2000);
        } else {
            const { element: coverBtn } = await resolveSelector(page, SELECTORS.placeDetail.coverPhoto, { log });
            if (coverBtn) {
                await coverBtn.click();
                await sleep(2000);
            }
        }

        // Extract photo + video counts from the gallery header (e.g. "📷 61  👁 0")
        const mediaCounts = await page.evaluate(() => {
            const text = document.body.innerText || '';
            // Look for patterns like "📷 61" and "👁 2" or icon-based counters
            const photoMatch = text.match(/📷\s*(\d+)/);
            const videoMatch = text.match(/👁\s*(\d+)/) || text.match(/🎬\s*(\d+)/);
            // Also try the header stats area
            const statEls = document.querySelectorAll('.RZ66Rb span, .cRLbXd span, .YkuOqf span');
            let photos = photoMatch ? parseInt(photoMatch[1], 10) : null;
            let videos = videoMatch ? parseInt(videoMatch[1], 10) : 0;
            for (const el of statEls) {
                const t = el.textContent || '';
                if (t.includes('video')) {
                    const m = t.match(/(\d+)/);
                    if (m) videos = parseInt(m[1], 10);
                }
            }
            return { photos, videos };
        });
        videoCount = mediaCounts.videos || 0;

        // Click on "Latest" tab to sort by date and get recent photo metadata
        const hasLatestTab = await page.evaluate(() => {
            const tabs = document.querySelectorAll('.OKAoZd button, .ZKCDEc button, div[role="tablist"] button');
            for (const tab of tabs) {
                if (tab.textContent?.trim().toLowerCase() === 'latest') {
                    tab.click();
                    return true;
                }
            }
            // Also try "Date" sort dropdown
            const sortBtn = document.querySelector('button[aria-label*="Sort"], button[aria-label*="Date"]');
            if (sortBtn) { sortBtn.click(); return true; }
            return false;
        });

        if (hasLatestTab) {
            await sleep(2000);

            // Click through the first few photos to get date metadata for each
            const photoItems = await page.$$('a[data-photo-index], .U39Pmb, div[data-photo-index]');
            const maxToCheck = Math.min(photoItems.length, 10); // Check first 10 recent photos

            for (let pi = 0; pi < maxToCheck; pi++) {
                try {
                    // Re-query because DOM may have changed after closing overlay
                    const items = await page.$$('a[data-photo-index], .U39Pmb');
                    if (pi >= items.length) break;

                    await items[pi].click();
                    await sleep(1200);

                    // Extract uploader name and date from the photo detail overlay
                    const photoMeta = await page.evaluate(() => {
                        const metaSelectors = [
                            '.fCpYHe', '.ZProGe', '.qCHGyb', '.T6pBCe',
                            'div[jsaction*="photo"] header', '.lbkBkb',
                        ];
                        for (const sel of metaSelectors) {
                            const el = document.querySelector(sel);
                            if (el) {
                                const text = el.textContent?.trim() || '';
                                const parts = text.split('·').map((s) => s.trim());
                                if (parts.length >= 2) {
                                    return { uploader: parts[0], date: parts[1] };
                                }
                            }
                        }
                        const uploaderEl = document.querySelector('.Aq14fc span, .fCpYHe span:first-child');
                        const dateEl = document.querySelector('.fCpYHe .rsqaWe, .dehysf, span[aria-label*="ago"]');
                        return {
                            uploader: uploaderEl?.textContent?.trim() || null,
                            date: dateEl?.textContent?.trim() || null,
                        };
                    });

                    if (photoMeta.date || photoMeta.uploader) {
                        recentPhotos.push({
                            index: pi,
                            uploader: photoMeta.uploader,
                            date: photoMeta.date,
                        });
                    }

                    // First photo is the latest
                    if (pi === 0) {
                        latestPhotoUploader = photoMeta.uploader;
                        latestPhotoDate = photoMeta.date;
                    }

                    // Close the overlay
                    await page.keyboard.press('Escape');
                    await sleep(800);
                } catch {
                    // If clicking a photo fails, try to close any overlay and continue
                    try { await page.keyboard.press('Escape'); } catch { /* */ }
                    await sleep(500);
                }
            }

            if (latestPhotoDate) {
                log.info(`Latest photo: by "${latestPhotoUploader}" — ${latestPhotoDate}`);
            }
            log.info(`Extracted dates for ${recentPhotos.length} recent photos, ${videoCount} videos found`);
        }

        // Now extract categorized photos
        const catTabs = await resolveSelectorAll(page, SELECTORS.placeDetail.photoCategoryTab, { log });

        if (catTabs.length > 1) {
            for (const tab of catTabs) {
                try {
                    const categoryName = await tab.evaluate((el) => el.textContent?.trim() || 'All');
                    if (categoryName === 'All' || categoryName.toLowerCase() === 'latest') continue;

                    await tab.click();
                    await sleep(1500);

                    for (let i = 0; i < 5; i++) {
                        await page.evaluate(() => {
                            const s = document.querySelector('.m6QErb.DxyBCb') || document.querySelector('div[role="main"]');
                            if (s) s.scrollTo(0, s.scrollHeight);
                        });
                        await sleep(1000);
                    }

                    const imgEls = await resolveSelectorAll(page, SELECTORS.placeDetail.photoGalleryImage, { log });
                    const urls = [];
                    for (const img of imgEls.slice(0, 50)) {
                        try {
                            const src = await img.evaluate((el) => {
                                const s = el.src || el.getAttribute('data-src') || el.getAttribute('src') || '';
                                return s.replace(/=w\d+-h\d+/, '=w800-h600') || s;
                            });
                            if (src && src.includes('googleusercontent')) urls.push(src);
                        } catch { /* skip */ }
                    }

                    if (urls.length > 0) categorizedPhotos[categoryName] = urls;
                } catch {
                    // Skip this category
                }
            }
        }

        // Fallback: get all photos flat
        if (Object.keys(categorizedPhotos).length === 0) {
            for (let i = 0; i < 5; i++) {
                await page.evaluate(() => {
                    const s = document.querySelector('.m6QErb.DxyBCb') || document.querySelector('div[role="main"]');
                    if (s) s.scrollTo(0, s.scrollHeight);
                });
                await sleep(1500);
            }

            const imgEls = await resolveSelectorAll(page, SELECTORS.placeDetail.photoGalleryImage, { log });
            const urls = [];
            for (const img of imgEls.slice(0, 100)) {
                try {
                    const src = await img.evaluate((el) => {
                        const s = el.src || el.getAttribute('data-src') || el.getAttribute('src') || '';
                        return s.replace(/=w\d+-h\d+/, '=w800-h600') || s;
                    });
                    if (src && src.includes('googleusercontent')) urls.push(src);
                } catch { /* skip */ }
            }
            if (urls.length > 0) categorizedPhotos['All'] = urls;
        }

        // Navigate back
        await page.keyboard.press('Escape');
        await sleep(1000);
    } catch (err) {
        log.warning(`extractPhotoGallery error: ${err.message}`);
    }

    return {
        photos: Object.keys(categorizedPhotos).length > 0 ? categorizedPhotos : null,
        latestPhotoDate,
        latestPhotoUploader,
        videoCount,
        recentPhotos: recentPhotos.length > 0 ? recentPhotos : null,
    };
}

// ========== ATTRIBUTES & AMENITIES ==========

export async function extractAttributes(page, log) {
    const result = {
        attributes: null,
    };

    try {
        // Try clicking "About" tab to see all attributes
        const { element: aboutTab } = await resolveSelector(page, SELECTORS.placeDetail.aboutTab, { log });
        if (aboutTab) {
            await aboutTab.click();
            await sleep(2000);

            // Scroll down within the About panel to load all attribute sections
            for (let i = 0; i < 3; i++) {
                await page.evaluate(() => {
                    const panel = document.querySelector('.m6QErb.DxyBCb') || document.querySelector('div[role="main"]');
                    if (panel) panel.scrollTo(0, panel.scrollHeight);
                });
                await sleep(800);
            }
        }

        const attributes = {};

        // Get all attribute sections
        const sectionEls = await resolveSelectorAll(page, SELECTORS.placeDetail.attributeSection, { log });

        for (const section of sectionEls) {
            try {
                const sectionData = await section.evaluate((el) => {
                    // Find the section title
                    const titleEl = el.querySelector('.iP2t7d .fontTitleSmall') ||
                        el.querySelector('h2') || el.querySelector('h4');
                    const title = titleEl?.textContent?.trim() || 'Other';

                    // Find all chips — include BOTH available and unavailable with status
                    const chips = [];
                    const chipEls = el.querySelectorAll('.CK16pd, .Ufn4mc, li.hpLkke');
                    for (const chip of chipEls) {
                        const text = chip.textContent?.trim();
                        const isAvailable = !chip.classList.contains('hgKrVf') &&
                            !chip.querySelector('.hgKrVf');
                        if (text) {
                            chips.push({ text, available: isAvailable });
                        }
                    }

                    return { title, chips };
                });

                if (sectionData.chips.length > 0) {
                    // Keep ALL attributes with their availability status
                    attributes[sectionData.title] = sectionData.chips.map((c) => ({
                        name: c.text,
                        available: c.available,
                    }));
                }
            } catch {
                // Skip malformed section
            }
        }

        // If we clicked About tab, go back
        if (aboutTab) {
            await page.keyboard.press('Escape');
            await sleep(1000);
        }

        result.attributes = Object.keys(attributes).length > 0 ? attributes : null;
    } catch (err) {
        log.warning(`extractAttributes error: ${err.message}`);
    }

    return result;
}

// ========== POPULAR TIMES ==========

export async function extractPopularTimes(page, log) {
    const result = {
        popularTimes: null,
        liveVisitData: null,
    };

    try {
        const { element: container } = await resolveSelector(page, SELECTORS.placeDetail.popularTimesContainer, { log });
        if (!container) return result;

        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const popularTimes = {};

        // Get day tabs to click through all 7 days
        const dayTabs = await resolveSelectorAll(page, SELECTORS.placeDetail.popularTimesDayTab, { log });

        if (dayTabs.length >= 7) {
            // Click each day tab and extract bars
            for (let d = 0; d < Math.min(dayTabs.length, 7); d++) {
                try {
                    await dayTabs[d].click();
                    await sleep(500);

                    const dayBars = await extractBarsForCurrentDay(page);
                    if (dayBars.length > 0) {
                        popularTimes[days[d]] = dayBars;
                    }
                } catch {
                    // Skip this day
                }
            }
        } else {
            // No day tabs — extract whatever is visible as a single day
            const dayBars = await extractBarsForCurrentDay(page);
            if (dayBars.length > 0) {
                // Try to detect which day is currently showing
                const activeDayLabel = await page.evaluate(() => {
                    const active = document.querySelector('.C7xf8b button[aria-selected="true"]') ||
                        document.querySelector('.C7xf8b button.KoToPc');
                    return active?.textContent?.trim() || active?.getAttribute('aria-label') || null;
                });
                const dayKey = activeDayLabel || 'CurrentDay';
                popularTimes[dayKey] = dayBars;
            }
        }

        result.popularTimes = Object.keys(popularTimes).length > 0 ? popularTimes : null;

        // Live visit data
        result.liveVisitData = await resolveSelectorText(page, SELECTORS.placeDetail.liveVisitData, { log });
    } catch (err) {
        log.warning(`extractPopularTimes error: ${err.message}`);
    }

    return result;
}

async function extractBarsForCurrentDay(page) {
    const bars = await page.$$('.dpoVLd[aria-label], div[aria-label*="busy"], .C7xf8b div[aria-label]');
    const dayBars = [];

    for (const bar of bars) {
        try {
            const ariaLabel = await bar.evaluate((el) => el.getAttribute('aria-label') || '');
            const hourMatch = ariaLabel.match(/at\s+(\d+\s*(?:AM|PM))/i) ||
                ariaLabel.match(/around\s+(\d+\s*(?:AM|PM))/i);
            const pctMatch = ariaLabel.match(/(\d+)%/);

            if (hourMatch) {
                dayBars.push({
                    hour: hourMatch[1].trim(),
                    busynessPercent: pctMatch ? parseInt(pctMatch[1], 10) : 0,
                });
            }
        } catch {
            // Skip
        }
    }

    return dayBars;
}

// ========== DESCRIPTION ==========

export async function extractDescription(page, log) {
    const result = {
        description: null,
        fromTheBusiness: null,
        identifiesAs: [],
    };

    try {
        result.description = await resolveSelectorText(page, SELECTORS.placeDetail.description, { log });
        result.fromTheBusiness = await resolveSelectorText(page, SELECTORS.placeDetail.fromTheBusiness, { log });

        const identEls = await resolveSelectorAll(page, SELECTORS.placeDetail.identifiesAs, { log });
        if (identEls.length > 0) {
            result.identifiesAs = await Promise.all(
                identEls.map((el) => el.evaluate((e) => e.textContent?.trim() || null)),
            );
            result.identifiesAs = result.identifiesAs.filter(Boolean);
        }
    } catch (err) {
        log.warning(`extractDescription error: ${err.message}`);
    }

    return result;
}

// ========== RELATED PLACES ==========

export async function extractRelatedPlaces(page, log) {
    const result = { peopleAlsoSearchFor: [] };

    try {
        const linkEls = await resolveSelectorAll(page, SELECTORS.placeDetail.relatedPlaces, { log });
        for (const linkEl of linkEls) {
            try {
                const data = await linkEl.evaluate((el) => ({
                    name: el.querySelector('.qBF1Pd, .fontTitleSmall')?.textContent?.trim() || el.textContent?.trim() || null,
                    url: el.href || null,
                }));
                if (data.name) {
                    // Try to extract place ID from URL
                    const pidMatch = data.url?.match(/place\/[^/]+\/(Ch[A-Za-z0-9_-]+)/);
                    result.peopleAlsoSearchFor.push({
                        name: data.name,
                        placeId: pidMatch ? pidMatch[1] : null,
                        url: data.url,
                    });
                }
            } catch {
                // Skip
            }
        }
    } catch (err) {
        log.warning(`extractRelatedPlaces error: ${err.message}`);
    }

    return result;
}

// ========== Q&A ==========

export async function extractQA(page, log) {
    const result = { qna: null };

    try {
        // Try to expand Q&A
        const { element: qaBtn } = await resolveSelector(page, SELECTORS.placeDetail.qaMoreButton, { log });
        if (qaBtn) {
            await qaBtn.click();
            await sleep(2000);

            // Scroll to load more Q&A
            for (let i = 0; i < 3; i++) {
                await page.evaluate(() => {
                    const panel = document.querySelector('.m6QErb.DxyBCb') || document.querySelector('div[role="main"]');
                    if (panel) panel.scrollTo(0, panel.scrollHeight);
                });
                await sleep(1000);
            }
        }

        const questionEls = await resolveSelectorAll(page, SELECTORS.placeDetail.qaQuestionItem, { log });
        if (questionEls.length === 0) return result;

        const qna = [];
        for (const qEl of questionEls.slice(0, 50)) {
            try {
                const data = await qEl.evaluate((el) => {
                    const getText = (sel) => el.querySelector(sel)?.textContent?.trim() || null;

                    // Question parts
                    const questionText = getText('.JgzqYd span') || getText('.PuaHbe') || getText('.tL9Q4c');

                    // Question author — look for the first link/button with a person name
                    const qAuthorEl = el.querySelector('.LIi3ob') || el.querySelector('.GSM50');
                    const questionAuthor = qAuthorEl?.textContent?.trim() || getText('.cIbSTd') || null;

                    // Question date
                    const questionDate = getText('.JKXGK') || getText('.dehysf') || null;

                    // Upvotes
                    const upvoteText = getText('.XkSzU') || getText('.LIi3ob + span') || '0';
                    const upvotes = parseInt(upvoteText.replace(/[^0-9]/g, '') || '0', 10);

                    // Answer — usually a child container
                    const answerContainer = el.querySelector('.iNTye') || el.querySelector('.aVbfBd');
                    let answerText = null;
                    let answerAuthor = null;
                    let answerDate = null;

                    if (answerContainer) {
                        answerText = answerContainer.querySelector('span')?.textContent?.trim() || null;
                        // Answer author is typically in a separate element within the answer block
                        const aAuthorEl = answerContainer.querySelector('.GSM50') ||
                            answerContainer.querySelector('.LIi3ob') ||
                            answerContainer.querySelector('.KMkiLb');
                        answerAuthor = aAuthorEl?.textContent?.trim() || null;
                        // Answer date
                        const aDateEl = answerContainer.querySelector('.dehysf') ||
                            answerContainer.querySelector('.JKXGK');
                        answerDate = aDateEl?.textContent?.trim() || null;
                    }

                    return {
                        questionText,
                        questionAuthor,
                        questionDate,
                        upvotes,
                        answerText,
                        answerAuthor,
                        answerDate,
                    };
                });
                qna.push(data);
            } catch {
                // Skip
            }
        }

        if (qaBtn) {
            await page.keyboard.press('Escape');
            await sleep(1000);
        }

        result.qna = qna.length > 0 ? qna : null;
    } catch (err) {
        log.warning(`extractQA error: ${err.message}`);
    }

    return result;
}

// ========== POSTS ==========

export async function extractPosts(page, log) {
    const result = { posts: null };

    try {
        const postEls = await resolveSelectorAll(page, SELECTORS.placeDetail.postItem, { log });
        if (postEls.length === 0) return result;

        const posts = [];
        for (const postEl of postEls) {
            try {
                const data = await postEl.evaluate((el) => {
                    const getText = (sel) => el.querySelector(sel)?.textContent?.trim() || null;
                    const getSrc = (sel) => el.querySelector(sel)?.src || null;
                    // CTA button — try multiple selectors
                    const ctaEl = el.querySelector('a.Gx1XGd') || el.querySelector('a[data-item-id*="cta"]') ||
                        el.querySelector('a[href]:not([href="#"])');
                    return {
                        title: getText('.tHYF9e') || null,
                        text: getText('.gAzKNe span') || getText('.fontBodyMedium') || null,
                        imageUrl: getSrc('.ofB6Xe img') || getSrc('img'),
                        date: getText('.rsqaWe') || getText('.dehysf') || null,
                        ctaText: ctaEl?.textContent?.trim() || null,
                        ctaUrl: ctaEl?.href || null,
                    };
                });
                posts.push(data);
            } catch {
                // Skip
            }
        }

        result.posts = posts.length > 0 ? posts : null;
    } catch (err) {
        log.warning(`extractPosts error: ${err.message}`);
    }

    return result;
}

// ========== PRODUCTS ==========

export async function extractProducts(page, log) {
    const result = { products: null };

    try {
        const productEls = await resolveSelectorAll(page, SELECTORS.placeDetail.productItem, { log });
        if (productEls.length === 0) return result;

        const products = [];
        for (const pEl of productEls) {
            try {
                const data = await pEl.evaluate((el) => {
                    const getText = (sel) => el.querySelector(sel)?.textContent?.trim() || null;
                    // Image: check src, data-src, and background-image for lazy-loaded images
                    const img = el.querySelector('img');
                    let imageUrl = null;
                    if (img) {
                        imageUrl = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || null;
                    }
                    if (!imageUrl) {
                        const bgEl = el.querySelector('[style*="background-image"]');
                        if (bgEl) {
                            const m = bgEl.style.backgroundImage?.match(/url\(["']?([^"')]+)/);
                            if (m) imageUrl = m[1];
                        }
                    }
                    return {
                        name: getText('.fontTitleSmall') || getText('h3') || null,
                        price: getText('.fontBodyMedium') || null,
                        description: getText('.fontBodySmall') || null,
                        imageUrl,
                    };
                });
                if (data.name) products.push(data);
            } catch {
                // Skip
            }
        }

        result.products = products.length > 0 ? products : null;
    } catch (err) {
        log.warning(`extractProducts error: ${err.message}`);
    }

    return result;
}

// ========== SERVICES ==========

export async function extractServices(page, log) {
    const result = { services: null };

    try {
        const serviceEls = await resolveSelectorAll(page, SELECTORS.placeDetail.serviceItem, { log });
        if (serviceEls.length === 0) return result;

        const services = [];
        for (const sEl of serviceEls) {
            try {
                const data = await sEl.evaluate((el) => {
                    const getText = (sel) => el.querySelector(sel)?.textContent?.trim() || null;
                    const img = el.querySelector('img');
                    return {
                        name: getText('.fontTitleSmall') || getText('h3') || null,
                        price: getText('.fontBodyMedium') || null,
                        description: getText('.fontBodySmall') || null,
                        imageUrl: img?.src || img?.getAttribute('data-src') || null,
                    };
                });
                if (data.name) services.push(data);
            } catch {
                // Skip
            }
        }

        result.services = services.length > 0 ? services : null;
    } catch (err) {
        log.warning(`extractServices error: ${err.message}`);
    }

    return result;
}

// ========== PROFILE CLAIMED/VERIFIED ==========

async function extractProfileClaimed(page, log) {
    // Check multiple signals for claimed/verified profile
    const claimed = await page.evaluate(() => {
        // Signal 1: data-owner-id attribute exists
        if (document.querySelector('span[data-owner-id]')) return true;
        // Signal 2: "Claimed" text in the profile
        if (document.querySelector('[aria-label*="Claimed"]')) return true;
        // Signal 3: Owner-managed link present
        if (document.querySelector('a[data-item-id="merchant"]')) return true;
        // Signal 4: "Suggest an edit" button (only on claimed profiles)
        if (document.querySelector('button[aria-label*="Suggest an edit"]')) return true;
        // Signal 5: Owner response on reviews (strong signal)
        if (document.querySelector('.CDe7pd, .ODSEW')) return true;
        return null; // Unknown
    });
    return claimed;
}

// ========== AUDIT METRICS (computed from scraped data) ==========

function computeAuditMetrics(data) {
    const metrics = {
        // Description
        descriptionLength: data.description ? data.description.length : 0,
        hasDescription: !!data.description,

        // Profile
        profileClaimed: data.profileClaimed || null,
        businessNameHasKeywords: false,

        // Categories
        secondaryCategoriesCount: data.additionalCategories?.length || 0,

        // Services quality
        servicesCount: data.services?.length || 0,
        servicesWithDescriptions: 0,
        servicesQuality: 'No services section',

        // Reviews audit
        replyRate: null,
        repliedReviewsCount: 0,
        unrepliedReviewsCount: 0,
        latestReviewDate: null,
        oldestReviewDate: null,
        averageReviewRating: null,
        reviewVelocityPerMonth: null,

        // Posts audit
        postsCount: data.posts?.length || 0,
        latestPostDate: null,
        postTypes: [],
        postFrequency: 'No posts',

        // Hours audit
        hoursCompleteness: 'No hours set',
        daysWithHours: 0,
        hasSpecialHours: !!(data.specialHours && data.specialHours.length > 0),

        // Attributes audit
        attributeSectionsCount: 0,
        totalAttributesCount: 0,
        attributesComplete: false,

        // Photos audit
        latestPhotoDate: null,
        latestPhotoUploader: null,
        hasRecentPhotos: false,
    };

    // ---- Business Name keyword stuffing check ----
    if (data.name && data.primaryCategory) {
        const nameLower = data.name.toLowerCase();
        const catLower = data.primaryCategory.toLowerCase();
        const catWords = catLower.split(/\s+/).filter((w) => w.length > 3);
        metrics.businessNameHasKeywords = catWords.some((w) => nameLower.includes(w));
        // Also check for city name
        if (data.city) {
            metrics.businessNameHasKeywords = metrics.businessNameHasKeywords ||
                nameLower.includes(data.city.toLowerCase());
        }
    }

    // ---- Services quality ----
    if (data.services && data.services.length > 0) {
        metrics.servicesWithDescriptions = data.services.filter((s) => s.description && s.description.length > 10).length;
        if (metrics.servicesWithDescriptions >= 10) {
            metrics.servicesQuality = '10+ with 150+ word descriptions';
        } else if (metrics.servicesWithDescriptions >= 5) {
            metrics.servicesQuality = '5-9 with descriptions';
        } else if (data.services.length > 0) {
            metrics.servicesQuality = 'Listed, no descriptions';
        }
    }

    // ---- Reply rate from reviews ----
    if (data.reviews && data.reviews.length > 0) {
        const withResponse = data.reviews.filter((r) => r.ownerResponseText).length;
        const total = data.reviews.length;
        metrics.repliedReviewsCount = withResponse;
        metrics.unrepliedReviewsCount = total - withResponse;
        metrics.replyRate = Math.round((withResponse / total) * 100);

        // Latest / oldest review date
        metrics.latestReviewDate = data.reviews[0]?.date || null;
        metrics.oldestReviewDate = data.reviews[data.reviews.length - 1]?.date || null;

        // Average rating
        const ratings = data.reviews.filter((r) => r.rating).map((r) => r.rating);
        if (ratings.length > 0) {
            metrics.averageReviewRating = Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10;
        }

        // Review velocity — estimate from date spread in reviews
        // Google gives relative dates like "2 months ago", "a week ago"
        // We'll count reviews and estimate monthly rate
        const reviewCount = data.reviews.length;
        // Rough estimate: if we have 100 reviews sorted by newest,
        // check how many have "month" vs "week" vs "day" in their date
        let recentCount = 0;
        for (const r of data.reviews) {
            const d = (r.date || '').toLowerCase();
            if (d.includes('day') || d.includes('week') || d.includes('a month') || d.includes('1 month')) {
                recentCount++;
            }
        }
        if (recentCount > 0) {
            metrics.reviewVelocityPerMonth = recentCount; // approximate monthly velocity
        }
    }

    // ---- Posts audit ----
    if (data.posts && data.posts.length > 0) {
        metrics.latestPostDate = data.posts[0]?.date || null;

        // Classify post types based on content
        const types = new Set();
        for (const post of data.posts) {
            if (post.ctaText) {
                const cta = post.ctaText.toLowerCase();
                if (cta.includes('offer') || cta.includes('deal') || cta.includes('discount')) types.add('Offer');
                else if (cta.includes('book') || cta.includes('reserve') || cta.includes('appointment')) types.add('Event/Booking');
                else if (cta.includes('learn') || cta.includes('more')) types.add('Update');
                else if (cta.includes('order') || cta.includes('buy') || cta.includes('shop')) types.add('Product');
                else types.add('Update');
            } else if (post.imageUrl && post.text) {
                types.add('Photo Update');
            } else {
                types.add('Update');
            }
        }
        metrics.postTypes = [...types];

        // Post frequency estimate from dates
        const postCount = data.posts.length;
        if (postCount >= 3) {
            metrics.postFrequency = '3+/week';
        } else if (postCount >= 1) {
            metrics.postFrequency = '1-2/week';
        }
        // Check if latest post is old
        const latestDate = (data.posts[0]?.date || '').toLowerCase();
        if (latestDate.includes('month') || latestDate.includes('year')) {
            metrics.postFrequency = 'Inactive 30+ days';
        }
    }

    // ---- Hours audit ----
    if (data.weeklyHours) {
        const dayCount = Object.keys(data.weeklyHours).length;
        metrics.daysWithHours = dayCount;
        if (dayCount >= 7) {
            metrics.hoursCompleteness = 'All 7 days set';
        } else if (dayCount >= 5) {
            metrics.hoursCompleteness = 'Open days only';
        } else if (dayCount >= 1) {
            metrics.hoursCompleteness = 'Some days';
        }
    }

    // ---- Attributes audit ----
    if (data.attributes) {
        metrics.attributeSectionsCount = Object.keys(data.attributes).length;
        metrics.totalAttributesCount = Object.values(data.attributes)
            .reduce((sum, items) => sum + items.length, 0);
        // Consider "complete" if 5+ sections
        metrics.attributesComplete = metrics.attributeSectionsCount >= 5;
    }

    // ---- Website audit ----
    if (data.websiteInfo) {
        const wi = data.websiteInfo;
        metrics.websiteSpeed = wi.websiteSpeed;
        metrics.websiteLoadTimeMs = wi.websiteLoadTimeMs;
        metrics.isHttps = wi.isHttps;
        metrics.hasSchemaMarkup = wi.hasSchemaMarkup;
        metrics.schemaTypes = wi.schemaTypes;
        metrics.isMobileFriendly = wi.isMobileFriendly;
        metrics.hasOpenGraph = wi.hasOpenGraph;
        // GMB Master Pro scoring: "Fast + Schema (4 pts)", "Website, no schema (2 pts)", etc.
        if (!data.website) {
            metrics.websiteSpeedAndSchema = 'No website';
        } else if (wi.websiteSpeed === 'Fast' && wi.hasSchemaMarkup) {
            metrics.websiteSpeedAndSchema = 'Fast + Schema';
        } else if (wi.hasSchemaMarkup) {
            metrics.websiteSpeedAndSchema = 'Has schema, slow';
        } else if (wi.websiteSpeed === 'Slow' || wi.websiteSpeed === 'Error') {
            metrics.websiteSpeedAndSchema = 'Slow, no schema';
        } else {
            metrics.websiteSpeedAndSchema = 'Website, no schema';
        }
    }

    // ---- Photo recency ----
    metrics.latestPhotoDate = data.latestPhotoDate || null;
    metrics.latestPhotoUploader = data.latestPhotoUploader || null;
    if (data.latestPhotoDate) {
        const d = data.latestPhotoDate.toLowerCase();
        metrics.hasRecentPhotos = d.includes('day') || d.includes('hour') || d.includes('minute')
            || d.includes('week') || d.includes('just now');
    }

    return metrics;
}

// ========== WEBSITE SPEED & SCHEMA CHECK ==========

export async function extractWebsiteInfo(page, log, websiteUrl) {
    const result = {
        websiteSpeed: null,
        websiteLoadTimeMs: null,
        websiteStatus: null,
        hasSchemaMarkup: false,
        schemaTypes: [],
        schemaDetails: null,
        hasOpenGraph: false,
        openGraphData: null,
        metaTitle: null,
        metaDescription: null,
        metaDescriptionLength: 0,
        isHttps: false,
        isMobileFriendly: null,
    };

    if (!websiteUrl) return result;

    try {
        log.info(`Checking website speed & schema: ${websiteUrl}`);

        // Ensure HTTPS
        result.isHttps = websiteUrl.startsWith('https://');

        // Navigate to the website and measure load time
        const startTime = Date.now();

        const response = await page.goto(websiteUrl, {
            waitUntil: 'networkidle2',
            timeout: 20000,
        });

        const loadTimeMs = Date.now() - startTime;
        result.websiteLoadTimeMs = loadTimeMs;
        result.websiteStatus = response?.status() || null;

        // Classify speed
        if (loadTimeMs <= 3000) {
            result.websiteSpeed = 'Fast';
        } else if (loadTimeMs <= 5000) {
            result.websiteSpeed = 'Average';
        } else {
            result.websiteSpeed = 'Slow';
        }

        // Get Performance API metrics if available
        const perfMetrics = await page.evaluate(() => {
            try {
                const perf = performance.getEntriesByType('navigation')[0];
                if (perf) {
                    return {
                        domContentLoaded: Math.round(perf.domContentLoadedEventEnd - perf.startTime),
                        fullyLoaded: Math.round(perf.loadEventEnd - perf.startTime),
                        ttfb: Math.round(perf.responseStart - perf.startTime),
                        domInteractive: Math.round(perf.domInteractive - perf.startTime),
                    };
                }
            } catch { /* */ }
            return null;
        });
        if (perfMetrics) {
            result.websitePerformance = perfMetrics;
        }

        // Extract ALL schema markup (JSON-LD, microdata, RDFa)
        const schemaData = await page.evaluate(() => {
            const schemas = [];

            // 1. JSON-LD schemas
            const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
            for (const script of jsonLdScripts) {
                try {
                    const parsed = JSON.parse(script.textContent);
                    if (Array.isArray(parsed)) {
                        for (const item of parsed) {
                            schemas.push({
                                format: 'JSON-LD',
                                type: item['@type'] || 'Unknown',
                                data: item,
                            });
                        }
                    } else if (parsed['@graph']) {
                        for (const item of parsed['@graph']) {
                            schemas.push({
                                format: 'JSON-LD',
                                type: item['@type'] || 'Unknown',
                                data: item,
                            });
                        }
                    } else {
                        schemas.push({
                            format: 'JSON-LD',
                            type: parsed['@type'] || 'Unknown',
                            data: parsed,
                        });
                    }
                } catch { /* invalid JSON-LD */ }
            }

            // 2. Microdata schemas
            const microdataEls = document.querySelectorAll('[itemtype]');
            for (const el of microdataEls) {
                const itemtype = el.getAttribute('itemtype') || '';
                const typeName = itemtype.split('/').pop();
                schemas.push({
                    format: 'Microdata',
                    type: typeName,
                    url: itemtype,
                });
            }

            return schemas;
        });

        if (schemaData.length > 0) {
            result.hasSchemaMarkup = true;
            result.schemaTypes = [...new Set(schemaData.map((s) => s.type))];
            result.schemaDetails = schemaData.map((s) => ({
                format: s.format,
                type: s.type,
                // For JSON-LD, include key fields without the full dump
                ...(s.data ? {
                    name: s.data.name || null,
                    url: s.data.url || null,
                    telephone: s.data.telephone || null,
                    address: s.data.address ? (typeof s.data.address === 'string' ? s.data.address : s.data.address.streetAddress) : null,
                    aggregateRating: s.data.aggregateRating ? {
                        ratingValue: s.data.aggregateRating.ratingValue,
                        reviewCount: s.data.aggregateRating.reviewCount,
                    } : null,
                } : {}),
            }));
        }

        // Extract Open Graph tags
        const ogData = await page.evaluate(() => {
            const og = {};
            const ogTags = document.querySelectorAll('meta[property^="og:"]');
            for (const tag of ogTags) {
                const prop = tag.getAttribute('property')?.replace('og:', '') || '';
                og[prop] = tag.getAttribute('content') || '';
            }
            return Object.keys(og).length > 0 ? og : null;
        });

        if (ogData) {
            result.hasOpenGraph = true;
            result.openGraphData = ogData;
        }

        // Extract meta title and description
        const metaTags = await page.evaluate(() => {
            const title = document.title || document.querySelector('meta[property="og:title"]')?.content || null;
            const descEl = document.querySelector('meta[name="description"]') ||
                document.querySelector('meta[property="og:description"]');
            const description = descEl?.getAttribute('content') || null;
            // Check viewport meta for mobile-friendliness hint
            const viewport = document.querySelector('meta[name="viewport"]');
            const hasMobileViewport = viewport?.content?.includes('width=device-width') || false;
            return { title, description, hasMobileViewport };
        });

        result.metaTitle = metaTags.title;
        result.metaDescription = metaTags.description;
        result.metaDescriptionLength = metaTags.description?.length || 0;
        result.isMobileFriendly = metaTags.hasMobileViewport;

        log.info(`Website: ${result.websiteSpeed} (${loadTimeMs}ms), Schema: ${result.schemaTypes.join(', ') || 'None'}, HTTPS: ${result.isHttps}`);
    } catch (err) {
        log.warning(`extractWebsiteInfo error: ${err.message}`);
        result.websiteSpeed = 'Error';
        result.websiteStatus = 'unreachable';
    }

    return result;
}

// ========== MASTER ORCHESTRATOR ==========

export async function extractAllPlaceData(page, log, deepScrape = false) {
    const coreInfo = await extractCoreInfo(page, log);
    const ratings = await extractRatingsAndReviews(page, log, deepScrape);
    const hours = await extractHours(page, log);
    const photos = await extractPhotos(page, log, deepScrape);
    const attributes = await extractAttributes(page, log);
    const popularTimes = await extractPopularTimes(page, log);
    const desc = await extractDescription(page, log);
    const related = await extractRelatedPlaces(page, log);
    const posts = await extractPosts(page, log);
    const products = await extractProducts(page, log);
    const services = await extractServices(page, log);

    let qa = { qna: null };
    if (deepScrape) {
        qa = await extractQA(page, log);
    }

    // Profile claimed/verified
    const profileClaimed = await extractProfileClaimed(page, log);

    // Website speed & schema check — navigate to the business website if it exists
    let websiteInfo = {
        websiteSpeed: null, websiteLoadTimeMs: null, websiteStatus: null,
        hasSchemaMarkup: false, schemaTypes: [], schemaDetails: null,
        hasOpenGraph: false, openGraphData: null, metaTitle: null,
        metaDescription: null, metaDescriptionLength: 0, isHttps: false,
        isMobileFriendly: null,
    };
    if (coreInfo.website) {
        // Save current URL so we can go back
        const gbpUrl = page.url();
        websiteInfo = await extractWebsiteInfo(page, log, coreInfo.website);
        // Navigate back to GBP page (in case further extraction is needed)
        try {
            await page.goto(gbpUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
            await sleep(1000);
        } catch {
            // Best effort to go back
        }
    }

    // Build raw data
    const allFields = {
        ...coreInfo,
        ...ratings,
        ...hours,
        ...photos,
        ...attributes,
        ...popularTimes,
        ...desc,
        ...related,
        ...posts,
        ...products,
        ...services,
        ...qa,
        profileClaimed,
        websiteInfo,
    };

    // Compute audit metrics from the scraped data
    const auditMetrics = computeAuditMetrics(allFields);

    // Extraction completeness
    const fieldCount = Object.keys(allFields).length;
    const populatedCount = Object.values(allFields).filter((v) =>
        v !== null && v !== undefined && v !== false && !(Array.isArray(v) && v.length === 0),
    ).length;

    return {
        ...allFields,
        auditMetrics,
        selectorVersion: SELECTOR_VERSION,
        extractionCompleteness: {
            totalFields: fieldCount,
            populatedFields: populatedCount,
            completenessPercent: Math.round((populatedCount / fieldCount) * 100),
        },
        scrapedAt: new Date().toISOString(),
    };
}
