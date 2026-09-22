/**
 * NetPará Post Composer Module
 * Multi-image uploads, video preview, compression, and publishing.
 */

const NetParaPosts = (function () {
  let selectedMedia = []; // Array of { type: 'image'|'video', dataUrl: string, name: string }

  function renderMediaPreviews() {
    const container = document.getElementById("composer-media-previews");
    if (!container) return;

    if (selectedMedia.length === 0) {
      container.innerHTML = "";
      container.style.display = "none";
      return;
    }

    container.style.display = "flex";
    container.innerHTML = selectedMedia.map((item, index) => `
      <div style="position: relative; width: 84px; height: 84px; border-radius: 12px; overflow: hidden; border: 1px solid var(--surface-border); flex-shrink: 0;">
        ${item.type === 'image' 
          ? `<img src="${item.dataUrl}" style="width: 100%; height: 100%; object-fit: cover;" />`
          : `<video src="${item.dataUrl}" style="width: 100%; height: 100%; object-fit: cover;"></video>`
        }
        <button onclick="NetParaPosts.removeMedia(${index})" style="position: absolute; top: 4px; right: 4px; width: 22px; height: 22px; border-radius: 50%; background: rgba(0,0,0,0.7); color: #fff; border: none; font-size: 13px; display: flex; align-items: center; justify-content: center; cursor: pointer;">✕</button>
      </div>
    `).join("");
  }

  function compressImage(file, maxWidth = 1280, quality = 0.85) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return {
    openComposer: () => {
      selectedMedia = [];
      const textarea = document.getElementById("composer-textarea");
      if (textarea) textarea.value = "";
      renderMediaPreviews();
      const modal = document.getElementById("composer-modal");
      if (modal) modal.classList.add("open");
    },

    closeComposer: () => {
      const modal = document.getElementById("composer-modal");
      if (modal) modal.classList.remove("open");
      selectedMedia = [];
    },

    handleFileSelect: async (event) => {
      const files = Array.from(event.target.files);
      if (!files.length) return;

      const progress = document.getElementById("composer-upload-progress");
      if (progress) progress.style.display = "block";

      for (const file of files) {
        if (file.type.startsWith("image/")) {
          try {
            const compressed = await compressImage(file);
            selectedMedia.push({ type: "image", dataUrl: compressed, name: file.name });
          } catch (e) {
            console.error("Compression failed", e);
          }
        } else if (file.type.startsWith("video/")) {
          // Verify file size (limit 50MB)
          if (file.size > 50 * 1024 * 1024) {
            alert("Video file size cannot exceed 50MB.");
            continue;
          }
          const reader = new FileReader();
          reader.onload = (e) => {
            selectedMedia.push({ type: "video", dataUrl: e.target.result, name: file.name });
            renderMediaPreviews();
          };
          reader.readAsDataURL(file);
        }
      }

      if (progress) progress.style.display = "none";
      renderMediaPreviews();
      event.target.value = ""; // Reset
    },

    removeMedia: (index) => {
      selectedMedia.splice(index, 1);
      renderMediaPreviews();
    },

    addEmoji: (emoji) => {
      const textarea = document.getElementById("composer-textarea");
      if (textarea) {
        textarea.value += emoji;
        textarea.focus();
      }
    },

    addTag: (tag) => {
      const textarea = document.getElementById("composer-textarea");
      if (textarea) {
        textarea.value += " " + tag + " ";
        textarea.focus();
      }
    },

    publish: () => {
      const textarea = document.getElementById("composer-textarea");
      const content = textarea ? textarea.value.trim() : "";

      if (!content && selectedMedia.length === 0) {
        alert("Please write something or add media before publishing.");
        return;
      }

      const publishBtn = document.getElementById("btn-publish-post");
      if (publishBtn) {
        publishBtn.disabled = true;
        publishBtn.innerText = "Publishing...";
      }

      const mediaUrls = selectedMedia.filter(m => m.type === "image").map(m => m.dataUrl);
      const videoItem = selectedMedia.find(m => m.type === "video");

      setTimeout(() => {
        const newPost = NetParaBackend.createPost({
          content,
          mediaUrls,
          videoUrl: videoItem ? videoItem.dataUrl : null
        });

        if (window.NetParaNative) {
          window.NetParaNative.showToast("Post shared to NetPará!");
          window.NetParaNative.vibrate(40);
          // Show interstitial ad on natural post milestone if eligible
          window.NetParaNative.showInterstitialAd();
        }

        if (publishBtn) {
          publishBtn.disabled = false;
          publishBtn.innerText = "Post";
        }

        NetParaPosts.closeComposer();
        NetParaFeed.init();
      }, 500);
    }
  };
})();
