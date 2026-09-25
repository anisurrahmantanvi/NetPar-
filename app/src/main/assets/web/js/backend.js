/**
 * NetPará Backend Architecture & Local Persistence Engine
 * Compatible with Firebase Auth, Cloud Firestore & Cloud Storage schemas.
 */

const NetParaBackend = (function () {
  const DB_KEY = "iconnecto_live_db_v1";

  // Default seed database with rich Bangladeshi content
  const defaultDatabase = {
    users: [
      {
        uid: "user_me",
        username: "anisur_tanvi",
        fullName: "Anisur Rahman",
        nickname: "Tanvi",
        email: "anisurrahmantanvi@gmail.com",
        bio: "Tech enthusiast & digital creator 🚀 Welcome to my verified iConnecto profile! ✨🇧🇩",
        website: "https://iconnecto.app/tanvi",
        avatarUrl: "img/avatar_anisur_tanvi.jpg",
        coverUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
        isVerified: true,
        isPremium: true,
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        friendsCount: 0,
        friendsList: [],
        city: "Dhaka",
        hometown: "Dhaka, Bangladesh",
        work: "Software Engineer & Creator",
        role: "admin",
        isPrivate: false,
        blockedUsers: [],
        savedPostIds: [],
        createdAt: Date.now()
      }
    ],
    friendRequests: [],
    stories: [],
    posts: [],
    reels: [],
    comments: [],
    conversations: [],
    messages: [],
    notifications: [],
    reports: [],
    announcements: [
      {
        id: "anc_1",
        title: "Welcome to iConnecto!",
        content: "Connect. Share. Belong. Live real-time social networking, messaging, and HD WebRTC calling powered by Firebase.",
        timestamp: Date.now()
      }
    ],
    callHistory: []
  };

  function loadDb() {
    // Purge old demo caches from previous sessions
    try {
      localStorage.removeItem("netpara_production_db_v3");
      localStorage.removeItem("netpara_production_db_v2");
    } catch (_) {}

    let currentData = null;
    try {
      const stored = localStorage.getItem(DB_KEY);
      if (stored) {
        currentData = JSON.parse(stored);
        // Ensure no legacy demo users or mock posts persist
        const demoUids = new Set(["user_sadia", "user_tanvir", "user_nusrat", "user_rahim", "user_farhana", "user_shakil"]);
        if (currentData.users) {
          currentData.users = currentData.users.filter(u => !demoUids.has(u.uid));
        }
        if (currentData.friendRequests) {
          currentData.friendRequests = currentData.friendRequests.filter(r => !demoUids.has(r.fromUid));
        }
        if (currentData.conversations) {
          currentData.conversations = currentData.conversations.filter(c => !demoUids.has(c.participantId));
        }
        if (currentData.messages) {
          currentData.messages = currentData.messages.filter(m => !demoUids.has(m.senderId) && !demoUids.has(m.receiverId));
        }
        if (currentData.callHistory) {
          currentData.callHistory = currentData.callHistory.filter(c => !demoUids.has(c.peerUid));
        }
        if (currentData.posts) {
          currentData.posts = currentData.posts.filter(p => !demoUids.has(p.authorId) && !p.id.startsWith("post_"));
        }
      }
    } catch (e) {
      console.warn("Error loading stored db, using defaults", e);
    }
    if (!currentData || !currentData.users || currentData.users.length === 0) {
      currentData = JSON.parse(JSON.stringify(defaultDatabase));
      saveDb(currentData);
      return currentData;
    }
    if (!currentData.callHistory) {
      currentData.callHistory = [];
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
      me.friendsList = (me.friendsList || []).filter(id => !id.startsWith("user_sadia") && !id.startsWith("user_tanvir") && !id.startsWith("user_rahim"));
      me.friendsCount = me.friendsList.length;
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
    getCurrentUserId: () => {
      if (window.NetParaAuth && typeof NetParaAuth.getCurrentSession === "function") {
        const session = NetParaAuth.getCurrentSession();
        if (session && session.uid) return session.uid;
      }
      return "user_me";
    },
    getCurrentUser: () => {
      const myUid = NetParaBackend.getCurrentUserId();
      return db.users.find(u => u.uid === myUid) || db.users.find(u => u.uid === "user_me") || db.users[0] || null;
    },
    updateUser: (uid, patch) => {
      const targetUid = uid || NetParaBackend.getCurrentUserId();
      const idx = db.users.findIndex(u => u.uid === targetUid);
      if (idx !== -1) {
        db.users[idx] = { ...db.users[idx], ...patch };
        saveDb(db);

        // Also update active session user if it's the current user
        if (targetUid === NetParaBackend.getCurrentUserId() && window.NetParaAuth && typeof NetParaAuth.updateSessionUser === "function") {
          NetParaAuth.updateSessionUser(patch);
        }

        // Sync updated user to Cloud Firestore
        if (window.NetParaFirebase && typeof NetParaFirebase.syncUserToCloud === "function") {
          NetParaFirebase.syncUserToCloud(db.users[idx]);
        }

        return db.users[idx];
      }
      return null;
    },

    // Posts
    getPosts: () => [...db.posts].sort((a,b) => b.createdAt - a.createdAt),
    createPost: (post) => {
      const me = NetParaBackend.getCurrentUser();
      const myUid = me ? me.uid : "user_me";
      const newPost = {
        id: "post_" + Date.now(),
        authorId: myUid,
        authorName: me ? me.fullName : "User",
        authorUsername: me ? me.username : "user",
        authorAvatar: me ? me.avatarUrl : "",
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
      if (me) me.postsCount = (me.postsCount || 0) + 1;
      saveDb(db);

      // Publish to live Cloud Firestore
      if (window.NetParaFirebase && window.NetParaFirebase.publishPostToCloud) {
        NetParaFirebase.publishPostToCloud(newPost);
      }

      return newPost;
    },
    mergeCloudPosts: (cloudPosts) => {
      if (!cloudPosts || cloudPosts.length === 0) return;
      const existingIds = new Set(db.posts.map(p => p.id));
      let added = false;
      cloudPosts.forEach(cp => {
        if (!existingIds.has(cp.id)) {
          db.posts.unshift(cp);
          existingIds.add(cp.id);
          added = true;
        } else {
          const idx = db.posts.findIndex(p => p.id === cp.id);
          if (idx !== -1) {
            db.posts[idx] = { ...db.posts[idx], ...cp };
          }
        }
      });
      if (added) {
        db.posts.sort((a, b) => b.createdAt - a.createdAt);
      }
      saveDb(db);
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

      const myUid = NetParaBackend.getCurrentUserId();
      const currentReaction = post.userReactions[myUid];
      if (currentReaction === reactionType) {
        // Remove reaction
        delete post.userReactions[myUid];
        post.reactions[reactionType] = Math.max(0, (post.reactions[reactionType] || 1) - 1);
        post.likesCount = Math.max(0, (post.likesCount || 1) - 1);
      } else {
        // Change or add
        if (currentReaction) {
          post.reactions[currentReaction] = Math.max(0, (post.reactions[currentReaction] || 1) - 1);
        } else {
          post.likesCount = (post.likesCount || 0) + 1;
        }
        post.userReactions[myUid] = reactionType;
        post.reactions[reactionType] = (post.reactions[reactionType] || 0) + 1;
      }
      saveDb(db);

      // Realtime Cloud sync
      if (window.NetParaFirebase && window.NetParaFirebase.updatePostReactions) {
        NetParaFirebase.updatePostReactions(postId, post.likesCount, post.reactions, post.userReactions);
      }

      return post;
    },
    toggleSavePost: (postId) => {
      const me = NetParaBackend.getCurrentUser();
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
      const me = NetParaBackend.getCurrentUser();
      const target = db.users.find(u => u.uid === targetUid);
      if (!me || !target) return { isFollowing: false };

      if (!me.followingList) me.followingList = [];
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
      const me = NetParaBackend.getCurrentUser();
      const myUid = me ? me.uid : "user_me";
      const comment = {
        id: "comm_" + Date.now(),
        postId,
        authorId: myUid,
        authorName: me ? me.fullName : "User",
        authorAvatar: me ? me.avatarUrl : "",
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

      // Realtime Cloud sync
      if (window.NetParaFirebase && window.NetParaFirebase.addCommentToCloud) {
        NetParaFirebase.addCommentToCloud(postId, comment);
      }

      return comment;
    },

    // Chat / Messages
    getConversations: () => db.conversations,
    getMessages: (convId) => db.messages.filter(m => m.convId === convId),
    sendMessage: (convId, text, mediaUrl = null) => {
      const me = NetParaBackend.getCurrentUser();
      const myUid = me ? me.uid : "user_me";
      const conv = db.conversations.find(c => c.id === convId);
      const receiverId = conv ? conv.participantId : null;
      const msg = {
        id: "msg_" + Date.now(),
        convId,
        senderId: myUid,
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

      // Sync message with Cloud Firestore
      if (window.NetParaFirebase && window.NetParaFirebase.sendMessageToCloud && conv) {
        NetParaFirebase.sendMessageToCloud(convId, msg, [conv.participantId, myUid]);
      }

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
      const myUid = NetParaBackend.getCurrentUserId();
      const rep = {
        id: "rep_" + Date.now(),
        ...report,
        reporterId: myUid,
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
      const myUid = NetParaBackend.getCurrentUserId();
      return db.friendRequests
        .filter(r => r.toUid === myUid && r.status === "pending")
        .map(r => ({
          ...r,
          user: db.users.find(u => u.uid === r.fromUid)
        }))
        .filter(r => r.user != null);
    },

    getPendingRequestsCount: () => {
      if (!db.friendRequests) return 0;
      const myUid = NetParaBackend.getCurrentUserId();
      return db.friendRequests.filter(r => r.toUid === myUid && r.status === "pending").length;
    },

    acceptFriendRequest: (reqId) => {
      if (!db.friendRequests) db.friendRequests = [];
      const req = db.friendRequests.find(r => r.id === reqId);
      if (!req) return null;
      req.status = "accepted";

      const me = NetParaBackend.getCurrentUser();
      const myUid = me ? me.uid : "user_me";
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
        if (!sender.friendsList.includes(myUid)) {
          sender.friendsList.push(myUid);
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
      const myUid = NetParaBackend.getCurrentUserId();
      // check if exists
      const existing = db.friendRequests.find(r => 
        (r.fromUid === myUid && r.toUid === targetUid) ||
        (r.fromUid === targetUid && r.toUid === myUid)
      );
      if (existing) return existing;

      const me = NetParaBackend.getCurrentUser();
      const myFriends = me?.friendsList || [];
      const targetUser = db.users.find(u => u.uid === targetUid);
      const targetFriends = targetUser?.friendsList || [];
      const realMutual = myFriends.filter(id => targetFriends.includes(id)).length;

      const newReq = {
        id: "req_" + Date.now(),
        fromUid: myUid,
        toUid: targetUid,
        mutualFriends: realMutual,
        timestamp: Date.now(),
        status: "pending"
      };
      db.friendRequests.push(newReq);
      saveDb(db);
      return newReq;
    },

    cancelFriendRequest: (targetUid) => {
      if (!db.friendRequests) return false;
      const myUid = NetParaBackend.getCurrentUserId();
      db.friendRequests = db.friendRequests.filter(r => 
        !(r.fromUid === myUid && r.toUid === targetUid)
      );
      saveDb(db);
      return true;
    },

    hasPendingRequest: (targetUid) => {
      if (!db.friendRequests) return false;
      const myUid = NetParaBackend.getCurrentUserId();
      return db.friendRequests.some(r => 
        r.fromUid === myUid && r.toUid === targetUid && r.status === "pending"
      );
    },

    isFriend: (uid) => {
      const me = NetParaBackend.getCurrentUser();
      return me?.friendsList?.includes(uid) || false;
    },

    getFriendSuggestions: () => {
      const me = NetParaBackend.getCurrentUser();
      const myUid = me ? me.uid : "user_me";
      const friends = me?.friendsList || [];
      const pendingSent = (db.friendRequests || [])
        .filter(r => r.fromUid === myUid && r.status === "pending")
        .map(r => r.toUid);
      const pendingReceived = (db.friendRequests || [])
        .filter(r => r.toUid === myUid && r.status === "pending")
        .map(r => r.fromUid);

      return db.users.filter(u => 
        u.uid !== myUid &&
        !friends.includes(u.uid) &&
        !pendingReceived.includes(u.uid)
      ).map(u => ({
        ...u,
        hasRequested: pendingSent.includes(u.uid),
        mutualFriends: friends.filter(id => (u.friendsList || []).includes(id)).length
      }));
    },

    getFriends: (uid = null) => {
      const targetUid = uid || NetParaBackend.getCurrentUserId();
      const targetUser = db.users.find(u => u.uid === targetUid);
      const friendIds = targetUser?.friendsList || [];
      return db.users.filter(u => friendIds.includes(u.uid));
    },

    removeFriend: (targetUid) => {
      const me = NetParaBackend.getCurrentUser();
      const myUid = me ? me.uid : "user_me";
      const target = db.users.find(u => u.uid === targetUid);
      if (me && me.friendsList) {
        me.friendsList = me.friendsList.filter(id => id !== targetUid);
        me.friendsCount = Math.max(0, (me.friendsCount || 1) - 1);
      }
      if (target && target.friendsList) {
        target.friendsList = target.friendsList.filter(id => id !== myUid);
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
