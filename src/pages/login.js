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
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#F5F4F0" }}>
        <div style={{ fontSize: 24 }}>Loading...</div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #F5F4F0; }
        button:active { opacity: 0.85; }
      `}</style>
      <div style={{
        minHeight: "100vh",
        background: "#F5F4F0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "28px 20px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}>
        <div style={{ width: "100%", maxWidth: 400, textAlign: "center" }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: "#FF4757", margin: "0 auto 20px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28,
          }}>🔥</div>

          <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 900, color: "#111", letterSpacing: -0.5 }}>
            Campus Connect
          </h1>
          <p style={{ margin: "0 0 32px", fontSize: 15, color: "#888", lineHeight: 1.5 }}>
            Find your campus squad. Sign in with your Google account to get started.
          </p>

          <button
            onClick={handleGoogleSignIn}
            disabled={signingIn}
            style={{
              width: "100%", padding: "14px 20px",
              borderRadius: 14, border: "2px solid #E0DED8",
              background: "#fff", color: "#111",
              fontWeight: 700, fontSize: 15,
              cursor: signingIn ? "wait" : "pointer",
              fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.56 2.95-2.24 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            {signingIn ? "Signing in…" : "Continue with Google"}
          </button>

          {error && (
            <p style={{ marginTop: 16, color: "#C62828", fontSize: 14, fontWeight: 600 }}>{error}</p>
          )}
        </div>
      </div>
    </>
  );
}
