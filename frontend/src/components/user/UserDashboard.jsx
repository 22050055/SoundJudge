import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axiosConfig';
import ReportModal from '../common/ReportModal';

const GENRES = ['pop','rock','jazz','classical','hiphop','electronic','folk','other'];
const GENRE_LABEL = { pop:'Pop', rock:'Rock', jazz:'Jazz', classical:'Classical', hiphop:'Hip-Hop', electronic:'Electronic', folk:'Folk', other:'Khác' };

export default function UserDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('explore');

  // State cho từng tab
  const [myTracks,    setMyTracks]    = useState([]);
  const [allTracks,   setAllTracks]   = useState([]);
  const [myReviews,   setMyReviews]   = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [filter,      setFilter]      = useState({ genre: '', search: '' });

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

  useEffect(() => {
    if (activeTab === 'my')      fetchMyTracks();
    if (activeTab === 'explore') fetchAllTracks();
    if (activeTab === 'reviews') fetchMyReviews();
  }, [activeTab, fetchMyTracks, fetchAllTracks, fetchMyReviews]);

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

  return (
    <>
      <style>{`
        .ud-layout { display: flex; max-width: 1250px; margin: 0 auto; padding: 2rem 1.5rem; gap: 2.5rem; }
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
        .track-cover {
          width: 100%; aspect-ratio: 1; object-fit: cover; display: block;
          background: linear-gradient(135deg, #1f2937, #374151);
          position: relative;
        }
        .track-cover-placeholder {
          width: 100%; aspect-ratio: 1;
          background: linear-gradient(135deg, #1f2937, #111827);
          display: flex; align-items: center; justify-content: center;
          font-size: 3rem; color: #374151;
        }
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

        /* Explore filter bar */
        .filter-bar { display: flex; gap: 0.75rem; margin-bottom: 1.5rem; flex-wrap: wrap; align-items: center; }
        .filter-bar input, .filter-bar select {
          background: #111827; border: 1.5px solid #1f2937; border-radius: 10px;
          color: #f9fafb; padding: 0.6rem 1rem; font-size: 0.88rem; outline: none;
          transition: border-color 0.2s; font-family: inherit;
        }
        .filter-bar input { flex: 1; min-width: 180px; }
        .filter-bar input:focus, .filter-bar select:focus { border-color: #374151; }
        .filter-bar select option { background: #111827; }

        /* My Reviews */
        .review-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .review-item {
          background: #111827; border: 1px solid #1f2937; border-radius: 12px;
          padding: 1rem 1.25rem; display: flex; gap: 1rem; align-items: center;
          transition: border-color 0.2s;
        }
        .review-item:hover { border-color: #374151; }
        .review-cover { width: 52px; height: 52px; border-radius: 8px; object-fit: cover; background: #1f2937; flex-shrink: 0; font-size: 1.5rem; display: flex; align-items: center; justify-content: center; }
        .review-info { flex: 1; }
        .review-track-name { font-size: 0.9rem; font-weight: 700; color: #f9fafb; margin: 0 0 0.2rem; }
        .review-comment { font-size: 0.82rem; color: #6b7280; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .review-score-badge {
          font-size: 1rem; font-weight: 800; width: 42px; height: 42px;
          border-radius: 10px; display: flex; align-items: center; justify-content: center;
          background: #1f2937; flex-shrink: 0;
        }

        /* Upload CTA */
        .upload-cta {
          border: 2px dashed #1f2937; border-radius: 16px;
          padding: 4rem 2rem; text-align: center; cursor: pointer;
          transition: all 0.2s; margin-bottom: 1.5rem;
        }
        .upload-cta:hover { border-color: #e2c97e; background: rgba(226,201,126,0.03); }
        .upload-cta .icon { font-size: 3rem; margin-bottom: 1rem; }
        .upload-cta h3 { color: #f9fafb; margin: 0 0 0.5rem; font-size: 1.1rem; }
        .upload-cta p { color: #6b7280; font-size: 0.85rem; margin: 0; }

        .empty { text-align: center; padding: 4rem 2rem; color: #4b5563; }
        .empty .icon { font-size: 3rem; margin-bottom: 1rem; opacity: 0.4; }
        .spinner { text-align: center; padding: 3rem; color: #6b7280; font-size: 0.9rem; }
      `}</style>

      <div className="ud-layout">
        
        {/* ── SIDEBAR MENU ─────────────────────────────────── */}
        <div className="ud-sidebar">
          <div className="ud-header">
            <h1>🎵 Chào {user?.name?.split(' ')[0]}!</h1>
            <p>Khám phá âm nhạc cộng đồng</p>
          </div>

          <div className="ud-nav">
            {[
              { id: 'explore', label: '🌐 Khám phá' },
              { id: 'my',      label: '🎵 Nhạc của tôi' },
              { id: 'reviews', label: '✍️ Đánh giá của tôi' },
            ].map((tab) => (
              <button
                key={tab.id}
                className={`ud-sidebar-item${activeTab === tab.id ? ' active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── MAIN CONTENT ────────────────────────────────── */}
        <div className="ud-main">

        {/* ── TAB: KHÁM PHÁ ─────────────────────────────── */}
        {activeTab === 'explore' && (
          <>
            <div className="filter-bar">
              <input
                placeholder="🔍 Tìm bài nhạc..."
                value={filter.search}
                onChange={(e) => setFilter((p) => ({ ...p, search: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && fetchAllTracks()}
              />
              <select value={filter.genre} onChange={(e) => setFilter((p) => ({ ...p, genre: e.target.value }))}>
                <option value="">Tất cả thể loại</option>
                {GENRES.map((g) => <option key={g} value={g}>{GENRE_LABEL[g]}</option>)}
              </select>
            </div>

            {loading ? (
              <div className="spinner">Đang tải...</div>
            ) : allTracks.length === 0 ? (
              <div className="empty"><div className="icon">🎵</div><p>Chưa có bài nhạc nào</p></div>
            ) : (
              <div className="track-grid">
                {allTracks.map((track) => (
                  <div className="track-card" key={track._id}>
                    {track.coverUrl
                      ? <img className="track-cover" src={track.coverUrl} alt={track.title} onClick={() => navigate(`/dashboard/track/${track._id}`)} />
                      : <div className="track-cover-placeholder" onClick={() => navigate(`/dashboard/track/${track._id}`)}>🎵</div>
                    }
                    <div className="track-body">
                      <p className="track-title">{track.title}</p>
                      <p className="track-artist"
                        onClick={() => navigate(`/dashboard/profile/${track.artist?._id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        👤 {track.artist?.name}
                      </p>
                      <div className="track-meta">
                        <span className="track-genre">{GENRE_LABEL[track.genre]}</span>
                        {track.reviewCount > 0 && (
                          <span className="track-score" style={{ color: scoreColor(track.averageScore) }}>
                            ⭐ {track.averageScore}
                          </span>
                        )}
                      </div>
                      <div className="track-actions">
                        <button className="btn-xs" onClick={() => navigate(`/dashboard/track/${track._id}`)}>Xem</button>
                        {track.artist?._id !== user?.id && (
                          <button className="btn-xs report" onClick={() => setReportTarget({ type: 'track', id: track._id, name: track.title })}>
                            🚩 Báo cáo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── TAB: NHẠC CỦA TÔI ─────────────────────────── */}
        {activeTab === 'my' && (
          <>
            <div className="upload-cta" onClick={() => navigate('/dashboard/upload')}>
              <div className="icon">📤</div>
              <h3>Upload bài nhạc mới</h3>
              <p>Chia sẻ âm nhạc của bạn với cộng đồng</p>
            </div>

            {myTracks.length === 0 ? (
              <div className="empty"><div className="icon">🎵</div><p>Bạn chưa đăng bài nhạc nào</p></div>
            ) : (
              <div className="track-grid">
                {myTracks.map((track) => (
                  <div className="track-card" key={track._id}>
                    {track.coverUrl
                      ? <img className="track-cover" src={track.coverUrl} alt={track.title} />
                      : <div className="track-cover-placeholder">🎵</div>
                    }
                    <div className="track-body">
                      <p className="track-title">{track.title}</p>
                      <div className="track-meta">
                        <span className="track-genre">{GENRE_LABEL[track.genre]}</span>
                        {track.reviewCount > 0 && (
                          <span className="track-score" style={{ color: scoreColor(track.averageScore) }}>
                            ⭐ {track.averageScore} ({track.reviewCount})
                          </span>
                        )}
                      </div>
                      <div className="track-actions">
                        <button className="btn-xs" onClick={() => navigate(`/dashboard/track/${track._id}`)}>📊 Stats</button>
                        <button className="btn-xs danger" onClick={() => handleDeleteTrack(track._id)}>🗑️ Xóa</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── TAB: ĐÁNH GIÁ CỦA TÔI ────────────────────── */}
        {activeTab === 'reviews' && (
          <div className="review-list">
            {myReviews.length === 0 ? (
              <div className="empty"><div className="icon">✍️</div><p>Bạn chưa có đánh giá nào</p></div>
            ) : myReviews.map((review) => (
              <div className="review-item" key={review._id}>
                {review.track?.coverUrl
                  ? <img className="review-cover" src={review.track.coverUrl} alt="" />
                  : <div className="review-cover">🎵</div>
                }
                <div className="review-info">
                  <p className="review-track-name">{review.track?.title || 'Bài nhạc'}</p>
                  <p className="review-comment">{review.comment}</p>
                </div>
                <div className="review-score-badge" style={{ color: scoreColor(review.overallScore) }}>
                  {review.overallScore}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>

      {/* Report Modal */}
      {reportTarget && (
        <ReportModal
          isOpen={!!reportTarget}
          onClose={() => setReportTarget(null)}
          targetType={reportTarget.type}
          targetId={reportTarget.id}
          targetName={reportTarget.name}
        />
      )}
    </>
  );
}
