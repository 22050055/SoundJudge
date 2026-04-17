import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axiosConfig';
import ReportModal from '../common/ReportModal';
import MusicPlayer from '../common/MusicPlayer';

const GENRES = ['pop','rock','jazz','classical','hiphop','electronic','folk','other'];
const GENRE_LABEL = { pop:'Pop', rock:'Rock', jazz:'Jazz', classical:'Classical', hiphop:'Hip-Hop', electronic:'Electronic', folk:'Folk', other:'Khác' };

export default function UserDashboard() {
  const { user, favorites, toggleFavorite } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('explore');

  // State cho từng tab
  const [myTracks,    setMyTracks]    = useState([]);
  const [allTracks,   setAllTracks]   = useState([]);
  const [myReviews,   setMyReviews]   = useState([]);
  const [favTracks,   setFavTracks]   = useState([]); // Để hiển thị tab thư viện
  const [loading,     setLoading]     = useState(false);
  const [filter,      setFilter]      = useState({ genre: '', search: '' });

  // Playlist playing state
  const [playingPlaylist, setPlayingPlaylist] = useState(null);

  // Report modal
  const [reportTarget, setReportTarget] = useState(null); // { type, id, name }

  // Fetch my tracks
  const fetchMyTracks = useCallback(async () => {
    try {
      const { data } = await api.get('/tracks', { params: { myTracks: 'true', limit: 50 } });
      setMyTracks(data.tracks || []);
    } catch {}
  }, []);

  // Fetch all tracks (explore)
  const fetchAllTracks = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 20 };
      if (filter.genre)  params.genre  = filter.genre;
      if (filter.search) params.search = filter.search;
      const { data } = await api.get('/tracks', { params });
      setAllTracks(data.tracks || []);
    } catch {} finally { setLoading(false); }
  }, [filter]);

  // Fetch my reviews
  const fetchMyReviews = useCallback(async () => {
    try {
      const { data } = await api.get('/reviews/my');
      setMyReviews(data.reviews || []);
    } catch {}
  }, []);

  // Fetch favorites
  const fetchFavorites = useCallback(async () => {
    try {
      const { data } = await api.get('/tracks/favorites');
      setFavTracks(data.tracks || []);
    } catch {}
  }, []);

  useEffect(() => {
    if (activeTab === 'my')      fetchMyTracks();
    if (activeTab === 'explore') fetchAllTracks();
    if (activeTab === 'reviews') fetchMyReviews();
    if (activeTab === 'library') fetchFavorites();
  }, [activeTab, fetchMyTracks, fetchAllTracks, fetchMyReviews, fetchFavorites]);

  const handleDeleteTrack = async (trackId) => {
    if (!window.confirm('Bạn có chắc muốn xóa bài nhạc này?')) return;
    try {
      await api.delete(`/tracks/${trackId}`);
      setMyTracks((prev) => prev.filter((t) => t._id !== trackId));
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể xóa');
    }
  };

  const scoreColor = (s) => s >= 8 ? '#34d399' : s >= 6 ? '#e2c97e' : s >= 4 ? '#f97316' : '#ef4444';

  const handleToggleHeart = async (e, trackId) => {
    e.stopPropagation();
    try {
      await toggleFavorite(trackId);
      if (activeTab === 'library') {
        setFavTracks(prev => prev.filter(t => t._id !== trackId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePlayAllFavs = () => {
    if (favTracks.length > 0) {
      setPlayingPlaylist(favTracks);
    }
  };

  const isFav = (id) => favorites.includes(id);

  return (
    <>
      <style>{`
        .ud-layout { display: flex; max-width: 1250px; margin: 0 auto; padding: 2rem 1.5rem; gap: 2.5rem; padding-bottom: 120px; }
        @media(max-width: 768px) { .ud-layout { flex-direction: column; gap: 1.5rem; } }
        
        .ud-sidebar { width: 260px; flex-shrink: 0; }
        @media(max-width: 768px) { .ud-sidebar { width: 100%; display: flex; overflow-x: auto; padding-bottom: 0.5rem; } }
        
        .ud-header { margin-bottom: 2rem; }
        .ud-header h1 { font-size: 1.8rem; font-weight: 800; color: #f9fafb; margin: 0 0 0.25rem; }
        .ud-header p { color: #6b7280; font-size: 0.9rem; margin: 0; }

        .ud-sidebar-item {
          display: flex; align-items: center; gap: 0.75rem; width: 100%; text-align: left;
          padding: 0.9rem 1.25rem; border-radius: 12px;
          font-size: 0.95rem; font-weight: 600; cursor: pointer;
          color: #6b7280; background: none; border: none;
          transition: all 0.2s; margin-bottom: 0.4rem;
        }
        @media(max-width: 768px) { .ud-sidebar-item { white-space: nowrap; margin-bottom: 0; } }
        .ud-sidebar-item:hover { color: #d1d5db; background: rgba(255,255,255,0.03); }
        .ud-sidebar-item.active { color: #e2c97e; background: rgba(226,201,126,0.08); }
        
        .ud-main { flex: 1; min-width: 0; }

        /* Grid track */
        .track-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1.25rem; }
        .track-card {
          background: #111827; border: 1px solid #1f2937; border-radius: 14px;
          overflow: hidden; transition: all 0.2s; cursor: pointer;
          position: relative;
        }
        .track-card:hover { border-color: #374151; transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
        .track-cover-wrap { position: relative; width: 100%; aspect-ratio: 1; overflow: hidden; }
        .track-cover { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.3s; }
        .track-card:hover .track-cover { transform: scale(1.05); }
        .track-cover-placeholder {
          width: 100%; height: 100%;
          background: linear-gradient(135deg, #1f2937, #111827);
          display: flex; align-items: center; justify-content: center;
          font-size: 3rem; color: #374151;
        }
        
        .heart-btn {
          position: absolute; top: 10px; right: 10px;
          width: 34px; height: 34px; border-radius: 50%;
          background: rgba(0,0,0,0.4); backdrop-filter: blur(4px);
          border: 1px solid rgba(255,255,255,0.1);
          color: #fff; display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.2s; z-index: 2;
        }
        .heart-btn:hover { transform: scale(1.1); background: rgba(0,0,0,0.6); }
        .heart-btn.liked { color: #ef4444; border-color: rgba(239,68,68,0.3); }

        .track-body { padding: 0.9rem; }
        .track-title { font-size: 0.9rem; font-weight: 700; color: #f9fafb; margin: 0 0 0.25rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .track-artist { font-size: 0.78rem; color: #6b7280; margin: 0 0 0.5rem; }
        .track-meta { display: flex; align-items: center; justify-content: space-between; }
        .track-genre { font-size: 0.72rem; color: #4b5563; background: #1f2937; padding: 0.2rem 0.5rem; border-radius: 6px; }
        .track-score { font-size: 0.82rem; font-weight: 700; }
        
        .track-actions { display: flex; gap: 0.4rem; margin-top: 0.6rem; flex-wrap: wrap; }
        .btn-xs {
          font-size: 0.72rem; padding: 0.3rem 0.6rem; border-radius: 6px;
          border: 1px solid #374151; background: none; cursor: pointer;
          color: #9ca3af; transition: all 0.15s;
        }
        .btn-xs:hover { color: #f9fafb; border-color: #6b7280; }
        .btn-xs.danger:hover { color: #ef4444; border-color: #ef4444; }
        .btn-xs.report:hover { color: #f97316; border-color: #f97316; }

        .filter-bar { display: flex; gap: 0.75rem; margin-bottom: 1.5rem; flex-wrap: wrap; align-items: center; }
        .filter-bar input, .filter-bar select {
          background: #111827; border: 1.5px solid #1f2937; border-radius: 10px;
          color: #f9fafb; padding: 0.6rem 1rem; font-size: 0.88rem; outline: none;
          transition: border-color 0.2s; font-family: inherit;
        }
        .filter-bar input { flex: 1; min-width: 180px; }
        .filter-bar select option { background: #111827; }

        .review-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .review-item {
          background: #111827; border: 1px solid #1f2937; border-radius: 12px;
          padding: 1rem 1.25rem; display: flex; gap: 1rem; align-items: center;
        }
        .review-cover { width: 52px; height: 52px; border-radius: 8px; object-fit: cover; background: #1f2937; flex-shrink: 0; font-size: 1.5rem; display: flex; align-items: center; justify-content: center; }
        .review-info { flex: 1; }
        .review-track-name { font-size: 0.9rem; font-weight: 700; color: #f9fafb; margin: 0 0 0.2rem; }
        .review-comment { font-size: 0.82rem; color: #6b7280; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .lib-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .btn-play-all {
          padding: 0.6rem 1.25rem; border-radius: 10px; border: none;
          background: #34d399; color: #0a0a0f; font-weight: 700; font-size: 0.9rem;
          cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 0.5rem;
        }
        .btn-play-all:hover { transform: scale(1.03); box-shadow: 0 4px 15px rgba(52,211,153,0.3); }

        .global-player-fixed {
          position: fixed; bottom: 0; left: 0; right: 0; 
          background: rgba(10,10,15,0.95); backdrop-filter: blur(10px);
          border-top: 1px solid rgba(255,255,255,0.08); padding: 1rem;
          z-index: 1000; animation: slideUp 0.4s easeOutQuad;
        }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: none; } }

        .spinner { text-align: center; padding: 3rem; color: #6b7280; }
        .empty { text-align: center; padding: 4rem 2rem; color: #4b5563; }
      `}</style>

      <div className="ud-layout">
        <div className="ud-sidebar">
          <div className="ud-header">
            <h1>🎵 Chào {user?.name?.split(' ')[0]}!</h1>
            <p>Âm nhạc theo cách của bạn</p>
          </div>
          <div className="ud-nav">
            {[
              { id: 'explore', label: '🌐 Khám phá' },
              { id: 'library', label: '💖 Thư viện' },
              { id: 'my',      label: '🎵 Nhạc của tôi' },
              { id: 'reviews', label: '✍️ Đánh giá' },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`ud-sidebar-item${activeTab === tab.id ? ' active' : ''}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ud-main">
          {/* ── EXPLORE ── */}
          {activeTab === 'explore' && (
            <>
              <div className="filter-bar">
                <input placeholder="🔍 Tìm bài nhạc..." value={filter.search}
                  onChange={(e) => setFilter(p => ({ ...p, search: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && fetchAllTracks()} />
                <select value={filter.genre} onChange={(e) => setFilter(p => ({ ...p, genre: e.target.value }))}>
                  <option value="">Tất cả thể loại</option>
                  {GENRES.map(g => <option key={g} value={g}>{GENRE_LABEL[g]}</option>)}
                </select>
              </div>
              {loading ? <div className="spinner">Đang tải...</div> : (
                <div className="track-grid">
                  {allTracks.map(track => (
                    <TrackCard key={track._id} track={track} 
                      isLiked={isFav(track._id)} onToggleLike={handleToggleHeart}
                      onClick={() => navigate(`/dashboard/track/${track._id}`)}
                      onReport={() => setReportTarget({ type: 'track', id: track._id, name: track.title })}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── LIBRARY ── */}
          {activeTab === 'library' && (
            <>
              <div className="lib-header">
                <h2>Thư viện yêu thích</h2>
                {favTracks.length > 0 && (
                  <button className="btn-play-all" onClick={handlePlayAllFavs}>
                    ▶ Phát tất cả ({favTracks.length})
                  </button>
                )}
              </div>
              {favTracks.length === 0 ? (
                <div className="empty"><div className="icon">💖</div><p>Thư viện đang trống. Hãy thả tim bài nhạc bạn thích!</p></div>
              ) : (
                <div className="track-grid">
                  {favTracks.map(track => (
                    <TrackCard key={track._id} track={track} 
                      isLiked={true} onToggleLike={handleToggleHeart}
                      onClick={() => navigate(`/dashboard/track/${track._id}`)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── MY TRACKS ── */}
          {activeTab === 'my' && (
            <>
              <div className="upload-cta" onClick={() => navigate('/dashboard/upload')}>
                <div className="icon">📤</div>
                <h3>Upload bài nhạc mới</h3>
                <p>Chia sẻ cảm hứng với cộng đồng</p>
              </div>
              <div className="track-grid">
                {myTracks.map(track => (
                  <TrackCard key={track._id} track={track} hideLike
                    onClick={() => navigate(`/dashboard/track/${track._id}`)}
                    actions={<button className="btn-xs danger" onClick={(e) => { e.stopPropagation(); handleDeleteTrack(track._id); }}>🗑️ Xóa</button>}
                  />
                ))}
              </div>
            </>
          )}

          {/* ── REVIEWS ── */}
          {activeTab === 'reviews' && (
            <div className="review-list">
              {myReviews.map(review => (
                <div className="review-item" key={review._id}>
                  {review.track?.coverUrl ? <img className="review-cover" src={review.track.coverUrl} /> : <div className="review-cover">🎵</div>}
                  <div className="review-info">
                    <p className="review-track-name">{review.track?.title}</p>
                    <p className="review-comment">{review.comment}</p>
                  </div>
                  <div style={{ color: scoreColor(review.overallScore), fontWeight:800 }}>{review.overallScore}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Global Player */}
      {playingPlaylist && (
        <div className="global-player-fixed">
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <MusicPlayer playlist={playingPlaylist} autoPlay />
          </div>
        </div>
      )}

      {reportTarget && (
        <ReportModal isOpen onClose={() => setReportTarget(null)}
          targetType={reportTarget.type} targetId={reportTarget.id} targetName={reportTarget.name} />
      )}
    </>
  );
}

function TrackCard({ track, isLiked, onToggleLike, onClick, onReport, actions, hideLike }) {
  const navigate = useNavigate();
  return (
    <div className="track-card" onClick={onClick}>
      <div className="track-cover-wrap">
        {track.coverUrl 
          ? <img className="track-cover" src={track.coverUrl} alt="" />
          : <div className="track-cover-placeholder">🎵</div>
        }
        {!hideLike && (
          <button className={`heart-btn ${isLiked ? 'liked' : ''}`} onClick={(e) => onToggleLike(e, track._id)}>
            {isLiked ? '❤️' : '🤍'}
          </button>
        )}
      </div>
      <div className="track-body">
        <p className="track-title">{track.title}</p>
        <p className="track-artist" onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/profile/${track.artist?._id}`); }} style={{ cursor: 'pointer' }}>
          👤 {track.artist?.name}
        </p>
        <div className="track-meta">
          <span className="track-genre">{GENRE_LABEL[track.genre]}</span>
          {track.reviewCount > 0 && <span className="track-score" style={{ color: '#e2c97e' }}>⭐ {track.averageScore}</span>}
        </div>
        <div className="track-actions">
          <button className="btn-xs">Xem chi tiết</button>
          {onReport && <button className="btn-xs report" onClick={(e) => { e.stopPropagation(); onReport(); }}>🚩 Báo cáo</button>}
          {actions}
        </div>
      </div>
    </div>
  );
}
