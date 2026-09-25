import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Heart, MessageCircle, UserPlus, ShieldAlert, Loader2, Check } from 'lucide-react';
import { collection, query, where, orderBy, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { NotificationItem } from '../types';
import { useAuth } from '../context/AuthContext';

export const Notifications: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'notifications'),
        where('recipientId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const list: NotificationItem[] = [];
      snap.forEach(d => list.push({ ...d.data(), notificationId: d.id } as NotificationItem));
      setNotifications(list);
    } catch (e) {
      console.warn("Notifications note:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, [currentUser]);

  const markAllRead = async () => {
    notifications.forEach(async (n) => {
      if (!n.read) {
        try {
          await updateDoc(doc(db, 'notifications', n.notificationId), { read: true });
        } catch (_) {}
      }
    });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleClickNotif = (notif: NotificationItem) => {
    if (notif.postId) {
      navigate(`/post/${notif.postId}`);
    }
  };

  if (!currentUser) {
    return (
      <div className="main-feed-area" style={{ padding: '40px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '8px' }}>Sign in to View Notifications</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>Keep track of likes, comments, and mentions on your posts.</p>
        <button
          onClick={() => navigate('/login')}
          style={{ background: 'var(--primary-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', padding: '10px 24px', fontWeight: 700, cursor: 'pointer' }}
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="main-feed-area" style={{ padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={20} color="var(--primary)" /> Notifications
        </h1>
        {notifications.some(n => !n.read) && (
          <button
            onClick={markAllRead}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Check size={16} /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Loader2 size={32} className="animate-spin" color="var(--primary)" />
        </div>
      ) : notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔔</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>No Notifications Yet</h3>
          <p style={{ fontSize: '0.88rem' }}>When someone likes or comments on your posts, you'll see it here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {notifications.map(n => {
            const icon = n.type === 'like' ? <Heart size={18} color="var(--accent-rose)" fill="var(--accent-rose)" /> :
                         n.type === 'comment' ? <MessageCircle size={18} color="var(--primary)" /> :
                         <UserPlus size={18} color="var(--accent-emerald)" />;

            return (
              <div
                key={n.notificationId}
                onClick={() => handleClickNotif(n)}
                style={{
                  background: n.read ? 'var(--bg-card)' : 'var(--bg-hover)',
                  border: '1px solid var(--bg-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  cursor: n.postId ? 'pointer' : 'default',
                  transition: 'background 0.15s ease'
                }}
              >
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: 'var(--shadow-sm)' }}>
                  {icon}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.92rem', color: 'var(--text-main)', fontWeight: n.read ? 400 : 600 }}>{n.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
