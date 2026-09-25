/**
 * NetPará Friends & Community Module
 * Handles incoming Friend Requests, Friend Suggestions, and Connected Friends Feed.
 */

const NetParaFriends = (function () {
  let activeTab = "requests"; // "requests" | "suggestions" | "all"
  let searchQuery = "";

  function updateBadge() {
    const count = NetParaBackend.getPendingRequestsCount();
    const navBadge = document.getElementById("nav-friends-badge");
    const menuBadge = document.getElementById("menu-friends-badge");
    const reqTabBadge = document.getElementById("tab-requests-badge");

    if (navBadge) {
      if (count > 0) {
        navBadge.innerText = count;
        navBadge.style.display = "flex";
      } else {
        navBadge.style.display = "none";
      }
    }

    if (menuBadge) {
      if (count > 0) {
        menuBadge.innerText = count + " new";
        menuBadge.style.display = "inline-flex";
      } else {
        menuBadge.style.display = "none";
      }
    }

    if (reqTabBadge) {
      reqTabBadge.innerText = count;
      reqTabBadge.style.display = count > 0 ? "inline-flex" : "none";
    }
  }

  function renderFeed() {
    updateBadge();
    const container = document.getElementById("friends-feed-content");
    if (!container) return;

    if (activeTab === "requests") {
      renderRequests(container);
    } else if (activeTab === "suggestions") {
      renderSuggestions(container);
    } else if (activeTab === "all") {
      renderAllFriends(container);
    }
  }

  function renderRequests(container) {
    const requests = NetParaBackend.getFriendRequests();

    if (requests.length === 0) {
      container.innerHTML = `
        <div class="empty-state-box">
          <div class="empty-state-icon">👥</div>
          <h3>No Pending Requests</h3>
          <p>No new friend requests right now. When real users join on iConnecto and send you requests, they will appear here!</p>
          <button class="btn-primary" style="margin-top: 14px;" onclick="NetParaFriends.setTab('suggestions')">Explore Community</button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="section-title-row">
        <h3>Friend Requests</h3>
        <span class="count-tag">${requests.length}</span>
      </div>
      <div class="friends-list-grid">
        ${requests.map(req => {
          const u = req.user;
          return `
            <div class="friend-card" id="request-card-${req.id}">
              <div class="friend-card-media" onclick="NetParaApp.openProfile('${u.uid}')">
                <img src="${u.avatarUrl}" alt="${u.fullName}" class="friend-avatar-large" />
                ${u.isVerified ? '<span class="verified-badge-float">✓</span>' : ''}
              </div>
              <div class="friend-card-info">
                <div class="friend-name-row" onclick="NetParaApp.openProfile('${u.uid}')">
                  <h4 class="friend-fullname">${u.fullName}</h4>
                </div>
                <div class="friend-mutual-text">
                  <span class="mutual-dot"></span> ${req.mutualFriends} mutual friends
                </div>
                <div class="friend-location-text">📍 ${u.city || "Dhaka, Bangladesh"}</div>

                <div class="friend-actions-row" id="actions-${req.id}">
                  <button class="btn-primary btn-sm flex-1" onclick="NetParaFriends.accept('${req.id}', '${u.fullName}')">Confirm</button>
                  <button class="btn-secondary btn-sm flex-1" onclick="NetParaFriends.decline('${req.id}')">Delete</button>
                </div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderSuggestions(container) {
    const suggestions = NetParaBackend.getFriendSuggestions();

    if (suggestions.length === 0) {
      container.innerHTML = `
        <div class="empty-state-box">
          <div class="empty-state-icon">✨</div>
          <h3>No New Suggestions</h3>
          <p>Share your iConnecto link with friends or colleagues to connect and start calling in real time!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="section-title-row">
        <h3>People You May Know</h3>
        <span class="count-tag">${suggestions.length}</span>
      </div>
      <div class="friends-list-grid">
        ${suggestions.map(u => `
          <div class="friend-card" id="suggestion-card-${u.uid}">
            <div class="friend-card-media" onclick="NetParaApp.openProfile('${u.uid}')">
              <img src="${u.avatarUrl}" alt="${u.fullName}" class="friend-avatar-large" />
              ${u.isVerified ? '<span class="verified-badge-float">✓</span>' : ''}
            </div>
            <div class="friend-card-info">
              <div class="friend-name-row" onclick="NetParaApp.openProfile('${u.uid}')">
                <h4 class="friend-fullname">${u.fullName}</h4>
              </div>
              <div class="friend-mutual-text">
                <span class="mutual-dot"></span> ${u.mutualFriends} mutual friends
              </div>
              <div class="friend-location-text">📍 ${u.city || "Dhaka, Bangladesh"}</div>

              <div class="friend-actions-row">
                ${u.hasRequested ? `
                  <button class="btn-secondary btn-sm flex-1" onclick="NetParaFriends.cancelRequest('${u.uid}')">Requested</button>
                ` : `
                  <button class="btn-primary btn-sm flex-1" onclick="NetParaFriends.addFriend('${u.uid}')">Add Friend</button>
                `}
                <button class="btn-secondary btn-sm" onclick="NetParaFriends.dismissSuggestion('${u.uid}')" aria-label="Remove">✕</button>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderAllFriends(container) {
    let friends = NetParaBackend.getFriends(NetParaBackend.getCurrentUserId());
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      friends = friends.filter(f => f.fullName.toLowerCase().includes(q) || f.username.toLowerCase().includes(q));
    }

    container.innerHTML = `
      <div class="section-title-row">
        <h3>All Friends</h3>
        <span class="count-tag">${friends.length}</span>
      </div>

      <div class="friends-search-box">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text" placeholder="Search friends by name or @username..." value="${searchQuery}" oninput="NetParaFriends.handleSearch(this.value)" class="friends-search-input" />
        ${searchQuery ? `<button class="search-clear-btn" onclick="NetParaFriends.clearSearch()">✕</button>` : ''}
      </div>

      ${friends.length === 0 ? `
        <div class="empty-state-box">
          <p style="color: var(--text-muted);">${searchQuery ? `No friends matching "${searchQuery}"` : "You have not connected with any friends yet. Explore community suggestions above!"}</p>
        </div>
      ` : `
        <div class="all-friends-list">
          ${friends.map(u => `
            <div class="connected-friend-row">
              <div class="friend-profile-touch" onclick="NetParaApp.openProfile('${u.uid}')">
                <div class="avatar-status-wrapper">
                  <img src="${u.avatarUrl}" class="friend-avatar-medium" />
                  <span class="online-indicator-dot"></span>
                </div>
                <div>
                  <div class="friend-fullname-strong">${u.fullName}</div>
                  <div class="friend-submeta">@${u.username} • 📍 ${u.city || "Pará"}</div>
                </div>
              </div>
              <div class="friend-row-actions">
                <button class="btn-secondary btn-sm" onclick="NetParaChat.openDirectChat('${u.uid}')" title="Message">
                  💬 Chat
                </button>
                <button class="btn-icon-more" onclick="NetParaFriends.showFriendMenu('${u.uid}', '${u.fullName}')" title="Options">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                </button>
              </div>
            </div>
          `).join("")}
        </div>
      `}
    `;
  }

  return {
    init: () => {
      renderFeed();
    },

    updateBadge,

    setTab: (tab) => {
      activeTab = tab;
      document.querySelectorAll(".friends-tab-pill").forEach(p => p.classList.remove("active"));
      const pill = document.getElementById("tab-friends-" + tab);
      if (pill) pill.classList.add("active");
      renderFeed();
    },

    handleSearch: (val) => {
      searchQuery = val;
      renderFeed();
    },

    clearSearch: () => {
      searchQuery = "";
      renderFeed();
    },

    accept: (reqId, userName) => {
      const res = NetParaBackend.acceptFriendRequest(reqId);
      if (res) {
        if (window.NetParaNative && window.NetParaNative.vibrate) {
          window.NetParaNative.vibrate(30);
        }
        if (window.NetParaNative && window.NetParaNative.showToast) {
          window.NetParaNative.showToast(`You and ${userName} are now friends! 🎉`);
        }

        const actionBox = document.getElementById("actions-" + reqId);
        if (actionBox) {
          actionBox.innerHTML = `
            <div class="request-accepted-pill">
              <span>✓ Friends</span>
            </div>
          `;
        }

        setTimeout(() => {
          renderFeed();
        }, 1200);
      }
    },

    decline: (reqId) => {
      NetParaBackend.declineFriendRequest(reqId);
      if (window.NetParaNative && window.NetParaNative.vibrate) {
        window.NetParaNative.vibrate(20);
      }
      const card = document.getElementById("request-card-" + reqId);
      if (card) {
        card.style.opacity = "0";
        card.style.transform = "scale(0.95)";
        setTimeout(() => renderFeed(), 250);
      } else {
        renderFeed();
      }
    },

    addFriend: (targetUid) => {
      NetParaBackend.sendFriendRequest(targetUid);
      if (window.NetParaNative) {
        window.NetParaNative.vibrate(25);
        window.NetParaNative.showToast("Friend request sent!");
      }
      renderFeed();
    },

    cancelRequest: (targetUid) => {
      NetParaBackend.cancelFriendRequest(targetUid);
      if (window.NetParaNative) {
        window.NetParaNative.showToast("Friend request cancelled");
      }
      renderFeed();
    },

    dismissSuggestion: (targetUid) => {
      const card = document.getElementById("suggestion-card-" + targetUid);
      if (card) {
        card.style.opacity = "0";
        card.style.transform = "scale(0.9)";
        setTimeout(() => {
          card.remove();
        }, 200);
      }
    },

    showFriendMenu: (targetUid, fullName) => {
      const doUnfriend = confirm(`Remove ${fullName} from your friends?`);
      if (doUnfriend) {
        NetParaBackend.removeFriend(targetUid);
        if (window.NetParaNative) {
          window.NetParaNative.showToast(`${fullName} was removed from your friends.`);
        }
        renderFeed();
      }
    }
  };
})();
