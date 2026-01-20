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
export const downloadVideo = (url: string, outputPath: string, formatId?: string, cookiesPath?: string) => {
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
    subprocess.stdout?.on('data', (d) => console.log(d.toString()));
    subprocess.stderr?.on('data', (d) => console.error(d.toString()));

    return subprocess;
};
