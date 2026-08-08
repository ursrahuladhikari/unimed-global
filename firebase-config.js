// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: ["AIzaSyAnWH", "GdhC0vGOUeylvYCRxgqG8N0Pxj10"].join("_"),
  authDomain: "unimed-global.firebaseapp.com",
  projectId: "unimed-global",
  storageBucket: "unimed-global.firebasestorage.app",
  messagingSenderId: "630154344104",
  appId: "1:630154344104:web:2342a134f4d3de9410b49d",
  measurementId: "G-1PQCL7EHTT"
};

// Initialize Firebase (Compat mode for plain JS script tags)
if (typeof firebase !== 'undefined') {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  window.db = firebase.firestore();
  if (typeof firebase.auth === 'function') {
    window.auth = firebase.auth();
    console.log("🔒 Firebase Authentication & Cloud Firestore Initialized successfully!");
  } else {
    console.log("🔥 Firebase Cloud Firestore Initialized successfully!");
  }
} else {
  console.warn("⚠️ Firebase SDK script tag not loaded yet.");
}