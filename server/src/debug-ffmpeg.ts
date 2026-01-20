import { exec as ytDlpExec } from 'yt-dlp-exec';
import path from 'path';
const ffmpegPath = require('ffmpeg-static');

console.log('FFmpeg Path:', ffmpegPath);

const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const outputPath = path.resolve('debug_hq.mp4');

const args = {
    output: outputPath,
    format: 'bestvideo+bestaudio/best',
    mergeOutputFormat: 'mp4',
    ffmpegLocation: ffmpegPath,

    verbose: true,
    noPlaylist: true,
};

console.log('Running yt-dlp with args:', JSON.stringify(args, null, 2));

const subprocess = ytDlpExec(url, args);

subprocess.stdout?.on('data', (data) => console.log('STDOUT:', data.toString()));
subprocess.stderr?.on('data', (data) => console.error('STDERR:', data.toString()));

subprocess.then(() => {
    console.log('Done!');
}).catch((err) => {
    console.error('Failed:', err);
});
