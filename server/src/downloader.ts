import ytDlp, { exec as ytDlpExec } from 'yt-dlp-exec';
import ffmpegPath from 'ffmpeg-static';

// Helper to get video info
export const getVideoInfo = async (url: string, cookiesPath?: string) => {
    try {
        const args: any = {
            dumpSingleJson: true,
            noWarnings: true,
            preferFreeFormats: true,
            youtubeSkipDashManifest: true,
            jsRuntimes: `node:${process.execPath}`,
        };
        if (cookiesPath) {
            args.cookies = cookiesPath;
        }

        const output = await ytDlp(url, args);
        return output;
    } catch (error) {
        console.error('Error fetching video info:', error);
        throw new Error('Failed to fetch video info');
    }
};

// Helper to download video to a local file
export const downloadVideo = (url: string, outputPath: string, formatId?: string, cookiesPath?: string, onProgress?: (percent: number) => void) => {
    console.log('FFmpeg Path:', ffmpegPath);

    const targetFormat = (formatId === 'best' || !formatId) ? 'bestvideo+bestaudio/best' : formatId;

    const args: any = {
        output: outputPath,
        format: targetFormat,
        mergeOutputFormat: 'mp4',
        ffmpegLocation: ffmpegPath,

        verbose: true,
        noPlaylist: true,
        jsRuntimes: `node:${process.execPath}`, // Explicitly pass the current node binary
    };

    if (cookiesPath) {
        args.cookies = cookiesPath;
    }

    // Using exec to get the promise which resolves when done
    const subprocess = ytDlpExec(url, args);

    // Attach listeners to debug output
    subprocess.stdout?.on('data', (d) => {
        const line = d.toString();
        console.log(line); // Keep logging

        // Parse progress: [download]  45.3% of ...
        const match = line.match(/\[download\]\s+(\d+\.\d+)%/);
        if (match && match[1] && onProgress) {
            const percent = parseFloat(match[1]);
            onProgress(percent);
        }
    });

    subprocess.stderr?.on('data', (d) => console.error(d.toString()));

    return subprocess;
};
