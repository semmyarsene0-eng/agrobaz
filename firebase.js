import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAui5nB2cVwY7HxMlpNVvSW7y83hPrmJqM",
  authDomain: "agrobaz-4d83e.firebaseapp.com",
  projectId: "agrobaz-4d83e",
  storageBucket: "agrobaz-4d83e.firebasestorage.app",
  messagingSenderId: "712173549234",
  appId: "1:712173549234:web:ff3ffafb0f52774e067bab",
  measurementId: "G-T7VBGFRH2X",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

export default app;