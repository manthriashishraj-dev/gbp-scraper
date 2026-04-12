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

        // Review count — extract from aria-label which contains "95 reviews"
        const reviewCountAttr = await resolveSelectorAttr(page, SELECTORS.placeDetail.reviewCount, 'aria-label', { log });
        if (reviewCountAttr) {
            const digits = reviewCountAttr.replace(/[^0-9]/g, '');
            result.reviewCount = digits ? parseInt(digits, 10) : null;
        }
        // Fallback: extract from text like "(95)"
        if (!result.reviewCount) {
            const countText = await resolveSelectorText(page, SELECTORS.placeDetail.reviewCount, { log });
            if (countText) {
                const digits = countText.replace(/[^0-9]/g, '');
                result.reviewCount = digits ? parseInt(digits, 10) : null;
            }
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
        const currentUrl = page.url();
        const businessName = await page.$eval('h1', (el) => el.textContent?.trim()).catch(() => null);

        // ===== PRIMARY: KP Reviews Panel via Google Search =====
        // This opens reviews in an iframe that Puppeteer can access via page.frames()
        if (businessName) {
            log.info('Extracting reviews via Knowledge Panel (Google Search)...');
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(businessName)}`;
            await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
            await sleep(2500);

            // Click "X Google reviews" link to open the reviews panel
            await page.evaluate(() => {
                const links = document.querySelectorAll('a');
                for (const a of links) {
                    const text = a.textContent?.trim() || '';
                    if (text.includes('Google reviews') && text.match(/\d+/)) {
                        a.click();
                        return;
                    }
                }
            });
            await sleep(3000);

            // Click "Newest" sort button inside the reviews panel
            await page.evaluate(() => {
                const btns = document.querySelectorAll('button, span[role="button"], div[role="button"]');
                for (const b of btns) {
                    if (b.textContent?.trim() === 'Newest') { b.click(); return; }
                }
            });
            await sleep(2000);

            // Find the reviews iframe (Puppeteer can access cross-origin frames)
            let reviewFrame = null;
            const frames = page.frames();
            for (const frame of frames) {
                try {
                    const hasReviews = await frame.evaluate(() => {
                        return document.querySelectorAll('.jftiEf, [data-review-id], span[aria-label*="star"]').length > 0;
                    }).catch(() => 0);
                    if (hasReviews > 0) {
                        reviewFrame = frame;
                        break;
                    }
                } catch { /* skip inaccessible frames */ }
            }

            // If no iframe found, reviews might be in the main page
            if (!reviewFrame) {
                const mainPageReviews = await page.evaluate(() => {
                    return document.querySelectorAll('span[aria-label*="star"]').length;
                });
                if (mainPageReviews > 0) reviewFrame = page.mainFrame();
            }

            if (reviewFrame) {
                // Click "Newest" inside the frame too
                await reviewFrame.evaluate(() => {
                    const btns = document.querySelectorAll('button, span[role="button"], div[role="button"]');
                    for (const b of btns) {
                        if (b.textContent?.trim() === 'Newest') { b.click(); break; }
                    }
                }).catch(() => {});
                await sleep(2000);

                // Scroll to load all reviews in the frame
                for (let i = 0; i < 30; i++) {
                    const count = await reviewFrame.evaluate(() => {
                        const reviews = document.querySelectorAll('.jftiEf, [data-review-id]');
                        const scrollable = document.querySelector('.review-dialog-list, .m6QErb, [role="list"]') || document.documentElement;
                        scrollable.scrollTo(0, scrollable.scrollHeight);
                        return reviews.length;
                    }).catch(() => 0);

                    if (count >= 95) break; // All reviews loaded
                    await sleep(1000);
                }

                // Expand all "More" buttons
                await reviewFrame.evaluate(() => {
                    const btns = document.querySelectorAll('button.w8nwRe, button[aria-label="See more"], [data-expandable-section] button');
                    btns.forEach(b => { try { b.click(); } catch {} });
                }).catch(() => {});
                await sleep(1000);

                // Extract ALL reviews from the frame
                const extractedReviews = await reviewFrame.evaluate(() => {
                    const results = [];
                    // Try multiple selectors for review containers
                    const reviewEls = document.querySelectorAll('.jftiEf, [data-review-id], .gws-localreviews__google-review');

                    for (const el of reviewEls) {
                        try {
                            const getText = (sel) => el.querySelector(sel)?.textContent?.trim() || null;

                            // Author name
                            const authorEl = el.querySelector('.d4r55, .TSUbDb a, .reviewer-name');
                            const author = authorEl?.textContent?.trim() || null;

                            // Author profile URL
                            const authorLink = el.querySelector('a[href*="contrib"], .TSUbDb a');
                            const authorUrl = authorLink?.href || null;

                            // Author review count + photo count
                            const authorInfoEl = el.querySelector('.RfnDt, .reviewer-info, .A503be');
                            const authorInfoText = authorInfoEl?.textContent?.trim() || '';
                            const reviewCountMatch = authorInfoText.match(/(\d+)\s*review/i);
                            const photoCountMatch = authorInfoText.match(/(\d+)\s*photo/i);
                            const authorReviewCount = reviewCountMatch ? parseInt(reviewCountMatch[1], 10) : null;
                            const authorPhotoCount = photoCountMatch ? parseInt(photoCountMatch[1], 10) : null;

                            // Local Guide
                            const isLocalGuide = authorInfoText.toLowerCase().includes('local guide');
                            let localGuideLevel = null;
                            const lvlMatch = authorInfoText.match(/Level\s*(\d+)/i);
                            if (lvlMatch) localGuideLevel = parseInt(lvlMatch[1], 10);

                            // Rating
                            const ratingEl = el.querySelector('.kvMYJc, span[role="img"][aria-label*="star"]');
                            let rating = null;
                            if (ratingEl) {
                                const ariaLabel = ratingEl.getAttribute('aria-label') || '';
                                const m = ariaLabel.match(/(\d)/);
                                if (m) rating = parseInt(m[1], 10);
                            }

                            // Date
                            const dateEl = el.querySelector('.rsqaWe, .dehysf, .DU9Pgb');
                            const date = dateEl?.textContent?.trim() || null;
                            const isEdited = date?.toLowerCase().includes('edited') || false;

                            // Review text
                            const textEl = el.querySelector('span.wiI7pd, .review-full-text, .Jtu6Td');
                            const text = textEl?.textContent?.trim() || null;

                            // Owner response
                            const ownerBlock = el.querySelector('.CDe7pd, .owner-response');
                            let ownerResponseText = null;
                            let ownerResponseDate = null;
                            if (ownerBlock) {
                                ownerResponseText = ownerBlock.querySelector('.wiI7pd, span')?.textContent?.trim() || null;
                                ownerResponseDate = ownerBlock.querySelector('.rsqaWe, .DU9Pgb')?.textContent?.trim() || null;
                            }

                            // Likes/reactions
                            const likesEl = el.querySelector('button.GBkF3d span, .pkWtMe, [aria-label*="Like"] span');
                            let likesCount = 0;
                            if (likesEl) {
                                const n = parseInt(likesEl.textContent?.trim(), 10);
                                if (!isNaN(n)) likesCount = n;
                            }

                            // Review photos
                            const photoEls = el.querySelectorAll('img[src*="googleusercontent"]');
                            const reviewPhotos = Array.from(photoEls)
                                .map(img => img.src)
                                .filter(src => src?.includes('googleusercontent'));

                            results.push({
                                author,
                                authorUrl,
                                authorReviewCount,
                                authorPhotoCount,
                                isLocalGuide,
                                localGuideLevel,
                                rating,
                                date,
                                isEdited,
                                text,
                                ownerResponseText,
                                ownerResponseDate,
                                likesCount,
                                reviewPhotos,
                            });
                        } catch {
                            // Skip malformed review
                        }
                    }
                    return results;
                }).catch(() => []);

                if (extractedReviews.length > 0) {
                    reviews.push(...extractedReviews);
                    log.info(`KP Reviews: extracted ${reviews.length} reviews from Knowledge Panel`);
                }
            }

            // Navigate back to Maps
            await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
            await sleep(1000);
        }

        // ===== FALLBACK: Maps Reviews Panel =====
        if (reviews.length === 0) {
            log.info('KP reviews failed, falling back to Maps reviews panel...');

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

            await scrollReviewsPanel(page, log, 100);

            // Expand truncated texts
            for (let expandPass = 0; expandPass < 3; expandPass++) {
                const moreButtons = await page.$$(SELECTORS.placeDetail.reviewMoreButton.primary);
                if (moreButtons.length === 0) break;
                for (const btn of moreButtons) {
                    try { await btn.click(); await sleep(200); } catch { /* */ }
                }
                await sleep(500);
            }

            const reviewEls = await resolveSelectorAll(page, SELECTORS.placeDetail.reviewItem, { log });
            for (const reviewEl of reviewEls.slice(0, 100)) {
                try {
                    const review = await reviewEl.evaluate((el) => {
                        const getText = (sel) => el.querySelector(sel)?.textContent?.trim() || null;
                        const getHref = (sel) => el.querySelector(sel)?.href || null;

                        const ratingEl = el.querySelector('.kvMYJc') || el.querySelector('span[role="img"]');
                        let stars = null;
                        if (ratingEl) {
                            const m = (ratingEl.getAttribute('aria-label') || '').match(/(\d)/);
                            if (m) stars = parseInt(m[1], 10);
                        }

                        const guideBadge = el.querySelector('.RfnDt span') || el.querySelector('.QV3IV');
                        let isLocalGuide = false;
                        let localGuideLevel = null;
                        if (guideBadge) {
                            isLocalGuide = true;
                            const lvl = guideBadge.textContent?.match(/Level\s*(\d+)/i);
                            if (lvl) localGuideLevel = parseInt(lvl[1], 10);
                        }

                        const photoEls = el.querySelectorAll('.KtCyie button img, img[src*="googleusercontent"]');
                        const photos = Array.from(photoEls).map(i => i.src).filter(s => s?.includes('googleusercontent'));

                        const likesEl = el.querySelector('button.GBkF3d span') || el.querySelector('span.pkWtMe');
                        let likes = 0;
                        if (likesEl) { const n = parseInt(likesEl.textContent?.trim(), 10); if (!isNaN(n)) likes = n; }

                        const ownerRespText = getText('.CDe7pd .wiI7pd') || getText('.ODSEW .wiI7pd');
                        const ownerRespDate = getText('.CDe7pd .rsqaWe') || getText('.ODSEW .DU9Pgb');
                        const dateText = getText('.rsqaWe') || getText('.DU9Pgb');

                        return {
                            author: getText('.d4r55') || getText('.WNxzHc'),
                            authorUrl: getHref('.WNxzHc a') || getHref('button.WEBjve'),
                            authorReviewCount: null,
                            authorPhotoCount: null,
                            isLocalGuide,
                            localGuideLevel,
                            rating: stars,
                            date: dateText,
                            isEdited: dateText?.toLowerCase().includes('edited') || false,
                            text: getText('span.wiI7pd') || getText('.MyEned span'),
                            ownerResponseText: ownerRespText,
                            ownerResponseDate: ownerRespDate,
                            likesCount: likes,
                            reviewPhotos: photos,
                        };
                    });
                    reviews.push(review);
                } catch (err) {
                    log.warning(`Failed to extract review: ${err.message}`);
                }
            }

            await page.keyboard.press('Escape');
            await sleep(1000);
        }
    } catch (err) {
        log.warning(`extractDetailedReviews error: ${err.message}`);
    }

    log.info(`Total reviews extracted: ${reviews.length}`);
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

        // Photo count — try selector first, then extract from photo button aria-label
        const countText = await resolveSelectorText(page, SELECTORS.placeDetail.photoCount, { log });
        if (countText) {
            const digits = countText.replace(/[^0-9]/g, '');
            result.photoCount = digits ? parseInt(digits, 10) : null;
        }
        // Fallback: extract from the photo button's aria-label or the gallery header
        if (!result.photoCount) {
            result.photoCount = await page.evaluate(() => {
                // Try aria-label on photo-related elements like "Photos of Business (61)"
                const photoEl = document.querySelector('[aria-label*="Photos"]') ||
                    document.querySelector('[aria-label*="photos"]');
                if (photoEl) {
                    const m = photoEl.getAttribute('aria-label')?.match(/(\d+)/);
                    if (m) return parseInt(m[1], 10);
                }
                // Try the gallery header "📷 61"
                const allText = document.body.innerText;
                const match = allText.match(/📷\s*(\d+)/);
                if (match) return parseInt(match[1], 10);
                return null;
            });
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
                        let uploader = null;
                        let date = null;

                        // Strategy 1: Look for the photo info header block
                        // Format can be: "BusinessName\nPhoto - Apr 2026" (two lines)
                        // Or: "UserName · 4 days ago" (dot-separated)
                        const headerSelectors = [
                            '.fCpYHe', '.ZProGe', '.qCHGyb', '.T6pBCe',
                            'div[jsaction*="photo"] header', '.lbkBkb',
                        ];
                        for (const sel of headerSelectors) {
                            const el = document.querySelector(sel);
                            if (!el) continue;
                            const text = el.textContent?.trim() || '';

                            // Try dot separator first: "Name · 4 days ago"
                            if (text.includes('·')) {
                                const parts = text.split('·').map((s) => s.trim());
                                if (parts.length >= 2) {
                                    uploader = parts[0];
                                    date = parts[1];
                                    break;
                                }
                            }

                            // Try "Photo - Mon YYYY" pattern (exact date from Google)
                            const photoDateMatch = text.match(/Photo\s*[-–]\s*(.+)/i);
                            if (photoDateMatch) {
                                date = photoDateMatch[1].trim();
                                // Uploader is the text before "Photo -"
                                const idx = text.toLowerCase().indexOf('photo');
                                if (idx > 0) {
                                    uploader = text.substring(0, idx).trim();
                                }
                                break;
                            }

                            // Try multiline: first child = uploader, last child or sibling = date
                            const children = el.children;
                            if (children.length >= 2) {
                                uploader = children[0]?.textContent?.trim() || null;
                                date = children[children.length - 1]?.textContent?.trim() || null;
                                if (date) break;
                            }
                        }

                        // Strategy 2: Separate element selectors
                        if (!uploader) {
                            const uploaderEl = document.querySelector('.Aq14fc span, .fCpYHe span:first-child, .ZProGe a');
                            uploader = uploaderEl?.textContent?.trim() || null;
                        }
                        if (!date) {
                            const dateEl = document.querySelector('.fCpYHe .rsqaWe, .dehysf, span[aria-label*="ago"]');
                            date = dateEl?.textContent?.trim() || null;
                        }

                        // Strategy 3: Check for "Image capture: Mon YYYY" at the bottom
                        if (!date) {
                            const allText = document.body.innerText || '';
                            const captureMatch = allText.match(/Image capture[:\s]*([A-Za-z]+\s+\d{4})/i);
                            if (captureMatch) date = captureMatch[1].trim();
                        }

                        return { uploader, date };
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

// ========== OWNER PHOTOS (from contributor profile) ==========

export async function extractOwnerPhotos(page, log, businessName) {
    const result = {
        ownerPhotoCount: null,
        ownerVideoCount: null,
        ownerContributorId: null,
        ownerContributorUrl: null,
        ownerAllPhotoUrls: [],
        ownerRecentPhotos: [],
        ownerPhotosInLast30Days: 0,
        ownerLatestPhotoDate: null,
    };

    if (!businessName) return result;

    try {
        const currentUrl = page.url();

        // Step 1: Go to Google Search, open KP photos, click "By owner", get contributor URL
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(businessName)}`;
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await sleep(2500);

        // Click "See photos" in KP
        await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const b of btns) {
                const r = b.getBoundingClientRect();
                if (r.left > 680 && b.textContent?.trim() === 'See photos') { b.click(); break; }
            }
        });
        await sleep(2000);

        // Click "By owner" tab
        await page.evaluate(() => {
            const btns = document.querySelectorAll('button, div[role="tab"]');
            for (const b of btns) {
                if (b.textContent?.trim() === 'By owner') { b.click(); break; }
            }
        });
        await sleep(2000);

        // Get the contributor URL by finding the header link in the photo overlay
        const contribUrl = await page.evaluate(() => {
            // The uploader name in the photo overlay is a clickable link to /maps/contrib/ID
            const links = document.querySelectorAll('a[href*="/maps/contrib/"]');
            for (const a of links) {
                if (a.href.includes('/maps/contrib/')) return a.href;
            }
            // Fallback: look for any element that navigates to contrib page
            const allAs = document.querySelectorAll('a');
            for (const a of allAs) {
                if (a.href?.includes('contrib')) return a.href;
            }
            return null;
        });

        if (!contribUrl) {
            // Try clicking the first "By owner" photo to open overlay, then click the uploader name
            const firstPhoto = await page.evaluate(() => {
                const imgs = document.querySelectorAll('img[src*="googleusercontent"]');
                if (imgs.length > 0) { imgs[0].closest('a, button, div')?.click(); return true; }
                return false;
            });
            if (firstPhoto) {
                await sleep(1500);
                // Now click the uploader name header to navigate to contrib page
                await page.evaluate(() => {
                    const headers = document.querySelectorAll('.fCpYHe a, .ZProGe a, a[href*="contrib"]');
                    for (const a of headers) {
                        if (a.href?.includes('contrib')) { a.click(); break; }
                    }
                });
                await sleep(2000);
            }
        } else {
            // Navigate directly to contributor page
            await page.goto(contribUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
            await sleep(2000);
        }

        // Step 2: Check if we're on the contributor profile page
        const onContribPage = page.url().includes('/maps/contrib/');
        if (!onContribPage) {
            log.warning('Could not navigate to contributor profile page');
            await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
            return result;
        }

        // Extract contributor ID from URL
        const contribIdMatch = page.url().match(/contrib\/(\d+)/);
        result.ownerContributorId = contribIdMatch ? contribIdMatch[1] : null;
        result.ownerContributorUrl = page.url().split('?')[0];

        // Step 3: Click "Photos" tab if not already active
        await page.evaluate(() => {
            const tabs = document.querySelectorAll('button[role="tab"]');
            for (const t of tabs) {
                if (t.textContent?.trim() === 'Photos') { t.click(); break; }
            }
        });
        await sleep(1000);

        // Step 4: Parse photo/video counts from the header text " 61  0"
        const counts = await page.evaluate(() => {
            const lines = document.body.innerText.split('\n').map(l => l.trim()).filter(Boolean);
            for (const line of lines) {
                // Pattern: " 61  0" or "61  0" (photo count followed by video count)
                const m = line.match(/^\s*(\d+)\s+(\d+)\s*$/);
                if (m) return { photos: parseInt(m[1], 10), videos: parseInt(m[2], 10) };
            }
            return null;
        });
        if (counts) {
            result.ownerPhotoCount = counts.photos;
            result.ownerVideoCount = counts.videos;
        }

        // Step 5: Extract ALL photo URLs from thumbnails (no clicking needed!)
        // The grid page has all thumbnail imgs with unique photo IDs in src
        // Scroll to load all thumbnails first
        for (let s = 0; s < 10; s++) {
            await page.evaluate(() => {
                const panel = document.querySelector('.m6QErb.DxyBCb') || document.querySelector('.m6QErb');
                if (panel) panel.scrollTo(0, panel.scrollHeight);
            });
            await sleep(800);
        }

        const allPhotoUrls = await page.evaluate(() => {
            const imgs = document.querySelectorAll('img[src*="googleusercontent"]');
            const urls = [];
            const seen = new Set();
            for (const img of imgs) {
                const src = img.src || '';
                const idMatch = src.match(/\/p\/(AF1Qip[A-Za-z0-9_-]+)/);
                if (idMatch && !seen.has(idMatch[1])) {
                    seen.add(idMatch[1]);
                    urls.push('https://lh3.googleusercontent.com/p/' + idMatch[1] + '=w1200-h900');
                }
            }
            return urls;
        });

        // Store all owner photo URLs
        result.ownerAllPhotoUrls = allPhotoUrls;

        // Step 6: Click ONLY the first photo to get the latest upload date
        try {
            await page.mouse.click(95, 260);
            await sleep(2000);

            const latestDate = await page.evaluate(() => {
                const allText = document.body.innerText;
                const photoMatch = allText.match(/Photo\s*[-–]\s*([A-Za-z]+\s+\d{4})/);
                if (photoMatch) return photoMatch[1].trim();
                const captureMatch = allText.match(/Image capture[:\s]*([A-Za-z]+\s+\d{4})/);
                if (captureMatch) return captureMatch[1].trim();
                // Relative date
                const headerEl = document.querySelector('.fCpYHe, .ZProGe, .qCHGyb');
                if (headerEl) {
                    const text = headerEl.textContent?.trim() || '';
                    const parts = text.split('·').map(s => s.trim());
                    if (parts.length >= 2) return parts[parts.length - 1];
                }
                return null;
            });

            result.ownerLatestPhotoDate = latestDate;

            // Build ownerRecentPhotos with URLs + date for first photo
            if (allPhotoUrls.length > 0) {
                result.ownerRecentPhotos = allPhotoUrls.slice(0, 10).map((url, i) => ({
                    index: i,
                    url,
                    date: i === 0 ? latestDate : null, // Only first photo has date from click
                }));
            }

            // Check if latest photo is within last 30 days
            if (latestDate) {
                const lower = latestDate.toLowerCase();
                if (lower.includes('day') || lower.includes('hour') || lower.includes('minute') ||
                    lower.includes('just now') || lower.includes('week')) {
                    result.ownerPhotosInLast30Days = 1; // At least 1 recent
                }
                const now = new Date();
                const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
                const currentMonth = monthNames[now.getMonth()];
                const currentYear = now.getFullYear().toString();
                if (lower.includes(currentMonth) && lower.includes(currentYear)) {
                    result.ownerPhotosInLast30Days = 1;
                }
            }
        } catch (err) {
            log.warning(`Failed to get latest photo date: ${err.message}`);
        }

        log.info(`Owner photos: ${result.ownerPhotoCount} total, ${allPhotoUrls.length} URLs extracted, latest: ${result.ownerLatestPhotoDate}`);

        // Navigate back to Maps
        await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await sleep(1000);
    } catch (err) {
        log.warning(`extractOwnerPhotos error: ${err.message}`);
    }

    return result;
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
                    const titleEl = el.querySelector('.iL3Qke.fontTitleSmall') ||
                        el.querySelector('.iP2t7d .fontTitleSmall') ||
                        el.querySelector('h2') || el.querySelector('h4');
                    const title = titleEl?.textContent?.trim() || 'Other';

                    // Find all chips — include BOTH available and unavailable with status
                    const chips = [];
                    const chipEls = el.querySelectorAll('li.hpLkke, .CK16pd, .Ufn4mc');
                    for (const chip of chipEls) {
                        // Get text from aria-label first (more reliable), then textContent
                        const ariaSpan = chip.querySelector('span[aria-label]');
                        const text = ariaSpan?.getAttribute('aria-label')?.replace(/ available| unavailable/gi, '').trim()
                            || chip.textContent?.trim();
                        const isAvailable = !chip.classList.contains('hgKrVf') &&
                            !chip.querySelector('.hgKrVf') &&
                            !(ariaSpan?.getAttribute('aria-label') || '').toLowerCase().includes('unavailable');
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
        // Strategy 1: Try Maps page selectors
        result.description = await resolveSelectorText(page, SELECTORS.placeDetail.description, { log });
        result.fromTheBusiness = await resolveSelectorText(page, SELECTORS.placeDetail.fromTheBusiness, { log });

        // Strategy 2: Try "From the owner" section on Maps (scroll down first)
        if (!result.description && !result.fromTheBusiness) {
            result.fromTheBusiness = await page.evaluate(() => {
                // Look for "From the owner" heading and get the text after it
                const headings = document.querySelectorAll('h2, h3, div.fontTitleSmall');
                for (const h of headings) {
                    const text = h.textContent?.trim().toLowerCase();
                    if (text === 'from the owner' || text === 'from the business') {
                        // Get the next sibling or parent's next text content
                        const parent = h.closest('.iP2t7d, .WeS02d, .m6QErb > div');
                        if (parent) {
                            const allText = parent.textContent?.trim();
                            // Remove the heading text
                            const cleaned = allText?.replace(/from the (owner|business)/i, '').trim();
                            if (cleaned && cleaned.length > 5) return cleaned;
                        }
                    }
                }
                return null;
            });
        }

        // Strategy 3: Try Knowledge Panel via Google Search
        if (!result.description) {
            const businessName = await resolveSelectorText(page, SELECTORS.placeDetail.businessName);
            if (businessName) {
                const kpDescription = await extractFromKnowledgePanel(page, log, businessName);
                if (kpDescription) {
                    result.description = kpDescription;
                }
            }
        }

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

/**
 * Fallback: search Google for the business name and extract description from Knowledge Panel.
 */
async function extractFromKnowledgePanel(page, log, businessName) {
    // Returns just the description string (called by extractDescription)
    const kpData = await extractFullKnowledgePanel(page, log, businessName);
    return kpData?.description || null;
}

/**
 * Full Knowledge Panel extraction — gets everything Maps doesn't show:
 * description, social profiles, third-party ratings, Google Posts with dates, etc.
 */
export async function extractFullKnowledgePanel(page, log, businessName) {
    const result = {
        description: null,
        descriptionLength: 0,
        socialProfiles: [],
        thirdPartyRatings: [],
        kpPosts: [],
        kpReviewSnippets: [],
        kpBusyness: null,
        kpAppointmentUrl: null,
    };

    if (!businessName) return result;

    try {
        const currentUrl = page.url();
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(businessName)}`;

        log.info(`Extracting Knowledge Panel from Google Search: "${businessName}"`);
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await sleep(2500);

        // Step 1: Click "More" / "Show more" on description to get full text
        await page.evaluate(() => {
            const btns = document.querySelectorAll('[data-attrid="kc:/local:merchant_description"] button, [data-attrid="kc:/local:merchant_description"] [role="button"]');
            for (const b of btns) {
                if (b.textContent?.toLowerCase().includes('more') || b.getAttribute('aria-label')?.toLowerCase().includes('more')) {
                    b.click();
                    break;
                }
            }
        });
        await sleep(1000);

        // Step 2: Extract everything from the KP
        const kpData = await page.evaluate(() => {
            const data = {
                description: null,
                descriptionLength: 0,
                socialProfiles: [],
                thirdPartyRatings: [],
                kpPosts: [],
                kpReviewSnippets: [],
                kpBusyness: null,
                kpAppointmentUrl: null,
            };

            // === FULL DESCRIPTION (after "More" click) ===
            const merchDesc = document.querySelector('[data-attrid="kc:/local:merchant_description"]');
            if (merchDesc) {
                const fullText = merchDesc.textContent?.trim() || '';
                // Extract text between first " and last " (the actual description)
                const quoteMatch = fullText.match(/"([^"]+)/);
                if (quoteMatch) {
                    data.description = quoteMatch[1].replace(/\.\.\.\s*(?:More|Show less)\s*$/i, '').trim();
                } else {
                    // Remove "From BusinessName" prefix
                    let cleaned = fullText.replace(/^From\s+[^"]*/, '').replace(/^\s*"?/, '').replace(/"?\s*(?:More|Show less)\s*$/i, '').trim();
                    if (cleaned.length > 10) data.description = cleaned;
                }
                data.descriptionLength = data.description?.length || 0;
            }
            // Fallback: other description selectors
            if (!data.description) {
                const fallbacks = ['[data-attrid*="description"] span', '.kno-rdesc span'];
                for (const sel of fallbacks) {
                    const el = document.querySelector(sel);
                    if (el) {
                        const t = el.textContent?.trim();
                        if (t && t.length > 10) { data.description = t; data.descriptionLength = t.length; break; }
                    }
                }
            }

            // === SOCIAL MEDIA PROFILES (Facebook, Instagram, Twitter, YouTube, LinkedIn) ===
            const socialEl = document.querySelector('[data-attrid*="social media"]');
            if (socialEl) {
                const links = socialEl.querySelectorAll('a');
                for (const link of links) {
                    const name = link.textContent?.trim();
                    const href = link.href;
                    if (name && href && !href.includes('google.com') && !href.includes('support.google')) {
                        data.socialProfiles.push({ platform: name, url: href });
                    }
                }
            }

            // === THIRD-PARTY RATINGS (Justdial, Practo, Yelp, TripAdvisor, etc.) ===
            const ratingsEl = document.querySelector('[data-attrid*="third_party"]');
            if (ratingsEl) {
                const text = ratingsEl.textContent?.trim() || '';
                const ratingRegex = /(\d+\.?\d*)\/(\d+)\s*([A-Za-z\s]+?)\s*·?\s*(\d[\d,]*)\s*(?:votes|reviews)/gi;
                let match;
                while ((match = ratingRegex.exec(text)) !== null) {
                    data.thirdPartyRatings.push({
                        platform: match[3].trim(),
                        rating: parseFloat(match[1]),
                        maxRating: parseInt(match[2], 10),
                        reviewCount: parseInt(match[4].replace(/,/g, ''), 10),
                    });
                }
            }

            // === GOOGLE POSTS WITH EXACT DATES ===
            const postsEl = document.querySelector('[data-attrid="kc:/local:posts"]');
            if (postsEl) {
                const text = postsEl.textContent?.trim() || '';
                const dateRegex = /([A-Z][a-z]{2}\s+\d{1,2},?\s*\d{4})/g;
                const dates = text.match(dateRegex) || [];
                const ctaWords = /Call now|Learn more|Book|Sign up|Order online|Shop now|Get offer/gi;

                for (let i = 0; i < dates.length; i++) {
                    const dateStr = dates[i];
                    const dateIdx = text.indexOf(dateStr);
                    const prevEnd = i > 0 ? text.indexOf(dates[i - 1]) + dates[i - 1].length : text.indexOf('on Google') + 9;
                    let postText = text.substring(Math.max(0, prevEnd), dateIdx).replace(ctaWords, '').trim();
                    // Clean up residual whitespace and business name prefix
                    postText = postText.replace(/^[\s\n]+/, '').replace(/[\s\n]+$/, '');
                    // Extract CTA if present between this date and next
                    const afterDate = text.substring(dateIdx + dateStr.length, i + 1 < dates.length ? text.indexOf(dates[i + 1]) : dateIdx + dateStr.length + 50);
                    const ctaMatch = afterDate.match(/Call now|Learn more|Book|Sign up|Order online|Shop now|Get offer/i);

                    if (postText.length > 5) {
                        data.kpPosts.push({
                            text: postText.substring(0, 300),
                            date: dateStr,
                            cta: ctaMatch ? ctaMatch[0] : null,
                        });
                    }
                }
            }

            // === REVIEW SNIPPETS (visible in KP without clicking "View all") ===
            const reviewSection = document.querySelector('[data-attrid*="review_summary"]');
            if (reviewSection) {
                const reviewLinks = reviewSection.querySelectorAll('a');
                for (const a of reviewLinks) {
                    const t = a.textContent?.trim();
                    // Review snippets start with " quote
                    if (t && (t.startsWith('"') || t.startsWith('\u201c'))) {
                        data.kpReviewSnippets.push(t.substring(0, 150));
                    }
                }
            }

            // === BUSYNESS ===
            const busyEl = document.querySelector('[data-attrid*="busyness"]');
            if (busyEl) {
                data.kpBusyness = busyEl.textContent?.trim()?.substring(0, 150) || null;
            }

            // === APPOINTMENT URL ===
            const apptEl = document.querySelector('[data-attrid*="appointment"] a');
            if (apptEl) {
                data.kpAppointmentUrl = apptEl.href || null;
            }

            return data;
        });

        Object.assign(result, kpData);

        // Navigate back to Maps
        await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await sleep(1000);

        log.info(`KP extracted: desc=${result.descriptionLength}chars, social=${result.socialProfiles.length}, ratings=${result.thirdPartyRatings.length}, posts=${result.kpPosts.length}, reviews=${result.kpReviewSnippets.length}`);
    } catch (err) {
        log.warning(`Knowledge Panel extraction failed: ${err.message}`);
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

    // Knowledge Panel extraction — gets description, social profiles, third-party ratings, posts
    let knowledgePanel = {
        description: null, socialProfiles: [], thirdPartyRatings: [], kpPosts: [], kpBusyness: null,
    };
    if (coreInfo.name) {
        knowledgePanel = await extractFullKnowledgePanel(page, log, coreInfo.name);
        // If Maps didn't find description but KP did, use KP's
        if (!desc.description && knowledgePanel.description) {
            desc.description = knowledgePanel.description;
        }
    }

    // Owner photos — from contributor profile (navigates to /maps/contrib/ID)
    let ownerPhotos = {
        ownerPhotoCount: null, ownerVideoCount: null, ownerContributorId: null,
        ownerContributorUrl: null, ownerRecentPhotos: [], ownerPhotosInLast30Days: 0,
        ownerLatestPhotoDate: null,
    };
    if (deepScrape && coreInfo.name) {
        ownerPhotos = await extractOwnerPhotos(page, log, coreInfo.name);
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
        ...ownerPhotos,
        socialProfiles: knowledgePanel.socialProfiles,
        thirdPartyRatings: knowledgePanel.thirdPartyRatings,
        kpPosts: knowledgePanel.kpPosts,
        kpReviewSnippets: knowledgePanel.kpReviewSnippets,
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
