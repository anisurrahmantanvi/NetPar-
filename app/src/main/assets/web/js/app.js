/**
 * NetPará Master App Controller & Router
 */

const NetParaApp = (function () {
  let currentView = "feed";
  let previousView = null;
  let reportTarget = { type: null, id: null };

  function init() {
    // Check first-time onboarding
    const seenOnboarding = localStorage.getItem("netpara_seen_onboarding");
    if (!seenOnboarding) {
      showOnboarding();
      return;
    }

    // Check Authentication
    if (!NetParaAuth.isLoggedIn()) {
      const explicitLogout = localStorage.getItem("iconnecto_explicit_logout") === "true";
      if (!explicitLogout) {
        const saved = NetParaAuth.getSavedAccounts();
        if (saved && saved.length > 0) {
          NetParaAuth.switchToAccount(saved[0].uid);
        } else {
          showAuthScreen("login");
          return;
        }
      } else {
        showAuthScreen("accounts");
        return;
      }
    }

    // Initialize modules
    if (window.NetParaFirebase) {
      NetParaFirebase.init();
    }
    NetParaSettings.init();
    NetParaFeed.init();
    NetParaNotifications.init();
    NetParaChat.init();
    if (window.NetParaCall) {
      NetParaCall.init();
    }
    updateGlobalBadges();

    // Check device info from native bridge
    if (window.NetParaNative && window.NetParaNative.getDeviceInfo) {
      console.log("Device Info:", window.NetParaNative.getDeviceInfo());
    }

    // Query initial network state
    if (window.NetParaNative && window.NetParaNative.getNetworkStatus) {
      try {
        const net = JSON.parse(window.NetParaNative.getNetworkStatus());
        updateNetworkUI(net.isConnected, net.connectionType);
      } catch (e) {}
    }
  }

  function updateGlobalBadges() {
    // Friends pending count
    const pendingReqs = (window.NetParaBackend && NetParaBackend.getFriendRequests) ? NetParaBackend.getFriendRequests() : [];
    const friendsBadge = document.getElementById("nav-friends-badge");
    const menuFriendsBadge = document.getElementById("menu-friends-badge");
    const tabRequestsBadge = document.getElementById("tab-requests-badge");
    if (friendsBadge) {
      friendsBadge.innerText = pendingReqs.length;
      friendsBadge.style.display = pendingReqs.length > 0 ? "flex" : "none";
    }
    if (menuFriendsBadge) {
      menuFriendsBadge.innerText = `${pendingReqs.length} new`;
      menuFriendsBadge.style.display = pendingReqs.length > 0 ? "inline-block" : "none";
    }
    if (tabRequestsBadge) {
      tabRequestsBadge.innerText = pendingReqs.length;
      tabRequestsBadge.style.display = pendingReqs.length > 0 ? "inline-block" : "none";
    }

    // Notifications unread count
    const unreadCount = (window.NetParaBackend && NetParaBackend.getUnreadNotificationsCount) ? NetParaBackend.getUnreadNotificationsCount() : 0;
    const notifBadge = document.getElementById("nav-notif-badge");
    const topNotifBadge = document.getElementById("top-notif-badge");
    if (notifBadge) {
      notifBadge.innerText = unreadCount;
      notifBadge.style.display = unreadCount > 0 ? "flex" : "none";
    }
    if (topNotifBadge) {
      topNotifBadge.innerText = unreadCount;
      topNotifBadge.style.display = unreadCount > 0 ? "flex" : "none";
    }
  }

  function updateNetworkUI(isConnected, type) {
    const pill = document.getElementById("top-network-pill");
    const label = document.getElementById("top-network-label");
    if (!pill || !label) return;

    if (isConnected) {
      pill.className = "network-pill";
      label.innerText = type || "Online";
    } else {
      pill.className = "network-pill offline";
      label.innerText = "Offline Mode";
    }
  }

  function navigate(viewName, params = {}) {
    previousView = currentView;
    currentView = viewName;

    document.querySelectorAll(".view-page").forEach(page => {
      page.classList.remove("active");
    });

    const targetPage = document.getElementById("view-" + viewName);
    if (targetPage) {
      targetPage.classList.add("active");
    }

    // Update bottom navigation bar active state
    document.querySelectorAll(".nav-item").forEach(item => {
      item.classList.remove("active");
    });
    const navItem = document.getElementById("nav-" + viewName);
    if (navItem) navItem.classList.add("active");

    // View-specific initializations
    if (viewName === "feed") {
      NetParaFeed.init();
    } else if (viewName === "reels") {
      NetParaReels.init();
    } else if (viewName === "friends") {
      NetParaFriends.init();
    } else if (viewName === "messages") {
      NetParaChat.init();
    } else if (viewName === "notifications") {
      NetParaNotifications.init();
    } else if (viewName === "profile") {
      NetParaProfile.show(params.uid || NetParaBackend.getCurrentUserId());
    } else if (viewName === "menu") {
      NetParaMenu.init();
    }
  }

  function showOnboarding() {
    const screen = document.getElementById("onboarding-overlay");
    if (screen) screen.style.display = "flex";
  }

  function finishOnboarding() {
    localStorage.setItem("netpara_seen_onboarding", "true");
    const screen = document.getElementById("onboarding-overlay");
    if (screen) screen.style.display = "none";
    if (!NetParaAuth.isLoggedIn()) {
      showAuthScreen("accounts");
      return;
    }
    navigate("feed");
  }

  function updateUserInterface() {
    const me = NetParaBackend.getCurrentUser();
    if (!me) return;

    // Update Composer Avatar
    const composerAvatar = document.getElementById("home-composer-avatar");
    if (composerAvatar) composerAvatar.src = me.avatarUrl || "img/avatar_anisur_tanvi.jpg";

    // Update Menu Card
    if (window.NetParaMenu && typeof NetParaMenu.init === "function") {
      NetParaMenu.init();
    }

    // Refresh Feed to reflect reactions and author permissions
    if (window.NetParaFeed && typeof NetParaFeed.render === "function") {
      NetParaFeed.render();
    }

    // Update profile if currently on profile view
    if (currentView === "profile" && window.NetParaProfile && typeof NetParaProfile.show === "function") {
      NetParaProfile.show(me.uid);
    }

    updateGlobalBadges();
  }

  function renderAuthAccountsList() {
    const container = document.getElementById("auth-saved-accounts-list");
    if (!container) return;

    const accounts = NetParaAuth.getSavedAccounts();
    const currentSession = NetParaAuth.getCurrentSession();

    if (!accounts || accounts.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 16px; color: var(--text-muted); font-size: 0.85rem;">
          No saved accounts on this device yet.<br>Please sign in or create a new ID below.
        </div>
      `;
      return;
    }

    container.innerHTML = accounts.map(acc => {
      const isActive = currentSession && currentSession.uid === acc.uid;
      return `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; margin-bottom: 8px; border-radius: 12px; background: var(--surface-secondary); border: 1px solid ${isActive ? 'var(--primary)' : 'var(--surface-border)'};">
          <div style="display: flex; align-items: center; gap: 10px; cursor: pointer; flex: 1;" onclick="NetParaAuth.switchToAccount('${acc.uid}')">
            <img src="${acc.avatarUrl || 'img/avatar_anisur_tanvi.jpg'}" style="width: 42px; height: 42px; border-radius: 99px; object-fit: cover; border: 2px solid var(--primary-light);" alt="${acc.fullName}" />
            <div>
              <div style="font-weight: 700; font-size: 0.92rem; display: flex; align-items: center; gap: 6px;">
                ${acc.fullName}
                ${isActive ? '<span style="font-size: 0.65rem; background: var(--primary); color: #FFF; padding: 2px 6px; border-radius: 99px; font-weight: 800;">ACTIVE</span>' : ''}
              </div>
              <div style="font-size: 0.78rem; color: var(--text-muted);">@${acc.username}</div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <button class="${isActive ? 'btn-secondary' : 'btn-primary'}" style="font-size: 0.78rem; padding: 6px 12px;" onclick="NetParaAuth.switchToAccount('${acc.uid}')">
              ${isActive ? 'Active' : 'Log In'}
            </button>
            ${!isActive ? `<button class="icon-btn" style="font-size: 0.8rem; color: var(--text-muted); padding: 4px;" title="Remove from device" onclick="NetParaAuth.removeSavedAccount('${acc.uid}'); NetParaApp.renderAuthAccountsList();">✕</button>` : ''}
          </div>
        </div>
      `;
    }).join("");
  }

  function showAuthScreen(tab = "accounts") {
    const screen = document.getElementById("auth-overlay");
    if (screen) {
      screen.style.display = "flex";
      renderAuthAccountsList();
      if (typeof window.toggleAuthTab === "function") {
        window.toggleAuthTab(tab);
      }
      const closeBtn = document.getElementById("btn-close-auth-modal");
      if (closeBtn) {
        closeBtn.style.display = NetParaAuth.isLoggedIn() ? "inline-flex" : "none";
      }
    }
  }

  function hideAuthScreen() {
    const screen = document.getElementById("auth-overlay");
    if (screen) screen.style.display = "none";
  }

  function onSessionChanged(user) {
    hideAuthScreen();
    updateUserInterface();
    navigate("feed");
  }

  function onLoggedOut() {
    showAuthScreen("accounts");
  }

  return {
    init,
    navigate,
    updateBadges: updateGlobalBadges,
    updateUserInterface,
    finishOnboarding,
    showAuthScreen,
    hideAuthScreen,
    renderAuthAccountsList,
    onSessionChanged,
    onLoggedOut,

    openProfile: (uid) => {
      navigate("profile", { uid });
    },

    openUserProfileByName: (username) => {
      const db = NetParaBackend.getDb();
      const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
      if (user) {
        NetParaApp.openProfile(user.uid);
      } else {
        if (window.NetParaNative) {
          window.NetParaNative.showToast("User @" + username + " not found");
        }
      }
    },

    searchTag: (tag) => {
      if (window.NetParaNative) {
        window.NetParaNative.showToast("Searching posts with #" + tag);
      }
      navigate("feed");
    },

    openSettings: () => {
      const modal = document.getElementById("settings-modal");
      if (modal) modal.classList.add("open");
    },

    closeSettings: () => {
      const modal = document.getElementById("settings-modal");
      if (modal) modal.classList.remove("open");
    },

    openPostOptionsMenu: (postId, authorId) => {
      reportTarget = { type: "post", id: postId, authorId };
      const modal = document.getElementById("post-options-modal");
      if (modal) modal.classList.add("open");
    },

    closePostOptionsMenu: () => {
      const modal = document.getElementById("post-options-modal");
      if (modal) modal.classList.remove("open");
    },

    handlePostOption: (action) => {
      NetParaApp.closePostOptionsMenu();
      if (action === "report") {
        NetParaApp.openReportModal(reportTarget.type, reportTarget.id);
      } else if (action === "copy") {
        const url = "https://iconnecto.web.app/post/" + reportTarget.id;
        if (window.NetParaNative && window.NetParaNative.copyToClipboard) {
          window.NetParaNative.copyToClipboard(url);
        } else {
          navigator.clipboard?.writeText(url);
          alert("Post link copied: " + url);
        }
      } else if (action === "delete") {
        if (confirm("Delete this post?")) {
          NetParaBackend.deletePost(reportTarget.id);
          NetParaFeed.init();
          if (window.NetParaNative) {
            window.NetParaNative.showToast("Post deleted");
          }
        }
      }
    },

    currentDetailPostId: null,

    openPostDetails: async function (postId) {
      if (!postId) return;
      NetParaApp.currentDetailPostId = postId;
      navigate("post-details");

      const loadingEl = document.getElementById("post-details-loading");
      const notFoundEl = document.getElementById("post-details-not-found");
      const cardEl = document.getElementById("post-details-card");

      if (loadingEl) loadingEl.style.display = "block";
      if (notFoundEl) notFoundEl.style.display = "none";
      if (cardEl) cardEl.style.display = "none";

      let post = NetParaBackend.getPosts().find(p => p.id === postId || p.postId === postId);

      // If not in local cache, query live Cloud Firestore
      if (!post && window.firebase && firebase.firestore) {
        try {
          const snap = await firebase.firestore().collection("posts").doc(postId).get();
          if (snap.exists) {
            const data = snap.data();
            post = {
              id: snap.id,
              postId: snap.id,
              authorId: data.authorId,
              authorName: data.authorName,
              authorAvatar: data.authorPhoto || data.authorAvatar,
              authorVerified: false,
              content: data.text || data.content,
              mediaUrls: data.mediaUrl ? [data.mediaUrl] : (data.mediaUrls || []),
              videoUrl: data.mediaType === "video" ? data.mediaUrl : null,
              likesCount: data.likeCount || 0,
              commentsCount: data.commentCount || 0,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate().getTime() : Date.now()
            };
          }
        } catch (e) {
          console.warn("Firestore post fetch note:", e);
        }
      }

      if (loadingEl) loadingEl.style.display = "none";

      if (!post) {
        if (notFoundEl) notFoundEl.style.display = "block";
        return;
      }

      if (cardEl) cardEl.style.display = "block";

      // Render author info
      const avatarEl = document.getElementById("post-detail-avatar");
      const nameEl = document.getElementById("post-detail-author-name");
      const timeEl = document.getElementById("post-detail-timestamp");
      const contentEl = document.getElementById("post-detail-content");
      const publicUrlEl = document.getElementById("post-detail-public-url");

      if (avatarEl) avatarEl.src = post.authorAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80";
      if (nameEl) nameEl.innerText = post.authorName || "User";
      if (timeEl) timeEl.innerText = new Date(post.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
      if (contentEl) contentEl.innerText = post.content || post.text || "";

      const publicUrl = "https://iconnecto.web.app/post/" + (post.id || post.postId);
      if (publicUrlEl) publicUrlEl.innerText = publicUrl;

      // Media
      const mediaBox = document.getElementById("post-detail-media-box");
      const imgEl = document.getElementById("post-detail-img");
      const videoEl = document.getElementById("post-detail-video");

      if (mediaBox && imgEl && videoEl) {
        if (post.mediaUrls && post.mediaUrls.length > 0) {
          mediaBox.style.display = "block";
          imgEl.style.display = "block";
          imgEl.src = post.mediaUrls[0];
          videoEl.style.display = "none";
        } else if (post.videoUrl) {
          mediaBox.style.display = "block";
          videoEl.style.display = "block";
          videoEl.src = post.videoUrl;
          imgEl.style.display = "none";
        } else {
          mediaBox.style.display = "none";
        }
      }

      // Counters
      const likeCountEl = document.getElementById("post-detail-like-count");
      const commentCountEl = document.getElementById("post-detail-comment-count");
      if (likeCountEl) likeCountEl.innerText = post.likesCount || 0;
      if (commentCountEl) commentCountEl.innerText = post.commentsCount || 0;

      NetParaApp.renderPostDetailComments(post.id || post.postId);
    },

    renderPostDetailComments: function (postId) {
      const container = document.getElementById("post-detail-comments-list");
      if (!container) return;

      const comments = NetParaBackend.getComments(postId);
      if (!comments || comments.length === 0) {
        container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 12px 0;">No comments yet. Write the first response!</div>';
        return;
      }

      container.innerHTML = comments.map(c => `
        <div style="display: flex; gap: 10px; align-items: flex-start;">
          <img src="${c.userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=60&q=80'}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; flex-shrink: 0;" />
          <div style="background: var(--surface-hover); border-radius: 10px; padding: 8px 12px; flex: 1;">
            <div style="font-weight: 700; font-size: 0.85rem;">${c.userName}</div>
            <div style="font-size: 0.88rem; margin-top: 2px;">${c.text}</div>
          </div>
        </div>
      `).join("");
    },

    toggleLikePostDetail: function () {
      if (!NetParaApp.currentDetailPostId) return;
      NetParaBackend.toggleReaction(NetParaApp.currentDetailPostId, "love");
      const post = NetParaBackend.getPosts().find(p => p.id === NetParaApp.currentDetailPostId);
      const countEl = document.getElementById("post-detail-like-count");
      if (countEl && post) countEl.innerText = post.likesCount || 0;
      if (window.NetParaNative) window.NetParaNative.vibrate(25);
    },

    toggleSavePostDetail: function () {
      if (!NetParaApp.currentDetailPostId) return;
      const isSaved = NetParaBackend.toggleSavePost(NetParaApp.currentDetailPostId);
      if (window.NetParaNative) {
        window.NetParaNative.showToast(isSaved ? "Saved to bookmarks" : "Removed from bookmarks");
      } else {
        alert(isSaved ? "Saved to bookmarks" : "Removed from bookmarks");
      }
    },

    shareCurrentPostDetail: function () {
      if (!NetParaApp.currentDetailPostId) return;
      const url = "https://iconnecto.web.app/post/" + NetParaApp.currentDetailPostId;
      if (window.NetParaNative && window.NetParaNative.shareContent) {
        window.NetParaNative.shareContent("iConnecto Post", "Check out this post on iConnecto", url);
      } else if (navigator.share) {
        navigator.share({ title: "iConnecto", text: "Check out this post on iConnecto", url }).catch(() => {});
      } else {
        NetParaApp.copyCurrentPostDetailUrl();
      }
    },

    copyCurrentPostDetailUrl: function () {
      if (!NetParaApp.currentDetailPostId) return;
      const url = "https://iconnecto.web.app/post/" + NetParaApp.currentDetailPostId;
      if (window.NetParaNative && window.NetParaNative.copyToClipboard) {
        window.NetParaNative.copyToClipboard(url);
        window.NetParaNative.showToast("Link copied to clipboard! 📋");
      } else {
        navigator.clipboard?.writeText(url);
        alert("Link copied: " + url);
      }
    },

    submitPostDetailComment: function () {
      const input = document.getElementById("post-detail-comment-input");
      if (!input || !input.value.trim() || !NetParaApp.currentDetailPostId) return;
      const text = input.value.trim();
      input.value = "";

      NetParaBackend.addComment(NetParaApp.currentDetailPostId, text);
      NetParaApp.renderPostDetailComments(NetParaApp.currentDetailPostId);
      const post = NetParaBackend.getPosts().find(p => p.id === NetParaApp.currentDetailPostId);
      const countEl = document.getElementById("post-detail-comment-count");
      if (countEl && post) countEl.innerText = post.commentsCount || 0;
    },

    openShareModal: () => {
      const modal = document.getElementById("share-app-modal");
      if (modal) modal.classList.add("open");
    },

    closeShareModal: () => {
      const modal = document.getElementById("share-app-modal");
      if (modal) modal.classList.remove("open");
    },

    copyShareLink: () => {
      const link = document.getElementById("share-link-input")?.value || "https://ais-pre-czpha2xhfpu3xecmg3uwy5-662286982624.asia-east1.run.app";
      if (window.NetParaNative && window.NetParaNative.copyToClipboard) {
        window.NetParaNative.copyToClipboard(link);
        window.NetParaNative.showToast("লিংক কপি হয়েছে! বন্ধুদের পাঠিয়ে দিন 🎉");
      } else {
        navigator.clipboard?.writeText(link).then(() => {
          if (window.NetParaNative) {
            window.NetParaNative.showToast("লিংক কপি হয়েছে!");
          } else {
            alert("লিংক কপি হয়েছে! বন্ধুদের সাথে শেয়ার করুন 🎉");
          }
        }).catch(() => {
          prompt("লিংকটি কপি করে বন্ধুদের পাঠান:", link);
        });
      }
    },

    shareToWhatsApp: () => {
      const link = "https://ais-pre-czpha2xhfpu3xecmg3uwy5-662286982624.asia-east1.run.app";
      const text = encodeURIComponent(`iConnecto — Connect. Share. Belong. 🚀\nআমার সাথে iConnecto সোশ্যাল অ্যাপে যুক্ত হও! লাইভ পোস্ট, রিয়েলটাইম চ্যাট ও এইচডি ভিডিও কল করতে লিংক:\n${link}`);
      window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    },

    triggerNativeShare: () => {
      const link = "https://ais-pre-czpha2xhfpu3xecmg3uwy5-662286982624.asia-east1.run.app";
      const shareData = {
        title: "iConnecto - Connect. Share. Belong.",
        text: "iConnecto সোশ্যাল নেটওয়ার্কে আমার সাথে যুক্ত হও! পোস্ট, চ্যাট ও এইচডি কলিং:",
        url: link
      };
      if (navigator.share) {
        navigator.share(shareData).catch(() => {});
      } else {
        NetParaApp.copyShareLink();
      }
    },

    openReportModal: (type, id) => {
      reportTarget = { type, id };
      const modal = document.getElementById("report-modal");
      if (modal) modal.classList.add("open");
    },

    closeReportModal: () => {
      const modal = document.getElementById("report-modal");
      if (modal) modal.classList.remove("open");
    },

    submitReport: () => {
      const category = document.getElementById("report-category-select").value;
      const details = document.getElementById("report-details-input").value;
      NetParaBackend.submitReport({
        targetType: reportTarget.type,
        targetId: reportTarget.id,
        category,
        details
      });
      NetParaApp.closeReportModal();
      if (window.NetParaNative) {
        window.NetParaNative.showToast("Thank you. Your report is under review by moderators.");
      }
    },

    showStoryViewer: (story) => {
      const modal = document.getElementById("story-viewer-modal");
      const img = document.getElementById("story-viewer-img");
      const name = document.getElementById("story-viewer-author");
      if (modal && img && name) {
        img.src = story.mediaUrl;
        name.innerText = story.authorName;
        modal.classList.add("open");
      }
    },

    closeStoryViewer: () => {
      const modal = document.getElementById("story-viewer-modal");
      if (modal) modal.classList.remove("open");
    },

    viewImage: (url) => {
      const modal = document.getElementById("image-lightbox-modal");
      const img = document.getElementById("lightbox-img");
      if (modal && img) {
        img.src = url;
        modal.classList.add("open");
      }
    },

    closeLightbox: () => {
      const modal = document.getElementById("image-lightbox-modal");
      if (modal) modal.classList.remove("open");
    }
  };
})();

// Global Native Callbacks invoked by Android Kotlin Layer
window.onNetworkStatusChanged = function (isConnected, connectionType) {
  if (window.NetParaApp) {
    const pill = document.getElementById("top-network-pill");
    const label = document.getElementById("top-network-label");
    if (pill && label) {
      if (isConnected) {
        pill.className = "network-pill";
        label.innerText = connectionType || "Online";
      } else {
        pill.className = "network-pill offline";
        label.innerText = "Offline";
      }
    }
  }
};

window.onRewardedAdSuccess = function (amount, type) {
  if (window.NetParaSettings) {
    window.NetParaSettings.onRewardedRewardEarned(amount, type);
  }
};

window.handleAppBackPressed = function () {
  // If call is active or ringing
  if (window.NetParaCall && window.NetParaCall.getActiveCall()) {
    if (confirm("End current call?")) {
      window.NetParaCall.endCall('ended');
    }
    return true;
  }

  // If any open modal exists, close it
  const openModals = document.querySelectorAll(".modal-overlay.open");
  if (openModals.length > 0) {
    openModals.forEach(m => m.classList.remove("open"));
    return true; // handled!
  }

  // If in chat room, close chat room back to chat list
  const chatRoom = document.getElementById("chat-room-view");
  if (chatRoom && chatRoom.style.display === "flex") {
    NetParaChat.closeRoom();
    return true;
  }

  // If not on feed, return to feed
  const activeView = document.querySelector(".view-page.active");
  if (activeView && activeView.id !== "view-feed") {
    NetParaApp.navigate("feed");
    return true;
  }

  return false; // let Android handle double tap / exit
};

// Auto start when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  NetParaApp.init();
});
