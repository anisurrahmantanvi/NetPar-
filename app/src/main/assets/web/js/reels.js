/**
 * NetPará Reels Module
 * Vertical short-video feed with auto-play, pause, like and audio controls.
 */

const NetParaReels = (function () {
  let isMuted = true;

  function renderReels() {
    const container = document.getElementById("reels-feed-container");
    if (!container) return;

    const db = NetParaBackend.getDb();
    const reels = db.reels || [];

    container.innerHTML = reels.map((reel, index) => {
      const author = NetParaBackend.getUser(reel.authorId) || {
        fullName: "Creator",
        username: "creator",
        avatarUrl: "img/avatar_anisur_tanvi.jpg"
      };

      return `
        <div class="reel-item" data-index="${index}">
          <video class="reel-video" src="${reel.videoUrl}" loop playsinline ${isMuted ? 'muted' : ''} onclick="NetParaReels.togglePlay(this)"></video>

          <div class="reel-overlay">
            <div class="reel-info-side">
              <div style="display: flex; align-items: center; gap: 8px;">
                <img src="${author.avatarUrl}" style="width: 36px; height: 36px; border-radius: 50%; border: 1.5px solid #fff;" />
                <span style="font-weight: 700; font-size: 0.95rem;">@${author.username}</span>
                <button class="btn-primary" style="padding: 4px 10px; font-size: 0.72rem; border-radius: 99px;" onclick="NetParaProfile.toggleFollow('${author.uid}')">Follow</button>
              </div>
              <p style="font-size: 0.88rem; line-height: 1.35;">${reel.caption}</p>
              <div style="font-size: 0.75rem; opacity: 0.85; display: flex; align-items: center; gap: 4px;">
                🎵 <span>${reel.musicTitle}</span>
              </div>
            </div>
          </div>

          <div class="reel-actions-rail">
            <button class="reel-action-btn ${reel.isLiked ? 'liked' : ''}" onclick="NetParaReels.toggleLike('${reel.id}')" style="color: ${reel.isLiked ? 'var(--accent-rose)' : '#fff'};">
              ❤️
              <span class="reel-action-count">${reel.likesCount}</span>
            </button>
            <button class="reel-action-btn" onclick="NetParaComments.open('${reel.id}')">
              💬
              <span class="reel-action-count">${reel.commentsCount}</span>
            </button>
            <button class="reel-action-btn" onclick="NetParaReels.shareReel('${reel.id}')">
              🔄
              <span class="reel-action-count">${reel.sharesCount}</span>
            </button>
            <button class="reel-action-btn" onclick="NetParaReels.toggleMute()">
              ${isMuted ? '🔇' : '🔊'}
            </button>
          </div>
        </div>
      `;
    }).join("");

    // Setup intersection observer to auto-play only visible video
    setupIntersectionObserver();
  }

  function setupIntersectionObserver() {
    const videos = document.querySelectorAll(".reel-video");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const video = entry.target;
        if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      });
    }, { threshold: [0.6] });

    videos.forEach(v => observer.observe(v));
  }

  return {
    init: () => {
      renderReels();
    },

    togglePlay: (videoEl) => {
      if (videoEl.paused) {
        videoEl.play();
      } else {
        videoEl.pause();
      }
    },

    toggleMute: () => {
      isMuted = !isMuted;
      document.querySelectorAll(".reel-video").forEach(v => {
        v.muted = isMuted;
      });
      renderReels();
    },

    toggleLike: (reelId) => {
      const db = NetParaBackend.getDb();
      const reel = db.reels.find(r => r.id === reelId);
      if (reel) {
        reel.isLiked = !reel.isLiked;
        reel.likesCount = reel.isLiked ? (reel.likesCount + 1) : (reel.likesCount - 1);
        NetParaBackend.save();
        if (window.NetParaNative && window.NetParaNative.vibrate) {
          window.NetParaNative.vibrate(25);
        }
        renderReels();
      }
    },

    shareReel: (reelId) => {
      const url = "https://netpara.social/reel/" + reelId;
      if (window.NetParaNative && window.NetParaNative.shareContent) {
        window.NetParaNative.shareContent("Watch on NetPará", "Check out this reel!", url);
      } else {
        alert("Reel link copied: " + url);
      }
    }
  };
})();
