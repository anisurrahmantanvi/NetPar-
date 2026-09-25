import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Camera, 
  Globe, 
  Calendar, 
  Edit3, 
  UserPlus, 
  UserCheck, 
  MessageSquare, 
  Loader2, 
  X, 
  Bookmark, 
  Grid, 
  Image as ImageIcon 
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  serverTimestamp, 
  runTransaction 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { UserProfile, Post } from '../types';
import { useAuth } from '../context/AuthContext';
import { PostCard } from '../components/PostCard';

export const Profile: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const { currentUser, userProfile: myProfile, updateProfileDetails } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'media' | 'saved'>('posts');
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // Edit Modal State
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null);
  const [newCoverFile, setNewCoverFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Load User by Username
  useEffect(() => {
    if (!username) return;
    setLoading(true);
    let isMounted = true;

    const fetchUser = async () => {
      try {
        const clean = username.toLowerCase();
        // Check usernames collection or query users
        const uQuery = query(collection(db, 'users'), where('username', '==', clean));
        const snap = await getDocs(uQuery);

        if (!snap.empty && isMounted) {
          const uDoc = snap.docs[0];
          const data = { ...uDoc.data(), uid: uDoc.id } as UserProfile;
          setProfile(data);

          // Check if current user follows this user
          if (currentUser && currentUser.uid !== data.uid) {
            const followRef = doc(db, 'users', data.uid, 'followers', currentUser.uid);
            const fSnap = await getDoc(followRef);
            if (isMounted) setIsFollowing(fSnap.exists());
          }
        } else if (isMounted) {
          setProfile(null);
        }
      } catch (err) {
        console.error("Profile fetch error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchUser();
    return () => { isMounted = false; };
  }, [username, currentUser]);

  // Load User's Posts
  useEffect(() => {
    if (!profile) return;
    setLoadingPosts(true);

    const fetchPosts = async () => {
      try {
        const pQuery = query(
          collection(db, 'posts'),
          where('authorId', '==', profile.uid)
        );
        const pSnap = await getDocs(pQuery);
        const list: Post[] = [];
        pSnap.forEach(d => {
          list.push({ ...d.data(), postId: d.id } as Post);
        });
        // Sort descending
        list.sort((a, b) => {
          const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return bTime - aTime;
        });
        setUserPosts(list);
      } catch (err) {
        console.warn("User posts fetch note:", err);
      } finally {
        setLoadingPosts(false);
      }
    };

    fetchPosts();
  }, [profile]);

  const handleFollowToggle = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    if (!profile || followLoading) return;
    setFollowLoading(true);

    const prevFollowing = isFollowing;
    setIsFollowing(!prevFollowing);
    setProfile(prev => prev ? {
      ...prev,
      followersCount: prevFollowing ? Math.max(0, prev.followersCount - 1) : prev.followersCount + 1
    } : null);

    try {
      const targetUserRef = doc(db, 'users', profile.uid);
      const myUserRef = doc(db, 'users', currentUser.uid);
      const followerDocRef = doc(db, 'users', profile.uid, 'followers', currentUser.uid);
      const followingDocRef = doc(db, 'users', currentUser.uid, 'following', profile.uid);

      await runTransaction(db, async (tx) => {
        const targetSnap = await tx.get(targetUserRef);
        const mySnap = await tx.get(myUserRef);
        if (!targetSnap.exists() || !mySnap.exists()) return;

        const fSnap = await tx.get(followerDocRef);
        const curFollowers = targetSnap.data().followersCount || 0;
        const curFollowing = mySnap.data().followingCount || 0;

        if (fSnap.exists()) {
          // Unfollow
          tx.delete(followerDocRef);
          tx.delete(followingDocRef);
          tx.update(targetUserRef, { followersCount: Math.max(0, curFollowers - 1) });
          tx.update(myUserRef, { followingCount: Math.max(0, curFollowing - 1) });
        } else {
          // Follow
          tx.set(followerDocRef, { userId: currentUser.uid, createdAt: serverTimestamp() });
          tx.set(followingDocRef, { userId: profile.uid, createdAt: serverTimestamp() });
          tx.update(targetUserRef, { followersCount: curFollowers + 1 });
          tx.update(myUserRef, { followingCount: curFollowing + 1 });
        }
      });
    } catch (err) {
      console.error("Follow error:", err);
      setIsFollowing(prevFollowing);
    } finally {
      setFollowLoading(false);
    }
  };

  const isOwnProfile = currentUser && profile && currentUser.uid === profile.uid;

  const openEditModal = () => {
    if (!profile) return;
    setEditName(profile.displayName || '');
    setEditBio(profile.bio || '');
    setAvatarPreview(profile.photoURL || null);
    setCoverPreview(profile.coverURL || null);
    setNewAvatarFile(null);
    setNewCoverFile(null);
    setEditOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      alert("Display name cannot be empty.");
      return;
    }
    setSavingProfile(true);

    try {
      await updateProfileDetails(
        { displayName: editName.trim(), bio: editBio.trim() },
        newAvatarFile,
        newCoverFile
      );

      setProfile(prev => prev ? {
        ...prev,
        displayName: editName.trim(),
        bio: editBio.trim(),
        photoURL: avatarPreview || prev.photoURL,
        coverURL: coverPreview || prev.coverURL
      } : null);

      setEditOpen(false);
    } catch (err: any) {
      alert("Failed to update profile: " + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return (
      <div className="main-feed-area" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={36} className="animate-spin" color="var(--primary)" />
        <p style={{ marginTop: '12px', color: 'var(--text-muted)' }}>Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="main-feed-area" style={{ padding: '40px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px' }}>User Not Found</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>No account with username @{username} exists on iConnecto.</p>
        <button
          onClick={() => navigate('/home')}
          style={{ background: 'var(--primary-gradient)', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 'var(--radius-md)', fontWeight: 700, cursor: 'pointer' }}
        >
          Back to Feed
        </button>
      </div>
    );
  }

  const mediaPosts = userPosts.filter(p => p.mediaUrl);

  return (
    <div className="main-feed-area">
      {/* Cover Image */}
      <div style={{ height: '200px', width: '100%', position: 'relative', background: 'var(--primary-gradient)' }}>
        {profile.coverURL && (
          <img 
            src={profile.coverURL} 
            alt="Cover" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
        )}
      </div>

      {/* Header Info Box */}
      <div style={{ padding: '0 20px 20px', position: 'relative', background: 'var(--bg-card)', borderBottom: '1px solid var(--bg-border)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: '-50px', marginBottom: '16px' }}>
          {/* Avatar */}
          <div style={{ position: 'relative' }}>
            <img 
              src={profile.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'} 
              alt={profile.displayName}
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '4px solid var(--bg-card)',
                boxShadow: 'var(--shadow-md)',
                background: 'var(--bg-hover)'
              }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            {isOwnProfile ? (
              <button
                onClick={openEditModal}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--bg-hover)',
                  border: '1px solid var(--bg-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px 18px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  color: 'var(--text-main)',
                  cursor: 'pointer'
                }}
              >
                <Edit3 size={16} /> Edit Profile
              </button>
            ) : (
              <>
                <button
                  onClick={handleFollowToggle}
                  disabled={followLoading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: isFollowing ? 'var(--bg-hover)' : 'var(--primary-gradient)',
                    color: isFollowing ? 'var(--text-main)' : '#fff',
                    border: isFollowing ? '1px solid var(--bg-border)' : 'none',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 20px',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: followLoading ? 'not-allowed' : 'pointer',
                    boxShadow: isFollowing ? 'none' : '0 4px 14px rgba(37,99,235,0.3)'
                  }}
                >
                  {isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
                  <span>{isFollowing ? 'Following' : 'Follow'}</span>
                </button>

                <button
                  onClick={() => navigate('/messages')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'var(--bg-hover)',
                    border: '1px solid var(--bg-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 16px',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    color: 'var(--text-main)',
                    cursor: 'pointer'
                  }}
                >
                  <MessageSquare size={16} /> Message
                </button>
              </>
            )}
          </div>
        </div>

        {/* Names & Bio */}
        <h1 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '2px' }}>
          {profile.displayName}
        </h1>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
          @{profile.username}
        </div>

        {profile.bio && (
          <p style={{ fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '14px', whiteSpace: 'pre-wrap' }}>
            {profile.bio}
          </p>
        )}

        {/* Stats Grid */}
        <div style={{ display: 'flex', gap: '24px', fontSize: '0.92rem', borderTop: '1px solid var(--bg-border)', paddingTop: '14px', marginTop: '14px' }}>
          <div>
            <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>{userPosts.length}</span>{' '}
            <span style={{ color: 'var(--text-muted)' }}>Posts</span>
          </div>
          <div>
            <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>{profile.followersCount || 0}</span>{' '}
            <span style={{ color: 'var(--text-muted)' }}>Followers</span>
          </div>
          <div>
            <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>{profile.followingCount || 0}</span>{' '}
            <span style={{ color: 'var(--text-muted)' }}>Following</span>
          </div>
        </div>
      </div>

      {/* Profile Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--bg-border)', background: 'var(--bg-card)' }}>
        <button
          onClick={() => setActiveTab('posts')}
          style={{
            flex: 1,
            padding: '14px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'posts' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'posts' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'posts' ? 700 : 500,
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <Grid size={18} /> Posts
        </button>

        <button
          onClick={() => setActiveTab('media')}
          style={{
            flex: 1,
            padding: '14px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'media' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'media' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'media' ? 700 : 500,
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <ImageIcon size={18} /> Photos & Media
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ padding: '16px' }}>
        {loadingPosts ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Loader2 size={30} className="animate-spin" color="var(--primary)" />
          </div>
        ) : activeTab === 'posts' ? (
          userPosts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
              No posts shared yet by @{profile.username}.
            </div>
          ) : (
            userPosts.map(p => (
              <PostCard key={p.postId} post={p} />
            ))
          )
        ) : (
          mediaPosts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
              No photos or videos posted yet.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {mediaPosts.map(p => (
                <div 
                  key={p.postId}
                  onClick={() => navigate(`/post/${p.postId}`)}
                  style={{
                    aspectRatio: '1/1',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    background: '#000',
                    cursor: 'pointer'
                  }}
                >
                  <img src={p.mediaUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Edit Profile Modal */}
      {editOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setEditOpen(false)}
        >
          <div 
            style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              width: '100%',
              maxWidth: '520px',
              border: '1px solid var(--bg-border)',
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--bg-border)' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Edit Profile</h2>
              <button onClick={() => setEditOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Photo preview and chooser */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <img 
                  src={avatarPreview || profile.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80'} 
                  alt="" 
                  style={{ width: '70px', height: '70px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }}
                />
                <div>
                  <label 
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'var(--bg-hover)',
                      border: '1px solid var(--bg-border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '6px 14px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <Camera size={16} /> Change Avatar
                    <input 
                      type="file" 
                      accept="image/*" 
                      style={{ display: 'none' }} 
                      onChange={(e) => {
                        const file = e.target.files && e.target.files[0];
                        if (file) {
                          setNewAvatarFile(file);
                          setAvatarPreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '6px' }}>Display Name</label>
                <input 
                  type="text" 
                  value={editName} 
                  onChange={(e) => setEditName(e.target.value)} 
                  style={{
                    width: '100%',
                    background: 'var(--bg-hover)',
                    border: '1px solid var(--bg-border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 14px',
                    color: 'var(--text-main)',
                    fontSize: '0.95rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '6px' }}>Bio</label>
                <textarea 
                  value={editBio} 
                  onChange={(e) => setEditBio(e.target.value)} 
                  rows={3}
                  style={{
                    width: '100%',
                    background: 'var(--bg-hover)',
                    border: '1px solid var(--bg-border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 14px',
                    color: 'var(--text-main)',
                    fontSize: '0.95rem',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  style={{ background: 'var(--bg-hover)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '10px 18px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  style={{
                    background: 'var(--primary-gradient)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 22px',
                    fontWeight: 700,
                    cursor: savingProfile ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {savingProfile && <Loader2 size={16} className="animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
