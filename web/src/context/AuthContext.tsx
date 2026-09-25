import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  signOut,
  updateProfile
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp, 
  runTransaction 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage, googleProvider } from '../firebase/config';
import { UserProfile } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, displayName: string, username: string, avatarBlob?: Blob | null) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfileDetails: (updates: Partial<UserProfile>, newPhotoBlob?: Blob | null, newCoverBlob?: Blob | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch or create profile on auth change
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            setUserProfile(snap.data() as UserProfile);
          } else {
            // New user from Google or provider
            const cleanUsername = (user.email?.split('@')[0] || `user_${Date.now()}`).toLowerCase().replace(/[^a-z0-9_.-]/g, '');
            const newProfile: UserProfile = {
              uid: user.uid,
              username: cleanUsername,
              displayName: user.displayName || cleanUsername,
              email: user.email || '',
              photoURL: user.photoURL || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80`,
              bio: 'Connecting on iConnecto! 🚀',
              createdAt: serverTimestamp(),
              followersCount: 0,
              followingCount: 0,
              postsCount: 0,
              role: user.email === 'anisurrahmantanvi@gmail.com' ? 'admin' : 'user'
            };
            await setDoc(userDocRef, newProfile);
            // Reserve username
            await setDoc(doc(db, 'usernames', cleanUsername), { uid: user.uid, createdAt: serverTimestamp() });
            setUserProfile(newProfile);
          }
        } catch (err) {
          console.error("Error loading user profile:", err);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const registerWithEmail = async (
    email: string, 
    pass: string, 
    displayName: string, 
    username: string,
    avatarBlob?: Blob | null
  ) => {
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      throw new Error("Username must be between 3 and 30 characters (letters, numbers, underscore, dots).");
    }

    // Check username uniqueness
    const usernameDoc = await getDoc(doc(db, 'usernames', cleanUsername));
    if (usernameDoc.exists()) {
      throw new Error(`Username @${cleanUsername} is already taken. Please choose another.`);
    }

    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const uid = cred.user.uid;

    let photoURL = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80";
    if (avatarBlob) {
      try {
        const avatarRef = ref(storage, `users/${uid}/profile.jpg`);
        await uploadBytes(avatarRef, avatarBlob, { contentType: 'image/jpeg' });
        photoURL = await getDownloadURL(avatarRef);
      } catch (e) {
        console.warn("Storage upload fallback:", e);
      }
    }

    await updateProfile(cred.user, { displayName, photoURL });

    const newProfile: UserProfile = {
      uid,
      username: cleanUsername,
      displayName: displayName.trim(),
      email: email.trim().toLowerCase(),
      photoURL,
      bio: "Connecting on iConnecto! 🚀✨",
      createdAt: serverTimestamp(),
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      role: email === 'anisurrahmantanvi@gmail.com' ? 'admin' : 'user'
    };

    // Atomic creation of user profile and username reservation
    await runTransaction(db, async (tx) => {
      const uRef = doc(db, 'usernames', cleanUsername);
      const uSnap = await tx.get(uRef);
      if (uSnap.exists()) {
        throw new Error("Username already taken. Please pick another.");
      }
      tx.set(uRef, { uid, createdAt: serverTimestamp() });
      tx.set(doc(db, 'users', uid), newProfile);
    });

    setUserProfile(newProfile);
  };

  const loginWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const logout = async () => {
    await signOut(auth);
    setUserProfile(null);
  };

  const updateProfileDetails = async (
    updates: Partial<UserProfile>,
    newPhotoBlob?: Blob | null,
    newCoverBlob?: Blob | null
  ) => {
    if (!currentUser || !userProfile) return;
    const uid = currentUser.uid;
    const finalUpdates: any = { ...updates, updatedAt: serverTimestamp() };

    if (newPhotoBlob) {
      const avatarRef = ref(storage, `users/${uid}/profile.jpg`);
      await uploadBytes(avatarRef, newPhotoBlob, { contentType: 'image/jpeg' });
      finalUpdates.photoURL = await getDownloadURL(avatarRef);
      await updateProfile(currentUser, { photoURL: finalUpdates.photoURL });
    }

    if (newCoverBlob) {
      const coverRef = ref(storage, `users/${uid}/cover.jpg`);
      await uploadBytes(coverRef, newCoverBlob, { contentType: 'image/jpeg' });
      finalUpdates.coverURL = await getDownloadURL(coverRef);
    }

    if (updates.displayName) {
      await updateProfile(currentUser, { displayName: updates.displayName });
    }

    await updateDoc(doc(db, 'users', uid), finalUpdates);
    setUserProfile((prev) => prev ? { ...prev, ...finalUpdates } : null);
  };

  const isAdmin = userProfile?.role === 'admin' || currentUser?.email === 'anisurrahmantanvi@gmail.com';

  return (
    <AuthContext.Provider value={{
      currentUser,
      userProfile,
      loading,
      isAdmin,
      loginWithEmail,
      registerWithEmail,
      loginWithGoogle,
      logout,
      updateProfileDetails
    }}>
      {children}
    </AuthContext.Provider>
  );
};
