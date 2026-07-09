// src/pages/login.js
// Campus Connect — Premium Login Page
// Design: Stitch-inspired split-screen with glassmorphism (Electric Blue + Warm White)

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
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

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.replace("/");
    } catch (e) {
      console.error("Google sign-in failed:", e);
      setError("Sign-in failed. Please try again.");
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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', -apple-system, sans-serif; }

        .login-root {
          min-height: 100vh;
          display: flex;
          background: #fcf9f8;
        }

        /* ── Left panel ── */
        .hero-panel {
          display: none;
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #001452 0%, #003ec7 50%, #0052ff 100%);
        }
        @media(min-width: 900px) {
          .hero-panel { display: flex; flex: 1; flex-direction: column; justify-content: center; padding: 60px 56px; }
        }

        .hero-blur-1 {
          position: absolute; top: -80px; right: -80px;
          width: 320px; height: 320px; border-radius: 50%;
          background: #0052ff; opacity: 0.25; filter: blur(80px);
        }
        .hero-blur-2 {
          position: absolute; bottom: -60px; left: -60px;
          width: 240px; height: 240px; border-radius: 50%;
          background: #b7c4ff; opacity: 0.15; filter: blur(60px);
        }

        .glass-card {
          background: rgba(255,255,255,0.08);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 16px;
          padding: 20px 22px;
          margin-top: 36px;
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .stat-row {
          display: flex;
          gap: 24px;
          margin-top: 40px;
        }
        .stat-item {
          text-align: center;
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

        {/* ── Left Hero Panel ── */}
        <div className="hero-panel">
          <div className="hero-blur-1" />
          <div className="hero-blur-2" />

          {/* Logo */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 52 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: "rgba(255,255,255,0.15)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20,
              }}>🔥</div>
              <span style={{ fontWeight: 800, fontSize: 16, color: "#fff", letterSpacing: -0.2 }}>Campus Connect</span>
            </div>

            {/* Headline */}
            <h1 style={{
              fontSize: 44, fontWeight: 900, color: "#fff",
              lineHeight: 1.1, letterSpacing: -1.5, maxWidth: 420,
            }}>
              Find your people.<br />
              <span style={{ color: "#b7c4ff" }}>Own your campus.</span>
            </h1>

            <p style={{
              marginTop: 18, fontSize: 16, color: "rgba(255,255,255,0.7)",
              lineHeight: 1.7, maxWidth: 380, fontWeight: 400,
            }}>
              Swipe, match, and connect with real students from your university. No bots. Just your campus squad.
            </p>

            {/* Glass badge */}
            <div className="glass-card">
              <div style={{
                width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                background: "rgba(183,196,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20,
              }}>🛡️</div>
              <div>
                <p style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Verified Students Only</p>
                <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, marginTop: 2 }}>
                  ID-verified profiles. Your campus, your community.
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="stat-row">
              {[
                { v: "100%", l: "Real Students" },
                { v: "Private", l: "Your Data" },
                { v: "Free", l: "Forever" },
              ].map(s => (
                <div key={s.l} className="stat-item">
                  <p style={{ color: "#fff", fontWeight: 800, fontSize: 22 }}>{s.v}</p>
                  <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 600, marginTop: 2 }}>{s.l}</p>
                </div>
              ))}
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
              <span style={{ fontWeight: 900, fontSize: 16, color: "#111" }}>Campus Connect</span>
            </div>

            {/* Heading */}
            <div className="fade-up delay-1" style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 28, fontWeight: 800, color: "#1c1b1b", letterSpacing: -0.5, lineHeight: 1.2 }}>
                Welcome back 👋
              </h2>
              <p style={{ marginTop: 8, fontSize: 15, color: "#737688", lineHeight: 1.5, fontWeight: 400 }}>
                Sign in with your Google account to get started.
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
            <div className="divider fade-up delay-3">Your campus. Your rules.</div>

            {/* Feature chips */}
            <div className="feature-row fade-up delay-4">
              {["🔒 Private", "🎓 Students Only", "💬 Real Matches", "🆓 Free"].map(f => (
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
