import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axiosConfig';
import ReportModal from '../common/ReportModal';

const GENRE_LABEL = { pop:'Pop', rock:'Rock', jazz:'Jazz', classical:'Classical', hiphop:'Hip-Hop', electronic:'Electronic', folk:'Folk', other:'Khác' };

export default function ProfilePage() {
  const { id }      = useParams();
  const { user: me } = useAuth();
  const navigate    = useNavigate();

  const [profile,     setProfile]     = useState(null);
  const [tracks,      setTracks]      = useState([]);
  const [reviews,     setReviews]     = useState([]);
  const [activeTab,   setActiveTab]   = useState('tracks');
  const [loading,     setLoading]     = useState(true);
  const [following,   setFollowing]   = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [reportOpen,  setReportOpen]  = useState(false);

  const isMyProfile = me?.id === id || me?._id === id;

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, tracksRes] = await Promise.all([
        api.get(`/users/${id}`),
        api.get('/tracks', { params: { artistId: id, limit: 20 } }),
      ]);
      setProfile(profileRes.data.user);
      setTracks(tracksRes.data.tracks || []);

      // Check xem mình có đang follow không
      if (me && !isMyProfile) {
        const myData = await api.get('/auth/me');
        setFollowing((myData.data.user?.following || []).includes(id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id, me, isMyProfile]);

  const fetchReviews = useCallback(async () => {
    try {
      // Lấy reviews của user này qua my endpoint (chỉ dùng được nếu là chính mình)
      // hoặc lọc reviews theo reviewer
    } catch {}
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);
  useEffect(() => { if (activeTab === 'reviews') fetchReviews(); }, [activeTab, fetchReviews]);

  const handleFollow = async () => {
    if (!me) { navigate('/login'); return; }
    setFollowLoading(true);
    try {
      if (following) {
        await api.delete(`/users/${id}/follow`);
        setFollowing(false);
        setProfile((p) => ({ ...p, followers: (p.followers || []).filter((f) => f._id !== me.id) }));
      } else {
        await api.post(`/users/${id}/follow`);
        setFollowing(true);
        setProfile((p) => ({ ...p, followers: [...(p.followers || []), { _id: me.id, name: me.name }] }));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh', color: '#6b7280' }}>
      Đang tải hồ sơ...
    </div>
  );

  if (!profile) return (
    <div style={{ textAlign: 'center', padding: '4rem', color: '#6b7280' }}>
      Không tìm thấy người dùng
    </div>
  );

  const followersCount = profile.followers?.length || 0;
  const followingCount = profile.following?.length || 0;
  const scoreColor = (s) => s >= 8 ? '#34d399' : s >= 6 ? '#e2c97e' : s >= 4 ? '#f97316' : '#ef4444';

  return (
    <>
      <style>{`
        .pf-wrap { max-width: 900px; margin: 0 auto; padding: 2rem 1.5rem; }
        .pf-hero {
          background: linear-gradient(135deg, #111827, #1f2937);
          border: 1px solid #1f2937; border-radius: 20px;
          padding: 2rem; display: flex; gap: 2rem; align-items: flex-start;
          margin-bottom: 2rem; flex-wrap: wrap;
        }
        .pf-avatar {
          width: 90px; height: 90px; border-radius: 50%;
          background: linear-gradient(135deg, #e2c97e, #c8a84b);
          display: flex; align-items: center; justify-content: center;
          font-size: 2.2rem; color: #0a0a0f; font-weight: 800;
          flex-shrink: 0; overflow: hidden;
        }
        .pf-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .pf-info { flex: 1; }
        .pf-name { font-size: 1.6rem; font-weight: 800; color: #f9fafb; margin: 0 0 0.25rem; }
        .pf-bio { font-size: 0.88rem; color: #6b7280; margin: 0 0 1rem; }
        .pf-stats { display: flex; gap: 1.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
        .pf-stat { text-align: center; }
        .pf-stat-value { font-size: 1.2rem; font-weight: 800; color: #f9fafb; display: block; }
        .pf-stat-label { font-size: 0.75rem; color: #6b7280; }
        .pf-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }
        .btn-follow {
          padding: 0.6rem 1.5rem; border-radius: 10px; font-size: 0.88rem; font-weight: 700;
          cursor: pointer; transition: all 0.2s; border: none;
        }
        .btn-follow.following {
          background: #1f2937; color: #9ca3af; border: 1.5px solid #374151;
        }
        .btn-follow.following:hover { border-color: #ef4444; color: #ef4444; }
        .btn-follow.not-following {
          background: linear-gradient(135deg, #e2c97e, #c8a84b); color: #0a0a0f;
        }
        .btn-follow:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-report-user {
          padding: 0.6rem 1rem; border-radius: 10px; font-size: 0.82rem;
          background: none; border: 1.5px solid #374151; color: #6b7280;
          cursor: pointer; transition: all 0.2s;
        }
        .btn-report-user:hover { border-color: #ef4444; color: #ef4444; }

        /* Tabs */
        .pf-tabs { display: flex; gap: 0.5rem; border-bottom: 1px solid #1f2937; margin-bottom: 1.5rem; }
        .pf-tab {
          padding: 0.7rem 1.25rem; background: none; border: none;
          border-bottom: 2px solid transparent; color: #6b7280;
          font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
        }
        .pf-tab:hover { color: #d1d5db; }
        .pf-tab.active { color: #e2c97e; border-bottom-color: #e2c97e; }

        /* Track grid */
        .pf-track-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
        .pf-track-card {
          background: #111827; border: 1px solid #1f2937; border-radius: 12px;
          overflow: hidden; cursor: pointer; transition: all 0.2s;
        }
        .pf-track-card:hover { border-color: #374151; transform: translateY(-2px); }
        .pf-track-cover { width: 100%; aspect-ratio: 1; object-fit: cover; font-size: 2.5rem;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #1f2937, #111827); color: #374151; }
        .pf-track-body { padding: 0.75rem; }
        .pf-track-title { font-size: 0.85rem; font-weight: 700; color: #f9fafb; margin: 0 0 0.25rem;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pf-track-meta { display: flex; justify-content: space-between; align-items: center; }
        .pf-track-genre { font-size: 0.7rem; color: #4b5563; background: #1f2937; padding: 0.15rem 0.4rem; border-radius: 4px; }
        .pf-track-score { font-size: 0.78rem; font-weight: 700; }

        /* Follow list */
        .pf-follow-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem; }
        .pf-follow-item {
          background: #111827; border: 1px solid #1f2937; border-radius: 12px;
          padding: 1rem; display: flex; align-items: center; gap: 0.75rem;
          cursor: pointer; transition: all 0.2s;
        }
        .pf-follow-item:hover { border-color: #374151; }
        .pf-follow-avatar {
          width: 40px; height: 40px; border-radius: 50%;
          background: linear-gradient(135deg, #e2c97e, #c8a84b);
          display: flex; align-items: center; justify-content: center;
          font-size: 1rem; color: #0a0a0f; font-weight: 700; flex-shrink: 0;
        }
        .pf-follow-name { font-size: 0.88rem; font-weight: 600; color: #f9fafb; }
        .empty { text-align: center; padding: 3rem; color: #4b5563; }
      `}</style>

      <div className="pf-wrap">
        {/* Hero */}
        <div className="pf-hero">
          <div className="pf-avatar">
            {profile.avatar?.url
              ? <img src={profile.avatar.url} alt={profile.name} />
              : profile.name?.[0]?.toUpperCase()
            }
          </div>
          <div className="pf-info">
            <h1 className="pf-name">{profile.name}</h1>
            {profile.bio && <p className="pf-bio">{profile.bio}</p>}
            <div className="pf-stats">
              <div className="pf-stat">
                <span className="pf-stat-value">{tracks.length}</span>
                <span className="pf-stat-label">Bài nhạc</span>
              </div>
              <div className="pf-stat">
                <span className="pf-stat-value">{followersCount}</span>
                <span className="pf-stat-label">Follower</span>
              </div>
              <div className="pf-stat">
                <span className="pf-stat-value">{followingCount}</span>
                <span className="pf-stat-label">Following</span>
              </div>
            </div>

            {!isMyProfile && me && (
              <div className="pf-actions">
                <button
                  className={`btn-follow ${following ? 'following' : 'not-following'}`}
                  onClick={handleFollow}
                  disabled={followLoading}
                >
                  {followLoading ? '...' : following ? '✓ Đang follow' : '+ Follow'}
                </button>
                <button className="btn-report-user" onClick={() => setReportOpen(true)}>
                  🚩 Báo cáo
                </button>
              </div>
            )}

            {isMyProfile && (
              <button
                className="btn-follow not-following"
                onClick={() => navigate('/dashboard/upload')}
              >
                📤 Upload nhạc
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="pf-tabs">
          <button className={`pf-tab${activeTab === 'tracks' ? ' active' : ''}`} onClick={() => setActiveTab('tracks')}>
            🎵 Bài nhạc ({tracks.length})
          </button>
          <button className={`pf-tab${activeTab === 'followers' ? ' active' : ''}`} onClick={() => setActiveTab('followers')}>
            👥 Followers ({followersCount})
          </button>
          <button className={`pf-tab${activeTab === 'following' ? ' active' : ''}`} onClick={() => setActiveTab('following')}>
            ❤️ Following ({followingCount})
          </button>
        </div>

        {/* Tab content */}
        {activeTab === 'tracks' && (
          tracks.length === 0 ? (
            <div className="empty">Chưa có bài nhạc nào</div>
          ) : (
            <div className="pf-track-grid">
              {tracks.map((track) => (
                <div className="pf-track-card" key={track._id} onClick={() => navigate(`/dashboard/track/${track._id}`)}>
                  {track.coverUrl
                    ? <img className="pf-track-cover" src={track.coverUrl} alt={track.title} style={{ display: 'block' }} />
                    : <div className="pf-track-cover">🎵</div>
                  }
                  <div className="pf-track-body">
                    <p className="pf-track-title">{track.title}</p>
                    <div className="pf-track-meta">
                      <span className="pf-track-genre">{GENRE_LABEL[track.genre] || track.genre}</span>
                      {track.reviewCount > 0 && (
                        <span className="pf-track-score" style={{ color: scoreColor(track.averageScore) }}>
                          ⭐ {track.averageScore}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === 'followers' && (
          <div className="pf-follow-list">
            {(profile.followers || []).length === 0 ? (
              <div className="empty">Chưa có follower nào</div>
            ) : (profile.followers || []).map((f) => (
              <div className="pf-follow-item" key={f._id || f} onClick={() => navigate(`/dashboard/profile/${f._id || f}`)}>
                <div className="pf-follow-avatar">{f.name?.[0]?.toUpperCase() || '?'}</div>
                <span className="pf-follow-name">{f.name || 'Người dùng'}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'following' && (
          <div className="pf-follow-list">
            {(profile.following || []).length === 0 ? (
              <div className="empty">Chưa follow ai</div>
            ) : (profile.following || []).map((f) => (
              <div className="pf-follow-item" key={f._id || f} onClick={() => navigate(`/dashboard/profile/${f._id || f}`)}>
                <div className="pf-follow-avatar">{f.name?.[0]?.toUpperCase() || '?'}</div>
                <span className="pf-follow-name">{f.name || 'Người dùng'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Report Modal */}
      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="user"
        targetId={id}
        targetName={profile.name}
      />
    </>
  );
}
