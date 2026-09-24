/**
 * NetPará Settings & Preferences Module
 * Privacy, Security, Appearance themes, Languages, and Monetization.
 */

const NetParaSettings = (function () {
  let isDarkMode = false;
  let isPrivate = false;

  function initSettings() {
    // Check local or system dark mode preference
    const savedTheme = localStorage.getItem("netpara_theme");
    if (savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setTheme("dark");
    } else {
      setTheme("light");
    }

    const currentUser = NetParaBackend.getCurrentUser();
    isPrivate = currentUser ? currentUser.isPrivate : false;

    // Check admin visibility
    const adminRow = document.getElementById("settings-admin-row");
    if (adminRow) {
      adminRow.style.display = currentUser?.role === "admin" ? "flex" : "none";
    }
  }

  function setTheme(theme) {
    if (theme === "dark") {
      document.body.classList.add("dark-mode");
      isDarkMode = true;
      localStorage.setItem("netpara_theme", "dark");
    } else {
      document.body.classList.remove("dark-mode");
      isDarkMode = false;
      localStorage.setItem("netpara_theme", "light");
    }

    const themeToggle = document.getElementById("setting-theme-toggle");
    if (themeToggle) themeToggle.checked = isDarkMode;
  }

  return {
    init: initSettings,

    toggleTheme: () => {
      setTheme(isDarkMode ? "light" : "dark");
      if (window.NetParaNative) {
        window.NetParaNative.showToast(isDarkMode ? "Dark mode activated" : "Light mode activated");
      }
    },

    togglePrivateProfile: () => {
      isPrivate = !isPrivate;
      NetParaBackend.updateUser("user_me", { isPrivate });
      if (window.NetParaNative) {
        window.NetParaNative.showToast(isPrivate ? "Profile is now private" : "Profile is now public");
      }
    },

    setLanguage: (lang) => {
      localStorage.setItem("netpara_language", lang);
      if (window.NetParaNative) {
        window.NetParaNative.showToast("Language updated to " + lang);
      }
    },

    openPremiumModal: () => {
      const modal = document.getElementById("premium-modal");
      if (modal) modal.classList.add("open");
    },

    closePremiumModal: () => {
      const modal = document.getElementById("premium-modal");
      if (modal) modal.classList.remove("open");
    },

    watchRewardedForGold: () => {
      NetParaSettings.onRewardedRewardEarned(1, "gold_vip");
    },

    onRewardedRewardEarned: (amount, type) => {
      NetParaBackend.updateUser("user_me", { isPremium: true, isVerified: true });
      if (window.NetParaNative) {
        window.NetParaNative.setAdFree(true);
        window.NetParaNative.showToast("🎉 NetPara Gold VIP Activated!");
      }
      NetParaSettings.closePremiumModal();
      NetParaProfile.show("user_me");
    },

    openBlockedUsersModal: () => {
      const modal = document.getElementById("blocked-users-modal");
      if (modal) {
        modal.classList.add("open");
        const listEl = document.getElementById("blocked-users-list");
        const me = NetParaBackend.getCurrentUser();
        const blocked = me?.blockedUsers || [];
        if (blocked.length === 0) {
          listEl.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">You have no blocked users.</p>';
        } else {
          listEl.innerHTML = blocked.map(uid => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--surface-border);">
              <span>User ${uid}</span>
              <button class="btn-secondary" onclick="NetParaSettings.unblockUser('${uid}')">Unblock</button>
            </div>
          `).join("");
        }
      }
    },

    closeBlockedUsersModal: () => {
      const modal = document.getElementById("blocked-users-modal");
      if (modal) modal.classList.remove("open");
    },

    openFirebaseModal: () => {
      const modal = document.getElementById("firebase-cloud-modal");
      if (modal) {
        modal.classList.add("open");
        const statusEl = document.getElementById("firebase-status-display");
        const isConnected = window.NetParaFirebase && window.NetParaFirebase.isConnected();
        if (statusEl) {
          statusEl.innerHTML = isConnected
            ? `<span style="color: #10B981; font-weight: bold;">🟢 Cloud Firestore Live & Synced</span>`
            : `<span style="color: #F59E0B; font-weight: bold;">🟡 Local Offline Mode (Auto-reconnecting)</span>`;
        }
        const cfgInput = document.getElementById("firebase-config-custom-input");
        if (cfgInput && window.NetParaFirebase) {
          try {
            const currentCfg = NetParaFirebase.getConfig();
            if (currentCfg && currentCfg.projectId !== "netpara-social") {
              cfgInput.value = JSON.stringify(currentCfg, null, 2);
            }
          } catch (_) {}
        }
      }
    },

    closeFirebaseModal: () => {
      const modal = document.getElementById("firebase-cloud-modal");
      if (modal) modal.classList.remove("open");
    },

    saveCustomFirebaseConfig: async () => {
      const input = document.getElementById("firebase-config-custom-input")?.value;
      if (!input || !input.trim()) {
        alert("Please paste your Firebase configuration snippet or JSON.");
        return;
      }

      try {
        if (window.NetParaFirebase) {
          const res = await NetParaFirebase.applyCustomConfig(input);
          if (res.success) {
            if (window.NetParaNative) {
              window.NetParaNative.showToast("Firebase Connected Successfully! 🎉");
            } else {
              alert("Firebase Connected Successfully! 🎉");
            }
            NetParaSettings.openFirebaseModal(); // refresh status
          } else {
            alert("Firebase connection could not be established. Please verify your keys.");
          }
        }
      } catch (err) {
        alert(err.message || "Failed to parse Firebase configuration.");
      }
    },

    resetFirebaseConfig: async () => {
      if (confirm("Reset to NetPará default live Cloud configuration?")) {
        if (window.NetParaFirebase) {
          await NetParaFirebase.resetToDefaultConfig();
          const cfgInput = document.getElementById("firebase-config-custom-input");
          if (cfgInput) cfgInput.value = "";
          NetParaSettings.openFirebaseModal();
          if (window.NetParaNative) {
            window.NetParaNative.showToast("Reset to default cloud sync");
          }
        }
      }
    },

    unblockUser: (uid) => {
      const me = NetParaBackend.getCurrentUser();
      if (me && me.blockedUsers) {
        me.blockedUsers = me.blockedUsers.filter(id => id !== uid);
        NetParaBackend.save();
        NetParaSettings.openBlockedUsersModal();
        if (window.NetParaNative) {
          window.NetParaNative.showToast("User unblocked");
        }
      }
    },

    logout: () => {
      if (confirm("Are you sure you want to log out of NetPará?")) {
        NetParaAuth.logout();
        NetParaApp.showAuthScreen();
      }
    }
  };
})();
