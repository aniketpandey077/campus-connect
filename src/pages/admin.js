// src/pages/admin.js
// Admin Verification Panel — review pending student ID cards.
// Access restricted by a simple, static passkey.

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, getDoc, orderBy
} from "firebase/firestore";
import { db } from "../lib/firebase";

export default function Admin() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState("verifications"); // verifications | chats
  const [verifications, setVerifications] = useState([]);
  const [matches, setMatches] = useState([]);
  const [inspectingMatch, setInspectingMatch] = useState(null);
  const [inspectingMessages, setInspectingMessages] = useState([]);
  const [profiles, setProfiles] = useState({}); // UID -> profile details
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  // ── PIN Authentication ──
  const handlePinSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (data.success) {
        setAuthorized(true);
        if (typeof window !== "undefined") {
          sessionStorage.setItem("cc_admin_pin", pin);
        }
      } else {
        alert(data.error ? `${data.error}! ❌` : "Incorrect admin passcode! ❌");
      }
    } catch (err) {
      alert("Verification failed. Please try again.");
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedPin = sessionStorage.getItem("cc_admin_pin");
      if (savedPin) {
        fetch("/api/admin/verify-pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin: savedPin }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              setPin(savedPin);
              setAuthorized(true);
            } else {
              sessionStorage.removeItem("cc_admin_pin");
            }
          })
          .catch(() => {
            sessionStorage.removeItem("cc_admin_pin");
          });
      }
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

  // ── Load matches for Chat Moderation ──
  useEffect(() => {
    if (!authorized || activeTab !== "chats") return;

    setLoading(true);
    const q = collection(db, "matches");
    const unsub = onSnapshot(q, async (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMatches(list);

      // Batch fetch missing profiles for matched users
      const profileUpdates = {};
      await Promise.all(
        list.flatMap(m => [m.user1Id, m.user2Id]).map(async (uid) => {
          if (uid && !profiles[uid] && !profileUpdates[uid]) {
            const pSnap = await getDoc(doc(db, "profiles", uid));
            if (pSnap.exists()) {
              profileUpdates[uid] = pSnap.data();
            }
          }
        })
      );

      if (Object.keys(profileUpdates).length > 0) {
        setProfiles(prev => ({ ...prev, ...profileUpdates }));
      }
      setLoading(false);
    }, (err) => {
      console.error("Failed to fetch matches:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [authorized, activeTab]);

  // ── Load Messages for Inspecting Match ──
  useEffect(() => {
    if (!inspectingMatch) {
      setInspectingMessages([]);
      return;
    }

    const q = query(
      collection(db, "chats", inspectingMatch.id, "messages"),
      orderBy("timestamp", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setInspectingMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error("Failed to load inspect messages:", err);
    });

    return () => unsub();
  }, [inspectingMatch]);

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
    sessionStorage.removeItem("cc_admin_pin");
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
            Enter passkey to review college student ID verifications (Real LPU IDs only, no fake UMS screenshots!).
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
                <p style={{ margin: 0, fontSize: 11, color: "#888", fontWeight: 600 }}>Unihood Moderation</p>
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

        {/* Tab switcher */}
        <div style={{ maxWidth: 1000, margin: "20px auto 0", padding: "0 20px" }}>
          <div style={{ display: "flex", gap: 8, borderBottom: "2px solid #EDECE8", paddingBottom: 10 }}>
            <button
              onClick={() => setActiveTab("verifications")}
              style={{
                padding: "10px 20px", borderRadius: 10, border: "none",
                background: activeTab === "verifications" ? "#FF4757" : "transparent",
                color: activeTab === "verifications" ? "#fff" : "#666",
                fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.2s"
              }}
            >
              Pending Verifications ({verifications.length})
            </button>
            <button
              onClick={() => setActiveTab("chats")}
              style={{
                padding: "10px 20px", borderRadius: 10, border: "none",
                background: activeTab === "chats" ? "#FF4757" : "transparent",
                color: activeTab === "chats" ? "#fff" : "#666",
                fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.2s"
              }}
            >
              Chat Audits ({matches.length})
            </button>
          </div>
        </div>

        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 20px" }}>
          {activeTab === "verifications" ? (
            <>
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
            </>
          ) : (
            <>
              <h2 style={{ margin: "0 0 16px", fontSize: 22, fontWeight: 900, color: "#111" }}>
                Active Matches ({matches.length})
              </h2>

              {loading ? (
                <div style={{ textAlign: "center", padding: 60 }}>
                  <div style={{ fontSize: 40, animation: "spin 1s linear infinite" }}>🔄</div>
                </div>
              ) : matches.length === 0 ? (
                <div style={{
                  background: "#fff", borderRadius: 20, padding: "60px 20px",
                  textAlign: "center", boxShadow: "0 2px 16px rgba(0,0,0,0.04)"
                }}>
                  <div style={{ fontSize: 48, marginBottom: 10 }}>💬</div>
                  <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 900, color: "#222" }}>No active matches</h3>
                  <p style={{ margin: 0, fontSize: 13, color: "#888" }}>Once students match, they will appear here.</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
                  {matches.map((m) => {
                    const u1 = profiles[m.user1Id] || {};
                    const u2 = profiles[m.user2Id] || {};
                    return (
                      <div
                        key={m.id}
                        className="dashboard-item"
                        style={{
                          background: "#fff", borderRadius: 20, padding: 20,
                          boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                          display: "flex", flexDirection: "column", gap: 14
                        }}
                      >
                        {/* Users matched */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#f0edec", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                              {u1.avatar || "👤"}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ margin: 0, fontWeight: 800, fontSize: 13, color: "#111" }}>{u1.name || "Loading..."}</p>
                              <p style={{ margin: 0, fontSize: 10, color: "#888" }}>User 1</p>
                            </div>
                          </div>
                          <span style={{ fontSize: 16 }}>🤝</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexDirection: "row-reverse", textAlign: "right" }}>
                            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#f0edec", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                              {u2.avatar || "👤"}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ margin: 0, fontWeight: 800, fontSize: 13, color: "#111" }}>{u2.name || "Loading..."}</p>
                              <p style={{ margin: 0, fontSize: 10, color: "#888" }}>User 2</p>
                            </div>
                          </div>
                        </div>

                        {/* Match details */}
                        <div style={{ background: "#FAFAF8", padding: 12, borderRadius: 12, border: "1px solid #EDECE8", fontSize: 12, color: "#555" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                            <span>Status:</span>
                            <span style={{ fontWeight: 800, color: m.status === "revealed" ? "#10B981" : "#F59E0B" }}>
                              {m.status?.toUpperCase() || "PENDING"}
                            </span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>Match ID:</span>
                            <span style={{ fontFamily: "monospace", fontSize: 10 }}>{m.id.slice(0, 12)}...</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <button
                          onClick={() => setInspectingMatch(m)}
                          style={{
                            width: "100%", padding: 11, borderRadius: 10,
                            border: "none", background: "#6C5CE7",
                            color: "#fff", fontWeight: 800, fontSize: 13,
                            cursor: "pointer", fontFamily: "inherit",
                            boxShadow: "0 2px 8px rgba(108,92,231,0.25)"
                          }}
                        >
                          👁️ Inspect Chat Log
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Chat Inspection Modal */}
      {inspectingMatch && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 100, padding: 20
        }}>
          <div style={{
            width: "100%", maxWidth: 540, background: "#fff",
            borderRadius: 24, display: "flex", flexDirection: "column",
            height: "80vh", boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
          }}>
            {/* Modal Header */}
            <div style={{
              padding: "20px 24px", borderBottom: "1px solid #EDECE8",
              display: "flex", alignItems: "center", justifyContent: "space-between"
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "#111" }}>
                  Chat Inspection
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "#666", fontWeight: 600 }}>
                  {(profiles[inspectingMatch.user1Id]?.name || "Loading...")} • {(profiles[inspectingMatch.user2Id]?.name || "Loading...")}
                </p>
              </div>
              <button
                onClick={() => setInspectingMatch(null)}
                style={{
                  background: "#F5F4F0", border: "none", width: 32, height: 32,
                  borderRadius: "50%", cursor: "pointer", fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}
              >
                ✕
              </button>
            </div>

            {/* Message List */}
            <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 12, background: "#F9F9FB" }}>
              {inspectingMessages.length === 0 ? (
                <div style={{ textAlign: "center", color: "#888", marginTop: 40, fontSize: 13 }}>
                  No messages sent yet in this conversation.
                </div>
              ) : (
                inspectingMessages.map((msg) => {
                  const isUser1 = msg.senderId === inspectingMatch.user1Id;
                  const senderName = isUser1 
                    ? (profiles[inspectingMatch.user1Id]?.name || "User 1")
                    : (profiles[inspectingMatch.user2Id]?.name || "User 2");

                  return (
                    <div
                      key={msg.id}
                      style={{
                        alignSelf: isUser1 ? "flex-start" : "flex-end",
                        maxWidth: "80%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: isUser1 ? "flex-start" : "flex-end"
                      }}
                    >
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#888", marginBottom: 3 }}>
                        {senderName}
                      </span>
                      <div style={{
                        padding: "10px 14px",
                        borderRadius: 16,
                        background: isUser1 ? "#EDEDF5" : "#6C5CE7",
                        color: isUser1 ? "#111" : "#fff",
                        fontSize: 13.5,
                        lineHeight: 1.4,
                        boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                      }}>
                        {msg.text}
                      </div>
                      {msg.timestamp && (
                        <span style={{ fontSize: 9, color: "#AAA", marginTop: 2 }}>
                          {new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: 16, borderTop: "1px solid #EDECE8", background: "#fff", display: "flex", justifyContent: "flex-end", borderRadius: "0 0 24px 24px" }}>
              <button
                onClick={() => setInspectingMatch(null)}
                style={{
                  padding: "10px 20px", borderRadius: 12, border: "none",
                  background: "#FF4757", color: "#fff", fontWeight: 800,
                  fontSize: 13, cursor: "pointer", fontFamily: "inherit"
                }}
              >
                Close Log
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
