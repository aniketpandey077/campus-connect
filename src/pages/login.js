// src/pages/login.js
// Campus Connect — Premium Login Page
// Design: Stitch-inspired split-screen with glassmorphism (Electric Blue + Warm White)

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { signInWithRedirect, getRedirectResult, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useAuth } from "../lib/useAuth";

export default function Login() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  // Detect if user returned from Google redirect but login failed
  useEffect(() => {
    if (!auth) return;
    getRedirectResult(auth).then((result) => {
      if (result) {
        sessionStorage.removeItem("unihood_signing_in");
      } else if (sessionStorage.getItem("unihood_signing_in")) {
        setError("Sign-in was not completed. Please try again.");
        sessionStorage.removeItem("unihood_signing_in");
      }
    }).catch((e) => {
      console.error("Redirect result error:", e);
      setError(`Sign-in failed: [${e.code || "unknown_error"}] ${e.message}`);
      sessionStorage.removeItem("unihood_signing_in");
    });
  }, []);

  const handleGoogleSignIn = async () => {
    if (!auth) {
      setError("Firebase is not initialized. Please verify your environment configuration.");
      return;
    }
    setSigningIn(true);
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      sessionStorage.setItem("unihood_signing_in", "true");
      await signInWithRedirect(auth, provider);
    } catch (e) {
      console.error("Google sign-in failed:", e);
      setError(`Sign-in failed: [${e.code || "unknown_error"}] ${e.message}`);
      setSigningIn(false);
      sessionStorage.removeItem("unihood_signing_in");
    }
  };

  if (loading || user) {
    return (
      <div style={{
        display: "flex", justifyContent: "center", alignItems: "center",
        minHeight: "100vh", background: "#0a0f1e",
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%",
            border: "3px solid #0052ff40",
            borderTopColor: "#0052ff",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 16px",
          }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <p style={{ color: "#64748b", fontSize: 14, fontWeight: 500 }}>Getting things ready…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', -apple-system, sans-serif; }

        .login-root {
          min-height: 100vh;
          display: flex;
          background: #fcf9f8;
        }

        /* ── Left panel (Bento Splash Previews) ── */
        .hero-panel {
          display: none;
          position: relative;
          overflow-y: auto;
          background-color: #f3f3f3;
          background-image: radial-gradient(#bcbcbc 1.5px, transparent 1.5px);
          background-size: 30px 30px;
          font-family: 'Montserrat', sans-serif;
          border-right: 3px solid #1b1b1b;
        }
        @media(min-width: 900px) {
          .hero-panel { display: flex; flex: 1; flex-direction: column; justify-content: center; padding: 40px; }
        }

        .preview-bento {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 16px;
          width: 100%;
          max-width: 480px;
          margin: 0 auto;
        }

        .preview-tile {
          border: 3px solid #1b1b1b;
          box-shadow: 4px 4px 0px 0px #1b1b1b;
          padding: 18px;
          position: relative;
          overflow: hidden;
          background: #fff;
          color: #1b1b1b;
        }

        .preview-tile-main {
          grid-column: span 6;
          background: #bdff00;
          padding: 24px;
          box-shadow: 6px 6px 0px 0px #1b1b1b;
        }

        .preview-tile-pulse {
          grid-column: span 3;
          background: #ecdcff;
        }

        .preview-tile-verified {
          grid-column: span 3;
          background: #ffb2bf;
        }

        .preview-tile-card {
          grid-column: span 6;
          background: #ffffff;
        }

        /* Pulse wave animation */
        @keyframes pulse-wave {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(1.6); }
        }
        .wave-bar {
          display: inline-block;
          width: 4px;
          height: 16px;
          background: #1b1b1b;
          margin-right: 3px;
          animation: pulse-wave 1s ease-in-out infinite;
        }

        .tag-chip {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 4px;
          border: 1.5px solid #1b1b1b;
          font-size: 11px;
          font-weight: 850;
          box-shadow: 1px 1px 0px 0px #1b1b1b;
          margin-right: 6px;
          margin-top: 4px;
        }

        /* ── Right panel ── */
        .form-panel {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 40px 24px;
          background: #fcf9f8;
          width: 100%;
        }
        @media(min-width: 900px) {
          .form-panel { width: 480px; flex-shrink: 0; padding: 60px 56px; }
        }

        .form-inner { width: 100%; max-width: 400px; }

        /* Google button */
        .google-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 14px 20px;
          border-radius: 12px;
          border: 1.5px solid #e0dcd6;
          background: #fff;
          color: #1c1b1b;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.18s ease;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
          position: relative;
          overflow: hidden;
        }
        .google-btn::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(135deg, #f8f7ff, #fff);
          opacity: 0;
          transition: opacity 0.2s;
        }
        .google-btn:hover::before { opacity: 1; }
        .google-btn:hover {
          border-color: #0052ff;
          box-shadow: 0 0 0 3px rgba(0,82,255,0.1), 0 4px 16px rgba(0,0,0,0.08);
          transform: translateY(-1px);
        }
        .google-btn:active { transform: translateY(0); }
        .google-btn:disabled {
          opacity: 0.7;
          cursor: wait;
          transform: none;
        }

        /* Divider */
        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 28px 0;
          color: #9aa0ab;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .divider::before, .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e8e5e1;
        }

        /* Feature chips */
        .feature-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 24px;
          justify-content: center;
        }
        .feature-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 12px;
          border-radius: 999px;
          background: #f0edec;
          font-size: 12px;
          font-weight: 600;
          color: #434656;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.5s cubic-bezier(.22,1,.36,1) both; }
        .delay-1 { animation-delay: 0.05s; }
        .delay-2 { animation-delay: 0.10s; }
        .delay-3 { animation-delay: 0.15s; }
        .delay-4 { animation-delay: 0.20s; }
        .delay-5 { animation-delay: 0.25s; }
      `}</style>

      <div className="login-root">

        {/* ── Left Hero Panel (Bento Splash Previews) ── */}
        <div className="hero-panel">
          <div className="preview-bento">
            
            {/* Main Branding Card */}
            <div className="preview-tile preview-tile-main">
              <span style={{
                fontSize: "10px", fontWeight: 900, background: "#1b1b1b", color: "#bdff00",
                padding: "4px 8px", textTransform: "uppercase", letterSpacing: "0.1em",
                display: "inline-block", marginBottom: "12px"
              }}>
                VERSION 2.0
              </span>
              <h1 style={{
                margin: 0, fontSize: "36px", fontWeight: 900,
                color: "#1b1b1b", lineHeight: "1.0", letterSpacing: "-0.04em",
                fontStyle: "italic", fontFamily: "Montserrat"
              }}>
                CAMPUS<br/>CONNECT
              </h1>
              <p style={{
                margin: "12px 0 0", fontSize: "13px", fontWeight: 800,
                color: "#1b1b1b", lineHeight: "1.4"
              }}>
                THE EXCLUSIVE LPU SOCIAL NETWORK. DODGE THE SECURITY GUARDS ON CYCLES, KEEP YOUR UMS ATTENDANCE ABOVE 75%, AND FIND YOUR CAMPUS CREW.
              </p>
            </div>

            {/* Pulse Card */}
            <div className="preview-tile preview-tile-pulse" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", fontWeight: 900 }}>CAMPUS PULSE</span>
                <span>⚡</span>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", height: "24px", marginTop: "12px" }}>
                <span className="wave-bar" style={{ animationDelay: "0.1s", height: "12px" }} />
                <span className="wave-bar" style={{ animationDelay: "0.3s", height: "20px" }} />
                <span className="wave-bar" style={{ animationDelay: "0.2s", height: "16px" }} />
                <span className="wave-bar" style={{ animationDelay: "0.5s", height: "24px" }} />
                <span className="wave-bar" style={{ animationDelay: "0.4s", height: "14px" }} />
              </div>
            </div>

            {/* Verified Card */}
            <div className="preview-tile preview-tile-verified" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", fontWeight: 900 }}>VERIFIED</span>
                <span>🛡️</span>
              </div>
              <p style={{ margin: "12px 0 0", fontSize: "10px", fontWeight: 900, lineHeight: "1.3" }}>
                100% REAL STUDENTS. .EDU EMAIL REQUIRED.
              </p>
            </div>

            {/* Mock Profile Preview Card */}
            <div className="preview-tile preview-tile-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <span style={{ fontSize: "9px", fontWeight: 900, background: "#7531d3", color: "#fff", padding: "2px 6px" }}>
                  SWIPE PREVIEW
                </span>
                <span style={{ fontSize: "14px" }}>🔥</span>
              </div>

              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <div style={{
                  width: "44px", height: "44px", borderRadius: "50%",
                  border: "2.5px solid #1b1b1b", background: "#ffd9de",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "22px", flexShrink: 0
                }}>
                  👑
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "13px", fontWeight: 900 }}>ANANYA · CSE</h3>
                  <p style={{ margin: "2px 0 0", fontSize: "10px", fontWeight: 700, color: "#555" }}>
                    3RD YEAR · HOSTEL
                  </p>
                </div>
              </div>

              <div style={{ marginTop: "12px" }}>
                <span className="tag-chip" style={{ background: "#ffd9de" }}>NIGHT OWL 🦉</span>
                <span className="tag-chip" style={{ background: "#ecdcff" }}>GAMING 🎮</span>
                <span className="tag-chip" style={{ background: "#eeeeee" }}>CANTEEN 📍</span>
              </div>
            </div>

          </div>
        </div>

        {/* ── Right Form Panel ── */}
        <div className="form-panel">
          <div className="form-inner">

            {/* Mobile logo */}
            <div className="fade-up" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 36, justifyContent: "center" }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "#0052ff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18,
              }}>🔥</div>
              <span style={{ fontWeight: 900, fontSize: 16, color: "#111" }}>Unihood</span>
            </div>

            {/* Heading */}
            <div className="fade-up delay-1" style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 28, fontWeight: 800, color: "#1c1b1b", letterSpacing: -0.5, lineHeight: 1.2 }}>
                Welcome back 👋
              </h2>
              <p style={{ marginTop: 8, fontSize: 15, color: "#737688", lineHeight: 1.5, fontWeight: 400 }}>
                Sign in with your Google account to start swiping. UMS attendance checks not required to log in! 😉
              </p>
            </div>

            {/* Google sign-in */}
            <div className="fade-up delay-2">
              <button
                id="google-signin-btn"
                className="google-btn"
                onClick={handleGoogleSignIn}
                disabled={signingIn}
              >
                <svg width="20" height="20" viewBox="0 0 48 48" style={{ position: "relative", zIndex: 1 }}>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.56 2.95-2.24 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                <span style={{ position: "relative", zIndex: 1 }}>
                  {signingIn ? "Signing in…" : "Continue with Google"}
                </span>
                {signingIn && (
                  <div style={{
                    width: 16, height: 16, borderRadius: "50%",
                    border: "2px solid #0052ff30", borderTopColor: "#0052ff",
                    animation: "spin 0.7s linear infinite",
                    position: "relative", zIndex: 1,
                  }} />
                )}
              </button>
            </div>

            {/* Error + Troubleshooting */}
            {error && (
              <div className="fade-up" style={{
                marginTop: 14, padding: "16px 18px", borderRadius: 12,
                background: "#fffbeb", border: "2px solid #f59e0b",
                color: "#78350f", fontSize: 13, fontWeight: 500,
                lineHeight: 1.7,
              }}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8, color: "#92400e" }}>
                  ⚠️ Sign-in not working?
                </div>
                <div style={{ marginBottom: 10, fontSize: 12.5, color: "#78350f" }}>
                  Your browser or ad-blocker might be blocking sign-in cookies. Try these fixes:
                </div>
                <div style={{ fontSize: 12, color: "#92400e", lineHeight: 1.8 }}>
                  <div style={{ marginBottom: 6 }}>
                    <strong>Chrome / Edge:</strong> Click the 🔒 icon in the address bar → Site Settings → Allow Cookies.
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <strong>Safari (iPhone/Mac):</strong> Settings → Safari → Turn OFF "Prevent Cross-Site Tracking".
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <strong>Brave:</strong> Click the 🛡️ Shields icon in the address bar → Turn Shields DOWN for this site.
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <strong>Ad-Blocker:</strong> Temporarily pause uBlock / AdBlock on this page and retry.
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <strong>Incognito Mode:</strong> Try using a normal (non-incognito) browser window.
                  </div>
                </div>
                <button
                  onClick={() => { setError(""); handleGoogleSignIn(); }}
                  style={{
                    marginTop: 10, padding: "8px 20px", borderRadius: 8,
                    background: "#f59e0b", color: "#fff", border: "none",
                    fontWeight: 700, fontSize: 13, cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  🔄 Retry Sign-In
                </button>
              </div>
            )}

            {/* Divider */}
            <div className="divider fade-up delay-3">LPU campus. Your rules.</div>

            {/* Feature chips */}
            <div className="feature-row fade-up delay-4">
              {["🔒 No Security Guards", "🎓 Block 35 Approved", "💬 Canteen Tea Talk", "🆓 Faster than Wi-Fi"].map(f => (
                <span key={f} className="feature-chip">{f}</span>
              ))}
            </div>

            {/* Footer note */}
            <p className="fade-up delay-5" style={{
              marginTop: 32, textAlign: "center",
              fontSize: 12, color: "#9aa0ab", lineHeight: 1.6,
            }}>
              By signing in, you agree to our{" "}
              <span style={{ color: "#0052ff", fontWeight: 600, cursor: "pointer" }}>Terms</span>
              {" "}and{" "}
              <span style={{ color: "#0052ff", fontWeight: 600, cursor: "pointer" }}>Privacy Policy</span>.
            </p>
          </div>
        </div>

      </div>
    </>
  );
}
