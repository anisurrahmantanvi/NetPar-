export interface UserProfile {
  uid: string;
  username: string;
  displayName: string;
  photoURL?: string;
  coverURL?: string;
  bio?: string;
  email?: string;
  createdAt: any;
  updatedAt?: any;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  role?: 'user' | 'admin';
  fcmToken?: string;
  isVerified?: boolean;
}

export interface Post {
  postId: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  text: string;
  mediaType: 'text' | 'image' | 'video';
  mediaUrl?: string;
  thumbnailUrl?: string;
  createdAt: any;
  updatedAt?: any;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  saveCount: number;
  visibility: 'public' | 'followers' | 'private';
  isLiked?: boolean;
  isSaved?: boolean;
}

export interface Comment {
  commentId: string;
  userId: string;
  username: string;
  userPhoto?: string;
  text: string;
  createdAt: any;
  updatedAt?: any;
  likeCount: number;
  parentCommentId?: string | null;
  isLiked?: boolean;
}

export interface Conversation {
  conversationId: string;
  participantIds: string[];
  lastMessage: string;
  lastMessageAt: any;
  createdAt: any;
  peerUser?: UserProfile;
}

export interface Message {
  messageId: string;
  senderId: string;
  text: string;
  mediaUrl?: string;
  mediaType?: 'text' | 'image' | 'video';
  createdAt: any;
  seen: boolean;
  seenAt?: any;
}

export interface NotificationItem {
  notificationId: string;
  recipientId: string;
  senderId: string;
  type: 'like' | 'comment' | 'follow' | 'message';
  postId?: string;
  commentId?: string;
  message: string;
  createdAt: any;
  read: boolean;
}

export interface ReportItem {
  reportId: string;
  reporterId: string;
  targetType: 'post' | 'comment' | 'user';
  targetId: string;
  reason: 'spam' | 'harassment' | 'hate' | 'violence' | 'scam' | 'nudity' | 'copyright' | 'other';
  description?: string;
  createdAt: any;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
}
