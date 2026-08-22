import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { ROLES } from '../utils/roles';
import RoleBasedNav from './RoleBasedNav';
import InstallAppButton from './InstallAppButton';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const onLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <nav className="app-navbar">
        <div className="app-navbar-inner">
          <div className="app-navbar-row">
            <div className="app-brand-wrap">
              <Link to={user?.role === ROLES.PARENT ? '/parent-dashboard' : user?.role === ROLES.SECURITY ? '/security-scanner' : '/'} className="app-brand">
                <div className="app-brand-mark">
                  <span>G</span>
                </div>
                <div className="app-brand-copy">
                  <span className="app-brand-name">Gurukul</span>
                  <small>Academic OS</small>
                </div>
              </Link>
            </div>

            <div className="app-user-area">
              <InstallAppButton />
              <div className="app-user-summary">
                <div className="app-user-avatar">
                  {(user?.personalInfo?.fullName || user?.fullName || user?.email || '?')[0].toUpperCase()}
                </div>
                <div className="app-user-text">
                  <p>{user?.personalInfo?.fullName || user?.fullName || user?.email}</p>
                  {user?.role && (
                    <span>{user.role}</span>
                  )}
                </div>
              </div>
              <button
                onClick={onLogout}
                className="app-logout-button"
              >
                Sign out
              </button>
            </div>

            <div className="app-mobile-toggle-wrap">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="app-mobile-toggle"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="app-mobile-menu">
            <div className="app-mobile-nav-list">
              <RoleBasedNav mobile onItemClick={() => setMobileMenuOpen(false)} />
            </div>
            <div className="app-mobile-user">
              <InstallAppButton mobile />
              <div className="app-mobile-user-row">
                <div className="app-user-avatar app-user-avatar-lg">
                  {(user?.personalInfo?.fullName || user?.fullName || user?.email || '?')[0].toUpperCase()}
                </div>
                <div>
                  <p>{user?.personalInfo?.fullName || user?.fullName}</p>
                  <span>{user?.role}</span>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="app-mobile-logout"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </nav>

      <div className="app-body">
        <aside className="app-sidebar">
          <div className="app-sidebar-section">
            <span className="app-sidebar-label">Workspace</span>
            <RoleBasedNav />
          </div>
        </aside>

        <main className="app-main">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
