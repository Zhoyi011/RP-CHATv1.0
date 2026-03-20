import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAR22U33ODfsdB0FvVO_ptlLSeeY5pHbM8",
  authDomain: "rp-chat-6a082.firebaseapp.com",
  projectId: "rp-chat-6a082",
  storageBucket: "rp-chat-6a082.firebasestorage.app",
  messagingSenderId: "67446719459",
  appId: "1:67446719459:web:e0be5979bfa414343896d6",
  measurementId: "G-QC9YXCX1Y9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);