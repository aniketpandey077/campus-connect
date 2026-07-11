// src/pages/profile.js
// Shows the current user's profile with photo upload.
// Photo compressed and saved as photoUrl in Firestore (free tier, no Storage).
// TODO: replace localStorage "cc_phone" with auth.currentUser.uid once Firebase Auth is live.

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { doc, getDoc, updateDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import NavBar from "../components/NavBar";
import { useRequireAuth } from "../lib/useAuth";
import { fileToFirestorePhoto, fileToBlurredPlaceholder } from "../lib/imageUtils";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Tag({ children, bg = "#fff", color = "#1b1b1b" }) {
  return (
    <span style={{
      display: "inline-block", padding: "6px 14px",
      borderRadius: "4px", background: bg, color,
      border: "2px solid #1b1b1b",
      fontSize: "12px", fontWeight: 800,
      fontFamily: "Montserrat",
      boxShadow: "2px 2px 0px 0px #1b1b1b"
    }}>{children}</span>
  );
}

function BentoCard({ title, children, bg = "#fff", icon }) {
  return (
    <div className="bento-card" style={{
      background: bg,
      border: "3px solid #1b1b1b",
      padding: "20px",
      boxShadow: "4px 4px 0px 0px #1b1b1b",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      position: "relative",
      overflow: "hidden"
    }}>
      {icon && (
        <div style={{
          position: "absolute", right: "-10px", top: "-10px",
          opacity: 0.12, fontSize: "64px", pointerEvents: "none",
          userSelect: "none"
        }}>
          {icon}
        </div>
      )}
      <p style={{
        margin: 0, fontSize: "11px", fontWeight: 900,
        color: "#1b1b1b", textTransform: "uppercase", letterSpacing: "0.08em",
        fontFamily: "Montserrat",
        borderBottom: "2px solid #1b1b1b",
        paddingBottom: "6px"
      }}>{title}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "4px" }}>
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
  const [pendingCount, setPendingCount] = useState(0); // admin: pending verifications
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    setMyPhone(uid);
    loadProfile(uid);

    // Check Firestore 'admins' collection — managed from Firebase Console
    getDoc(doc(db, "admins", uid)).then(snap => {
      if (snap.exists()) {
        setIsAdmin(true);
        // Subscribe to live pending verification count
        const q = query(collection(db, "verifications"), where("status", "==", "pending"));
        const unsub = onSnapshot(q, snap => setPendingCount(snap.size));
        return unsub; // cleanup
      }
    });
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

    if (!file.type.startsWith("image/")) {
      setUploadMsg("❌ Please pick an image file.");
      return;
    }

    setUploading(true);
    setUploadMsg("");

    try {
      const photoUrl = await fileToFirestorePhoto(file);
      const blurredPhotoUrl = await fileToBlurredPlaceholder(file);
      await updateDoc(doc(db, "profiles", myPhone), { photoUrl, blurredPhotoUrl });

      setProfile(prev => ({ ...prev, photoUrl, blurredPhotoUrl }));
      setUploadMsg("🎉 Photo updated!");
    } catch (err) {
      console.error("Photo upload error:", err);
      setUploadMsg(err?.message?.includes?.("too large") ? "❌ Photo too large — try a smaller image." : "❌ Upload failed — try again.");
    } finally {
      setUploading(false);
      setTimeout(() => setUploadMsg(""), 3000);
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
        <div style={{ fontSize: "48px", animation: "spin 1.2s linear infinite" }}>⚙️</div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ fontFamily: "Montserrat", fontWeight: 800, fontSize: "14px" }}>LOADING PROFILE...</p>
      </Shell>
    );
  }

  if (error || !profile) {
    return (
      <Shell>
        <p style={{ color: "#ba1a1a", fontWeight: 800, fontFamily: "Montserrat" }}>{error || "PROFILE NOT FOUND."}</p>
        <button onClick={() => router.push("/onboarding")} style={solidBtn("#bdff00", "#1b1b1b")}>
          COMPLETE PROFILE →
        </button>
      </Shell>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap');
        * { box-sizing: border-box; }
        body { 
          margin: 0; 
          background-color: #f3f3f3;
          background-image: radial-gradient(#bcbcbc 1.5px, transparent 1.5px);
          background-size: 32px 32px;
          font-family: 'Montserrat', sans-serif; 
        }
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
        .neo-button-hover {
          transition: all 0.1s ease;
        }
        .neo-button-hover:active {
          transform: translate(4px, 4px) !important;
          box-shadow: 0px 0px 0px 0px #1b1b1b !important;
        }
        .bento-card {
          transition: all 0.2s ease;
        }
        .bento-card:hover {
          transform: translate(2px, 2px);
          box-shadow: 2px 2px 0px 0px #1b1b1b !important;
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
          position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)",
          zIndex: 100, background: "#fff",
          border: "3px solid #1b1b1b",
          boxShadow: "4px 4px 0px 0px #1b1b1b",
          borderRadius: 0, padding: "12px 24px",
          fontSize: "13px", fontWeight: 900,
          fontFamily: "Montserrat",
          animation: "toastIn 0.25s ease",
          whiteSpace: "nowrap",
        }}>
          {uploadMsg.toUpperCase()}
        </div>
      )}

      {/* Top Navigation */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0,
        zIndex: 50, display: "flex", justifyContent: "space-between",
        alignItems: "center", padding: "16px 20px",
        background: "#ffffff", borderBottom: "3px solid #1b1b1b",
        boxShadow: "0px 4px 0px 0px rgba(0,0,0,1)"
      }}>
        <div style={{
          fontFamily: "Montserrat", fontSize: "20px", fontWeight: 900,
          fontStyle: "italic", tracking: "-0.05em", color: "#4b6700"
        }}>
          UNIHOOD
        </div>
        <button onClick={handleLogout} className="neo-button-hover" style={{
          padding: "8px 16px", border: "2.5px solid #1b1b1b",
          background: "#ffb2bf", color: "#1b1b1b",
          fontFamily: "Montserrat", fontWeight: 900, fontSize: "11px",
          textTransform: "uppercase", cursor: "pointer",
          boxShadow: "2px 2px 0px 0px #1b1b1b"
        }}>
          Log out
        </button>
      </nav>

      {/* Main Container */}
      <div style={{
        minHeight: "100vh",
        padding: "110px 20px 120px",
        display: "flex", flexDirection: "column", alignItems: "center"
      }}>
        <main className="fade" style={{ width: "100%", maxWidth: "800px", display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* Main Profile Info Bento Card */}
          <div style={{
            background: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(12px)",
            border: "3px solid #1b1b1b",
            boxShadow: "6px 6px 0px 0px #1b1b1b",
            padding: "24px",
            display: "flex",
            flexWrap: "wrap",
            gap: "24px",
            alignItems: "center",
            position: "relative"
          }}>
            
            {/* Clickable Avatar with overlay */}
            <div
              onClick={() => !uploading && fileRef.current?.click()}
              title={profile.photoUrl ? "Change photo" : "Add a photo"}
              style={{
                width: "110px", height: "110px",
                borderRadius: "50%",
                border: "3px solid #1b1b1b",
                boxShadow: "4px 4px 0px 0px #1b1b1b",
                position: "relative",
                cursor: "pointer",
                overflow: "visible",
                background: "#d6baff",
                flexShrink: 0
              }}
            >
              {profile.photoUrl ? (
                <img
                  src={profile.photoUrl}
                  alt={profile.name}
                  style={{
                    width: "100%", height: "100%", borderRadius: "50%",
                    objectFit: "cover"
                  }}
                />
              ) : (
                <div style={{
                  width: "100%", height: "100%", borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "52px"
                }}>
                  {profile.avatar || "😊"}
                </div>
              )}

              {/* Upload Badge */}
              <div style={{
                position: "absolute", bottom: "-2px", right: "-2px",
                width: "32px", height: "32px", borderRadius: "50%",
                background: uploading ? "#7531d3" : "#bdff00",
                border: "2px solid #1b1b1b",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "14px",
                boxShadow: "2px 2px 0px 0px #1b1b1b"
              }}>
                {uploading ? "↺" : "📷"}
              </div>
            </div>

            {/* Profile Identity info */}
            <div style={{ flex: 1, minWidth: "220px" }}>
              <span style={{
                fontFamily: "Montserrat", fontSize: "10px", fontWeight: 900,
                background: "#1b1b1b", color: "#bdff00",
                padding: "3px 8px", textTransform: "uppercase", letterSpacing: "0.1em",
                display: "inline-block", marginBottom: "8px"
              }}>
                STUDENT VERIFIED
              </span>
              <h1 style={{
                margin: 0, fontFamily: "Montserrat", fontSize: "28px", fontWeight: 900,
                color: "#1b1b1b", textTransform: "uppercase", letterSpacing: "-0.02em"
              }}>
                {profile.name}
              </h1>
              <p style={{
                margin: "4px 0 0", fontFamily: "Montserrat", fontSize: "15px", fontWeight: 800,
                color: "#7531d3"
              }}>
                {profile.handle ? `@${profile.handle.toUpperCase()}` : ""}
              </p>
              <p style={{
                margin: "6px 0 0", fontFamily: "Montserrat", fontSize: "13px", fontWeight: 800,
                color: "#555"
              }}>
                💻 {(profile.branch || []).join(" + ").toUpperCase()}
                {(profile.year || []).length ? ` · ${profile.year[0].toUpperCase()}` : ""}
              </p>
            </div>

            {/* Decorative Star badge */}
            <div style={{
              position: "absolute", top: "-12px", right: "-12px",
              width: "36px", height: "36px", borderRadius: "50%",
              background: "#b90e4f", border: "3px solid #1b1b1b",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", boxShadow: "2px 2px 0px 0px #1b1b1b"
            }}>
              ★
            </div>
          </div>

          {/* Reveal Status Banner */}
          <div style={{
            background: profile.photoUrl ? "#bdff00" : "#ffd9de",
            border: "3px solid #1b1b1b",
            padding: "16px",
            boxShadow: "4px 4px 0px 0px #1b1b1b",
            display: "flex",
            alignItems: "center",
            gap: "14px"
          }}>
            <span style={{ fontSize: "28px" }}>{profile.photoUrl ? "🔓" : "👁️"}</span>
            <div>
              <p style={{
                margin: 0, fontSize: "12px", fontWeight: 900,
                color: "#1b1b1b", fontFamily: "Montserrat", textTransform: "uppercase",
                letterSpacing: "0.02em"
              }}>
                {profile.photoUrl ? "Photo ready for reveal" : "Add photo for the reveal feature"}
              </p>
              <p style={{
                margin: "4px 0 0", fontSize: "11px", fontWeight: 700,
                color: "#222", lineHeight: "1.4"
              }}>
                {profile.photoUrl
                  ? "WHEN BOTH YOU AND A MUTUAL MATCH TOGGLE THE EYE ICON 👁️ IN CHAT, YOUR PHOTOS WILL APPEAR."
                  : "TAP YOUR AVATAR ABOVE TO UPLOAD A PHOTO. PHOTOS ARE ONLY SHOWN UPON MUTUAL REVEAL SESSIONS."}
              </p>
            </div>
          </div>

          {/* Bento Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "20px"
          }}>
            {(profile.stay || []).length > 0 && (
              <BentoCard title="Where I Stay" icon="🏠">
                {(profile.stay || []).map(s => {
                  const isHostel = s?.startsWith("BH") || s?.startsWith("GH") || s?.includes("Hostel");
                  return (
                    <Tag key={s} bg={isHostel ? "#ffd9de" : "#ecdcff"}>
                      {s.toUpperCase()}
                    </Tag>
                  );
                })}
              </BentoCard>
            )}

            {(profile.campusVibe || []).length > 0 && (
              <BentoCard title="Campus Vibe" icon="🦉" bg="#ffd9de">
                {(profile.campusVibe || []).map(v => (
                  <Tag key={v} bg="#ffffff">{v.toUpperCase()}</Tag>
                ))}
              </BentoCard>
            )}

            {(profile.interests || []).length > 0 && (
              <BentoCard title="Into / Interests" icon="🌟">
                {(profile.interests || []).map(i => (
                  <Tag key={i} bg="#ecdcff">{i.toUpperCase()}</Tag>
                ))}
              </BentoCard>
            )}

            {(profile.squad || []).length > 0 && (
              <BentoCard title="Squad / Looking For" icon="🤝" bg="#ecdcff">
                {(profile.squad || []).map(s => (
                  <Tag key={s} bg="#ffffff">{s.toUpperCase()}</Tag>
                ))}
              </BentoCard>
            )}

            {(profile.defaultSpot || []).length > 0 && (
              <BentoCard title="Go-to Spots" icon="📍" bg="#eeeeee">
                {(profile.defaultSpot || []).map(s => (
                  <Tag key={s} bg="#ffffff">{s.toUpperCase()}</Tag>
                ))}
              </BentoCard>
            )}

            {(profile.weekendVibe || []).length > 0 && (
              <div className="bento-card" style={{
                background: "#bdff00",
                border: "3px solid #1b1b1b",
                padding: "20px",
                boxShadow: "4px 4px 0px 0px #1b1b1b",
                display: "flex",
                flexDirection: "column",
                gap: "10px"
              }}>
                <p style={{
                  margin: 0, fontSize: "11px", fontWeight: 900,
                  color: "#1b1b1b", textTransform: "uppercase", letterSpacing: "0.08em",
                  fontFamily: "Montserrat",
                  borderBottom: "2px solid #1b1b1b",
                  paddingBottom: "6px"
                }}>My Ideal Saturday</p>
                <p style={{
                  margin: "8px 0 0", fontSize: "14px", fontWeight: 900,
                  color: "#1b1b1b", fontFamily: "Montserrat", lineHeight: 1.5,
                  fontStyle: "italic"
                }}>
                  "{(profile.weekendVibe || []).join(" · ").toUpperCase()}"
                </p>
              </div>
            )}
          </div>

          {/* Admin Panel Shortcut — only visible if UID is in Firestore 'admins' collection */}
          {isAdmin && (
            <div style={{
              background: pendingCount > 0 ? "#fef3c7" : "#f3f3f3",
              border: `3px solid ${pendingCount > 0 ? "#f59e0b" : "#1b1b1b"}`,
              boxShadow: pendingCount > 0 ? "4px 4px 0px 0px #f59e0b" : "4px 4px 0px 0px #1b1b1b",
              padding: "16px 20px",
              display: "flex", alignItems: "center",
              justifyContent: "space-between", gap: 14,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 28 }}>🛡️</span>
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: "#1b1b1b",
                    fontFamily: "Montserrat", textTransform: "uppercase" }}>
                    Admin Panel
                  </p>
                  <p style={{ margin: "3px 0 0", fontSize: 11, fontWeight: 700, color: "#555" }}>
                    {pendingCount > 0
                      ? `${pendingCount} verification${pendingCount > 1 ? "s" : ""} waiting for review`
                      : "No pending verifications — all clear ✅"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push("/admin")}
                className="neo-button-hover"
                style={{
                  padding: "10px 18px",
                  border: "2.5px solid #1b1b1b",
                  background: pendingCount > 0 ? "#f59e0b" : "#bdff00",
                  color: "#1b1b1b", fontFamily: "Montserrat",
                  fontWeight: 900, fontSize: 11,
                  textTransform: "uppercase",
                  cursor: "pointer",
                  boxShadow: "2px 2px 0px 0px #1b1b1b",
                  whiteSpace: "nowrap",
                }}
              >
                {pendingCount > 0 ? `Review ${pendingCount} →` : "Open Panel"}
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "10px" }}>
            <button
              onClick={() => router.push("/profile/edit")}
              className="neo-button-hover"
              style={{
                width: "100%", background: "#ffd9de", color: "#1b1b1b",
                border: "3px solid #1b1b1b", padding: "16px",
                fontFamily: "Montserrat", fontSize: "15px", fontWeight: 900,
                textTransform: "uppercase", letterSpacing: "0.05em",
                boxShadow: "4px 4px 0px 0px #1b1b1b", cursor: "pointer"
              }}
            >
              ✏️ Edit Profile Info
            </button>

            <button
              onClick={() => router.push("/swipe")}
              className="neo-button-hover"
              style={{
                width: "100%", background: "#bdff00", color: "#1b1b1b",
                border: "3px solid #1b1b1b", padding: "18px",
                fontFamily: "Montserrat", fontSize: "18px", fontWeight: 900,
                fontStyle: "italic", textTransform: "uppercase", letterSpacing: "0.05em",
                boxShadow: "4px 4px 0px 0px #1b1b1b", cursor: "pointer"
              }}
            >
              🔥 Start Swiping
            </button>
          </div>

        </main>
      </div>

      <NavBar active="/profile" />
    </>
  );
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function Shell({ children }) {
  return (
    <div style={{
      minHeight: "100vh", 
      backgroundColor: "#f3f3f3",
      backgroundImage: "radial-gradient(#bcbcbc 1.5px, transparent 1.5px)",
      backgroundSize: "32px 32px",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 16,
      fontFamily: "Montserrat",
    }}>
      {children}
    </div>
  );
}
function solidBtn(bg, color = "#fff") {
  return {
    padding: "12px 24px", 
    border: "3px solid #1b1b1b",
    background: bg, 
    color,
    fontFamily: "Montserrat",
    fontWeight: 900, 
    fontSize: "14px", 
    cursor: "pointer",
    boxShadow: "3px 3px 0px 0px #1b1b1b",
    textTransform: "uppercase",
  };
}
