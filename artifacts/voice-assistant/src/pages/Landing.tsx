import { useRef, useEffect } from "react";
import { Footer } from "@/components/Footer";

interface LandingProps {
  onStart: () => void;
  onSignIn: () => void;
}

export default function Landing({ onStart, onSignIn }: LandingProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(() => {});
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      fontFamily: "'Inter', system-ui, sans-serif",
      backgroundColor: "#000",
    }}>
      <div style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden", flexShrink: 0 }}>
        {/* Video background */}
        <video
          ref={videoRef}
          autoPlay muted loop playsInline
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        >
          <source src="/hero.mp4" type="video/mp4" />
        </video>

        {/* Overlay */}
        <div aria-hidden style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.30) 100%)",
          pointerEvents: "none",
        }} />

        {/* Header */}
        <header style={{
          position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 40px", height: 64,
        }}>
          <span style={{
            fontSize: 18, fontWeight: 600, letterSpacing: "-0.03em",
            color: "rgba(255,255,255,0.95)",
            textShadow: "0 1px 6px rgba(0,0,0,0.35)", userSelect: "none",
          }}>
            Lucy
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Sign in link */}
            <button
              onClick={onSignIn}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 500,
                fontFamily: "'Inter', system-ui, sans-serif",
                color: "rgba(255,255,255,0.65)",
                padding: "8px 4px",
                textShadow: "0 1px 4px rgba(0,0,0,0.30)",
                transition: "color 0.15s",
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.90)")}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.65)")}
            >
              Sign in
            </button>

            {/* Start / Get started button */}
            <button
              onClick={onStart}
              style={{
                padding: "9px 22px",
                fontSize: 14, fontWeight: 600,
                color: "#fff", backgroundColor: "#0A84FF",
                border: "none", borderRadius: 24,
                cursor: "pointer", letterSpacing: "-0.01em",
                fontFamily: "'Inter', system-ui, sans-serif",
                boxShadow: "0 2px 12px rgba(10,132,255,0.35)",
                transition: "background-color 0.15s, transform 0.1s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#0071EB";
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#0A84FF";
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
              }}
            >
              Get started
            </button>
          </div>
        </header>

        {/* Center tagline */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          textAlign: "center", padding: "0 24px", pointerEvents: "none",
        }}>
          <p style={{
            fontSize: "clamp(15px, 2vw, 18px)", fontWeight: 400,
            color: "rgba(255,255,255,0.80)", letterSpacing: "0.01em",
            textShadow: "0 1px 8px rgba(0,0,0,0.4)",
            margin: 0, maxWidth: 420, lineHeight: 1.5,
          }}>
            Your personal voice AI assistant
          </p>
        </div>

        {/* Scroll hint */}
        <div style={{
          position: "absolute", bottom: 32, left: "50%",
          transform: "translateX(-50%)",
          display: "flex", flexDirection: "column",
          alignItems: "center", gap: 6, pointerEvents: "none",
        }}>
          <span style={{
            fontSize: 11, color: "rgba(255,255,255,0.45)",
            letterSpacing: "0.06em", fontFamily: "'Inter', system-ui, sans-serif",
          }}>scroll</span>
          <div style={{ width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.25)" }} />
        </div>
      </div>

      <Footer />
    </div>
  );
}
