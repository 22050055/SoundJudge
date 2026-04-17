import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────

const fmtTime = (sec) => {
  if (!sec || isNaN(sec) || !isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

// Seeded waveform heights
const generateBars = (seed = '', count = 60) => {
  let h = 0;
  const seedString = String(seed || '');
  for (let i = 0; i < seedString.length; i++) h = (h * 31 + seedString.charCodeAt(i)) >>> 0;
  const bars = [];
  let prev = 0.5;
  for (let i = 0; i < count; i++) {
    h = (h * 1664525 + 1013904223) >>> 0;
    const v = Math.max(0.1, Math.min(1, prev * 0.55 + (h / 0xffffffff) * 0.45));
    bars.push(v);
    prev = v;
  }
  return bars;
};

// ─────────────────────────────────────────────────────────────
//  CSS
// ─────────────────────────────────────────────────────────────

const CSS = `
.mp-wrap {
  background: #0f0f18;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 18px;
  overflow: hidden;
  font-family: 'DM Sans', system-ui, sans-serif;
  color: #e2e8f0;
  user-select: none;
  transition: border-color 0.2s;
}
.mp-wrap:hover { border-color: rgba(255,255,255,0.1); }
.mp-full { padding: 1.25rem 1.35rem 1.1rem; }
.mp-compact { padding: 0.75rem 1rem; }

.mp-top { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.1rem; }
.mp-cover {
  width: 52px; height: 52px; border-radius: 10px; background: #18182a;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.3rem; color: #374151; flex-shrink: 0; overflow: hidden;
  border: 1px solid rgba(255,255,255,0.05); position: relative;
}
.mp-cover img { width:100%; height:100%; object-fit:cover; border-radius:10px; }
.mp-cover-vinyl {
  position: absolute; inset: 0; border-radius: 10px;
  background: repeating-radial-gradient(circle at 50% 50%, transparent 0px, transparent 3px, rgba(0,0,0,0.15) 3px, rgba(0,0,0,0.15) 4px);
  pointer-events: none; opacity: 0; transition: opacity 0.4s;
}
.mp-cover-vinyl.spinning { opacity: 1; animation: mp-vinyl 4s linear infinite; }
@keyframes mp-vinyl { to { transform: rotate(360deg); } }

.mp-info { flex:1; min-width:0; }
.mp-title {
  font-family: 'Playfair Display', Georgia, serif; font-size: 0.95rem; font-weight: 600;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px; color: #e2e8f0;
}
.mp-artist { font-size: 0.75rem; color: #6b7280; }

.mp-state {
  font-size: 0.65rem; padding: 0.12rem 0.5rem; border-radius: 10px; font-weight: 600;
  letter-spacing: 0.04em; text-transform: uppercase; flex-shrink: 0;
}
.mp-state.playing { background: rgba(52,211,153,0.1); color: #34d399; border: 1px solid rgba(52,211,153,0.2); }
.mp-state.paused  { background: rgba(255,255,255,0.04); color: #4b5563; border: 1px solid rgba(255,255,255,0.06); }
.mp-state.loading { background: rgba(226,201,126,0.08); color: #c8a84b; border: 1px solid rgba(226,201,126,0.15); }

.mp-waveform {
  height: 40px; display: flex; align-items: center; gap: 2px;
  cursor: pointer; border-radius: 8px; padding: 2px 0; margin-bottom: 0.65rem; position: relative;
}
.mp-wbar { flex: 1; border-radius: 2px; min-height: 3px; transition: background 0.08s; }

.mp-progress-track {
  position: relative; height: 4px; background: rgba(255,255,255,0.07);
  border-radius: 4px; cursor: pointer; margin-bottom: 0.55rem; overflow: hidden;
}
.mp-progress-fill {
  position: absolute; top: 0; left: 0; bottom: 0; border-radius: 4px;
  background: linear-gradient(90deg, #34d399, #059669); pointer-events: none; transition: width 0.1s linear;
}

.mp-controls { display: flex; align-items: center; gap: 0.5rem; }
.mp-btn {
  background: none; border: none; color: #4b5563; cursor: pointer;
  width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center;
  font-size: 0.9rem; transition: all 0.15s; padding: 0; flex-shrink: 0;
}
.mp-btn:hover { color: #9ca3af; background: rgba(255,255,255,0.05); }
.mp-btn.active { color: #e2c97e; background: rgba(226,201,126,0.1); }
.mp-btn:disabled { opacity:0.2; cursor:default; }

.mp-play-btn {
  width: 42px; height: 42px; border-radius: 50%; font-size: 1.1rem;
  background: #34d399; color: #0a0a0f; border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 18px rgba(52,211,153,0.2); transition: all 0.2s; flex-shrink: 0;
}
.mp-play-btn:hover:not(:disabled) { transform: scale(1.06); box-shadow: 0 6px 24px rgba(52,211,153,0.3); }
.mp-play-btn:active { transform: scale(0.95); }

.mp-time { font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; color: #4b5563; white-space: nowrap; }
.mp-time-current { color: #9ca3af; }
.mp-spacer { flex: 1; }

.mp-vol-wrap { display: flex; align-items: center; gap: 0.4rem; position: relative; }
.mp-vol-icon { font-size: 0.85rem; color: #4b5563; cursor: pointer; width: 22px; text-align: center; }
.mp-vol-slider {
  -webkit-appearance: none; width: 60px; height: 3px; border-radius: 2px;
  background: rgba(255,255,255,0.08); outline: none; cursor: pointer;
}
.mp-vol-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 10px; height: 10px; border-radius: 50%; background: #6b7280; }
.mp-vol-slider:hover::-webkit-slider-thumb { background: #34d399; }

.mp-spinner { width: 14px; height: 14px; border: 2px solid rgba(10,10,15,0.2); border-top-color: #0a0a0f; border-radius: 50%; animation: mp-spin 0.7s linear infinite; }
@keyframes mp-spin { to { transform: rotate(360deg); } }

.mp-repeat-badge {
  position: absolute; top: 0; right: 0; font-size: 0.55rem; font-weight: 800;
  background: #e2c97e; color: #0a0a0f; padding: 0 2px; border-radius: 3px;
  transform: translate(20%, -20%);
}
`;

/**
 * MusicPlayer — Trình phát nhạc nâng cao hỗ trợ Playlist và Repeat Modes
 * 
 * Props:
 *   playlist   {Array}  - Mảng các track [{ audioUrl, title, artist, coverUrl, ... }]
 *   audioUrl   {string} - Dùng cho chế độ 1 bài (backward compatibility)
 *   autoPlay   {boolean}
 *   compact    {boolean}
 */
export default function MusicPlayer({
  playlist = [],
  audioUrl = '',
  title    = '',
  artist   = '',
  coverUrl = '',
  compact  = false,
  autoPlay = false,
  onTrackChange,
}) {
  // Chuẩn hoá playlist: nếu truyền audioUrl lẻ thì gộp thành mảng 1 phần tử
  const normalizedPlaylist = useMemo(() => {
    if (playlist && playlist.length > 0) return playlist;
    if (audioUrl) return [{ audioUrl, title, artist, coverUrl }];
    return [];
  }, [playlist, audioUrl, title, artist, coverUrl]);

  const [index, setIndex] = useState(0);
  const currentTrack = normalizedPlaylist[index] || null;

  const audioRef = useRef(null);
  const rafRef   = useRef(null);
  const barsRef  = useRef([]);

  const [playing,    setPlaying]    = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [current,    setCurrent]    = useState(0);
  const [duration,   setDuration]   = useState(0);
  const [volume,     setVolume]     = useState(0.8);
  const [muted,      setMuted]      = useState(false);
  const [repeatMode, setRepeatMode] = useState('off'); // 'off' | 'all' | 'one'

  const progress = duration > 0 ? (current / duration) * 100 : 0;

  // ── Khởi tạo Audio khi track thay đổi ──────────────────────

  useEffect(() => {
    if (!currentTrack?.audioUrl) return;

    setPlaying(false);
    setLoading(true);
    setError('');
    setCurrent(0);
    setDuration(0);
    barsRef.current = generateBars(currentTrack.audioUrl);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }

    const audio = new Audio(currentTrack.audioUrl);
    audioRef.current = audio;
    audio.volume = muted ? 0 : volume;

    const onMeta  = () => { setDuration(audio.duration || 0); setLoading(false); };
    const onError = () => { setLoading(false); setError('Không thể tải file.'); };
    const onEnded = () => handleNext(true); // Tự động chuyển bài khi hết

    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('error',          onError);
    audio.addEventListener('ended',          onEnded);

    if (autoPlay || (index > 0)) { // Nếu không phải bài đầu tiên mount hoặc là autoPlay
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }

    onTrackChange?.(currentTrack, index);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('error',          onError);
      audio.removeEventListener('ended',          onEnded);
    };
  }, [currentTrack?.audioUrl, index]);

  // Loop progress
  useEffect(() => {
    if (!playing) { cancelAnimationFrame(rafRef.current); return; }
    const tick = () => {
      if (audioRef.current) setCurrent(audioRef.current.currentTime);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing]);

  // ── Handlers ──────────────────────────────────────────────

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || loading) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else {
      try { await audio.play(); setPlaying(true); } 
      catch { setError('Bị chặn tự phát.'); }
    }
  }, [playing, loading]);

  const handleNext = useCallback((isAuto = false) => {
    if (repeatMode === 'one' && isAuto) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
      return;
    }

    setIndex(prev => {
      const isLast = prev === normalizedPlaylist.length - 1;
      if (isLast) {
        if (repeatMode === 'all' || !isAuto) return 0; // Quay lại đầu
        setPlaying(false);
        return prev;
      }
      return prev + 1;
    });
  }, [normalizedPlaylist.length, repeatMode]);

  const handlePrev = useCallback(() => {
    if (current > 3) { // Nếu đã nghe > 3s thì reset bài hiện tại thay vì lùi
      if (audioRef.current) audioRef.current.currentTime = 0;
      return;
    }
    setIndex(prev => (prev === 0 ? normalizedPlaylist.length - 1 : prev - 1));
  }, [current, normalizedPlaylist.length]);

  const toggleRepeat = () => {
    setRepeatMode(p => (p === 'off' ? 'all' : p === 'all' ? 'one' : 'off'));
  };

  const handleSeek = (e, el) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pct * duration;
    setCurrent(audio.currentTime);
  };

  const handleVolume = (v) => {
    if (audioRef.current) audioRef.current.volume = v;
    setVolume(v);
    setMuted(v === 0);
  };

  if (!currentTrack) return null;

  return (
    <>
      <style>{CSS}</style>
      <div className={`mp-wrap ${compact ? 'mp-compact' : 'mp-full'}`}>
        
        {/* Info */}
        {!compact && (
          <div className="mp-top">
            <div className="mp-cover">
              {currentTrack.coverUrl ? <img src={currentTrack.coverUrl} /> : '♪'}
              <div className={`mp-cover-vinyl ${playing ? 'spinning' : ''}`} />
            </div>
            <div className="mp-info">
              <div className="mp-title">{currentTrack.title}</div>
              <div className="mp-artist">{currentTrack.artist}</div>
            </div>
            <span className={`mp-state ${loading?'loading':playing?'playing':'paused'}`}>
              {loading ? '···' : playing ? 'Playing' : 'Paused'}
            </span>
          </div>
        )}

        {/* Wave or Progress */}
        {!compact ? (
          <div className="mp-waveform" onClick={(e) => handleSeek(e, e.currentTarget)}>
            {barsRef.current.map((h, i) => (
              <div key={i} className="mp-wbar" style={{
                height: `${h * 100}%`,
                background: (i / barsRef.current.length) * 100 <= progress 
                  ? '#34d399' : 'rgba(255,255,255,0.05)'
              }} />
            ))}
          </div>
        ) : (
          <div className="mp-progress-track" onClick={(e) => handleSeek(e, e.currentTarget)}>
            <div className="mp-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        )}

        {/* Controls */}
        <div className="mp-controls">
          <button className={`mp-btn ${repeatMode !== 'off' ? 'active' : ''}`} 
            onClick={toggleRepeat} title="Lặp lại" style={{ position: 'relative' }}>
            🔁 {repeatMode !== 'off' && <span className="mp-repeat-badge">{repeatMode==='one'?'1':'A'}</span>}
          </button>

          <button className="mp-btn" onClick={handlePrev} disabled={normalizedPlaylist.length <= 1}>⏮</button>
          
          <button className="mp-play-btn" onClick={togglePlay} disabled={loading && !playing}>
            {loading && !playing ? <div className="mp-spinner" /> : playing ? '⏸' : '▶'}
          </button>

          <button className="mp-btn" onClick={() => handleNext(false)} disabled={normalizedPlaylist.length <= 1}>⏭</button>

          <span className="mp-time">
            <span className="mp-time-current">{fmtTime(current)}</span> / {fmtTime(duration)}
          </span>

          <div className="mp-spacer" />

          <div className="mp-vol-wrap">
            <span className="mp-vol-icon" onClick={() => handleVolume(muted?0.8:0)}>
              {muted || volume === 0 ? '🔇' : volume > 0.5 ? '🔊' : '🔉'}
            </span>
            <input type="range" className="mp-vol-slider" min={0} max={1} step={0.05} 
              value={muted ? 0 : volume} onChange={e => handleVolume(Number(e.target.value))} />
          </div>
        </div>

        {error && <div style={{ fontSize:'0.7rem', color:'#f87171', marginTop:'0.5rem' }}>⚠ {error}</div>}
      </div>
    </>
  );
}
