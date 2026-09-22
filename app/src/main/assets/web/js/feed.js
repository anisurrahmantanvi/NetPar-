/**
 * NetPará Feed Module
 * Handles posts rendering, reactions, stories, and feed interactions.
 */

const NetParaFeed = (function () {
  let activeTab = "foryou"; // "foryou" | "following"

  function timeAgo(timestamp) {
    const elapsed = Math.floor((Date.now() - timestamp) / 1000);
    if (elapsed < 60) return "Just now";
    if (elapsed < 3600) return Math.floor(elapsed / 60) + "m";
    if (elapsed < 86400) return Math.floor(elapsed / 3600) + "h";
    return Math.floor(elapsed / 86400) + "d";
  }

  function formatText(text) {
    if (!text) return "";
    return text
      .replace(/#(\w+)/g, '<span class="hashtag" onclick="NetParaApp.searchTag(\'$1\')">#$1</span>')
      .replace(/@(\w+)/g, '<span class="mention" onclick="NetParaApp.openUserProfileByName(\'$1\')">@$1</span>');
  }

  function renderStories() {
    const container = document.getElementById("stories-track");
    if (!container) return;

    const db = NetParaBackend.getDb();
    const stories = db.stories || [];

    container.innerHTML = stories.map(s => `
      <div class="story-item" onclick="NetParaFeed.openStory('${s.id}')">
        <div class="story-ring ${s.isOwn ? '' : ''}">
          <img class="story-avatar" src="${s.avatar}" alt="${s.authorName}" />
        </div>
        <span class="story-name">${s.isOwn ? 'Your story' : s.authorName}</span>
      </div>
    `).join("");
  }

  function renderPosts() {
    const container = document.getElementById("feed-posts-list");
    if (!container) return;

    const posts = NetParaBackend.getPosts();
    const currentUser = NetParaBackend.getCurrentUser();

    if (posts.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
          <h3>No posts yet</h3>
          <p style="margin-top: 8px;">Be the first to share an update with the NetPará community!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = posts.map(post => {
      const author = NetParaBackend.getUser(post.authorId) || {
        fullName: "NetPará User",
        username: "user",
        avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
        isVerified: false
      };

      const userReaction = post.userReactions && post.userReactions["user_me"];
      const isSaved = currentUser?.savedPostIds?.includes(post.id);

      // Reaction icon display
      let reactionIconHtml = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
      let reactionLabel = "Like";
      let reactionClass = "";

      if (userReaction) {
        reactionClass = "liked";
        const reactionEmojis = {
          love: "❤️ Love",
          like: "👍 Like",
          haha: "😂 Haha",
          wow: "😮 Wow",
          sad: "😢 Sad",
          angry: "😡 Angry"
        };
        reactionLabel = reactionEmojis[userReaction] || "❤️ Like";
      }

      // Media elements
      let mediaHtml = "";
      if (post.mediaUrls && post.mediaUrls.length > 0) {
        mediaHtml = `
          <div class="post-media-box">
            <img src="${post.mediaUrls[0]}" alt="Post media" loading="lazy" />
          </div>
        `;
      } else if (post.videoUrl) {
        mediaHtml = `
          <div class="post-media-box">
            <video class="post-video" src="${post.videoUrl}" controls playsinline></video>
          </div>
        `;
      }

      return `
        <article class="post-card" id="post-${post.id}">
          <div class="post-header">
            <div class="post-author-info" onclick="NetParaApp.openProfile('${author.uid}')">
              <img class="user-avatar" src="${author.avatarUrl}" alt="${author.fullName}" />
              <div class="author-names">
                <div class="author-title-row">
                  <span class="author-fullname">${author.fullName}</span>
                  ${author.isVerified ? '<span class="verified-badge"><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg></span>' : ''}
                </div>
                <span class="author-meta">@${author.username} • ${timeAgo(post.createdAt)}</span>
              </div>
            </div>
            <button class="icon-btn" onclick="NetParaFeed.showPostOptions('${post.id}', '${author.uid}')" aria-label="Post options">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
            </button>
          </div>

          <div class="post-content">${formatText(post.content)}</div>

          ${mediaHtml}

          <div class="post-stats-row">
            <div class="reaction-icons-summary">
              <span>❤️ 👍 😮</span>
              <span style="margin-left: 6px; font-weight: 600;">${post.likesCount || 0}</span>
            </div>
            <div>
              <span>${post.commentsCount || 0} comments</span> • 
              <span>${post.sharesCount || 0} shares</span>
            </div>
          </div>

          <div class="post-actions-row">
            <div style="position: relative;">
              <button class="action-pill-btn ${reactionClass}" 
                onclick="NetParaFeed.toggleQuickLike('${post.id}')"
                oncontextmenu="event.preventDefault(); NetParaFeed.openReactionsPopup('${post.id}');"
                id="btn-like-${post.id}">
                ${reactionIconHtml}
                <span>${reactionLabel}</span>
              </button>

              <div class="reactions-bubble-popup" id="reactions-popup-${post.id}">
                <button class="reaction-emoji-btn" onclick="NetParaFeed.selectReaction('${post.id}', 'love')">❤️</button>
                <button class="reaction-emoji-btn" onclick="NetParaFeed.selectReaction('${post.id}', 'like')">👍</button>
                <button class="reaction-emoji-btn" onclick="NetParaFeed.selectReaction('${post.id}', 'haha')">😂</button>
                <button class="reaction-emoji-btn" onclick="NetParaFeed.selectReaction('${post.id}', 'wow')">😮</button>
                <button class="reaction-emoji-btn" onclick="NetParaFeed.selectReaction('${post.id}', 'sad')">😢</button>
                <button class="reaction-emoji-btn" onclick="NetParaFeed.selectReaction('${post.id}', 'angry')">😡</button>
              </div>
            </div>

            <button class="action-pill-btn" onclick="NetParaComments.open('${post.id}')">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
              <span>Comment</span>
            </button>

            <button class="action-pill-btn" onclick="NetParaFeed.sharePost('${post.id}')">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
              <span>Share</span>
            </button>

            <button class="action-pill-btn ${isSaved ? 'liked' : ''}" onclick="NetParaFeed.toggleSave('${post.id}')" id="btn-save-${post.id}">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="${isSaved ? 'currentColor' : 'none'}" stroke="currentColor"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
            </button>
          </div>
        </article>
      `;
    }).join("");
  }

  return {
    init: () => {
      renderStories();
      renderPosts();
    },

    setTab: (tab) => {
      activeTab = tab;
      document.querySelectorAll(".feed-tab").forEach(el => el.classList.remove("active"));
      const target = document.getElementById("tab-" + tab);
      if (target) target.classList.add("active");
      renderPosts();
    },

    toggleQuickLike: (postId) => {
      const updated = NetParaBackend.toggleReaction(postId, "love");
      if (window.NetParaNative && window.NetParaNative.vibrate) {
        window.NetParaNative.vibrate(25);
      }
      renderPosts();
    },

    openReactionsPopup: (postId) => {
      const popup = document.getElementById("reactions-popup-" + postId);
      if (popup) {
        popup.classList.toggle("open");
      }
    },

    selectReaction: (postId, reaction) => {
      NetParaBackend.toggleReaction(postId, reaction);
      const popup = document.getElementById("reactions-popup-" + postId);
      if (popup) popup.classList.remove("open");
      if (window.NetParaNative && window.NetParaNative.vibrate) {
        window.NetParaNative.vibrate(30);
      }
      renderPosts();
    },

    toggleSave: (postId) => {
      const saved = NetParaBackend.toggleSavePost(postId);
      if (window.NetParaNative) {
        window.NetParaNative.showToast(saved ? "Post saved to your bookmarks" : "Post removed from bookmarks");
        window.NetParaNative.vibrate(20);
      }
      renderPosts();
    },

    sharePost: (postId) => {
      const posts = NetParaBackend.getPosts();
      const p = posts.find(x => x.id === postId);
      const text = p ? p.content.substring(0, 100) + "..." : "Check out this post on NetPará!";
      const url = "https://netpara.social/p/" + postId;
      if (window.NetParaNative && window.NetParaNative.shareContent) {
        window.NetParaNative.shareContent("NetPará Post", text, url);
      } else if (navigator.share) {
        navigator.share({ title: "NetPará", text, url }).catch(() => {});
      } else {
        alert("Link copied: " + url);
      }
    },

    showPostOptions: (postId, authorId) => {
      NetParaApp.openPostOptionsMenu(postId, authorId);
    },

    openStory: (storyId) => {
      const db = NetParaBackend.getDb();
      const s = db.stories.find(x => x.id === storyId);
      if (s) {
        NetParaApp.showStoryViewer(s);
      }
    }
  };
})();
