
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "campusflow-y0esd",
  "appId": "1:848777389489:web:9a2ba42a7abeb143dac990",
  "storageBucket": "campusflow-y0esd.firebasestorage.app",
  "apiKey": "AIzaSyATLIR_ghkXhet-9coqfVRWyExT5TlSTl4",
  "authDomain": "campusflow-y0esd.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "848777389489"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
