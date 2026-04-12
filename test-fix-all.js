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

    // ===== HOURS — d[203] structure =====
    console.log('===== HOURS =====');
    const hours = {};
    if (d[203]) {
        for (const dayArr of d[203]) {
            if (Array.isArray(dayArr)) {
                for (const day of dayArr) {
                    if (Array.isArray(day) && typeof day[0] === 'string') {
                        const dayName = day[0]; // "Monday"
                        const timeSlots = day[3]; // [["9 am–9 pm", [[9],[21]]]]
                        if (timeSlots && timeSlots[0]) {
                            hours[dayName] = timeSlots[0][0]; // "9 am–9 pm"
                        } else {
                            hours[dayName] = 'Closed';
                        }
                    }
                }
            }
        }
    }
    console.log(JSON.stringify(hours, null, 2));

    // ===== REVIEWS — d[175] structure =====
    console.log('\n===== REVIEWS =====');
    // d[175] is a huge nested array. Let me dump the structure
    const r175 = d[175];
    if (r175) {
        // Find the review list — look for arrays that contain review IDs
        // Review IDs look like "Ci9DQUlRQUNvZENod..."
        function findReviews(arr, path = '', depth = 0) {
            if (!arr || depth > 6) return [];
            const results = [];
            if (typeof arr === 'string' && arr.startsWith('Ci9') && arr.length > 50) {
                results.push({ path, reviewId: arr.substring(0, 30) });
            }
            if (Array.isArray(arr)) {
                for (let i = 0; i < arr.length; i++) {
                    results.push(...findReviews(arr[i], `${path}[${i}]`, depth + 1));
                }
            }
            return results;
        }
        const reviewPaths = findReviews(r175);
        console.log(`Found ${reviewPaths.length} review IDs:`);
        reviewPaths.forEach(r => console.log(`  ${r.path}: ${r.reviewId}...`));

        // Now parse first review in detail
        if (reviewPaths.length > 0) {
            const firstPath = reviewPaths[0].path;
            // Navigate to the review container
            // Reviews are typically at d[175][8][0][X] where X is the review index
            const reviewList = r175[8]?.[0];
            if (reviewList) {
                console.log(`\nReview list at d[175][8][0] — ${reviewList.length} entries`);
                // Each review entry is [reviewData] where reviewData contains the details
                for (let i = 0; i < Math.min(reviewList.length, 3); i++) {
                    const entry = reviewList[i];
                    if (!entry || !Array.isArray(entry)) continue;
                    const rev = entry[0]; // The review data
                    if (!rev) continue;

                    const reviewId = rev[0]; // Review ID string
                    const reviewInfo = rev[1]; // Review details array
                    if (!reviewInfo) continue;

                    // Parse review fields
                    const authorInfo = reviewInfo[4]?.[5]; // Author info
                    const author = authorInfo?.[0]; // Author name
                    const authorUrl = authorInfo?.[2]?.[0]; // Author URL
                    const authorReviewCount = authorInfo?.[9]?.[0]; // "3 reviews"
                    const date = reviewInfo[6]; // "4 months ago"
                    const rating = reviewInfo[2]?.[0]?.[0]; // Star rating

                    // Review text
                    const textArr = rev[2]; // Text section
                    const text = textArr?.[1]?.[0]; // Review text

                    // Owner response
                    const ownerResp = rev[3]; // Owner response section
                    const ownerText = ownerResp?.[1]; // Response text
                    const ownerDate = ownerResp?.[3]; // Response date

                    console.log(`\n  Review ${i + 1}:`);
                    console.log(`    ID: ${typeof reviewId === 'string' ? reviewId.substring(0, 30) : 'N/A'}...`);
                    console.log(`    Author: ${author}`);
                    console.log(`    AuthorUrl: ${authorUrl?.substring(0, 60)}`);
                    console.log(`    AuthorReviews: ${authorReviewCount}`);
                    console.log(`    Rating: ${rating}`);
                    console.log(`    Date: ${date}`);
                    console.log(`    Text: ${text?.substring(0, 80)}`);
                    console.log(`    OwnerResponse: ${ownerText?.substring(0, 80)}`);
                    console.log(`    OwnerRespDate: ${ownerDate}`);
                }
            }
        }
    }

    // ===== IMAGES — find photo URLs =====
    console.log('\n===== IMAGES =====');
    function findPhotos(arr, path = '', depth = 0) {
        if (!arr || depth > 5) return [];
        const results = [];
        if (typeof arr === 'string' && arr.includes('googleusercontent.com/p/')) {
            results.push({ path, url: arr.substring(0, 80) });
        }
        if (Array.isArray(arr)) {
            for (let i = 0; i < arr.length; i++) {
                results.push(...findPhotos(arr[i], `${path}[${i}]`, depth + 1));
            }
        }
        return results;
    }
    const photos = findPhotos(d);
    console.log(`Found ${photos.length} photo URLs:`);
    photos.slice(0, 10).forEach(p => console.log(`  ${p.path}: ${p.url}`));

    // Also check d[37] for photo data (cover photo, photo count)
    console.log('\n--- Photo count and cover ---');
    // Find photo count
    function findInArr(arr, target, path = '', depth = 0) {
        if (!arr || depth > 5) return [];
        const results = [];
        if (typeof arr === 'string' && arr.includes(target)) {
            results.push({ path, value: arr.substring(0, 80) });
        }
        if (Array.isArray(arr)) {
            for (let i = 0; i < arr.length; i++) {
                results.push(...findInArr(arr[i], target, `${path}[${i}]`, depth + 1));
            }
        }
        return results;
    }
    const photoCountRefs = findInArr(d, 'photo', '', 4);
    photoCountRefs.forEach(p => console.log(`  ${p.path}: ${p.value}`));

    // Check d[36] for photo count as number
    console.log('\nd[36]:', JSON.stringify(d[36])?.substring(0, 200));

    await browser.close();
}

run().catch(e => { console.error(e); process.exit(1); });
