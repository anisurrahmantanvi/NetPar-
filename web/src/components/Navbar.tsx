import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Search, 
  MessageSquare, 
  Bell, 
  User, 
  Settings, 
  ShieldAlert, 
  PlusSquare, 
  Moon, 
  Sun, 
  LogOut 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  onOpenCreateModal: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onOpenCreateModal, 
  isDark, 
  onToggleTheme 
}) => {
  const { userProfile, currentUser, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (window.confirm("Log out of iConnecto?")) {
      await logout();
      navigate('/login');
    }
  };

  const navLinks = [
    { to: '/home', icon: Home, label: 'Home' },
    { to: '/search', icon: Search, label: 'Search' },
    { to: '/messages', icon: MessageSquare, label: 'Messages' },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
    { to: userProfile ? `/profile/${userProfile.username}` : '/login', icon: User, label: 'Profile' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  if (isAdmin) {
    navLinks.push({ to: '/admin', icon: ShieldAlert, label: 'Admin Panel' });
  }

  return (
    <>
      {/* Desktop Left Sidebar */}
      <aside className="sidebar-left">
        {/* Brand */}
        <div 
          onClick={() => navigate('/home')} 
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', marginBottom: '32px', padding: '0 8px' }}
        >
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '20px', boxShadow: '0 4px 14px rgba(37,99,235,0.35)' }}>
            iC
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.5px' }}>iConnecto</h1>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Social & Connect</p>
          </div>
        </div>

        {/* Links */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  color: isActive ? 'var(--primary)' : 'var(--text-main)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.98rem',
                  textDecoration: 'none',
                  background: isActive ? 'var(--bg-hover)' : 'transparent',
                  transition: 'all 0.15s ease'
                })}
              >
                <Icon size={22} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          {/* Create Post Button */}
          {currentUser && (
            <button
              onClick={onOpenCreateModal}
              style={{
                marginTop: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                background: 'var(--primary-gradient)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: 'pointer',
                boxShadow: '0 4px 18px rgba(37,99,235,0.3)',
                transition: 'transform 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <PlusSquare size={20} />
              <span>Create Post</span>
            </button>
          )}
        </nav>

        {/* Bottom Theme & User Info */}
        <div style={{ borderTop: '1px solid var(--bg-border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={onToggleTheme}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-hover)',
              border: 'none',
              color: 'var(--text-main)',
              cursor: 'pointer',
              fontSize: '0.88rem',
              fontWeight: 600
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {isDark ? <Sun size={18} color="#F59E0B" /> : <Moon size={18} color="#6366F1" />}
              <span>{isDark ? 'Light Theme' : 'Dark Theme'}</span>
            </span>
          </button>

          {userProfile ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px' }}>
              <div 
                onClick={() => navigate(`/profile/${userProfile.username}`)}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', overflow: 'hidden' }}
              >
                <img 
                  src={userProfile.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'} 
                  alt={userProfile.displayName} 
                  style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {userProfile.displayName}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    @{userProfile.username}
                  </div>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                title="Logout"
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px' }}
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-hover)',
                border: '1px solid var(--bg-border)',
                color: 'var(--primary)',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Sign In
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Top Header */}
      <div 
        style={{
          display: 'none',
          position: 'sticky',
          top: 0,
          background: 'var(--bg-card)',
          zIndex: 40,
          borderBottom: '1px solid var(--bg-border)',
          padding: '12px 16px',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
        className="mobile-top-header"
      >
        <div onClick={() => navigate('/home')} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '16px' }}>
            iC
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.2rem' }}>iConnecto</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            onClick={onToggleTheme} 
            style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}
          >
            {isDark ? <Sun size={20} color="#F59E0B" /> : <Moon size={20} color="#6366F1" />}
          </button>
          {currentUser && (
            <button
              onClick={onOpenCreateModal}
              style={{ background: 'var(--primary-gradient)', border: 'none', color: '#fff', borderRadius: '8px', padding: '6px 12px', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <PlusSquare size={16} /> Post
            </button>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav">
        <NavLink to="/home" style={({ isActive }) => ({ color: isActive ? 'var(--primary)' : 'var(--text-muted)' })}>
          <Home size={24} />
        </NavLink>
        <NavLink to="/search" style={({ isActive }) => ({ color: isActive ? 'var(--primary)' : 'var(--text-muted)' })}>
          <Search size={24} />
        </NavLink>
        <button 
          onClick={onOpenCreateModal} 
          style={{ background: 'var(--primary-gradient)', color: '#fff', border: 'none', width: '42px', height: '42px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(37,99,235,0.4)' }}
        >
          <PlusSquare size={22} />
        </button>
        <NavLink to="/messages" style={({ isActive }) => ({ color: isActive ? 'var(--primary)' : 'var(--text-muted)' })}>
          <MessageSquare size={24} />
        </NavLink>
        <NavLink to="/notifications" style={({ isActive }) => ({ color: isActive ? 'var(--primary)' : 'var(--text-muted)' })}>
          <Bell size={24} />
        </NavLink>
        <NavLink 
          to={userProfile ? `/profile/${userProfile.username}` : '/login'} 
          style={({ isActive }) => ({ color: isActive ? 'var(--primary)' : 'var(--text-muted)' })}
        >
          <User size={24} />
        </NavLink>
      </nav>
    </>
  );
};
