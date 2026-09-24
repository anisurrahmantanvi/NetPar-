/**
 * NetPara Firebase Cloud Real-time Engine
 * Connects Cloud Firestore, Authentication & Realtime Listeners
 * Supports Offline Persistence, Live Bidirectional Sync, and Dynamic Config
 */

const NetParaFirebase = (function () {
  const STORAGE_KEY = "netpara_custom_firebase_cfg";

  // Default Firebase configuration
  const defaultFirebaseConfig = {
    apiKey: "AIzaSyNetParaLiveAppKey2026_SecureSync",
    authDomain: "netpara-social.firebaseapp.com",
    projectId: "netpara-social",
    storageBucket: "netpara-social.appspot.com",
    messagingSenderId: "662286982624",
    appId: "1:662286982624:web:9d45e45a271cb891",
    measurementId: "G-NETPARA2026"
  };

  let isInitialized = false;
  let isCloudConnected = false;
  let activeListeners = [];
  let db = null;
  let auth = null;

  function loadConfig() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Could not load stored firebase config:", e);
    }
    return defaultFirebaseConfig;
  }

  function saveConfig(cfg) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  }

  return {
    init: async function () {
      if (typeof firebase === "undefined") {
        console.warn("Firebase JS SDK not loaded yet. Running in local-first mode.");
        this.updatePillStatus(false, "Local Offline");
        return false;
      }

      try {
        const config = loadConfig();

        // If apps already initialized with different config, delete and reinit
        if (firebase.apps && firebase.apps.length > 0) {
          try {
            await firebase.app().delete();
          } catch (_) {}
        }

        firebase.initializeApp(config);

        db = firebase.firestore();
        auth = firebase.auth();

        // Enable multi-tab offline persistence
        try {
          await db.enablePersistence({ synchronizeTabs: true });
          console.log("Firestore offline persistence enabled.");
        } catch (err) {
          if (err.code === "failed-precondition") {
            console.warn("Firestore persistence: multiple tabs open.");
          } else if (err.code === "unimplemented") {
            console.warn("Firestore persistence not supported in this browser.");
          }
        }

        window.NetParaFirebaseDb = db;
        window.NetParaFirebaseAuth = auth;
        isInitialized = true;
        isCloudConnected = true;

        this.updatePillStatus(true, "Firebase Live");
        this.startRealtimeListeners();
        console.log("NetPara Real-time Cloud Database connected to Firebase!");
        return true;
      } catch (error) {
        console.error("Firebase init error:", error);
        isCloudConnected = false;
        this.updatePillStatus(false, "Offline / Demo");
        return false;
      }
    },

    /**
     * Parse any Firebase snippet or JSON string and connect
     */
    applyCustomConfig: async function (inputString) {
      if (!inputString || !inputString.trim()) {
        throw new Error("Please enter your Firebase configuration.");
      }

      let parsed = null;
      const clean = inputString.trim();

      // Check if raw JSON
      if (clean.startsWith("{") && clean.endsWith("}")) {
        try {
          parsed = JSON.parse(clean);
        } catch (e) {
          // If unquoted JSON keys, use regex extraction
        }
      }

      if (!parsed) {
        // Regex extract standard firebase config fields from JS code
        const extract = (key) => {
          const match = clean.match(new RegExp(`${key}\\s*:\\s*["']([^"']+)["']`));
          return match ? match[1] : null;
        };

        const apiKey = extract("apiKey");
        const projectId = extract("projectId");
        const authDomain = extract("authDomain") || (projectId ? `${projectId}.firebaseapp.com` : "");
        const storageBucket = extract("storageBucket") || (projectId ? `${projectId}.appspot.com` : "");
        const messagingSenderId = extract("messagingSenderId") || "";
        const appId = extract("appId") || "";

        if (!apiKey || !projectId) {
          throw new Error("Could not find 'apiKey' and 'projectId' in the pasted config. Please check your Firebase snippet.");
        }

        parsed = {
          apiKey,
          authDomain,
          projectId,
          storageBucket,
          messagingSenderId,
          appId
        };
      }

      saveConfig(parsed);
      const success = await this.init();
      return { success, config: parsed };
    },

    resetToDefaultConfig: async function () {
      localStorage.removeItem(STORAGE_KEY);
      await this.init();
    },

    /**
     * Real-time Data Sync Listeners for Feed, Messages, Calls, Users & Requests
     */
    startRealtimeListeners: function () {
      if (!db) return;

      // Stop previous listeners
      activeListeners.forEach(unsub => {
        try { unsub(); } catch (_) {}
      });
      activeListeners = [];

      const currentUser = NetParaBackend.getCurrentUser();

      // 1. Sync Current User Profile to Cloud
      if (currentUser) {
        this.syncUserToCloud(currentUser);
      }

      // 2. Real-time Incoming Calls Listener (1-to-1 WebRTC)
      try {
        if (currentUser) {
          const unsubCalls = db.collection("calls")
            .where("receiver.uid", "==", currentUser.uid)
            .where("status", "==", "ringing")
            .onSnapshot((snapshot) => {
              snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                  const callData = change.doc.data();
                  if (window.NetParaCall) {
                    window.NetParaCall.showIncomingCall({
                      id: change.doc.id,
                      caller: callData.caller,
                      type: callData.type || "video",
                      offer: callData.offer
                    });
                  }
                }
              });
            }, (err) => {
              console.warn("Calls listener:", err.message);
            });
          activeListeners.push(unsubCalls);
        }
      } catch (e) {
        console.warn("Calls listener setup err:", e);
      }

      // 3. Real-time Posts Listener (Everyone's posts live)
      try {
        const unsubPosts = db.collection("posts")
          .orderBy("createdAt", "desc")
          .limit(50)
          .onSnapshot((snapshot) => {
            if (!snapshot.empty) {
              const cloudPosts = [];
              snapshot.forEach(doc => {
                cloudPosts.push({ id: doc.id, ...doc.data() });
              });

              if (window.NetParaBackend && cloudPosts.length > 0) {
                NetParaBackend.mergeCloudPosts(cloudPosts);
                if (window.NetParaFeed && document.getElementById("view-feed")?.classList.contains("active")) {
                  NetParaFeed.render();
                }
              }
            }
          }, (err) => {
            console.warn("Posts sync listener:", err.message);
          });
        activeListeners.push(unsubPosts);
      } catch (e) {
        console.warn("Posts listener error:", e);
      }

      // 4. Real-time Users Discovery Listener
      // Syncs all registered friends across different phones
      try {
        const unsubUsers = db.collection("users")
          .limit(60)
          .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
              if (change.type === "added" || change.type === "modified") {
                const uData = change.doc.data();
                if (window.NetParaBackend) {
                  const dbLocal = NetParaBackend.getDb();
                  const idx = dbLocal.users.findIndex(u => u.uid === uData.uid);
                  if (idx === -1) {
                    dbLocal.users.push(uData);
                    NetParaBackend.save();
                  } else if (uData.uid !== "user_me") {
                    dbLocal.users[idx] = { ...dbLocal.users[idx], ...uData };
                    NetParaBackend.save();
                  }
                }
              }
            });
          }, (err) => {
            console.warn("Users listener error:", err.message);
          });
        activeListeners.push(unsubUsers);
      } catch (e) {
        console.warn("Users listener error:", e);
      }

      // 5. Real-time Messages Listener
      try {
        if (currentUser) {
          const unsubMessages = db.collection("conversations")
            .where("participants", "array-contains", currentUser.uid)
            .onSnapshot((snapshot) => {
              snapshot.docChanges().forEach((change) => {
                if (change.type === "modified" || change.type === "added") {
                  const convData = change.doc.data();
                  if (window.NetParaChat) {
                    NetParaChat.onRemoteMessageUpdate(change.doc.id, convData);
                  }
                }
              });
            }, (err) => {
              console.warn("Messages sync listener:", err.message);
            });
          activeListeners.push(unsubMessages);
        }
      } catch (e) {
        console.warn("Messages listener error:", e);
      }
    },

    /**
     * Sync user profile to Firestore
     */
    syncUserToCloud: async function (user) {
      if (!db || !isCloudConnected || !user) return false;
      try {
        await db.collection("users").doc(user.uid).set({
          uid: user.uid,
          username: user.username,
          fullName: user.fullName,
          nickname: user.nickname || "",
          avatarUrl: user.avatarUrl,
          coverUrl: user.coverUrl || "",
          bio: user.bio || "",
          isVerified: !!user.isVerified,
          isPremium: !!user.isPremium,
          isOnline: true,
          lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        return true;
      } catch (e) {
        console.warn("Error syncing user to Firestore:", e);
        return false;
      }
    },

    /**
     * Publish a new post to Cloud Firestore
     */
    publishPostToCloud: async function (post) {
      if (!db || !isCloudConnected) return false;
      try {
        await db.collection("posts").doc(post.id).set({
          ...post,
          syncedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log("Post published to Cloud Firestore:", post.id);
        return true;
      } catch (e) {
        console.warn("Error publishing post to Firestore:", e);
        return false;
      }
    },

    /**
     * Send direct message to Cloud Firestore
     */
    sendMessageToCloud: async function (convId, message, participantIds) {
      if (!db || !isCloudConnected) return false;
      try {
        const batch = db.batch();
        const convRef = db.collection("conversations").doc(convId);
        batch.set(convRef, {
          id: convId,
          participants: participantIds,
          lastMessage: message.text,
          lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        const msgRef = convRef.collection("messages").doc(message.id);
        batch.set(msgRef, {
          ...message,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        await batch.commit();
        return true;
      } catch (e) {
        console.warn("Error syncing message to cloud:", e);
        return false;
      }
    },

    /**
     * Visual Indicator Update
     */
    updatePillStatus: function (isOnline, label) {
      const pill = document.getElementById("top-network-pill");
      const textLabel = document.getElementById("top-network-label");
      if (!pill || !textLabel) return;

      if (isOnline) {
        pill.classList.remove("offline");
        pill.classList.add("firebase-live");
        textLabel.innerHTML = `<span>⚡</span> ${label || "Firebase Live"}`;
      } else {
        pill.classList.remove("firebase-live");
        pill.classList.add("offline");
        textLabel.innerHTML = label || "Offline";
      }
    },

    getConfig: loadConfig,
    saveConfig: saveConfig,
    isConnected: () => isCloudConnected,
    getDb: () => db,
    getAuth: () => auth
  };
})();
