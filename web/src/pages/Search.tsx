import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, User, Grid, Loader2 } from 'lucide-react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { UserProfile, Post } from '../types';
import { PostCard } from '../components/PostCard';

export const Search: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'posts'>('users');
  const [userResults, setUserResults] = useState<UserProfile[]>([]);
  const [postResults, setPostResults] = useState<Post[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setSearching(true);
    const term = searchTerm.trim().toLowerCase();

    try {
      if (activeTab === 'users') {
        // Query users by username prefix
        const uQuery = query(
          collection(db, 'users'),
          where('username', '>=', term),
          where('username', '<=', term + '\uf8ff'),
          limit(20)
        );
        const snap = await getDocs(uQuery);
        const users: UserProfile[] = [];
        snap.forEach(d => users.push({ ...d.data(), uid: d.id } as UserProfile));
        setUserResults(users);
      } else {
        // Fetch recent posts and filter
        const pQuery = query(collection(db, 'posts'), limit(50));
        const snap = await getDocs(pQuery);
        const matched: Post[] = [];
        snap.forEach(d => {
          const data = d.data() as Post;
          if (data.text && data.text.toLowerCase().includes(term)) {
            matched.push({ ...data, postId: d.id });
          }
        });
        setPostResults(matched);
      }
    } catch (err) {
      console.warn("Search error:", err);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="main-feed-area" style={{ padding: '16px' }}>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '16px' }}>Search iConnecto</h1>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            placeholder={activeTab === 'users' ? "Search users by @handle..." : "Search posts and hashtags..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--bg-hover)',
              border: '1px solid var(--bg-border)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px 12px 42px',
              color: 'var(--text-main)',
              fontSize: '0.95rem',
              outline: 'none'
            }}
          />
          <SearchIcon size={20} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
        </div>
        <button
          type="submit"
          disabled={searching}
          style={{
            background: 'var(--primary-gradient)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            padding: '0 24px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          {searching ? <Loader2 size={18} className="animate-spin" /> : 'Search'}
        </button>
      </form>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--bg-border)', marginBottom: '16px' }}>
        <button
          onClick={() => { setActiveTab('users'); }}
          style={{
            flex: 1,
            padding: '12px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'users' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'users' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'users' ? 700 : 500,
            cursor: 'pointer'
          }}
        >
          Users
        </button>
        <button
          onClick={() => { setActiveTab('posts'); }}
          style={{
            flex: 1,
            padding: '12px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'posts' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'posts' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'posts' ? 700 : 500,
            cursor: 'pointer'
          }}
        >
          Posts
        </button>
      </div>

      {/* Results */}
      {searching ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Loader2 size={32} className="animate-spin" color="var(--primary)" />
        </div>
      ) : activeTab === 'users' ? (
        userResults.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            {searchTerm ? 'No users found matching your search.' : 'Type a name or username handle to find people.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {userResults.map(u => (
              <div
                key={u.uid}
                onClick={() => navigate(`/profile/${u.username}`)}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--bg-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  cursor: 'pointer'
                }}
              >
                <img
                  src={u.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                  alt={u.displayName}
                  style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{u.displayName}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>@{u.username}</div>
                </div>
                <button
                  style={{
                    background: 'var(--bg-hover)',
                    border: '1px solid var(--bg-border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '6px 14px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  View Profile
                </button>
              </div>
            ))}
          </div>
        )
      ) : (
        postResults.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            {searchTerm ? 'No posts found with this keyword.' : 'Type a keyword or hashtag to search posts.'}
          </div>
        ) : (
          postResults.map(p => <PostCard key={p.postId} post={p} />)
        )
      )}
    </div>
  );
};
