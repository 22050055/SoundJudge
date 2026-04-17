import { useState } from 'react';
import api from '../../api/axiosConfig';

const REASONS = [
  { value: 'spam',          label: '🚫 Spam / Quảng cáo' },
  { value: 'inappropriate', label: '🔞 Nội dung không phù hợp' },
  { value: 'copyright',     label: '©️ Vi phạm bản quyền' },
  { value: 'hate',          label: '💢 Lời lẽ thù địch / Xúc phạm' },
  { value: 'other',         label: '❓ Lý do khác' },
];

/**
 * ReportModal — Modal báo cáo vi phạm dùng chung cho Track / Review / User
 *
 * Props:
 *   isOpen       {boolean}  — hiển thị hay không
 *   onClose      {function} — callback đóng modal
 *   targetType   {string}   — 'track' | 'review' | 'user'
 *   targetId     {string}   — ID của đối tượng bị báo cáo
 *   targetName   {string}   — Tên hiển thị (để show trong modal)
 */
export default function ReportModal({ isOpen, onClose, targetType, targetId, targetName }) {
  const [reason,      setReason]      = useState('');
  const [description, setDescription] = useState('');
  const [loading,     setLoading]     = useState(false);
  const [success,     setSuccess]     = useState(false);
  const [error,       setError]       = useState('');

  if (!isOpen) return null;

  const urlMap = {
    track:  `/tracks/${targetId}/report`,
    review: `/reviews/${targetId}/report`,
    user:   `/users/${targetId}/report`,
  };

  const labelMap = {
    track:  'bài nhạc',
    review: 'đánh giá',
    user:   'người dùng',
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason) { setError('Vui lòng chọn lý do báo cáo'); return; }
    setLoading(true);
    setError('');
    try {
      await api.post(urlMap[targetType], { reason, description });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra, thử lại sau');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setReason(''); setDescription(''); setSuccess(false); setError('');
    onClose();
  };

  return (
    <>
      <style>{`
        .report-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          padding: 1rem;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .report-modal {
          background: #111827; border: 1px solid #1f2937;
          border-radius: 16px; width: 100%; max-width: 480px;
          padding: 2rem; position: relative;
          animation: slideUp 0.25s ease;
        }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: none; opacity: 1; } }
        .report-modal h3 {
          font-size: 1.2rem; font-weight: 700; color: #f9fafb;
          margin: 0 0 0.5rem;
        }
        .report-modal p.sub {
          font-size: 0.85rem; color: #6b7280; margin: 0 0 1.5rem;
        }
        .report-modal .close-btn {
          position: absolute; top: 1rem; right: 1rem;
          background: none; border: none; color: #6b7280;
          font-size: 1.4rem; cursor: pointer; line-height: 1;
          transition: color 0.2s;
        }
        .report-modal .close-btn:hover { color: #f9fafb; }
        .report-reasons { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
        .reason-option {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.75rem 1rem; border-radius: 10px;
          border: 1.5px solid #1f2937; cursor: pointer;
          transition: all 0.15s;
        }
        .reason-option:hover { border-color: #374151; background: #1f2937; }
        .reason-option.selected { border-color: #ef4444; background: rgba(239,68,68,0.08); }
        .reason-option input[type=radio] { display: none; }
        .reason-option span { font-size: 0.9rem; color: #d1d5db; }
        .report-desc textarea {
          width: 100%; background: #1f2937; border: 1.5px solid #374151;
          border-radius: 10px; color: #f9fafb; font-size: 0.9rem;
          padding: 0.75rem; resize: vertical; min-height: 80px;
          font-family: inherit; outline: none; box-sizing: border-box;
          transition: border-color 0.2s;
        }
        .report-desc textarea:focus { border-color: #4b5563; }
        .report-desc label { font-size: 0.82rem; color: #6b7280; margin-bottom: 0.4rem; display: block; }
        .report-actions { display: flex; gap: 0.75rem; margin-top: 1.25rem; }
        .btn-cancel {
          flex: 1; padding: 0.75rem; border-radius: 10px;
          border: 1.5px solid #374151; background: none;
          color: #9ca3af; font-size: 0.9rem; cursor: pointer;
          transition: all 0.2s;
        }
        .btn-cancel:hover { border-color: #6b7280; color: #f9fafb; }
        .btn-submit {
          flex: 2; padding: 0.75rem; border-radius: 10px;
          border: none; background: #ef4444;
          color: #fff; font-size: 0.9rem; font-weight: 600;
          cursor: pointer; transition: all 0.2s;
        }
        .btn-submit:hover:not(:disabled) { background: #dc2626; }
        .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .report-error { color: #ef4444; font-size: 0.82rem; margin-top: 0.5rem; }
        .report-success { text-align: center; padding: 1rem 0; }
        .report-success .check { font-size: 3rem; margin-bottom: 0.5rem; }
        .report-success h4 { color: #f9fafb; margin: 0 0 0.5rem; }
        .report-success p { color: #6b7280; font-size: 0.85rem; margin: 0 0 1.5rem; }
      `}</style>

      <div className="report-overlay" onClick={handleClose}>
        <div className="report-modal" onClick={(e) => e.stopPropagation()}>
          <button className="close-btn" onClick={handleClose}>×</button>

          {success ? (
            <div className="report-success">
              <div className="check">✅</div>
              <h4>Đã gửi báo cáo!</h4>
              <p>Cảm ơn bạn. Chúng tôi sẽ xem xét trong thời gian sớm nhất.</p>
              <button className="btn-submit" onClick={handleClose} style={{ width: '100%' }}>Đóng</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h3>🚨 Báo cáo {labelMap[targetType]}</h3>
              <p className="sub">
                {targetName ? `"${targetName}"` : 'Đối tượng này'} sẽ được gửi đến bộ phận kiểm duyệt.
              </p>

              <div className="report-reasons">
                {REASONS.map((r) => (
                  <label
                    key={r.value}
                    className={`reason-option${reason === r.value ? ' selected' : ''}`}
                  >
                    <input
                      type="radio"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={() => setReason(r.value)}
                    />
                    <span>{r.label}</span>
                  </label>
                ))}
              </div>

              <div className="report-desc">
                <label>Mô tả thêm (tùy chọn)</label>
                <textarea
                  placeholder="Cho chúng tôi biết thêm chi tiết..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                />
              </div>

              {error && <div className="report-error">{error}</div>}

              <div className="report-actions">
                <button type="button" className="btn-cancel" onClick={handleClose}>Hủy</button>
                <button type="submit" className="btn-submit" disabled={loading || !reason}>
                  {loading ? 'Đang gửi...' : 'Gửi báo cáo'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
