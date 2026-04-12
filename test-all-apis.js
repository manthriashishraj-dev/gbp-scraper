import puppeteer from 'puppeteer-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(stealthPlugin());

const TEST_URL = 'https://www.google.com/maps/place/Aishwarya+Dental+Clinic/@18.003794,79.5692814,17z/data=!4m6!3m5!1s0x3a3345828ea0a587:0x3302fd6fd791b137!8m2!3d18.003794!4d79.5692814!16s%2Fg%2F11gff6mz25';

async function run() {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--enable-gpu', '--window-size=1920,1080'],
        defaultViewport: { width: 1920, height: 1080 },
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');

    // Capture ALL XHR/fetch responses
    const responses = [];
    page.on('response', async (response) => {
        const url = response.url();
        if (url.includes('google.com/maps') || url.includes('batchexecute')) {
            try {
                const body = await response.text();
                responses.push({
                    url: url.substring(0, 120),
                    size: body.length,
                    hasNani: body.includes('Nani'),
                    hasReviewText: body.includes('excellent experience'),
                    hasOwnerResp: body.includes('NO PATIENT'),
                    hasPhoto: body.includes('AF1Qip'),
                    hasMonday: body.includes('Monday'),
                    hasSunday: body.includes('Sunday'),
                });
            } catch {}
        }
    });

    await page.goto(TEST_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 5000));

    console.log(`Captured ${responses.length} responses:\n`);
    for (const r of responses) {
        const flags = [];
        if (r.hasNani) flags.push('REVIEWS');
        if (r.hasPhoto) flags.push('PHOTOS');
        if (r.hasMonday || r.hasSunday) flags.push('HOURS');
        if (r.hasOwnerResp) flags.push('OWNER_REPLY');
        if (flags.length > 0 || r.size > 1000) {
            console.log(`${r.size.toString().padStart(8)} chars | ${flags.join(',').padEnd(30)} | ${r.url}`);
        }
    }

    await browser.close();
}

run().catch(e => { console.error(e); process.exit(1); });
