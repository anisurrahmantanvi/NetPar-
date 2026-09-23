/**
 * NetPará Notifications Module
 * Center for activity notifications, filter tabs, and mark as read.
 */

const NetParaNotifications = (function () {
  let activeFilter = "all";

  function renderList() {
    const container = document.getElementById("notifications-list");
    if (!container) return;

    let items = NetParaBackend.getNotifications();
    if (activeFilter !== "all") {
      items = items.filter(n => n.type === activeFilter);
    }

    // Update unread count badges in top bar
    const unread = items.filter(n => !n.isRead).length;
    const badgeEl = document.getElementById("top-notif-badge");
    if (badgeEl) {
      if (unread > 0) {
        badgeEl.innerText = unread;
        badgeEl.style.display = "flex";
      } else {
        badgeEl.style.display = "none";
      }
    }

    if (items.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-muted);">
          No notifications in this category.
        </div>
      `;
      return;
    }

    const typeIcons = {
      like: "❤️",
      comment: "💬",
      follow: "👤",
      friend_request: "👥",
      friend_accept: "🎉",
      mention: "🏷️",
      system: "🔔"
    };

    container.innerHTML = items.map(n => {
      const actor = NetParaBackend.getUser(n.actorId) || {
        fullName: "NetPará Member",
        avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"
      };

      return `
        <div class="chat-item" style="background: ${n.isRead ? 'transparent' : 'var(--primary-light)'};" onclick="NetParaNotifications.handleClick('${n.id}', '${n.targetId}', '${n.type}')">
          <div style="position: relative;">
            <img class="user-avatar" src="${actor.avatarUrl}" />
            <span style="position: absolute; bottom: -2px; right: -2px; font-size: 14px;">${typeIcons[n.type] || '🔔'}</span>
          </div>
          <div style="flex: 1;">
            <p style="font-size: 0.9rem;">
              <strong>${actor.fullName}</strong> ${n.content}
            </p>
            <span style="font-size: 0.72rem; color: var(--text-muted);">
              ${new Date(n.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          ${!n.isRead ? '<div style="width: 8px; height: 8px; border-radius: 50%; background: var(--primary);"></div>' : ''}
        </div>
      `;
    }).join("");
  }

  return {
    init: () => {
      renderList();
    },

    setFilter: (filter) => {
      activeFilter = filter;
      document.querySelectorAll(".notif-filter-btn").forEach(b => b.classList.remove("active"));
      const btn = document.getElementById("notif-filter-" + filter);
      if (btn) btn.classList.add("active");
      renderList();
    },

    markAllRead: () => {
      NetParaBackend.markAllNotificationsRead();
      renderList();
      if (window.NetParaNative) {
        window.NetParaNative.showToast("All notifications marked as read");
      }
    },

    handleClick: (id, targetId, type) => {
      NetParaBackend.markNotificationRead(id);
      renderList();
      if (type === "follow" && targetId) {
        NetParaApp.openProfile(targetId);
      } else if (type === "friend_request" || type === "friend_accept") {
        NetParaApp.navigate("friends");
      } else if (type === "like" || type === "comment") {
        NetParaApp.navigate("feed");
      }
    }
  };
})();
