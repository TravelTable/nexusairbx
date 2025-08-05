// src/firebase.js

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCT6UZdUWmWdaJgKYhCSAzmr0pM-UU6-Tg",
  authDomain: "nexusrbx.firebaseapp.com",
  projectId: "nexusrbx",
  storageBucket: "nexusrbx.appspot.com",
  messagingSenderId: "834738385750",
  appId: "1:834738385750:web:7f877b6dd0228c11fa1cf7",
  measurementId: "G-4V4T613MJ7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication, Analytics, and Firestore
export const auth = getAuth(app);
export const analytics = getAnalytics(app);
export const db = getFirestore(app);