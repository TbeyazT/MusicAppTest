import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const { ipcRenderer } = window.require('electron');
const fs = window.require('fs');
const path = window.require('path');

function App() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [conversionStatus, setConversionStatus] = useState('');
  const [audioFiles, setAudioFiles] = useState([]);
  const [currentFile, setCurrentFile] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);

  const audioRef = useRef(null);

  useEffect(() => {
    loadAudioFiles();
  }, []);

  const handleFileSelection = (e) => {
    const files = Array.from(e.target.files).filter(file => file.type === 'audio/mpeg');
    setSelectedFiles(files);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setConversionStatus('No files selected for upload.');
      return;
    }

    try {
      setConversionStatus('Uploading...');
      
      const fileData = await Promise.all(
        selectedFiles.map(file => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const arrayBuffer = reader.result;
              resolve({
                name: file.name,
                buffer: Buffer.from(arrayBuffer)
              });
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
          });
        })
      );

      await ipcRenderer.invoke('upload-files', fileData);
      setConversionStatus('Upload complete.');
      setSelectedFiles([]);
      loadAudioFiles();
    } catch (error) {
      setConversionStatus(`Error: ${error.message}`);
    }
  };

  const loadAudioFiles = () => {
    const userDataPath = ipcRenderer.sendSync('get-user-data-path');
    const audioPath = path.join(userDataPath, 'audioFiles');

    fs.readdir(audioPath, (err, files) => {
      if (err) {
        setConversionStatus(`Error loading files: ${err.message}`);
        return;
      }

      const mp3Files = files.filter(file => file.endsWith('.mp3'));
      setAudioFiles(mp3Files);
      setConversionStatus(mp3Files.length > 0 ? 'Files loaded successfully.' : 'No MP3 files found.');
    });
  };

  const handleRemoveFile = async (fileName) => {
    try {
      const userDataPath = ipcRenderer.sendSync('get-user-data-path');
      const filePath = path.join(userDataPath, 'audioFiles', fileName);
      await ipcRenderer.invoke('delete-file', filePath);
      setConversionStatus(`${fileName} removed.`);
      loadAudioFiles();
    } catch (error) {
      setConversionStatus(`Error removing file: ${error.message}`);
    }
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    setDuration(audioRef.current.duration);
  };

  const handleProgressChange = (e) => {
    const newTime = e.target.value;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e) => {
    const newVolume = e.target.value;
    audioRef.current.volume = newVolume;
    setVolume(newVolume);
  };

  const handleShuffleToggle = () => {
    setIsShuffle(!isShuffle);
  };

  const handleRepeatToggle = () => {
    setIsRepeat(!isRepeat);
  };

  const handleNextTrack = () => {
    if (audioFiles.length === 0) return;
    let nextIndex;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * audioFiles.length);
    } else {
      const currentIndex = audioFiles.indexOf(currentFile);
      nextIndex = (currentIndex + 1) % audioFiles.length;
    }
    setCurrentFile(audioFiles[nextIndex]);
    setIsPlaying(true);
  };

  const handleEnd = () => {
    handleNextTrack();
    if (!isRepeat && !isShuffle) {
      setIsPlaying(false);
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className="App">
      <h1>Media Player</h1>

      <div className="upload-section">
        <input type="file" accept=".mp3" multiple onChange={handleFileSelection} />
        <button onClick={handleUpload}>Upload Selected Files</button>
        <p>{conversionStatus}</p>
      </div>

      <div className="player-container">
        <div className="song-info">
          <img src="path/to/default-cover.jpg" alt="Cover" className="cover-img" />
          <div className="song-details">
            <h3 className="song-title">{currentFile || 'Select a song'}</h3>
          </div>
        </div>
        <div className="controls">
          <button onClick={handleShuffleToggle} className={isShuffle ? 'active' : ''}>Shuffle</button>
          <button onClick={handlePlayPause}>{isPlaying ? 'Pause' : 'Play'}</button>
          <button onClick={handleNextTrack}>Next</button>
          <button onClick={handleRepeatToggle} className={isRepeat ? 'active' : ''}>Repeat</button>
        </div>
        <div className="progress-container">
          <span>{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleProgressChange}
            className="wave-slider"
          />
          <span>{formatTime(duration)}</span>
        </div>
        <div className="volume-container">
          <label>Volume</label>
          <input type="range" min="0" max="1" step="0.01" value={volume} onChange={handleVolumeChange} />
        </div>
      </div>

      <h2>Music List</h2>
      <ul>
        {audioFiles.map((file, index) => (
          <li key={index}>
            <button onClick={() => { setCurrentFile(file); setIsPlaying(true); }}>{file}</button>
            <button onClick={() => handleRemoveFile(file)}>Remove</button>
          </li>
        ))}
      </ul>

      <audio
        ref={audioRef}
        src={currentFile ? `file://${path.join(ipcRenderer.sendSync('get-user-data-path'), 'audioFiles', currentFile)}` : ''}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnd}
      />
    </div>
  );
}

export default App;
