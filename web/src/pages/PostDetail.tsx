import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Heart, 
  Share2, 
  Bookmark, 
  ArrowLeft, 
  Send, 
  Trash2, 
  Copy, 
  Check, 
  Lock, 
  AlertCircle, 
  Loader2, 
  CornerDownRight, 
  ThumbsUp, 
  LogIn 
} from 'lucide-react';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  serverTimestamp, 
  runTransaction,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Post, Comment } from '../types';
import { useAuth } from '../context/AuthContext';

export const PostDetail: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const { currentUser, userProfile, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isPrivateDenied, setIsPrivateDenied] = useState(false);

  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [saveCount, setSaveCount] = useState(0);
  const [copied, setCopied] = useState(false);

  // New Comment state
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);

  // Load post details from Cloud Firestore
  useEffect(() => {
    if (!postId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setNotFound(false);
    setIsPrivateDenied(false);

    let isMounted = true;
    const postRef = doc(db, 'posts', postId);

    // Real-time snapshot listener on Post doc
    const unsubPost = onSnapshot(postRef, (snap) => {
      if (!isMounted) return;
      if (!snap.exists()) {
        setNotFound(true);
        setPost(null);
        setLoading(false);
        return;
      }

      const data = snap.data() as Post;
      const loadedPost: Post = {
        ...data,
        postId: snap.id
      };

      // Check privacy: If private and not author
      if (loadedPost.visibility === 'private') {
        const isAuthor = currentUser?.uid === loadedPost.authorId || isAdmin;
        if (!isAuthor) {
          setIsPrivateDenied(true);
          setPost(null);
          setLoading(false);
          return;
        }
      }

      setPost(loadedPost);
      setLikeCount(loadedPost.likeCount || 0);
      setSaveCount(loadedPost.saveCount || 0);
      setLoading(false);
    }, (err) => {
      console.warn("Post snapshot error:", err);
      if (isMounted) {
        setNotFound(true);
        setLoading(false);
      }
    });

    // Real-time comments listener
    const commentsRef = collection(db, 'posts', postId, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'asc'));
    const unsubComments = onSnapshot(q, (snap) => {
      if (!isMounted) return;
      const list: Comment[] = [];
      snap.forEach(d => {
        list.push({ ...d.data(), commentId: d.id } as Comment);
      });
      setComments(list);
    }, (e) => {
      console.warn("Comments listener note:", e);
    });

    return () => {
      isMounted = false;
      unsubPost();
      unsubComments();
    };
  }, [postId, currentUser, isAdmin]);

  // Check like & save status for authenticated user
  useEffect(() => {
    if (!currentUser || !postId) return;
    let isMounted = true;

    const checkLikedAndSaved = async () => {
      try {
        const likeRef = doc(db, 'posts', postId, 'likes', currentUser.uid);
        const lSnap = await getDoc(likeRef);
        if (isMounted) setIsLiked(lSnap.exists());

        const saveRef = doc(db, 'posts', postId, 'saves', currentUser.uid);
        const sSnap = await getDoc(saveRef);
        if (isMounted) setIsSaved(sSnap.exists());
      } catch (_) {}
    };

    checkLikedAndSaved();
    return () => { isMounted = false; };
  }, [currentUser, postId]);

  const handleLikeToggle = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    if (!post || !postId) return;

    const prevLiked = isLiked;
    const prevCount = likeCount;
    setIsLiked(!prevLiked);
    setLikeCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);

    try {
      const postRef = doc(db, 'posts', postId);
      const likeRef = doc(db, 'posts', postId, 'likes', currentUser.uid);

      await runTransaction(db, async (tx) => {
        const pSnap = await tx.get(postRef);
        if (!pSnap.exists()) return;
        const curLikes = pSnap.data().likeCount || 0;
        const lSnap = await tx.get(likeRef);

        if (lSnap.exists()) {
          tx.delete(likeRef);
          tx.update(postRef, { likeCount: Math.max(0, curLikes - 1) });
        } else {
          tx.set(likeRef, { userId: currentUser.uid, createdAt: serverTimestamp() });
          tx.update(postRef, { likeCount: curLikes + 1 });
        }
      });
    } catch (e) {
      console.error("Like toggle err:", e);
      setIsLiked(prevLiked);
      setLikeCount(prevCount);
    }
  };

  const handleSaveToggle = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    if (!post || !postId) return;

    const prevSaved = isSaved;
    const prevCount = saveCount;
    setIsSaved(!prevSaved);
    setSaveCount(prevSaved ? Math.max(0, prevCount - 1) : prevCount + 1);

    try {
      const postRef = doc(db, 'posts', postId);
      const saveRef = doc(db, 'posts', postId, 'saves', currentUser.uid);

      await runTransaction(db, async (tx) => {
        const pSnap = await tx.get(postRef);
        if (!pSnap.exists()) return;
        const curSaves = pSnap.data().saveCount || 0;
        const sSnap = await tx.get(saveRef);

        if (sSnap.exists()) {
          tx.delete(saveRef);
          tx.update(postRef, { saveCount: Math.max(0, curSaves - 1) });
        } else {
          tx.set(saveRef, { userId: currentUser.uid, createdAt: serverTimestamp() });
          tx.update(postRef, { saveCount: curSaves + 1 });
        }
      });
    } catch (e) {
      setIsSaved(prevSaved);
      setSaveCount(prevCount);
    }
  };

  const handleShare = async () => {
    const publicUrl = `https://iconnecto.web.app/post/${postId}`;
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

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      navigate('/login');
      return;
    }
    if (!commentText.trim() || !postId) return;

    setSubmittingComment(true);
    try {
      const commentsRef = collection(db, 'posts', postId, 'comments');
      const postRef = doc(db, 'posts', postId);

      const newCommentData = {
        userId: currentUser.uid,
        username: userProfile?.username || currentUser.displayName || 'user',
        userPhoto: userProfile?.photoURL || currentUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80',
        text: commentText.trim(),
        createdAt: serverTimestamp(),
        likeCount: 0,
        parentCommentId: replyingTo ? replyingTo.commentId : null
      };

      await addDoc(commentsRef, newCommentData);

      // Increment commentCount
      await runTransaction(db, async (tx) => {
        const pSnap = await tx.get(postRef);
        if (pSnap.exists()) {
          const cur = pSnap.data().commentCount || 0;
          tx.update(postRef, { commentCount: cur + 1 });
        }
      });

      setCommentText('');
      setReplyingTo(null);
    } catch (err: any) {
      alert("Failed to post comment: " + err.message);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm("Delete this comment?")) return;
    if (!postId) return;

    try {
      await deleteDoc(doc(db, 'posts', postId, 'comments', commentId));
      const postRef = doc(db, 'posts', postId);
      await runTransaction(db, async (tx) => {
        const pSnap = await tx.get(postRef);
        if (pSnap.exists()) {
          const cur = pSnap.data().commentCount || 0;
          tx.update(postRef, { commentCount: Math.max(0, cur - 1) });
        }
      });
    } catch (err: any) {
      alert("Error deleting comment: " + err.message);
    }
  };

  const formatTimestamp = (ts: any) => {
    if (!ts) return 'Just now';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="main-feed-area" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '24px' }}>
        <Loader2 size={36} className="animate-spin" color="var(--primary)" />
        <p style={{ marginTop: '14px', color: 'var(--text-muted)', fontSize: '0.95rem' }}>Loading post from iConnecto...</p>
      </div>
    );
  }

  // 2. Private Post Access Denied
  if (isPrivateDenied) {
    return (
      <div className="main-feed-area" style={{ padding: '24px' }}>
        <button 
          onClick={() => navigate('/home')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', marginBottom: '20px' }}
        >
          <ArrowLeft size={18} /> Back to Feed
        </button>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 'var(--radius-lg)', padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Lock size={32} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px' }}>Private Post</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', maxWidth: '380px', margin: '0 auto 20px' }}>
            This post's visibility is restricted to the author or authorized followers.
          </p>
          {!currentUser && (
            <button
              onClick={() => navigate('/login')}
              style={{ background: 'var(--primary-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', padding: '10px 22px', fontWeight: 700, cursor: 'pointer' }}
            >
              Sign In to iConnecto
            </button>
          )}
        </div>
      </div>
    );
  }

  // 3. Post Not Found
  if (notFound || !post) {
    return (
      <div className="main-feed-area" style={{ padding: '24px' }}>
        <button 
          onClick={() => navigate('/home')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', marginBottom: '20px' }}
        >
          <ArrowLeft size={18} /> Back to Feed
        </button>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 'var(--radius-lg)', padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--bg-hover)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <AlertCircle size={32} />
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '8px' }}>Post Not Found</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', maxWidth: '380px', margin: '0 auto 24px' }}>
            The post you are looking for may have been removed, deleted, or the link is incorrect.
          </p>
          <button
            onClick={() => navigate('/home')}
            style={{ background: 'var(--primary-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', padding: '10px 24px', fontWeight: 700, cursor: 'pointer' }}
          >
            Explore Recent Posts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="main-feed-area" style={{ padding: '16px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <button 
          onClick={() => navigate(-1)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            color: 'var(--text-main)',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: 'pointer',
            padding: '6px'
          }}
        >
          <ArrowLeft size={20} />
          <span>Post</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleShare}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--bg-hover)',
              border: '1px solid var(--bg-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 12px',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--text-main)',
              cursor: 'pointer'
            }}
          >
            {copied ? <Check size={16} color="#10B981" /> : <Copy size={16} />}
            <span>{copied ? 'Link Copied' : 'Share Link'}</span>
          </button>
        </div>
      </div>

      {/* Main Post Card */}
      <div 
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--bg-border)',
          padding: '24px',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '20px'
        }}
      >
        {/* Author info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
          <img 
            src={post.authorPhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80'} 
            alt={post.authorName}
            style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
          />
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)' }}>
              {post.authorName}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {formatTimestamp(post.createdAt)} • <span style={{ textTransform: 'capitalize' }}>{post.visibility || 'public'}</span>
            </div>
          </div>
        </div>

        {/* Post Text */}
        {post.text && (
          <p style={{
            fontSize: '1.05rem',
            lineHeight: 1.6,
            color: 'var(--text-main)',
            marginBottom: post.mediaUrl ? '16px' : '20px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {post.text}
          </p>
        )}

        {/* Media */}
        {post.mediaUrl && (
          <div style={{
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            marginBottom: '20px',
            background: '#000',
            maxHeight: '560px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {post.mediaType === 'video' ? (
              <video src={post.mediaUrl} controls autoPlay muted playsInline style={{ width: '100%', maxHeight: '560px', objectFit: 'contain' }} />
            ) : (
              <img src={post.mediaUrl} alt="Post media" style={{ width: '100%', maxHeight: '560px', objectFit: 'contain' }} />
            )}
          </div>
        )}

        {/* Action Counters & Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--bg-border)', borderBottom: '1px solid var(--bg-border)', padding: '12px 4px', margin: '14px 0' }}>
          <div style={{ display: 'flex', gap: '20px' }}>
            {/* Like */}
            <button
              onClick={handleLikeToggle}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'none',
                border: 'none',
                color: isLiked ? 'var(--accent-rose)' : 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: 600
              }}
            >
              <Heart size={22} fill={isLiked ? 'var(--accent-rose)' : 'none'} />
              <span>{likeCount} Likes</span>
            </button>

            {/* Comments count */}
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 600 }}>
              <span>💬 {comments.length} Comments</span>
            </span>
          </div>

          <div style={{ display: 'flex', gap: '14px' }}>
            <button
              onClick={handleShare}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              title="Share"
            >
              <Share2 size={20} />
            </button>
            <button
              onClick={handleSaveToggle}
              style={{ background: 'none', border: 'none', color: isSaved ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
              title={isSaved ? "Saved" : "Save"}
            >
              <Bookmark size={20} fill={isSaved ? 'var(--primary)' : 'none'} />
            </button>
          </div>
        </div>

        {/* Public Share URL Box */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginTop: '12px' }}>
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            https://iconnecto.web.app/post/{post.postId}
          </div>
          <button
            onClick={handleShare}
            style={{
              background: 'var(--primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              marginLeft: '8px',
              flexShrink: 0
            }}
          >
            {copied ? 'Copied!' : 'Copy Post Link'}
          </button>
        </div>
      </div>

      {/* Comments Section */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--bg-border)', padding: '20px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '16px' }}>
          Comments ({comments.length})
        </h3>

        {/* Add Comment Input or Sign In Prompt */}
        {currentUser ? (
          <form onSubmit={handleAddComment} style={{ marginBottom: '24px' }}>
            {replyingTo && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-hover)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', marginBottom: '8px', fontSize: '0.82rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Replying to @{replyingTo.username}</span>
                <button 
                  type="button" 
                  onClick={() => setReplyingTo(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer', fontWeight: 700 }}
                >
                  Cancel
                </button>
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <img 
                src={userProfile?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80'} 
                alt="You"
                style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <input
                type="text"
                placeholder={replyingTo ? `Write a reply to @${replyingTo.username}...` : "Write a comment..."}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                style={{
                  flex: 1,
                  background: 'var(--bg-hover)',
                  border: '1px solid var(--bg-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  color: 'var(--text-main)',
                  outline: 'none',
                  fontSize: '0.9rem'
                }}
              />
              <button
                type="submit"
                disabled={submittingComment || !commentText.trim()}
                style={{
                  background: 'var(--primary-gradient)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 18px',
                  fontWeight: 700,
                  cursor: submittingComment || !commentText.trim() ? 'not-allowed' : 'pointer',
                  opacity: submittingComment || !commentText.trim() ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Send size={16} />
              </button>
            </div>
          </form>
        ) : (
          <div style={{ background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', padding: '16px', textAlign: 'center', marginBottom: '24px' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Log in or register to like, comment, and connect with people on iConnecto.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                onClick={() => navigate('/login')}
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
                Sign In
              </button>
              <button
                onClick={() => navigate('/register')}
                style={{
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--bg-border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 18px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                Register
              </button>
            </div>
          </div>
        )}

        {/* Comments List */}
        {comments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No comments yet. Be the first to share your thoughts!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {comments.map((c) => {
              const isOwnComment = currentUser?.uid === c.userId || isAdmin;
              return (
                <div 
                  key={c.commentId}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    marginLeft: c.parentCommentId ? '36px' : 0,
                    borderLeft: c.parentCommentId ? '2px solid var(--bg-border)' : 'none',
                    paddingLeft: c.parentCommentId ? '12px' : 0
                  }}
                >
                  <img 
                    src={c.userPhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=60&q=80'} 
                    alt={c.username}
                    style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>@{c.username}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{formatTimestamp(c.createdAt)}</span>
                      </div>
                      <p style={{ fontSize: '0.9rem', lineHeight: 1.4, wordBreak: 'break-word' }}>{c.text}</p>
                    </div>

                    {/* Comment action footer */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '4px', paddingLeft: '8px', fontSize: '0.78rem' }}>
                      {currentUser && (
                        <button
                          onClick={() => setReplyingTo(c)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <CornerDownRight size={13} /> Reply
                        </button>
                      )}
                      {isOwnComment && (
                        <button
                          onClick={() => handleDeleteComment(c.commentId)}
                          style={{ background: 'none', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
