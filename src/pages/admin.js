// src/pages/admin.js
// Admin Verification Panel — review pending student ID cards.
// Access restricted by a simple, static passkey.

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, getDoc, orderBy, writeBatch
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
  const [outOfSyncUsers, setOutOfSyncUsers] = useState([]);
  const [loadingSync, setLoadingSync] = useState(false);

  // Profile-oriented Chat Moderation States
  const [allProfiles, setAllProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [selectedUserMatches, setSelectedUserMatches] = useState([]);
  const [profileSearchQuery, setProfileSearchQuery] = useState("");

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

  // ── Load all profiles for Chat Moderation tab ──
  useEffect(() => {
    if (!authorized || activeTab !== "chats") return;

    setLoading(true);
    const q = collection(db, "profiles");
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setAllProfiles(list);
      
      const seeded = {};
      list.forEach(p => {
        seeded[p.id] = p;
      });
      setProfiles(prev => ({ ...prev, ...seeded }));
      setLoading(false);
    }, (err) => {
      console.error("Failed to load profiles:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [authorized, activeTab]);

  // ── Load matches dynamically for selected user ──
  useEffect(() => {
    if (!authorized || !selectedProfile) {
      setSelectedUserMatches([]);
      return;
    }

    const uid = selectedProfile.id;
    setLoading(true);

    let list1 = [];
    let list2 = [];

    const updateMatchesState = async () => {
      const merged = [];
      const seen = new Set();
      [...list1, ...list2].forEach(m => {
        if (!seen.has(m.id)) {
          seen.add(m.id);
          merged.push(m);
        }
      });

      setSelectedUserMatches(merged);

      const profileUpdates = {};
      await Promise.all(
        merged.flatMap(m => [m.user1Id, m.user2Id]).map(async (otherId) => {
          if (otherId && !profiles[otherId] && !profileUpdates[otherId]) {
            const pSnap = await getDoc(doc(db, "profiles", otherId));
            if (pSnap.exists()) {
              profileUpdates[otherId] = pSnap.data();
            }
          }
        })
      );
      if (Object.keys(profileUpdates).length > 0) {
        setProfiles(prev => ({ ...prev, ...profileUpdates }));
      }
      setLoading(false);
    };

    const q1 = query(collection(db, "matches"), where("user1Id", "==", uid));
    const unsub1 = onSnapshot(q1, (snap) => {
      list1 = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      updateMatchesState();
    });

    const q2 = query(collection(db, "matches"), where("user2Id", "==", uid));
    const unsub2 = onSnapshot(q2, (snap) => {
      list2 = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      updateMatchesState();
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [authorized, selectedProfile]);

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

  // ── Sync Profiles Logic ──
  useEffect(() => {
    if (!authorized) return;

    const q = query(
      collection(db, "verifications"),
      where("status", "in", ["approved", "rejected"])
    );
    const unsub = onSnapshot(q, async (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const outOfSync = [];

      await Promise.all(
        list.map(async (v) => {
          const pSnap = await getDoc(doc(db, "profiles", v.id));
          if (pSnap.exists()) {
            const profileData = pSnap.data();
            if (profileData.verificationStatus !== v.status) {
              outOfSync.push({
                id: v.id,
                verificationStatus: v.status,
                profile: profileData
              });
            }
          } else {
            outOfSync.push({
              id: v.id,
              verificationStatus: v.status,
              profile: { name: "Unknown User (No Profile Document)", phone: v.id }
            });
          }
        })
      );

      setOutOfSyncUsers(outOfSync);
    }, (err) => {
      console.error("Failed to load verifications for sync:", err);
    });

    return () => unsub();
  }, [authorized]);

  const handleSyncStatus = async (userId, status) => {
    setProcessingId(userId);
    try {
      await updateDoc(doc(db, "profiles", userId), {
        verificationStatus: status,
      });
      alert("Profile status successfully synchronized! 🎉");
    } catch (e) {
      console.error(e);
      alert(`Failed to sync status: ${e.message || e}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleSyncAll = async () => {
    if (outOfSyncUsers.length === 0) return;
    setLoadingSync(true);
    try {
      const batch = writeBatch(db);
      outOfSyncUsers.forEach(u => {
        const ref = doc(db, "profiles", u.id);
        batch.update(ref, { verificationStatus: u.verificationStatus });
      });
      await batch.commit();
      alert("All profiles synchronized successfully! 🎉");
    } catch (e) {
      console.error(e);
      alert(`Failed to sync profiles: ${e.message || e}`);
    } finally {
      setLoadingSync(false);
    }
  };

  // ── Actions ──
  const handleVerify = async (userId, approve) => {
    setProcessingId(userId);
    const newStatus = approve ? "approved" : "rejected";
    try {
      const batch = writeBatch(db);

      // 1. Update verification document
      const verificationRef = doc(db, "verifications", userId);
      batch.update(verificationRef, { status: newStatus });

      // 2. Update user's profile document
      const profileRef = doc(db, "profiles", userId);
      batch.update(profileRef, { verificationStatus: newStatus });

      await batch.commit();

      alert(`User ${approve ? "Approved ✅" : "Rejected ❌"}`);
    } catch (e) {
      console.error(e);
      alert(`Failed to update status: ${e.message || e}`);
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
            boxShadow: "0 4px 14px rgba(255,71,87,0.3)", marginBottom: 12
          }}>
            Unlock Dashboard →
          </button>
          <button
            type="button"
            onClick={() => router.push("/")}
            style={{
              width: "100%", padding: 12, borderRadius: 12,
              border: "2px solid #E0DED8", background: "transparent",
              color: "#666", fontWeight: 700, fontSize: 13,
              cursor: "pointer", fontFamily: "inherit",
              transition: "all 0.2s"
            }}
          >
            ← Go Back to App
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
            <button
              onClick={() => setActiveTab("sync")}
              style={{
                padding: "10px 20px", borderRadius: 10, border: "none",
                background: activeTab === "sync" ? "#FF4757" : "transparent",
                color: activeTab === "sync" ? "#fff" : "#666",
                fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.2s"
              }}
            >
              Sync Profiles {outOfSyncUsers.length > 0 && `(${outOfSyncUsers.length}) ⚠️`}
            </button>
          </div>
        </div>

        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 20px" }}>
          {activeTab === "verifications" && (
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

                        {/* ID Card Image Card or Student ID Details */}
                        <div style={{
                          width: "100%", height: 180, borderRadius: 12,
                          background: "#FAFAF8", border: "1px solid #E0DED8",
                          overflow: "hidden", display: "flex", flexDirection: "column",
                          alignItems: "center", justifyContent: "center", padding: 12,
                          boxSizing: "border-box"
                        }}>
                          {v.verificationMethod === "student_id" || (v.studentId && !v.idCardUrl) ? (
                            <div style={{ width: "100%", fontSize: 13, display: "flex", flexDirection: "column", gap: 8 }}>
                              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "6px 10px", borderRadius: 8, color: "#16a34a", fontSize: 11, fontWeight: 800, textTransform: "uppercase", textAlign: "center" }}>
                                🆔 STUDENT ID VERIFICATION
                              </div>
                              <div style={{ textAlign: "left", width: "100%" }}>
                                <span style={{ color: "#666", fontSize: 11, fontWeight: 700 }}>STUDENT NAME:</span>
                                <div style={{ fontWeight: 800, color: "#111" }}>{v.studentName || user.name || "N/A"}</div>
                              </div>
                              <div style={{ textAlign: "left", width: "100%" }}>
                                <span style={{ color: "#666", fontSize: 11, fontWeight: 700 }}>STUDENT ID / REG NO:</span>
                                <div style={{ fontWeight: 800, color: "#111", fontFamily: "monospace" }}>{v.studentId || "N/A"}</div>
                              </div>
                            </div>
                          ) : v.idCardUrl ? (
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
                            <span style={{ fontSize: 12, color: "#AAA" }}>No ID uploaded / No Details</span>
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
          )}

          {activeTab === "chats" && (() => {
            const filtered = allProfiles.filter(p => {
              const q = profileSearchQuery.toLowerCase().trim();
              if (!q) return true;
              return (p.name || "").toLowerCase().includes(q) || 
                     (p.username || "").toLowerCase().includes(q) || 
                     (p.phone || "").toLowerCase().includes(q);
            });

            return (
              <>
                <h2 style={{ margin: "0 0 16px", fontSize: 22, fontWeight: 900, color: "#1b1b1b" }}>
                  Chat Moderation Panel
                </h2>

                {selectedProfile ? (
                  <div>
                    {/* Back Button */}
                    <button
                      onClick={() => setSelectedProfile(null)}
                      style={{
                        padding: "8px 16px", borderRadius: 10, border: "2.5px solid #1b1b1b",
                        background: "#fff", color: "#1b1b1b", fontWeight: 900, fontSize: 12,
                        cursor: "pointer", fontFamily: "inherit", boxShadow: "2px 2px 0px 0px #1b1b1b",
                        marginBottom: 20
                      }}
                    >
                      ⬅️ Back to All Users
                    </button>

                    {/* Selected User Header Card */}
                    <div style={{
                      background: "#fdfdfb", border: "2.5px solid #1b1b1b", borderRadius: 16,
                      boxShadow: "3px 3px 0px 0px #1b1b1b", padding: 20, display: "flex",
                      alignItems: "center", gap: 16, marginBottom: 24
                    }}>
                      <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#bdff00", border: "2px solid #1b1b1b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>
                        {selectedProfile.avatar || "👤"}
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontWeight: 950, fontSize: 18, color: "#1b1b1b", textTransform: "uppercase" }}>
                          {selectedProfile.name}
                        </h3>
                        <p style={{ margin: "2px 0 0", fontWeight: 800, fontSize: 12, color: "#7531d3" }}>
                          @{selectedProfile.username} ({selectedProfile.phone})
                        </p>
                        <p style={{ margin: "2px 0 0", fontWeight: 700, fontSize: 11, color: "#666" }}>
                          Active chats of this user are shown below.
                        </p>
                      </div>
                    </div>

                    <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 950, color: "#1b1b1b", textTransform: "uppercase" }}>
                      Active Chats ({selectedUserMatches.length})
                    </h3>

                    {loading ? (
                      <div style={{ textAlign: "center", padding: 40 }}>
                        <div style={{ fontSize: 40, animation: "spin 1s linear infinite" }}>🔄</div>
                      </div>
                    ) : selectedUserMatches.length === 0 ? (
                      <div style={{ background: "#fff", border: "2.5px solid #1b1b1b", borderRadius: 16, padding: "40px 20px", textAlign: "center", boxShadow: "3px 3px 0px 0px #1b1b1b" }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                        <h4 style={{ margin: 0, fontWeight: 900, color: "#1b1b1b" }}>No active chats for this user</h4>
                      </div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
                        {selectedUserMatches.map((m) => {
                          const isUser1 = m.user1Id === selectedProfile.id;
                          const otherId = isUser1 ? m.user2Id : m.user1Id;
                          const otherUser = profiles[otherId] || {};
                          return (
                            <div
                              key={m.id}
                              style={{
                                background: "#fff", border: "2.5px solid #1b1b1b", borderRadius: 16,
                                boxShadow: "3px 3px 0px 0px #1b1b1b", padding: 20,
                                display: "flex", flexDirection: "column", gap: 14
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#ffb2bf", border: "2px solid #1b1b1b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                                  {otherUser.avatar || "👤"}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <p style={{ margin: 0, fontWeight: 900, fontSize: 13, color: "#1b1b1b" }}>
                                    Chatting with {otherUser.name || "Loading..."}
                                  </p>
                                  <p style={{ margin: 0, fontSize: 11, color: "#7531d3", fontWeight: 800 }}>
                                    @{otherUser.username}
                                  </p>
                                </div>
                              </div>

                              <div style={{ background: "#FAFAF8", padding: 12, borderRadius: 12, border: "2px solid #1b1b1b", fontSize: 12, color: "#1b1b1b", fontWeight: 700 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                  <span>Status:</span>
                                  <span style={{ fontWeight: 900, color: m.status === "revealed" ? "#10B981" : "#F59E0B" }}>
                                    {m.status?.toUpperCase() || "PENDING"}
                                  </span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                  <span>Match ID:</span>
                                  <span style={{ fontFamily: "monospace", fontSize: 10 }}>{m.id.slice(0, 12)}...</span>
                                </div>
                              </div>

                              <button
                                onClick={() => setInspectingMatch(m)}
                                style={{
                                  width: "100%", padding: 11, borderRadius: 10,
                                  border: "2px solid #1b1b1b", background: "#bdff00",
                                  color: "#1b1b1b", fontWeight: 950, fontSize: 13,
                                  cursor: "pointer", fontFamily: "inherit",
                                  boxShadow: "2px 2px 0px 0px #1b1b1b"
                                }}
                              >
                                👁️ Inspect Chat Log
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {/* Search Bar */}
                    <input
                      type="text"
                      placeholder="🔍 Search user by name or phone..."
                      value={profileSearchQuery}
                      onChange={(e) => setProfileSearchQuery(e.target.value)}
                      style={{
                        width: "100%", padding: "12px 16px", borderRadius: 12,
                        border: "2.5px solid #1b1b1b", fontSize: 14, outline: "none",
                        fontFamily: "inherit", color: "#1b1b1b", background: "#ffffff",
                        boxShadow: "3px 3px 0px 0px #1b1b1b", marginBottom: 20,
                        fontWeight: 800
                      }}
                    />

                    {loading ? (
                      <div style={{ textAlign: "center", padding: 60 }}>
                        <div style={{ fontSize: 40, animation: "spin 1s linear infinite" }}>🔄</div>
                      </div>
                    ) : filtered.length === 0 ? (
                      <div style={{ background: "#fff", border: "2.5px solid #1b1b1b", borderRadius: 16, padding: "60px 20px", textAlign: "center", boxShadow: "3px 3px 0px 0px #1b1b1b" }}>
                        <div style={{ fontSize: 48, marginBottom: 10 }}>👥</div>
                        <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 900, color: "#1b1b1b" }}>No users found</h3>
                        <p style={{ margin: 0, fontSize: 13, color: "#666", fontWeight: 700 }}>Try adjusting your search query.</p>
                      </div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                        {filtered.map(p => (
                          <div
                            key={p.id}
                            onClick={() => setSelectedProfile(p)}
                            style={{
                              background: "#fff", border: "2.5px solid #1b1b1b", borderRadius: 14,
                              boxShadow: "3px 3px 0px 0px #1b1b1b", padding: 16, cursor: "pointer",
                              display: "flex", alignItems: "center", gap: 12, transition: "transform 0.1s"
                            }}
                            className="dashboard-item"
                          >
                            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#bdff00", border: "2px solid #1b1b1b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                              {p.avatar || "👤"}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <h4 style={{ margin: 0, fontWeight: 900, fontSize: 14, color: "#1b1b1b", textTransform: "uppercase" }}>{p.name}</h4>
                              <p style={{ margin: "2px 0 0", fontSize: 11, fontWeight: 800, color: "#7531d3" }}>@{p.username || p.phone}</p>
                              <p style={{ margin: "2px 0 0", fontSize: 10, fontWeight: 700, color: "#666" }}>{p.city || "Unknown City"}, {p.state || "Unknown State"}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            );
          })()}

          {activeTab === "sync" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#111" }}>
                  Out-of-Sync Profiles ({outOfSyncUsers.length})
                </h2>
                {outOfSyncUsers.length > 0 && (
                  <button
                    onClick={handleSyncAll}
                    disabled={loadingSync}
                    style={{
                      padding: "10px 20px", borderRadius: 12, border: "none",
                      background: "#FF4757", color: "#fff", fontWeight: 800,
                      fontSize: 13, cursor: loadingSync ? "not-allowed" : "pointer",
                      fontFamily: "inherit", boxShadow: "0 4px 14px rgba(255,71,87,0.3)"
                    }}
                  >
                    {loadingSync ? "Syncing..." : "Sync All Profiles ⚡"}
                  </button>
                )}
              </div>

              {outOfSyncUsers.length === 0 ? (
                <div style={{
                  background: "#fff", borderRadius: 20, padding: "60px 20px",
                  textAlign: "center", boxShadow: "0 2px 16px rgba(0,0,0,0.04)"
                }}>
                  <div style={{ fontSize: 48, marginBottom: 10 }}>🎉</div>
                  <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 900, color: "#222" }}>All profiles are in sync!</h3>
                  <p style={{ margin: 0, fontSize: 13, color: "#888" }}>No student profiles are out of sync.</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
                  {outOfSyncUsers.map((u) => {
                    const isProcessing = processingId === u.id;
                    return (
                      <div
                        key={u.id}
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
                            {u.profile.avatar || "👤"}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: "#111" }}>
                              {u.profile.name || "Loading name..."}
                            </p>
                            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#888", fontWeight: 600 }}>
                              {u.profile.phone || "No phone"}
                            </p>
                          </div>
                        </div>

                        {/* Status Mismatch Card */}
                        <div style={{
                          padding: "12px 16px", borderRadius: 12,
                          background: "#FFF9E6", border: "1px solid #FFE0B2",
                          fontSize: 13, color: "#B78103", display: "flex",
                          flexDirection: "column", gap: 4
                        }}>
                          <div>
                            <strong>Verification Doc:</strong> {u.verificationStatus.toUpperCase()}
                          </div>
                          <div>
                            <strong>Profile Doc:</strong> {(u.profile.verificationStatus || "pending").toUpperCase()}
                          </div>
                        </div>

                        {/* Actions */}
                        <button
                          onClick={() => handleSyncStatus(u.id, u.verificationStatus)}
                          disabled={isProcessing}
                          style={{
                            width: "100%", padding: 11, borderRadius: 10,
                            border: "none", background: "#10B981",
                            color: "#fff", fontWeight: 800, fontSize: 13,
                            cursor: isProcessing ? "not-allowed" : "pointer", fontFamily: "inherit",
                            boxShadow: "0 2px 8px rgba(16,185,129,0.25)", marginTop: "auto"
                          }}
                        >
                          {isProcessing ? "Syncing..." : `Sync Status to ${u.verificationStatus}`}
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
                        {msg.content}
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
