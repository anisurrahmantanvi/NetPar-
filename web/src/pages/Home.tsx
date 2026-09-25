import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PlusSquare, 
  RotateCw, 
  AlertCircle, 
  Image as ImageIcon, 
  Sparkles,
  TrendingUp,
  Users
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  startAfter, 
  QueryDocumentSnapshot, 
  DocumentData 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Post } from '../types';
import { PostCard } from '../components/PostCard';
import { useAuth } from '../context/AuthContext';

interface HomeProps {
  onOpenCreateModal: () => void;
}

export const Home: React.FC<HomeProps> = ({ onOpenCreateModal }) => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const PAGE_SIZE = 10;

  const fetchInitialPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const postsRef = collection(db, 'posts');
      // Query public posts ordered by createdAt desc
      const q = query(
        postsRef,
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE)
      );

      const snapshot = await getDocs(q);
      const fetched: Post[] = [];
      snapshot.forEach(docSnap => {
        fetched.push({ ...docSnap.data(), postId: docSnap.id } as Post);
      });

      setPosts(fetched);
      if (snapshot.docs.length < PAGE_SIZE) {
        setHasMore(false);
      } else {
        setHasMore(true);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      }
    } catch (err: any) {
      console.error("Fetch posts failed:", err);
      setError(err.message || "Failed to load posts.");
    } finally {
      setLoading(false);
    }
  };

  const loadMorePosts = async () => {
    if (!lastDoc || loadingMore || !hasMore) return;
    setLoadingMore(true);

    try {
      const postsRef = collection(db, 'posts');
      const q = query(
        postsRef,
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(PAGE_SIZE)
      );

      const snapshot = await getDocs(q);
      const nextPosts: Post[] = [];
      snapshot.forEach(docSnap => {
        nextPosts.push({ ...docSnap.data(), postId: docSnap.id } as Post);
      });

      setPosts(prev => [...prev, ...nextPosts]);
      if (snapshot.docs.length < PAGE_SIZE) {
        setHasMore(false);
      } else {
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      }
    } catch (err: any) {
      console.warn("Load more error:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchInitialPosts();
  }, []);

  const handlePostDeleted = (postId: string) => {
    setPosts(prev => prev.filter(p => p.postId !== postId));
  };

  return (
    <div className="main-feed-area" style={{ padding: '16px' }}>
      {/* Top Composer Trigger */}
      {currentUser ? (
        <div
          onClick={onOpenCreateModal}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--bg-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            marginBottom: '20px',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            transition: 'border-color 0.15s ease'
          }}
          className="composer-trigger-box"
        >
          <img 
            src={userProfile?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'} 
            alt="You" 
            style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }}
          />
          <div 
            style={{
              flex: 1,
              background: 'var(--bg-hover)',
              borderRadius: '99px',
              padding: '12px 18px',
              color: 'var(--text-muted)',
              fontSize: '0.94rem'
            }}
          >
            What's on your mind today, {userProfile?.displayName?.split(' ')[0] || 'friend'}?
          </div>
          <button
            style={{
              background: 'var(--primary-gradient)',
              color: '#fff',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            <ImageIcon size={20} />
          </button>
        </div>
      ) : (
        <div 
          style={{
            background: 'var(--primary-gradient)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            color: '#fff',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: 'var(--shadow-md)'
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '6px' }}>Welcome to iConnecto</h2>
            <p style={{ fontSize: '0.9rem', opacity: 0.9 }}>Join our verified community. Connect, share public posts, and message friends.</p>
          </div>
          <button
            onClick={() => navigate('/login')}
            style={{
              background: '#fff',
              color: '#2563EB',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '10px 20px',
              fontWeight: 800,
              fontSize: '0.92rem',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            Sign In
          </button>
        </div>
      )}

      {/* Feed Filter / Refresh Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', padding: '0 4px' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} color="var(--primary)" />
          <span>Home Feed</span>
        </h2>
        <button
          onClick={fetchInitialPosts}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '0.84rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <RotateCw size={15} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[1, 2, 3].map(i => (
            <div 
              key={i}
              style={{
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--bg-border)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--bg-hover)' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ width: '120px', height: '14px', borderRadius: '4px', background: 'var(--bg-hover)' }} />
                  <div style={{ width: '70px', height: '10px', borderRadius: '4px', background: 'var(--bg-hover)' }} />
                </div>
              </div>
              <div style={{ width: '100%', height: '16px', borderRadius: '4px', background: 'var(--bg-hover)' }} />
              <div style={{ width: '80%', height: '16px', borderRadius: '4px', background: 'var(--bg-hover)' }} />
              <div style={{ width: '100%', height: '200px', borderRadius: '8px', background: 'var(--bg-hover)' }} />
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div 
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            textAlign: 'center',
            margin: '20px 0'
          }}
        >
          <AlertCircle size={32} color="var(--accent-rose)" style={{ margin: '0 auto 10px' }} />
          <p style={{ color: 'var(--text-main)', fontWeight: 600, marginBottom: '12px' }}>{error}</p>
          <button
            onClick={fetchInitialPosts}
            style={{
              background: 'var(--primary-gradient)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 20px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && posts.length === 0 && (
        <div 
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--bg-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '48px 24px',
            textAlign: 'center'
          }}
        >
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--bg-hover)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Sparkles size={32} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px' }}>Your Feed is Quiet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', maxWidth: '360px', margin: '0 auto 20px' }}>
            Be the first to share an update, photo, or thought with the iConnecto network!
          </p>
          {currentUser ? (
            <button
              onClick={onOpenCreateModal}
              style={{
                background: 'var(--primary-gradient)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                padding: '12px 24px',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(37,99,235,0.3)'
              }}
            >
              Create First Post
            </button>
          ) : (
            <button
              onClick={() => navigate('/register')}
              style={{
                background: 'var(--primary-gradient)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                padding: '12px 24px',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer'
              }}
            >
              Register & Connect
            </button>
          )}
        </div>
      )}

      {/* Posts List */}
      {!loading && posts.length > 0 && (
        <div>
          {posts.map(post => (
            <PostCard 
              key={post.postId} 
              post={post} 
              onPostDeleted={handlePostDeleted} 
            />
          ))}

          {/* Load More Trigger */}
          {hasMore && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <button
                onClick={loadMorePosts}
                disabled={loadingMore}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--bg-border)',
                  color: 'var(--primary)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 28px',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  cursor: loadingMore ? 'not-allowed' : 'pointer',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                {loadingMore ? 'Loading more posts...' : 'Load More Posts'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
