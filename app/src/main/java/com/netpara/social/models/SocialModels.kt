package com.netpara.social.models

/**
 * Data models for NetPará social media platform.
 * Designed for full compatibility with Cloud Firestore and local persistence.
 */

data class User(
    val uid: String = "",
    val username: String = "",
    val fullName: String = "",
    val email: String = "",
    val bio: String = "",
    val website: String = "",
    val avatarUrl: String = "",
    val coverUrl: String = "",
    val isVerified: Boolean = false,
    val isPremium: Boolean = false,
    val followersCount: Int = 0,
    val followingCount: Int = 0,
    val postsCount: Int = 0,
    val role: String = "user", // "user" or "admin"
    val isPrivate: Boolean = false,
    val isSuspended: Boolean = false,
    val createdAt: Long = System.currentTimeMillis()
)

data class Post(
    val id: String = "",
    val authorId: String = "",
    val authorUsername: String = "",
    val authorFullName: String = "",
    val authorAvatarUrl: String = "",
    val authorVerified: Boolean = false,
    val content: String = "",
    val mediaUrls: List<String> = emptyList(),
    val videoUrl: String? = null,
    val hashtags: List<String> = emptyList(),
    val mentions: List<String> = emptyList(),
    val likesCount: Int = 0,
    val reactionsCount: Map<String, Int> = emptyMap(), // "love" -> 12, "like" -> 5
    val commentsCount: Int = 0,
    val sharesCount: Int = 0,
    val savesCount: Int = 0,
    val isHidden: Boolean = false,
    val createdAt: Long = System.currentTimeMillis()
)

data class Comment(
    val id: String = "",
    val postId: String = "",
    val authorId: String = "",
    val authorUsername: String = "",
    val authorFullName: String = "",
    val authorAvatarUrl: String = "",
    val authorVerified: Boolean = false,
    val content: String = "",
    val parentCommentId: String? = null,
    val likesCount: Int = 0,
    val createdAt: Long = System.currentTimeMillis()
)

data class Reaction(
    val id: String = "",
    val targetType: String = "post", // "post" or "comment"
    val targetId: String = "",
    val userId: String = "",
    val type: String = "like", // "like", "love", "haha", "wow", "sad", "angry"
    val createdAt: Long = System.currentTimeMillis()
)

data class Follow(
    val followerId: String = "",
    val followingId: String = "",
    val createdAt: Long = System.currentTimeMillis()
)

data class Message(
    val id: String = "",
    val conversationId: String = "",
    val senderId: String = "",
    val receiverId: String = "",
    val text: String = "",
    val mediaUrl: String? = null,
    val isRead: Boolean = false,
    val createdAt: Long = System.currentTimeMillis()
)

data class Conversation(
    val id: String = "",
    val participantIds: List<String> = emptyList(),
    val lastMessageText: String = "",
    val lastMessageTimestamp: Long = System.currentTimeMillis(),
    val unreadCount: Int = 0
)

data class Notification(
    val id: String = "",
    val recipientId: String = "",
    val actorId: String = "",
    val actorUsername: String = "",
    val actorAvatarUrl: String = "",
    val type: String = "like", // "follow", "like", "comment", "reply", "mention", "message", "system"
    val targetId: String? = null,
    val contentPreview: String = "",
    val isRead: Boolean = false,
    val createdAt: Long = System.currentTimeMillis()
)

data class Report(
    val id: String = "",
    val reporterId: String = "",
    val targetType: String = "post", // "post", "user", "comment"
    val targetId: String = "",
    val targetAuthorId: String = "",
    val category: String = "spam", // spam, harassment, hate, violence, nudity, scam, copyright, other
    val details: String = "",
    val status: String = "pending", // "pending", "reviewed", "dismissed", "action_taken"
    val createdAt: Long = System.currentTimeMillis()
)

data class AdminAction(
    val id: String = "",
    val adminId: String = "",
    val actionType: String = "", // "delete_post", "suspend_user", "ban_user", "broadcast_announcement"
    val targetId: String = "",
    val reason: String = "",
    val timestamp: Long = System.currentTimeMillis()
)
