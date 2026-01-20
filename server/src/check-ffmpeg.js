const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
console.log('FFmpeg Path:', ffmpegPath);
if (ffmpegPath && fs.existsSync(ffmpegPath)) {
    console.log('FFmpeg exists!');
} else {
    console.error('FFmpeg NOT found matching path.');
}
