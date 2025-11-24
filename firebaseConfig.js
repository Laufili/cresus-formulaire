// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDx4q5bN81Cr35rw4U8O7P9jhrMLNz3mio",
  authDomain: "formulaire-cresus.firebaseapp.com",
  projectId: "formulaire-cresus",
  storageBucket: "formulaire-cresus.firebasestorage.app",   // ✔️ IMPORTANT
  messagingSenderId: "72537941440",
  appId: "1:72537941440:web:1d9d3331ae7510d7ea9425"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
