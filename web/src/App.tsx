import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { CreatePostModal } from './components/CreatePostModal';
import { Home } from './pages/Home';
import { PostDetail } from './pages/PostDetail';
import { Profile } from './pages/Profile';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Search } from './pages/Search';
import { Messages } from './pages/Messages';
import { Notifications } from './pages/Notifications';
import { Settings } from './pages/Settings';
import { Admin } from './pages/Admin';
import { useAuth } from './context/AuthContext';

export const App: React.FC = () => {
  const { currentUser, loading } = useAuth();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('iconnecto_theme') !== 'light';
  });

  const location = useLocation();

  useEffect(() => {
    if (isDark) {
      document.body.classList.add('dark');
      localStorage.setItem('iconnecto_theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('iconnecto_theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };

  // Scroll to top on route navigation
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <div className={`app-container ${isDark ? 'dark' : ''}`}>
      {/* Navigation Bars (hidden on pure login/register screen) */}
      {!isAuthPage && (
        <Navbar 
          onOpenCreateModal={() => setCreateModalOpen(true)}
          isDark={isDark}
          onToggleTheme={toggleTheme}
        />
      )}

      {/* Main Content Viewport */}
      <main style={{ flex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home onOpenCreateModal={() => setCreateModalOpen(true)} />} />
          
          {/* Public Shareable Post Page: /post/:postId */}
          <Route path="/post/:postId" element={<PostDetail />} />
          
          {/* User Profile Page */}
          <Route path="/profile/:username" element={<Profile />} />
          
          {/* Authentication Pages */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* App Feature Pages */}
          <Route path="/search" element={<Search />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings" element={<Settings isDark={isDark} onToggleTheme={toggleTheme} />} />
          <Route path="/admin" element={<Admin />} />

          {/* Catch-all route -> /home */}
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </main>

      {/* Create Post Modal */}
      {createModalOpen && (
        <CreatePostModal 
          isOpen={createModalOpen} 
          onClose={() => setCreateModalOpen(false)} 
        />
      )}
    </div>
  );
};
