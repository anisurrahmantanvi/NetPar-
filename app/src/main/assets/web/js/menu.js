/**
 * NetPará Menu Controller
 * Manages the Menu hub including Profile link, Shortcuts grid, Settings, Help & Support, FAQs, and Account actions.
 */

const NetParaMenu = (function () {
  function init() {
    renderUserCard();
    renderShortcuts();
    syncSettingsControls();
  }

  function renderUserCard() {
    const me = NetParaBackend.getCurrentUser();
    const avatarEl = document.getElementById("menu-user-avatar");
    const nameEl = document.getElementById("menu-user-name");
    const handleEl = document.getElementById("menu-user-handle");
    const vipEl = document.getElementById("menu-user-vip");
    const verifiedEl = document.getElementById("menu-user-verified");

    if (avatarEl && me) avatarEl.src = me.avatarUrl;
    if (nameEl && me) {
      nameEl.innerText = me.nickname ? `${me.fullName} (${me.nickname})` : me.fullName;
    }
    if (handleEl && me) handleEl.innerText = "@" + me.username;
    if (vipEl && me) vipEl.style.display = me.isPremium ? "inline-flex" : "none";
    if (verifiedEl && me) verifiedEl.style.display = me.isVerified ? "inline-flex" : "none";
  }

  function renderShortcuts() {
    const me = NetParaBackend.getCurrentUser();
    const adminShortcut = document.getElementById("menu-shortcut-admin");
    if (adminShortcut) {
      adminShortcut.style.display = me?.role === "admin" ? "flex" : "none";
    }
    NetParaFriends.updateBadge();
  }

  function syncSettingsControls() {
    const isDark = document.body.classList.contains("dark-mode");
    const themeCheckbox = document.getElementById("menu-theme-checkbox");
    if (themeCheckbox) themeCheckbox.checked = isDark;

    const me = NetParaBackend.getCurrentUser();
    const privateCheckbox = document.getElementById("menu-privacy-checkbox");
    if (privateCheckbox && me) privateCheckbox.checked = !!me.isPrivate;
  }

  return {
    init,

    toggleTheme: () => {
      NetParaSettings.toggleTheme();
      syncSettingsControls();
    },

    togglePrivacy: () => {
      NetParaSettings.togglePrivateProfile();
      syncSettingsControls();
    },

    toggleAccordion: (id) => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.toggle("open");
      }
    },

    openReportModal: () => {
      const modal = document.getElementById("menu-report-modal");
      if (modal) modal.classList.add("open");
    },

    closeReportModal: () => {
      const modal = document.getElementById("menu-report-modal");
      if (modal) modal.classList.remove("open");
    },

    submitReportProblem: () => {
      const category = document.getElementById("report-problem-category")?.value || "general";
      const details = document.getElementById("report-problem-text")?.value || "";

      if (!details.trim()) {
        alert("Please describe the issue you encountered.");
        return;
      }

      NetParaBackend.submitReport({
        targetType: "problem_report",
        targetId: "sys_" + Date.now(),
        category,
        details
      });

      NetParaMenu.closeReportModal();
      const textInput = document.getElementById("report-problem-text");
      if (textInput) textInput.value = "";

      if (window.NetParaNative) {
        window.NetParaNative.showToast("Problem report submitted to NetPará team. Thank you!");
        window.NetParaNative.vibrate(25);
      } else {
        alert("Thank you! Your feedback has been received.");
      }
    },

    showFaqAnswer: (index) => {
      const ans = document.getElementById("faq-ans-" + index);
      const icon = document.getElementById("faq-icon-" + index);
      if (ans) {
        const isHidden = ans.style.display === "none" || !ans.style.display;
        ans.style.display = isHidden ? "block" : "none";
        if (icon) icon.innerText = isHidden ? "▲" : "▼";
      }
    },

    confirmLogout: () => {
      if (confirm("Are you sure you want to log out of NetPará?")) {
        NetParaAuth.logout();
      }
    }
  };
})();
