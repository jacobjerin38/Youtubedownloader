import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { getVideoInfo, downloadVideo } from './downloader';
import fs from 'fs';
import path from 'path';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: '*', // Allow all for prototype
    },
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (_req, res) => {
    res.send('YouTube Downloader API is running');
});

// Get Video Info (POST to support cookies)
app.post('/info', async (req, res) => {
    const { url, cookies } = req.body;
    if (!url || typeof url !== 'string') {
        res.status(400).json({ error: 'Missing URL' });
        return;
    }

    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    let cookiesPath: string | undefined;

    if (cookies && typeof cookies === 'string') {
        const cleanCookies = cookies.trim();
        if (cleanCookies.startsWith('# Netscape HTTP Cookie File') || cleanCookies.includes('\t')) {
            cookiesPath = path.join(tempDir, `cookies_info_${Date.now()}.txt`);
            fs.writeFileSync(cookiesPath, cleanCookies);
        }
    }

    try {
        const info = await getVideoInfo(url, cookiesPath);
        res.json(info);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve video info' });
    } finally {
        if (cookiesPath && fs.existsSync(cookiesPath)) {
            try { fs.unlinkSync(cookiesPath); } catch (e) { /* ignore */ }
        }
    }
});

// Trigger Download (File buffer response)
app.post('/download', async (req, res) => {
    // req.body for POST
    const { url, format_id, title, cookies } = req.body;

    if (!url || typeof url !== 'string') {
        res.status(400).send('Missing URL');
        return;
    }

    const safeTitle = (title as string || 'video').replace(/[^a-zA-Z0-9]/g, '_');
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
    }

    const filePath = path.join(tempDir, `${safeTitle}_${Date.now()}.mp4`);
    let cookiesPath: string | undefined;

    if (cookies && typeof cookies === 'string') {
        const cleanCookies = cookies.trim();
        // Basic validation: Netscape cookies usually start with # Netscape or contain tabs
        if (cleanCookies.startsWith('# Netscape HTTP Cookie File') || cleanCookies.includes('\t')) {
            cookiesPath = path.join(tempDir, `cookies_${Date.now()}.txt`);
            fs.writeFileSync(cookiesPath, cleanCookies);
        } else {
            console.warn('Invalid cookie content detected (not Netscape format). Skipping cookies.');
        }
    }

    try {
        console.log(`Starting download for: ${url} to ${filePath}`);
        // This might take a while, in a real app better to use jobs/sockets
        await downloadVideo(url, filePath, format_id as string, cookiesPath);
        console.log('Download complete.');

        if (fs.existsSync(filePath)) {
            const stat = fs.statSync(filePath);
            console.log(`File exists at ${filePath}, size: ${stat.size} bytes`);

            if (stat.size === 0) {
                console.error('File is empty!');
                res.status(500).send('Downloaded file is empty');
                fs.unlinkSync(filePath);
                if (cookiesPath && fs.existsSync(cookiesPath)) fs.unlinkSync(cookiesPath);
                return;
            }

            res.writeHead(200, {
                'Content-Type': 'video/mp4',
                'Content-Length': stat.size,
                'Content-Disposition': `attachment; filename="${safeTitle}.mp4"`,
            });

            const readStream = fs.createReadStream(filePath);
            readStream.pipe(res);

            const cleanup = () => {
                try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
                try { if (cookiesPath && fs.existsSync(cookiesPath)) fs.unlinkSync(cookiesPath); } catch (e) { /* ignore */ }
            };

            readStream.on('error', (err) => {
                console.error('Stream Error:', err);
                res.end();
            });

            res.on('finish', () => {
                console.log('Stream finished, cleaning up');
                cleanup();
            });

            res.on('close', () => {
                console.log('Response closed, cleaning up');
                cleanup();
            });

        } else {
            console.error(`File NOT found at ${filePath}`);
            try {
                console.error('Temp dir contents:', fs.readdirSync(tempDir));
            } catch (e) {
                console.error('Could not read temp dir', e);
            }
            if (cookiesPath && fs.existsSync(cookiesPath)) fs.unlinkSync(cookiesPath);
            res.status(500).send('File not found after download');
        }

    } catch (error: any) {
        console.error('Download failed:', error);
        res.status(500).send('Download failed: ' + (error.message || error));
        // Cleanup
        try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
        try { if (cookiesPath && fs.existsSync(cookiesPath)) fs.unlinkSync(cookiesPath); } catch (e) { /* ignore */ }
    }
});

io.on('connection', (socket) => {
    console.log('Client connected');
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
