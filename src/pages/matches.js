// src/pages/matches.js
// Real-time inbox — lists mutual matches with last message preview.
// Tapping a match opens the chat screen.
// TODO: replace localStorage "cc_phone" with auth.currentUser.uid once Firebase Auth is live.

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import {
  collection, query, where, onSnapshot, doc, getDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import NavBar from "../components/NavBar";
import { useRequireAuth } from "../lib/useAuth";

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
  return `linear-gradient(135deg, ${a}, ${b})`;
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
        background: "#fff", border: "none", borderRadius: 16,
        padding: "14px 16px", cursor: "pointer", fontFamily: "inherit",
        boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
        transition: "transform 0.12s",
        textAlign: "left",
      }}
      onMouseDown={e => (e.currentTarget.style.transform = "scale(0.98)")}
      onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
    >
      {/* Avatar */}
      <div style={{
        width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
        background: getGradient(profile?.branch),
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 26, boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
      }}>
        {profile?.avatar || "😊"}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: "#0D0D0D" }}>
            {profile?.name || "…"}
          </span>
          <span style={{ fontSize: 11, color: unreadCount > 0 ? "#FF4757" : "#C0BDB8", fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>
            {timeAgo(lastTime)}
          </span>
        </div>
        <p style={{
          margin: 0, fontSize: 13, color: unreadCount > 0 ? "#111" : "#666",
          fontWeight: unreadCount > 0 ? 700 : 400,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {preview}
        </p>
      </div>

      {unreadCount > 0 && (
        <span style={{
          background: "#FF4757", color: "#fff",
          fontSize: 10, fontWeight: 900,
          borderRadius: 999, minWidth: 18, height: 18,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "0 5px", flexShrink: 0,
        }}>{unreadCount}</span>
      )}
      <span style={{ fontSize: 16, color: "#DDD", marginLeft: 4 }}>›</span>
    </button>
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
        * { box-sizing: border-box; }
        body { margin: 0; background: #F5F4F0; }
      `}</style>

      <div style={{
        minHeight: "100dvh", background: "#F5F4F0",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        paddingBottom: 90,
      }}>
        {/* Header */}
        <div style={{
          background: "#fff", borderBottom: "1px solid #EDECE8",
          padding: "18px 20px",
          position: "sticky", top: 0, zIndex: 10,
        }}>
          <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: "#FF4757", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, boxShadow: "0 3px 10px #FF475740" }}>🔥</div>
              <span style={{ fontWeight: 800, fontSize: 15, color: "#0D0D0D" }}>Inbox</span>
            </div>
            {!loading && matchDocs.length > 0 && (
              <span style={{ fontSize: 12, fontWeight: 700, color: "#AAA" }}>
                {matchDocs.length} match{matchDocs.length > 1 ? "es" : ""}
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
          ) : matchDocs.length === 0 ? (
            <div style={{
              background: "#fff", borderRadius: 20, padding: "48px 28px",
              textAlign: "center", boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
              marginTop: 20,
            }}>
              <div style={{ fontSize: 56, marginBottom: 14 }}>💬</div>
              <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 900, color: "#0D0D0D" }}>No matches yet</h2>
              <p style={{ margin: "0 0 24px", fontSize: 14, color: "#888", lineHeight: 1.6 }}>
                Swipe right on people you like — when they like you back, they'll appear here.
              </p>
              <button onClick={() => router.push("/swipe")} style={{
                padding: "12px 28px", borderRadius: 12, border: "none",
                background: "#FF4757", color: "#fff", fontWeight: 800,
                fontSize: 14, cursor: "pointer", fontFamily: "inherit",
                boxShadow: "0 4px 14px #FF475750",
              }}>Go swipe 🔥</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
        </div>

        <NavBar active="/matches" />
      </div>
    </>
  );
}
