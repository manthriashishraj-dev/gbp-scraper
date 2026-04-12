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

    if (!placeData || !placeData[6]) {
        console.log('No data!');
        await browser.close();
        return;
    }

    const d = placeData[6]; // The main business data array

    // Parse the nested array structure
    // This is reverse-engineered from Google's protobuf schema
    const result = {};

    // Business name — typically d[11]
    result.name = d[11] || null;

    // Category
    result.category = d[13]?.[0] || null;

    // Address
    result.address = d[18] || null;

    // Phone
    result.phone = d[178]?.[0]?.[0] || null; // Deep nested phone

    // Rating + review count
    result.rating = d[4]?.[7] || null;
    result.reviewCount = d[4]?.[8] || null;

    // Coordinates
    result.lat = d[9]?.[2] || null;
    result.lng = d[9]?.[3] || null;

    // Let me find the exact positions by searching
    const flat = JSON.stringify(d);

    // Find strings in the array recursively
    function findInArray(arr, target, path = '') {
        if (!arr) return [];
        const results = [];
        if (typeof arr === 'string' && arr.includes(target)) {
            results.push({ path, value: arr.substring(0, 80) });
        }
        if (Array.isArray(arr)) {
            for (let i = 0; i < arr.length; i++) {
                results.push(...findInArray(arr[i], target, `${path}[${i}]`));
            }
        }
        return results;
    }

    console.log('=== FINDING DATA POSITIONS ===\n');
    console.log('Business name:', JSON.stringify(findInArray(d, 'Aishwarya Dental Clinic')));
    console.log('Phone:', JSON.stringify(findInArray(d, '98497')));
    console.log('Rating:', JSON.stringify(findInArray(d, '4.8')));
    console.log('Category:', JSON.stringify(findInArray(d, 'Dental clinic')));
    console.log('Address:', JSON.stringify(findInArray(d, 'Vijaya Theater')));
    console.log('Hours Sunday:', JSON.stringify(findInArray(d, 'Sunday')));
    console.log('Website:', JSON.stringify(findInArray(d, 'aishwaryadental')));
    console.log('Plus code:', JSON.stringify(findInArray(d, '2H39')));
    console.log('Description:', JSON.stringify(findInArray(d, 'best dental clinic in Hanamkonda')));

    await browser.close();
}

run().catch(e => { console.error(e); process.exit(1); });
