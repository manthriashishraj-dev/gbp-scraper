import { SELECTOR_VERSION } from './constants.js';

export { SELECTOR_VERSION };

/**
 * Centralized selector registry for Google Maps / Google Business Profile.
 * Every CSS selector used in the scraper is defined here.
 *
 * Each entry: { primary: string, fallbacks: string[], description: string }
 *
 * NEVER hardcode selectors in extractors or routes — always import from here.
 * When Google changes their DOM, update selectors here and bump SELECTOR_VERSION in constants.js.
 */
export const SELECTORS = {
    // ========== COOKIE CONSENT ==========
    cookieConsent: {
        acceptButton: {
            primary: 'button[aria-label="Accept all"]',
            fallbacks: ['form[action*="consent"] button', '#L2AGLb', 'button[jsname="b3VHJd"]'],
            description: 'Google cookie consent accept button',
        },
    },

    // ========== SEARCH RESULTS PAGE ==========
    searchResults: {
        feedContainer: {
            primary: 'div[role="feed"]',
            fallbacks: ['.m6QErb[aria-label]', 'div.m6QErb.DxyBCb'],
            description: 'Scrollable container holding search result listings',
        },
        listingLink: {
            primary: 'a.hfpxzc',
            fallbacks: ['div[role="article"] > a', 'div.Nv2PK a[href*="/maps/place/"]'],
            description: 'Anchor link to individual place from search results',
        },
        endOfResults: {
            primary: 'span.HlvSq',
            fallbacks: ['p.fontBodyMedium > span > span', 'div.m6QErb span.HlvSq'],
            description: '"You\'ve reached the end of the list" indicator',
        },
    },

    // ========== PLACE DETAIL PAGE — CORE INFO ==========
    placeDetail: {
        businessName: {
            primary: 'h1.DUwDvf',
            fallbacks: ['h1[data-attrid="title"]', 'div[role="main"] h1', 'h1.fontHeadlineLarge'],
            description: 'Business name heading on place page',
        },
        primaryCategory: {
            primary: 'button[jsaction*="category"]',
            fallbacks: ['.DkEaL', 'span[jsan*="category"]', 'button.DkEaL'],
            description: 'Primary business category button/text',
        },
        additionalCategories: {
            primary: '.skqShb span.mgr77e',
            fallbacks: ['.DkEaL + span', '.LrzXr span'],
            description: 'Additional/secondary category labels',
        },
        address: {
            primary: 'button[data-item-id="address"]',
            fallbacks: ['[data-tooltip="Copy address"]', '[aria-label*="Address"]', 'div.rogA2c div.Io6YTe'],
            description: 'Address info button/text',
        },
        phone: {
            primary: 'button[data-item-id^="phone:"]',
            fallbacks: ['[data-tooltip="Copy phone number"]', '[aria-label*="Phone"]', 'a[data-item-id^="phone:"]'],
            description: 'Phone number button/link',
        },
        website: {
            primary: 'a[data-item-id="authority"]',
            fallbacks: ['a[data-tooltip="Open website"]', 'a.CsEnBe[href]', 'a[aria-label*="Website"]'],
            description: 'Website link',
        },
        plusCode: {
            primary: 'button[data-item-id="oloc"]',
            fallbacks: ['[data-tooltip="Copy plus code"]', '[aria-label*="Plus code"]'],
            description: 'Plus Code button/text',
        },
        menuUrl: {
            primary: 'a[data-item-id="menu"]',
            fallbacks: ['a[aria-label*="Menu"]', 'a[href*="menu"]'],
            description: 'Menu URL link (restaurants)',
        },
        orderUrl: {
            primary: 'a[data-item-id^="order"]',
            fallbacks: ['a[aria-label*="Order"]', 'a.lcr4fd'],
            description: 'Order/delivery URL link',
        },
        appointmentUrl: {
            primary: 'a[data-item-id="appointment"]',
            fallbacks: ['a[aria-label*="appointment"]', 'a[data-item-id="book"]'],
            description: 'Appointment/booking URL link',
        },
        priceLevel: {
            primary: 'span[aria-label*="Price"]',
            fallbacks: ['.mgr77e.fi0Ikd', '.LfKETd span.mgr77e'],
            description: 'Price level indicator ($ to $$$$)',
        },
        temporarilyClosed: {
            primary: 'span.fCEvvc',
            fallbacks: ['div[class*="closed"]', 'span[data-closed="temporary"]'],
            description: 'Temporarily closed notice',
        },
        permanentlyClosed: {
            primary: 'span.wPkdE',
            fallbacks: ['div.permanent-closed', 'span[data-closed="permanent"]'],
            description: 'Permanently closed notice',
        },

        // ========== RATINGS & REVIEWS ==========
        ratingValue: {
            primary: 'div.F7nice span[aria-hidden="true"]',
            fallbacks: ['span.ceNzKf', 'div.F7nice span:first-child', 'div.fontDisplayLarge'],
            description: 'Numeric rating value (e.g., 4.5)',
        },
        reviewCount: {
            primary: 'div.F7nice span[aria-label]',
            fallbacks: ['span[aria-label*="reviews"]', 'button[jsaction*="review"] span', 'span.UY7F9'],
            description: 'Review count text (e.g., "(1,234 reviews)")',
        },
        ratingDistribution: {
            primary: 'tr.BHOKXe',
            fallbacks: ['div[jsaction*="star_histogram"] tr', 'table.jANrlb tr'],
            description: 'Star rating histogram table rows',
        },
        reviewHighlights: {
            primary: 'div.KNfEk span',
            fallbacks: ['button.e2moi span', 'div.review-highlights span'],
            description: 'Review highlight keyword chips',
        },
        moreReviewsButton: {
            primary: 'button[jsaction*="pane.rating.moreReviews"]',
            fallbacks: ['button[aria-label*="reviews"]', 'a[href*="reviews"]', 'button.HHrUdb'],
            description: 'Button to open the full reviews panel',
        },
        reviewsSortButton: {
            primary: 'button[data-value="Sort"]',
            fallbacks: ['button[aria-label="Sort reviews"]', 'button.g88MCb'],
            description: 'Sort reviews dropdown button',
        },
        reviewsSortNewest: {
            primary: 'div[data-index="1"]',
            fallbacks: ['li[data-index="1"]', 'div[role="menuitemradio"]:nth-child(2)'],
            description: 'Sort by newest reviews option',
        },
        reviewItem: {
            primary: 'div.jftiEf',
            fallbacks: ['div[data-review-id]', 'div.WMbnJf'],
            description: 'Individual review container',
        },
        reviewAuthorName: {
            primary: '.d4r55',
            fallbacks: ['button[data-review-id] .WNxzHc', '.WNxzHc d4r55'],
            description: 'Reviewer display name',
        },
        reviewAuthorUrl: {
            primary: '.WNxzHc a',
            fallbacks: ['button.WEBjve', 'a[href*="contrib"]'],
            description: 'Reviewer profile URL',
        },
        reviewRating: {
            primary: '.kvMYJc',
            fallbacks: ['span[role="img"][aria-label*="star"]', '.DU9Pgb span[role="img"]'],
            description: 'Individual review star rating (aria-label has star count)',
        },
        reviewText: {
            primary: 'span.wiI7pd',
            fallbacks: ['.MyEned span.wiI7pd', '.review-full-text'],
            description: 'Review body text',
        },
        reviewMoreButton: {
            primary: 'button.w8nwRe',
            fallbacks: ['button[aria-label="See more"]', 'a.review-more-link'],
            description: 'Button to expand truncated review text',
        },
        reviewDate: {
            primary: '.rsqaWe',
            fallbacks: ['.DU9Pgb', 'span.dehysf'],
            description: 'Review timestamp text (e.g., "2 months ago")',
        },
        reviewLikes: {
            primary: 'button.GBkF3d span',
            fallbacks: ['span.pkWtMe', 'button[aria-label*="Like"] span'],
            description: 'Review likes/helpful count',
        },
        reviewPhotos: {
            primary: '.KtCyie button img',
            fallbacks: ['.review-photos img', 'div[data-review-id] img[src*="googleusercontent"]'],
            description: 'Photos attached to a review',
        },
        ownerResponse: {
            primary: '.CDe7pd .wiI7pd',
            fallbacks: ['.ODSEW .wiI7pd', '.owner-response-text'],
            description: 'Owner/business response text',
        },
        ownerResponseDate: {
            primary: '.CDe7pd .rsqaWe',
            fallbacks: ['.ODSEW .DU9Pgb'],
            description: 'Owner response date',
        },
        localGuideBadge: {
            primary: '.RfnDt span',
            fallbacks: ['.QV3IV span', '.local-guide-badge'],
            description: 'Local Guide badge and level indicator',
        },

        // ========== HOURS ==========
        hoursExpandButton: {
            primary: '.t39EBf[data-hide-tooltip-on-mouse-move]',
            fallbacks: ['[aria-label*="hours"]', '[data-item-id="oh"]', 'div.OqCZI button'],
            description: 'Button to expand hours section',
        },
        hoursTable: {
            primary: '.OqCZI table tr',
            fallbacks: ['table.eK4R0e tr', '[aria-label*="hours"] table tr', '.y0skZc tr'],
            description: 'Table rows in weekly hours schedule',
        },
        hoursCurrentStatus: {
            primary: '.ZDu9vd span.ZLl8Od',
            fallbacks: ['.OqCZI span.ZLl8Od', 'span[data-opens]'],
            description: 'Current open/closed status text',
        },

        // ========== PHOTOS ==========
        coverPhoto: {
            primary: 'button[jsaction*="heroHeaderImage"] img',
            fallbacks: ['img.p0Ci', 'div.RZ66Rb img', 'button.aoRNLd img'],
            description: 'Main hero/cover photo',
        },
        photoCount: {
            primary: 'button[jsaction*="pane.heroHeaderImage.click"] div.fontBodySmall',
            fallbacks: ['div.YkuOqf', 'button[aria-label*="photo"] span', 'div.cRLbXd'],
            description: 'Photo count label',
        },
        photoTab: {
            primary: 'button[data-tab-index="1"]',
            fallbacks: ['button[aria-label*="Photos"]', 'a[href*="photos"]'],
            description: 'Photos tab button',
        },
        photoCategoryTab: {
            primary: '.OKAoZd button',
            fallbacks: ['.ZKCDEc button', 'div[role="tablist"] button'],
            description: 'Photo category tabs (All, Interior, Exterior, etc.)',
        },
        photoGalleryImage: {
            primary: 'a[data-photo-index] img',
            fallbacks: ['.U39Pmb img', 'div.loaded img[src*="googleusercontent"]', '.Uf0tqf img'],
            description: 'Individual photo in gallery view',
        },

        // ========== ATTRIBUTES & AMENITIES ==========
        aboutTab: {
            primary: 'button[aria-label="About"]',
            fallbacks: ['button[data-tab-index="6"]', 'a[href*="about"]'],
            description: 'About tab button to show attributes',
        },
        attributeSection: {
            primary: '.LTs0Rc',
            fallbacks: ['div[jsaction*="amenities"]', '.iP2t7d', '.AcxpOf'],
            description: 'Container for attribute chip sections',
        },
        attributeSectionTitle: {
            primary: '.iP2t7d .fontTitleSmall',
            fallbacks: ['.LTs0Rc h2', '.AcxpOf h4'],
            description: 'Heading text for an attribute section',
        },
        attributeChip: {
            primary: '.CK16pd',
            fallbacks: ['span[data-tooltip]', '.Ufn4mc', 'li.hpLkke'],
            description: 'Individual attribute chip within a section',
        },
        attributeChipText: {
            primary: '.CK16pd span',
            fallbacks: ['.Ufn4mc span', '.hpLkke span'],
            description: 'Text content of an attribute chip',
        },
        attributeChipAvailable: {
            primary: '.CK16pd:not(.hgKrVf)',
            fallbacks: ['.CK16pd[aria-checked="true"]'],
            description: 'Attribute chip that is available (not crossed out)',
        },

        // ========== POPULAR TIMES ==========
        popularTimesContainer: {
            primary: '.C7xf8b',
            fallbacks: ['div[aria-label*="Popular times"]', 'div.g2BVhd'],
            description: 'Container for all popular times graphs',
        },
        popularTimesDay: {
            primary: '.C7xf8b > div',
            fallbacks: ['div[aria-label*="Popular times"] > div'],
            description: 'Individual day container within popular times',
        },
        popularTimeBar: {
            primary: '.dpoVLd[aria-label]',
            fallbacks: ['div[aria-label*="busy"]', '.C7xf8b div[aria-label]'],
            description: 'Individual bar with busyness aria-label',
        },
        liveVisitData: {
            primary: '.Gzq8Ee',
            fallbacks: ['.woJkKe', 'div[aria-label*="currently"]'],
            description: 'Live busyness indicator',
        },

        // ========== Q&A ==========
        qaContainer: {
            primary: '.LQjNnc',
            fallbacks: ['div[data-question-id]', '.yo4MCd'],
            description: 'Q&A section container',
        },
        qaMoreButton: {
            primary: 'button[aria-label*="question"]',
            fallbacks: ['button[jsaction*="qa.moreQuestions"]', 'a[href*="qa"]'],
            description: 'Button to expand/see all Q&A',
        },
        qaQuestionItem: {
            primary: '.LfKETd',
            fallbacks: ['div[data-question-id]', '.yo4MCd > div'],
            description: 'Individual question container',
        },
        qaQuestionText: {
            primary: '.JgzqYd span',
            fallbacks: ['.PuaHbe', '.question-text'],
            description: 'Question text',
        },
        qaQuestionAuthor: {
            primary: '.cIbSTd',
            fallbacks: ['.question-author'],
            description: 'Question author name',
        },
        qaQuestionDate: {
            primary: '.JKXGK',
            fallbacks: ['.question-date'],
            description: 'Question date/relative time',
        },
        qaAnswerText: {
            primary: '.iNTye span',
            fallbacks: ['.answer-text'],
            description: 'Answer text',
        },
        qaAnswerAuthor: {
            primary: '.KMkiLb',
            fallbacks: ['.answer-author'],
            description: 'Answer author name',
        },
        qaUpvotes: {
            primary: '.XkSzU',
            fallbacks: ['.question-upvotes'],
            description: 'Question upvote count',
        },

        // ========== DESCRIPTION ==========
        description: {
            primary: 'div.WeS02d div.PYvSYb',
            fallbacks: ['div[aria-label="Description"] span', '.bkqMod', '.WeS02d span'],
            description: 'Business description / about text',
        },
        fromTheBusiness: {
            primary: '.LfKETd .PYvSYb',
            fallbacks: ['.WeS02d .fontBodyMedium'],
            description: '"From the business" summary section',
        },
        identifiesAs: {
            primary: '.fYksBf',
            fallbacks: ['span.RGCvMc'],
            description: '"Identifies as" tags',
        },

        // ========== POSTS ==========
        postsContainer: {
            primary: '.cIbSTd',
            fallbacks: ['div[jsaction*="posts"]', '.DZSIDd'],
            description: 'Google Posts section container',
        },
        postItem: {
            primary: '.cIbSTd > div',
            fallbacks: ['.DZSIDd > div'],
            description: 'Individual Google Post',
        },
        postTitle: {
            primary: '.tHYF9e',
            fallbacks: ['.post-title'],
            description: 'Post title text',
        },
        postText: {
            primary: '.gAzKNe span',
            fallbacks: ['.post-body'],
            description: 'Post body text',
        },
        postImage: {
            primary: '.ofB6Xe img',
            fallbacks: ['.post-image img'],
            description: 'Post image',
        },
        postDate: {
            primary: '.gAzKNe .rsqaWe',
            fallbacks: ['.post-date'],
            description: 'Post date',
        },

        // ========== PRODUCTS ==========
        productsTab: {
            primary: 'button[aria-label="Products"]',
            fallbacks: ['button[data-tab-index]:has(div:contains("Products"))'],
            description: 'Products tab button',
        },
        productItem: {
            primary: '.bkCbR',
            fallbacks: ['.VkpGBb', '.products-list > div'],
            description: 'Individual product container',
        },
        productName: {
            primary: '.bkCbR .fontTitleSmall',
            fallbacks: ['.product-name'],
            description: 'Product name',
        },
        productPrice: {
            primary: '.bkCbR .fontBodyMedium',
            fallbacks: ['.product-price'],
            description: 'Product price',
        },
        productImage: {
            primary: '.bkCbR img',
            fallbacks: ['.product-image img'],
            description: 'Product image',
        },

        // ========== SERVICES ==========
        servicesTab: {
            primary: 'button[aria-label="Services"]',
            fallbacks: ['button[data-tab-index]:has(div:contains("Services"))'],
            description: 'Services tab button',
        },
        serviceItem: {
            primary: '.NrDZNb',
            fallbacks: ['.service-item', '.VkpGBb'],
            description: 'Individual service container',
        },
        serviceName: {
            primary: '.NrDZNb .fontTitleSmall',
            fallbacks: ['.service-name'],
            description: 'Service name',
        },
        servicePrice: {
            primary: '.NrDZNb .fontBodyMedium',
            fallbacks: ['.service-price'],
            description: 'Service price',
        },

        // ========== RELATED PLACES ==========
        relatedPlaces: {
            primary: '.Ymd7jc a',
            fallbacks: ['a[data-place-id]', '.VkpGBb a[href*="/maps/place/"]'],
            description: 'Related "people also search for" place links',
        },
        relatedPlaceName: {
            primary: '.Ymd7jc .qBF1Pd',
            fallbacks: ['.VkpGBb .fontTitleSmall'],
            description: 'Related place name text',
        },
    },
};

// ========== SELECTOR RESOLUTION UTILITIES ==========

/**
 * Try primary selector, then fallbacks. Returns the element or null.
 * Logs a detailed warning if all selectors fail.
 */
export async function resolveSelector(page, selectorEntry, options = {}) {
    const { timeout = 3000, waitFor = false, log = null } = options;
    const allSelectors = [selectorEntry.primary, ...(selectorEntry.fallbacks || [])];
    let usedIndex = -1;

    for (let i = 0; i < allSelectors.length; i++) {
        try {
            let el;
            if (waitFor) {
                el = await page.waitForSelector(allSelectors[i], { timeout });
            } else {
                el = await page.$(allSelectors[i]);
            }
            if (el) {
                usedIndex = i;
                if (i > 0 && log) {
                    log.info(`Selector fallback used for "${selectorEntry.description}": fallback[${i - 1}] = "${allSelectors[i]}"`);
                }
                return { element: el, usedSelector: allSelectors[i], wasFallback: i > 0 };
            }
        } catch {
            // Selector not found or timed out, try next
        }
    }

    if (log) {
        log.warning(
            `Selector FAILED for "${selectorEntry.description}". Tried: ${allSelectors.join(', ')}`,
        );
    }
    return { element: null, usedSelector: null, wasFallback: false };
}

/**
 * Same as resolveSelector but returns all matching elements (array).
 */
export async function resolveSelectorAll(page, selectorEntry, options = {}) {
    const { log = null } = options;
    const allSelectors = [selectorEntry.primary, ...(selectorEntry.fallbacks || [])];

    for (let i = 0; i < allSelectors.length; i++) {
        const els = await page.$$(allSelectors[i]);
        if (els.length > 0) {
            if (i > 0 && log) {
                log.info(`SelectorAll fallback used for "${selectorEntry.description}": fallback[${i - 1}]`);
            }
            return els;
        }
    }

    if (log) {
        log.warning(`SelectorAll FAILED for "${selectorEntry.description}".`);
    }
    return [];
}

/**
 * Resolve a selector and return its textContent directly.
 */
export async function resolveSelectorText(page, selectorEntry, options = {}) {
    const { element } = await resolveSelector(page, selectorEntry, options);
    if (!element) return null;
    try {
        const text = await element.evaluate((el) => el.textContent?.trim() || null);
        return text;
    } catch {
        return null;
    }
}

/**
 * Resolve a selector and return the value of a specified attribute.
 */
export async function resolveSelectorAttr(page, selectorEntry, attrName, options = {}) {
    const { element } = await resolveSelector(page, selectorEntry, options);
    if (!element) return null;
    try {
        const val = await element.evaluate((el, attr) => el.getAttribute(attr), attrName);
        return val;
    } catch {
        return null;
    }
}
