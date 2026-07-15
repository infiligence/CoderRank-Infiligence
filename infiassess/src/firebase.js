// Firebase configuration for the CoderRank / InfiAssess project.
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyDuWObdlqNWHa4XKbqsDhb8-z2RUYz37QQ",
  authDomain: "coderrank-3e2e2.firebaseapp.com",
  projectId: "coderrank-3e2e2",
  storageBucket: "coderrank-3e2e2.firebasestorage.app",
  messagingSenderId: "915377888423",
  appId: "1:915377888423:web:c017cc3ac5f62016bd4f82",
  measurementId: "G-XSYT04C5LW",
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
export default app
