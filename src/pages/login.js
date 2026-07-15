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
    if (!auth || loading || user) return;

    const initializeAndRender = () => {
      const container = document.getElementById("google-signin-btn-container");
      if (window.google?.accounts?.id && container) {
        window.google.accounts.id.initialize({
          client_id: "516141805560-cp4gj3udv2rkvu04uki9v7qdd6a4ceb4.apps.googleusercontent.com",
          callback: handleCredentialResponse,
        });

        // Render the official Google Button inside the container
        window.google.accounts.id.renderButton(
          container,
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

    // If the Google SDK is already loaded in window, initialize and render immediately
    if (window.google?.accounts?.id) {
      initializeAndRender();
      return;
    }

    // Otherwise, append the script tag dynamically
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initializeAndRender;
    document.body.appendChild(script);

    return () => {
      // Clean up the script tag on unmount
      const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [loading, user]);

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
          background: transparent;
          position: relative;
          z-index: 2;
        }

        /* Full Screen Background Orbit System */
        .fullscreen-orbit-bg {
          position: fixed;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at 50% 50%, #ffffff 0%, #f5f4f0 100%);
        }

        .bg-orbit-1 {
          position: absolute;
          width: 540px;
          height: 540px;
          border: 2px dashed rgba(27, 27, 27, 0.06);
          border-radius: 50%;
          animation: orbit-spin-cw 45s linear infinite;
        }

        .bg-orbit-2 {
          position: absolute;
          width: 960px;
          height: 960px;
          border: 2px dashed rgba(27, 27, 27, 0.05);
          border-radius: 50%;
          animation: orbit-spin-ccw 75s linear infinite;
        }

        .bg-orbit-3 {
          position: absolute;
          width: 1400px;
          height: 1400px;
          border: 2px dashed rgba(27, 27, 27, 0.04);
          border-radius: 50%;
          animation: orbit-spin-cw 110s linear infinite;
        }

        .bg-orbit-node {
          position: absolute;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: rgba(255, 255, 255, 0.95);
          border: 2.5px solid #1b1b1b;
          border-radius: 99px;
          box-shadow: 4px 4px 0px 0px #1b1b1b;
          font-family: 'Montserrat', sans-serif;
          font-size: 11px;
          font-weight: 900;
          color: #1b1b1b;
          white-space: nowrap;
          pointer-events: auto; /* hoverable */
          transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), background 0.2s, box-shadow 0.2s;
        }

        .bg-orbit-node:hover {
          background: #bdff00;
          transform: scale(1.12) !important;
          box-shadow: 6px 6px 0px 0px #1b1b1b;
          z-index: 100;
        }

        .avatar-bubble {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 1.5px solid #1b1b1b;
          background: #f0edec;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
        }

        /* Inner Ring Nodes */
        .bg-node-a { top: -14px; left: 256px; animation: orbit-counter-spin 45s linear infinite; }
        .bg-node-b { bottom: -14px; left: 256px; animation: orbit-counter-spin 45s linear infinite; }

        /* Middle Ring Nodes */
        .bg-node-c { top: 466px; left: -14px; animation: orbit-clockwise-spin 75s linear infinite; }
        .bg-node-d { top: 466px; right: -14px; animation: orbit-clockwise-spin 75s linear infinite; }

        /* Outer Ring Nodes */
        .bg-node-e { top: -14px; left: 686px; animation: orbit-counter-spin 110s linear infinite; }
        .bg-node-f { bottom: -14px; left: 686px; animation: orbit-counter-spin 110s linear infinite; }

        /* ── Left panel (Bento Splash Previews) ── */
        .hero-panel {
          display: none;
          position: relative;
          overflow-y: auto;
          background-color: transparent;
          background-image: radial-gradient(#bcbcbc 1.5px, transparent 1.5px);
          background-size: 30px 30px;
          font-family: 'Montserrat', sans-serif;
          border-right: 3px solid #1b1b1b;
          z-index: 5;
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
          transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s ease;
        }
        .preview-tile:hover {
          transform: translate(-4px, -4px);
          box-shadow: 8px 8px 0px 0px #1b1b1b;
        }

        .preview-tile-main {
          grid-column: span 6;
          background: #bdff00;
          padding: 24px;
          box-shadow: 6px 6px 0px 0px #1b1b1b;
        }
        .preview-tile-main:hover {
          transform: translate(-6px, -6px);
          box-shadow: 12px 12px 0px 0px #1b1b1b;
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

        /* Revolving Friends Orbit Card */
        .preview-tile-orbit {
          grid-column: span 6;
          background: #0f111a !important; /* Sleek dark theme */
          color: #fff;
          padding: 16px;
          height: 250px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
        }

        .orbit-system {
          position: relative;
          width: 100%;
          height: 160px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 5px;
        }

        .orbit-core {
          position: absolute;
          width: 44px;
          height: 44px;
          background: #bdff00;
          border: 3px solid #1b1b1b;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 5;
          box-shadow: 0 0 20px rgba(189, 255, 0, 0.4);
          animation: core-glow 2s infinite ease-in-out;
        }

        @keyframes core-glow {
          0%, 100% { transform: scale(1); box-shadow: 0 0 15px rgba(189, 255, 0, 0.4); }
          50% { transform: scale(1.08); box-shadow: 0 0 30px rgba(189, 255, 0, 0.8); }
        }

        .orbit-track-inner {
          position: absolute;
          width: 90px;
          height: 90px;
          border: 2px dashed rgba(255, 255, 255, 0.15);
          border-radius: 50%;
          animation: orbit-spin-cw 14s linear infinite;
        }

        .orbit-track-outer {
          position: absolute;
          width: 146px;
          height: 146px;
          border: 2px dashed rgba(255, 255, 255, 0.15);
          border-radius: 50%;
          animation: orbit-spin-ccw 22s linear infinite;
        }

        @keyframes orbit-spin-cw {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes orbit-spin-ccw {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }

        .orbit-avatar {
          position: absolute;
          width: 28px;
          height: 28px;
          background: #fff;
          border: 2px solid #1b1b1b;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          box-shadow: 2px 2px 0px 0px #1b1b1b;
          cursor: pointer;
          transition: transform 0.2s, background 0.2s;
        }

        .orbit-avatar:hover {
          background: #bdff00;
          transform: scale(1.25) !important;
          z-index: 10;
        }

        .orbit-avatar::after {
          content: attr(data-tooltip);
          position: absolute;
          bottom: 34px;
          left: 50%;
          transform: translateX(-50%) scale(0);
          background: #1b1b1b;
          color: #fff;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 9px;
          font-weight: 800;
          white-space: nowrap;
          border: 1.5px solid #bdff00;
          pointer-events: none;
          transition: transform 0.15s ease;
          opacity: 0.95;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        }
        .orbit-avatar:hover::after {
          transform: translateX(-50%) scale(1);
        }

        .node-a { top: -14px; left: 31px; animation: orbit-counter-spin 14s linear infinite; }
        .node-b { bottom: -14px; left: 31px; animation: orbit-counter-spin 14s linear infinite; }

        .node-c { top: 59px; left: -14px; animation: orbit-clockwise-spin 22s linear infinite; }
        .node-d { top: 59px; right: -14px; animation: orbit-clockwise-spin 22s linear infinite; }
        .node-e { top: -14px; left: 59px; animation: orbit-clockwise-spin 22s linear infinite; }

        @keyframes orbit-counter-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }

        @keyframes orbit-clockwise-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
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
          background: transparent;
          width: 100%;
          position: relative;
          z-index: 5;
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

        {/* Full-Screen Background Orbit Animation */}
        <div className="fullscreen-orbit-bg">
          {/* Inner ring */}
          <div className="bg-orbit-1">
            <div className="bg-orbit-node bg-node-a">
              <span className="avatar-bubble">👩‍💻</span> Ananya · CSE
            </div>
            <div className="bg-orbit-node bg-node-b">
              <span className="avatar-bubble">👨‍💼</span> Rahul · MBA
            </div>
          </div>
          {/* Middle ring */}
          <div className="bg-orbit-2">
            <div className="bg-orbit-node bg-node-c">
              <span className="avatar-bubble">🎮</span> Karan · BCA
            </div>
            <div className="bg-orbit-node bg-node-d">
              <span className="avatar-bubble">🧬</span> Aditi · Biotech
            </div>
          </div>
          {/* Outer ring */}
          <div className="bg-orbit-3">
            <div className="bg-orbit-node bg-node-e">
              <span className="avatar-bubble">🎨</span> Divya · B.Des
            </div>
            <div className="bg-orbit-node bg-node-f">
              <span className="avatar-bubble">⚖️</span> Sneha · Law
            </div>
          </div>
        </div>

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
                THE EXCLUSIVE LPU SOCIAL NETWORK. KEEP YOUR UMS ATTENDANCE ABOVE 75%, FIND YOUR CAMPUS CREW, AND DISCOVER YOUR CIRCLE.
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

            {/* Campus Orbit Card (Visual FX) */}
            <div className="preview-tile preview-tile-orbit">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", fontWeight: 900, color: "#bdff00", letterSpacing: "0.05em" }}>CAMPUS ORBIT</span>
                <span style={{ fontSize: "12px" }}>🪐</span>
              </div>
              
              <div className="orbit-system">
                <div className="orbit-core">🔥</div>
                
                {/* Inner track (clockwise rotation) */}
                <div className="orbit-track-inner">
                  <div className="orbit-avatar node-a" data-tooltip="Ananya (CSE) 💻">👩‍💻</div>
                  <div className="orbit-avatar node-b" data-tooltip="Rahul (MBA) 💼">👨‍💼</div>
                </div>
                
                {/* Outer track (counter-clockwise rotation) */}
                <div className="orbit-track-outer">
                  <div className="orbit-avatar node-c" data-tooltip="Karan (BCA) 🎮">👨‍💻</div>
                  <div className="orbit-avatar node-d" data-tooltip="Aditi (Biotech) 🧬">👩‍🔬</div>
                  <div className="orbit-avatar node-e" data-tooltip="Divya (B.Des) 🎨">👩‍🎨</div>
                </div>
              </div>
              
              <p style={{ margin: 0, fontSize: "10px", fontWeight: 800, color: "#8a8d9b", textAlign: "center" }}>
                HOVER OVER AVATARS TO CONNECT ⚡
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
                  <p style={{ margin: "2px 0 0", fontSize: "10px", fontWeight: 700, color: "#1b1b1b" }}>
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
              {["🔒 Verified Accounts", "🎓 Block 35 Approved", "💬 Canteen Tea Talk", "🆓 Faster than Wi-Fi"].map(f => (
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

