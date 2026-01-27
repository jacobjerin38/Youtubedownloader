
import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { getYouTubeCookies, getActiveTabUrl } from './utils/cookies';
import DownloadProgress from './DownloadProgress';
import './index.css';

// Reuse interface
interface VideoInfo {
  title: string;
  thumbnail: string;
  duration_string: string;
  formats: any[];
}

function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [cookies, setCookies] = useState('');
  const [selectedQuality, setSelectedQuality] = useState('best');
  const [availableQualities, setAvailableQualities] = useState<number[]>([]);

  // Progress State
  const [socket, setSocket] = useState<Socket | null>(null);
  const [progress, setProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // 1. Initialize Socket
  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to socket:', newSocket.id);
    });

    newSocket.on('progress', (percent: number) => {
      setProgress(percent);
      if (percent >= 100) {
        setStatusMessage('Merging...');
        setTimeout(() => {
          setIsDownloading(false);
          setStatusMessage('Done!');
        }, 4000);
      }
    });

    return () => { newSocket.close(); };
  }, []);

  // 2. Auto-fetch URL and Cookies on mount
  useEffect(() => {
    const init = async () => {
      const currentUrl = await getActiveTabUrl();
      if (currentUrl) {
        setUrl(currentUrl);

        // Only fetch cookies if it's YouTube
        if (currentUrl.includes('youtube.com')) {
          const extractedCookies = await getYouTubeCookies();
          setCookies(extractedCookies);

          // Auto-fetch info if URL is valid
          fetchInfo(currentUrl, extractedCookies);
        }
      }
    };
    init();
  }, []);

  const fetchInfo = async (videoUrl: string, cookieString: string) => {
    setLoading(true);
    setVideoInfo(null);
    setAvailableQualities([]);
    try {
      const response = await fetch('http://localhost:3001/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: videoUrl, cookies: cookieString })
      });
      const data = await response.json();

      if (data.error) throw new Error(data.error);

      setVideoInfo(data);

      if (data.formats) {
        const heights = new Set<number>();
        data.formats.forEach((f: any) => {
          if (f.height && f.vcodec !== 'none') {
            heights.add(f.height);
          }
        });
        const sortedHeights = Array.from(heights).sort((a, b) => b - a);
        setAvailableQualities(sortedHeights);
        setSelectedQuality('best');
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage('Error fetching info: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!videoInfo || !url) return;

    setIsDownloading(true);
    setProgress(0);
    setStatusMessage('Starting...');

    let formatId = 'bestvideo+bestaudio/best';
    if (selectedQuality === 'audio') {
      formatId = 'bestaudio';
    } else if (selectedQuality !== 'best') {
      formatId = `bestvideo[height=${selectedQuality}]+bestaudio/best[height=${selectedQuality}]`;
    }

    try {
      await fetch('http://localhost:3001/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          format_id: formatId,
          title: videoInfo.title,
          cookies: cookies, // Use silently extracted cookies
          socketId: socket?.id
        })
      });

      triggerDownloadForm(url, formatId, videoInfo.title, cookies, socket?.id);

    } catch (e: any) {
      setStatusMessage('Error: ' + e.message);
      setIsDownloading(false);
    }
  };

  const triggerDownloadForm = (url: string, formatId: string, title: string, cookies: string, socketId?: string) => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'http://localhost:3001/download';
    form.target = '_blank';

    const inputs = { url, format_id: formatId, title, cookies, socketId };

    Object.entries(inputs).forEach(([key, val]) => {
      if (val) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = val;
        form.appendChild(input);
      }
    });

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  };

  return (
    <div className="p-4 w-full min-h-screen text-sm">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-rose-400 to-violet-400">
          YouTube DL
        </h1>
        <div className="flex gap-2">
          {loading && <span className="animate-spin">⌛</span>}
        </div>
      </header>

      {/* URL Input */}
      <input
        className="w-full bg-black/20 border border-white/10 text-white py-2 px-4 rounded-xl focus:outline-none focus:border-rose-500 transition-colors mb-4 text-xs opacity-70"
        value={url}
        readOnly
        placeholder="Open a YouTube video..."
      />

      {videoInfo && (
        <div className="glass-panel p-4 mb-4 animate-fade-in space-y-3">
          <img
            src={videoInfo.thumbnail}
            alt="thumb"
            className="w-full h-32 object-cover rounded-lg shadow-md"
          />

          <div className="space-y-1">
            <h3 className="font-semibold line-clamp-2">{videoInfo.title}</h3>
            <p className="text-muted text-xs">{videoInfo.duration_string}</p>
          </div>

          {/* Quality Selector */}
          <div className="space-y-2">
            <label className="text-xs text-muted block">Select Quality</label>
            <select
              className="w-full bg-black/20 border border-white/10 text-white py-2 px-4 rounded-xl focus:outline-none focus:border-rose-500 transition-colors"
              value={selectedQuality}
              onChange={(e) => setSelectedQuality(e.target.value)}
            >
              <option value="best">Best Available (Auto)</option>
              {availableQualities.map(h => (
                <option key={h} value={h}>{h}p</option>
              ))}
              <option value="audio">Audio Only (MP3/M4A)</option>
            </select>
          </div>

          {/* Download Button */}
          <button
            className={`w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold py-2 px-4 rounded-xl shadow-lg transition-all duration-200 ${isDownloading ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={handleDownload}
            disabled={isDownloading}
          >
            {isDownloading ? 'Processing...' : 'Download Now'}
          </button>

          {statusMessage && <p className="text-xs text-center mt-2 opacity-80">{statusMessage}</p>}

          <DownloadProgress progress={progress} isDownloading={isDownloading} />
        </div>
      )}

      {!videoInfo && !loading && (
        <div className="text-center text-muted mt-10">
          <p>No video detected.</p>
          <p className="text-xs mt-2">Open a video tab to start.</p>
        </div>
      )}
    </div>
  );
}

export default App;
