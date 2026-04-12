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
    const r175 = d[175];

    // Save d[175] to file for analysis
    fs.writeFileSync('review-raw.json', JSON.stringify(r175, null, 2));
    console.log('Saved d[175] to review-raw.json —', JSON.stringify(r175).length, 'chars');

    // Now trace the path to "Nani" — search deeply
    function findPath(arr, target, path = '', depth = 0) {
        if (depth > 12 || !arr) return [];
        const results = [];
        if (arr === target) results.push(path);
        if (typeof arr === 'string' && arr.includes(target)) results.push(path);
        if (Array.isArray(arr)) {
            for (let i = 0; i < arr.length; i++) {
                results.push(...findPath(arr[i], target, `[${i}]${path ? '' : ''}`, depth + 1));
                if (results.length > 0 && depth < 3) {
                    // Found it — also trace from this level
                    results.push(...findPath(arr[i], target, `${path}[${i}]`, depth + 1));
                }
            }
        }
        return [...new Set(results)].slice(0, 5);
    }

    // Search in the FULL d array, not just d[175]
    console.log('\n=== Searching full d for review data ===');

    const naniPaths = findPath(d, 'Nani');
    console.log('Nani:', naniPaths.join(' | '));

    const monthsPaths = findPath(d, '4 months ago');
    console.log('4 months ago:', monthsPaths.join(' | '));

    const reviewIdPaths = findPath(d, 'Ci9DQUJRQ');
    console.log('ReviewID prefix:', reviewIdPaths.join(' | '));

    const excellentPaths = findPath(d, 'excellent experience');
    console.log('excellent experience:', excellentPaths.join(' | '));

    const noPatientPaths = findPath(d, 'NO PATIENT');
    console.log('NO PATIENT:', noPatientPaths.join(' | '));

    // Check if reviews are at d[175][8] or elsewhere
    console.log('\n=== d[175] top structure ===');
    if (r175) {
        for (let i = 0; i < r175.length; i++) {
            if (r175[i] === null) continue;
            const s = JSON.stringify(r175[i]);
            const hasNani = s.includes('Nani');
            const hasCi9 = s.includes('Ci9');
            if (hasNani || hasCi9 || s.length > 500) {
                console.log(`[175][${i}]: ${s.length} chars, hasNani=${hasNani}, hasReviewId=${hasCi9}`);
            }
        }
    }

    await browser.close();
}

run().catch(e => { console.error(e); process.exit(1); });
