/**
 * Local headful test — opens a visible Chrome browser so you can watch
 * Run: node test-local.js
 */
import puppeteer from 'puppeteer-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(stealthPlugin());

const TEST_URL = 'https://www.google.com/maps/place/Aishwarya+Dental+Clinic/@18.003794,79.5692814,17z/data=!4m6!3m5!1s0x3a3345828ea0a587:0x3302fd6fd791b137!8m2!3d18.003794!4d79.5692814!16s%2Fg%2F11gff6mz25';

async function run() {
    console.log('Launching VISIBLE browser...');
    const browser = await puppeteer.launch({
        headless: false,  // VISIBLE browser — you can watch it!
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--start-maximized',
        ],
        defaultViewport: { width: 1366, height: 768 },
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');

    console.log('Navigating to Google Maps...');
    await page.goto(TEST_URL, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for business name
    await page.waitForSelector('h1', { timeout: 15000 });
    console.log('Page loaded!');

    // Log what we see
    const debugInfo = await page.evaluate(() => ({
        title: document.title,
        h1: document.querySelector('h1')?.textContent?.trim()?.substring(0, 80),
        tabCount: document.querySelectorAll('.hh2c6').length,
        reviewIdCount: document.querySelectorAll('[data-review-id]').length,
        hasSortBtn: !!document.querySelector('button[data-value="Sort"]'),
        bodyStart: document.body.innerText.substring(0, 300),
    }));
    console.log('DEBUG:', JSON.stringify(debugInfo, null, 2));

    // Wait 5 seconds so you can see the page
    console.log('\n--- Look at the browser! ---');
    console.log('Tabs found:', debugInfo.tabCount);
    console.log('Review elements:', debugInfo.reviewIdCount);
    console.log('Sort button:', debugInfo.hasSortBtn);

    // Try clicking Reviews tab
    const reviewTab = await page.$('button.hh2c6[aria-label*="Reviews"]');
    if (reviewTab) {
        console.log('\nClicking Reviews tab...');
        await reviewTab.click();
        await new Promise(r => setTimeout(r, 3000));

        const afterClick = await page.evaluate(() => ({
            reviewIdCount: document.querySelectorAll('[data-review-id]').length,
            sortBtn: !!document.querySelector('button[data-value="Sort"]'),
        }));
        console.log('After Reviews tab click:', afterClick);
    } else {
        console.log('\nNo Reviews tab found! Headless-style layout.');
        console.log('Trying to scroll and find reviews...');

        // Scroll the panel
        for (let i = 0; i < 10; i++) {
            await page.evaluate(() => {
                const containers = ['.m6QErb.DxyBCb.kA9KIf.dS8AEf', '.m6QErb.DxyBCb', 'div[role="main"]'];
                for (const sel of containers) {
                    const el = document.querySelector(sel);
                    if (el && el.scrollHeight > el.clientHeight) {
                        el.scrollTo(0, el.scrollHeight);
                        return;
                    }
                }
                window.scrollTo(0, document.body.scrollHeight);
            });
            await new Promise(r => setTimeout(r, 1500));

            const count = await page.evaluate(() => document.querySelectorAll('[data-review-id]').length);
            console.log(`  Scroll ${i + 1}: ${count} reviews found`);
            if (count > 0) break;
        }
    }

    // Final count
    const finalCount = await page.evaluate(() => document.querySelectorAll('[data-review-id]').length);
    console.log(`\nFinal review count: ${finalCount}`);

    // Keep browser open for 30 seconds so you can inspect
    console.log('\nBrowser will stay open for 30 seconds — look at it!');
    console.log('Check: are there tabs? Reviews visible? What does the page look like?');
    await new Promise(r => setTimeout(r, 30000));

    await browser.close();
    console.log('Done!');
}

run().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
