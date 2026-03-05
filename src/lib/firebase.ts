import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCgrV1F02tBqmzPHMU9p8nn5-E1ohr0ZkQ",
  authDomain: "fi-sabilullah.firebaseapp.com",
  databaseURL: "https://fi-sabilullah-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "fi-sabilullah",
  storageBucket: "fi-sabilullah.firebasestorage.app",
  messagingSenderId: "596150775318",
  appId: "1:596150775318:web:4c518f273e11063a72cf37"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
