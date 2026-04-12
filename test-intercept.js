/**
 * Test: Intercept Google Maps internal API responses
 * This is how successful scrapers work — they don't scrape DOM, they read the API data
 */
import puppeteer from 'puppeteer-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(stealthPlugin());

const TEST_URL = 'https://www.google.com/maps/place/Aishwarya+Dental+Clinic/@18.003794,79.5692814,17z/data=!4m6!3m5!1s0x3a3345828ea0a587:0x3302fd6fd791b137!8m2!3d18.003794!4d79.5692814!16s%2Fg%2F11gff6mz25';

async function run() {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--enable-gpu', '--use-gl=egl', '--window-size=1920,1080'],
        defaultViewport: { width: 1920, height: 1080 },
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');

    // INTERCEPT ALL RESPONSES — capture the API data
    const apiResponses = [];
    page.on('response', async (response) => {
        const url = response.url();
        if (url.includes('preview/place') || url.includes('batchexecute') || url.includes('$rpc')) {
            try {
                const body = await response.text();
                apiResponses.push({
                    url: url.substring(0, 100),
                    status: response.status(),
                    bodyLength: body.length,
                    hasBusinessName: body.includes('Aishwarya'),
                    hasPhone: body.includes('98497'),
                    hasRating: body.includes('4.8'),
                    hasHours: body.includes('9 AM') || body.includes('9 am') || body.includes('9 PM'),
                    hasReview: body.includes('excellent') || body.includes('friendly'),
                    bodyPreview: body.substring(0, 200),
                });
            } catch { /* response body not available */ }
        }
    });

    console.log('Navigating to Google Maps...');
    await page.goto(TEST_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    console.log('Page loaded. Waiting for API responses...');
    await new Promise(r => setTimeout(r, 5000));

    console.log(`\nCaptured ${apiResponses.length} API responses:`);
    for (const resp of apiResponses) {
        console.log(`\n  URL: ${resp.url}`);
        console.log(`  Status: ${resp.status}, Body: ${resp.bodyLength} chars`);
        console.log(`  Business name: ${resp.hasBusinessName}, Phone: ${resp.hasPhone}, Rating: ${resp.hasRating}`);
        console.log(`  Hours: ${resp.hasHours}, Review text: ${resp.hasReview}`);
        if (resp.hasBusinessName || resp.hasPhone) {
            console.log(`  Preview: ${resp.bodyPreview.substring(0, 100)}`);
        }
    }

    // Save the richest response to a file
    const richest = apiResponses.sort((a, b) => b.bodyLength - a.bodyLength)[0];
    if (richest) {
        console.log(`\nRichest response: ${richest.bodyLength} chars — saving to api-response.txt`);
        // Find and save the full body
        fs.writeFileSync('api-response-info.json', JSON.stringify(apiResponses, null, 2));
    }

    await browser.close();
    console.log('Done!');
}

run().catch(e => { console.error(e); process.exit(1); });
