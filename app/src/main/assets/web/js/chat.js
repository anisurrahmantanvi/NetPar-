/**
 * NetPará Chat Module
 * Direct messaging, 1-on-1 rooms, read receipts, and simulated responses.
 */

const NetParaChat = (function () {
  let activeConvId = null;

  function renderConversationsList() {
    const container = document.getElementById("conversations-list");
    if (!container) return;

    const convs = NetParaBackend.getConversations();

    container.innerHTML = convs.map(c => {
      const peer = NetParaBackend.getUser(c.participantId) || {
        fullName: "Chat User",
        username: "user",
        avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"
      };

      return `
        <div class="chat-item" onclick="NetParaChat.openRoom('${c.id}')">
          <div class="chat-avatar-wrapper">
            <img class="user-avatar" src="${peer.avatarUrl}" alt="${peer.fullName}" />
            <div class="online-dot"></div>
          </div>
          <div class="chat-main-info">
            <div class="chat-name-row">
              <span class="chat-user-name">${peer.fullName}</span>
              <span class="chat-time">Active now</span>
            </div>
            <div class="chat-snippet">${c.lastMessage}</div>
          </div>
          ${c.unreadCount > 0 ? `<div class="badge-count" style="position: static;">${c.unreadCount}</div>` : ''}
        </div>
      `;
    }).join("");
  }

  function renderRoomMessages() {
    const area = document.getElementById("chat-messages-area");
    if (!area || !activeConvId) return;

    const msgs = NetParaBackend.getMessages(activeConvId);
    const conv = NetParaBackend.getConversations().find(c => c.id === activeConvId);
    const peer = NetParaBackend.getUser(conv?.participantId);

    // Update room top header
    const nameEl = document.getElementById("chat-room-peer-name");
    const statusEl = document.getElementById("chat-room-peer-status");
    const avatarEl = document.getElementById("chat-room-peer-avatar");

    if (nameEl) nameEl.innerText = peer ? peer.fullName : "Chat";
    if (statusEl) statusEl.innerText = "Online";
    if (avatarEl && peer) avatarEl.src = peer.avatarUrl;

    area.innerHTML = msgs.map(m => {
      const isOut = m.senderId === "user_me";
      return `
        <div class="msg-bubble ${isOut ? 'outgoing' : 'incoming'}">
          <p>${m.text}</p>
          ${m.mediaUrl ? `<img src="${m.mediaUrl}" style="max-width: 200px; border-radius: 10px; margin-top: 6px;" />` : ''}
          <span class="msg-time">
            ${new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            ${isOut ? ' ✓✓' : ''}
          </span>
        </div>
      `;
    }).join("");

    area.scrollTop = area.scrollHeight;
  }

  return {
    init: () => {
      renderConversationsList();
    },

    openRoom: (convId) => {
      activeConvId = convId;
      const listScreen = document.getElementById("chat-list-view");
      const roomScreen = document.getElementById("chat-room-view");
      if (listScreen) listScreen.style.display = "none";
      if (roomScreen) roomScreen.style.display = "flex";
      renderRoomMessages();
    },

    closeRoom: () => {
      activeConvId = null;
      const listScreen = document.getElementById("chat-list-view");
      const roomScreen = document.getElementById("chat-room-view");
      if (listScreen) listScreen.style.display = "flex";
      if (roomScreen) roomScreen.style.display = "none";
      renderConversationsList();
    },

    startVoiceCall: () => {
      const conv = NetParaBackend.getConversations().find(c => c.id === activeConvId);
      if (conv && conv.participantId) {
        NetParaCall.startCall(conv.participantId, 'voice');
      }
    },

    startVideoCall: () => {
      const conv = NetParaBackend.getConversations().find(c => c.id === activeConvId);
      if (conv && conv.participantId) {
        NetParaCall.startCall(conv.participantId, 'video');
      }
    },

    switchTab: (tab) => {
      const msgsTab = document.getElementById("chat-tab-messages");
      const callsTab = document.getElementById("chat-tab-calls");
      const convList = document.getElementById("conversations-list");
      const callsList = document.getElementById("calls-list");
      if (tab === 'calls') {
        if (msgsTab) msgsTab.classList.remove("active");
        if (callsTab) callsTab.classList.add("active");
        if (convList) convList.style.display = "none";
        if (callsList) {
          callsList.style.display = "block";
          NetParaChat.renderCallsList();
        }
      } else {
        if (msgsTab) msgsTab.classList.add("active");
        if (callsTab) callsTab.classList.remove("active");
        if (convList) convList.style.display = "block";
        if (callsList) callsList.style.display = "none";
      }
    },

    renderCallsList: () => {
      const callsList = document.getElementById("calls-list");
      if (!callsList) return;
      const calls = NetParaBackend.getCallHistory();

      if (calls.length === 0) {
        callsList.innerHTML = `
          <div style="padding: 40px 20px; text-align: center; color: var(--text-muted);">
            <div style="font-size: 2.2rem; margin-bottom: 8px;">📞</div>
            <div style="font-weight: 700; color: var(--text);">No calls yet</div>
            <div style="font-size: 0.85rem; margin-top: 4px;">Make your first HD voice or video call with friends on NetPara!</div>
          </div>
        `;
        return;
      }

      callsList.innerHTML = calls.map(c => {
        const isMissed = c.status === 'missed';
        const isOut = c.direction === 'outgoing';
        const isVideo = c.type === 'video';
        const durationText = c.duration > 0 ? `${Math.floor(c.duration / 60)}m ${c.duration % 60}s` : (isMissed ? 'Missed call' : 'Cancelled');
        const iconSvg = isVideo
          ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`
          : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>`;

        const directionArrow = isMissed
          ? `<span style="color: #EF4444; font-weight: bold;">↙</span>`
          : (isOut ? `<span style="color: #10B981;">↗</span>` : `<span style="color: #3B82F6;">↙</span>`);

        const timeStr = new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return `
          <div class="call-log-item">
            <div class="call-log-left">
              <img class="call-log-avatar" src="${c.peerAvatar}" alt="${c.peerName}" />
              <div class="call-log-meta">
                <div class="call-log-name">${c.peerName}</div>
                <div class="call-log-details ${isMissed ? 'missed' : ''}">
                  ${directionArrow} ${iconSvg} ${durationText} • ${timeStr}
                </div>
              </div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="call-quick-btn" onclick="NetParaCall.startCall('${c.peerUid}', '${c.type}')" title="Call back">
                ${iconSvg}
              </button>
            </div>
          </div>
        `;
      }).join("");
    },

    openDirectChat: (targetUid) => {
      const db = NetParaBackend.getDb();
      let conv = db.conversations.find(c => c.participantId === targetUid);
      if (!conv) {
        conv = {
          id: "conv_" + Date.now(),
          participantId: targetUid,
          lastMessage: "Conversation started",
          timestamp: Date.now(),
          unreadCount: 0
        };
        db.conversations.unshift(conv);
        NetParaBackend.save();
      }
      NetParaApp.navigate("messages");
      NetParaChat.openRoom(conv.id);
    },

    send: () => {
      const input = document.getElementById("chat-msg-input");
      const text = input ? input.value.trim() : "";
      if (!text || !activeConvId) return;

      const sentMsg = NetParaBackend.sendMessage(activeConvId, text);
      input.value = "";
      renderRoomMessages();

      if (window.NetParaNative && window.NetParaNative.vibrate) {
        window.NetParaNative.vibrate(20);
      }

      // Simulate a responsive peer replying after 1.5 seconds!
      const typingEl = document.getElementById("chat-typing-indicator");
      if (typingEl) typingEl.style.display = "block";

      setTimeout(() => {
        if (typingEl) typingEl.style.display = "none";
        const conv = NetParaBackend.getConversations().find(c => c.id === activeConvId);
        const peer = NetParaBackend.getUser(conv?.participantId);
        const replies = [
          "That sounds amazing! Let's definitely catch up.",
          "Totally agree with you on that! 🙌",
          "Sending love from Pará! 🌴",
          "Got it! Let me check the details and get back to you in a bit."
        ];
        const randomReply = replies[Math.floor(Math.random() * replies.length)];

        const replyMsg = {
          id: "msg_" + Date.now(),
          convId: activeConvId,
          senderId: conv?.participantId || "user_mariana",
          receiverId: "user_me",
          text: randomReply,
          createdAt: Date.now(),
          isRead: false
        };
        NetParaBackend.getDb().messages.push(replyMsg);
        if (conv) {
          conv.lastMessage = randomReply;
          conv.timestamp = Date.now();
        }
        NetParaBackend.save();

        if (activeConvId) {
          renderRoomMessages();
        }

        // Native notification
        if (window.NetParaNative) {
          window.NetParaNative.sendNativeNotification(
            peer ? peer.fullName : "New message",
            randomReply,
            "message",
            activeConvId
          );
        }
      }, 1500);
    }
  };
})();
