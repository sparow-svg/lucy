import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

type Tab = "signin" | "signup";

interface AuthModalProps {
  initialTab?: Tab;
  onClose: () => void;
  onSuccess: () => void;
}

const pill: React.CSSProperties = {
  borderRadius: 9999,
};

function SocialButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: "11px 0",
        fontSize: 14,
        fontWeight: 500,
        fontFamily: "'Inter', system-ui, sans-serif",
        color: "#222",
        backgroundColor: "#fff",
        border: "1.5px solid #e0e0e0",
        ...pill,
        cursor: "pointer",
        transition: "border-color 0.15s, background-color 0.15s",
        letterSpacing: "-0.01em",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#f5f5f5";
        (e.currentTarget as HTMLButtonElement).style.borderColor = "#bbb";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#fff";
        (e.currentTarget as HTMLButtonElement).style.borderColor = "#e0e0e0";
      }}
    >
      {icon}
      {label}
    </button>
  );
}

export function AuthModal({ initialTab = "signin", onClose, onSuccess }: AuthModalProps) {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);

  const [signInEmail, setSignInEmail] = useState("");
  const [signInPwd, setSignInPwd] = useState("");

  const [signUpName, setSignUpName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPwd, setSignUpPwd] = useState("");

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInEmail.trim() || !signInPwd) return;
    setError("");
    setIsLoading(true);
    try {
      await login(signInEmail.trim(), signInPwd);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpName.trim() || !signUpEmail.trim() || !signUpPwd) return;
    setError("");
    setIsLoading(true);
    try {
      await register(signUpName.trim(), signUpPwd, signUpEmail.trim());
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 20px",
    fontSize: 15,
    border: "1.5px solid #e0e0e0",
    ...pill,
    outline: "none",
    fontFamily: "'Inter', system-ui, sans-serif",
    color: "#111",
    backgroundColor: "#fafafa",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  };

  const primaryBtn: React.CSSProperties = {
    width: "100%",
    padding: "13px 0",
    fontSize: 15,
    fontWeight: 600,
    fontFamily: "'Inter', system-ui, sans-serif",
    color: "#fff",
    backgroundColor: "#0A84FF",
    border: "none",
    ...pill,
    cursor: "pointer",
    transition: "background-color 0.15s",
    letterSpacing: "-0.01em",
  };

  const signupReady = signUpName.trim() && signUpEmail.trim() && signUpPwd;
  const signinReady = signInEmail.trim() && signInPwd;

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
        className="auth-left-panel"
        style={{
          flex: "0 0 45%",
          position: "relative",
          overflow: "hidden",
          display: "none",
        }}
      >
        <img
          src="/onboarding-eye.jpeg"
          alt=""
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
          }}
        />
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to right, rgba(0,0,0,0) 60%, rgba(0,0,0,0.12) 100%)",
          pointerEvents: "none",
        }} />
        {/* Logo in same position/size as homepage header */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 64,
          display: "flex",
          alignItems: "center",
          padding: "0 40px",
        }}>
          <span style={{
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: "-0.03em",
            color: "rgba(255,255,255,0.95)",
            textShadow: "0 1px 6px rgba(0,0,0,0.35)",
            userSelect: "none",
            fontFamily: "'Inter', system-ui, sans-serif",
          }}>
            Lucy
          </span>
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
        {/* Logo — mobile + right-panel position matching homepage header */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 40px",
        }}>
          <span style={{
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: "-0.03em",
            color: "#111",
            userSelect: "none",
            fontFamily: "'Inter', system-ui, sans-serif",
          }}>
            Lucy
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              color: "#9b9b9b",
              fontFamily: "'Inter', system-ui, sans-serif",
              padding: 0,
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = "#333")}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = "#9b9b9b")}
          >
            ← Back
          </button>
        </div>

        <div style={{ width: "100%", maxWidth: 380 }}>
          {/* Headline — same as homepage tagline */}
          <p style={{
            fontSize: "clamp(15px, 2vw, 18px)",
            fontWeight: 400,
            color: "#888",
            letterSpacing: "0.01em",
            margin: "0 0 28px 0",
            lineHeight: 1.5,
            fontFamily: "'Inter', system-ui, sans-serif",
          }}>
            Your personal voice AI assistant
          </p>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 0, marginBottom: 28, borderBottom: "2px solid #f0f0f0" }}>
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
                  color: tab === t ? "#111" : "#aaa",
                  transition: "all 0.15s",
                  letterSpacing: "-0.01em",
                }}
              >
                {t === "signin" ? "Sign in" : "New"}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {tab === "signin" ? (
              <motion.div
                key="signin"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <input
                    style={inputStyle}
                    type="email"
                    value={signInEmail}
                    onChange={e => setSignInEmail(e.target.value)}
                    placeholder="Email address"
                    autoFocus
                    disabled={isLoading}
                    onFocus={e => (e.currentTarget.style.borderColor = "#0A84FF")}
                    onBlur={e => (e.currentTarget.style.borderColor = "#e0e0e0")}
                  />
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
                  {error && (
                    <p style={{ fontSize: 13, color: "#e53e3e", margin: 0, fontFamily: "'Inter', system-ui, sans-serif" }}>
                      {error}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={isLoading || !signinReady}
                    style={{
                      ...primaryBtn,
                      backgroundColor: isLoading || !signinReady ? "#bdbdbd" : "#0A84FF",
                      cursor: isLoading || !signinReady ? "not-allowed" : "pointer",
                    }}
                    onMouseEnter={e => {
                      if (!isLoading && signinReady)
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#0071EB";
                    }}
                    onMouseLeave={e => {
                      if (!isLoading && signinReady)
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#0A84FF";
                    }}
                  >
                    {isLoading ? "Signing in…" : "Sign in"}
                  </button>
                </form>

                <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
                  <div style={{ flex: 1, height: 1, backgroundColor: "#ebebeb" }} />
                  <span style={{ fontSize: 12, color: "#bbb", fontFamily: "'Inter', system-ui, sans-serif" }}>or</span>
                  <div style={{ flex: 1, height: 1, backgroundColor: "#ebebeb" }} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <SocialButton
                    icon={
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                        <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                        <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
                        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                      </svg>
                    }
                    label="Continue with Google"
                  />
                  <SocialButton
                    icon={
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                        <path d="M13.173 9.537c-.02-2.11 1.723-3.128 1.8-3.178-.983-1.437-2.512-1.634-3.055-1.655-1.3-.132-2.543.764-3.202.764-.659 0-1.672-.747-2.752-.727-1.41.02-2.716.82-3.444 2.086-1.471 2.55-.376 6.323 1.054 8.39.7 1.012 1.536 2.146 2.63 2.105 1.057-.042 1.456-.68 2.735-.68 1.279 0 1.637.68 2.754.659 1.138-.02 1.857-1.03 2.548-2.047.809-1.17 1.14-2.313 1.158-2.373-.025-.01-2.22-.855-2.226-3.344zM11.084 3.17c.577-.7.968-1.674.862-2.643-.833.034-1.845.556-2.443 1.256-.536.618-.007 1.607.806 2.051.764.418 1.712-.02 2.775-.664z"/>
                      </svg>
                    }
                    label="Continue with Apple"
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="signup"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <form onSubmit={handleSignUp} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <input
                    style={inputStyle}
                    type="text"
                    value={signUpName}
                    onChange={e => setSignUpName(e.target.value)}
                    placeholder="First name"
                    autoFocus
                    disabled={isLoading}
                    onFocus={e => (e.currentTarget.style.borderColor = "#0A84FF")}
                    onBlur={e => (e.currentTarget.style.borderColor = "#e0e0e0")}
                  />
                  <input
                    style={inputStyle}
                    type="email"
                    value={signUpEmail}
                    onChange={e => setSignUpEmail(e.target.value)}
                    placeholder="Email address"
                    disabled={isLoading}
                    onFocus={e => (e.currentTarget.style.borderColor = "#0A84FF")}
                    onBlur={e => (e.currentTarget.style.borderColor = "#e0e0e0")}
                  />
                  <input
                    style={inputStyle}
                    type="password"
                    value={signUpPwd}
                    onChange={e => setSignUpPwd(e.target.value)}
                    placeholder="Password"
                    disabled={isLoading}
                    onFocus={e => (e.currentTarget.style.borderColor = "#0A84FF")}
                    onBlur={e => (e.currentTarget.style.borderColor = "#e0e0e0")}
                  />
                  {error && (
                    <p style={{ fontSize: 13, color: "#e53e3e", margin: 0, fontFamily: "'Inter', system-ui, sans-serif" }}>
                      {error}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={isLoading || !signupReady}
                    style={{
                      ...primaryBtn,
                      backgroundColor: isLoading || !signupReady ? "#bdbdbd" : "#0A84FF",
                      cursor: isLoading || !signupReady ? "not-allowed" : "pointer",
                    }}
                    onMouseEnter={e => {
                      if (!isLoading && signupReady)
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#0071EB";
                    }}
                    onMouseLeave={e => {
                      if (!isLoading && signupReady)
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#0A84FF";
                    }}
                  >
                    {isLoading ? "Creating account…" : "Get started"}
                  </button>
                </form>

                <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
                  <div style={{ flex: 1, height: 1, backgroundColor: "#ebebeb" }} />
                  <span style={{ fontSize: 12, color: "#bbb", fontFamily: "'Inter', system-ui, sans-serif" }}>or</span>
                  <div style={{ flex: 1, height: 1, backgroundColor: "#ebebeb" }} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <SocialButton
                    icon={
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                        <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                        <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
                        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                      </svg>
                    }
                    label="Continue with Google"
                  />
                  <SocialButton
                    icon={
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                        <path d="M13.173 9.537c-.02-2.11 1.723-3.128 1.8-3.178-0.983-1.437-2.512-1.634-3.055-1.655-1.3-.132-2.543.764-3.202.764-.659 0-1.672-.747-2.752-.727-1.41.02-2.716.82-3.444 2.086-1.471 2.55-.376 6.323 1.054 8.39.7 1.012 1.536 2.146 2.63 2.105 1.057-.042 1.456-.68 2.735-.68 1.279 0 1.637.68 2.754.659 1.138-.02 1.857-1.03 2.548-2.047.809-1.17 1.14-2.313 1.158-2.373-.025-.01-2.22-.855-2.226-3.344zM11.084 3.17c.577-.7.968-1.674.862-2.643-.833.034-1.845.556-2.443 1.256-.536.618-.007 1.607.806 2.051.764.418 1.712-.02 2.775-.664z"/>
                      </svg>
                    }
                    label="Continue with Apple"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <style>{`
        @media (min-width: 640px) {
          .auth-left-panel {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
