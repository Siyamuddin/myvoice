import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLogo, UserAvatar, LogoutButton } from './shared';

export function UserLayout() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Navigation */}
      <nav className="bg-slate-900/80 backdrop-blur-sm border-b border-blue-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <AppLogo to="/dashboard" />
              <div className="hidden md:flex space-x-4">
                <Link
                  to="/profile"
                  className="px-3 py-2 text-gray-300 hover:text-white transition-colors font-medium"
                >
                  Profile
                </Link>
                <Link
                  to="/sessions"
                  className="px-3 py-2 text-gray-300 hover:text-white transition-colors font-medium"
                >
                  Sessions
                </Link>
                <Link
                  to="/voice"
                  className="px-3 py-2 text-gray-300 hover:text-white transition-colors font-medium"
                >
                  Voice Agent
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <UserAvatar name={user?.name} />
              <LogoutButton variant="text" />
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
