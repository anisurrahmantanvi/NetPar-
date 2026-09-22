/**
 * NetPará Admin & Moderation Console
 */

const NetParaAdmin = (function () {
  function renderDashboard() {
    const stats = NetParaBackend.getAdminStats();
    document.getElementById("admin-stat-users").innerText = stats.totalUsers;
    document.getElementById("admin-stat-posts").innerText = stats.totalPosts;
    document.getElementById("admin-stat-reports").innerText = stats.pendingReports;
    document.getElementById("admin-stat-suspended").innerText = stats.suspendedUsers;

    const reportsContainer = document.getElementById("admin-reports-queue");
    if (!reportsContainer) return;

    const reports = NetParaBackend.getReports().filter(r => r.status === "pending");

    if (reports.length === 0) {
      reportsContainer.innerHTML = '<div style="text-align: center; padding: 24px; color: var(--text-muted);">All reports resolved. Community is healthy! ✨</div>';
      return;
    }

    reportsContainer.innerHTML = reports.map(r => `
      <div style="background: var(--surface-hover); border: 1px solid var(--surface-border); border-radius: 12px; padding: 12px; margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span style="font-weight: 700; color: var(--danger); text-transform: uppercase; font-size: 0.75rem;">Report: ${r.category}</span>
          <span style="font-size: 0.75rem; color: var(--text-muted);">${r.targetType}</span>
        </div>
        <p style="font-size: 0.88rem; margin-bottom: 10px;">${r.details || 'Flagged by community member'}</p>
        <div style="display: flex; gap: 8px;">
          <button class="btn-primary" style="background: var(--danger); padding: 6px 12px; font-size: 0.78rem;" onclick="NetParaAdmin.resolve('${r.id}', 'delete_content')">Delete Content</button>
          <button class="btn-secondary" style="padding: 6px 12px; font-size: 0.78rem;" onclick="NetParaAdmin.resolve('${r.id}', 'suspend_user')">Suspend User</button>
          <button class="btn-secondary" style="padding: 6px 12px; font-size: 0.78rem;" onclick="NetParaAdmin.resolve('${r.id}', 'dismiss')">Dismiss</button>
        </div>
      </div>
    `).join("");
  }

  return {
    open: () => {
      const modal = document.getElementById("admin-console-modal");
      if (modal) {
        modal.classList.add("open");
        renderDashboard();
      }
    },

    close: () => {
      const modal = document.getElementById("admin-console-modal");
      if (modal) modal.classList.remove("open");
    },

    resolve: (reportId, action) => {
      NetParaBackend.resolveReport(reportId, action);
      renderDashboard();
      if (window.NetParaNative) {
        window.NetParaNative.showToast("Moderation action applied: " + action);
      }
    },

    broadcastAnnouncement: () => {
      const title = prompt("Announcement Title:", "NetPará Community Notice");
      if (!title) return;
      const content = prompt("Message Content:");
      if (!content) return;

      const db = NetParaBackend.getDb();
      db.announcements.push({
        id: "anc_" + Date.now(),
        title,
        content,
        timestamp: Date.now()
      });
      NetParaBackend.save();

      if (window.NetParaNative) {
        window.NetParaNative.sendNativeNotification(title, content, "system", null);
        window.NetParaNative.showToast("Announcement broadcasted to all users!");
      }
    }
  };
})();
