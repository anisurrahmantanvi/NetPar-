/**
 * NetPará Backend Architecture & Local Persistence Engine
 * Compatible with Firebase Auth, Cloud Firestore & Cloud Storage schemas.
 */

const NetParaBackend = (function () {
  const DB_KEY = "netpara_production_db_v3";

  // Default seed database with rich Bangladeshi content
  const defaultDatabase = {
    users: [
      {
        uid: "user_me",
        username: "anisur_tanvi",
        fullName: "Anisur Rahman",
        nickname: "Tanvi",
        email: "anisurrahmantanvi@gmail.com",
        bio: "Tech enthusiast & digital creator 🚀 Welcome to my verified NetPara profile! ✨🇧🇩",
        website: "https://netpara.social/tanvi",
        avatarUrl: "img/avatar_anisur_tanvi.jpg",
        coverUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
        isVerified: true,
        isPremium: true,
        followersCount: 4850,
        followingCount: 382,
        postsCount: 18,
        friendsCount: 152,
        friendsList: ["user_sadia", "user_tanvir", "user_rahim"],
        city: "Dhaka",
        hometown: "Dhaka, Bangladesh",
        work: "Software Engineer & Creator",
        role: "admin",
        isPrivate: false,
        blockedUsers: [],
        savedPostIds: ["post_2"],
        createdAt: Date.now() - 86400000 * 30
      },
      {
        uid: "user_sadia",
        username: "sadia_clicks",
        fullName: "Sadia Islam",
        email: "sadia@netpara.social",
        bio: "Visual storyteller & travel photographer from Sylhet 📸 Tea gardens, rivers & the beauty of Bangladesh! 🌿✨",
        website: "https://sadiaclicks.com",
        avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
        coverUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80",
        isVerified: true,
        isPremium: false,
        followersCount: 8930,
        followingCount: 410,
        friendsCount: 156,
        friendsList: ["user_me", "user_tanvir"],
        city: "Sylhet, Bangladesh",
        postsCount: 54,
        role: "user",
        isPrivate: false,
        blockedUsers: [],
        savedPostIds: [],
        createdAt: Date.now() - 86400000 * 45
      },
      {
        uid: "user_tanvir",
        username: "tanvir_dev",
        fullName: "Tanvir Ahmed",
        email: "tanvir@techbd.io",
        bio: "Full-stack Developer & Open-source Creator 🚀 Building modern apps and sharing developer tutorials! 💻🇧🇩",
        website: "https://github.com/tanvirdev",
        avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
        coverUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80",
        isVerified: true,
        isPremium: false,
        followersCount: 3100,
        followingCount: 220,
        friendsCount: 94,
        friendsList: ["user_me", "user_sadia"],
        city: "Dhaka, Bangladesh",
        postsCount: 32,
        role: "user",
        isPrivate: false,
        blockedUsers: [],
        savedPostIds: [],
        createdAt: Date.now() - 86400000 * 15
      },
      {
        uid: "user_nusrat",
        username: "nusrat_jahan",
        fullName: "Nusrat Jahan",
        email: "nusrat@design.bd",
        bio: "Traditional art & fashion designer 🎨 Celebrating Bengali heritage and modern designs ✨",
        website: "https://instagram.com/nusrat_design",
        avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
        coverUrl: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80",
        isVerified: true,
        isPremium: true,
        followersCount: 15400,
        followingCount: 512,
        friendsCount: 310,
        friendsList: ["user_sadia"],
        city: "Dhaka, Bangladesh",
        postsCount: 42,
        role: "user",
        isPrivate: false,
        blockedUsers: [],
        savedPostIds: [],
        createdAt: Date.now() - 86400000 * 60
      },
      {
        uid: "user_rahim",
        username: "rahim_vlogs",
        fullName: "Rahim Chowdhury",
        email: "rahim@vlogs.bd",
        bio: "Foodie & Explorer 🍲 Exploring Old Dhaka street food and the shores of Cox's Bazar!",
        website: "https://rahimvlogs.com",
        avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
        coverUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
        isVerified: false,
        isPremium: false,
        followersCount: 4200,
        followingCount: 380,
        friendsCount: 180,
        friendsList: ["user_tanvir"],
        city: "Chittagong, Bangladesh",
        postsCount: 29,
        role: "user",
        isPrivate: false,
        blockedUsers: [],
        savedPostIds: [],
        createdAt: Date.now() - 86400000 * 40
      },
      {
        uid: "user_farhana",
        username: "farhana_art",
        fullName: "Farhana Akter",
        email: "farhana@art.bd",
        bio: "Handcrafted pottery & Rickshaw art painter 🎨 Proudly showcasing Bangladeshi culture!",
        website: "https://arteparamarajo.com",
        avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
        coverUrl: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=80",
        isVerified: true,
        isPremium: false,
        followersCount: 7800,
        followingCount: 290,
        friendsCount: 215,
        friendsList: ["user_me"],
        city: "Narayanganj, Bangladesh",
        postsCount: 36,
        role: "user",
        isPrivate: false,
        blockedUsers: [],
        savedPostIds: [],
        createdAt: Date.now() - 86400000 * 25
      },
      {
        uid: "user_shakil",
        username: "shakil_khan",
        fullName: "Shakil Khan",
        email: "shakil@startup.bd",
        bio: "Product Lead & Tech Community Builder 📱 Innovating digital services in Bangladesh",
        website: "https://shakilkhan.dev",
        avatarUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&q=80",
        coverUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
        isVerified: false,
        isPremium: false,
        followersCount: 2100,
        followingCount: 190,
        friendsCount: 140,
        friendsList: ["user_tanvir", "user_sadia"],
        city: "Rajshahi, Bangladesh",
        postsCount: 19,
        role: "user",
        isPrivate: false,
        blockedUsers: [],
        savedPostIds: [],
        createdAt: Date.now() - 86400000 * 18
      }
    ],
    friendRequests: [
      {
        id: "req_1",
        fromUid: "user_nusrat",
        toUid: "user_me",
        mutualFriends: 12,
        timestamp: Date.now() - 3600000 * 2,
        status: "pending"
      },
      {
        id: "req_2",
        fromUid: "user_rahim",
        toUid: "user_me",
        mutualFriends: 8,
        timestamp: Date.now() - 3600000 * 6,
        status: "pending"
      },
      {
        id: "req_3",
        fromUid: "user_shakil",
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
        authorId: "user_sadia",
        authorName: "sadia_clicks",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
        mediaUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
        isOwn: false
      },
      {
        id: "story_3",
        authorId: "user_tanvir",
        authorName: "tanvir_dev",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
        mediaUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80",
        isOwn: false
      },
      {
        id: "story_4",
        authorId: "user_rahim",
        authorName: "rahim_vlogs",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
        mediaUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
        isOwn: false
      }
    ],
    posts: [
      {
        id: "post_1",
        authorId: "user_sadia",
        content: "A golden sunset over the river today! ✨ Watching the traditional country boats glide peacefully across the water never gets old. What's your favorite spot for an evening walk in Bangladesh? 🇧🇩🌿 #NetPara #Bangladesh #SunsetMagic #RiverineBeauty",
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
        authorId: "user_tanvir",
        content: "Excited to unveil our newest open-source mobile toolkit built for high-performance apps in Bangladesh! 🚀 Ultra-fast caching, lightweight offline support, and smooth 60fps animations. What tech stack are you rocking in 2026? #BanglaTech #CodingLife #DevBD @anisur_tanvi",
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
        content: "Building and testing the new NetPara experience! 🇧🇩 Fast feeds, smooth reels, verified creator badges, and clean ad-free browsing. Proud to share our tech journey with you all! Let me know your thoughts! 🚀✨ #NetPara #TechBD #Creator #Verified #Dhaka",
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
      },
      {
        id: "post_4",
        authorId: "user_rahim",
        content: "Hot Kacchi Biryani with Borhani on a rainy afternoon in Dhaka! 🍛🍖 Nothing beats authentic Puran Dhaka spices. Drop your favorite foodie spot below! #DhakaFoodies #KacchiBiryani #BanglaFood",
        mediaUrls: [
          "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1000&q=80"
        ],
        videoUrl: null,
        likesCount: 320,
        reactions: { "love": 280, "like": 40 },
        userReactions: {},
        commentsCount: 35,
        sharesCount: 19,
        savesCount: 65,
        createdAt: Date.now() - 3600000 * 28
      }
    ],
    reels: [
      {
        id: "reel_1",
        authorId: "user_sadia",
        caption: "Lush green tea gardens of Sreemangal at dawn 🌿 Morning mist and peace ✨ #SylhetDiaries #BeautifulBangladesh",
        videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4",
        musicTitle: "Bangla Folk Acoustic - River Melodies",
        likesCount: 1240,
        commentsCount: 89,
        sharesCount: 140,
        isLiked: false
      },
      {
        id: "reel_2",
        authorId: "user_tanvir",
        caption: "Day in the life of a software engineer in Dhaka 💻☕ From morning standup to shipping clean code. #TechLife #DhakaDev #CodingVibes",
        videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-water-1164-large.mp4",
        musicTitle: "Lo-Fi Beats - Dhaka Monsoon",
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
        authorId: "user_tanvir",
        text: "The golden hour in Bangladesh is truly unmatched! Great capture Sadia 👏",
        likesCount: 14,
        isLiked: false,
        parentId: null,
        createdAt: Date.now() - 3600000 * 2
      },
      {
        id: "comm_2",
        postId: "post_1",
        authorId: "user_me",
        text: "The scenic riverbanks here are so tranquil, absolute peace of mind! 🌿",
        likesCount: 22,
        isLiked: true,
        parentId: null,
        createdAt: Date.now() - 3600000 * 1
      },
      {
        id: "comm_3",
        postId: "post_1",
        authorId: "user_sadia",
        text: "@anisur_tanvi Exactly! Best place to unwind after a productive week 🙌",
        likesCount: 9,
        isLiked: false,
        parentId: "comm_2",
        createdAt: Date.now() - 1800000
      }
    ],
    conversations: [
      {
        id: "conv_1",
        participantId: "user_sadia",
        lastMessage: "See you at the Tech Summit in Dhaka on Saturday! 🎉",
        timestamp: Date.now() - 1800000,
        unreadCount: 1
      },
      {
        id: "conv_2",
        participantId: "user_tanvir",
        lastMessage: "Sent you the repository link for the new Android build.",
        timestamp: Date.now() - 86400000,
        unreadCount: 0
      }
    ],
    messages: [
      {
        id: "msg_1",
        convId: "conv_1",
        senderId: "user_sadia",
        receiverId: "user_me",
        text: "Hey Tanvi! Are you going to the Tech Summit in Dhaka this weekend?",
        createdAt: Date.now() - 3600000 * 2,
        isRead: true
      },
      {
        id: "msg_2",
        convId: "conv_1",
        senderId: "user_me",
        receiverId: "user_sadia",
        text: "Hey Sadia! Yes, definitely going around 4 PM.",
        createdAt: Date.now() - 3600000 * 1.5,
        isRead: true
      },
      {
        id: "msg_3",
        convId: "conv_1",
        senderId: "user_sadia",
        receiverId: "user_me",
        text: "Awesome! See you at the Tech Summit in Dhaka on Saturday! 🎉",
        createdAt: Date.now() - 1800000,
        isRead: false
      }
    ],
    notifications: [
      {
        id: "notif_1",
        type: "like",
        actorId: "user_sadia",
        content: "liked your post in Dhaka",
        targetId: "post_3",
        time: Date.now() - 3600000,
        isRead: false
      },
      {
        id: "notif_2",
        type: "follow",
        actorId: "user_tanvir",
        content: "started following you",
        targetId: "user_tanvir",
        time: Date.now() - 3600000 * 5,
        isRead: false
      },
      {
        id: "notif_3",
        type: "comment",
        actorId: "user_sadia",
        content: "commented: 'Best place to unwind after a productive week 🙌'",
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
        reporterId: "user_sadia",
        category: "spam",
        details: "Automated link testing report",
        status: "pending",
        createdAt: Date.now() - 7200000
      }
    ],
    announcements: [
      {
        id: "anc_1",
        title: "Welcome to NetPara!",
        content: "Experience the fastest social network in Bangladesh. Explore reels, share posts, and connect with creators.",
        timestamp: Date.now() - 86400000 * 2
      }
    ],
    callHistory: [
      {
        id: "call_log_1",
        peerUid: "user_sadia",
        peerName: "Sadia Islam",
        peerAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
        type: "video",
        direction: "incoming",
        status: "completed",
        duration: 184,
        timestamp: Date.now() - 3600000 * 3
      },
      {
        id: "call_log_2",
        peerUid: "user_tanvir",
        peerName: "Tanvir Ahmed",
        peerAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
        type: "voice",
        direction: "outgoing",
        status: "completed",
        duration: 95,
        timestamp: Date.now() - 86400000 * 1.5
      },
      {
        id: "call_log_3",
        peerUid: "user_rahim",
        peerName: "Rahim Chowdhury",
        peerAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
        type: "voice",
        direction: "incoming",
        status: "missed",
        duration: 0,
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
    if (!currentData.callHistory) {
      currentData.callHistory = JSON.parse(JSON.stringify(defaultDatabase.callHistory));
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

      if (!me.followingList) me.followingList = ["user_sadia", "user_tanvir"];
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
      const receiverId = conv ? conv.participantId : "user_sadia";
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
          content: `and you are now friends on NetPara! 🎉`,
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
    },

    getCallHistory: () => {
      return (db.callHistory || []).sort((a, b) => b.timestamp - a.timestamp);
    },

    saveCallRecord: (record) => {
      if (!db.callHistory) db.callHistory = [];
      db.callHistory.unshift(record);
      saveDb(db);

      // Also persist to Firestore if available
      if (window.firebase && window.firebase.firestore && window.NetParaFirebaseDb) {
        try {
          window.NetParaFirebaseDb.collection('call_history').add({
            ...record,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          }).catch(e => console.warn("Firestore call log error:", e));
        } catch (_) {}
      }
      return record;
    },

    deleteCallRecord: (recordId) => {
      if (!db.callHistory) return;
      db.callHistory = db.callHistory.filter(r => r.id !== recordId);
      saveDb(db);
      return true;
    }
  };
})();
