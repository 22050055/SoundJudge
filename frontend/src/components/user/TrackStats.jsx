/**
 * TrackStats.jsx
 * Báo cáo chi tiết một bài nhạc — radar chart SVG, điểm tiêu chí, danh sách reviewer.
 * API: GET /api/tracks/:id/stats
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api, { extractErrorMessage } from '../../api/axiosConfig';
import RatingForm from '../common/RatingForm';
import MusicPlayer from '../common/MusicPlayer';
import ReportModal from '../common/ReportModal';

// ─── Constants ────────────────────────────────────────────────

const CRITERIA = [
  { key: 'melody',     label: 'Giai điệu',  icon: '🎵' },
  { key: 'lyrics',     label: 'Lời nhạc',   icon: '✍️' },
  { key: 'harmony',    label: 'Hòa âm',     icon: '🎼' },
  { key: 'rhythm',     label: 'Nhịp điệu',  icon: '🥁' },
  { key: 'production', label: 'Sản xuất',   icon: '🎛️' },
];

const STATUS_CONFIG = {
  pending:   { label: 'Chờ review',  color: '#fbbf24', bg: 'rgba(251,191,36,0.1)'  },
  reviewing: { label: 'Đang review', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)'  },
  completed: { label: 'Hoàn tất',    color: '#34d399', bg: 'rgba(52,211,153,0.1)'  },
};

const SCORE_LABELS = [
  { min: 9,   label: 'Xuất sắc',    color: '#34d399' },
  { min: 7.5, label: 'Tốt',         color: '#6ee7b7' },
  { min: 6,   label: 'Khá',         color: '#e2c97e' },
  { min: 4,   label: 'Trung bình',  color: '#fbbf24' },
  { min: 0,   label: 'Cần cải thiện', color: '#f87171' },
];

const getScoreLabel = (score) =>
  SCORE_LABELS.find(l => score >= l.min) || SCORE_LABELS[SCORE_LABELS.length - 1];

const fmtDate = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' });
};

// ─── CSS ──────────────────────────────────────────────────────

const CSS = `
.ts-root {
  min-height: 100vh; background: #0a0a0f;
  font-family: 'DM Sans', sans-serif; color: #e2e8f0;
  padding: 2.5rem 2rem 5rem;
}
.ts-back {
  display: inline-flex; align-items: center; gap: 0.4rem;
  font-size: 0.8rem; color: #4b5563; text-decoration: none;
  margin-bottom: 2rem; transition: color 0.15s;
}
.ts-back:hover { color: #e2c97e; }

.ts-hero {
  display: flex; gap: 1.5rem; align-items: flex-start;
  background: #111118; border: 1px solid rgba(255,255,255,0.06);
  border-radius: 20px; padding: 1.5rem; margin-bottom: 2rem;
  animation: tsIn 0.35s cubic-bezier(0.22,1,0.36,1);
}
@keyframes tsIn { from{opacity:0;transform:translateY(10px);} to{opacity:1;transform:translateY(0);} }

.ts-hero-cover {
  width: 110px; height: 110px; border-radius: 14px;
  object-fit: cover; flex-shrink: 0;
  background: linear-gradient(135deg,#16161f,#1f1f2e);
  display: flex; align-items: center; justify-content: center;
  font-size: 2.5rem; color: #374151; overflow: hidden;
}
.ts-hero-cover img { width:100%; height:100%; object-fit:cover; }

.ts-hero-info { flex: 1; min-width: 0; }
.ts-hero-title {
  font-family: 'Playfair Display', serif; font-size: clamp(1.2rem, 2.5vw, 1.7rem);
  color: #e2e8f0; margin-bottom: 0.4rem;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.ts-hero-meta {
  display: flex; align-items: center; gap: 0.6rem;
  flex-wrap: wrap; margin-bottom: 0.75rem;
}
.ts-genre-badge {
  font-size: 0.7rem; padding: 0.18rem 0.55rem; border-radius: 6px;
  background: rgba(255,255,255,0.05); color: #6b7280;
  text-transform: uppercase; letter-spacing: 0.06em;
}
.ts-status-badge {
  display: inline-flex; align-items: center; gap: 0.3rem;
  font-size: 0.7rem; font-weight: 600; padding: 0.2rem 0.6rem; border-radius: 20px;
}

.ts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem; }
@media(max-width:768px){ .ts-grid { grid-template-columns:1fr; } }

.ts-panel {
  background: #111118; border: 1px solid rgba(255,255,255,0.06);
  border-radius: 18px; padding: 1.5rem; animation: tsIn 0.4s cubic-bezier(0.22,1,0.36,1) both;
}
.ts-panel-title {
  font-size: 0.72rem; font-weight: 600; letter-spacing: 0.1em;
  text-transform: uppercase; color: #4b5563; margin-bottom: 1.25rem;
  display: flex; align-items: center; gap: 0.5rem;
}
.ts-panel-title::after { content:''; flex:1; height:1px; background:rgba(255,255,255,0.04); }

.ts-score-row { display: flex; flex-direction: column; gap: 0.3rem; margin-bottom: 0.85rem; }
.ts-score-track { height: 6px; background: rgba(255,255,255,0.06); border-radius: 4px; overflow: hidden; }
.ts-score-fill { height: 100%; border-radius: 4px; transition: width 1s cubic-bezier(0.34,1.56,0.64,1); }

.ts-reviews-section {
  background: #111118; border: 1px solid rgba(255,255,255,0.06);
  border-radius: 18px; padding: 1.5rem; animation: tsIn 0.5s cubic-bezier(0.22,1,0.36,1) both;
}
.ts-reviews-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1rem; }

.ts-review-card {
  background: #0d0d14; border: 1px solid rgba(255,255,255,0.05);
  border-radius: 14px; padding: 1.2rem; position: relative;
  transition: border-color 0.2s; animation: tsIn 0.3s cubic-bezier(0.22,1,0.36,1) both;
}
.ts-review-card:hover { border-color: rgba(226,201,126,0.1); }

.ts-report-btn {
  position: absolute; top: 1rem; right: 1rem;
  background: none; border: none; color: #374151;
  font-size: 0.85rem; cursor: pointer; transition: color 0.2s;
}
.ts-report-btn:hover { color: #f87171; }

.ts-fav-btn {
  display: inline-flex; align-items: center; gap: 0.5rem;
  padding: 0.5rem 1rem; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.03); color: #9ca3af;
  font-size: 0.85rem; cursor: pointer; transition: all 0.2s;
}
.ts-fav-btn:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.2); }
.ts-fav-btn.active { color: #ef4444; border-color: rgba(239,68,68,0.3); background: rgba(239,68,68,0.05); }

.ts-skel-block {
  border-radius: 18px; background: linear-gradient(90deg,#16161f 25%,#1f1f2e 50%,#16161f 75%);
  background-size: 200% 100%; animation: shimmer 1.4s ease-in-out infinite;
}
@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
`;

// ─── SVG Radar Chart ──────────────────────────────────────────

function RadarChart({ scores, size = 220 }) {
  const cx = size / 2, cy = size / 2, radius = (size / 2) * 0.72;
  const n = CRITERIA.length, MAX = 10;
  const angleStep = (2 * Math.PI) / n, startAngle = -Math.PI / 2;

  const polygonPoints = (scale) => CRITERIA.map((_, i) => {
    const angle = startAngle + i * angleStep;
    const r = radius * scale;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  });

  const axisPoints = CRITERIA.map((_, i) => {
    const angle = startAngle + i * angleStep;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  });

  const scorePoints = CRITERIA.map(({ key }, i) => {
    const val = scores?.[key] || 0;
    const scale = val / MAX;
    const angle = startAngle + i * angleStep;
    return [cx + radius * scale * Math.cos(angle), cy + radius * scale * Math.sin(angle)];
  });

  const toPath = (pts) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ') + ' Z';
  const hasScores = scores && Object.values(scores).some(v => v > 0);

  return (
    <svg width={size + 60} height={size + 60} viewBox={`-30 -30 ${size+60} ${size+60}`}>
      {[0.25, 0.5, 0.75, 1.0].map((level, li) => (
        <polygon key={li} points={polygonPoints(level).map(p => p.join(',')).join(' ')}
          fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      ))}
      {axisPoints.map(([ax, ay], i) => (
        <line key={i} x1={cx} y1={cy} x2={ax} y2={ay} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      ))}
      {hasScores && (
        <>
          <path d={toPath(scorePoints)} fill="rgba(226,201,126,0.12)" stroke="#e2c97e" strokeWidth="1.5" />
          {scorePoints.map(([px, py], i) => <circle key={i} cx={px} cy={py} r={3} fill="#e2c97e" />)}
        </>
      )}
      {CRITERIA.map(({ label }, i) => {
        const angle = startAngle + i * angleStep;
        const [lx, ly] = [cx + (radius+18) * Math.cos(angle), cy + (radius+18) * Math.sin(angle)];
        return <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fill="#6b7280" fontSize="9">{label}</text>;
      })}
    </svg>
  );
}

// ─── Reviewer Card ──────────────────────────────────────────

function ReviewerCard({ review, onReport, style }) {
  const [expanded, setExpanded] = useState(false);
  const { user } = useAuth();
  const overallInfo = getScoreLabel(review.overallScore || 0);

  return (
    <div className="ts-review-card" style={style}>
      {user && user.id !== review.reviewer?._id && (
        <button className="ts-report-btn" onClick={() => onReport(review)} title="Báo cáo đánh giá">🚩</button>
      )}
      <div className="ts-reviewer-header">
        <div className="ts-reviewer-avatar">
          {review.reviewer?.avatarUrl ? <img src={review.reviewer.avatarUrl} alt="" /> : review.reviewer?.name?.[0]?.toUpperCase()}
        </div>
        <div className="ts-reviewer-info">
          <div className="ts-reviewer-name">{review.reviewer?.name || 'Ẩn danh'}</div>
          <div className="ts-reviewer-rep">{review.reviewer?.reputationScore || 0} pts · {review.reviewer?.totalReviews || 0} reviews</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div className="ts-review-overall" style={{ color: overallInfo.color }}>{(review.overallScore || 0).toFixed(1)}</div>
          <div style={{ fontSize:'0.65rem', color:overallInfo.color, opacity:0.7 }}>{overallInfo.label}</div>
        </div>
      </div>
      <div className="ts-review-comment">
        {expanded ? review.comment : review.comment?.slice(0, 160) + (review.comment?.length > 160 ? '...' : '')}
        {review.comment?.length > 160 && (
          <button onClick={() => setExpanded(!expanded)} style={{ background:'none', border:'none', color:'#e2c97e', cursor:'pointer', fontSize:'0.75rem', marginLeft:'5px' }}>
            {expanded ? 'Thu gọn' : 'Xem thêm'}
          </button>
        )}
      </div>
      <div className="ts-review-date" style={{ marginTop:'0.8rem' }}>{fmtDate(review.createdAt)}</div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────

export default function TrackStats() {
  const { id } = useParams();
  const { user, favorites, toggleFavorite } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get(`/tracks/${id}/stats`);
      setData(res);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (loading) return <div className="ts-root"><style>{CSS}</style><div className="ts-skel-block" style={{height:400}} /></div>;
  if (error || !data) return <div className="ts-root"><style>{CSS}</style><h3>{error || 'Lỗi dữ liệu'}</h3></div>;

  const { track, reviews = [], summary } = data;
  const isLiked = favorites.includes(track?._id);
  const overallLabel = getScoreLabel(summary?.averageScore || 0);

  return (
    <>
      <style>{CSS}</style>
      <div className="ts-root">
        <Link to="/dashboard/home" className="ts-back">← Quay lại Dashboard</Link>

        {/* Hero */}
        <div className="ts-hero">
          <div className="ts-hero-cover">
            {track?.coverUrl ? <img src={track.coverUrl} /> : '♪'}
          </div>
          <div className="ts-hero-info">
            <div className="ts-hero-title">{track?.title}</div>
            <div style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
              bởi <Link to={`/dashboard/profile/${track?.artist?._id}`} style={{ color:'#e2c97e', textDecoration:'none' }}>{track?.artist?.name}</Link>
            </div>
            <div className="ts-hero-meta">
              <span className="ts-genre-badge">{track?.genre}</span>
              <span className="ts-status-badge" style={{ background: STATUS_CONFIG[track?.status]?.bg, color: STATUS_CONFIG[track?.status]?.color }}>
                {STATUS_CONFIG[track?.status]?.label}
              </span>
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button className={`ts-fav-btn ${isLiked ? 'active' : ''}`} onClick={() => toggleFavorite(track._id)}>
                {isLiked ? '❤️ Đã thích' : '🤍 Yêu thích'}
              </button>

              {user && user.id !== track?.artist?._id && !reviews.some(r => r.reviewer?._id === user.id) && (
                <button onClick={() => setShowForm(true)} style={{ padding:'0.5rem 1rem', background:'#e2c97e', border:'none', borderRadius:10, fontWeight:700, cursor:'pointer' }}>
                  ✍️ Viết đánh giá
                </button>
              )}

              <button className="ts-fav-btn" onClick={() => setReportTarget({ type:'track', id:track._id, name:track.title })}>
                🚩 Báo cáo
              </button>
            </div>
          </div>

          {summary?.averageScore > 0 && (
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:'2.5rem', fontWeight:800, color:overallLabel.color, fontFamily:'serif' }}>{summary.averageScore.toFixed(1)}</div>
              <div style={{ fontSize:'0.8rem', color:overallLabel.color, opacity:0.8 }}>{overallLabel.label}</div>
            </div>
          )}
        </div>

        {/* Player */}
        <div style={{ marginBottom:'2rem' }}>
          <MusicPlayer audioUrl={track?.audioUrl} title={track?.title} artist={track?.artist?.name} coverUrl={track?.coverUrl} />
        </div>

        {/* Stats Grid */}
        <div className="ts-grid">
          <div className="ts-panel">
            <div className="ts-panel-title">📡 Phân tích Radar</div>
            <div style={{ display:'flex', justifyContent:'center' }}>
              <RadarChart scores={summary?.scoreBreakdown} />
            </div>
          </div>
          <div className="ts-panel">
            <div className="ts-panel-title">📊 Chi tiết tiêu chí</div>
            {CRITERIA.map(c => (
              <div key={c.key} className="ts-score-row">
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.85rem', marginBottom:4 }}>
                  <span>{c.icon} {c.label}</span>
                  <span style={{ fontWeight:700 }}>{summary?.scoreBreakdown?.[c.key]?.toFixed(1) || '0.0'}</span>
                </div>
                <div className="ts-score-track">
                  <div className="ts-score-fill" style={{ width: `${(summary?.scoreBreakdown?.[c.key] || 0) * 10}%`, background: getScoreLabel(summary?.scoreBreakdown?.[c.key] || 0).color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reviews */}
        <div className="ts-reviews-section">
          <div className="ts-panel-title">💬 Đánh giá từ reviewer ({reviews.length})</div>
          {reviews.length === 0 ? <p style={{ textAlign:'center', color:'#4b5563', padding:20 }}>Chưa có đánh giá nào được duyệt.</p> : (
            <div className="ts-reviews-grid">
              {reviews.map(r => (
                <ReviewerCard key={r._id} review={r} onReport={(rev) => setReportTarget({ type:'review', id:rev._id, name:`Đánh giá của ${rev.reviewer?.name}` })} />
              ))}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:1000, display:'flex', justifyContent:'center', padding:'2rem' }}>
          <div style={{ width:'100%', maxWidth:800, background:'#0a0a0f', borderRadius:20, padding:'1.5rem', position:'relative', height:'fit-content' }}>
            <RatingForm trackId={track._id} onCancel={() => setShowForm(false)} 
              onSubmit={async (p) => { await api.post('/reviews', p); fetchStats(); setShowForm(false); }} />
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
