import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import config from "./config.json.js";

const app = initializeApp({
  credential: cert(config),
  databaseURL: "https://ecommerce-reactu-default-rtdb.firebaseio.com",
  storageBucket: "ecommerce-reactu.appspot.com",
});

export const au = getAuth(app);
export const rt = getDatabase(app);
export const fs = getFirestore(app);
export const cs = getStorage(app).bucket();
