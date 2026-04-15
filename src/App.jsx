// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./firebase/AuthContext";
import LoginPage   from "./pages/LoginPage";
import Dashboard   from "./pages/Dashboard";

/**
 * Shows a minimal loading screen while Firebase resolves the session.
 * Without this, users see a flash of the login page on every refresh.
 */
function SplashScreen() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#0d0f14",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{
          width: "8px", height: "8px",
          borderRadius: "50%", background: "#4f7dff",
          display: "inline-block",
          animation: "pulse 1.2s ease-in-out infinite",
        }} />
        <style>{`@keyframes pulse { 0%,100%{opacity:.3} 50%{opacity:1} }`}</style>
        <span style={{ color: "#6b7394", fontSize: "13px" }}>Loading…</span>
      </div>
    </div>
  );
}

/**
 * Redirects unauthenticated users to /login.
 * Remembers the attempted URL so we can redirect back after login.
 */
function PrivateRoute({ children }) {
  const { user, status } = useAuth();
  if (status === "loading")          return <SplashScreen />;
  if (status === "unauthenticated")  return <Navigate to="/login" replace />;
  return children;
}

/**
 * Redirects already-authenticated users away from /login.
 */
function PublicRoute({ children }) {
  const { user, status } = useAuth();
  if (status === "loading")         return <SplashScreen />;
  if (status === "authenticated")   return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
