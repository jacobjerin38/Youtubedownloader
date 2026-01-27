
import React from 'react';

interface DownloadProgressProps {
    progress: number; // 0 to 100
    isDownloading: boolean;
}

const DownloadProgress: React.FC<DownloadProgressProps> = ({ progress, isDownloading }) => {
    if (!isDownloading) return null;

    return (
        <div className="w-full mt-4 animate-fade-in">
            <div className="flex justify-between text-xs text-muted mb-1">
                <span>Downloading...</span>
                <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-pink-500 to-violet-500 transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>
            {progress >= 100 && (
                <p className="text-center text-xs text-green-400 mt-2 animate-bounce">
                    Processing & Merging...
                </p>
            )}
        </div>
    );
};

export default DownloadProgress;
