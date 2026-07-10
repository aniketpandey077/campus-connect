// src/pages/matches.js
// Real-time inbox — lists mutual matches with last message preview.
// Tapping a match opens the chat screen.
// TODO: replace localStorage "cc_phone" with auth.currentUser.uid once Firebase Auth is live.

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import {
  collection, query, where, onSnapshot, doc, getDoc, addDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import NavBar from "../components/NavBar";
import { useRequireAuth } from "../lib/useAuth";

// ─── Helpers ──────────────────────────────────────────────────────────────────
// ─── Helpers ──────────────────────────────────────────────────────────────────
const BRANCH_BGS = {
  CSE: "#ffd9de", IT: "#ecdcff", ECE: "#d6baff", Mechanical: "#eeeeee",
  Civil: "#f0fdf4", EEE: "#fef3c7", Biotech: "#dcfce7", Chemical: "#ffedd5",
  "MBA/BBA": "#fdf2f8"
};

function getBranchBg(branches = []) {
  return BRANCH_BGS[branches?.[0]] || "#bdff00";
}

function timeAgo(ts) {
  if (!ts?.toDate) return "";
  const d = ts.toDate();
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// ─── Inbox card ───────────────────────────────────────────────────────────────
function MatchRow({ match, profile, myPhone, onClick }) {
  const isUser1 = match.user1Id === myPhone;
  const lastMsg  = match.lastMessage;
  const lastTime = match.lastMessageAt || match.matchedAt;
  const myLastMsg = match.lastSenderId === myPhone;
  const preview = lastMsg
    ? (myLastMsg ? `You: ${lastMsg}` : lastMsg)
    : "Say hi! 👋";
  const unreadCount = isUser1 ? (match.user1Unread || 0) : (match.user2Unread || 0);

  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 14,
        background: "#fff", border: "3px solid #1b1b1b", borderRadius: 12,
        padding: "14px 16px", cursor: "pointer", fontFamily: "inherit",
        boxShadow: "4px 4px 0px 0px #1b1b1b",
        transition: "transform 0.1s, box-shadow 0.1s",
        textAlign: "left",
      }}
      onMouseDown={e => {
        e.currentTarget.style.transform = "translate(2px, 2px)";
        e.currentTarget.style.boxShadow = "2px 2px 0px 0px #1b1b1b";
      }}
      onMouseUp={e => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "4px 4px 0px 0px #1b1b1b";
      }}
    >
      {/* Avatar */}
      <div style={{
        width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
        background: getBranchBg(profile?.branch),
        border: "2px solid #1b1b1b",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 26, boxShadow: "2px 2px 0px 0px #1b1b1b",
      }}>
        {profile?.avatar || "😊"}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0, paddingLeft: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
          <span style={{ fontWeight: 900, fontSize: 14, color: "#1b1b1b", textTransform: "uppercase" }}>
            {profile?.name || "…"}
          </span>
          <span style={{ fontSize: 10, color: unreadCount > 0 ? "#1b1b1b" : "#555", fontWeight: 900, flexShrink: 0, marginLeft: 8 }}>
            {timeAgo(lastTime).toUpperCase()}
          </span>
        </div>
        <p style={{
          margin: 0, fontSize: 12, color: unreadCount > 0 ? "#1b1b1b" : "#555",
          fontWeight: unreadCount > 0 ? 800 : 600,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {preview}
        </p>
      </div>

      {unreadCount > 0 && (
        <span style={{
          background: "#bdff00", color: "#1b1b1b",
          border: "2.5px solid #1b1b1b",
          fontSize: 10, fontWeight: 950,
          borderRadius: "6px", minWidth: 20, height: 20,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "0 4px", flexShrink: 0,
          boxShadow: "1.5px 1.5px 0px 0px #1b1b1b",
        }}>{unreadCount}</span>
      )}
      <span style={{ fontSize: 16, color: "#1b1b1b", marginLeft: 4, fontWeight: 900 }}>›</span>
    </button>
  );
}

// ─── Liker Card ──────────────────────────────────────────────────────────────
function LikerCard({ profile, onLike, onPass }) {
  const bg = getBranchBg(profile?.branch);
  return (
    <div style={{
      width: 130,
      flexShrink: 0,
      background: "#ffffff",
      border: "3px solid #1b1b1b",
      boxShadow: "3px 3px 0px 0px #1b1b1b",
      borderRadius: 12,
      padding: "12px 8px 10px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 6,
      textAlign: "center",
      fontFamily: "'Montserrat', sans-serif"
    }}>
      {/* Avatar */}
      <div style={{
        width: 44, height: 44, borderRadius: "50%",
        background: bg, border: "2px solid #1b1b1b",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, boxShadow: "1.5px 1.5px 0px 0px #1b1b1b",
      }}>
        {profile?.avatar || "😊"}
      </div>

      <div style={{ minWidth: 0, width: "100%" }}>
        <p style={{
          margin: 0, fontWeight: 900, fontSize: 11, color: "#1b1b1b",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          textTransform: "uppercase"
        }}>{profile?.name || "…"}</p>
        <p style={{
          margin: "1px 0 0", fontSize: 9, color: "#555", fontWeight: 800,
          textTransform: "uppercase"
        }}>{(profile?.branch || []).slice(0, 1).join("")}</p>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button
          onClick={onPass}
          className="neo-btn"
          style={{
            width: 28, height: 28, borderRadius: "50%",
            border: "2px solid #1b1b1b", background: "#ffb2bf",
            fontSize: 12, fontWeight: 900, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "1.5px 1.5px 0px 0px #1b1b1b",
          }}
        >✕</button>
        <button
          onClick={onLike}
          className="neo-btn"
          style={{
            width: 28, height: 28, borderRadius: "50%",
            border: "2px solid #1b1b1b", background: "#bdff00",
            fontSize: 12, fontWeight: 900, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "1.5px 1.5px 0px 0px #1b1b1b",
          }}
        >💚</button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Matches() {
  const router = useRouter();
  const { user, loading: authLoading } = useRequireAuth();
  const [matchDocs, setMatchDocs] = useState([]);
  const [profiles, setProfiles]   = useState({}); // id → profile data
  const [loading, setLoading]     = useState(true);
  const [myPhone, setMyPhone]     = useState(null);

  const [likesReceived, setLikesReceived]   = useState([]); // Likers' userIds
  const [likersProfiles, setLikersProfiles] = useState({}); // id -> profile

  // Real-time query incoming swipes where swipedId is me and direction is like
  useEffect(() => {
    if (!myPhone) return;

    const qIncoming = query(
      collection(db, "swipes"),
      where("swipedId", "==", myPhone),
      where("direction", "==", "like")
    );
    const unsubIncoming = onSnapshot(qIncoming, snapIncoming => {
      const incomingIds = snapIncoming.docs.map(d => d.data().swiperId);

      // Listen to my own swipes
      const qMySwipes = query(collection(db, "swipes"), where("swiperId", "==", myPhone));
      const unsubMySwipes = onSnapshot(qMySwipes, snapMySwipes => {
        const mySwiped = new Set(snapMySwipes.docs.map(d => d.data().swipedId));
        // Only keep likers whom I have NOT swiped on yet
        const activeLikers = incomingIds.filter(id => !mySwiped.has(id));
        setLikesReceived(activeLikers);
      });

      return () => { unsubMySwipes(); };
    });

    return () => { unsubIncoming(); };
  }, [myPhone]);

  // Fetch profiles of these likers
  useEffect(() => {
    if (!myPhone || likesReceived.length === 0) {
      setLikersProfiles({});
      return;
    }
    const needed = likesReceived.filter(id => !likersProfiles[id]);
    if (needed.length === 0) return;

    Promise.all(needed.map(id => getDoc(doc(db, "profiles", id)))).then(snaps => {
      const updates = {};
      snaps.forEach((snap, i) => {
        if (snap.exists()) updates[needed[i]] = { id: needed[i], ...snap.data() };
      });
      setLikersProfiles(prev => ({ ...prev, ...updates }));
    });
  }, [likesReceived, myPhone]);

  // Handle like back or pass action
  const handleLikerAction = async (likerId, direction) => {
    try {
      await addDoc(collection(db, "swipes"), {
        swiperId: myPhone,
        swipedId: likerId,
        direction: direction,
        timestamp: serverTimestamp(),
      });

      if (direction === "like") {
        await addDoc(collection(db, "matches"), {
          user1Id: myPhone,
          user2Id: likerId,
          matchedAt: serverTimestamp(),
          revealStatus: "hidden",
        });
      }
    } catch (e) {
      console.error("Liker action error:", e);
    }
  };

  // Mutable refs to merge the two real-time queries
  const m1Ref = useRef([]);
  const m2Ref = useRef([]);

  const merge = () => {
    const all = [...m1Ref.current, ...m2Ref.current];
    all.sort((a, b) => {
      const ta = (a.lastMessageAt || a.matchedAt)?.toDate?.() || 0;
      const tb = (b.lastMessageAt || b.matchedAt)?.toDate?.() || 0;
      return tb - ta;
    });
    setMatchDocs(all);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    const phone = user.uid;
    setMyPhone(phone);

    // Listen to matches where current user is user1
    const unsub1 = onSnapshot(
      query(collection(db, "matches"), where("user1Id", "==", phone)),
      snap => {
        m1Ref.current = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        merge();
      }
    );
    // Listen to matches where current user is user2
    const unsub2 = onSnapshot(
      query(collection(db, "matches"), where("user2Id", "==", phone)),
      snap => {
        m2Ref.current = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        merge();
      }
    );

    return () => { unsub1(); unsub2(); };
  }, [user]);

  // Fetch profiles for all matched users (batch, cached)
  useEffect(() => {
    if (!myPhone || matchDocs.length === 0) return;
    const needed = matchDocs
      .map(m => m.user1Id === myPhone ? m.user2Id : m.user1Id)
      .filter(id => id && !profiles[id]);
    if (needed.length === 0) return;

    Promise.all(needed.map(id => getDoc(doc(db, "profiles", id)))).then(snaps => {
      const updates = {};
      snaps.forEach((snap, i) => {
        if (snap.exists()) updates[needed[i]] = snap.data();
      });
      setProfiles(prev => ({ ...prev, ...updates }));
    });
  }, [matchDocs.length, myPhone]);

  // ── Render ──
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
        }
        .neo-btn {
          transition: all 0.1s ease;
        }
        .neo-btn:active {
          transform: translate(2px, 2px) !important;
          box-shadow: 0px 0px 0px 0px #1b1b1b !important;
        }
      `}</style>

      <div style={{
        minHeight: "100vh",
        fontFamily: "'Montserrat', sans-serif",
        paddingBottom: 110,
      }}>
        {/* Header */}
        <div style={{
          background: "#ffffff",
          borderBottom: "3px solid #1b1b1b",
          padding: "18px 20px",
          position: "sticky", top: 0, zIndex: 10,
          boxShadow: "0px 4px 0px 0px rgba(0,0,0,1)"
        }}>
          <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 6,
                background: "#ffd9de", border: "2px solid #1b1b1b",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, boxShadow: "2px 2px 0px 0px #1b1b1b"
              }}>💬</div>
              <span style={{ fontWeight: 950, fontSize: 16, color: "#1b1b1b", textTransform: "uppercase" }}>Inbox</span>
            </div>
            {!loading && matchDocs.length > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 900, color: "#1b1b1b", background: "#ffffff",
                padding: "4px 8px", border: "2px solid #1b1b1b", boxShadow: "1.5px 1.5px 0px 0px #1b1b1b",
                textTransform: "uppercase"
              }}>
                {matchDocs.length} MATCH{matchDocs.length > 1 ? "ES" : ""}
              </span>
            )}
          </div>
        </div>

        <div style={{ maxWidth: 480, margin: "0 auto", padding: "16px 20px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 48 }}>
              <div style={{ fontSize: 40, animation: "spin 1.2s linear infinite" }}>💫</div>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : (
            <>
              {/* LIKES YOU section */}
              {likesReceived.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <h3 style={{
                    margin: "0 0 12px", fontSize: 11, fontWeight: 950,
                    color: "#1b1b1b", textTransform: "uppercase", letterSpacing: "0.08em"
                  }}>
                    ⚡ {likesReceived.length} People Who Liked You
                  </h3>
                  <div style={{
                    display: "flex", gap: 14, overflowX: "auto",
                    paddingBottom: 10, margin: "0 -20px", paddingLeft: 20, paddingRight: 20,
                    WebkitOverflowScrolling: "touch"
                  }}>
                    {likesReceived.map(id => {
                      const prof = likersProfiles[id];
                      if (!prof) return null;
                      return (
                        <LikerCard
                          key={id}
                          profile={prof}
                          onLike={() => handleLikerAction(id, "like")}
                          onPass={() => handleLikerAction(id, "pass")}
                        />
                      );
                    })}
                  </div>
                  <hr style={{ border: "none", borderTop: "2.5px dashed #1b1b1b", margin: "20px 0 0" }} />
                </div>
              )}

              {matchDocs.length === 0 ? (
                <div style={{
                  background: "#ffffff",
                  border: "3px solid #1b1b1b",
                  boxShadow: "6px 6px 0px 0px #1b1b1b",
                  borderRadius: 16,
                  padding: "48px 28px", textAlign: "center",
                  marginTop: 10,
                }}>
                  <div style={{ fontSize: 56, marginBottom: 14 }}>💬</div>
                  <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 950, color: "#1b1b1b", textTransform: "uppercase" }}>No matches yet</h2>
                  <p style={{ margin: "0 0 24px", fontSize: 13, color: "#555", fontWeight: 700, lineHeight: 1.6 }}>
                    Swipe right on people you like — when they like you back, they'll appear here.
                  </p>
                  <button onClick={() => router.push("/swipe")} className="neo-btn" style={{
                    padding: "12px 28px", borderRadius: 8, border: "3px solid #1b1b1b",
                    background: "#bdff00", color: "#1b1b1b", fontWeight: 950,
                    fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                    boxShadow: "4px 4px 0px 0px #1b1b1b",
                    textTransform: "uppercase"
                  }}>Go swipe 🔥</button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {matchDocs.map(match => {
                    const otherId = match.user1Id === myPhone ? match.user2Id : match.user1Id;
                    return (
                      <MatchRow
                        key={match.id}
                        match={match}
                        profile={profiles[otherId]}
                        myPhone={myPhone}
                        onClick={() => router.push(`/chat/${match.id}`)}
                      />
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        <NavBar active="/matches" />
      </div>
    </>
  );
}
