/**
 * ErrorBoundary.jsx
 * Bắt lỗi runtime (kể cả từ extension trình duyệt) tránh crash toàn app.
 */
import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#0a0a0f',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          fontFamily: "'DM Sans', sans-serif",
          color: '#e2e8f0',
          padding: '2rem',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '3rem', opacity: 0.3 }}>⚠</div>
          <h2 style={{ fontFamily: 'serif', color: '#e2c97e', margin: 0 }}>
            Có lỗi xảy ra
          </h2>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', maxWidth: 360 }}>
            Trang gặp sự cố. Thường do extension trình duyệt can thiệp.
            Thử tắt extension hoặc dùng Chrome/Edge.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.65rem 1.5rem',
              background: 'linear-gradient(135deg, #e2c97e, #c8a84b)',
              border: 'none',
              borderRadius: '10px',
              color: '#0a0a0f',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}>
            Tải lại trang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
