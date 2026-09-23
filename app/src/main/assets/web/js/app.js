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
      const me = NetParaBackend.getCurrentUser();
      if (me) {
        NetParaAuth.login(me.username, "password123", true);
      } else {
        showAuthScreen();
        return;
      }
    }

    // Initialize modules
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
      NetParaProfile.show(params.uid || "user_me");
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
      const me = NetParaBackend.getCurrentUser();
      if (me) {
        NetParaAuth.login(me.username, "password123", true);
      }
    }
    navigate("feed");
  }

  function showAuthScreen() {
    const screen = document.getElementById("auth-overlay");
    if (screen) screen.style.display = "flex";
  }

  function hideAuthScreen() {
    const screen = document.getElementById("auth-overlay");
    if (screen) screen.style.display = "none";
    navigate("feed");
  }

  return {
    init,
    navigate,
    updateBadges: updateGlobalBadges,
    finishOnboarding,
    showAuthScreen,
    hideAuthScreen,

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
        const url = "https://netpara.social/p/" + reportTarget.id;
        if (window.NetParaNative && window.NetParaNative.copyToClipboard) {
          window.NetParaNative.copyToClipboard(url);
        } else {
          navigator.clipboard?.writeText(url);
          alert("Link copied!");
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
