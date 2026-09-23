/**
 * NetPara Call Controller Module
 * Handles Call UI States, Ringing, Incoming Alerts, Timer, History & Audio Routing
 */

const NetParaCall = (function () {
  let activeCall = null;
  let callTimerInterval = null;
  let callStartTime = null;
  let isMuted = false;
  let isVideoDisabled = false;
  let isSpeakerOn = true;
  let callTimeoutTimer = null;

  // DOM Elements cache
  let overlayEl, remoteVideoEl, localVideoEl, localPipContainer;
  let statusTimerEl, networkBadgeEl, peerAvatarEl, peerNameEl, peerHandleEl, callStateTextEl;
  let wavesContainerEl, btnMuteEl, btnVideoEl, btnSpeakerEl, incomingBannerEl;

  function initElements() {
    overlayEl = document.getElementById("call-overlay-screen");
    remoteVideoEl = document.getElementById("remote-video-element");
    localVideoEl = document.getElementById("local-video-element");
    localPipContainer = document.getElementById("local-pip-container");
    statusTimerEl = document.getElementById("call-status-timer");
    networkBadgeEl = document.getElementById("call-network-badge");
    peerAvatarEl = document.getElementById("call-peer-avatar");
    peerNameEl = document.getElementById("call-peer-name");
    peerHandleEl = document.getElementById("call-peer-handle");
    callStateTextEl = document.getElementById("call-state-text");
    wavesContainerEl = document.getElementById("sound-waves-container");
    btnMuteEl = document.getElementById("btn-call-mute");
    btnVideoEl = document.getElementById("btn-call-video");
    btnSpeakerEl = document.getElementById("btn-call-speaker");
    incomingBannerEl = document.getElementById("incoming-call-modal");
  }

  function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function startDurationTimer() {
    stopDurationTimer();
    callStartTime = Date.now();
    callTimerInterval = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - callStartTime) / 1000);
      if (statusTimerEl) {
        statusTimerEl.innerText = formatDuration(elapsedSeconds);
      }
    }, 1000);
  }

  function stopDurationTimer() {
    if (callTimerInterval) {
      clearInterval(callTimerInterval);
      callTimerInterval = null;
    }
  }

  return {
    init: function () {
      initElements();
    },

    /**
     * Start Outgoing Voice or Video Call
     */
    startCall: function (targetUid, callType = 'video') {
      const currentUser = NetParaBackend.getCurrentUser();
      if (!currentUser) {
        alert("Please login to initiate a call.");
        return;
      }

      const targetUser = NetParaBackend.getUser(targetUid);
      if (!targetUser) {
        alert("User not found.");
        return;
      }

      if (targetUser.uid === currentUser.uid) {
        alert("You cannot call yourself.");
        return;
      }

      initElements();

      // Check Native Android Permissions First
      if (window.NetParaNative && window.NetParaNative.requestCallPermissions) {
        window.NetParaNative.requestCallPermissions(callType === 'video', "window.NetParaCall._onPermissionsResult");
        this._pendingCallData = { targetUser, currentUser, callType };
      } else {
        this._executeStartCall(targetUser, currentUser, callType);
      }
    },

    _onPermissionsResult: function (granted) {
      if (!granted) {
        alert("Microphone & Camera permissions are required to make calls.");
        return;
      }
      if (this._pendingCallData) {
        const { targetUser, currentUser, callType } = this._pendingCallData;
        this._pendingCallData = null;
        this._executeStartCall(targetUser, currentUser, callType);
      }
    },

    _executeStartCall: async function (targetUser, currentUser, callType) {
      const callId = "call_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
      const isVideo = callType === 'video';

      activeCall = {
        id: callId,
        role: 'caller',
        targetUser,
        currentUser,
        type: callType,
        status: 'calling',
        createdAt: Date.now()
      };

      // Set Up UI for Outgoing Call
      overlayEl.classList.remove("hidden");
      document.getElementById("call-type-label").innerText = isVideo ? "NetPara HD Video Call" : "NetPara HD Voice Call";
      peerAvatarEl.src = targetUser.avatarUrl;
      peerNameEl.innerText = targetUser.fullName;
      peerHandleEl.innerText = "@" + targetUser.username;
      callStateTextEl.innerText = "Calling...";
      statusTimerEl.innerText = "Ringing...";
      networkBadgeEl.style.display = "none";

      if (isVideo) {
        document.getElementById("video-canvas-container").style.display = "block";
        localPipContainer.style.display = "block";
        document.getElementById("call-center-focus").style.display = "none";
        btnVideoEl.style.display = "flex";
        document.getElementById("btn-call-flip").style.display = "flex";
      } else {
        document.getElementById("video-canvas-container").style.display = "none";
        localPipContainer.style.display = "none";
        document.getElementById("call-center-focus").style.display = "flex";
        wavesContainerEl.style.display = "none";
        btnVideoEl.style.display = "none";
        document.getElementById("btn-call-flip").style.display = "none";
      }

      // Native Audio & Ringing
      if (window.NetParaNative) {
        window.NetParaNative.startCallAudio(isVideo);
        window.NetParaNative.playCallRingtone(false);
      }

      isMuted = false;
      isVideoDisabled = false;
      isSpeakerOn = isVideo;
      NetParaCall.updateControlButtons();

      try {
        // Acquire Local Camera / Mic Stream
        const localStream = await NetParaWebRTC.getUserMedia(callType);
        if (localVideoEl && isVideo) {
          localVideoEl.srcObject = localStream;
        }

        // Initialize WebRTC Peer Connection
        NetParaWebRTC.createPeerConnection(
          (remoteStream) => {
            if (remoteVideoEl) {
              remoteVideoEl.srcObject = remoteStream;
            }
          },
          (quality) => {
            NetParaCall.updateNetworkQuality(quality);
          }
        );

        // Send Offer via WebRTC
        await NetParaWebRTC.startCall(callId, targetUser, currentUser, callType);

        callStateTextEl.innerText = "Ringing...";

        // 35-Second timeout for unanswered call
        callTimeoutTimer = setTimeout(() => {
          if (activeCall && activeCall.status === 'calling') {
            NetParaCall.endCall("missed");
            alert(targetUser.fullName + " is not answering.");
          }
        }, 35000);

      } catch (err) {
        console.error("Failed to start call:", err);
        alert("Could not access microphone/camera. Please grant permissions.");
        NetParaCall.endCall("failed");
      }
    },

    /**
     * Handle Incoming Call Notification or FCM Event
     */
    handleIncomingNotification: function (callId, callerUid, callerName, callType, callerAvatar) {
      const caller = NetParaBackend.getUser(callerUid) || {
        uid: callerUid,
        fullName: callerName || "A NetPara User",
        avatarUrl: callerAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
        username: "caller"
      };

      this.showIncomingCall({
        id: callId,
        caller,
        type: callType
      });
    },

    /**
     * Display Incoming Call Modal
     */
    showIncomingCall: function (callData) {
      if (activeCall) {
        // User already on another call
        return;
      }

      initElements();

      activeCall = {
        id: callData.id,
        role: 'receiver',
        caller: callData.caller,
        type: callData.type || 'voice',
        status: 'ringing',
        offer: callData.offer || null,
        createdAt: Date.now()
      };

      // Native Ringtone & Vibration
      if (window.NetParaNative) {
        window.NetParaNative.playCallRingtone(true);
      }

      // Populate Incoming Modal
      document.getElementById("incoming-caller-avatar").src = callData.caller.avatarUrl;
      document.getElementById("incoming-caller-name").innerText = callData.caller.fullName;
      document.getElementById("incoming-call-type").innerText = callData.type === 'video' ? "Incoming HD Video Call..." : "Incoming Voice Call...";

      incomingBannerEl.style.display = "flex";

      // 40-Second timeout for unanswered incoming call
      callTimeoutTimer = setTimeout(() => {
        if (activeCall && activeCall.status === 'ringing') {
          NetParaCall.declineCall(true);
        }
      }, 40000);
    },

    /**
     * Accept Incoming Call
     */
    acceptCall: function () {
      if (!activeCall) return;

      if (callTimeoutTimer) clearTimeout(callTimeoutTimer);

      if (window.NetParaNative) {
        window.NetParaNative.stopCallRingtone();
      }

      incomingBannerEl.style.display = "none";

      const callType = activeCall.type;
      const isVideo = callType === 'video';

      // Request native permissions
      if (window.NetParaNative && window.NetParaNative.requestCallPermissions) {
        window.NetParaNative.requestCallPermissions(isVideo, "window.NetParaCall._onAcceptPermissionsResult");
      } else {
        this._executeAcceptCall();
      }
    },

    _onAcceptPermissionsResult: function (granted) {
      if (!granted) {
        alert("Camera & Microphone permissions are needed to accept the call.");
        NetParaCall.declineCall();
        return;
      }
      this._executeAcceptCall();
    },

    _executeAcceptCall: async function () {
      const isVideo = activeCall.type === 'video';
      const caller = activeCall.caller;

      // Show Fullscreen In-Call UI
      overlayEl.classList.remove("hidden");
      document.getElementById("call-type-label").innerText = isVideo ? "NetPara HD Video Call" : "NetPara HD Voice Call";
      peerAvatarEl.src = caller.avatarUrl;
      peerNameEl.innerText = caller.fullName;
      peerHandleEl.innerText = "@" + (caller.username || "user");
      callStateTextEl.innerText = "Connecting...";
      statusTimerEl.innerText = "00:00";
      networkBadgeEl.style.display = "flex";

      if (isVideo) {
        document.getElementById("video-canvas-container").style.display = "block";
        localPipContainer.style.display = "block";
        document.getElementById("call-center-focus").style.display = "none";
        btnVideoEl.style.display = "flex";
        document.getElementById("btn-call-flip").style.display = "flex";
      } else {
        document.getElementById("video-canvas-container").style.display = "none";
        localPipContainer.style.display = "none";
        document.getElementById("call-center-focus").style.display = "flex";
        wavesContainerEl.style.display = "flex";
        btnVideoEl.style.display = "none";
        document.getElementById("btn-call-flip").style.display = "none";
      }

      if (window.NetParaNative) {
        window.NetParaNative.startCallAudio(isVideo);
      }

      isMuted = false;
      isVideoDisabled = false;
      isSpeakerOn = isVideo;
      NetParaCall.updateControlButtons();

      try {
        const localStream = await NetParaWebRTC.getUserMedia(activeCall.type);
        if (localVideoEl && isVideo) {
          localVideoEl.srcObject = localStream;
        }

        NetParaWebRTC.createPeerConnection(
          (remoteStream) => {
            if (remoteVideoEl) {
              remoteVideoEl.srcObject = remoteStream;
            }
          },
          (quality) => {
            NetParaCall.updateNetworkQuality(quality);
          }
        );

        await NetParaWebRTC.acceptCall(activeCall.id, activeCall.offer);

        activeCall.status = 'connected';
        callStateTextEl.innerText = "Connected";
        startDurationTimer();

      } catch (err) {
        console.error("Failed accepting call:", err);
        NetParaCall.endCall("failed");
      }
    },

    /**
     * Decline Incoming Call
     */
    declineCall: function (isTimeout = false) {
      if (callTimeoutTimer) clearTimeout(callTimeoutTimer);

      if (window.NetParaNative) {
        window.NetParaNative.stopCallRingtone();
      }

      incomingBannerEl.style.display = "none";

      if (activeCall) {
        const caller = activeCall.caller;
        NetParaBackend.saveCallRecord({
          id: "call_" + Date.now(),
          peerUid: caller.uid,
          peerName: caller.fullName,
          peerAvatar: caller.avatarUrl,
          type: activeCall.type,
          direction: 'incoming',
          status: isTimeout ? 'missed' : 'declined',
          duration: 0,
          timestamp: Date.now()
        });
        NetParaWebRTC.endCall('rejected');
      }

      activeCall = null;
    },

    /**
     * Remote State Updates (e.g. peer answered or hung up)
     */
    handleRemoteStatusChange: function (status) {
      if (!activeCall) return;

      if (status === 'connected') {
        if (callTimeoutTimer) clearTimeout(callTimeoutTimer);
        activeCall.status = 'connected';
        callStateTextEl.innerText = "Connected";
        networkBadgeEl.style.display = "flex";
        if (activeCall.type === 'voice') {
          wavesContainerEl.style.display = "flex";
        }
        startDurationTimer();
      } else if (status === 'rejected') {
        alert("Call was declined.");
        NetParaCall.endCall("declined");
      } else if (status === 'ended') {
        NetParaCall.endCall("ended");
      }
    },

    /**
     * End Active Call
     */
    endCall: function (reason = 'ended') {
      if (callTimeoutTimer) clearTimeout(callTimeoutTimer);
      stopDurationTimer();

      if (window.NetParaNative) {
        window.NetParaNative.stopCallRingtone();
        window.NetParaNative.endCallAudio();
      }

      const elapsedSeconds = callStartTime ? Math.floor((Date.now() - callStartTime) / 1000) : 0;

      // Log Call History
      if (activeCall) {
        const peer = activeCall.role === 'caller' ? activeCall.targetUser : activeCall.caller;
        NetParaBackend.saveCallRecord({
          id: "call_log_" + Date.now(),
          peerUid: peer.uid,
          peerName: peer.fullName,
          peerAvatar: peer.avatarUrl,
          type: activeCall.type,
          direction: activeCall.role === 'caller' ? 'outgoing' : 'incoming',
          status: reason === 'missed' ? 'missed' : (elapsedSeconds > 0 ? 'completed' : 'cancelled'),
          duration: elapsedSeconds,
          timestamp: Date.now()
        });
      }

      NetParaWebRTC.endCall(reason);

      if (remoteVideoEl) remoteVideoEl.srcObject = null;
      if (localVideoEl) localVideoEl.srcObject = null;

      overlayEl.classList.add("hidden");
      incomingBannerEl.style.display = "none";
      activeCall = null;
      callStartTime = null;

      if (window.NetParaNative && window.NetParaNative.showToast) {
        window.NetParaNative.showToast(elapsedSeconds > 0 ? `Call ended (${formatDuration(elapsedSeconds)})` : "Call ended");
      }
    },

    /**
     * In-Call Media Controls
     */
    toggleMute: function () {
      isMuted = !isMuted;
      NetParaWebRTC.toggleMicrophone(isMuted);
      if (window.NetParaNative) {
        window.NetParaNative.setMicrophoneMute(isMuted);
      }
      this.updateControlButtons();
    },

    toggleVideo: function () {
      isVideoDisabled = !isVideoDisabled;
      NetParaWebRTC.toggleVideo(isVideoDisabled);
      this.updateControlButtons();
      if (localVideoEl) {
        localVideoEl.style.opacity = isVideoDisabled ? "0.2" : "1";
      }
    },

    toggleSpeaker: function () {
      isSpeakerOn = !isSpeakerOn;
      if (window.NetParaNative) {
        window.NetParaNative.setSpeakerphone(isSpeakerOn);
      }
      this.updateControlButtons();
    },

    switchCamera: async function () {
      const res = await NetParaWebRTC.switchCamera();
      if (res && localVideoEl) {
        localVideoEl.style.transform = res.facingMode === 'user' ? "scaleX(-1)" : "scaleX(1)";
      }
    },

    updateControlButtons: function () {
      if (btnMuteEl) {
        btnMuteEl.classList.toggle("muted", isMuted);
        document.getElementById("btn-mute-icon").innerHTML = isMuted ? "🔇" : "🎙️";
        document.getElementById("btn-mute-text").innerText = isMuted ? "Unmute" : "Mute";
      }
      if (btnVideoEl) {
        btnVideoEl.classList.toggle("muted", isVideoDisabled);
        document.getElementById("btn-video-icon").innerHTML = isVideoDisabled ? "🚫" : "📹";
        document.getElementById("btn-video-text").innerText = isVideoDisabled ? "Camera Off" : "Camera";
      }
      if (btnSpeakerEl) {
        btnSpeakerEl.classList.toggle("active", isSpeakerOn);
        document.getElementById("btn-speaker-icon").innerHTML = isSpeakerOn ? "🔊" : "🔈";
        document.getElementById("btn-speaker-text").innerText = isSpeakerOn ? "Speaker" : "Earpiece";
      }
    },

    updateNetworkQuality: function (stats) {
      if (!networkBadgeEl) return;
      networkBadgeEl.style.display = "inline-flex";

      let color = 'green';
      let label = 'HD • Good';
      let rtt = null;

      if (typeof stats === 'string') {
        if (stats === 'good') {
          color = 'green';
          label = 'HD • Connected';
        } else if (stats === 'poor' || stats === 'failed') {
          color = 'red';
          label = stats === 'poor' ? 'Weak Connection' : 'Connection Failed';
        } else {
          color = 'yellow';
          label = 'Reconnecting...';
        }
      } else if (typeof stats === 'object' && stats !== null) {
        color = stats.quality || 'green'; // 'green' | 'yellow' | 'red'
        label = stats.label || 'HD • Good';
        rtt = stats.rtt;
      }

      // Reset color classes
      networkBadgeEl.classList.remove("quality-green", "quality-yellow", "quality-red", "poor", "reconnecting");
      networkBadgeEl.classList.add(`quality-${color}`);

      // Signal bars SVG & pulsating glow indicator
      let barsSvg = '';
      if (color === 'green') {
        barsSvg = `
          <svg class="network-bars-icon" width="13" height="13" viewBox="0 0 24 24" fill="none">
            <line x1="5" y1="20" x2="5" y2="15" stroke="#10B981" stroke-width="3" stroke-linecap="round"/>
            <line x1="11" y1="20" x2="11" y2="10" stroke="#10B981" stroke-width="3" stroke-linecap="round"/>
            <line x1="17" y1="20" x2="17" y2="5" stroke="#10B981" stroke-width="3" stroke-linecap="round"/>
          </svg>
          <span class="network-dot-indicator green"></span>
        `;
      } else if (color === 'yellow') {
        barsSvg = `
          <svg class="network-bars-icon" width="13" height="13" viewBox="0 0 24 24" fill="none">
            <line x1="5" y1="20" x2="5" y2="15" stroke="#F59E0B" stroke-width="3" stroke-linecap="round"/>
            <line x1="11" y1="20" x2="11" y2="10" stroke="#F59E0B" stroke-width="3" stroke-linecap="round"/>
            <line x1="17" y1="20" x2="17" y2="5" stroke="rgba(255,255,255,0.2)" stroke-width="3" stroke-linecap="round"/>
          </svg>
          <span class="network-dot-indicator yellow"></span>
        `;
      } else { // red
        barsSvg = `
          <svg class="network-bars-icon" width="13" height="13" viewBox="0 0 24 24" fill="none">
            <line x1="5" y1="20" x2="5" y2="15" stroke="#EF4444" stroke-width="3" stroke-linecap="round"/>
            <line x1="11" y1="20" x2="11" y2="10" stroke="rgba(255,255,255,0.2)" stroke-width="3" stroke-linecap="round"/>
            <line x1="17" y1="20" x2="17" y2="5" stroke="rgba(255,255,255,0.2)" stroke-width="3" stroke-linecap="round"/>
          </svg>
          <span class="network-dot-indicator red"></span>
        `;
      }

      networkBadgeEl.innerHTML = `
        ${barsSvg}
        <span class="network-quality-text">${label}</span>
      `;
    },

    getActiveCall: () => activeCall
  };
})();
