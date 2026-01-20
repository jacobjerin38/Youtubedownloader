import { exec as ytDlpExec } from 'yt-dlp-exec';
import path from 'path';

const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const outputPath = path.resolve('debug_video.mp4');

console.log('Testing download to:', outputPath);

const args = {
    output: outputPath,
    format: 'best[ext=mp4]',
    extractorArgs: 'youtube:player_client=android',
    verbose: true,
    noPlaylist: true,
};

const subprocess = ytDlpExec(url, args);

subprocess.stdout?.on('data', (data) => console.log('STDOUT:', data.toString()));
subprocess.stderr?.on('data', (data) => console.error('STDERR:', data.toString()));

subprocess.then(() => {
    console.log('Done!');
}).catch((err) => {
    console.error('Failed:', err);
});
