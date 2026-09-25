import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Bookmark, 
  MoreHorizontal, 
  Trash2, 
  Flag, 
  Copy, 
  Check, 
  ExternalLink 
} from 'lucide-react';
import { 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  serverTimestamp, 
  runTransaction,
  collection,
  addDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Post } from '../types';
import { useAuth } from '../context/AuthContext';

interface PostCardProps {
  post: Post;
  onPostDeleted?: (postId: string) => void;
  showCommentsInline?: boolean;
}

export const PostCard: React.FC<PostCardProps> = ({ 
  post, 
  onPostDeleted 
}) => {
  const { currentUser, userProfile, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const [isSaved, setIsSaved] = useState(false);
  const [saveCount, setSaveCount] = useState(post.saveCount || 0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  // Check if current user has liked or saved this post
  useEffect(() => {
    if (!currentUser || !post.postId) return;
    let isMounted = true;

    const checkStatus = async () => {
      try {
        const likeRef = doc(db, 'posts', post.postId, 'likes', currentUser.uid);
        const likeSnap = await getDoc(likeRef);
        if (isMounted) setIsLiked(likeSnap.exists());

        const saveRef = doc(db, 'posts', post.postId, 'saves', currentUser.uid);
        const saveSnap = await getDoc(saveRef);
        if (isMounted) setIsSaved(saveSnap.exists());
      } catch (e) {
        console.warn("Status check note:", e);
      }
    };

    checkStatus();
    return () => { isMounted = false; };
  }, [currentUser, post.postId]);

  const handleLikeToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      navigate('/login');
      return;
    }
    if (isLiking) return;
    setIsLiking(true);

    const prevLiked = isLiked;
    const prevCount = likeCount;
    // Optimistic update
    setIsLiked(!prevLiked);
    setLikeCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);

    try {
      const postRef = doc(db, 'posts', post.postId);
      const likeRef = doc(db, 'posts', post.postId, 'likes', currentUser.uid);

      await runTransaction(db, async (tx) => {
        const pSnap = await tx.get(postRef);
        if (!pSnap.exists()) return;

        const currentLikes = pSnap.data().likeCount || 0;
        const lSnap = await tx.get(likeRef);

        if (lSnap.exists()) {
          // Unlike
          tx.delete(likeRef);
          tx.update(postRef, { likeCount: Math.max(0, currentLikes - 1) });
        } else {
          // Like
          tx.set(likeRef, { userId: currentUser.uid, createdAt: serverTimestamp() });
          tx.update(postRef, { likeCount: currentLikes + 1 });

          // Send notification if not author
          if (post.authorId !== currentUser.uid) {
            const notifRef = doc(collection(db, 'notifications'));
            tx.set(notifRef, {
              notificationId: notifRef.id,
              recipientId: post.authorId,
              senderId: currentUser.uid,
              type: 'like',
              postId: post.postId,
              message: `${userProfile?.displayName || 'Someone'} liked your post.`,
              createdAt: serverTimestamp(),
              read: false
            });
          }
        }
      });
    } catch (err) {
      console.error("Like toggle failed:", err);
      // Revert optimistic update
      setIsLiked(prevLiked);
      setLikeCount(prevCount);
    } finally {
      setIsLiking(false);
    }
  };

  const handleSaveToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const prevSaved = isSaved;
    const prevCount = saveCount;
    setIsSaved(!prevSaved);
    setSaveCount(prevSaved ? Math.max(0, prevCount - 1) : prevCount + 1);

    try {
      const postRef = doc(db, 'posts', post.postId);
      const saveRef = doc(db, 'posts', post.postId, 'saves', currentUser.uid);

      await runTransaction(db, async (tx) => {
        const pSnap = await tx.get(postRef);
        if (!pSnap.exists()) return;

        const currentSaves = pSnap.data().saveCount || 0;
        const sSnap = await tx.get(saveRef);

        if (sSnap.exists()) {
          tx.delete(saveRef);
          tx.update(postRef, { saveCount: Math.max(0, currentSaves - 1) });
        } else {
          tx.set(saveRef, { userId: currentUser.uid, createdAt: serverTimestamp() });
          tx.update(postRef, { saveCount: currentSaves + 1 });
        }
      });
    } catch (err) {
      console.error("Save toggle error:", err);
      setIsSaved(prevSaved);
      setSaveCount(prevCount);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const publicUrl = `https://iconnecto.web.app/post/${post.postId}`;
    const shareText = `Check out this post on iConnecto: ${publicUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'iConnecto',
          text: 'Check out this post on iConnecto',
          url: publicUrl
        });
      } catch (_) {}
    } else {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const publicUrl = `https://iconnecto.web.app/post/${post.postId}`;
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setMenuOpen(false);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeletePost = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to permanently delete this post?")) return;
    try {
      await deleteDoc(doc(db, 'posts', post.postId));
      if (onPostDeleted) onPostDeleted(post.postId);
    } catch (err) {
      alert("Failed to delete post: " + (err as any).message);
    }
  };

  const handleReportPost = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const reason = prompt("Why are you reporting this post? (spam, harassment, inappropriate, copyright, other):", "inappropriate");
    if (!reason) return;
    try {
      await addDoc(collection(db, 'reports'), {
        reporterId: currentUser?.uid || 'anonymous',
        targetType: 'post',
        targetId: post.postId,
        reason: reason.trim(),
        description: `Reported post: "${(post.text || '').substring(0, 80)}"`,
        createdAt: serverTimestamp(),
        status: 'pending'
      });
      alert("Thank you. This report has been submitted to the moderation team.");
      setMenuOpen(false);
    } catch (err) {
      alert("Report submission error: " + (err as any).message);
    }
  };

  const formatTimestamp = (ts: any) => {
    if (!ts) return 'Just now';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isOwnPost = currentUser?.uid === post.authorId || isAdmin;

  return (
    <article 
      onClick={() => navigate(`/post/${post.postId}`)}
      style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--bg-border)',
        padding: '16px',
        marginBottom: '16px',
        cursor: 'pointer',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        position: 'relative'
      }}
      className="post-card"
    >
      {/* Post Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div 
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/post/${post.postId}`);
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
        >
          <img 
            src={post.authorPhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'} 
            alt={post.authorName}
            style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 700, fontSize: '0.96rem', color: 'var(--text-main)' }}>
                {post.authorName}
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {formatTimestamp(post.createdAt)} • <span style={{ textTransform: 'capitalize' }}>{post.visibility || 'public'}</span>
            </div>
          </div>
        </div>

        {/* More options menu */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '50%'
            }}
            aria-label="Post Options"
          >
            <MoreHorizontal size={20} />
          </button>

          {menuOpen && (
            <div 
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                right: 0,
                top: '100%',
                background: 'var(--bg-card)',
                border: '1px solid var(--bg-border)',
                borderRadius: 'var(--radius-sm)',
                boxShadow: 'var(--shadow-md)',
                minWidth: '180px',
                zIndex: 50,
                overflow: 'hidden'
              }}
            >
              <button
                onClick={handleCopyLink}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  fontSize: '0.88rem'
                }}
              >
                {copied ? <Check size={16} color="#10B981" /> : <Copy size={16} />}
                <span>{copied ? 'Copied URL!' : 'Copy Link'}</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/post/${post.postId}`);
                }}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  fontSize: '0.88rem'
                }}
              >
                <ExternalLink size={16} />
                <span>Open Full Page</span>
              </button>

              <button
                onClick={handleReportPost}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.88rem'
                }}
              >
                <Flag size={16} />
                <span>Report Content</span>
              </button>

              {isOwnPost && (
                <button
                  onClick={handleDeletePost}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: 'var(--accent-rose)',
                    cursor: 'pointer',
                    fontSize: '0.88rem',
                    borderTop: '1px solid var(--bg-border)'
                  }}
                >
                  <Trash2 size={16} />
                  <span>Delete Post</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Post Text */}
      {post.text && (
        <p style={{
          fontSize: '0.98rem',
          lineHeight: 1.5,
          color: 'var(--text-main)',
          marginBottom: post.mediaUrl ? '12px' : '16px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}>
          {post.text}
        </p>
      )}

      {/* Post Media */}
      {post.mediaUrl && (
        <div style={{
          borderRadius: 'var(--radius-sm)',
          overflow: 'hidden',
          marginBottom: '14px',
          background: 'var(--bg-hover)',
          maxHeight: '480px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {post.mediaType === 'video' ? (
            <video 
              src={post.mediaUrl} 
              controls 
              playsInline 
              style={{ width: '100%', maxHeight: '480px', objectFit: 'contain' }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img 
              src={post.mediaUrl} 
              alt="Post content" 
              loading="lazy"
              style={{ width: '100%', maxHeight: '480px', objectFit: 'cover' }}
            />
          )}
        </div>
      )}

      {/* Post Interaction Bar */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid var(--bg-border)',
          paddingTop: '12px',
          marginTop: '4px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Like */}
          <button
            onClick={handleLikeToggle}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              color: isLiked ? 'var(--accent-rose)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 600,
              padding: '4px'
            }}
          >
            <Heart size={20} fill={isLiked ? 'var(--accent-rose)' : 'none'} />
            <span>{likeCount}</span>
          </button>

          {/* Comment */}
          <button
            onClick={() => navigate(`/post/${post.postId}`)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 600,
              padding: '4px'
            }}
          >
            <MessageCircle size={20} />
            <span>{post.commentCount || 0}</span>
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 600,
              padding: '4px'
            }}
            title="Share or Copy Link"
          >
            {copied ? <Check size={20} color="#10B981" /> : <Share2 size={20} />}
            <span>{copied ? 'Copied' : (post.shareCount || 0)}</span>
          </button>
        </div>

        {/* Save / Bookmark */}
        <button
          onClick={handleSaveToggle}
          style={{
            background: 'none',
            border: 'none',
            color: isSaved ? 'var(--primary)' : 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px'
          }}
          title={isSaved ? "Saved" : "Save post"}
        >
          <Bookmark size={20} fill={isSaved ? 'var(--primary)' : 'none'} />
        </button>
      </div>
    </article>
  );
};
