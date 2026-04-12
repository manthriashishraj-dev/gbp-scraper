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

    // Dump d[203] first 2 entries to see exact structure
    console.log('===== d[203] RAW (first 2 entries) =====');
    if (d[203]) {
        console.log(JSON.stringify(d[203][0], null, 2)?.substring(0, 800));
        console.log('---');
        if (d[203][1]) console.log(JSON.stringify(d[203][1], null, 2)?.substring(0, 500));
    }

    // Dump d[175] top-level structure
    console.log('\n===== d[175] STRUCTURE =====');
    if (d[175]) {
        for (let i = 0; i < Math.min(d[175].length, 15); i++) {
            const item = d[175][i];
            if (item === null) continue;
            const s = JSON.stringify(item);
            console.log(`  [175][${i}]: ${typeof item === 'string' ? item.substring(0, 60) : (Array.isArray(item) ? `array(${item.length}) ${s.substring(0, 80)}` : s.substring(0, 60))}`);
        }
    }

    // d[175][8] is likely the review container - dump its structure
    console.log('\n===== d[175][8] STRUCTURE =====');
    const r8 = d[175]?.[8];
    if (r8) {
        for (let i = 0; i < Math.min(r8.length, 5); i++) {
            const item = r8[i];
            if (item === null) continue;
            const s = JSON.stringify(item);
            console.log(`  [175][8][${i}]: ${s.length} chars, preview: ${s.substring(0, 100)}`);
        }
    }

    // Check if reviews are at a different path
    // Look for "Nani" (first reviewer name)
    console.log('\n===== FINDING "Nani" =====');
    function findStr(arr, target, path = '', depth = 0) {
        if (!arr || depth > 8) return [];
        const results = [];
        if (typeof arr === 'string' && arr === target) {
            results.push(path);
        }
        if (Array.isArray(arr)) {
            for (let i = 0; i < arr.length; i++) {
                results.push(...findStr(arr[i], target, `${path}[${i}]`, depth + 1));
            }
        }
        return results;
    }
    console.log(findStr(d[175], 'Nani').join('\n'));

    // Find "4 months ago"
    console.log('\n===== FINDING "4 months ago" =====');
    console.log(findStr(d[175], '4 months ago').join('\n'));

    // Find photo URLs - look at d[37] which was 3002 chars
    console.log('\n===== d[37] PHOTOS =====');
    if (d[37]) {
        function findPhotoIds(arr, path = '', depth = 0) {
            if (!arr || depth > 6) return [];
            const results = [];
            if (typeof arr === 'string' && arr.startsWith('AF1Qip')) {
                results.push({ path, id: arr });
            }
            if (Array.isArray(arr)) {
                for (let i = 0; i < arr.length; i++) {
                    results.push(...findPhotoIds(arr[i], `${path}[${i}]`, depth + 1));
                }
            }
            return results;
        }
        const photoIds = findPhotoIds(d[37]);
        console.log(`Found ${photoIds.length} AF1Qip photo IDs:`);
        photoIds.slice(0, 5).forEach(p => console.log(`  ${p.path}: ${p.id.substring(0, 40)}`));

        // Also check d[37][0][0][0] for photo count
        console.log('\nd[37][0][0][0]:', JSON.stringify(d[37]?.[0]?.[0]?.[0])?.substring(0, 200));
    }

    // Check d[84] for images too
    console.log('\n===== PHOTO IDs in full d =====');
    function findAF1(arr, path = '', depth = 0) {
        if (!arr || depth > 5) return [];
        const results = [];
        if (typeof arr === 'string' && arr.startsWith('AF1Qip')) {
            results.push({ path, id: arr.substring(0, 30) });
        }
        if (Array.isArray(arr)) {
            for (let i = 0; i < arr.length; i++) {
                results.push(...findAF1(arr[i], `${path}[${i}]`, depth + 1));
            }
        }
        return results;
    }
    const allPhotos = findAF1(d);
    console.log(`Total AF1Qip photo IDs: ${allPhotos.length}`);
    allPhotos.slice(0, 10).forEach(p => console.log(`  d${p.path}: ${p.id}...`));

    await browser.close();
}

run().catch(e => { console.error(e); process.exit(1); });
