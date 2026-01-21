import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import DownloadProgress from './DownloadProgress';
import './App.css';

// We will implement components in separate files next, 
// but for the first pass let's setup the structure here to verify 
// and then refactor or just create them directly.
// actually, let's just make the main container relative.

interface VideoInfo {
  title: string;
  thumbnail: string;
  duration_string: string;
  uploader: string;
  age_limit: number;
  formats: any[];
}

function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);

  const [cookies, setCookies] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState('best');
  const [availableQualities, setAvailableQualities] = useState<number[]>([]);

  // Progress State
  const [socket, setSocket] = useState<Socket | null>(null);
  const [progress, setProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to socket server:', newSocket.id);
    });

    newSocket.on('progress', (percent: number) => {
      setProgress(percent);
      if (percent >= 100) {
        // Keep showing 100% for a moment then reset
        setTimeout(() => setIsDownloading(false), 5000);
      }
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const fetchInfo = async () => {
    if (!url) return;
    setLoading(true);
    setVideoInfo(null);
    setAvailableQualities([]);
    try {
      const response = await fetch('http://localhost:3001/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, cookies })
      });
      const data = await response.json();
      setVideoInfo(data);

      // Parse formats for unique heights
      if (data.formats) {
        const heights = new Set<number>();
        data.formats.forEach((f: any) => {
          if (f.height && f.vcodec !== 'none') {
            heights.add(f.height);
          }
        });
        const sortedHeights = Array.from(heights).sort((a, b) => b - a);
        setAvailableQualities(sortedHeights);
        // Default to highest if available, else 'best'
        // Actually 'best' is safe, or we can default to top resol
        setSelectedQuality('best');
      }

    } catch (err) {
      console.error(err);
      alert('Failed to fetch video info');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    setIsDownloading(true);
    setProgress(0);

    let formatId = 'bestvideo+bestaudio/best';

    if (selectedQuality === 'audio') {
      formatId = 'bestaudio';
    } else if (selectedQuality !== 'best') {
      // Specific height requested
      formatId = `bestvideo[height=${selectedQuality}]+bestaudio/best[height=${selectedQuality}]`;
    }

    // Hidden form submission for POST download
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'http://localhost:3001/download';
    form.target = '_blank'; // Open in new tab/download

    const urlInput = document.createElement('input');
    urlInput.type = 'hidden';
    urlInput.name = 'url';
    urlInput.value = url;
    form.appendChild(urlInput);

    const formatInput = document.createElement('input');
    formatInput.type = 'hidden';
    formatInput.name = 'format_id';
    formatInput.value = formatId;
    form.appendChild(formatInput);

    const titleInput = document.createElement('input');
    titleInput.type = 'hidden';
    titleInput.name = 'title';
    titleInput.value = videoInfo?.title || 'video';
    form.appendChild(titleInput);

    if (cookies.trim()) {
      const cookiesInput = document.createElement('input');
      cookiesInput.type = 'hidden';
      cookiesInput.name = 'cookies';
      cookiesInput.value = cookies;
      form.appendChild(cookiesInput);
    }

    if (socket && socket.id) {
      const socketIdInput = document.createElement('input');
      socketIdInput.type = 'hidden';
      socketIdInput.name = 'socketId';
      socketIdInput.value = socket.id;
      form.appendChild(socketIdInput);
    }

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="glass-panel p-8 w-full max-w-2xl animate-fade-in text-center">
        <h1 className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500"
          style={{ backgroundImage: 'linear-gradient(to right, #f43f5e, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Youtube Downloader
        </h1>
        <p className="text-muted mb-8">Premium Quality & Unrestricted Access</p>

        <div className="flex gap-4 mb-4">
          <input
            type="text"
            className="input-field"
            placeholder="Paste YouTube Link here..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button className="btn-primary whitespace-nowrap" onClick={fetchInfo} disabled={loading}>
            {loading ? 'Analyzing...' : 'Get Video'}
          </button>
        </div>

        <div className="mb-8 text-left">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-muted hover:text-white underline"
          >
            {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options (Cookies/Auth)'}
          </button>

          {showAdvanced && (
            <div className="mt-2 animate-fade-in">
              <label className="text-xs text-muted block mb-1">Netscape Formatted Cookies (for Age Restricted content):</label>
              <textarea
                className="input-field min-h-[100px] text-xs font-mono"
                placeholder="# Netscape HTTP Cookie File..."
                value={cookies}
                onChange={(e) => setCookies(e.target.value)}
              />
            </div>
          )}
        </div>

        {videoInfo && (
          <div className="animate-fade-in text-left bg-black/20 p-4 rounded-xl border border-white/10">
            <div className="flex gap-4">
              <img src={videoInfo.thumbnail} alt="Thumbnail" className="w-32 h-24 object-cover rounded-lg shadow-lg" />
              <div className="flex-1 overflow-hidden">
                <h3 className="font-bold text-lg truncate mb-1" title={videoInfo.title}>{videoInfo.title}</h3>
                <p className="text-sm text-muted mb-4">{videoInfo.uploader} • {videoInfo.duration_string}</p>
              </div>
            </div>

            <div className="mt-4 flex gap-4 items-center">
              <div className="flex-1">
                <label className="block text-xs text-muted mb-1 ml-1">Select Quality</label>
                <select
                  className="input-field w-full cursor-pointer"
                  value={selectedQuality}
                  onChange={(e) => setSelectedQuality(e.target.value)}
                >
                  <option value="best">Best Available (Auto)</option>
                  {availableQualities.map(h => (
                    <option key={h} value={h}>{h}p {h >= 2160 ? '(4K)' : h >= 1440 ? '(2K)' : h >= 1080 ? '(HD)' : ''}</option>
                  ))}
                  <option value="audio">Audio Only (MP3/M4A)</option>
                </select>
              </div>

              <div className="flex-1">
                <label className="block text-xs text-muted mb-1 ml-1">&nbsp;</label>
                <button className="btn-primary w-full" onClick={handleDownload}>
                  Download
                </button>
              </div>
            </div>

            <DownloadProgress progress={progress} isDownloading={isDownloading} />

            {/* 18+ Warning */}
            {videoInfo.age_limit > 0 && (
              <div className="mt-4 p-2 bg-red-500/20 text-red-200 text-sm rounded border border-red-500/30">
                ⚠️ Age Restricted Content Detected. Please paste cookies in Advanced Options.
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
