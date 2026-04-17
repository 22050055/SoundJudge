import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/common/ErrorBoundary';

import Navbar           from './components/common/Navbar';
import ProtectedRoute   from './components/common/ProtectedRoute';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import UserDashboard    from './components/user/UserDashboard';
import UploadTrack      from './components/user/UploadTrack';
import TrackStats       from './components/user/TrackStats';
import ProfilePage      from './components/user/ProfilePage';
import AdminDashboard   from './components/admin/AdminDashboard';

// Redirect về dashboard phù hợp theo role
const DashboardRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'admin') return <Navigate to="/dashboard/admin" />;
  return <Navigate to="/dashboard/home" />;
};

const App = () => (
  <ErrorBoundary>
    <AuthProvider>
      <BrowserRouter>
        <div style={{ background: '#0a0a0f', minHeight: '100vh', fontFamily: "'DM Sans', sans-serif" }}>
          <Routes>
            <Route path="/login"    element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/"         element={<Navigate to="/dashboard" />} />

            <Route path="/dashboard/*" element={
              <ProtectedRoute>
                <>
                  <Navbar />
                  <Routes>
                    <Route index element={<DashboardRedirect />} />

                    {/* Dashboard chính cho user (bất kỳ) */}
                    <Route path="home" element={
                      <ErrorBoundary>
                        <UserDashboard />
                      </ErrorBoundary>
                    } />

                    {/* Upload nhạc */}
                    <Route path="upload" element={
                      <ProtectedRoute roles={['user', 'admin']}>
                        <ErrorBoundary>
                          <UploadTrack />
                        </ErrorBoundary>
                      </ProtectedRoute>
                    } />

                    {/* Thống kê bài nhạc */}
                    <Route path="track/:id" element={
                      <ProtectedRoute roles={['user', 'admin']}>
                        <ErrorBoundary>
                          <TrackStats />
                        </ErrorBoundary>
                      </ProtectedRoute>
                    } />

                    {/* Trang cá nhân */}
                    <Route path="profile/:id" element={
                      <ErrorBoundary>
                        <ProfilePage />
                      </ErrorBoundary>
                    } />

                    {/* Admin dashboard */}
                    <Route path="admin" element={
                      <ProtectedRoute roles={['admin']}>
                        <ErrorBoundary>
                          <AdminDashboard />
                        </ErrorBoundary>
                      </ProtectedRoute>
                    } />
                  </Routes>
                </>
              </ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  </ErrorBoundary>
);

export default App;
