/**
 * NetPará Backend Architecture & Local Persistence Engine
 * Compatible with Firebase Auth, Cloud Firestore & Cloud Storage schemas.
 */

const NetParaBackend = (function () {
  const DB_KEY = "netpara_production_db_v1";

  // Default seed database with rich, realistic content
  const defaultDatabase = {
    users: [
      {
        uid: "user_me",
        username: "alex_silva",
        fullName: "Alex Silva",
        email: "alex@netpara.social",
        bio: "Explorer & Photographer from Belém, Pará 📸 Building the future of Amazonian tech! 🌴✨",
        website: "https://netpara.social/alex",
        avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
        coverUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
        isVerified: true,
        isPremium: true,
        followersCount: 1420,
        followingCount: 382,
        postsCount: 18,
        role: "admin", // Allows testing admin moderation!
        isPrivate: false,
        blockedUsers: [],
        savedPostIds: ["post_2"],
        createdAt: Date.now() - 86400000 * 30
      },
      {
        uid: "user_mariana",
        username: "mariana_costa",
        fullName: "Mariana Costa",
        email: "mariana@example.com",
        bio: "Gastronomy lover & Cultural journalist in Pará 🍲 Açaí, Tacacá & Amazonian roots.",
        website: "https://culinariapara.com",
        avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
        coverUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80",
        isVerified: true,
        isPremium: false,
        followersCount: 8930,
        followingCount: 410,
        postsCount: 54,
        role: "user",
        isPrivate: false,
        blockedUsers: [],
        savedPostIds: [],
        createdAt: Date.now() - 86400000 * 45
      },
      {
        uid: "user_tiago",
        username: "tiago_dev",
        fullName: "Tiago Mendes",
        email: "tiago@tech.io",
        bio: "Software Architect | Mobile & AI Enthusiast 🚀 Sharing code & Amazon startups.",
        website: "https://github.com/tiago",
        avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
        coverUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80",
        isVerified: false,
        isPremium: false,
        followersCount: 3100,
        followingCount: 220,
        postsCount: 32,
        role: "user",
        isPrivate: false,
        blockedUsers: [],
        savedPostIds: [],
        createdAt: Date.now() - 86400000 * 15
      }
    ],
    stories: [
      {
        id: "story_1",
        authorId: "user_me",
        authorName: "Your Story",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
        mediaUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
        isOwn: true
      },
      {
        id: "story_2",
        authorId: "user_mariana",
        authorName: "mariana_costa",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
        mediaUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
        isOwn: false
      },
      {
        id: "story_3",
        authorId: "user_tiago",
        authorName: "tiago_dev",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
        mediaUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80",
        isOwn: false
      }
    ],
    posts: [
      {
        id: "post_1",
        authorId: "user_mariana",
        content: "A golden sunset over Guajará Bay in Belém today! ✨ Watching the riverboats come in never gets old. Have you visited Ver-o-Peso market this week? #NetPara #Amazonia #Belem #SunsetVibes",
        mediaUrls: [
          "https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=1000&q=80",
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80"
        ],
        videoUrl: null,
        likesCount: 248,
        reactions: { "love": 180, "like": 68 },
        userReactions: { "user_me": "love" },
        commentsCount: 29,
        sharesCount: 14,
        savesCount: 52,
        createdAt: Date.now() - 3600000 * 3
      },
      {
        id: "post_2",
        authorId: "user_tiago",
        content: "Excited to unveil our newest open-source toolkit optimized for high-performance mobile apps across Brazil and Latin America! 🚀 Speed, resilience in low connectivity, and smooth animations. What tech stack are you rocking in 2026? #TechBrazil #CodingLife #MobileDev @alex_silva",
        mediaUrls: [
          "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1000&q=80"
        ],
        videoUrl: null,
        likesCount: 194,
        reactions: { "like": 140, "wow": 54 },
        userReactions: {},
        commentsCount: 16,
        sharesCount: 31,
        savesCount: 88,
        createdAt: Date.now() - 3600000 * 7
      },
      {
        id: "post_3",
        authorId: "user_me",
        content: "Exploring Ilha do Combu! Pure rainforest vibes, handmade chocolate, and peace of mind. Highly recommend taking the boat tour on weekends. 🌿🛶 #Nature #NetPará #TravelPará",
        mediaUrls: [
          "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1000&q=80"
        ],
        videoUrl: null,
        likesCount: 412,
        reactions: { "love": 310, "like": 102 },
        userReactions: {},
        commentsCount: 42,
        sharesCount: 22,
        savesCount: 104,
        createdAt: Date.now() - 3600000 * 22
      }
    ],
    reels: [
      {
        id: "reel_1",
        authorId: "user_mariana",
        caption: "Making authentic Tucupi with jambu! Experience the tingling sensation ✨🍲 #ParaGastronomy #AmazonFood",
        videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4",
        musicTitle: "Carimbó Moderno - Ritmo Amazônico",
        likesCount: 1240,
        commentsCount: 89,
        sharesCount: 140,
        isLiked: false
      },
      {
        id: "reel_2",
        authorId: "user_tiago",
        caption: "A day in the life of a tech creator in Belém 💻🌴 Sunrise coding to sunset views.",
        videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-water-1164-large.mp4",
        musicTitle: "Lo-Fi Beats - Amazon Sunset",
        likesCount: 3410,
        commentsCount: 215,
        sharesCount: 480,
        isLiked: true
      }
    ],
    comments: [
      {
        id: "comm_1",
        postId: "post_1",
        authorId: "user_tiago",
        text: "The colors in Belém are unbeatable! Great capture Mariana 👏",
        likesCount: 14,
        isLiked: false,
        parentId: null,
        createdAt: Date.now() - 3600000 * 2
      },
      {
        id: "comm_2",
        postId: "post_1",
        authorId: "user_me",
        text: "Was there this morning, the açai fresh from the islands was incredible!",
        likesCount: 22,
        isLiked: true,
        parentId: null,
        createdAt: Date.now() - 3600000 * 1
      },
      {
        id: "comm_3",
        postId: "post_1",
        authorId: "user_mariana",
        text: "@alex_silva Best combination in the world! 🙌",
        likesCount: 9,
        isLiked: false,
        parentId: "comm_2",
        createdAt: Date.now() - 1800000
      }
    ],
    conversations: [
      {
        id: "conv_1",
        participantId: "user_mariana",
        lastMessage: "See you at the cultural festival on Saturday! 🎉",
        timestamp: Date.now() - 1800000,
        unreadCount: 1
      },
      {
        id: "conv_2",
        participantId: "user_tiago",
        lastMessage: "Sent you the repository link for the new Android build.",
        timestamp: Date.now() - 86400000,
        unreadCount: 0
      }
    ],
    messages: [
      {
        id: "msg_1",
        convId: "conv_1",
        senderId: "user_mariana",
        receiverId: "user_me",
        text: "Hey Alex! Are you going to the Estação das Docas festival this weekend?",
        createdAt: Date.now() - 3600000 * 2,
        isRead: true
      },
      {
        id: "msg_2",
        convId: "conv_1",
        senderId: "user_me",
        receiverId: "user_mariana",
        text: "Hey Mariana! Yes, definitely going around 5 PM.",
        createdAt: Date.now() - 3600000 * 1.5,
        isRead: true
      },
      {
        id: "msg_3",
        convId: "conv_1",
        senderId: "user_mariana",
        receiverId: "user_me",
        text: "Awesome! See you at the cultural festival on Saturday! 🎉",
        createdAt: Date.now() - 1800000,
        isRead: false
      }
    ],
    notifications: [
      {
        id: "notif_1",
        type: "like",
        actorId: "user_mariana",
        content: "liked your photo in Ilha do Combu",
        targetId: "post_3",
        time: Date.now() - 3600000,
        isRead: false
      },
      {
        id: "notif_2",
        type: "follow",
        actorId: "user_tiago",
        content: "started following you",
        targetId: "user_tiago",
        time: Date.now() - 3600000 * 5,
        isRead: false
      },
      {
        id: "notif_3",
        type: "comment",
        actorId: "user_mariana",
        content: "commented: 'Best combination in the world! 🙌'",
        targetId: "post_1",
        time: Date.now() - 86400000,
        isRead: true
      }
    ],
    reports: [
      {
        id: "rep_101",
        targetType: "post",
        targetId: "post_2",
        reporterId: "user_mariana",
        category: "spam",
        details: "Automated link testing report",
        status: "pending",
        createdAt: Date.now() - 7200000
      }
    ],
    announcements: [
      {
        id: "anc_1",
        title: "Welcome to NetPará 1.0!",
        content: "Experience the fastest social connection network in Brazil. Explore reels, share posts, and connect with creators.",
        timestamp: Date.now() - 86400000 * 2
      }
    ]
  };

  function loadDb() {
    try {
      const stored = localStorage.getItem(DB_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn("Error loading stored db, using defaults", e);
    }
    saveDb(defaultDatabase);
    return JSON.parse(JSON.stringify(defaultDatabase));
  }

  function saveDb(data) {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Storage save failed", e);
    }
  }

  let db = loadDb();

  return {
    getDb: () => db,
    save: () => saveDb(db),
    reset: () => {
      db = JSON.parse(JSON.stringify(defaultDatabase));
      saveDb(db);
    },

    // Users
    getUser: (uid) => db.users.find(u => u.uid === uid) || null,
    getCurrentUser: () => db.users.find(u => u.uid === "user_me"),
    updateUser: (uid, patch) => {
      const idx = db.users.findIndex(u => u.uid === uid);
      if (idx !== -1) {
        db.users[idx] = { ...db.users[idx], ...patch };
        saveDb(db);
        return db.users[idx];
      }
      return null;
    },

    // Posts
    getPosts: () => [...db.posts].sort((a,b) => b.createdAt - a.createdAt),
    createPost: (post) => {
      const newPost = {
        id: "post_" + Date.now(),
        authorId: "user_me",
        content: post.content,
        mediaUrls: post.mediaUrls || [],
        videoUrl: post.videoUrl || null,
        likesCount: 0,
        reactions: {},
        userReactions: {},
        commentsCount: 0,
        sharesCount: 0,
        savesCount: 0,
        createdAt: Date.now()
      };
      db.posts.unshift(newPost);
      // Increment user postsCount
      const me = db.users.find(u => u.uid === "user_me");
      if (me) me.postsCount = (me.postsCount || 0) + 1;
      saveDb(db);
      return newPost;
    },
    deletePost: (postId) => {
      db.posts = db.posts.filter(p => p.id !== postId);
      saveDb(db);
    },
    toggleReaction: (postId, reactionType) => {
      const post = db.posts.find(p => p.id === postId);
      if (!post) return null;
      if (!post.reactions) post.reactions = {};
      if (!post.userReactions) post.userReactions = {};

      const currentReaction = post.userReactions["user_me"];
      if (currentReaction === reactionType) {
        // Remove reaction
        delete post.userReactions["user_me"];
        post.reactions[reactionType] = Math.max(0, (post.reactions[reactionType] || 1) - 1);
        post.likesCount = Math.max(0, (post.likesCount || 1) - 1);
      } else {
        // Change or add
        if (currentReaction) {
          post.reactions[currentReaction] = Math.max(0, (post.reactions[currentReaction] || 1) - 1);
        } else {
          post.likesCount = (post.likesCount || 0) + 1;
        }
        post.userReactions["user_me"] = reactionType;
        post.reactions[reactionType] = (post.reactions[reactionType] || 0) + 1;
      }
      saveDb(db);
      return post;
    },
    toggleSavePost: (postId) => {
      const me = db.users.find(u => u.uid === "user_me");
      if (!me) return false;
      if (!me.savedPostIds) me.savedPostIds = [];
      const idx = me.savedPostIds.indexOf(postId);
      let saved = false;
      if (idx !== -1) {
        me.savedPostIds.splice(idx, 1);
        saved = false;
      } else {
        me.savedPostIds.push(postId);
        saved = true;
      }
      saveDb(db);
      return saved;
    },

    // Follow System
    toggleFollow: (targetUid) => {
      const me = db.users.find(u => u.uid === "user_me");
      const target = db.users.find(u => u.uid === targetUid);
      if (!me || !target) return { isFollowing: false };

      if (!me.followingList) me.followingList = ["user_mariana", "user_tiago"];
      const isFollowing = me.followingList.includes(targetUid);

      if (isFollowing) {
        me.followingList = me.followingList.filter(id => id !== targetUid);
        me.followingCount = Math.max(0, me.followingCount - 1);
        target.followersCount = Math.max(0, target.followersCount - 1);
      } else {
        me.followingList.push(targetUid);
        me.followingCount = (me.followingCount || 0) + 1;
        target.followersCount = (target.followersCount || 0) + 1;
      }
      saveDb(db);
      return { isFollowing: !isFollowing, followersCount: target.followersCount };
    },

    // Comments
    getComments: (postId) => db.comments.filter(c => c.postId === postId),
    addComment: (postId, text, parentId = null) => {
      const comment = {
        id: "comm_" + Date.now(),
        postId,
        authorId: "user_me",
        text,
        parentId,
        likesCount: 0,
        isLiked: false,
        createdAt: Date.now()
      };
      db.comments.push(comment);
      const post = db.posts.find(p => p.id === postId);
      if (post) post.commentsCount = (post.commentsCount || 0) + 1;
      saveDb(db);
      return comment;
    },

    // Chat / Messages
    getConversations: () => db.conversations,
    getMessages: (convId) => db.messages.filter(m => m.convId === convId),
    sendMessage: (convId, text, mediaUrl = null) => {
      const conv = db.conversations.find(c => c.id === convId);
      const receiverId = conv ? conv.participantId : "user_mariana";
      const msg = {
        id: "msg_" + Date.now(),
        convId,
        senderId: "user_me",
        receiverId,
        text,
        mediaUrl,
        createdAt: Date.now(),
        isRead: false
      };
      db.messages.push(msg);
      if (conv) {
        conv.lastMessage = text || "Sent an attachment";
        conv.timestamp = Date.now();
      }
      saveDb(db);
      return msg;
    },

    // Notifications
    getNotifications: () => db.notifications,
    markNotificationRead: (id) => {
      const n = db.notifications.find(x => x.id === id);
      if (n) {
        n.isRead = true;
        saveDb(db);
      }
    },
    markAllNotificationsRead: () => {
      db.notifications.forEach(n => n.isRead = true);
      saveDb(db);
    },

    // Reports & Admin
    submitReport: (report) => {
      const rep = {
        id: "rep_" + Date.now(),
        ...report,
        reporterId: "user_me",
        status: "pending",
        createdAt: Date.now()
      };
      db.reports.push(rep);
      saveDb(db);
      return rep;
    },
    getAdminStats: () => ({
      totalUsers: db.users.length,
      totalPosts: db.posts.length,
      pendingReports: db.reports.filter(r => r.status === "pending").length,
      suspendedUsers: db.users.filter(u => u.isSuspended).length
    }),
    getReports: () => db.reports,
    resolveReport: (reportId, action) => {
      const rep = db.reports.find(r => r.id === reportId);
      if (!rep) return false;
      rep.status = "resolved";
      rep.resolvedAction = action;

      if (action === "delete_content" && rep.targetType === "post") {
        db.posts = db.posts.filter(p => p.id !== rep.targetId);
      } else if (action === "suspend_user") {
        const u = db.users.find(usr => usr.uid === rep.targetAuthorId);
        if (u) u.isSuspended = true;
      }
      saveDb(db);
      return true;
    }
  };
})();
