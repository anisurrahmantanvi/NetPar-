const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

/**
 * Triggered when a post like is created:
 * 1. Atomically increments post likeCount
 * 2. Creates a notification for post author (if not self)
 * 3. Sends FCM push notification to author device
 */
exports.onLikeCreated = functions.firestore
  .document("posts/{postId}/likes/{userId}")
  .onCreate(async (snap, context) => {
    const { postId, userId } = context.params;

    try {
      const postRef = db.collection("posts").doc(postId);
      const postDoc = await postRef.get();
      if (!postDoc.exists) return null;

      const postData = postDoc.data();
      await postRef.update({
        likeCount: admin.firestore.FieldValue.increment(1)
      });

      // Avoid self-notification
      if (postData.authorId === userId) return null;

      const senderDoc = await db.collection("users").doc(userId).get();
      const senderName = senderDoc.exists ? senderDoc.data().displayName : "Someone";

      // Create notification record
      const notifRef = db.collection("notifications").doc();
      await notifRef.set({
        notificationId: notifRef.id,
        recipientId: postData.authorId,
        senderId: userId,
        type: "like",
        postId: postId,
        message: `${senderName} liked your post.`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false
      });

      // Send FCM push notification if author has fcmToken
      const authorDoc = await db.collection("users").doc(postData.authorId).get();
      const fcmToken = authorDoc.exists ? authorDoc.data().fcmToken : null;
      if (fcmToken) {
        await messaging.send({
          token: fcmToken,
          notification: {
            title: "New Like on iConnecto",
            body: `${senderName} liked your post.`
          },
          data: {
            type: "like",
            postId: postId
          }
        });
      }
    } catch (err) {
      console.error("Error in onLikeCreated:", err);
    }
    return null;
  });

/**
 * Triggered when a post like is deleted:
 * Atomically decrements post likeCount
 */
exports.onLikeDeleted = functions.firestore
  .document("posts/{postId}/likes/{userId}")
  .onDelete(async (snap, context) => {
    const { postId } = context.params;
    try {
      await db.collection("posts").doc(postId).update({
        likeCount: admin.firestore.FieldValue.increment(-1)
      });
    } catch (err) {
      console.error("Error in onLikeDeleted:", err);
    }
    return null;
  });

/**
 * Triggered when a comment is added to a post:
 * 1. Atomically increments commentCount
 * 2. Creates notification and sends push notification
 */
exports.onCommentCreated = functions.firestore
  .document("posts/{postId}/comments/{commentId}")
  .onCreate(async (snap, context) => {
    const { postId, commentId } = context.params;
    const commentData = snap.data();

    try {
      const postRef = db.collection("posts").doc(postId);
      const postDoc = await postRef.get();
      if (!postDoc.exists) return null;

      const postData = postDoc.data();
      await postRef.update({
        commentCount: admin.firestore.FieldValue.increment(1)
      });

      const commenterId = commentData.userId || commentData.authorId;
      if (postData.authorId === commenterId) return null;

      const commenterName = commentData.username || "Someone";
      const notifRef = db.collection("notifications").doc();
      await notifRef.set({
        notificationId: notifRef.id,
        recipientId: postData.authorId,
        senderId: commenterId,
        type: "comment",
        postId: postId,
        commentId: commentId,
        message: `${commenterName} commented: "${commentData.text.substring(0, 50)}"`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false
      });

      const authorDoc = await db.collection("users").doc(postData.authorId).get();
      const fcmToken = authorDoc.exists ? authorDoc.data().fcmToken : null;
      if (fcmToken) {
        await messaging.send({
          token: fcmToken,
          notification: {
            title: "New Comment on iConnecto",
            body: `${commenterName} commented: "${commentData.text.substring(0, 50)}"`
          },
          data: {
            type: "comment",
            postId: postId,
            commentId: commentId
          }
        });
      }
    } catch (err) {
      console.error("Error in onCommentCreated:", err);
    }
    return null;
  });

/**
 * Triggered when a user follows another:
 * 1. Atomically increments followersCount and followingCount
 * 2. Sends follow notification
 */
exports.onFollowCreated = functions.firestore
  .document("users/{userId}/followers/{followerId}")
  .onCreate(async (snap, context) => {
    const { userId, followerId } = context.params;

    try {
      const batch = db.batch();
      const targetUserRef = db.collection("users").doc(userId);
      const followerUserRef = db.collection("users").doc(followerId);

      batch.update(targetUserRef, {
        followersCount: admin.firestore.FieldValue.increment(1)
      });
      batch.update(followerUserRef, {
        followingCount: admin.firestore.FieldValue.increment(1)
      });
      await batch.commit();

      const followerDoc = await followerUserRef.get();
      const followerName = followerDoc.exists ? followerDoc.data().displayName : "Someone";

      const notifRef = db.collection("notifications").doc();
      await notifRef.set({
        notificationId: notifRef.id,
        recipientId: userId,
        senderId: followerId,
        type: "follow",
        message: `${followerName} started following you.`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false
      });

      const targetDoc = await targetUserRef.get();
      const fcmToken = targetDoc.exists ? targetDoc.data().fcmToken : null;
      if (fcmToken) {
        await messaging.send({
          token: fcmToken,
          notification: {
            title: "New Follower",
            body: `${followerName} started following you.`
          },
          data: {
            type: "follow",
            userId: followerId
          }
        });
      }
    } catch (err) {
      console.error("Error in onFollowCreated:", err);
    }
    return null;
  });

/**
 * Triggered on unfollow:
 * Decrements followers and following counts
 */
exports.onFollowDeleted = functions.firestore
  .document("users/{userId}/followers/{followerId}")
  .onDelete(async (snap, context) => {
    const { userId, followerId } = context.params;

    try {
      const batch = db.batch();
      batch.update(db.collection("users").doc(userId), {
        followersCount: admin.firestore.FieldValue.increment(-1)
      });
      batch.update(db.collection("users").doc(followerId), {
        followingCount: admin.firestore.FieldValue.increment(-1)
      });
      await batch.commit();
    } catch (err) {
      console.error("Error in onFollowDeleted:", err);
    }
    return null;
  });

/**
 * Triggered on direct message sent:
 * Sends real-time FCM push notification to peer
 */
exports.onMessageCreated = functions.firestore
  .document("conversations/{convId}/messages/{msgId}")
  .onCreate(async (snap, context) => {
    const { convId } = context.params;
    const msgData = snap.data();

    try {
      const convDoc = await db.collection("conversations").doc(convId).get();
      if (!convDoc.exists) return null;

      const convData = convDoc.data();
      const peerId = (convData.participantIds || []).find(id => id !== msgData.senderId);
      if (!peerId) return null;

      const senderDoc = await db.collection("users").doc(msgData.senderId).get();
      const senderName = senderDoc.exists ? senderDoc.data().displayName : "Chat";

      const peerDoc = await db.collection("users").doc(peerId).get();
      const peerToken = peerDoc.exists ? peerDoc.data().fcmToken : null;

      if (peerToken) {
        await messaging.send({
          token: peerToken,
          notification: {
            title: senderName,
            body: msgData.text || (msgData.mediaUrl ? "Sent an attachment" : "New message")
          },
          data: {
            type: "message",
            conversationId: convId,
            senderId: msgData.senderId
          }
        });
      }
    } catch (err) {
      console.error("Error in onMessageCreated:", err);
    }
    return null;
  });

/**
 * Callable Function: Grant or Revoke Admin Role
 * Verifies that the requester already has admin claims or is root administrator
 */
exports.setAdminRole = functions.https.onCall(async (data, context) => {
  // Check that the caller is an authenticated admin
  if (!context.auth || (!context.auth.token.role === "admin" && context.auth.token.email !== "anisurrahmantanvi@gmail.com")) {
    throw new functions.https.HttpsError("permission-denied", "Only administrators can assign admin privileges.");
  }

  const { targetUid, isAdmin } = data;
  if (!targetUid) {
    throw new functions.https.HttpsError("invalid-argument", "targetUid is required.");
  }

  await admin.auth().setCustomUserClaims(targetUid, {
    role: isAdmin ? "admin" : "user",
    admin: !!isAdmin
  });

  return { success: true, targetUid, isAdmin };
});
