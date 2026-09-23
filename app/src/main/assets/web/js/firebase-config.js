/**
 * NetPara Firebase Cloud Real-time Engine
 * Connects Cloud Firestore, Authentication & Realtime Listeners
 * Supports Offline Persistence, Live Bidirectional Sync, and Failover
 */

const NetParaFirebase = (function () {
  const STORAGE_KEY = "netpara_custom_firebase_cfg";

  // Default Firebase configuration template
  const defaultFirebaseConfig = {
    apiKey: "AIzaSyNetParaLiveAppKey2026_SecureSync",
    authDomain: "netpara-social.firebaseapp.com",
    projectId: "netpara-social",
    storageBucket: "netpara-social.appspot.com",
    messagingSenderId: "662286982624",
    appId: "1:662286982624:android:9d45e45a271cb891",
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

        if (!firebase.apps || firebase.apps.length === 0) {
          firebase.initializeApp(config);
        }

        db = firebase.firestore();
        auth = firebase.auth();

        // Enable multi-tab offline persistence
        try {
          await db.enablePersistence({ synchronizeTabs: true });
          console.log("Firestore offline persistence enabled.");
        } catch (err) {
          if (err.code === "failed-precondition") {
            console.warn("Firestore persistence failed-precondition: multiple tabs open.");
          } else if (err.code === "unimplemented") {
            console.warn("Firestore persistence not supported in this browser environment.");
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
     * Real-time Data Sync Listeners for Feed, Messages, Calls & Notifications
     */
    startRealtimeListeners: function () {
      if (!db) return;

      // 1. Real-time Incoming Calls Listener (1-to-1 WebRTC)
      try {
        const currentUser = NetParaBackend.getCurrentUser();
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

      // 2. Real-time Posts Listener
      try {
        const unsubPosts = db.collection("posts")
          .orderBy("createdAt", "desc")
          .limit(40)
          .onSnapshot((snapshot) => {
            if (!snapshot.empty) {
              const cloudPosts = [];
              snapshot.forEach(doc => {
                cloudPosts.push({ id: doc.id, ...doc.data() });
              });

              // Merge cloud posts with local feed
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

      // 3. Real-time Messages Listener
      try {
        const currentUser = NetParaBackend.getCurrentUser();
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
