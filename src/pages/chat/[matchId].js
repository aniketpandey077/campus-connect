// src/pages/chat/[matchId].js
// Real-time chat between two matched users.
// Reveal: toggle-based button in header (no message threshold).
// Report + Block in ⋮ menu.
// TODO: replace localStorage "cc_phone" with auth.currentUser.uid once Firebase Auth is live.

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import {
  collection, query, orderBy, onSnapshot,
  doc, getDoc, addDoc, updateDoc,
  increment, arrayUnion, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useRequireAuth } from "../../lib/useAuth";

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
function msgTime(ts) {
  if (!ts?.toDate) return "";
  return ts.toDate().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

const REPORT_REASONS = ["Harassment", "Fake profile", "Inappropriate content", "Spam", "Other"];

// ─── Avatar circle ────────────────────────────────────────────────────────────
function Avatar({ profile, size = 38, revealed = false }) {
  const gradient = getGradient(profile?.branch);
  const showPhoto = revealed && profile?.photoUrl;
  return showPhoto ? (
    <img
      src={profile.photoUrl}
      alt={profile?.name || ""}
      style={{
        width: size, height: size, borderRadius: "50%",
        objectFit: "cover", border: "2px solid #10B981",
        flexShrink: 0,
      }}
    />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: gradient, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.5,
      border: revealed && !profile?.photoUrl ? "2px solid #10B981" : "none",
    }}>
      {revealed && !profile?.photoUrl ? "🙈" : (profile?.avatar || "😊")}
    </div>
  );
}

// ─── Chat bubble ──────────────────────────────────────────────────────────────
function Bubble({ msg, isMe, otherProfile, showAvatar, revealed }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: isMe ? "row-reverse" : "row",
      alignItems: "flex-end",
      gap: 7, marginBottom: 3,
    }}>
      {!isMe && (
        <div style={{ width: 28, height: 28, flexShrink: 0 }}>
          {showAvatar
            ? <Avatar profile={otherProfile} size={28} revealed={revealed} />
            : <div style={{ width: 28, height: 28 }} />
          }
        </div>
      )}
      <div style={{
        maxWidth: "72%",
        padding: "10px 14px",
        borderRadius: isMe ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
        background: isMe ? "#FF4757" : "#fff",
        color: isMe ? "#fff" : "#111",
        fontSize: 14, lineHeight: 1.5,
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
      }}>
        <div>{msg.content}</div>
        <div style={{
          fontSize: 10, marginTop: 3, textAlign: "right",
          color: isMe ? "rgba(255,255,255,0.55)" : "#C0BDB8",
        }}>{msgTime(msg.timestamp)}</div>
      </div>
    </div>
  );
}

// ─── Report modal (bottom sheet) ──────────────────────────────────────────────
function ReportModal({ onSubmit, onClose }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy]     = useState(false);
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "flex-end",
      fontFamily: "inherit",
    }}>
      <div style={{
        width: "100%", background: "#fff",
        borderRadius: "22px 22px 0 0",
        padding: "20px 20px 40px",
        animation: "slideUp 0.3s cubic-bezier(.22,1,.36,1)",
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "#E0DED8", margin: "0 auto 18px" }} />
        <h3 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 900 }}>Report</h3>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#888" }}>
          We'll review this within 24 hours.
        </p>
        <select
          value={reason} onChange={e => setReason(e.target.value)}
          style={{
            width: "100%", padding: "12px 14px", borderRadius: 12,
            border: "2px solid #E0DED8", fontSize: 14, fontFamily: "inherit",
            color: "#111", background: "#fff", marginBottom: 16,
          }}
        >
          <option value="">Select a reason…</option>
          {REPORT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={outlineBtn}>Cancel</button>
          <button
            onClick={async () => {
              if (!reason) return;
              setBusy(true);
              await onSubmit(reason);
            }}
            disabled={!reason || busy}
            style={{ ...fillBtn("#FF4757"), opacity: !reason || busy ? 0.5 : 1 }}
          >{busy ? "Submitting…" : "Submit"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── ⋮ dropdown menu ──────────────────────────────────────────────────────────
function ChatMenu({ onReport, onBlock, onClose }) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 90 }} />
      <div style={{
        position: "absolute", top: 52, right: 16, zIndex: 100,
        background: "#fff", borderRadius: 14,
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        overflow: "hidden", minWidth: 160,
      }}>
        <button onClick={() => { onClose(); onReport(); }} style={menuItemStyle()}>
          🚩 Report
        </button>
        <div style={{ height: 1, background: "#F0EEE8" }} />
        <button onClick={() => { onClose(); onBlock(); }} style={{ ...menuItemStyle(), color: "#DC2626" }}>
          🚫 Block
        </button>
      </div>
    </>
  );
}
function menuItemStyle() {
  return {
    display: "block", width: "100%", padding: "13px 18px",
    background: "none", border: "none", textAlign: "left",
    fontSize: 14, fontWeight: 600, cursor: "pointer",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: "#111",
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Chat() {
  const router = useRouter();
  const { user, loading: authLoading } = useRequireAuth();
  const { matchId } = router.query;

  const [myPhone,      setMyPhone]      = useState(null);
  const [matchData,    setMatchData]    = useState(null);
  const [otherProfile, setOtherProfile] = useState(null);
  const [myProfile,    setMyProfile]    = useState(null);
  const [messages,     setMessages]     = useState([]);
  const [input,        setInput]        = useState("");
  const [loading,      setLoading]      = useState(true);
  const [sending,      setSending]      = useState(false);
  const [showMenu,     setShowMenu]     = useState(false);
  const [showReport,   setShowReport]   = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const myPhoneRef = useRef(null);

  // ── Auth ──
  useEffect(() => {
    if (!user) return;
    setMyPhone(user.uid);
    myPhoneRef.current = user.uid;
  }, [user]);

  // ── Load match + other profile + my profile ──
  useEffect(() => {
    if (!router.isReady || !matchId || !myPhoneRef.current) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "matches", matchId));
        if (!snap.exists()) { router.push("/matches"); return; }
        const data = { id: snap.id, ...snap.data() };
        if (data.user1Id !== myPhoneRef.current && data.user2Id !== myPhoneRef.current) {
          setAccessDenied(true); return;
        }
        const otherId = data.user1Id === myPhoneRef.current ? data.user2Id : data.user1Id;
        const profSnap = await getDoc(doc(db, "profiles", otherId));
        if (profSnap.exists()) setOtherProfile({ id: otherId, ...profSnap.data() });
        const myProfSnap = await getDoc(doc(db, "profiles", myPhoneRef.current));
        if (myProfSnap.exists()) setMyProfile({ id: myPhoneRef.current, ...myProfSnap.data() });
        setLoading(false);
      } catch (e) {
        console.error("loadMatch:", e);
        setLoading(false);
      }
    })();
  }, [router.isReady, matchId]);

  // ── Real-time match doc (reveal state, etc.) ──
  useEffect(() => {
    if (!matchId) return;
    return onSnapshot(doc(db, "matches", matchId), snap => {
      if (snap.exists()) setMatchData({ id: snap.id, ...snap.data() });
    });
  }, [matchId]);

  // ── Reset unread count on open/update ──
  useEffect(() => {
    if (!matchData || !myPhone) return;
    const isUser1 = matchData.user1Id === myPhone;
    const myUnreadField = isUser1 ? "user1Unread" : "user2Unread";
    if (matchData[myUnreadField] && matchData[myUnreadField] > 0) {
      updateDoc(doc(db, "matches", matchId), {
        [myUnreadField]: 0
      }).catch(err => console.error("Reset unread error:", err));
    }
  }, [matchData, myPhone, matchId]);

  // ── Real-time messages ──
  useEffect(() => {
    if (!matchId) return;
    return onSnapshot(
      query(collection(db, "chats", matchId, "messages"), orderBy("timestamp", "asc")),
      snap => setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [matchId]);

  // ── Auto-scroll ──
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // ── Send message ──
  const sendMessage = async () => {
    const content = input.trim();
    if (!content || sending || !matchId || !myPhoneRef.current || !matchData) return;
    setSending(true);
    setInput("");
    try {
      const phone = myPhoneRef.current;
      const isUser1 = matchData.user1Id === phone;
      const unreadField = isUser1 ? "user2Unread" : "user1Unread";

      await addDoc(collection(db, "chats", matchId, "messages"), {
        senderId: phone, content, timestamp: serverTimestamp(),
      });
      await updateDoc(doc(db, "matches", matchId), {
        messageCount: increment(1),
        lastMessage: content,
        lastMessageAt: serverTimestamp(),
        lastSenderId: phone,
        [unreadField]: increment(1),
      });
    } catch (e) {
      console.error("send:", e);
      setInput(content);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  // ── Toggle reveal ──
  const toggleReveal = async () => {
    if (!matchData || !myPhoneRef.current) return;
    const isFullyRevealed = matchData.revealStatus === "revealed";
    if (isFullyRevealed) return; // locked — cannot un-reveal once both agreed

    const phone    = myPhoneRef.current;
    const isUser1  = matchData.user1Id === phone;
    const myField  = isUser1 ? "user1WantsReveal" : "user2WantsReveal";
    const theirField = isUser1 ? "user2WantsReveal" : "user1WantsReveal";
    const currentVal = matchData[myField] || false;
    const newVal   = !currentVal;

    const updates  = { [myField]: newVal };
    // Both now want reveal → lock it
    if (newVal && matchData[theirField] === true) {
      updates.revealStatus = "revealed";
    }
    try {
      await updateDoc(doc(db, "matches", matchId), updates);
    } catch (e) {
      console.error("toggleReveal:", e);
    }
  };

  // ── Report ──
  const submitReport = async (reason) => {
    const phone   = myPhoneRef.current;
    const otherId = matchData.user1Id === phone ? matchData.user2Id : matchData.user1Id;
    try {
      await addDoc(collection(db, "reports"), {
        reporterId: phone, reportedId: otherId, reason,
        matchId, status: "pending", timestamp: serverTimestamp(),
      });
      setShowReport(false);
      alert("Report submitted ✓");
    } catch (e) { alert("Failed to submit."); }
  };

  // ── Block ──
  const blockUser = async () => {
    const phone   = myPhoneRef.current;
    const otherId = matchData.user1Id === phone ? matchData.user2Id : matchData.user1Id;
    if (!confirm(`Block ${otherProfile?.name || "this person"}? They won't appear in your swipe deck.`)) return;
    try {
      await updateDoc(doc(db, "profiles", phone), { blockedUsers: arrayUnion(otherId) });
      router.push("/matches");
    } catch (e) { console.error("block:", e); }
  };

  // ── Computed reveal values ──
  const isUser1        = matchData?.user1Id === myPhone;
  const isFullyRevealed = matchData?.revealStatus === "revealed";
  const myWantsReveal   = isUser1 ? (matchData?.user1WantsReveal || false) : (matchData?.user2WantsReveal || false);
  const theyWantReveal  = isUser1 ? (matchData?.user2WantsReveal || false) : (matchData?.user1WantsReveal || false);

  // Status text shown under name in header
  let revealStatusText = "";
  if (isFullyRevealed) {
    revealStatusText = "Photos revealed 🔓";
  } else if (myWantsReveal && !theyWantReveal) {
    revealStatusText = `Waiting for ${otherProfile?.name || "them"}…`;
  } else if (!myWantsReveal && theyWantReveal) {
    revealStatusText = `${otherProfile?.name || "They"} wants to reveal 👁️ — tap to agree!`;
  }

  // Reveal button appearance
  const revealBtnColor = isFullyRevealed
    ? "#10B981"
    : myWantsReveal ? "#FF4757" : "#C0BDB8";
  const revealBtnBg = isFullyRevealed
    ? "#DCFCE7"
    : myWantsReveal ? "#FFF0F1" : "#F5F4F0";
  const revealBtnLabel = isFullyRevealed ? "🔓" : "👁️";
  const revealBtnTitle = isFullyRevealed
    ? "Photos revealed"
    : myWantsReveal ? "Click to cancel reveal request" : "Request photo reveal";

  // Guards
  if (accessDenied) return <Shell><p style={{ color: "#C62828", fontWeight: 600 }}>You don't have access to this chat.</p></Shell>;
  if (loading || !matchData) return (
    <Shell>
      <div style={{ fontSize: 40, animation: "spin 1.2s linear infinite" }}>💬</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </Shell>
  );

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #F5F4F0; }
        @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        textarea:focus { outline: none; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>

      {showReport && <ReportModal onSubmit={submitReport} onClose={() => setShowReport(false)} />}

      <div style={{
        display: "flex", flexDirection: "column",
        height: "100dvh", overflow: "hidden",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        background: "#F5F4F0", position: "relative",
      }}>

        {/* ── Header ── */}
        <header style={{
          background: "#fff", borderBottom: "1px solid #EDECE8",
          padding: "10px 12px",
          display: "flex", alignItems: "center", gap: 10,
          flexShrink: 0, position: "relative",
        }}>
          {/* Back */}
          <button onClick={() => router.push("/matches")} style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 22, color: "#FF4757", fontFamily: "inherit", padding: "4px 6px 4px 0",
          }}>‹</button>

          {/* Avatar — shows photo if revealed */}
          {isFullyRevealed ? (
            <div style={{ display: "flex", alignItems: "center", position: "relative", width: 56, height: 40, flexShrink: 0 }}>
              <div style={{ position: "absolute", left: 0, zIndex: 2 }}>
                <Avatar profile={otherProfile} size={32} revealed={true} />
              </div>
              <div style={{ position: "absolute", left: 20, zIndex: 1, opacity: 0.9 }}>
                <Avatar profile={myProfile} size={32} revealed={true} />
              </div>
            </div>
          ) : (
            <Avatar profile={otherProfile} size={40} revealed={false} />
          )}

          {/* Name + status */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              margin: 0, fontWeight: 800, fontSize: 15, color: "#0D0D0D",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{otherProfile?.name || "…"}</p>

            {revealStatusText ? (
              <p style={{
                margin: "1px 0 0", fontSize: 11, fontWeight: 600,
                color: isFullyRevealed ? "#10B981" : theyWantReveal ? "#FF4757" : "#AAA",
                animation: theyWantReveal && !myWantsReveal ? "pulse 2s infinite" : "none",
              }}>{revealStatusText}</p>
            ) : (
              <p style={{ margin: "1px 0 0", fontSize: 11, color: "#C0BDB8", fontWeight: 500 }}>
                {(otherProfile?.branch || []).slice(0, 1).join("")}
                {otherProfile?.year?.[0] ? ` · ${otherProfile.year[0]}` : ""}
              </p>
            )}
          </div>

          {/* 👁️ Reveal toggle button */}
          <button
            onClick={toggleReveal}
            title={revealBtnTitle}
            style={{
              width: 36, height: 36, borderRadius: 10, border: "none",
              background: revealBtnBg,
              color: revealBtnColor,
              fontSize: 17, cursor: isFullyRevealed ? "default" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "inherit", flexShrink: 0,
              transition: "all 0.2s",
              boxShadow: myWantsReveal ? `0 2px 8px ${revealBtnColor}40` : "none",
            }}
          >{revealBtnLabel}</button>

          {/* ⋮ menu */}
          <button onClick={() => setShowMenu(v => !v)} style={{
            width: 36, height: 36, borderRadius: 10, border: "none",
            background: "#F5F4F0", color: "#888", fontSize: 20,
            cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>⋮</button>

          {showMenu && (
            <ChatMenu
              onReport={() => setShowReport(true)}
              onBlock={blockUser}
              onClose={() => setShowMenu(false)}
            />
          )}
        </header>

        {/* ── Messages ── */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "16px",
          WebkitOverflowScrolling: "touch",
          display: "flex", flexDirection: "column", gap: 2,
        }}>
          {messages.length === 0 && (
            <div style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 10, opacity: 0.7,
            }}>
              <Avatar profile={otherProfile} size={56} revealed={isFullyRevealed} />
              <p style={{ margin: 0, fontSize: 14, color: "#888", fontWeight: 600, textAlign: "center" }}>
                You matched with {otherProfile?.name}!<br />
                <span style={{ fontWeight: 400 }}>Break the ice 👋</span>
              </p>
            </div>
          )}

          {messages.map((msg, i) => {
            const isMe = msg.senderId === myPhone;
            const prev = messages[i - 1];
            const showAvatar = !isMe && prev?.senderId !== msg.senderId;
            return (
              <Bubble
                key={msg.id}
                msg={msg}
                isMe={isMe}
                otherProfile={otherProfile}
                showAvatar={showAvatar}
                revealed={isFullyRevealed}
              />
            );
          })}
          <div ref={bottomRef} style={{ height: 1 }} />
        </div>

        {/* ── Input bar ── */}
        <div style={{
          flexShrink: 0,
          background: "#fff",
          borderTop: "1px solid #EDECE8",
          padding: "10px 12px 16px",
          display: "flex", gap: 10, alignItems: "flex-end",
        }}>
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={e => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
            }}
            placeholder="Message…"
            style={{
              flex: 1, padding: "10px 14px", borderRadius: 22,
              border: "2px solid #E0DED8", fontSize: 14,
              fontFamily: "inherit", resize: "none",
              lineHeight: 1.5, background: "#F5F4F0",
              color: "#111", maxHeight: 120, overflow: "hidden",
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            style={{
              width: 44, height: 44, borderRadius: "50%", border: "none",
              background: input.trim() && !sending ? "#FF4757" : "#E0DED8",
              color: input.trim() && !sending ? "#fff" : "#AAA",
              fontSize: 18, cursor: input.trim() ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: input.trim() ? "0 3px 12px #FF475750" : "none",
              transition: "all 0.15s", fontFamily: "inherit", flexShrink: 0,
            }}
          >{sending ? "…" : "↑"}</button>
        </div>
      </div>
    </>
  );
}

function Shell({ children }) {
  return (
    <div style={{
      height: "100dvh", background: "#F5F4F0",
      display: "flex", alignItems: "center", justifyContent: "center",
      gap: 12, flexDirection: "column",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>{children}</div>
  );
}

const outlineBtn = { flex: 1, padding: 13, borderRadius: 12, border: "2px solid #E0DED8", background: "transparent", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", color: "#666" };
function fillBtn(bg) { return { flex: 2, padding: 13, borderRadius: 12, border: "none", background: bg, color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }; }
