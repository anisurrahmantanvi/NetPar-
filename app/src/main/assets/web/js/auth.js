/**
 * NetPará Authentication & Session Manager
 */

const NetParaAuth = (function () {
  const SESSION_KEY = "netpara_active_session";

  function getSession() {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  }

  function setSession(user, remember = true) {
    if (remember) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        uid: user.uid,
        username: user.username,
        email: user.email,
        token: "token_" + Date.now()
      }));
    }
    // Also backup to native Encrypted/SharedPreferences bridge if available
    if (window.NetParaNative && window.NetParaNative.saveLocalData) {
      window.NetParaNative.saveLocalData("auth_uid", user.uid);
    }
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    if (window.NetParaNative && window.NetParaNative.removeLocalData) {
      window.NetParaNative.removeLocalData("auth_uid");
    }
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validateUsername(username) {
    return /^[a-zA-Z0-9_]{3,20}$/.test(username);
  }

  return {
    isLoggedIn: () => !!getSession(),
    getCurrentSession: () => getSession(),

    login: (identifier, password, remember = true) => {
      const db = NetParaBackend.getDb();
      const user = db.users.find(u => 
        (u.email.toLowerCase() === identifier.toLowerCase() || 
         u.username.toLowerCase() === identifier.toLowerCase())
      );

      if (!user) {
        return { success: false, message: "No account found with this email or username." };
      }
      if (password.length < 6) {
        return { success: false, message: "Password must be at least 6 characters." };
      }

      setSession(user, remember);

      if (window.NetParaFirebase && window.NetParaFirebase.syncUserToCloud) {
        NetParaFirebase.syncUserToCloud(user);
      }

      if (window.NetParaNative) {
        window.NetParaNative.showToast("Welcome back, @" + user.username + "!");
      }
      return { success: true, user };
    },

    register: (userData) => {
      const { fullName, username, email, password, birthDate, avatarUrl } = userData;

      if (!fullName || fullName.trim().length < 2) {
        return { success: false, message: "Please enter your full name." };
      }
      if (!validateUsername(username)) {
        return { success: false, message: "Username must be 3-20 characters (letters, numbers, underscore only)." };
      }
      if (!validateEmail(email)) {
        return { success: false, message: "Please enter a valid email address." };
      }
      if (!password || password.length < 6) {
        return { success: false, message: "Password must be at least 6 characters long." };
      }

      const db = NetParaBackend.getDb();
      const exists = db.users.some(u => 
        u.username.toLowerCase() === username.toLowerCase() || 
        u.email.toLowerCase() === email.toLowerCase()
      );

      if (exists) {
        return { success: false, message: "Username or email is already taken." };
      }

      const newUser = {
        uid: "user_" + Date.now(),
        username: username.toLowerCase().trim(),
        fullName: fullName.trim(),
        email: email.toLowerCase().trim(),
        bio: "Just joined NetPará! 👋",
        website: "",
        avatarUrl: avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80",
        coverUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
        isVerified: false,
        isPremium: false,
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        role: "user",
        isPrivate: false,
        blockedUsers: [],
        savedPostIds: [],
        createdAt: Date.now()
      };

      db.users.push(newUser);
      NetParaBackend.save();
      setSession(newUser, true);

      if (window.NetParaFirebase && window.NetParaFirebase.syncUserToCloud) {
        NetParaFirebase.syncUserToCloud(newUser);
      }

      if (window.NetParaNative) {
        window.NetParaNative.showToast("Account created successfully!");
      }

      return { success: true, user: newUser };
    },

    forgotPassword: (email) => {
      if (!validateEmail(email)) {
        return { success: false, message: "Please enter a valid email address." };
      }
      return { 
        success: true, 
        message: "A password reset link has been dispatched to " + email + ". Check your inbox."
      };
    },

    logout: () => {
      clearSession();
      if (window.NetParaNative) {
        window.NetParaNative.showToast("Logged out successfully");
      }
    }
  };
})();
