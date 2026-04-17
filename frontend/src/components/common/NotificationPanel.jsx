import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axiosConfig';

/**
 * NotificationPanel.jsx
 * Hiển thị danh sách thông báo thả xuống từ thanh Navbar.
 */
export default function NotificationPanel({ isOpen, onClose, setUnreadCount }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications || []);
      if (setUnreadCount) setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Đóng khi click ra ngoài
  useEffect(() => {
    const handler = (e) => {
      // Don't close if click is on the notification button itself
      if (panelRef.current && !panelRef.current.contains(e.target) && !e.target.closest('.notif-btn-trigger')) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  const handleMarkAsRead = async (notifId, link) => {
    try {
      await api.patch(`/notifications/${notifId}/read`);
      setNotifications(prev => prev.map(n => n._id === notifId ? { ...n, isRead: true } : n));
      if (setUnreadCount) setUnreadCount(prev => Math.max(0, prev - 1));
      if (link) {
        onClose();
        navigate(link);
      }
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      if (setUnreadCount) setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read', err);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        .notif-panel {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          width: 340px;
          max-height: 480px;
          background: #111118;
          border: 1px solid rgba(226,201,126,0.15);
          border-radius: 16px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.6);
          display: flex;
          flex-direction: column;
          z-index: 1000;
          overflow: hidden;
          animation: notifSlide 0.2s ease-out;
        }
        @keyframes notifSlide {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .notif-header {
          padding: 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .notif-header h3 {
          margin: 0;
          font-size: 0.95rem;
          color: #f9fafb;
          font-family: 'Playfair Display', serif;
        }
        .notif-mark-all {
          background: none;
          border: none;
          color: #e2c97e;
          font-size: 0.72rem;
          cursor: pointer;
          font-weight: 600;
        }
        .notif-mark-all:hover { text-decoration: underline; }

        .notif-list {
          flex: 1;
          overflow-y: auto;
          min-height: 100px;
        }
        .notif-item {
          padding: 0.85rem 1rem;
          display: flex;
          gap: 0.75rem;
          border-bottom: 1px solid rgba(255,255,255,0.03);
          cursor: pointer;
          transition: background 0.2s;
          text-decoration: none;
          color: inherit;
        }
        .notif-item:hover { background: rgba(255,255,255,0.03); }
        .notif-item.unread { background: rgba(226,201,126,0.04); }

        .notif-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #1f1f2e;
          flex-shrink: 0;
          object-fit: cover;
          border: 1.5px solid rgba(226,201,126,0.2);
        }

        .notif-content { flex: 1; min-width: 0; }
        .notif-msg {
          font-size: 0.82rem;
          color: #d1d5db;
          line-height: 1.4;
          margin-bottom: 0.3rem;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .notif-time {
          font-size: 0.7rem;
          color: #4b5563;
        }
        .notif-dot {
          width: 8px;
          height: 8px;
          background: #e2c97e;
          border-radius: 50%;
          align-self: center;
          flex-shrink: 0;
          box-shadow: 0 0 10px rgba(226,201,126,0.3);
        }

        .notif-empty {
          padding: 3rem 1rem;
          text-align: center;
          color: #4b5563;
        }
        .notif-empty-icon { font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.2; }

        /* Custom Scrollbar */
        .notif-list::-webkit-scrollbar { width: 4px; }
        .notif-list::-webkit-scrollbar-track { background: transparent; }
        .notif-list::-webkit-scrollbar-thumb { background: rgba(226,201,126,0.2); border-radius: 4px; }
      `}</style>

      <div className="notif-panel" ref={panelRef}>
        <div className="notif-header">
          <h3>Thông báo</h3>
          <button className="notif-mark-all" onClick={handleMarkAllRead}>
            Đánh dấu tất cả đã đọc
          </button>
        </div>

        <div className="notif-list">
          {loading && (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: '#6b7280', fontSize: '0.8rem' }}>
              Đang tải...
            </div>
          )}

          {!loading && notifications.length === 0 && (
            <div className="notif-empty">
              <div className="notif-empty-icon">🔔</div>
              <div>Bạn chưa có thông báo nào</div>
            </div>
          )}

          {notifications.map((n) => (
            <div 
              key={n._id} 
              className={`notif-item ${!n.isRead ? 'unread' : ''}`}
              onClick={() => handleMarkAsRead(n._id, n.link)}
            >
              {n.sender?.avatarUrl ? (
                <img src={n.sender.avatarUrl} alt="" className="notif-avatar" />
              ) : (
                <div className="notif-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', color: '#e2c97e', fontWeight: 700 }}>
                  {n.sender?.name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <div className="notif-content">
                <div className="notif-msg">{n.message}</div>
                <div className="notif-time">
                  {new Date(n.createdAt).toLocaleDateString('vi-VN', { 
                    hour: '2-digit', minute: '2-digit',
                    day: '2-digit', month: '2-digit'
                  })}
                </div>
              </div>
              {!n.isRead && <div className="notif-dot"></div>}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
