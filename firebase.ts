
// Fix: Use direct @firebase package subpaths to resolve missing export errors in this environment
import { initializeApp } from "@firebase/app";
import { getFirestore } from "@firebase/firestore";
import { getStorage } from "@firebase/storage";
import { getAuth } from "@firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAp4MKtoOHIQjrTjmoCTtIS1sQlVFFCMX0",
  authDomain: "stdashboard-2b445.firebaseapp.com",
  projectId: "stdashboard-2b445",
  storageBucket: "stdashboard-2b445.firebasestorage.app",
  messagingSenderId: "684345065187",
  appId: "1:684345065187:web:2906e9ac50ceea08644fd6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize and export services
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
