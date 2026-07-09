// src/pages/profile.js
// Shows the current user's profile with photo upload.
// Photo compressed and saved as photoUrl in Firestore (free tier, no Storage).
// TODO: replace localStorage "cc_phone" with auth.currentUser.uid once Firebase Auth is live.

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import NavBar from "../components/NavBar";
import { useRequireAuth } from "../lib/useAuth";
import { fileToFirestorePhoto } from "../lib/imageUtils";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const BRANCH_COLORS = {
  CSE: ["#6C63FF","#3B82F6"], IT: ["#8B5CF6","#EC4899"],
  ECE: ["#F43F5E","#FB923C"], Mechanical: ["#0EA5E9","#06B6D4"],
  Civil: ["#10B981","#34D399"], EEE: ["#F59E0B","#EF4444"],
  Biotech: ["#34D399","#06B6D4"], "MBA/BBA": ["#A855F7","#EC4899"],
  default: ["#6366F1","#8B5CF6"],
};
function getGradient(branches = []) {
  const [a, b] = BRANCH_COLORS[branches?.[0]] || BRANCH_COLORS.default;
  return `linear-gradient(145deg, ${a}, ${b})`;
}

function Tag({ children, bg = "#F5F4F0", color = "#444" }) {
  return (
    <span style={{
      display: "inline-block", padding: "4px 12px",
      borderRadius: 999, background: bg, color,
      fontSize: 12, fontWeight: 600,
    }}>{children}</span>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{
        margin: "0 0 8px", fontSize: 10, fontWeight: 800,
        color: "#C0BDB8", textTransform: "uppercase", letterSpacing: "0.1em",
      }}>{title}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        {children}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Profile() {
  const router  = useRouter();
  const { user, loading: authLoading } = useRequireAuth();
  const fileRef = useRef(null);

  const [profile,   setProfile]   = useState(null);
  const [myPhone,   setMyPhone]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState(""); // success / error toast

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    setMyPhone(uid);
    loadProfile(uid);
  }, [user]);

  async function loadProfile(phone) {
    try {
      const snap = await getDoc(doc(db, "profiles", phone));
      if (!snap.exists()) { router.push("/onboarding"); return; }
      setProfile({ id: phone, ...snap.data() });
    } catch (e) {
      setError("Couldn't load your profile.");
    } finally {
      setLoading(false);
    }
  }

  // ── Photo upload ──────────────────────────────────────────────────────────
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !myPhone) return;

    // Only images
    if (!file.type.startsWith("image/")) {
      setUploadMsg("❌ Please pick an image file.");
      return;
    }

    setUploading(true);
    setUploadMsg("");

    try {
      const photoUrl = await fileToFirestorePhoto(file);
      await updateDoc(doc(db, "profiles", myPhone), { photoUrl });

      // 4. Update local state so the UI reflects immediately
      setProfile(prev => ({ ...prev, photoUrl }));
      setUploadMsg("✅ Photo updated!");
    } catch (err) {
      console.error("Photo upload error:", err);
      setUploadMsg(e?.message?.includes?.("too large") ? "❌ Photo too large — try a smaller image." : "❌ Upload failed — try again.");
    } finally {
      setUploading(false);
      // Clear toast after 3s
      setTimeout(() => setUploadMsg(""), 3000);
      // Reset the file input so the same file can be re-selected if needed
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  // ── Guards ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Shell>
        <div style={{ fontSize: 48, animation: "spin 1.2s linear infinite" }}>⚡</div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </Shell>
    );
  }

  if (error || !profile) {
    return (
      <Shell>
        <p style={{ color: "#C62828", fontWeight: 600 }}>{error || "Profile not found."}</p>
        <button onClick={() => router.push("/onboarding")} style={solidBtn("#FF4757")}>
          Complete profile →
        </button>
      </Shell>
    );
  }

  const grad = getGradient(profile.branch);

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #F5F4F0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade { animation: fadeUp 0.4s cubic-bezier(.22,1,.36,1) both; }
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {/* Toast message */}
      {uploadMsg && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          zIndex: 100, background: "#fff",
          borderRadius: 12, padding: "10px 20px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          fontSize: 13, fontWeight: 700,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          animation: "toastIn 0.25s ease",
          whiteSpace: "nowrap",
        }}>
          {uploadMsg}
        </div>
      )}

      <div style={{
        minHeight: "100dvh", background: "#F5F4F0",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        paddingBottom: 110,
      }}>

        {/* ── Gradient header ── */}
        <div style={{
          background: grad,
          paddingTop: 48, paddingBottom: 68,
          display: "flex", flexDirection: "column",
          alignItems: "center", position: "relative",
        }}>
          {/* Log out */}
          <button onClick={handleLogout} style={{
            position: "absolute", top: 16, right: 16,
            padding: "6px 14px", borderRadius: 10,
            border: "2px solid rgba(255,255,255,0.5)",
            background: "transparent",
            color: "#fff", fontWeight: 700, fontSize: 12,
            cursor: "pointer", fontFamily: "inherit",
          }}>Log out</button>

          {/* ── Clickable avatar with photo upload overlay ── */}
          <div
            onClick={() => !uploading && fileRef.current?.click()}
            title={profile.photoUrl ? "Change photo" : "Add a photo"}
            style={{
              width: 104, height: 104, borderRadius: "50%",
              position: "relative", marginBottom: 14,
              cursor: "pointer",
              boxShadow: "0 8px 28px rgba(0,0,0,0.22)",
            }}
          >
            {/* Photo or emoji */}
            {profile.photoUrl ? (
              <img
                src={profile.photoUrl}
                alt={profile.name}
                style={{
                  width: "100%", height: "100%", borderRadius: "50%",
                  objectFit: "cover",
                  border: "3px solid rgba(255,255,255,0.7)",
                }}
              />
            ) : (
              <div style={{
                width: "100%", height: "100%", borderRadius: "50%",
                background: "rgba(255,255,255,0.22)",
                border: "3px solid rgba(255,255,255,0.55)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 52,
              }}>
                {profile.avatar || "😊"}
              </div>
            )}

            {/* Upload overlay badge */}
            <div style={{
              position: "absolute", bottom: 2, right: 2,
              width: 28, height: 28, borderRadius: "50%",
              background: uploading ? "#6366F1" : "#FF4757",
              border: "2px solid #fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13,
            }}>
              {uploading
                ? <span style={{ fontSize: 12, animation: "spin 1s linear infinite", display: "block" }}>↺</span>
                : "📷"}
            </div>
          </div>

          <h1 style={{
            margin: 0, fontSize: 26, fontWeight: 900,
            color: "#fff", letterSpacing: -0.5,
          }}>{profile.name}</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>
            {(profile.branch || []).join(" + ")}
            {(profile.year || []).length ? " · " + profile.year[0] : ""}
          </p>

          {/* Photo upload hint (only when no photo yet) */}
          {!profile.photoUrl && !uploading && (
            <p style={{
              margin: "10px 0 0", fontSize: 12, color: "rgba(255,255,255,0.7)",
              fontWeight: 500, textAlign: "center",
            }}>
              📷 Tap your avatar to add a photo
            </p>
          )}
          {uploading && (
            <p style={{ margin: "10px 0 0", fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>
              Uploading…
            </p>
          )}
        </div>

        {/* ── Profile card ── */}
        <div className="fade" style={{
          maxWidth: 480, margin: "-36px auto 0",
          padding: "0 20px",
        }}>
          {/* Reveal status callout */}
          <div style={{
            background: profile.photoUrl ? "#DCFCE7" : "#FFF7ED",
            borderRadius: 14, padding: "12px 16px", marginBottom: 14,
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{ fontSize: 20 }}>{profile.photoUrl ? "🔓" : "👁️"}</span>
            <div>
              <p style={{
                margin: 0, fontSize: 12, fontWeight: 800,
                color: profile.photoUrl ? "#15803D" : "#92400E",
              }}>
                {profile.photoUrl ? "Photo ready for reveal" : "Add a photo for the reveal feature"}
              </p>
              <p style={{
                margin: "2px 0 0", fontSize: 11,
                color: profile.photoUrl ? "#166534" : "#B45309",
              }}>
                {profile.photoUrl
                  ? "When both you and a match toggle 👁️ in chat, your photos appear."
                  : "Tap your avatar above to upload. It's only shown to mutual reveals."}
              </p>
            </div>
          </div>

          <div style={{
            background: "#fff", borderRadius: 24,
            padding: "22px 20px 26px",
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          }}>
            {(profile.stay || []).length > 0 && (
              <Section title="Where I stay">
                {(profile.stay || []).map(s => (
                  <Tag key={s}
                    bg={s === "Hostel" ? "#DCFCE7" : "#EEF2FF"}
                    color={s === "Hostel" ? "#15803D" : "#4338CA"}
                  >
                    {s === "Hostel" ? "🏠 " : "🏡 "}{s}
                  </Tag>
                ))}
              </Section>
            )}

            {(profile.campusVibe || []).length > 0 && (
              <Section title="My campus vibe">
                {(profile.campusVibe || []).map(v => (
                  <Tag key={v} bg="#FEF3C7" color="#92400E">{v}</Tag>
                ))}
              </Section>
            )}

            {(profile.interests || []).length > 0 && (
              <Section title="Into">
                {(profile.interests || []).map(i => (
                  <Tag key={i}>{i}</Tag>
                ))}
              </Section>
            )}

            {(profile.squad || []).length > 0 && (
              <Section title="Looking for">
                {(profile.squad || []).map(s => (
                  <Tag key={s} bg="#EEF2FF" color="#4338CA">{s}</Tag>
                ))}
              </Section>
            )}

            {(profile.defaultSpot || []).length > 0 && (
              <Section title="Go-to spots">
                {(profile.defaultSpot || []).map(s => (
                  <Tag key={s} bg="#F0FDF4" color="#166534">📍 {s}</Tag>
                ))}
              </Section>
            )}

            {(profile.weekendVibe || []).length > 0 && (
              <div style={{
                background: "#F5F4F0", borderRadius: 14, padding: "14px 16px", marginTop: 4,
              }}>
                <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 800, color: "#C0BDB8", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  My ideal Saturday
                </p>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#222", lineHeight: 1.5 }}>
                  {(profile.weekendVibe || []).join("  ·  ")}
                </p>
              </div>
            )}

            <hr style={{ border: "none", borderTop: "1px solid #F0EEE8", margin: "20px 0" }} />

            {/* Edit */}
            <div style={{
              background: "#FFFBEB", borderRadius: 12, padding: "12px 16px",
              display: "flex", gap: 10, alignItems: "flex-start",
            }}>
              <span style={{ fontSize: 18 }}>✏️</span>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#92400E" }}>
                  Want to update your info?
                </p>
                <p style={{ margin: "2px 0 10px", fontSize: 12, color: "#B45309" }}>
                  Change branch, year, interests, and squad goals.
                </p>
                <button onClick={() => router.push("/profile/edit")} style={solidBtn("#F59E0B")}>
                  Edit profile →
                </button>
              </div>
            </div>
          </div>

          <button onClick={() => router.push("/swipe")} style={{
            width: "100%", marginTop: 14, padding: "14px",
            borderRadius: 14, border: "none",
            background: "#FF4757", color: "#fff",
            fontWeight: 800, fontSize: 15,
            cursor: "pointer", fontFamily: "inherit",
            boxShadow: "0 4px 16px #FF475740",
          }}>🔥 Start swiping</button>
        </div>
      </div>

      <NavBar active="/profile" />
    </>
  );
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function Shell({ children }) {
  return (
    <div style={{
      minHeight: "100dvh", background: "#F5F4F0",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 16,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {children}
    </div>
  );
}
function solidBtn(bg) {
  return {
    padding: "9px 18px", borderRadius: 10, border: "none",
    background: bg, color: "#fff",
    fontWeight: 700, fontSize: 13, cursor: "pointer",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  };
}
