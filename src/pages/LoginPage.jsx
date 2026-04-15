// src/pages/LoginPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../firebase/AuthContext";

export default function LoginPage() {
  const { loginWithEmail, signupWithEmail, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await loginWithEmail(email, password);
      } else {
        await signupWithEmail(email, password);
      }
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d0f14]">
      <div className="w-full max-w-sm bg-[#161920] border border-[#2a2f3e] rounded-xl p-8">
        <div className="flex items-center gap-2 mb-8">
          <span className="w-2 h-2 rounded-full bg-[#4f7dff]" />
          <span className="font-semibold text-white tracking-tight">fintrack</span>
        </div>

        <h2 className="text-white text-lg font-medium mb-1">
          {mode === "login" ? "Sign in" : "Create account"}
        </h2>
        <p className="text-[#6b7394] text-sm mb-6">
          {mode === "login" ? "Welcome back." : "Start tracking your finances."}
        </p>

        {error && (
          <div className="bg-red-900/20 border border-red-800 text-red-400 text-sm rounded-lg px-4 py-2 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-[#1e2230] border border-[#2a2f3e] rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#4f7dff] placeholder:text-[#6b7394]"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-[#1e2230] border border-[#2a2f3e] rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#4f7dff] placeholder:text-[#6b7394]"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#4f7dff] text-white text-sm font-medium py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50 transition"
          >
            {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-[#2a2f3e]" />
          <span className="text-[#6b7394] text-xs">or</span>
          <div className="flex-1 h-px bg-[#2a2f3e]" />
        </div>

        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full bg-[#1e2230] border border-[#2a2f3e] text-white text-sm font-medium py-2.5 rounded-lg hover:border-[#4f7dff] disabled:opacity-50 transition"
        >
          Continue with Google
        </button>

        <p className="text-center text-[#6b7394] text-xs mt-6">
          {mode === "login" ? "No account? " : "Already have one? "}
          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="text-[#4f7dff] hover:underline"
          >
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
