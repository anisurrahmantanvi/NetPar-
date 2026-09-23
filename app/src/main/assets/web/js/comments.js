/**
 * NetPará Comments Module
 * Threaded replies, comment liking, reporting, and management.
 */

const NetParaComments = (function () {
  let activePostId = null;
  let replyToCommentId = null;

  function renderList() {
    const listEl = document.getElementById("comments-sheet-list");
    if (!listEl || !activePostId) return;

    const allComments = NetParaBackend.getComments(activePostId);

    if (allComments.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 30px; color: var(--text-muted);">
          No comments yet. Start the conversation!
        </div>
      `;
      return;
    }

    // Top-level comments
    const topLevel = allComments.filter(c => !c.parentId);

    listEl.innerHTML = topLevel.map(comment => {
      const author = NetParaBackend.getUser(comment.authorId) || {
        fullName: "NetPará User",
        username: "user",
        avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"
      };

      const replies = allComments.filter(c => c.parentId === comment.id);

      return `
        <div class="comment-item" style="display: flex; gap: 10px; margin-bottom: 16px;">
          <img src="${author.avatarUrl}" style="width: 34px; height: 34px; border-radius: 50%; object-fit: cover;" />
          <div style="flex: 1;">
            <div style="background: var(--surface-hover); padding: 8px 12px; border-radius: 14px;">
              <span style="font-weight: 700; font-size: 0.88rem;">${author.nickname ? `${author.fullName} (${author.nickname})` : author.fullName}</span>
              ${author.isVerified ? '<span class="verified-badge" style="margin-left: 4px; vertical-align: middle;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#0095F6"/><path d="M8.5 12.5L11 15L16 9.5" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' : ''}
              <p style="font-size: 0.9rem; margin-top: 2px;">${comment.text}</p>
            </div>
            <div style="display: flex; gap: 14px; margin-top: 4px; font-size: 0.75rem; color: var(--text-muted); padding-left: 6px;">
              <button onclick="NetParaComments.toggleLike('${comment.id}')" style="background: none; border: none; color: ${comment.isLiked ? 'var(--accent-rose)' : 'inherit'}; font-weight: 600; cursor: pointer;">
                ${comment.isLiked ? 'Liked' : 'Like'} ${comment.likesCount ? '(' + comment.likesCount + ')' : ''}
              </button>
              <button onclick="NetParaComments.startReply('${comment.id}', '${author.username}')" style="background: none; border: none; color: inherit; font-weight: 600; cursor: pointer;">
                Reply
              </button>
              <button onclick="NetParaApp.openReportModal('comment', '${comment.id}')" style="background: none; border: none; color: inherit; font-size: 0.72rem; cursor: pointer;">
                Report
              </button>
            </div>

            <!-- Nested Replies -->
            ${replies.map(reply => {
              const rAuthor = NetParaBackend.getUser(reply.authorId) || { fullName: "User", username: "user" };
              return `
                <div style="display: flex; gap: 8px; margin-top: 10px; margin-left: 12px;">
                  <img src="${rAuthor.avatarUrl}" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover;" />
                  <div style="flex: 1;">
                    <div style="background: var(--surface-hover); padding: 6px 10px; border-radius: 12px;">
                      <span style="font-weight: 700; font-size: 0.82rem;">${rAuthor.fullName}</span>
                      <p style="font-size: 0.85rem; margin-top: 1px;">${reply.text}</p>
                    </div>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `;
    }).join("");
  }

  return {
    open: (postId) => {
      activePostId = postId;
      replyToCommentId = null;
      const modal = document.getElementById("comments-modal");
      if (modal) modal.classList.add("open");
      renderList();
    },

    close: () => {
      const modal = document.getElementById("comments-modal");
      if (modal) modal.classList.remove("open");
      activePostId = null;
      replyToCommentId = null;
    },

    startReply: (commentId, authorUsername) => {
      replyToCommentId = commentId;
      const input = document.getElementById("comment-input-field");
      if (input) {
        input.value = "@" + authorUsername + " ";
        input.focus();
      }
    },

    toggleLike: (commentId) => {
      const db = NetParaBackend.getDb();
      const comm = db.comments.find(c => c.id === commentId);
      if (comm) {
        comm.isLiked = !comm.isLiked;
        comm.likesCount = comm.isLiked ? (comm.likesCount + 1) : Math.max(0, comm.likesCount - 1);
        NetParaBackend.save();
        renderList();
      }
    },

    submit: () => {
      const input = document.getElementById("comment-input-field");
      const text = input ? input.value.trim() : "";
      if (!text || !activePostId) return;

      NetParaBackend.addComment(activePostId, text, replyToCommentId);
      input.value = "";
      replyToCommentId = null;

      if (window.NetParaNative && window.NetParaNative.vibrate) {
        window.NetParaNative.vibrate(20);
      }

      renderList();
      NetParaFeed.init(); // Refresh feed comment count
    }
  };
})();
