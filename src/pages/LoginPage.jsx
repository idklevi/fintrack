// src/pages/LoginPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../firebase/AuthContext";

export default function LoginPage() {
  const { loginWithEmail, signupWithEmail, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode]         = useState("login");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [googleLoad, setGoogleLoad] = useState(false);

  function validate() {
    if (!email.includes("@")) return "Enter a valid email address.";
    if (password.length < 6)  return "Password must be at least 6 characters.";
    if (mode === "signup" && password !== confirm) return "Passwords don't match.";
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError(""); setLoading(true);
    try {
      mode === "login"
        ? await loginWithEmail(email, password)
        : await signupWithEmail(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(""); setGoogleLoad(true);
    try {
      await loginWithGoogle();
      navigate("/", { replace: true });
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") setError(friendlyError(err.code));
    } finally {
      setGoogleLoad(false);
    }
  }

  function toggleMode() {
    setMode(m => m === "login" ? "signup" : "login");
    setError(""); setConfirm("");
  }

  const busy = loading || googleLoad;

  return (
    <div style={s.page}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      <div style={s.card}>

        {/* Logo */}
        <div style={s.logo}>
          <span style={s.logoDot} />
          <span style={s.logoText}>fintrack</span>
        </div>

        {/* Heading */}
        <h1 style={s.heading}>
          {mode === "login" ? "Welcome back" : "Create account"}
        </h1>
        <p style={s.subheading}>
          {mode === "login"
            ? "Sign in to your account to continue."
            : "Start tracking your finances in seconds."}
        </p>

        {/* Google button */}
        <GoogleButton onClick={handleGoogle} loading={googleLoad} disabled={busy} />

        {/* Divider */}
        <div style={s.divider}>
          <div style={s.dividerLine} />
          <span style={s.dividerText}>or with email</span>
          <div style={s.dividerLine} />
        </div>

        {/* Error */}
        {error && <div style={s.errorBox}>{error}</div>}

        {/* Form */}
        <form onSubmit={handleSubmit} style={s.form}>
          <FocusInput
            type="email" placeholder="Email address" value={email}
            onChange={v => { setEmail(v); setError(""); }}
            autoComplete="email"
          />
          <FocusInput
            type="password" placeholder="Password" value={password}
            onChange={v => { setPassword(v); setError(""); }}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
          {mode === "signup" && (
            <FocusInput
              type="password" placeholder="Confirm password" value={confirm}
              onChange={v => { setConfirm(v); setError(""); }}
              autoComplete="new-password"
            />
          )}

          <button type="submit" disabled={busy} style={{ ...s.btnPrimary, opacity: busy ? 0.5 : 1 }}>
            {loading && <Spinner color="#fff" />}
            {loading
              ? (mode === "login" ? "Signing in…" : "Creating account…")
              : (mode === "login" ? "Sign in" : "Create account")}
          </button>
        </form>

        {/* Toggle mode */}
        <p style={s.toggleRow}>
          {mode === "login" ? "No account? " : "Have an account? "}
          <button onClick={toggleMode} style={s.toggleBtn}>
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </p>

        <p style={s.footer}>
          Your financial data is encrypted and never shared with third parties.
        </p>
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────── */

function FocusInput({ type, placeholder, value, onChange, autoComplete }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      autoComplete={autoComplete}
      onChange={e => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...s.input,
        borderColor: focused ? "#4f7dff" : "#2a2f3e",
      }}
    />
  );
}

function GoogleButton({ onClick, loading, disabled }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...s.btnGoogle,
        borderColor: hovered ? "#4f7dff" : "#2a2f3e",
        color: hovered ? "#4f7dff" : "#e8eaf2",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {loading ? <Spinner /> : (
        <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
          <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
      )}
      Continue with Google
    </button>
  );
}

function Spinner({ color = "#6b7394" }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" style={{ animation: "spin 0.7s linear infinite", flexShrink: 0 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <circle cx="7" cy="7" r="5.5" stroke={color} strokeWidth="1.5" fill="none" strokeDasharray="26" strokeDashoffset="10" strokeLinecap="round"/>
    </svg>
  );
}

/* ── Error map ──────────────────────────────────── */

function friendlyError(code) {
  return ({
    "auth/user-not-found":         "No account found with this email.",
    "auth/wrong-password":         "Incorrect password. Try again.",
    "auth/invalid-credential":     "Incorrect email or password.",
    "auth/email-already-in-use":   "An account with this email already exists.",
    "auth/invalid-email":          "Enter a valid email address.",
    "auth/too-many-requests":      "Too many attempts. Try again in a few minutes.",
    "auth/network-request-failed": "Network error. Check your connection.",
  })[code] || "Something went wrong. Please try again.";
}

/* ── Styles ─────────────────────────────────────── */

const s = {
  page: {
    minHeight: "100vh", background: "#0d0f14",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'DM Sans', sans-serif", padding: "24px",
  },
  card: {
    width: "100%", maxWidth: "400px",
    background: "#161920", border: "1px solid #2a2f3e",
    borderRadius: "16px", padding: "36px 32px",
  },
  logo: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "32px" },
  logoDot: { width: "8px", height: "8px", borderRadius: "50%", background: "#4f7dff", display: "inline-block" },
  logoText: { fontWeight: 600, color: "#e8eaf2", fontSize: "15px", letterSpacing: "-0.3px" },
  heading: { fontSize: "20px", fontWeight: 600, color: "#e8eaf2", marginBottom: "6px", letterSpacing: "-0.3px" },
  subheading: { fontSize: "13px", color: "#6b7394", marginBottom: "24px" },
  btnGoogle: {
    width: "100%", background: "transparent",
    border: "1px solid #2a2f3e", borderRadius: "10px",
    padding: "12px 16px", fontSize: "13px", fontWeight: 500,
    cursor: "pointer", display: "flex", alignItems: "center",
    justifyContent: "center", gap: "10px",
    fontFamily: "'DM Sans', sans-serif", transition: "border-color 0.15s, color 0.15s",
  },
  divider: { display: "flex", alignItems: "center", gap: "12px", margin: "20px 0" },
  dividerLine: { flex: 1, height: "1px", background: "#2a2f3e" },
  dividerText: { fontSize: "11px", color: "#3d4460", whiteSpace: "nowrap" },
  errorBox: {
    background: "rgba(255,90,114,0.08)", border: "1px solid rgba(255,90,114,0.25)",
    borderRadius: "8px", padding: "10px 14px",
    fontSize: "13px", color: "#ff7a8a", marginBottom: "14px",
  },
  form: { display: "flex", flexDirection: "column", gap: "12px" },
  input: {
    width: "100%", background: "#0d0f14",
    border: "1px solid #2a2f3e", borderRadius: "10px",
    padding: "12px 14px", color: "#e8eaf2",
    fontSize: "13px", outline: "none",
    fontFamily: "'DM Sans', sans-serif",
    transition: "border-color 0.15s", boxSizing: "border-box",
  },
  btnPrimary: {
    marginTop: "4px", width: "100%",
    background: "#4f7dff", border: "none",
    borderRadius: "10px", padding: "13px 16px",
    color: "#fff", fontSize: "13px", fontWeight: 600,
    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: "8px", transition: "opacity 0.15s",
  },
  toggleRow: { textAlign: "center", fontSize: "13px", color: "#6b7394", marginTop: "24px" },
  toggleBtn: {
    background: "none", border: "none", color: "#4f7dff",
    cursor: "pointer", fontSize: "13px",
    fontFamily: "'DM Sans', sans-serif", padding: 0,
  },
  footer: { textAlign: "center", fontSize: "11px", color: "#3d4460", marginTop: "20px", lineHeight: 1.7 },
};
