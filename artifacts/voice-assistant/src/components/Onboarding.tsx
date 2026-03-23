import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface OnboardingProps {
  onComplete: (firstName: string) => void;
  onBack: () => void;
}

export function Onboarding({ onComplete, onBack }: OnboardingProps) {
  const [firstName, setFirstName] = useState("");
  const [calendarLinked, setCalendarLinked] = useState(false);
  const [step, setStep] = useState<"form" | "ready">("form");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Small delay so the enter animation is visible
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = firstName.trim();
    if (!name) return;
    setStep("ready");
  };

  const handleStart = () => {
    onComplete(firstName.trim());
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.35s ease",
      }}
    >
      {/* Left panel — eye image */}
      <div
        style={{
          flex: "0 0 45%",
          position: "relative",
          overflow: "hidden",
          display: "none", // hidden on small screens, shown via inline media below
        }}
        className="onboarding-left"
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
        {/* Subtle dark vignette on right edge to blend into white panel */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to right, rgba(0,0,0,0) 60%, rgba(0,0,0,0.15) 100%)",
            pointerEvents: "none",
          }}
        />
        {/* Lucy wordmark overlaid */}
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
        {/* Back button (top-left of right panel) */}
        <button
          onClick={onBack}
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
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.color = "#1a1a1a")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.color = "#9b9b9b")
          }
        >
          ← Back
        </button>

        <div style={{ width: "100%", maxWidth: 380 }}>

          <AnimatePresence mode="wait">
            {step === "form" ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
              >
                <h1
                  style={{
                    fontSize: 28,
                    fontWeight: 600,
                    letterSpacing: "-0.03em",
                    color: "#111",
                    margin: "0 0 8px 0",
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                >
                  Welcome to Lucy
                </h1>
                <p
                  style={{
                    fontSize: 15,
                    color: "#6b6b6b",
                    marginBottom: 36,
                    lineHeight: 1.5,
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                >
                  Your personal voice AI assistant. Let's get you set up.
                </p>

                <form onSubmit={handleSubmit}>
                  {/* First name */}
                  <div style={{ marginBottom: 24 }}>
                    <label
                      htmlFor="firstName"
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 500,
                        color: "#4a4a4a",
                        marginBottom: 8,
                        fontFamily: "'Inter', system-ui, sans-serif",
                      }}
                    >
                      What should Lucy call you?
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Your first name"
                      autoFocus
                      maxLength={40}
                      style={{
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
                      }}
                      onFocus={(e) =>
                        (e.currentTarget.style.borderColor = "#0A84FF")
                      }
                      onBlur={(e) =>
                        (e.currentTarget.style.borderColor = "#e0e0e0")
                      }
                    />
                  </div>

                  {/* Optional: calendar */}
                  <div
                    style={{
                      marginBottom: 32,
                      padding: "14px 16px",
                      border: "1.5px solid #e0e0e0",
                      borderRadius: 10,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => setCalendarLinked((v) => !v)}
                  >
                    <div>
                      <p
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: "#1a1a1a",
                          margin: 0,
                          fontFamily: "'Inter', system-ui, sans-serif",
                        }}
                      >
                        Connect calendar & tasks
                      </p>
                      <p
                        style={{
                          fontSize: 12,
                          color: "#9b9b9b",
                          margin: "3px 0 0",
                          fontFamily: "'Inter', system-ui, sans-serif",
                        }}
                      >
                        Optional — you can do this later
                      </p>
                    </div>
                    {/* Toggle */}
                    <div
                      style={{
                        width: 40,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: calendarLinked ? "#0A84FF" : "#d4d4d4",
                        position: "relative",
                        flexShrink: 0,
                        transition: "background-color 0.2s",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: 3,
                          left: calendarLinked ? 19 : 3,
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          backgroundColor: "#fff",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                          transition: "left 0.2s",
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!firstName.trim()}
                    style={{
                      width: "100%",
                      padding: "14px 0",
                      fontSize: 15,
                      fontWeight: 600,
                      color: "#fff",
                      backgroundColor: firstName.trim() ? "#0A84FF" : "#bdbdbd",
                      border: "none",
                      borderRadius: 12,
                      cursor: firstName.trim() ? "pointer" : "not-allowed",
                      fontFamily: "'Inter', system-ui, sans-serif",
                      letterSpacing: "-0.01em",
                      transition: "background-color 0.15s, transform 0.1s",
                    }}
                    onMouseEnter={(e) => {
                      if (firstName.trim())
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                          "#0071EB";
                    }}
                    onMouseLeave={(e) => {
                      if (firstName.trim())
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                          "#0A84FF";
                    }}
                  >
                    Continue
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="ready"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
                style={{ textAlign: "center" }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    backgroundColor: "#0A84FF",
                    margin: "0 auto 24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>

                <h2
                  style={{
                    fontSize: 26,
                    fontWeight: 600,
                    letterSpacing: "-0.03em",
                    color: "#111",
                    margin: "0 0 10px 0",
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                >
                  Ready, {firstName.trim()}?
                </h2>

                <p
                  style={{
                    fontSize: 15,
                    color: "#6b6b6b",
                    marginBottom: 36,
                    lineHeight: 1.6,
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                >
                  Lucy will ask for microphone access, then greet you.
                  <br />
                  Just say{" "}
                  <strong style={{ color: "#111" }}>"Lucy"</strong> anytime to
                  start talking.
                </p>

                <button
                  onClick={handleStart}
                  style={{
                    width: "100%",
                    padding: "14px 0",
                    fontSize: 15,
                    fontWeight: 600,
                    color: "#fff",
                    backgroundColor: "#0A84FF",
                    border: "none",
                    borderRadius: 12,
                    cursor: "pointer",
                    fontFamily: "'Inter', system-ui, sans-serif",
                    letterSpacing: "-0.01em",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.backgroundColor =
                      "#0071EB")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.backgroundColor =
                      "#0A84FF")
                  }
                >
                  Start with Lucy
                </button>

                <button
                  onClick={() => setStep("form")}
                  style={{
                    marginTop: 14,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 13,
                    color: "#9b9b9b",
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.color = "#1a1a1a")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.color = "#9b9b9b")
                  }
                >
                  ← Edit name
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Inline CSS for responsive left panel */}
      <style>{`
        @media (min-width: 640px) {
          .onboarding-left {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
