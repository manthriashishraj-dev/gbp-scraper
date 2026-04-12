/**
 * Parse the intercepted /maps/preview/place API response
 * Extract ALL business data from the protobuf-like array structure
 */
import puppeteer from 'puppeteer-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';

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

    // Capture the preview/place response
    let placeData = null;
    page.on('response', async (response) => {
        if (response.url().includes('preview/place')) {
            try {
                const text = await response.text();
                // Remove )]}' prefix
                const jsonStr = text.replace(/^\)\]\}'[\s\n]*/, '');
                placeData = JSON.parse(jsonStr);
            } catch (e) {
                console.error('Parse error:', e.message);
            }
        }
    });

    await page.goto(TEST_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 3000));

    if (!placeData) {
        console.log('No preview/place response captured!');
        await browser.close();
        return;
    }

    console.log('Got place data! Top-level array length:', placeData.length);

    // The place data is a deeply nested array
    // Let's find the business info by searching for known values
    const flat = JSON.stringify(placeData);

    // Extract known fields by position (Google's internal structure)
    // This structure has been reverse-engineered by the scraping community
    try {
        // placeData[6] usually contains the main business info
        const mainData = placeData[6];
        if (mainData) {
            console.log('\n=== BUSINESS DATA ===');

            // Name is typically at [6][11] or search for it
            const findStr = (arr, target) => {
                const s = JSON.stringify(arr);
                return s.includes(target);
            };

            // Walk through the structure and find recognizable data
            for (let i = 0; i < Math.min(placeData.length, 20); i++) {
                const item = placeData[i];
                if (!item) continue;
                const s = JSON.stringify(item);

                if (s.includes('Aishwarya') && s.length < 500) {
                    console.log(`[${i}] Contains business name:`, s.substring(0, 200));
                }
                if (s.includes('98497') && s.length < 500) {
                    console.log(`[${i}] Contains phone:`, s.substring(0, 200));
                }
                if (s.includes('4.8') && s.length < 200) {
                    console.log(`[${i}] Contains rating:`, s.substring(0, 200));
                }
                if (s.includes('Dental clinic') && s.length < 300) {
                    console.log(`[${i}] Contains category:`, s.substring(0, 200));
                }
            }

            // Dump the structure depths
            console.log('\n=== STRUCTURE ===');
            for (let i = 0; i < Math.min(placeData.length, 30); i++) {
                const item = placeData[i];
                if (item === null) continue;
                const s = JSON.stringify(item);
                const hasName = s.includes('Aishwarya');
                const hasPhone = s.includes('98497');
                const hasRating = s.includes('4.8');
                const hasAddr = s.includes('Kakaji');
                const hasHours = s.includes('Sunday') || s.includes('Monday');
                const flags = [hasName && 'NAME', hasPhone && 'PHONE', hasRating && 'RATING', hasAddr && 'ADDR', hasHours && 'HOURS'].filter(Boolean).join(',');
                if (flags) {
                    console.log(`  [${i}] ${flags} — ${s.length} chars`);
                }
            }
        }
    } catch (e) {
        console.error('Parse error:', e.message);
    }

    await browser.close();
    console.log('\nDone!');
}

run().catch(e => { console.error(e); process.exit(1); });
