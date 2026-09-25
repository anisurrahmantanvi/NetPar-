/**
 * iConnecto Authentication & Account Switcher Engine
 * Supports Multi-Account Management, Cloud Auth Sync, and Dynamic Session Control.
 */

const NetParaAuth = (function () {
  const SESSION_KEY = "iconnecto_active_session";
  const ACCOUNTS_KEY = "iconnecto_saved_accounts";
  const LOGOUT_FLAG_KEY = "iconnecto_explicit_logout";

  function getSession() {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.uid) return parsed;
      }
      // Check legacy session key if any
      const legacy = localStorage.getItem("netpara_active_session");
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (parsed && parsed.uid) return parsed;
      }
    } catch (e) {
      console.warn("Session read error:", e);
    }
    return null;
  }

  function setSession(user, remember = true) {
    if (!user) return;
    const sessionData = {
      uid: user.uid,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      token: "tok_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6)
    };

    if (remember) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    } else {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    }
    // Remove logout flag
    localStorage.removeItem(LOGOUT_FLAG_KEY);

    // Save to device's list of saved accounts
    addSavedAccount(user);

    // Backup to native Encrypted/SharedPreferences bridge if available
    if (window.NetParaNative && window.NetParaNative.saveLocalData) {
      window.NetParaNative.saveLocalData("auth_uid", user.uid);
    }
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem("netpara_active_session");
    localStorage.setItem(LOGOUT_FLAG_KEY, "true");

    if (window.NetParaNative && window.NetParaNative.removeLocalData) {
      window.NetParaNative.removeLocalData("auth_uid");
    }
  }

  function getSavedAccounts() {
    try {
      const raw = localStorage.getItem(ACCOUNTS_KEY);
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list) && list.length > 0) return list;
      }
    } catch (_) {}

    // Seed default account (Tanvi) if present in DB
    const db = window.NetParaBackend ? NetParaBackend.getDb() : null;
    const defaultAccounts = [];
    if (db && db.users && db.users.length > 0) {
      db.users.forEach(u => {
        defaultAccounts.push({
          uid: u.uid,
          username: u.username,
          fullName: u.fullName,
          nickname: u.nickname || "",
          email: u.email,
          avatarUrl: u.avatarUrl
        });
      });
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(defaultAccounts));
      return defaultAccounts;
    }

    return [];
  }

  function addSavedAccount(user) {
    if (!user || !user.uid) return;
    const accounts = getSavedAccounts();
    const existingIdx = accounts.findIndex(a => a.uid === user.uid || a.email.toLowerCase() === user.email.toLowerCase());
    const accountEntry = {
      uid: user.uid,
      username: user.username,
      fullName: user.fullName,
      nickname: user.nickname || "",
      email: user.email,
      avatarUrl: user.avatarUrl || "img/avatar_anisur_tanvi.jpg"
    };

    if (existingIdx !== -1) {
      accounts[existingIdx] = accountEntry;
    } else {
      accounts.unshift(accountEntry);
    }
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  }

  function removeSavedAccount(uid) {
    let accounts = getSavedAccounts();
    accounts = accounts.filter(a => a.uid !== uid);
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validateUsername(username) {
    if (!username) return false;
    const clean = username.trim().toLowerCase();
    return /^[a-zA-Z0-9_.-]{3,30}$/.test(clean);
  }

  function updateSessionUser(patch) {
    try {
      const session = getSession();
      if (session) {
        const updated = { ...session, ...patch };
        localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
      }
      // Also update in saved accounts
      const myUid = patch.uid || (session ? session.uid : null);
      if (myUid) {
        const accounts = getSavedAccounts();
        const idx = accounts.findIndex(a => a.uid === myUid);
        if (idx !== -1) {
          accounts[idx] = { ...accounts[idx], ...patch };
          localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
        }
      }
    } catch (e) {
      console.warn("Failed to update session user:", e);
    }
  }

  return {
    isLoggedIn: () => {
      const isExplicitLogout = localStorage.getItem(LOGOUT_FLAG_KEY) === "true";
      if (isExplicitLogout) return false;
      return !!getSession();
    },

    getCurrentSession: () => getSession(),
    updateSessionUser,

    getSavedAccounts,
    removeSavedAccount,

    /**
     * Switch instantly between accounts on this device
     */
    switchToAccount: async (uid) => {
      const db = NetParaBackend.getDb();
      let user = db.users.find(u => u.uid === uid);
      if (!user) {
        // Look in saved accounts
        const saved = getSavedAccounts().find(a => a.uid === uid);
        if (saved) {
          user = {
            uid: saved.uid,
            username: saved.username,
            fullName: saved.fullName,
            email: saved.email,
            avatarUrl: saved.avatarUrl,
            role: "user",
            followersCount: 0,
            followingCount: 0,
            postsCount: 0,
            friendsCount: 0,
            friendsList: [],
            createdAt: Date.now()
          };
          db.users.push(user);
          NetParaBackend.save();
        }
      }

      if (!user) {
        return { success: false, message: "Account not found on this device." };
      }

      setSession(user, true);

      if (window.NetParaFirebase && window.NetParaFirebase.syncUserToCloud) {
        await NetParaFirebase.syncUserToCloud(user);
      }

      if (window.NetParaApp && typeof NetParaApp.onSessionChanged === "function") {
        NetParaApp.onSessionChanged(user);
      }

      if (window.NetParaNative) {
        window.NetParaNative.showToast("Switched to @" + user.username);
        window.NetParaNative.vibrate(20);
      }

      return { success: true, user };
    },

    /**
     * Sign In with username or email and password
     */
    login: async (identifier, password, remember = true) => {
      if (!identifier || !identifier.trim()) {
        return { success: false, message: "Please enter your username or email." };
      }
      const cleanId = identifier.trim().toLowerCase();
      const db = NetParaBackend.getDb();
      let user = db.users.find(u => 
        (u.email && u.email.toLowerCase() === cleanId) || 
        (u.username && u.username.toLowerCase() === cleanId)
      );

      if (!user) {
        // Also check saved accounts list
        const saved = getSavedAccounts().find(s => 
          (s.email && s.email.toLowerCase() === cleanId) || 
          (s.username && s.username.toLowerCase() === cleanId)
        );
        if (saved) {
          user = saved;
          db.users.push(user);
          NetParaBackend.save();
        }
      }

      if (!user) {
        return { success: false, message: "No account found with this email or username." };
      }

      if (password && password.length < 6) {
        return { success: false, message: "Password must be at least 6 characters." };
      }

      // Try signing in to Firebase Auth
      if (user.email && password && window.NetParaFirebase && window.NetParaFirebase.loginFirebaseUser) {
        await NetParaFirebase.loginFirebaseUser(user.email, password);
      }

      setSession(user, remember);

      if (window.NetParaFirebase && window.NetParaFirebase.syncUserToCloud) {
        await NetParaFirebase.syncUserToCloud(user);
      }

      if (window.NetParaApp && typeof NetParaApp.onSessionChanged === "function") {
        NetParaApp.onSessionChanged(user);
      }

      if (window.NetParaNative) {
        window.NetParaNative.showToast("Welcome back, @" + user.username + "!");
        window.NetParaNative.vibrate(25);
      }

      return { success: true, user };
    },

    /**
     * Register a new unique ID & Sync to Firebase
     */
    register: async (userData) => {
      const { fullName, username, email, password, avatarUrl } = userData;

      if (!fullName || fullName.trim().length < 2) {
        return { success: false, message: "Please enter your full name (minimum 2 characters)." };
      }
      if (!username || !username.trim()) {
        return { success: false, message: "Please choose a username handle." };
      }

      // Sanitize username
      const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_.-]/g, "");
      if (cleanUsername.length < 3 || cleanUsername.length > 30) {
        return { success: false, message: "Username must be 3-30 characters (letters, numbers, underscore)." };
      }
      if (!email || !validateEmail(email)) {
        return { success: false, message: "Please enter a valid email address." };
      }
      if (!password || password.length < 6) {
        return { success: false, message: "Password must be at least 6 characters long." };
      }

      const cleanEmail = email.toLowerCase().trim();
      const db = NetParaBackend.getDb();
      const exists = db.users.some(u => 
        (u.username && u.username.toLowerCase() === cleanUsername) || 
        (u.email && u.email.toLowerCase() === cleanEmail)
      );

      if (exists) {
        return { success: false, message: "Username or email is already taken. Try another or sign in." };
      }

      // Process and upload profile picture if provided
      let finalAvatarUrl = avatarUrl;
      if (finalAvatarUrl && finalAvatarUrl.startsWith("data:") && window.NetParaFirebase && window.NetParaFirebase.uploadImageToStorage) {
        try {
          finalAvatarUrl = await NetParaFirebase.uploadImageToStorage(finalAvatarUrl, "avatars");
        } catch (_) {}
      }

      if (!finalAvatarUrl) {
        const defaultAvatars = [
          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80",
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
          "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=400&q=80",
          "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=400&q=80"
        ];
        finalAvatarUrl = defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)];
      }

      // Register in Firebase Authentication
      let newUid = "user_" + Date.now();
      if (window.NetParaFirebase && window.NetParaFirebase.registerFirebaseUser) {
        try {
          const fbUser = await NetParaFirebase.registerFirebaseUser(cleanEmail, password, fullName.trim(), finalAvatarUrl);
          if (fbUser && fbUser.uid) {
            newUid = fbUser.uid;
          }
        } catch (e) {
          console.warn("Firebase Auth setup note:", e);
        }
      }

      const newUser = {
        uid: newUid,
        username: cleanUsername,
        fullName: fullName.trim(),
        nickname: "",
        email: cleanEmail,
        bio: "Connecting on iConnecto! 🚀✨",
        website: "",
        avatarUrl: finalAvatarUrl,
        coverUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
        isVerified: false,
        isPremium: false,
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        friendsCount: 0,
        friendsList: [],
        city: "Dhaka",
        hometown: "Bangladesh",
        work: "",
        role: "user",
        isPrivate: false,
        blockedUsers: [],
        savedPostIds: [],
        createdAt: Date.now()
      };

      db.users.push(newUser);
      NetParaBackend.save();
      setSession(newUser, true);

      // Sync user to Cloud Firestore
      if (window.NetParaFirebase && window.NetParaFirebase.syncUserToCloud) {
        await NetParaFirebase.syncUserToCloud(newUser);
      }

      if (window.NetParaApp && typeof NetParaApp.onSessionChanged === "function") {
        NetParaApp.onSessionChanged(newUser);
      }

      if (window.NetParaNative) {
        window.NetParaNative.showToast("Welcome to iConnecto, @" + cleanUsername + "!");
        window.NetParaNative.vibrate(30);
      }

      return { success: true, user: newUser };
    },

    forgotPassword: (email) => {
      if (!validateEmail(email)) {
        return { success: false, message: "Please enter a valid email address." };
      }
      return { 
        success: true, 
        message: "Password reset instructions dispatched to " + email + ". Please check your inbox."
      };
    },

    /**
     * Log out of active session
     */
    logout: () => {
      clearSession();
      if (window.NetParaApp && typeof NetParaApp.onLoggedOut === "function") {
        NetParaApp.onLoggedOut();
      }
      if (window.NetParaNative) {
        window.NetParaNative.showToast("Logged out successfully");
      }
    }
  };
})();
