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

    if (!placeData?.[6]) { console.log('No data!'); await browser.close(); return; }

    const d = placeData[6];

    // Map ALL fields from the API response
    const business = {
        // Core
        name: d[11] || null,
        placeId: d[78] || null,
        cid: d[25] || null,
        primaryCategory: d[13]?.[0] || null,
        additionalCategories: d[13]?.slice(1) || [],
        fullAddress: d[39] || d[37]?.[0]?.[0]?.[17]?.[0] || null,
        street: d[2]?.[0] || null,
        city: d[2]?.[1] || null,
        state: d[2]?.[2] || null,
        zipCode: d[2]?.[3] || null,
        country: d[2]?.[4] || null,
        plusCode: d[183]?.[2]?.[2]?.[0] || null,
        latitude: d[9]?.[2] || null,
        longitude: d[9]?.[3] || null,
        phone: d[178]?.[0]?.[1]?.[1]?.[0] || d[178]?.[0]?.[0] || null,
        website: d[7]?.[0] || null,
        websiteDomain: d[7]?.[1] || null,
        description: d[154]?.[0]?.[0] || null,

        // Rating
        rating: d[4]?.[7] || null,
        reviewCount: d[4]?.[8] || null,

        // Hours — check multiple positions
        hours: null,

        // Photo count
        photoCount: d[37]?.[0]?.[0]?.[0]?.[6] || d[6]?.[0] || null,

        // Price level
        priceLevel: d[4]?.[2] || null,

        // Status
        temporarilyClosed: d[88]?.[0] === 1 || false,
        permanentlyClosed: d[88]?.[1] === 1 || false,

        // Booking
        appointmentUrl: d[75]?.[0]?.[0]?.[2]?.[0]?.[1]?.[2]?.[0] || null,
    };

    // Find hours — search for day names
    function findInArray(arr, target, path = '', maxDepth = 8) {
        if (!arr || maxDepth <= 0) return [];
        const results = [];
        if (typeof arr === 'string' && arr.includes(target)) {
            results.push({ path, value: arr.substring(0, 100) });
        }
        if (Array.isArray(arr)) {
            for (let i = 0; i < arr.length; i++) {
                results.push(...findInArray(arr[i], target, `${path}[${i}]`, maxDepth - 1));
            }
        }
        return results;
    }

    // Find remaining fields
    const searches = {
        'Rating 4.8': findInArray(d, '4.8', '', 4),
        'Monday': findInArray(d, 'Monday'),
        'Sunday 9': findInArray(d, '9 am', '', 5),
        'ReviewText': findInArray(d, 'excellent'),
        'OwnerResponse': findInArray(d, 'NO PATIENT'),
        'PhotoURL': findInArray(d, 'googleusercontent', '', 4).slice(0, 3),
        'PopularTimes': findInArray(d, 'Usually'),
        'Attributes': findInArray(d, 'On-site'),
        'SecondaryCategories': findInArray(d, 'Orthodontist'),
    };

    console.log('=== EXTRACTED BUSINESS DATA ===\n');
    console.log(JSON.stringify(business, null, 2));

    console.log('\n=== FIELD SEARCHES ===\n');
    for (const [key, results] of Object.entries(searches)) {
        if (results.length > 0) {
            console.log(`${key}:`);
            for (const r of results.slice(0, 3)) {
                console.log(`  ${r.path}: ${r.value}`);
            }
        } else {
            console.log(`${key}: NOT FOUND`);
        }
    }

    await browser.close();
}

run().catch(e => { console.error(e); process.exit(1); });
