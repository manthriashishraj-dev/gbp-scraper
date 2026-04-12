import puppeteer from 'puppeteer-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(stealthPlugin());

const TEST_URL = 'https://www.google.com/maps/place/Aishwarya+Dental+Clinic/@18.003794,79.5692814,17z/data=!4m6!3m5!1s0x3a3345828ea0a587:0x3302fd6fd791b137!8m2!3d18.003794!4d79.5692814!16s%2Fg%2F11gff6mz25';

async function run() {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        defaultViewport: { width: 1366, height: 768 },
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');

    console.log('Navigating...');
    await page.goto(TEST_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('h1', { timeout: 15000 });

    // Screenshot 1: initial load
    await page.screenshot({ path: 'debug-1-initial.png', fullPage: false });
    console.log('Saved debug-1-initial.png');

    // Scroll down
    for (let i = 0; i < 5; i++) {
        await page.evaluate(() => {
            const el = document.querySelector('.m6QErb.DxyBCb') || document.querySelector('div[role="main"]');
            if (el) el.scrollTo(0, el.scrollHeight);
            else window.scrollTo(0, document.body.scrollHeight);
        });
        await new Promise(r => setTimeout(r, 1500));
    }

    // Screenshot 2: after scrolling
    await page.screenshot({ path: 'debug-2-scrolled.png', fullPage: false });
    console.log('Saved debug-2-scrolled.png');

    // Log full page HTML structure (first 2000 chars)
    const html = await page.evaluate(() => document.body.innerHTML.substring(0, 3000));
    fs.writeFileSync('debug-html.txt', html);
    console.log('Saved debug-html.txt');

    // Check for cookie consent
    const hasConsent = await page.evaluate(() => {
        const btns = document.querySelectorAll('button');
        for (const b of btns) {
            if (b.textContent?.includes('Accept') || b.textContent?.includes('Reject') || b.textContent?.includes('consent')) {
                return b.textContent.trim();
            }
        }
        return null;
    });
    console.log('Cookie consent button:', hasConsent);

    const info = await page.evaluate(() => ({
        tabs: document.querySelectorAll('.hh2c6').length,
        reviews: document.querySelectorAll('[data-review-id]').length,
        jftiEf: document.querySelectorAll('.jftiEf').length,
        h1: document.querySelector('h1')?.textContent?.trim()?.substring(0, 50),
        allBtnTexts: Array.from(document.querySelectorAll('button')).slice(0, 20).map(b => b.textContent?.trim()?.substring(0, 30)).filter(t => t),
    }));
    console.log('Info:', JSON.stringify(info, null, 2));

    await browser.close();
}

run().catch(e => { console.error(e.message); process.exit(1); });
