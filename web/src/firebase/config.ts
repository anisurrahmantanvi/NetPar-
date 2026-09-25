import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: "AIzaSyAHDctPClQ2IUbbFUaskbB6eDVPIOJ3X70",
  authDomain: "iconnectoapp.firebaseapp.com",
  projectId: "iconnectoapp",
  storageBucket: "iconnectoapp.firebasestorage.app",
  messagingSenderId: "859472364179",
  appId: "1:859472364179:android:d1f65f075b25b9acdc0366",
  measurementId: "G-ICONNECTO"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export const APP_BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://iconnectoapp.web.app';
