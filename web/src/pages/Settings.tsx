import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun, Shield, LogOut, ExternalLink, HelpCircle, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SettingsProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ isDark, onToggleTheme }) => {
  const { userProfile, currentUser, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to log out of iConnecto?")) {
      await logout();
      navigate('/login');
    }
  };

  return (
    <div className="main-feed-area" style={{ padding: '20px' }}>
      <h1 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '20px' }}>Settings</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Appearance */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 'var(--radius-md)', padding: '16px 20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px' }}>Appearance</h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {isDark ? <Moon size={20} color="#6366F1" /> : <Sun size={20} color="#F59E0B" />}
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>Color Theme</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Currently using {isDark ? 'Dark Mode' : 'Light Mode'}</div>
              </div>
            </div>
            <button
              onClick={onToggleTheme}
              style={{
                background: 'var(--bg-hover)',
                border: '1px solid var(--bg-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 14px',
                fontWeight: 600,
                fontSize: '0.85rem',
                color: 'var(--text-main)',
                cursor: 'pointer'
              }}
            >
              Toggle
            </button>
          </div>
        </div>

        {/* Account Info */}
        {currentUser && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 'var(--radius-md)', padding: '16px 20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px' }}>Account & Security</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem' }}>
              <div><strong>Email:</strong> {currentUser.email}</div>
              <div><strong>Username:</strong> @{userProfile?.username || 'user'}</div>
              <div><strong>Role:</strong> <span style={{ textTransform: 'uppercase', color: isAdmin ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 700 }}>{userProfile?.role || 'user'}</span></div>
            </div>
          </div>
        )}

        {/* Administration */}
        {isAdmin && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 'var(--radius-md)', padding: '16px 20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-rose)' }}>
              <Shield size={18} /> Moderation & Administration
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px' }}>Review user reports and content moderation logs.</p>
            <button
              onClick={() => navigate('/admin')}
              style={{
                background: 'var(--primary-gradient)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 18px',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer'
              }}
            >
              Open Admin Console
            </button>
          </div>
        )}

        {/* Platform Info */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 'var(--radius-md)', padding: '16px 20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={18} /> About iConnecto
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            iConnecto v1.0.0 — Production-grade social network platform with live Cloud Firestore synchronization, Firebase Storage, and Android App Links deep linking.
          </p>
        </div>

        {/* Logout */}
        {currentUser && (
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: 'var(--radius-md)',
              padding: '12px',
              color: 'var(--accent-rose)',
              fontWeight: 700,
              fontSize: '0.92rem',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            <LogOut size={18} /> Sign Out of iConnecto
          </button>
        )}
      </div>
    </div>
  );
};
