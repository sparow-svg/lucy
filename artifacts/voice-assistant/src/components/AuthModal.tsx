import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

type Tab = "signin" | "signup";

interface AuthModalProps {
  initialTab?: Tab;
  onClose: () => void;
  onSuccess: () => void;
}

export function AuthModal({ initialTab = "signin", onClose, onSuccess }: AuthModalProps) {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);

  const [signInId, setSignInId] = useState("");
  const [signInPwd, setSignInPwd] = useState("");

  const [signUpName, setSignUpName] = useState("");
  const [signUpPwd, setSignUpPwd] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

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

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 16px",
    fontSize: 15,
    border: "1.5px solid #e0e0e0",
    borderRadius: 10,
    outline: "none",
    fontFamily: "'Inter', system-ui, sans-serif",
    color: "#111",
    backgroundColor: "#fafafa",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 13,
    fontWeight: 500,
    color: "#4a4a4a",
    marginBottom: 8,
    fontFamily: "'Inter', system-ui, sans-serif",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.3s ease",
      }}
    >
      {/* Left panel — eye image */}
      <div
        style={{
          flex: "0 0 45%",
          position: "relative",
          overflow: "hidden",
          display: "none",
        }}
        className="auth-left-panel"
      >
        <img
          src="/onboarding-eye.jpeg"
          alt=""
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to right, rgba(0,0,0,0) 60%, rgba(0,0,0,0.12) 100%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 32,
            left: 40,
            fontSize: 20,
            fontWeight: 600,
            color: "rgba(255,255,255,0.92)",
            letterSpacing: "-0.03em",
            fontFamily: "'Inter', system-ui, sans-serif",
            textShadow: "0 1px 6px rgba(0,0,0,0.5)",
            userSelect: "none",
          }}
        >
          Lucy
        </div>
      </div>

      {/* Right panel — white form */}
      <div
        style={{
          flex: 1,
          backgroundColor: "#fff",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "48px 40px",
          overflowY: "auto",
          position: "relative",
        }}
      >
        {/* Back / close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 28,
            left: 32,
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            color: "#9b9b9b",
            fontFamily: "'Inter', system-ui, sans-serif",
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: 0,
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = "#1a1a1a")}
          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = "#9b9b9b")}
        >
          ← Back
        </button>

        {/* Mobile-only Lucy wordmark */}
        <div
          className="auth-mobile-logo"
          style={{
            position: "absolute",
            top: 28,
            right: 32,
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: "-0.03em",
            color: "#111",
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          Lucy
        </div>

        <div style={{ width: "100%", maxWidth: 380 }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 0, marginBottom: 32, borderBottom: "2px solid #f0f0f0" }}>
            {(["signin", "signup"] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(""); }}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  fontSize: 14,
                  fontWeight: tab === t ? 600 : 400,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  border: "none",
                  borderBottom: `2px solid ${tab === t ? "#111" : "transparent"}`,
                  marginBottom: -2,
                  background: "none",
                  cursor: "pointer",
                  color: tab === t ? "#111" : "#9b9b9b",
                  transition: "all 0.15s",
                  letterSpacing: "-0.01em",
                }}
              >
                {t === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {tab === "signin" ? (
              <motion.form
                key="signin"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                onSubmit={handleSignIn}
                style={{ display: "flex", flexDirection: "column", gap: 20 }}
              >
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
                    onFocus={e => (e.currentTarget.style.borderColor = "#0A84FF")}
                    onBlur={e => (e.currentTarget.style.borderColor = "#e0e0e0")}
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
                    onFocus={e => (e.currentTarget.style.borderColor = "#0A84FF")}
                    onBlur={e => (e.currentTarget.style.borderColor = "#e0e0e0")}
                  />
                </div>
                {error && (
                  <p style={{ fontSize: 13, color: "#e53e3e", margin: 0, fontFamily: "'Inter', system-ui, sans-serif" }}>
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={isLoading || !signInId.trim() || !signInPwd}
                  style={{
                    marginTop: 4,
                    padding: "14px 0",
                    fontSize: 15,
                    fontWeight: 600,
                    fontFamily: "'Inter', system-ui, sans-serif",
                    color: "#fff",
                    backgroundColor: isLoading || !signInId.trim() || !signInPwd ? "#bdbdbd" : "#0A84FF",
                    border: "none",
                    borderRadius: 12,
                    cursor: isLoading || !signInId.trim() || !signInPwd ? "not-allowed" : "pointer",
                    transition: "background-color 0.15s",
                    letterSpacing: "-0.01em",
                  }}
                  onMouseEnter={e => {
                    if (!isLoading && signInId.trim() && signInPwd)
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#0071EB";
                  }}
                  onMouseLeave={e => {
                    if (!isLoading && signInId.trim() && signInPwd)
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#0A84FF";
                  }}
                >
                  {isLoading ? "Signing in…" : "Sign in"}
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="signup"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                onSubmit={handleSignUp}
                style={{ display: "flex", flexDirection: "column", gap: 20 }}
              >
                <div>
                  <label style={labelStyle}>What should Lucy call you?</label>
                  <input
                    style={inputStyle}
                    type="text"
                    value={signUpName}
                    onChange={e => setSignUpName(e.target.value)}
                    placeholder="Your first name"
                    autoFocus
                    disabled={isLoading}
                    onFocus={e => (e.currentTarget.style.borderColor = "#0A84FF")}
                    onBlur={e => (e.currentTarget.style.borderColor = "#e0e0e0")}
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
                    onFocus={e => (e.currentTarget.style.borderColor = "#0A84FF")}
                    onBlur={e => (e.currentTarget.style.borderColor = "#e0e0e0")}
                  />
                </div>
                <div>
                  <label style={labelStyle}>
                    Email{" "}
                    <span style={{ color: "#9b9b9b", fontWeight: 400 }}>(optional)</span>
                  </label>
                  <input
                    style={inputStyle}
                    type="email"
                    value={signUpEmail}
                    onChange={e => setSignUpEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled={isLoading}
                    onFocus={e => (e.currentTarget.style.borderColor = "#0A84FF")}
                    onBlur={e => (e.currentTarget.style.borderColor = "#e0e0e0")}
                  />
                </div>
                {error && (
                  <p style={{ fontSize: 13, color: "#e53e3e", margin: 0, fontFamily: "'Inter', system-ui, sans-serif" }}>
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={isLoading || !signUpName.trim() || !signUpPwd}
                  style={{
                    marginTop: 4,
                    padding: "14px 0",
                    fontSize: 15,
                    fontWeight: 600,
                    fontFamily: "'Inter', system-ui, sans-serif",
                    color: "#fff",
                    backgroundColor: isLoading || !signUpName.trim() || !signUpPwd ? "#bdbdbd" : "#0A84FF",
                    border: "none",
                    borderRadius: 12,
                    cursor: isLoading || !signUpName.trim() || !signUpPwd ? "not-allowed" : "pointer",
                    transition: "background-color 0.15s",
                    letterSpacing: "-0.01em",
                  }}
                  onMouseEnter={e => {
                    if (!isLoading && signUpName.trim() && signUpPwd)
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#0071EB";
                  }}
                  onMouseLeave={e => {
                    if (!isLoading && signUpName.trim() && signUpPwd)
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#0A84FF";
                  }}
                >
                  {isLoading ? "Creating account…" : "Get started"}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>

      <style>{`
        @media (min-width: 640px) {
          .auth-left-panel {
            display: block !important;
          }
          .auth-mobile-logo {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
