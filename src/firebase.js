import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCT6UZdUWmWdaJgKYhCSAzmr0pM-UU6-Tg",
  authDomain: "nexusrbx.firebaseapp.com",
  projectId: "nexusrbx",
  storageBucket: "nexusrbx.appspot.com",
  messagingSenderId: "834738385750",
  appId: "1:834738385750:web:7f877b6dd0228c11fa1cf7",
  measurementId: "G-4V4T613MJ7",
};

// Prevent double-init during HMR
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// Core SDKs
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false,
});

// Safe, optional Analytics loader
export async function initAnalytics() {
  if (process.env.NODE_ENV !== "production") return null;

  try {
    const { getAnalytics, isSupported } = await import("firebase/analytics");
    const supported = await isSupported();
    if (!supported) return null;
    return getAnalytics(app);
  } catch (err) {
    if (typeof console !== "undefined") {
      console.warn("Analytics disabled (load failed):", err);
    }
    return null;
  }
}

export default app;
