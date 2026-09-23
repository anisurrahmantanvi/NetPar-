/**
 * NetPara WebRTC Calling Engine
 * Production-ready 1-to-1 Voice & Video Call System
 * Supports standard RTCPeerConnection, STUN, Firestore Signaling & Broadcast Fallback
 */

const NetParaWebRTC = (function () {
  const ICE_SERVERS = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ],
    iceCandidatePoolSize: 10
  };

  let peerConnection = null;
  let localStream = null;
  let remoteStream = null;
  let currentCallId = null;
  let currentRole = null; // 'caller' | 'receiver'
  let currentCallType = 'video'; // 'video' | 'voice'
  let currentFacingMode = 'user'; // 'user' | 'environment'
  let signalingUnsubscribers = [];
  let broadcastChannel = null;

  // Initialize BroadcastChannel for local/offline tab-to-tab testing
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      broadcastChannel = new BroadcastChannel('netpara_webrtc_signaling');
      broadcastChannel.onmessage = handleBroadcastSignal;
    }
  } catch (e) {
    console.warn("BroadcastChannel not available:", e);
  }

  function handleBroadcastSignal(event) {
    const data = event.data;
    if (!data || data.callId !== currentCallId) return;

    if (currentRole === 'caller') {
      if (data.type === 'answer' && peerConnection && !peerConnection.currentRemoteDescription) {
        peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer))
          .catch(err => console.error("Error setting remote answer:", err));
      } else if (data.type === 'receiver_candidate' && peerConnection) {
        peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate))
          .catch(err => console.error("Error adding candidate:", err));
      } else if (data.type === 'status_update') {
        NetParaCall.handleRemoteStatusChange(data.status);
      }
    } else if (currentRole === 'receiver') {
      if (data.type === 'caller_candidate' && peerConnection) {
        peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate))
          .catch(err => console.error("Error adding candidate:", err));
      } else if (data.type === 'status_update') {
        NetParaCall.handleRemoteStatusChange(data.status);
      }
    }
  }

  function sendSignal(type, payload) {
    const message = {
      type,
      callId: currentCallId,
      senderRole: currentRole,
      ...payload
    };

    // 1. BroadcastChannel fallback for multi-tab/local device
    if (broadcastChannel) {
      broadcastChannel.postMessage(message);
    }

    // 2. Firestore Cloud Signaling if Firebase Firestore is available
    if (window.firebase && window.firebase.firestore && window.NetParaFirebaseDb) {
      try {
        const db = window.NetParaFirebaseDb;
        const callDoc = db.collection('calls').doc(currentCallId);

        if (type === 'offer') {
          callDoc.set({
            callId: currentCallId,
            type: currentCallType,
            status: 'ringing',
            offer: payload.offer,
            caller: payload.caller,
            receiver: payload.receiver,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        } else if (type === 'answer') {
          callDoc.update({
            answer: payload.answer,
            status: 'connected',
            connectedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        } else if (type === 'caller_candidate') {
          callDoc.collection('callerCandidates').add(payload.candidate);
        } else if (type === 'receiver_candidate') {
          callDoc.collection('receiverCandidates').add(payload.candidate);
        } else if (type === 'status_update') {
          callDoc.update({
            status: payload.status,
            endedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
      } catch (err) {
        console.warn("Firestore signaling write error:", err);
      }
    }
  }

  function setupFirestoreListeners(callId, role) {
    if (!window.firebase || !window.firebase.firestore || !window.NetParaFirebaseDb) return;

    try {
      const db = window.NetParaFirebaseDb;
      const callDoc = db.collection('calls').doc(callId);

      // Listen for call document changes
      const unsubDoc = callDoc.onSnapshot(snapshot => {
        if (!snapshot.exists) return;
        const data = snapshot.data();

        if (role === 'caller') {
          if (data.answer && peerConnection && !peerConnection.currentRemoteDescription) {
            peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer))
              .catch(err => console.error("Failed to set remote description:", err));
          }
        }

        if (data.status && data.status !== 'ringing') {
          NetParaCall.handleRemoteStatusChange(data.status);
        }
      });
      signalingUnsubscribers.push(unsubDoc);

      // Listen for ICE Candidates
      const targetSub = role === 'caller' ? 'receiverCandidates' : 'callerCandidates';
      const unsubCandidates = callDoc.collection(targetSub).onSnapshot(snapshot => {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added' && peerConnection) {
            const candidate = change.doc.data();
            peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
              .catch(e => console.warn("Failed adding ICE candidate from firestore:", e));
          }
        });
      });
      signalingUnsubscribers.push(unsubCandidates);
    } catch (e) {
      console.warn("Error setting up Firestore listeners:", e);
    }
  }

  return {
    /**
     * Acquire User Media (Camera & Microphone)
     */
    getUserMedia: async function (callType, facingMode = 'user') {
      currentCallType = callType;
      currentFacingMode = facingMode;

      const isVideo = callType === 'video';
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: isVideo ? {
          facingMode: facingMode,
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 24, max: 30 }
        } : false
      };

      try {
        if (localStream) {
          localStream.getTracks().forEach(t => t.stop());
        }
        localStream = await navigator.mediaDevices.getUserMedia(constraints);
        return localStream;
      } catch (err) {
        console.error("getUserMedia error:", err);
        // Fallback to audio only if camera is unavailable or denied
        if (isVideo) {
          console.warn("Falling back to audio-only stream...");
          localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          currentCallType = 'voice';
          return localStream;
        }
        throw err;
      }
    },

    /**
     * Initialize RTCPeerConnection and bind media tracks
     */
    createPeerConnection: function (onRemoteStream, onNetworkQualityChange) {
      if (peerConnection) {
        peerConnection.close();
      }

      peerConnection = new RTCPeerConnection(ICE_SERVERS);
      remoteStream = new MediaStream();

      // Add local tracks to peer connection
      if (localStream) {
        localStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, localStream);
        });
      }

      // Handle incoming remote media tracks
      peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach(track => {
          remoteStream.addTrack(track);
        });
        if (onRemoteStream) {
          onRemoteStream(remoteStream);
        }
      };

      // Handle ICE Candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          const type = currentRole === 'caller' ? 'caller_candidate' : 'receiver_candidate';
          sendSignal(type, { candidate: event.candidate.toJSON() });
        }
      };

      // Monitor ICE Connection State
      peerConnection.oniceconnectionstatechange = () => {
        const state = peerConnection.iceConnectionState;
        console.log("ICE Connection State:", state);

        if (state === 'connected' || state === 'completed') {
          if (onNetworkQualityChange) onNetworkQualityChange('good');
        } else if (state === 'disconnected') {
          if (onNetworkQualityChange) onNetworkQualityChange('poor');
        } else if (state === 'failed') {
          if (onNetworkQualityChange) onNetworkQualityChange('failed');
          // Try ICE restart on failure
          if (currentRole === 'caller') {
            NetParaWebRTC.restartIce();
          }
        }
      };

      return peerConnection;
    },

    /**
     * Start Call as Caller: Create Offer & Send
     */
    startCall: async function (callId, targetUser, currentUser, callType) {
      currentCallId = callId;
      currentRole = 'caller';
      currentCallType = callType;

      setupFirestoreListeners(callId, 'caller');

      const isVideo = callType === 'video';
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideo
      });

      await peerConnection.setLocalDescription(offer);

      sendSignal('offer', {
        offer: { type: offer.type, sdp: offer.sdp },
        caller: {
          uid: currentUser.uid,
          name: currentUser.fullName,
          avatar: currentUser.avatarUrl
        },
        receiver: {
          uid: targetUser.uid,
          name: targetUser.fullName,
          avatar: targetUser.avatarUrl
        }
      });
    },

    /**
     * Accept Call as Receiver: Handle Remote Offer, Create Answer & Send
     */
    acceptCall: async function (callId, remoteOffer) {
      currentCallId = callId;
      currentRole = 'receiver';

      setupFirestoreListeners(callId, 'receiver');

      if (remoteOffer) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(remoteOffer));
      }

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      sendSignal('answer', {
        answer: { type: answer.type, sdp: answer.sdp }
      });
    },

    /**
     * ICE Restart for Poor/Broken Network
     */
    restartIce: async function () {
      if (!peerConnection || currentRole !== 'caller') return;
      try {
        console.log("Attempting ICE Restart...");
        const offer = await peerConnection.createOffer({ iceRestart: true });
        await peerConnection.setLocalDescription(offer);
        sendSignal('offer', { offer: { type: offer.type, sdp: offer.sdp } });
      } catch (e) {
        console.warn("ICE restart failed:", e);
      }
    },

    /**
     * Mute / Unmute Microphone
     */
    toggleMicrophone: function (mute) {
      if (!localStream) return false;
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(t => {
        t.enabled = !mute;
      });
      return mute;
    },

    /**
     * Enable / Disable Camera Video
     */
    toggleVideo: function (disable) {
      if (!localStream) return false;
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(t => {
        t.enabled = !disable;
      });
      return disable;
    },

    /**
     * Switch Front / Rear Camera
     */
    switchCamera: async function () {
      if (currentCallType !== 'video') return;
      currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';

      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: currentFacingMode, width: { ideal: 640 }, height: { ideal: 480 } }
        });

        const newVideoTrack = newStream.getVideoTracks()[0];
        if (peerConnection) {
          const sender = peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(newVideoTrack);
          }
        }

        // Replace local track in localStream
        const oldTrack = localStream.getVideoTracks()[0];
        if (oldTrack) {
          oldTrack.stop();
          localStream.removeTrack(oldTrack);
        }
        localStream.addTrack(newVideoTrack);

        return { stream: localStream, facingMode: currentFacingMode };
      } catch (e) {
        console.error("Camera switch error:", e);
      }
    },

    /**
     * End and Clean Up All WebRTC Resources
     */
    endCall: function (status = 'ended') {
      sendSignal('status_update', { status });

      // Clean up signaling listeners
      signalingUnsubscribers.forEach(unsub => {
        try { unsub(); } catch (_) {}
      });
      signalingUnsubscribers = [];

      // Clean up Firestore call document if exists
      if (currentCallId && window.firebase && window.firebase.firestore && window.NetParaFirebaseDb) {
        try {
          const db = window.NetParaFirebaseDb;
          db.collection('calls').doc(currentCallId).delete().catch(() => {});
        } catch (_) {}
      }

      // Stop all tracks
      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
        localStream = null;
      }
      if (remoteStream) {
        remoteStream.getTracks().forEach(t => t.stop());
        remoteStream = null;
      }

      // Close peer connection
      if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
      }

      currentCallId = null;
      currentRole = null;
    },

    getLocalStream: () => localStream,
    getRemoteStream: () => remoteStream,
    getCallType: () => currentCallType
  };
})();
