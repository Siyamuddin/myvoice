import { lazy, Suspense, useEffect } from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  useNavigate,
  Outlet,
} from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AdminRoute } from './components/common/AdminRoute';
import { AdminLayout } from './components/layout/AdminLayout';
import { UserLayout } from './components/layout/UserLayout';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { queryClient, TOAST_CONFIG } from './config';
import { setAuthNavigate } from './utils/authNavigate';

// Loading component for lazy-loaded pages
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-400">Loading...</p>
    </div>
  </div>
);

// Lazy-loaded Pages
const LandingPage = lazy(() =>
  import('./pages/LandingPage').then((m) => ({ default: m.LandingPage }))
);
const LoginPage = lazy(() =>
  import('./pages/auth/LoginPage').then((m) => ({ default: m.LoginPage }))
);
const RegisterPage = lazy(() =>
  import('./pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage }))
);
const ForgotPasswordPage = lazy(() =>
  import('./pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage }))
);
const ResetPasswordPage = lazy(() =>
  import('./pages/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage }))
);
const VerifyEmailPage = lazy(() =>
  import('./pages/auth/VerifyEmailPage').then((m) => ({ default: m.VerifyEmailPage }))
);

// Admin Pages (lazy-loaded)
const AdminDashboard = lazy(() =>
  import('./pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);
const UserManagementPage = lazy(() =>
  import('./pages/admin/UserManagementPage').then((m) => ({ default: m.UserManagementPage }))
);
const UserDetailPage = lazy(() =>
  import('./pages/admin/UserDetailPage').then((m) => ({ default: m.UserDetailPage }))
);
const UserEditPage = lazy(() =>
  import('./pages/admin/UserEditPage').then((m) => ({ default: m.UserEditPage }))
);
const AdminProfilePage = lazy(() =>
  import('./pages/admin/AdminProfilePage').then((m) => ({ default: m.AdminProfilePage }))
);
const AdminSessionsPage = lazy(() =>
  import('./pages/admin/AdminSessionsPage').then((m) => ({ default: m.AdminSessionsPage }))
);
const AppSettingsPage = lazy(() =>
  import('./pages/admin/AppSettingsPage').then((m) => ({ default: m.AppSettingsPage }))
);

// User Pages (lazy-loaded)
const UserDashboard = lazy(() =>
  import('./pages/users/UserDashboard').then((m) => ({ default: m.UserDashboard }))
);
const ProfilePage = lazy(() =>
  import('./pages/users/ProfilePage').then((m) => ({ default: m.ProfilePage }))
);
const ChangePasswordPage = lazy(() =>
  import('./pages/users/ChangePasswordPage').then((m) => ({ default: m.ChangePasswordPage }))
);
const SessionsPage = lazy(() =>
  import('./pages/users/SessionsPage').then((m) => ({ default: m.SessionsPage }))
);
const VoiceAgentPage = lazy(() =>
  import('./pages/voice/VoiceAgentPage').then((m) => ({ default: m.VoiceAgentPage }))
);

// OAuth Callback
const OAuthCallbackPage = lazy(() =>
  import('./pages/auth/OAuthCallbackPage').then((m) => ({ default: m.OAuthCallbackPage }))
);

/** Wires axios auth redirects to React Router navigate */
function AuthNavigateBridge() {
  const navigate = useNavigate();

  useEffect(() => {
    setAuthNavigate((to) => {
      navigate(to, { replace: true });
    });
  }, [navigate]);

  return null;
}

/** Role-based redirect after login */
function AuthRedirect() {
  const { isAuthenticated, isAdminUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isAdminUser) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

function RootLayout() {
  return (
    <>
      <AuthNavigateBridge />
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </>
  );
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
      { path: '/verify-email', element: <VerifyEmailPage /> },
      { path: '/oauth/callback', element: <OAuthCallbackPage /> },
      { path: '/auth-redirect', element: <AuthRedirect /> },

      // Admin layout routes
      {
        path: '/admin',
        element: <AdminRoute />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              { index: true, element: <Navigate to="dashboard" replace /> },
              { path: 'dashboard', element: <AdminDashboard /> },
              { path: 'users', element: <UserManagementPage /> },
              { path: 'users/:id', element: <UserDetailPage /> },
              { path: 'users/:id/edit', element: <UserEditPage /> },
              { path: 'profile', element: <AdminProfilePage /> },
              { path: 'sessions', element: <AdminSessionsPage /> },
              { path: 'settings', element: <AppSettingsPage /> },
              { path: '*', element: <Navigate to="/admin/dashboard" replace /> },
            ],
          },
        ],
      },

      // User layout routes
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <UserLayout />,
            children: [
              { path: 'dashboard', element: <UserDashboard /> },
              { path: 'profile', element: <ProfilePage /> },
              { path: 'change-password', element: <ChangePasswordPage /> },
              { path: 'sessions', element: <SessionsPage /> },
              { path: 'voice', element: <VoiceAgentPage /> },
              { path: '*', element: <Navigate to="/dashboard" replace /> },
            ],
          },
        ],
      },
    ],
  },
]);

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster position={TOAST_CONFIG.position} />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
