import { SELECTORS, SELECTOR_VERSION } from './selectors.js';

/**
 * Run a full health audit of every selector in the registry against the current page.
 * Returns a structured report suitable for saving to Apify key-value store.
 */
export async function auditSelectors(page, log) {
    const details = [];
    let healthy = 0;
    let fallbackUsed = 0;
    let broken = 0;

    const categories = Object.entries(SELECTORS);

    for (const [category, entries] of categories) {
        for (const [fieldName, selectorEntry] of Object.entries(entries)) {
            const fullName = `${category}.${fieldName}`;
            const allSelectors = [selectorEntry.primary, ...(selectorEntry.fallbacks || [])];
            let status = 'BROKEN';
            let matchedSelector = null;
            let matchedIndex = null;
            let domSnippet = null;
            let suggestedSelectors = [];

            for (let i = 0; i < allSelectors.length; i++) {
                try {
                    const el = await page.$(allSelectors[i]);
                    if (el) {
                        matchedSelector = allSelectors[i];
                        matchedIndex = i;
                        status = i === 0 ? 'OK' : 'FALLBACK';
                        break;
                    }
                } catch {
                    // selector invalid or failed
                }
            }

            if (status === 'BROKEN') {
                // Capture DOM snippet for debugging
                try {
                    domSnippet = await page.evaluate(() => {
                        const body = document.body;
                        if (!body) return '<no body>';
                        return body.innerHTML.substring(0, 500);
                    });
                } catch {
                    domSnippet = '<failed to capture>';
                }

                // Generate auto-heal hints
                suggestedSelectors = await generateSelectorHints(page, selectorEntry, log);
                broken++;
            } else if (status === 'FALLBACK') {
                fallbackUsed++;
            } else {
                healthy++;
            }

            details.push({
                field: fullName,
                description: selectorEntry.description,
                status,
                usedSelector: matchedSelector,
                usedIndex: matchedIndex !== null ? (matchedIndex === 0 ? 'primary' : `fallback[${matchedIndex - 1}]`) : null,
                primaryFailed: status === 'FALLBACK' ? selectorEntry.primary : undefined,
                allSelectorsTried: status === 'BROKEN' ? allSelectors : undefined,
                domSnippet: status === 'BROKEN' ? domSnippet?.substring(0, 500) : undefined,
                suggestedSelectors: suggestedSelectors.length > 0 ? suggestedSelectors : undefined,
            });
        }
    }

    const total = healthy + fallbackUsed + broken;

    const report = {
        selectorVersion: SELECTOR_VERSION,
        timestamp: new Date().toISOString(),
        pageUrl: page.url(),
        totalSelectors: total,
        healthy,
        fallbackUsed,
        broken,
        details,
    };

    // Log summary
    const statusIcon = (s) => (s === 'OK' ? '✅' : s === 'FALLBACK' ? '⚠️' : '❌');
    log.info('=== SELECTOR HEALTH CHECK ===');
    log.info(`✅ ${healthy}/${total} selectors OK`);
    if (fallbackUsed > 0) {
        const fbFields = details.filter((d) => d.status === 'FALLBACK').map((d) => d.field);
        log.warning(`⚠️  ${fallbackUsed}/${total} using fallback selectors (${fbFields.join(', ')})`);
    }
    if (broken > 0) {
        const brokenFields = details.filter((d) => d.status === 'BROKEN').map((d) => d.field);
        log.error(`❌ ${broken}/${total} BROKEN — no selector works (${brokenFields.join(', ')})`);
    }
    log.info('==============================');

    return report;
}

/**
 * When a selector breaks, try to suggest possible replacements by analyzing the DOM.
 */
async function generateSelectorHints(page, selectorEntry, log) {
    const hints = [];
    const description = selectorEntry.description.toLowerCase();

    try {
        const suggestions = await page.evaluate((desc) => {
            const results = [];

            // Heuristic 1: Look for elements with matching aria-labels
            const keywords = desc.split(/\s+/).filter((w) => w.length > 3);
            for (const kw of keywords) {
                const ariaEls = document.querySelectorAll(`[aria-label*="${kw}"]`);
                for (const el of ariaEls) {
                    if (el.tagName && el.className) {
                        results.push(`${el.tagName.toLowerCase()}.${el.className.split(' ')[0]}[aria-label*="${kw}"]`);
                    }
                    if (results.length >= 3) break;
                }
                if (results.length >= 3) break;
            }

            // Heuristic 2: Look for elements with matching text content
            if (results.length < 3) {
                const textKw = keywords[0];
                if (textKw) {
                    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
                    let node;
                    let count = 0;
                    while ((node = walker.nextNode()) && count < 3) {
                        if (node.textContent?.toLowerCase().includes(textKw)) {
                            const parent = node.parentElement;
                            if (parent && parent.tagName) {
                                const tag = parent.tagName.toLowerCase();
                                const cls = parent.className ? `.${parent.className.split(' ')[0]}` : '';
                                results.push(`${tag}${cls}`);
                                count++;
                            }
                        }
                    }
                }
            }

            return [...new Set(results)].slice(0, 3);
        }, description);

        hints.push(...suggestions);
    } catch {
        // Failed to generate hints — not critical
    }

    return hints;
}

/**
 * Take a debug screenshot of a specific area of the page.
 * Saves to Apify key-value store.
 */
export async function captureDebugScreenshot(page, fieldName, kvStore) {
    try {
        const screenshot = await page.screenshot({ fullPage: false, type: 'png' });
        await kvStore.setValue(`debug_screenshot_${fieldName}`, screenshot, { contentType: 'image/png' });
    } catch {
        // Screenshot capture failed — non-critical
    }
}
