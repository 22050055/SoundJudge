import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/common/ErrorBoundary';

import Navbar             from './components/common/Navbar';
import ProtectedRoute     from './components/common/ProtectedRoute';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import ArtistDashboard    from './components/artist/ArtistDashboard';
import UploadTrack        from './components/artist/UploadTrack';
import TrackStats         from './components/artist/TrackStats';
import ReviewerWorkspace  from './components/reviewer/ReviewerWorkspace';
import AdminDashboard     from './components/admin/AdminDashboard';

const DashboardRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'artist')   return <Navigate to="/dashboard/artist" />;
  if (user.role === 'reviewer') return <Navigate to="/dashboard/reviewer" />;
  if (user.role === 'admin')    return <Navigate to="/dashboard/admin" />;
  return <Navigate to="/login" />;
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

            <Route path="/dashboard" element={
              <ProtectedRoute>
                <>
                  <Navbar />
                  <Routes>
                    <Route index element={<DashboardRedirect />} />
                  </Routes>
                </>
              </ProtectedRoute>
            } />

            <Route path="/dashboard/*" element={
              <ProtectedRoute>
                <Navbar />
                <Routes>
                  <Route index element={<DashboardRedirect />} />

                  <Route path="artist" element={
                    <ProtectedRoute roles={['artist']}>
                      <ErrorBoundary>
                        <ArtistDashboard />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  <Route path="upload" element={
                    <ProtectedRoute roles={['artist']}>
                      <ErrorBoundary>
                        <UploadTrack />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  <Route path="artist/track/:id" element={
                    <ProtectedRoute roles={['artist', 'admin']}>
                      <ErrorBoundary>
                        <TrackStats />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />

                  <Route path="reviewer" element={
                    <ProtectedRoute roles={['reviewer']}>
                      <ErrorBoundary>
                        <ReviewerWorkspace />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />

                  <Route path="admin" element={
                    <ProtectedRoute roles={['admin']}>
                      <ErrorBoundary>
                        <AdminDashboard />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                </Routes>
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
