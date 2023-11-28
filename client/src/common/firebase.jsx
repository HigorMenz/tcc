import { initializeApp } from "firebase/app";

import { GoogleAuthProvider, getAuth, signInWithPopup } from "firebase/auth";
const firebaseConfig = {
  apiKey: "AIzaSyAhwBpR9qVpbsR1Us09XzKk6lyDD0Is0ig",
  authDomain: "nerd-abyss-auth.firebaseapp.com",
  projectId: "nerd-abyss-auth",
  storageBucket: "nerd-abyss-auth.appspot.com",
  messagingSenderId: "747535144912",
  appId: "1:747535144912:web:f7145d5e78d4aba6b98bd5",
};
const app = initializeApp(firebaseConfig);

// google auth

const provider = new GoogleAuthProvider();

const auth = getAuth();

export const authWithGoogle = async () => {
  let user = null;

  await signInWithPopup(auth, provider)
    .then((result) => {
      user = result.user;
    })
    .catch((err) => {
      console.log(err);
    });
  return user;
};
