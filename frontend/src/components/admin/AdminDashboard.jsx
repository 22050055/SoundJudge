import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axiosConfig';

// ─── Helpers ──────────────────────────────────────────────────
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '';
const scoreColor = (s) => s >= 8 ? '#34d399' : s >= 6 ? '#e2c97e' : s >= 4 ? '#f97316' : '#ef4444';

const REPORT_REASONS = { spam: 'Spam', inappropriate: 'Không phù hợp', copyright: 'Bản quyền', hate: 'Thù địch', other: 'Khác' };

// ─── Stat Card ────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, accent }) {
  return (
    <div style={{
      background: '#111827', border: `1px solid ${accent || '#1f2937'}`,
      borderRadius: 16, padding: '1.5rem', minWidth: 0,
    }}>
      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{icon}</div>
      <div style={{ fontSize: '2rem', fontWeight: 800, color: accent || '#f9fafb' }}>{value}</div>
      <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '0.25rem' }}>{label}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: '#4b5563', marginTop: '0.25rem' }}>{sub}</div>}
    </div>
  );
}

// ─── AdminDashboard ────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate        = useNavigate();
  const [activeTab,     setActiveTab]     = useState('stats');
  const [stats,         setStats]         = useState(null);
  const [users,         setUsers]         = useState([]);
  const [tracks,        setTracks]        = useState([]);
  const [reviews,       setReviews]       = useState([]);
  const [reports,       setReports]       = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [editUserModal, setEditUserModal] = useState(null);
  const [reportFilter,  setReportFilter]  = useState('all');

  // Load data based on active tab
  const loadStats   = useCallback(async () => { try { const r = await api.get('/admin/stats');   setStats(r.data); } catch {} }, []);
  const loadUsers   = useCallback(async () => { try { const r = await api.get('/admin/users');   setUsers(r.data.users || []); } catch {} }, []);
  const loadTracks  = useCallback(async () => { try { const r = await api.get('/admin/tracks');  setTracks(r.data.tracks || []); } catch {} }, []);
  const loadReviews = useCallback(async () => { try { const r = await api.get('/admin/reviews'); setReviews(r.data.reviews || []); } catch {} }, []);
  const loadReports = useCallback(async (type) => {
    try {
      const params = { status: 'pending' };
      if (type && type !== 'all') params.targetType = type;
      const r = await api.get('/admin/reports', { params });
      setReports(r.data.reports || []);
    } catch {}
  }, []);

  useEffect(() => {
    setLoading(true);
    const loaders = { stats: loadStats, users: loadUsers, tracks: loadTracks, reviews: loadReviews, reports: loadReports };
    loaders[activeTab]?.().finally(() => setLoading(false));
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'reports') loadReports(reportFilter);
  }, [reportFilter]);

  // Actions
  const handleToggleUser = async (userId) => {
    try {
      const r = await api.patch(`/admin/users/${userId}/toggle`);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, isActive: r.data.user.isActive } : u));
    } catch (e) { alert(e.response?.data?.message || 'Lỗi'); }
  };

  const handleDeleteUser = async (userId, name) => {
    if (!window.confirm(`Xóa tài khoản "${name}"? Thao tác không thể hoàn tác!`)) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (e) { alert(e.response?.data?.message || 'Lỗi'); }
  };

  const handleDeleteTrack = async (trackId, title) => {
    if (!window.confirm(`Xóa bài nhạc "${title}"?`)) return;
    try {
      await api.delete(`/admin/tracks/${trackId}`);
      setTracks((prev) => prev.filter((t) => t._id !== trackId));
    } catch (e) { alert(e.response?.data?.message || 'Lỗi'); }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Xóa đánh giá này?')) return;
    try {
      await api.delete(`/admin/reviews/${reviewId}`);
      setReviews((prev) => prev.filter((r) => r._id !== reviewId));
    } catch (e) { alert(e.response?.data?.message || 'Lỗi'); }
  };

  const handleResolveReport = async (reportId, action) => {
    try {
      await api.patch(`/admin/reports/${reportId}/resolve`, { action });
      setReports((prev) => prev.filter((r) => r._id !== reportId));
    } catch (e) { alert(e.response?.data?.message || 'Lỗi'); }
  };

  const handleUpdateUser = async (userId, updates) => {
    try {
      const r = await api.patch(`/admin/users/${userId}`, updates);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, ...r.data.user } : u));
      setEditUserModal(null);
    } catch (e) { alert(e.response?.data?.message || 'Lỗi'); }
  };

  return (
    <>
      <style>{`
        .ad-wrap { max-width: 1200px; margin: 0 auto; padding: 2rem 1.5rem; }
        .ad-header { margin-bottom: 2rem; }
        .ad-header h1 { font-size: 1.8rem; font-weight: 800; color: #f9fafb; margin: 0 0 0.25rem; }
        .ad-header p { color: #6b7280; font-size: 0.88rem; margin: 0; }

        .ad-tabs { display: flex; gap: 0.4rem; margin-bottom: 2rem; flex-wrap: wrap; }
        .ad-tab {
          padding: 0.6rem 1.1rem; border-radius: 10px; border: 1.5px solid #1f2937;
          font-size: 0.85rem; font-weight: 600; cursor: pointer;
          color: #6b7280; background: none; transition: all 0.15s;
        }
        .ad-tab:hover { color: #d1d5db; border-color: #374151; }
        .ad-tab.active { background: #1f2937; color: #f9fafb; border-color: #374151; }

        /* Stats grid */
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }

        /* Table */
        .ad-table-wrap { overflow-x: auto; }
        .ad-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
        .ad-table th { text-align: left; padding: 0.75rem 1rem; color: #6b7280; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; border-bottom: 1px solid #1f2937; }
        .ad-table td { padding: 0.75rem 1rem; color: #d1d5db; border-bottom: 1px solid #111827; vertical-align: middle; }
        .ad-table tr:hover td { background: #111827; }

        .badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 6px; font-size: 0.72rem; font-weight: 600; }
        .badge.active   { background: rgba(52,211,153,0.1); color: #34d399; }
        .badge.inactive { background: rgba(239,68,68,0.1);  color: #ef4444; }
        .badge.admin    { background: rgba(226,201,126,0.1); color: #e2c97e; }
        .badge.user     { background: rgba(139,92,246,0.1);  color: #a78bfa; }
        .badge.pub      { background: rgba(52,211,153,0.1);  color: #34d399; }
        .badge.removed  { background: rgba(239,68,68,0.1);   color: #ef4444; }

        .btn-sm {
          padding: 0.3rem 0.65rem; border-radius: 6px; border: 1px solid #374151;
          background: none; color: #9ca3af; font-size: 0.75rem; cursor: pointer;
          transition: all 0.15s; margin-right: 0.3rem; white-space: nowrap;
        }
        .btn-sm:hover                 { color: #f9fafb; border-color: #6b7280; }
        .btn-sm.danger:hover          { color: #ef4444; border-color: #ef4444; }
        .btn-sm.success:hover         { color: #34d399; border-color: #34d399; }
        .btn-sm.warn:hover            { color: #f97316; border-color: #f97316; }

        .rep-filter { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
        .rep-filter-btn {
          padding: 0.4rem 0.85rem; border-radius: 8px; border: 1.5px solid #1f2937;
          background: none; color: #6b7280; font-size: 0.8rem; cursor: pointer; transition: all 0.15s;
        }
        .rep-filter-btn.active { border-color: #e2c97e; color: #e2c97e; background: rgba(226,201,126,0.06); }

        .loading { padding: 3rem; text-align: center; color: #4b5563; }
        .empty   { padding: 3rem; text-align: center; color: #4b5563; }

        .user-avatar {
          width: 34px; height: 34px; border-radius: 50%;
          background: linear-gradient(135deg, #e2c97e, #c8a84b);
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 0.9rem; color: #0a0a0f; font-weight: 700; margin-right: 0.5rem;
          overflow: hidden; vertical-align: middle; flex-shrink: 0;
        }
        .user-avatar img { width: 100%; height: 100%; object-fit: cover; }

        .chart-mini { display: flex; gap: 0.25rem; align-items: flex-end; height: 48px; margin-top: 0.75rem; }
        .chart-mini-bar { flex: 1; background: rgba(226,201,126,0.25); border-radius: 3px 3px 0 0; min-height: 2px; }

        /* Edit modal */
        .modal-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center; padding: 1rem;
        }
        .modal-box {
          background: #111827; border: 1px solid #1f2937; border-radius: 16px;
          width: 100%; max-width: 440px; padding: 2rem; position: relative;
        }
        .modal-box h3 { font-size: 1.1rem; color: #f9fafb; margin: 0 0 1.25rem; }
        .modal-field { margin-bottom: 1rem; }
        .modal-label { font-size: 0.78rem; color: #6b7280; margin-bottom: 0.3rem; display: block; text-transform: uppercase; letter-spacing: 0.05em; }
        .modal-input, .modal-select {
          width: 100%; background: #1f2937; border: 1.5px solid #374151; border-radius: 10px;
          color: #f9fafb; font-size: 0.88rem; padding: 0.6rem 0.85rem; outline: none;
          font-family: inherit; box-sizing: border-box; transition: border-color 0.2s;
        }
        .modal-input:focus, .modal-select:focus { border-color: #4b5563; }
        .modal-actions { display: flex; gap: 0.75rem; margin-top: 1.5rem; }
        .modal-cancel { flex: 1; padding: 0.7rem; background: none; border: 1.5px solid #374151; color: #9ca3af; border-radius: 10px; cursor: pointer; font-size: 0.88rem; }
        .modal-save   { flex: 2; padding: 0.7rem; background: #e2c97e; border: none; color: #0a0a0f; font-weight: 700; border-radius: 10px; cursor: pointer; font-size: 0.88rem; }
      `}</style>

      <div className="ad-wrap">
        <div className="ad-header">
          <h1>⚙️ Admin Dashboard</h1>
          <p>Quản lý và kiểm soát toàn bộ hệ thống SoundJudge</p>
        </div>

        {/* Tab Navigation */}
        <div className="ad-tabs">
          {[
            { id: 'stats',   label: '📊 Thống kê' },
            { id: 'tracks',  label: '🎵 Quản lý Track' },
            { id: 'reviews', label: '💬 Quản lý Review' },
            { id: 'reports', label: `🚨 Báo cáo ${stats?.stats?.pendingReports > 0 ? `(${stats.stats.pendingReports})` : ''}` },
            { id: 'users',   label: '👥 Quản lý User' },
          ].map((t) => (
            <button key={t.id} className={`ad-tab${activeTab === t.id ? ' active' : ''}`} onClick={() => setActiveTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {loading && <div className="loading">Đang tải...</div>}

        {/* ── TAB: THỐNG KÊ ─────────────────────────────────── */}
        {!loading && activeTab === 'stats' && stats && (
          <>
            <div className="stats-grid">
              <StatCard icon="👥" label="Tổng người dùng"  value={stats.stats.totalUsers}   accent="#a78bfa" sub={`User: ${stats.usersByRole?.user || 0} | Admin: ${stats.usersByRole?.admin || 0}`} />
              <StatCard icon="🎵" label="Tổng bài nhạc"   value={stats.stats.totalTracks}  accent="#e2c97e" sub={`Published: ${stats.tracksByStatus?.published || 0} | Removed: ${stats.tracksByStatus?.removed || 0}`} />
              <StatCard icon="✍️" label="Tổng đánh giá"   value={stats.stats.totalReviews} accent="#34d399" />
              <StatCard icon="🚨" label="Báo cáo chờ xử lý" value={stats.stats.pendingReports} accent="#ef4444" />
            </div>

            {/* Mini chart: track uploads 7 ngày */}
            {stats.charts?.recentTracks?.length > 0 && (
              <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 16, padding: '1.5rem', marginBottom: '1rem' }}>
                <h3 style={{ color: '#f9fafb', margin: '0 0 0.25rem', fontSize: '0.95rem' }}>📈 Track upload 7 ngày gần nhất</h3>
                <div className="chart-mini">
                  {stats.charts.recentTracks.map((d, i) => {
                    const max = Math.max(...stats.charts.recentTracks.map((x) => x.count), 1);
                    return (
                      <div
                        key={i}
                        className="chart-mini-bar"
                        style={{ height: `${(d.count / max) * 100}%`, background: '#e2c97e', opacity: 0.4 + (i / stats.charts.recentTracks.length) * 0.6 }}
                        title={`${d._id}: ${d.count} tracks`}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── TAB: QUẢN LÝ TRACK ────────────────────────────── */}
        {!loading && activeTab === 'tracks' && (
          tracks.length === 0 ? <div className="empty">Chưa có bài nhạc nào</div> : (
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead>
                  <tr>
                    <th>Bài nhạc</th><th>Artist</th><th>Thể loại</th>
                    <th>Điểm TB</th><th>Báo cáo</th><th>Ngày</th><th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {tracks.map((track) => (
                    <tr key={track._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {track.coverUrl
                            ? <img src={track.coverUrl} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }} />
                            : <div style={{ width: 36, height: 36, borderRadius: 6, background: '#1f2937', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🎵</div>
                          }
                          <span style={{ fontWeight: 600, color: '#f9fafb' }}>{track.title}</span>
                        </div>
                      </td>
                      <td>{track.artist?.name || '—'}</td>
                      <td>{track.genre}</td>
                      <td style={{ color: scoreColor(track.averageScore), fontWeight: 700 }}>{track.averageScore || '—'}</td>
                      <td>
                        {track.reportCount > 0
                          ? <span style={{ color: '#ef4444', fontWeight: 700 }}>{track.reportCount}</span>
                          : '0'
                        }
                      </td>
                      <td style={{ color: '#6b7280' }}>{fmtDate(track.createdAt)}</td>
                      <td>
                        <button className="btn-sm" onClick={() => navigate(`/dashboard/track/${track._id}`)}>Xem</button>
                        <button className="btn-sm danger" onClick={() => handleDeleteTrack(track._id, track.title)}>🗑️ Xóa</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* ── TAB: QUẢN LÝ REVIEW ───────────────────────────── */}
        {!loading && activeTab === 'reviews' && (
          reviews.length === 0 ? <div className="empty">Chưa có đánh giá nào</div> : (
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead>
                  <tr>
                    <th>Bài nhạc</th><th>Reviewer</th><th>Điểm</th>
                    <th>Báo cáo</th><th>Ngày</th><th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((review) => (
                    <tr key={review._id}>
                      <td style={{ fontWeight: 600, color: '#f9fafb' }}>{review.track?.title || '—'}</td>
                      <td>{review.reviewer?.name || '—'}</td>
                      <td style={{ color: scoreColor(review.overallScore), fontWeight: 700 }}>{review.overallScore}</td>
                      <td>
                        {review.reportCount > 0
                          ? <span style={{ color: '#ef4444', fontWeight: 700 }}>{review.reportCount}</span>
                          : '0'
                        }
                      </td>
                      <td style={{ color: '#6b7280' }}>{fmtDate(review.createdAt)}</td>
                      <td>
                        <button className="btn-sm danger" onClick={() => handleDeleteReview(review._id)}>🗑️ Xóa</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* ── TAB: BÁO CÁO ──────────────────────────────────── */}
        {!loading && activeTab === 'reports' && (
          <>
            <div className="rep-filter">
              {[
                { id: 'all',    label: '🔍 Tất cả' },
                { id: 'track',  label: '🎵 Track' },
                { id: 'review', label: '💬 Review' },
                { id: 'user',   label: '👤 User' },
              ].map((f) => (
                <button key={f.id} className={`rep-filter-btn${reportFilter === f.id ? ' active' : ''}`}
                  onClick={() => setReportFilter(f.id)}>{f.label}</button>
              ))}
            </div>

            {reports.length === 0 ? (
              <div className="empty">✅ Không có báo cáo nào đang chờ xử lý</div>
            ) : (
              <div className="ad-table-wrap">
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th>Loại</th><th>Đối tượng</th><th>Người báo cáo</th>
                      <th>Lý do</th><th>Ngày</th><th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report) => (
                      <tr key={report._id}>
                        <td>
                          <span className={`badge ${report.targetType}`} style={{
                            background: report.targetType === 'track' ? 'rgba(226,201,126,0.1)' : report.targetType === 'review' ? 'rgba(139,92,246,0.1)' : 'rgba(59,130,246,0.1)',
                            color: report.targetType === 'track' ? '#e2c97e' : report.targetType === 'review' ? '#a78bfa' : '#60a5fa',
                          }}>
                            {report.targetType === 'track' ? '🎵 Track' : report.targetType === 'review' ? '💬 Review' : '👤 User'}
                          </span>
                        </td>
                        <td style={{ color: '#f9fafb', maxWidth: 180 }}>
                          {report.targetId?.title || report.targetId?.name || report.targetId?.comment?.slice(0, 40) || '—'}
                        </td>
                        <td>{report.reportedBy?.name || '—'}</td>
                        <td>{REPORT_REASONS[report.reason] || report.reason}</td>
                        <td style={{ color: '#6b7280' }}>{fmtDate(report.createdAt)}</td>
                        <td>
                          <button className="btn-sm success" onClick={() => handleResolveReport(report._id, 'resolved')}>✅ Xử lý</button>
                          <button className="btn-sm warn"    onClick={() => handleResolveReport(report._id, 'dismissed')}>🚫 Bỏ qua</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── TAB: QUẢN LÝ USER ─────────────────────────────── */}
        {!loading && activeTab === 'users' && (
          users.length === 0 ? <div className="empty">Chưa có người dùng</div> : (
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead>
                  <tr>
                    <th>Người dùng</th><th>Role</th><th>Track</th>
                    <th>Follower</th><th>Trạng thái</th><th>Ngày tạo</th><th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div className="user-avatar">
                            {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : user.name?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#f9fafb' }}>{user.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className={`badge ${user.role}`}>{user.role}</span></td>
                      <td>{user.totalTracks || 0}</td>
                      <td>{user.followersCount || 0}</td>
                      <td><span className={`badge ${user.isActive ? 'active' : 'inactive'}`}>{user.isActive ? 'Hoạt động' : 'Bị khóa'}</span></td>
                      <td style={{ color: '#6b7280' }}>{fmtDate(user.createdAt)}</td>
                      <td>
                        <button className="btn-sm" onClick={() => setEditUserModal(user)}>✏️ Sửa</button>
                        <button className="btn-sm warn" onClick={() => handleToggleUser(user.id)}>
                          {user.isActive ? '🔒 Khóa' : '🔓 Mở'}
                        </button>
                        <button className="btn-sm danger" onClick={() => handleDeleteUser(user.id, user.name)}>🗑️ Xóa</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Edit User Modal */}
      {editUserModal && (
        <EditUserModal
          user={editUserModal}
          onSave={handleUpdateUser}
          onClose={() => setEditUserModal(null)}
        />
      )}
    </>
  );
}

// ─── Edit User Modal ───────────────────────────────────────────
function EditUserModal({ user, onSave, onClose }) {
  const [name,     setName]     = useState(user.name     || '');
  const [bio,      setBio]      = useState(user.bio      || '');
  const [role,     setRole]     = useState(user.role     || 'user');
  const [isActive, setIsActive] = useState(user.isActive !== false);

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h3>✏️ Chỉnh sửa tài khoản</h3>
        <div className="modal-field">
          <label className="modal-label">Tên</label>
          <input className="modal-input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="modal-field">
          <label className="modal-label">Bio</label>
          <input className="modal-input" value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>
        <div className="modal-field">
          <label className="modal-label">Role</label>
          <select className="modal-select" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
        </div>
        <div className="modal-field">
          <label className="modal-label">Trạng thái</label>
          <select className="modal-select" value={isActive ? 'true' : 'false'} onChange={(e) => setIsActive(e.target.value === 'true')}>
            <option value="true">Hoạt động</option>
            <option value="false">Bị khóa</option>
          </select>
        </div>
        <div className="modal-actions">
          <button className="modal-cancel" onClick={onClose}>Hủy</button>
          <button className="modal-save" onClick={() => onSave(user.id, { name, bio, role, isActive })}>Lưu</button>
        </div>
      </div>
    </div>
  );
}
