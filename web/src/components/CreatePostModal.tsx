import React, { useState, useRef } from 'react';
import { X, Image as ImageIcon, Video, Globe, Users, Lock, Loader2 } from 'lucide-react';
import { 
  doc, 
  setDoc, 
  serverTimestamp, 
  updateDoc, 
  increment 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { Post } from '../types';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: (post: Post) => void;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({ 
  isOpen, 
  onClose, 
  onPostCreated 
}) => {
  const { currentUser, userProfile } = useAuth();
  const [text, setText] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private'>('public');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'text' | 'image' | 'video'>('text');
  const [uploading, setUploading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isImage && !isVideo) {
      alert("Please select a valid image or video file.");
      return;
    }

    // Limit video size (50MB) and image (15MB)
    if (isVideo && file.size > 50 * 1024 * 1024) {
      alert("Video file size cannot exceed 50MB.");
      return;
    }
    if (isImage && file.size > 15 * 1024 * 1024) {
      alert("Image file size cannot exceed 15MB.");
      return;
    }

    setMediaFile(file);
    setMediaType(isVideo ? 'video' : 'image');

    const previewUrl = URL.createObjectURL(file);
    setMediaPreview(previewUrl);
  };

  const removeMedia = () => {
    setMediaFile(null);
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaPreview(null);
    setMediaType('text');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePublish = async () => {
    if (!currentUser) return;
    if (!text.trim() && !mediaFile) {
      alert("Please write something or attach a photo/video.");
      return;
    }

    setUploading(true);
    setProgressMsg('Uploading media...');

    try {
      const postId = 'post_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      let mediaUrl = '';

      if (mediaFile) {
        const ext = mediaFile.name.split('.').pop() || (mediaType === 'video' ? 'mp4' : 'jpg');
        const filename = mediaType === 'video' ? `video.${ext}` : `image.${ext}`;
        const storagePath = `posts/${currentUser.uid}/${postId}/${filename}`;
        const mediaRef = ref(storage, storagePath);

        await uploadBytes(mediaRef, mediaFile, { contentType: mediaFile.type });
        setProgressMsg('Generating public links...');
        mediaUrl = await getDownloadURL(mediaRef);
      }

      setProgressMsg('Publishing post to iConnecto...');

      const newPost: Post = {
        postId,
        authorId: currentUser.uid,
        authorName: userProfile?.displayName || currentUser.displayName || 'iConnecto User',
        authorPhoto: userProfile?.photoURL || currentUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80',
        text: text.trim(),
        mediaType,
        mediaUrl: mediaUrl || undefined,
        createdAt: serverTimestamp(),
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
        saveCount: 0,
        visibility
      };

      await setDoc(doc(db, 'posts', postId), newPost);

      // Increment user postsCount
      await updateDoc(doc(db, 'users', currentUser.uid), {
        postsCount: increment(1)
      });

      if (onPostCreated) {
        onPostCreated({
          ...newPost,
          createdAt: new Date()
        });
      }

      // Reset
      setText('');
      removeMedia();
      onClose();
    } catch (err: any) {
      console.error("Publishing error:", err);
      alert("Failed to publish post: " + (err.message || err));
    } finally {
      setUploading(false);
      setProgressMsg('');
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: '560px',
          border: '1px solid var(--bg-border)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--bg-border)' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Create Post</h2>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          {/* User info & Visibility picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <img 
              src={userProfile?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'} 
              alt="You" 
              style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }}
            />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{userProfile?.displayName || 'You'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <select 
                  value={visibility} 
                  onChange={(e) => setVisibility(e.target.value as any)}
                  style={{
                    background: 'var(--bg-hover)',
                    border: '1px solid var(--bg-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-main)',
                    fontSize: '0.78rem',
                    padding: '3px 8px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <option value="public">🌐 Public (Anyone on iConnecto)</option>
                  <option value="followers">👥 Followers only</option>
                  <option value="private">🔒 Private (Only me)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Text Area */}
          <textarea
            placeholder="What's happening? Share with iConnecto..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            style={{
              width: '100%',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-main)',
              fontSize: '1rem',
              lineHeight: 1.5,
              resize: 'none',
              outline: 'none',
              marginBottom: '14px'
            }}
          />

          {/* Media Preview Box */}
          {mediaPreview && (
            <div style={{ position: 'relative', borderRadius: 'var(--radius-sm)', overflow: 'hidden', maxHeight: '280px', marginBottom: '16px', background: '#000' }}>
              <button
                onClick={removeMedia}
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: 'rgba(0,0,0,0.7)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 10
                }}
              >
                <X size={16} />
              </button>
              {mediaType === 'video' ? (
                <video src={mediaPreview} controls style={{ width: '100%', maxHeight: '280px', objectFit: 'contain' }} />
              ) : (
                <img src={mediaPreview} alt="Preview" style={{ width: '100%', maxHeight: '280px', objectFit: 'cover' }} />
              )}
            </div>
          )}

          {/* Hidden File Input */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*,video/*" 
            style={{ display: 'none' }} 
          />

          {/* Media trigger bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--bg-border)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-hover)',
                  border: 'none',
                  color: 'var(--primary)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <ImageIcon size={18} />
                <span>Photo / Video</span>
              </button>
            </div>

            <button
              onClick={handlePublish}
              disabled={uploading || (!text.trim() && !mediaFile)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 24px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--primary-gradient)',
                color: '#fff',
                border: 'none',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: uploading || (!text.trim() && !mediaFile) ? 'not-allowed' : 'pointer',
                opacity: uploading || (!text.trim() && !mediaFile) ? 0.6 : 1,
                boxShadow: '0 4px 14px rgba(37,99,235,0.3)'
              }}
            >
              {uploading && <Loader2 size={18} className="animate-spin" />}
              <span>{uploading ? progressMsg || 'Posting...' : 'Post'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
