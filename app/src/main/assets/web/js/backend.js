/**
 * NetPará Backend Architecture & Local Persistence Engine
 * Compatible with Firebase Auth, Cloud Firestore & Cloud Storage schemas.
 */

const NetParaBackend = (function () {
  const DB_KEY = "netpara_production_db_v2";

  // Default seed database with rich, realistic content
  const defaultDatabase = {
    users: [
      {
        uid: "user_me",
        username: "anisur_tanvi",
        fullName: "Anisur Rahman",
        nickname: "Tanvi",
        email: "anisurrahmantanvi@gmail.com",
        bio: "Tech enthusiast & digital creator 🚀 Welcome to my verified NetPará profile! ✨🇧🇩",
        website: "https://netpara.social/tanvi",
        avatarUrl: "img/avatar_anisur_tanvi.jpg",
        coverUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
        isVerified: true,
        isPremium: true,
        followersCount: 4850,
        followingCount: 382,
        postsCount: 18,
        friendsCount: 152,
        friendsList: ["user_mariana", "user_tiago", "user_beatriz"],
        city: "Dhaka",
        hometown: "Dhaka, Bangladesh",
        work: "Software Engineer & Creator",
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
        friendsCount: 156,
        friendsList: ["user_me", "user_tiago"],
        city: "Belém, Pará",
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
        friendsCount: 94,
        friendsList: ["user_me", "user_mariana"],
        city: "Castanhal, Pará",
        postsCount: 32,
        role: "user",
        isPrivate: false,
        blockedUsers: [],
        savedPostIds: [],
        createdAt: Date.now() - 86400000 * 15
      },
      {
        uid: "user_camila",
        username: "camila_dance",
        fullName: "Camila Santos",
        email: "camila@netpara.social",
        bio: "Carimbó & Brega dancer 💃 Sharing Pará rhythms with the world! ✨",
        website: "https://instagram.com/camila_dance",
        avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
        coverUrl: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80",
        isVerified: true,
        isPremium: true,
        followersCount: 15400,
        followingCount: 512,
        friendsCount: 310,
        friendsList: ["user_mariana"],
        city: "Belém, Pará",
        postsCount: 42,
        role: "user",
        isPrivate: false,
        blockedUsers: [],
        savedPostIds: [],
        createdAt: Date.now() - 86400000 * 60
      },
      {
        uid: "user_lucas",
        username: "lucas_amazon",
        fullName: "Lucas Oliveira",
        email: "lucas@ecotour.br",
        bio: "Eco-guide in Alter do Chão & Tapajós 🌴 River explorer & wildlife preservation.",
        website: "https://tapajosguide.com",
        avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
        coverUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
        isVerified: false,
        isPremium: false,
        followersCount: 4200,
        followingCount: 380,
        friendsCount: 180,
        friendsList: ["user_tiago"],
        city: "Santarém, Pará",
        postsCount: 29,
        role: "user",
        isPrivate: false,
        blockedUsers: [],
        savedPostIds: [],
        createdAt: Date.now() - 86400000 * 40
      },
      {
        uid: "user_beatriz",
        username: "beatriz_marajo",
        fullName: "Beatriz Lima",
        email: "beatriz@art.br",
        bio: "Ceramics & Visual Artist inspired by Marajoara ancestral patterns 🏺🎨",
        website: "https://arteparamarajo.com",
        avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
        coverUrl: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=80",
        isVerified: true,
        isPremium: false,
        followersCount: 7800,
        followingCount: 290,
        friendsCount: 215,
        friendsList: ["user_me"],
        city: "Soure, Ilha do Marajó",
        postsCount: 36,
        role: "user",
        isPrivate: false,
        blockedUsers: [],
        savedPostIds: [],
        createdAt: Date.now() - 86400000 * 25
      },
      {
        uid: "user_rodrigo",
        username: "rodrigo_farias",
        fullName: "Rodrigo Farias",
        email: "rodrigo@startup.pa",
        bio: "Product Designer & Community Builder 📱 Innovating from the heart of the Amazon.",
        website: "https://rodrigodesign.pa",
        avatarUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&q=80",
        coverUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
        isVerified: false,
        isPremium: false,
        followersCount: 2100,
        followingCount: 190,
        friendsCount: 140,
        friendsList: ["user_tiago", "user_mariana"],
        city: "Belém, Pará",
        postsCount: 19,
        role: "user",
        isPrivate: false,
        blockedUsers: [],
        savedPostIds: [],
        createdAt: Date.now() - 86400000 * 18
      },
      {
        uid: "user_gabriel",
        username: "gabriel_rocha",
        fullName: "Gabriel Rocha",
        email: "gabriel@music.pa",
        bio: "Guitarist & Composer 🎸 Blending Amazonian Guitarrada with modern indie rock.",
        website: "https://gabrielrocha.com",
        avatarUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80",
        coverUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80",
        isVerified: false,
        isPremium: false,
        followersCount: 3600,
        followingCount: 420,
        friendsCount: 260,
        friendsList: [],
        city: "Ananindeua, Pará",
        postsCount: 27,
        role: "user",
        isPrivate: false,
        blockedUsers: [],
        savedPostIds: [],
        createdAt: Date.now() - 86400000 * 20
      }
    ],
    friendRequests: [
      {
        id: "req_1",
        fromUid: "user_camila",
        toUid: "user_me",
        mutualFriends: 12,
        timestamp: Date.now() - 3600000 * 2,
        status: "pending"
      },
      {
        id: "req_2",
        fromUid: "user_lucas",
        toUid: "user_me",
        mutualFriends: 8,
        timestamp: Date.now() - 3600000 * 6,
        status: "pending"
      },
      {
        id: "req_3",
        fromUid: "user_rodrigo",
        toUid: "user_me",
        mutualFriends: 15,
        timestamp: Date.now() - 86400000,
        status: "pending"
      }
    ],
    stories: [
      {
        id: "story_1",
        authorId: "user_me",
        authorName: "Your Story",
        avatar: "img/avatar_anisur_tanvi.jpg",
        mediaUrl: "img/avatar_anisur_tanvi.jpg",
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
        content: "Excited to unveil our newest open-source toolkit optimized for high-performance mobile apps across Brazil and Latin America! 🚀 Speed, resilience in low connectivity, and smooth animations. What tech stack are you rocking in 2026? #TechBrazil #CodingLife #MobileDev @anisur_tanvi",
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
        content: "Building and testing the new NetPará experience! Fast feeds, smooth reels, and verified creator perks. Loving the sleek design and dark mode. What do you all think? 🚀✨ #NetPará #Tech #Creator #Verified",
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
        text: "@anisur_tanvi Best combination in the world! 🙌",
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
    let currentData = null;
    try {
      const stored = localStorage.getItem(DB_KEY);
      if (stored) currentData = JSON.parse(stored);
    } catch (e) {
      console.warn("Error loading stored db, using defaults", e);
    }
    if (!currentData) {
      currentData = JSON.parse(JSON.stringify(defaultDatabase));
      saveDb(currentData);
      return currentData;
    }
    // Guarantee user_me is updated to Anisur Rahman (Tanvi)
    const me = currentData.users.find(u => u.uid === "user_me");
    if (me) {
      me.fullName = "Anisur Rahman";
      me.nickname = "Tanvi";
      me.username = "anisur_tanvi";
      me.email = "anisurrahmantanvi@gmail.com";
      me.avatarUrl = "img/avatar_anisur_tanvi.jpg";
      me.isVerified = true;
      me.isPremium = true;
      saveDb(currentData);
    }
    return currentData;
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
    },

    // Friends & Friend Requests Management
    getFriendRequests: () => {
      if (!db.friendRequests) db.friendRequests = [];
      return db.friendRequests
        .filter(r => r.toUid === "user_me" && r.status === "pending")
        .map(r => ({
          ...r,
          user: db.users.find(u => u.uid === r.fromUid)
        }))
        .filter(r => r.user != null);
    },

    getPendingRequestsCount: () => {
      if (!db.friendRequests) return 0;
      return db.friendRequests.filter(r => r.toUid === "user_me" && r.status === "pending").length;
    },

    acceptFriendRequest: (reqId) => {
      if (!db.friendRequests) db.friendRequests = [];
      const req = db.friendRequests.find(r => r.id === reqId);
      if (!req) return null;
      req.status = "accepted";

      const me = db.users.find(u => u.uid === "user_me");
      const sender = db.users.find(u => u.uid === req.fromUid);

      if (me) {
        if (!me.friendsList) me.friendsList = [];
        if (!me.friendsList.includes(req.fromUid)) {
          me.friendsList.push(req.fromUid);
          me.friendsCount = (me.friendsCount || 0) + 1;
        }
      }

      if (sender) {
        if (!sender.friendsList) sender.friendsList = [];
        if (!sender.friendsList.includes("user_me")) {
          sender.friendsList.push("user_me");
          sender.friendsCount = (sender.friendsCount || 0) + 1;
        }
      }

      // Add a notification for acceptance
      if (sender) {
        db.notifications.unshift({
          id: "notif_" + Date.now(),
          type: "friend_accept",
          actorId: req.fromUid,
          content: `and you are now friends on NetPará! 🎉`,
          targetId: req.fromUid,
          time: Date.now(),
          isRead: false
        });
      }

      saveDb(db);
      return req;
    },

    declineFriendRequest: (reqId) => {
      if (!db.friendRequests) db.friendRequests = [];
      const req = db.friendRequests.find(r => r.id === reqId);
      if (req) {
        req.status = "declined";
        db.friendRequests = db.friendRequests.filter(r => r.id !== reqId);
        saveDb(db);
        return true;
      }
      return false;
    },

    sendFriendRequest: (targetUid) => {
      if (!db.friendRequests) db.friendRequests = [];
      // check if exists
      const existing = db.friendRequests.find(r => 
        (r.fromUid === "user_me" && r.toUid === targetUid) ||
        (r.fromUid === targetUid && r.toUid === "user_me")
      );
      if (existing) return existing;

      const newReq = {
        id: "req_" + Date.now(),
        fromUid: "user_me",
        toUid: targetUid,
        mutualFriends: Math.floor(Math.random() * 8) + 2,
        timestamp: Date.now(),
        status: "pending"
      };
      db.friendRequests.push(newReq);
      saveDb(db);
      return newReq;
    },

    cancelFriendRequest: (targetUid) => {
      if (!db.friendRequests) return false;
      db.friendRequests = db.friendRequests.filter(r => 
        !(r.fromUid === "user_me" && r.toUid === targetUid)
      );
      saveDb(db);
      return true;
    },

    hasPendingRequest: (targetUid) => {
      if (!db.friendRequests) return false;
      return db.friendRequests.some(r => 
        r.fromUid === "user_me" && r.toUid === targetUid && r.status === "pending"
      );
    },

    isFriend: (uid) => {
      const me = db.users.find(u => u.uid === "user_me");
      return me?.friendsList?.includes(uid) || false;
    },

    getFriendSuggestions: () => {
      const me = db.users.find(u => u.uid === "user_me");
      const friends = me?.friendsList || [];
      const pendingSent = (db.friendRequests || [])
        .filter(r => r.fromUid === "user_me" && r.status === "pending")
        .map(r => r.toUid);
      const pendingReceived = (db.friendRequests || [])
        .filter(r => r.toUid === "user_me" && r.status === "pending")
        .map(r => r.fromUid);

      return db.users.filter(u => 
        u.uid !== "user_me" &&
        !friends.includes(u.uid) &&
        !pendingReceived.includes(u.uid)
      ).map(u => ({
        ...u,
        hasRequested: pendingSent.includes(u.uid),
        mutualFriends: Math.floor(Math.random() * 12) + 1
      }));
    },

    getFriends: (uid = "user_me") => {
      const targetUser = db.users.find(u => u.uid === uid);
      const friendIds = targetUser?.friendsList || [];
      return db.users.filter(u => friendIds.includes(u.uid));
    },

    removeFriend: (targetUid) => {
      const me = db.users.find(u => u.uid === "user_me");
      const target = db.users.find(u => u.uid === targetUid);
      if (me && me.friendsList) {
        me.friendsList = me.friendsList.filter(id => id !== targetUid);
        me.friendsCount = Math.max(0, (me.friendsCount || 1) - 1);
      }
      if (target && target.friendsList) {
        target.friendsList = target.friendsList.filter(id => id !== "user_me");
        target.friendsCount = Math.max(0, (target.friendsCount || 1) - 1);
      }
      saveDb(db);
      return true;
    }
  };
})();
