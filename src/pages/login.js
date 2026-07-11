// src/pages/login.js
// Campus Connect — Premium Login Page
// Design: Stitch-inspired split-screen with glassmorphism (Electric Blue + Warm White)

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { signInWithCredential, GoogleAuthProvider } from "firebase/auth";
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

  // Load and initialize Google Identity Services (GIS)
  useEffect(() => {
    if (!auth) return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: "516141805560-cp4gj3udv2rkvu04uki9v7qdd6a4ceb4.apps.googleusercontent.com",
          callback: handleCredentialResponse,
        });

        // Render the official Google Button inside the container
        window.google.accounts.id.renderButton(
          document.getElementById("google-signin-btn-container"),
          {
            theme: "outline",
            size: "large",
            width: "340",
            text: "continue_with",
            shape: "pill",
          }
        );
      }
    };
    document.body.appendChild(script);

    return () => {
      // Clean up the script tag on unmount
      const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  const handleCredentialResponse = async (response) => {
    setSigningIn(true);
    setError("");
    try {
      const credential = GoogleAuthProvider.credential(response.credential);
      await signInWithCredential(auth, credential);
      router.replace("/");
    } catch (e) {
      console.error("Firebase sign in with credential failed:", e);
      setError(`Sign-in failed: [${e.code || "unknown_error"}] ${e.message}`);
      setSigningIn(false);
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
                UNIHOOD
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
            <div className="fade-up delay-2" style={{ display: "flex", justifyContent: "center", width: "100%", minHeight: 46 }}>
              {signingIn ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#0052ff", fontWeight: 600 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%",
                    border: "2.5px solid #0052ff30", borderTopColor: "#0052ff",
                    animation: "spin 0.7s linear infinite",
                  }} />
                  Signing in…
                </div>
              ) : (
                <div id="google-signin-btn-container" style={{ width: "100%", display: "flex", justifyContent: "center" }}></div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="fade-up" style={{
                marginTop: 14, padding: "12px 16px", borderRadius: 10,
                background: "#fff0f0", border: "1.5px solid #ffcdd2",
                color: "#c62828", fontSize: 13, fontWeight: 600,
              }}>
                ⚠️ {error}
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
