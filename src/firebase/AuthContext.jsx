// src/firebase/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";

// Ensure session survives page refresh (localStorage-backed).
// Firebase defaults to this, but we set it explicitly for clarity.
setPersistence(auth, browserLocalPersistence).catch(console.error);

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  // Three states: "loading" | "authenticated" | "unauthenticated"
  const [status, setStatus]   = useState("loading");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setStatus(u ? "authenticated" : "unauthenticated");
    });
    return unsub;
  }, []);

  const loginWithEmail  = (email, pw) => signInWithEmailAndPassword(auth, email, pw);
  const signupWithEmail = (email, pw) => createUserWithEmailAndPassword(auth, email, pw);
  const loginWithGoogle = ()          => signInWithPopup(auth, googleProvider);
  const logout          = ()          => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, status, loginWithEmail, signupWithEmail, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
