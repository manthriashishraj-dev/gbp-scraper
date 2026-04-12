import puppeteer from 'puppeteer-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(stealthPlugin());

async function run() {
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--start-maximized'],
        defaultViewport: { width: 1366, height: 768 },
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');

    // Step 1: Google Search
    console.log('1. Searching Google...');
    await page.goto('https://www.google.com/search?q=Aishwarya+Dental+Clinic+Hanamkonda', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: 'kp-1-search.png' });
    console.log('   Saved kp-1-search.png');

    // Step 2: Click "X Google reviews"
    console.log('2. Clicking Google reviews link...');
    await page.evaluate(() => {
        const links = document.querySelectorAll('a');
        for (const a of links) {
            if (a.textContent?.includes('Google reviews') && a.textContent?.match(/\d+/)) {
                a.click();
                return true;
            }
        }
        return false;
    });
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: 'kp-2-reviews-panel.png' });
    console.log('   Saved kp-2-reviews-panel.png');

    // Step 3: Check frames
    console.log('3. Checking frames...');
    const frames = page.frames();
    console.log(`   Total frames: ${frames.length}`);

    for (let i = 0; i < frames.length; i++) {
        try {
            const frameInfo = await frames[i].evaluate(() => ({
                url: window.location.href.substring(0, 80),
                reviewCount: document.querySelectorAll('[data-review-id], .jftiEf, .gws-localreviews__google-review').length,
                starSpans: document.querySelectorAll('span[aria-label*="star"]').length,
            }));
            if (frameInfo.reviewCount > 0 || frameInfo.starSpans > 0) {
                console.log(`   Frame ${i}: ${frameInfo.reviewCount} reviews, ${frameInfo.starSpans} stars - URL: ${frameInfo.url}`);
            }
        } catch {
            // Skip inaccessible frames
        }
    }

    // Step 4: Try to find reviews in any frame
    let reviewFrame = null;
    for (const frame of frames) {
        try {
            const count = await frame.evaluate(() => {
                return document.querySelectorAll('.jftiEf, [data-review-id], .gws-localreviews__google-review').length;
            });
            if (count > 0) {
                reviewFrame = frame;
                console.log(`\n4. Found review frame! ${count} reviews`);
                break;
            }
        } catch {}
    }

    if (!reviewFrame) {
        // Try main frame with different selectors
        const mainReviews = await page.evaluate(() => {
            return {
                starSpans: document.querySelectorAll('span[aria-label*="star"]').length,
                reviewDivs: document.querySelectorAll('.jftiEf, [data-review-id]').length,
                allBtns: Array.from(document.querySelectorAll('button')).filter(b => b.textContent?.includes('Newest') || b.textContent?.includes('Most relevant')).map(b => b.textContent?.trim()),
            };
        });
        console.log('\n4. Main frame review check:', mainReviews);
    }

    // Step 5: Click Newest if found
    if (reviewFrame) {
        console.log('5. Clicking Newest...');
        await reviewFrame.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const b of btns) {
                if (b.textContent?.trim() === 'Newest') { b.click(); return; }
            }
        });
        await new Promise(r => setTimeout(r, 2000));

        // Extract first few reviews
        const reviews = await reviewFrame.evaluate(() => {
            const els = document.querySelectorAll('.jftiEf, [data-review-id]');
            return Array.from(els).slice(0, 3).map(el => ({
                author: el.querySelector('.d4r55, .TSUbDb a')?.textContent?.trim(),
                text: el.querySelector('span.wiI7pd, .review-full-text')?.textContent?.trim()?.substring(0, 100),
                date: el.querySelector('.rsqaWe, .dehysf')?.textContent?.trim(),
            }));
        });
        console.log('   First 3 reviews:', JSON.stringify(reviews, null, 2));
    }

    console.log('\nBrowser stays open for 20 seconds...');
    await new Promise(r => setTimeout(r, 20000));
    await browser.close();
    console.log('Done!');
}

run().catch(e => { console.error(e); process.exit(1); });
