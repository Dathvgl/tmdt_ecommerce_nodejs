import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const config = {
  apiKey: "AIzaSyCXF8dzVhOiRSZa_8VwaNNkYPzTYURhy_Y",
  authDomain: "ecommerce-reactu.firebaseapp.com",
  projectId: "ecommerce-reactu",
  storageBucket: "ecommerce-reactu.appspot.com",
  messagingSenderId: "207483518038",
  appId: "1:207483518038:web:f44327865e4e1bc1e6cff7",
};

const app = initializeApp(config);

export const th = getAuth(app);
export const st = getStorage(app);
