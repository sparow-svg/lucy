import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

type Tab = "signin" | "signup";

interface AuthModalProps {
  initialTab?: Tab;
  onClose: () => void;
  onSuccess: () => void;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  fontSize: 14,
  fontFamily: "'Inter', system-ui, sans-serif",
  backgroundColor: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8,
  color: "#fff",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 500,
  color: "rgba(255,255,255,0.55)",
  marginBottom: 6,
  fontFamily: "'Inter', system-ui, sans-serif",
  letterSpacing: "0.02em",
};

export function AuthModal({ initialTab = "signin", onClose, onSuccess }: AuthModalProps) {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [signInId, setSignInId] = useState("");
  const [signInPwd, setSignInPwd] = useState("");

  const [signUpName, setSignUpName] = useState("");
  const [signUpPwd, setSignUpPwd] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInId.trim() || !signInPwd) return;
    setError("");
    setIsLoading(true);
    try {
      await login(signInId.trim(), signInPwd);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpName.trim() || !signUpPwd) return;
    setError("");
    setIsLoading(true);
    try {
      await register(signUpName.trim(), signUpPwd, signUpEmail.trim() || undefined);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(8px)",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          margin: "0 16px",
          backgroundColor: "rgba(18,18,22,0.98)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 16,
          padding: "32px 28px",
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        {/* Wordmark */}
        <div style={{ marginBottom: 24, textAlign: "center" }}>
          <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.03em", color: "#fff" }}>
            Lucy
          </span>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex",
          backgroundColor: "rgba(255,255,255,0.05)",
          borderRadius: 8,
          padding: 3,
          marginBottom: 24,
          gap: 3,
        }}>
          {(["signin", "signup"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(""); }}
              style={{
                flex: 1,
                padding: "7px 0",
                fontSize: 13,
                fontWeight: 500,
                fontFamily: "'Inter', system-ui, sans-serif",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                transition: "all 0.15s",
                backgroundColor: tab === t ? "rgba(255,255,255,0.10)" : "transparent",
                color: tab === t ? "#fff" : "rgba(255,255,255,0.45)",
              }}
            >
              {t === "signin" ? "Sign in" : "Sign up"}
            </button>
          ))}
        </div>

        {/* Sign In Form */}
        {tab === "signin" && (
          <form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle}>Name or email</label>
              <input
                style={inputStyle}
                type="text"
                value={signInId}
                onChange={e => setSignInId(e.target.value)}
                placeholder="Your name or email"
                autoFocus
                disabled={isLoading}
              />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input
                style={inputStyle}
                type="password"
                value={signInPwd}
                onChange={e => setSignInPwd(e.target.value)}
                placeholder="Password"
                disabled={isLoading}
              />
            </div>
            {error && (
              <p style={{ fontSize: 13, color: "#ff6b6b", margin: 0 }}>{error}</p>
            )}
            <button
              type="submit"
              disabled={isLoading || !signInId.trim() || !signInPwd}
              style={{
                marginTop: 4,
                padding: "11px 0",
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "'Inter', system-ui, sans-serif",
                color: "#fff",
                backgroundColor: "#0A84FF",
                border: "none",
                borderRadius: 10,
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading || !signInId.trim() || !signInPwd ? 0.55 : 1,
                transition: "opacity 0.15s",
              }}
            >
              {isLoading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        )}

        {/* Sign Up Form */}
        {tab === "signup" && (
          <form onSubmit={handleSignUp} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle}>First name</label>
              <input
                style={inputStyle}
                type="text"
                value={signUpName}
                onChange={e => setSignUpName(e.target.value)}
                placeholder="Your first name"
                autoFocus
                disabled={isLoading}
              />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input
                style={inputStyle}
                type="password"
                value={signUpPwd}
                onChange={e => setSignUpPwd(e.target.value)}
                placeholder="Create a password"
                disabled={isLoading}
              />
            </div>
            <div>
              <label style={labelStyle}>Email <span style={{ color: "rgba(255,255,255,0.28)" }}>(optional)</span></label>
              <input
                style={inputStyle}
                type="email"
                value={signUpEmail}
                onChange={e => setSignUpEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={isLoading}
              />
            </div>
            {error && (
              <p style={{ fontSize: 13, color: "#ff6b6b", margin: 0 }}>{error}</p>
            )}
            <button
              type="submit"
              disabled={isLoading || !signUpName.trim() || !signUpPwd}
              style={{
                marginTop: 4,
                padding: "11px 0",
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "'Inter', system-ui, sans-serif",
                color: "#fff",
                backgroundColor: "#0A84FF",
                border: "none",
                borderRadius: 10,
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading || !signUpName.trim() || !signUpPwd ? 0.55 : 1,
                transition: "opacity 0.15s",
              }}
            >
              {isLoading ? "Creating account…" : "Create account"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
