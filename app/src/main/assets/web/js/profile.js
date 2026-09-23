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
    document.getElementById("profile-display-name").innerText = user.nickname ? `${user.fullName} (${user.nickname})` : user.fullName;
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
    const postsStat = document.getElementById("profile-stat-posts");
    const friendsStat = document.getElementById("profile-stat-friends");
    const followersStat = document.getElementById("profile-stat-followers");
    const followingStat = document.getElementById("profile-stat-following");
    if (postsStat) postsStat.innerText = user.postsCount || 0;
    if (friendsStat) friendsStat.innerText = user.friendsCount || (user.friendsList ? user.friendsList.length : 0);
    if (followersStat) followersStat.innerText = user.followersCount || 0;
    if (followingStat) followingStat.innerText = user.followingCount || 0;

    // Action buttons
    const actionContainer = document.getElementById("profile-action-buttons");
    if (actionContainer) {
      if (isOwn) {
        actionContainer.innerHTML = `
          <button class="btn-secondary" onclick="NetParaProfile.openEditModal()">Edit Profile</button>
          <button class="btn-secondary" onclick="NetParaApp.navigate('menu')">Menu</button>
        `;
      } else {
        const isFriend = NetParaBackend.isFriend(user.uid);
        const hasRequested = NetParaBackend.hasPendingRequest(user.uid);

        let friendBtnHtml = "";
        if (isFriend) {
          friendBtnHtml = `<button class="btn-secondary" onclick="NetParaFriends.showFriendMenu('${user.uid}', '${user.fullName}')">Friends ✓</button>`;
        } else if (hasRequested) {
          friendBtnHtml = `<button class="btn-secondary" onclick="NetParaFriends.cancelRequest('${user.uid}')">Requested</button>`;
        } else {
          friendBtnHtml = `<button class="btn-primary" onclick="NetParaFriends.addFriend('${user.uid}')">+ Add Friend</button>`;
        }

        actionContainer.innerHTML = `
          ${friendBtnHtml}
          <button class="btn-secondary" onclick="NetParaChat.openDirectChat('${user.uid}')">Message</button>
          <button class="btn-secondary" onclick="NetParaCall.startCall('${user.uid}', 'voice')" title="Voice Call" style="padding: 8px 12px; color: var(--primary);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
          </button>
          <button class="btn-secondary" onclick="NetParaCall.startCall('${user.uid}', 'video')" title="Video Call" style="padding: 8px 12px; color: #10B981;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
          </button>
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
    } else if (activeTab === "reels") {
      const db = NetParaBackend.getDb();
      const userReels = (db.reels || []).filter(r => r.authorId === viewingUserId);
      if (userReels.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted);">No reels uploaded yet.</div>';
        return;
      }
      container.innerHTML = `
        <div class="media-grid" style="grid-template-columns: repeat(2, 1fr); gap: 6px; padding: 8px;">
          ${userReels.map(r => `
            <div style="position: relative; aspect-ratio: 9/16; border-radius: 8px; overflow: hidden; background: #000; cursor: pointer;" onclick="NetParaApp.navigate('reels')">
              <video src="${r.videoUrl}" style="width: 100%; height: 100%; object-fit: cover;" muted playsinline></video>
              <div style="position: absolute; bottom: 8px; left: 8px; color: #fff; font-size: 0.75rem; text-shadow: 0 1px 3px rgba(0,0,0,0.8); display: flex; align-items: center; gap: 4px;">
                ▶ <span>${r.likesCount}</span>
              </div>
            </div>
          `).join("")}
        </div>
      `;
    } else if (activeTab === "about") {
      const user = NetParaBackend.getUser(viewingUserId);
      container.innerHTML = `
        <div class="about-card" style="padding: 16px; background: var(--surface); border-radius: var(--radius-sm); margin: 12px 0;">
          <h4 style="margin-bottom: 12px; font-size: 1rem;">Profile Overview</h4>
          <div style="display: flex; flex-direction: column; gap: 10px; font-size: 0.9rem;">
            <div>🏢 <strong>Work:</strong> ${user?.work || "Creator & Innovator"}</div>
            <div>📍 <strong>Current City:</strong> ${user?.city || "Belém, Pará"}</div>
            <div>🏡 <strong>Hometown:</strong> ${user?.hometown || "Pará, Brazil"}</div>
            ${user?.website ? `<div>🔗 <strong>Website:</strong> <a href="${user.website}" target="_blank" style="color: var(--primary);">${user.website}</a></div>` : ''}
            <div>📅 <strong>Joined:</strong> ${new Date(user?.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
          </div>
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
