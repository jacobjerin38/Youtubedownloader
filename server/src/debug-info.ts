
import { getVideoInfo } from './downloader';

(async () => {
    try {
        console.log('Fetching info...');
        const info: any = await getVideoInfo('https://www.youtube.com/watch?v=B3lLeIBVX4M');
        console.log('Keys:', Object.keys(info));
        if (info.formats) {
            console.log('Formats count:', info.formats.length);
            const heights = new Set();
            info.formats.forEach((f: any) => {
                if (f.height) heights.add(f.height);
                if (f.height >= 720) {
                    console.log(`Format ${f.format_id}: height=${f.height}, vcodec=${f.vcodec}`);
                }
            });
            console.log('Available heights:', Array.from(heights));

            // Check sample format
            console.log('Sample format:', JSON.stringify(info.formats[0], null, 2));
        } else {
            console.log('No formats found!');
        }
    } catch (e) {
        console.error(e);
    }
})();
