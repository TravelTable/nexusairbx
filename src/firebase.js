// src/firebase.js
// Firebase bootstrap with safe, optional Analytics loading.
// - Neutral chunk name avoids adblock "analytics" filters
// - Skips in development
// - Retries once on transient ChunkLoadError
// - Never crashes the app if analytics fails to load

import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ---- Minimal retry helper for dynamic imports ----
function withRetry(importer, retries = 1, delayMs = 350) {
  return new Promise((resolve, reject) => {
    importer()
      .then(resolve)
      .catch((err) => {
        const msg = String((err && err.message) || "");
        const isChunkErr = /ChunkLoadError|Loading chunk \d+ failed|dynamic import/i.test(msg);
        if (isChunkErr && retries > 0) {
          setTimeout(() => {
            withRetry(importer, retries - 1, Math.min(delayMs * 2, 1200)).then(resolve, reject);
          }, delayMs);
        } else {
          reject(err);
        }
      });
  });
}

// Your web app's Firebase configuration (client keys are fine to ship)
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
export const db = getFirestore(app);

// ---- Safe, optional Analytics loader ----
// Call initAnalytics() once after your app mounts.
export async function initAnalytics() {
  // Don’t attempt analytics in dev; avoids localhost blockers & HMR noise
  if (process.env.NODE_ENV !== "production") return null;

  try {
    const mod = await withRetry(
      () =>
        import(
          /* webpackChunkName: "fb-ana" */
          "firebase/analytics"
        ),
      1
    );

    // Some environments aren’t supported
    if (typeof mod.isSupported === "function") {
      const supported = await mod.isSupported();
      if (!supported) return null;
    }

    return mod.getAnalytics(app);
  } catch (err) {
    // If a blocker kills the request, run without analytics—no crash.
    if (typeof console !== "undefined") {
      console.warn("Analytics disabled (load failed):", err);
    }
    return null;
  }
}
