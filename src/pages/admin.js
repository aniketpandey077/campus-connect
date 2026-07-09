// src/pages/admin.js
// Admin Verification Panel — review pending student ID cards.
// Access restricted by a simple, static passkey.

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, getDoc
} from "firebase/firestore";
import { db } from "../lib/firebase";

export default function Admin() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [verifications, setVerifications] = useState([]);
  const [profiles, setProfiles] = useState({}); // phone -> profile details
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  // ── PIN Authentication ──
  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pin === "campusadmin123") {
      setAuthorized(true);
      if (typeof window !== "undefined") {
        localStorage.setItem("cc_admin_authed", "true");
      }
    } else {
      alert("Incorrect admin passcode! ❌");
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("cc_admin_authed") === "true") {
      setAuthorized(true);
    }
  }, []);

  // ── Load pending verifications ──
  useEffect(() => {
    if (!authorized) return;

    const q = query(collection(db, "verifications"), where("status", "==", "pending"));
    const unsub = onSnapshot(q, async (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setVerifications(list);

      // Batch fetch corresponding profiles for those phones
      const profileUpdates = {};
      await Promise.all(
        list.map(async (v) => {
          if (!profiles[v.id]) {
            const pSnap = await getDoc(doc(db, "profiles", v.id));
            if (pSnap.exists()) {
              profileUpdates[v.id] = pSnap.data();
            }
          }
        })
      );

      if (Object.keys(profileUpdates).length > 0) {
        setProfiles(prev => ({ ...prev, ...profileUpdates }));
      }
      setLoading(false);
    });

    return () => unsub();
  }, [authorized]);

  // ── Actions ──
  const handleVerify = async (phone, approve) => {
    setProcessingId(phone);
    const newStatus = approve ? "approved" : "rejected";
    try {
      // 1. Update verification document
      await updateDoc(doc(db, "verifications", phone), {
        status: newStatus,
      });
      // 2. Update user's profile document
      await updateDoc(doc(db, "profiles", phone), {
        verificationStatus: newStatus,
      });
      alert(`User ${approve ? "Approved ✅" : "Rejected ❌"}`);
    } catch (e) {
      console.error(e);
      alert("Failed to update status.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("cc_admin_authed");
    setAuthorized(false);
    setPin("");
  };

  // ── Login Render ──
  if (!authorized) {
    return (
      <div style={{
        minHeight: "100vh", background: "#F5F4F0",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        padding: 20
      }}>
        <form onSubmit={handlePinSubmit} style={{
          width: "100%", maxWidth: 360, background: "#fff",
          borderRadius: 20, padding: 28, boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
          textAlign: "center"
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🛡️</div>
          <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 900, color: "#111" }}>Admin Portal</h2>
          <p style={{ margin: "0 0 20px", fontSize: 13, color: "#888" }}>
            Enter passkey to review college student ID verifications.
          </p>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter Admin Passkey..."
            style={{
              width: "100%", padding: "12px 16px", borderRadius: 12,
              border: "2px solid #E0DED8", fontSize: 15, outline: "none",
              fontFamily: "inherit", boxSizing: "border-box", marginBottom: 16
            }}
          />
          <button type="submit" style={{
            width: "100%", padding: 13, borderRadius: 12, border: "none",
            background: "#FF4757", color: "#fff", fontWeight: 800,
            fontSize: 14, cursor: "pointer", fontFamily: "inherit",
            boxShadow: "0 4px 14px rgba(255,71,87,0.3)"
          }}>
            Unlock Dashboard →
          </button>
        </form>
      </div>
    );
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #F5F4F0; }
        @keyframes fadeIn { from{opacity:0; transform:translateY(10px)} to{opacity:1; transform:translateY(0)} }
        .dashboard-item { animation: fadeIn 0.3s ease both; }
      `}</style>

      <div style={{
        minHeight: "100vh", background: "#F5F4F0",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        paddingBottom: 60,
      }}>
        {/* Admin Header */}
        <header style={{
          background: "#fff", borderBottom: "1px solid #EDECE8",
          padding: "16px 20px", position: "sticky", top: 0, zIndex: 10,
        }}>
          <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>🛡️</span>
              <div>
                <h1 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "#111" }}>Campus Admin</h1>
                <p style={{ margin: 0, fontSize: 11, color: "#888", fontWeight: 600 }}>Verification Queue</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <button onClick={() => router.push("/swipe")} style={{
                background: "none", border: "none", color: "#FF4757",
                fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit"
              }}>
                Swipe Deck
              </button>
              <button onClick={handleLogout} style={{
                padding: "8px 16px", borderRadius: 10, border: "2px solid #E0DED8",
                background: "transparent", color: "#666", fontWeight: 700,
                fontSize: 12, cursor: "pointer", fontFamily: "inherit"
              }}>
                Log out
              </button>
            </div>
          </div>
        </header>

        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 20px" }}>
          <h2 style={{ margin: "0 0 16px", fontSize: 22, fontWeight: 900, color: "#111" }}>
            Pending Submissions ({verifications.length})
          </h2>

          {loading ? (
            <div style={{ textAlign: "center", padding: 60 }}>
              <div style={{ fontSize: 40, animation: "spin 1s linear infinite" }}>🔄</div>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : verifications.length === 0 ? (
            <div style={{
              background: "#fff", borderRadius: 20, padding: "60px 20px",
              textAlign: "center", boxShadow: "0 2px 16px rgba(0,0,0,0.04)"
            }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>🎉</div>
              <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 900, color: "#222" }}>Queue is empty</h3>
              <p style={{ margin: 0, fontSize: 13, color: "#888" }}>All submitted ID cards have been reviewed.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
              {verifications.map((v) => {
                const user = profiles[v.id] || {};
                const isProcessing = processingId === v.id;
                return (
                  <div
                    key={v.id}
                    className="dashboard-item"
                    style={{
                      background: "#fff", borderRadius: 20, padding: 20,
                      boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                      display: "flex", flexDirection: "column", gap: 14
                    }}
                  >
                    {/* Student Info */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: "50%",
                        background: "linear-gradient(135deg, #FF4757, #6C5CE7)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 22, color: "#fff", flexShrink: 0
                      }}>
                        {user.avatar || "👤"}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: "#111" }}>
                          {user.name || "Loading name..."}
                        </p>
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "#888", fontWeight: 600 }}>
                          {user.phone} • {user.branch?.slice(0, 1).join("")}
                        </p>
                      </div>
                    </div>

                    {/* ID Card Image Card */}
                    <div style={{
                      width: "100%", height: 180, borderRadius: 12,
                      background: "#FAFAF8", border: "1px solid #E0DED8",
                      overflow: "hidden", display: "flex", alignItems: "center",
                      justifyContent: "center"
                    }}>
                      {v.idCardUrl ? (
                        <img
                          src={v.idCardUrl}
                          alt="Student ID card"
                          style={{ width: "100%", height: "100%", objectFit: "contain", cursor: "zoom-in" }}
                          onClick={() => {
                            const w = window.open();
                            w.document.write(`<img src="${v.idCardUrl}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`);
                          }}
                        />
                      ) : (
                        <span style={{ fontSize: 12, color: "#AAA" }}>No ID uploaded</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 10, marginTop: "auto" }}>
                      <button
                        onClick={() => handleVerify(v.id, false)}
                        disabled={isProcessing}
                        style={{
                          flex: 1, padding: 11, borderRadius: 10,
                          border: "2px solid #F0EEE8", background: "transparent",
                          color: "#DC2626", fontWeight: 700, fontSize: 13,
                          cursor: isProcessing ? "not-allowed" : "pointer", fontFamily: "inherit"
                        }}
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleVerify(v.id, true)}
                        disabled={isProcessing}
                        style={{
                          flex: 2, padding: 11, borderRadius: 10,
                          border: "none", background: "#10B981",
                          color: "#fff", fontWeight: 800, fontSize: 13,
                          cursor: isProcessing ? "not-allowed" : "pointer", fontFamily: "inherit",
                          boxShadow: "0 2px 8px rgba(16,185,129,0.25)"
                        }}
                      >
                        {isProcessing ? "Reviewing..." : "Verify student"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
