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
