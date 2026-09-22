/**
 * NetPará Profile Module
 * Profile views, edit profile, follow system, and saved tabs.
 */

const NetParaProfile = (function () {
  let viewingUserId = "user_me";
  let activeTab = "posts"; // "posts" | "media" | "saved"

  function renderProfile() {
    const user = NetParaBackend.getUser(viewingUserId);
    const currentUser = NetParaBackend.getCurrentUser();
    if (!user) return;

    const isOwn = user.uid === currentUser?.uid;
    const isFollowing = currentUser?.followingList?.includes(user.uid);

    // Cover & Avatar
    const coverEl = document.getElementById("profile-cover-img");
    const avatarEl = document.getElementById("profile-avatar-img");
    if (coverEl) coverEl.src = user.coverUrl || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80";
    if (avatarEl) avatarEl.src = user.avatarUrl;

    // Names & Meta
    document.getElementById("profile-display-name").innerText = user.fullName;
    document.getElementById("profile-username").innerText = "@" + user.username;
    document.getElementById("profile-bio").innerText = user.bio || "No bio yet.";

    const websiteEl = document.getElementById("profile-website");
    if (websiteEl) {
      if (user.website) {
        websiteEl.href = user.website;
        websiteEl.innerText = user.website.replace(/^https?:\/\//, "");
        websiteEl.style.display = "inline-flex";
      } else {
        websiteEl.style.display = "none";
      }
    }

    // Verified badge
    const badgeEl = document.getElementById("profile-verified-badge");
    if (badgeEl) badgeEl.style.display = user.isVerified ? "inline-flex" : "none";

    // Stats
    document.getElementById("profile-stat-posts").innerText = user.postsCount || 0;
    document.getElementById("profile-stat-followers").innerText = user.followersCount || 0;
    document.getElementById("profile-stat-following").innerText = user.followingCount || 0;

    // Action buttons
    const actionContainer = document.getElementById("profile-action-buttons");
    if (actionContainer) {
      if (isOwn) {
        actionContainer.innerHTML = `
          <button class="btn-secondary" onclick="NetParaProfile.openEditModal()">Edit Profile</button>
          <button class="btn-secondary" onclick="NetParaApp.openSettings()">Settings</button>
        `;
      } else {
        actionContainer.innerHTML = `
          <button class="${isFollowing ? 'btn-secondary' : 'btn-primary'}" onclick="NetParaProfile.toggleFollow('${user.uid}')">
            ${isFollowing ? 'Following' : 'Follow'}
          </button>
          <button class="btn-secondary" onclick="NetParaChat.openDirectChat('${user.uid}')">Message</button>
        `;
      }
    }

    // Saved tab visibility: only visible for profile owner
    const savedTabBtn = document.getElementById("profile-tab-saved");
    if (savedTabBtn) {
      savedTabBtn.style.display = isOwn ? "block" : "none";
    }

    renderTabContent();
  }

  function renderTabContent() {
    const container = document.getElementById("profile-tab-content");
    if (!container) return;

    const allPosts = NetParaBackend.getPosts();
    const currentUser = NetParaBackend.getCurrentUser();

    if (activeTab === "posts") {
      const userPosts = allPosts.filter(p => p.authorId === viewingUserId);
      if (userPosts.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted);">No posts shared yet.</div>';
        return;
      }
      container.innerHTML = `<div class="posts-feed" style="padding: 12px 0;">` + 
        userPosts.map(p => `
          <div class="post-card">
            <p style="font-size: 0.95rem;">${p.content}</p>
            ${p.mediaUrls && p.mediaUrls.length > 0 ? `<img src="${p.mediaUrls[0]}" style="width: 100%; border-radius: 10px; max-height: 280px; object-fit: cover; margin-top: 8px;" />` : ''}
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 8px;">
              ❤️ ${p.likesCount || 0} • 💬 ${p.commentsCount || 0}
            </div>
          </div>
        `).join("") + `</div>`;
    } else if (activeTab === "media") {
      const mediaPosts = allPosts.filter(p => p.authorId === viewingUserId && p.mediaUrls && p.mediaUrls.length > 0);
      if (mediaPosts.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted);">No photos or videos yet.</div>';
        return;
      }
      container.innerHTML = `
        <div class="media-grid">
          ${mediaPosts.flatMap(p => p.mediaUrls).map(url => `
            <img class="media-grid-item" src="${url}" onclick="NetParaApp.viewImage('${url}')" loading="lazy" />
          `).join("")}
        </div>
      `;
    } else if (activeTab === "saved") {
      const savedIds = currentUser?.savedPostIds || [];
      const savedPosts = allPosts.filter(p => savedIds.includes(p.id));
      if (savedPosts.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted);">You have no saved posts yet.</div>';
        return;
      }
      container.innerHTML = `<div class="posts-feed" style="padding: 12px 0;">` +
        savedPosts.map(p => `
          <div class="post-card">
            <p style="font-size: 0.95rem;">${p.content}</p>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 8px;">Saved Item</div>
          </div>
        `).join("") + `</div>`;
    }
  }

  return {
    show: (userId) => {
      viewingUserId = userId || "user_me";
      activeTab = "posts";
      document.querySelectorAll(".profile-tab-btn").forEach(b => b.classList.remove("active"));
      const firstTab = document.getElementById("profile-tab-posts");
      if (firstTab) firstTab.classList.add("active");
      renderProfile();
    },

    setTab: (tab) => {
      activeTab = tab;
      document.querySelectorAll(".profile-tab-btn").forEach(b => b.classList.remove("active"));
      const target = document.getElementById("profile-tab-" + tab);
      if (target) target.classList.add("active");
      renderTabContent();
    },

    toggleFollow: (targetUid) => {
      const res = NetParaBackend.toggleFollow(targetUid);
      if (window.NetParaNative) {
        window.NetParaNative.showToast(res.isFollowing ? "Now following!" : "Unfollowed");
        window.NetParaNative.vibrate(20);
      }
      renderProfile();
    },

    openEditModal: () => {
      const user = NetParaBackend.getCurrentUser();
      if (!user) return;
      document.getElementById("edit-fullname-input").value = user.fullName;
      document.getElementById("edit-bio-input").value = user.bio || "";
      document.getElementById("edit-website-input").value = user.website || "";
      const modal = document.getElementById("edit-profile-modal");
      if (modal) modal.classList.add("open");
    },

    closeEditModal: () => {
      const modal = document.getElementById("edit-profile-modal");
      if (modal) modal.classList.remove("open");
    },

    saveProfile: () => {
      const fullName = document.getElementById("edit-fullname-input").value.trim();
      const bio = document.getElementById("edit-bio-input").value.trim();
      const website = document.getElementById("edit-website-input").value.trim();

      if (!fullName) {
        alert("Full name cannot be empty.");
        return;
      }

      NetParaBackend.updateUser("user_me", { fullName, bio, website });
      NetParaProfile.closeEditModal();
      renderProfile();
      if (window.NetParaNative) {
        window.NetParaNative.showToast("Profile updated successfully");
      }
    }
  };
})();
