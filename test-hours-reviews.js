import puppeteer from 'puppeteer-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

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

    let placeData = null;
    page.on('response', async (response) => {
        if (response.url().includes('preview/place')) {
            try {
                const text = await response.text();
                placeData = JSON.parse(text.replace(/^\)\]\}'[\s\n]*/, ''));
            } catch {}
        }
    });

    await page.goto(TEST_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 3000));

    const d = placeData[6];

    // Hours at d[203]
    console.log('=== HOURS d[203] ===');
    console.log(JSON.stringify(d[203], null, 2)?.substring(0, 1500));

    // Find review count — search for 95 or 48
    console.log('\n=== FINDING REVIEW COUNT ===');
    function findNum(arr, path = '', depth = 0) {
        if (depth > 6 || !arr) return [];
        const results = [];
        if (typeof arr === 'number' && (arr === 95 || arr === 48)) {
            results.push({ path, value: arr });
        }
        if (Array.isArray(arr)) {
            for (let i = 0; i < arr.length; i++) {
                results.push(...findNum(arr[i], `${path}[${i}]`, depth + 1));
            }
        }
        return results;
    }
    const numResults = findNum(d);
    console.log('Found 95 or 48:', numResults.slice(0, 10).map(r => `${r.path}=${r.value}`).join(', '));

    // Check d[4] for rating data structure
    console.log('\n=== d[4] RATING SECTION ===');
    console.log(JSON.stringify(d[4])?.substring(0, 500));

    // Check d[34] for review histogram
    console.log('\n=== d[175] POSSIBLE REVIEWS ===');
    if (d[175]) console.log(JSON.stringify(d[175])?.substring(0, 500));
    else console.log('null');

    // Dump indices around review count
    for (const idx of [4, 34, 37, 45, 57, 88, 175, 176]) {
        const item = d[idx];
        if (item) {
            const s = JSON.stringify(item);
            if (s.length < 300) {
                console.log(`\nd[${idx}]:`, s.substring(0, 200));
            } else {
                console.log(`\nd[${idx}]: ${s.length} chars`);
            }
        }
    }

    // Save full d array structure for deep analysis
    const structure = [];
    for (let i = 0; i < d.length; i++) {
        if (d[i] === null) continue;
        const s = JSON.stringify(d[i]);
        structure.push({ idx: i, len: s.length, preview: s.substring(0, 80) });
    }
    fs.writeFileSync('api-structure.json', JSON.stringify(structure, null, 2));
    console.log('\nSaved full structure to api-structure.json');

    await browser.close();
}

run().catch(e => { console.error(e); process.exit(1); });
