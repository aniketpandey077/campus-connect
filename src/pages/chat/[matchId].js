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
// ─── Helpers ──────────────────────────────────────────────────────────────────
const BRANCH_BGS = {
  CSE: "#ffd9de", IT: "#ecdcff", ECE: "#d6baff", Mechanical: "#eeeeee",
  Civil: "#f0fdf4", EEE: "#fef3c7", Biotech: "#dcfce7", Chemical: "#ffedd5",
  "MBA/BBA": "#fdf2f8"
};

function getBranchBg(branches = []) {
  return BRANCH_BGS[branches?.[0]] || "#bdff00";
}

function msgTime(ts) {
  if (!ts?.toDate) return "";
  return ts.toDate().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

const REPORT_REASONS = ["Harassment", "Fake profile", "Inappropriate content", "Spam", "Other"];

// ─── Avatar circle ────────────────────────────────────────────────────────────
function Avatar({ profile, size = 38, revealed = false }) {
  const bg = getBranchBg(profile?.branch);
  const showPhoto = revealed && profile?.photoUrl;
  const showBlurred = !revealed && profile?.blurredPhotoUrl;

  if (showPhoto) {
    return (
      <img
        src={profile.photoUrl}
        alt={profile?.name || ""}
        style={{
          width: size, height: size, borderRadius: "50%",
          objectFit: "cover", border: "2px solid #1b1b1b",
          flexShrink: 0,
          boxShadow: "1.5px 1.5px 0px 0px #1b1b1b",
        }}
      />
    );
  }

  if (showBlurred) {
    return (
      <img
        src={profile.blurredPhotoUrl}
        alt={profile?.name || ""}
        style={{
          width: size, height: size, borderRadius: "50%",
          objectFit: "cover", border: "2px solid #1b1b1b",
          flexShrink: 0,
          boxShadow: "1.5px 1.5px 0px 0px #1b1b1b",
          filter: "blur(0.8px) contrast(1.05)",
        }}
      />
    );
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: bg, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.5,
      border: "2px solid #1b1b1b",
      boxShadow: "1.5px 1.5px 0px 0px #1b1b1b",
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
      gap: 8, marginBottom: 8,
      fontFamily: "'Montserrat', sans-serif",
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
        borderRadius: isMe ? "12px 2px 12px 12px" : "2px 12px 12px 12px",
        background: isMe ? "#ecdcff" : "#fff",
        color: "#1b1b1b",
        border: "2.5px solid #1b1b1b",
        fontSize: 13, lineHeight: 1.5,
        fontWeight: 700,
        boxShadow: "3px 3px 0px 0px #1b1b1b",
        wordBreak: "break-word",
        overflowWrap: "break-word",
      }}>
        <div>{msg.content}</div>
        <div style={{
          fontSize: 9, marginTop: 4, textAlign: "right",
          color: "#555", fontWeight: 800,
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
      background: "rgba(27,27,27,0.85)",
      backdropFilter: "blur(4px)",
      display: "flex", alignItems: "flex-end",
      fontFamily: "'Montserrat', sans-serif",
    }}>
      <div style={{
        width: "100%", background: "#fff",
        borderTop: "4px solid #1b1b1b",
        borderLeft: "4px solid #1b1b1b",
        borderRight: "4px solid #1b1b1b",
        borderRadius: "24px 24px 0 0",
        padding: "20px 20px 40px",
        boxShadow: "0px -4px 0px 0px rgba(0,0,0,1)",
        animation: "slideUp 0.3s cubic-bezier(.22,1,.36,1)",
      }}>
        <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
        <div style={{ width: 44, height: 6, borderRadius: 3, background: "#1b1b1b", margin: "0 auto 18px" }} />
        <h3 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 950, color: "#1b1b1b", textTransform: "uppercase" }}>Report</h3>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#555", fontWeight: 700 }}>
          We'll review this within 24 hours.
        </p>
        <select
          value={reason} onChange={e => setReason(e.target.value)}
          style={{
            width: "100%", padding: "12px 14px", borderRadius: 8,
            border: "2.5px solid #1b1b1b", fontSize: 13, fontFamily: "inherit",
            fontWeight: 800,
            color: "#1b1b1b", background: "#fff", marginBottom: 20,
            boxShadow: "2px 2px 0px 0px #1b1b1b",
          }}
        >
          <option value="">Select a reason…</option>
          {REPORT_REASONS.map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
        </select>
        <div style={{ display: "flex", gap: 14 }}>
          <button onClick={onClose} style={outlineBtn}>Cancel</button>
          <button
            onClick={async () => {
              if (!reason) return;
              setBusy(true);
              await onSubmit(reason);
            }}
            disabled={!reason || busy}
            className="neo-btn"
            style={{ ...fillBtn("#bdff00"), opacity: !reason || busy ? 0.5 : 1, boxShadow: !reason || busy ? "none" : "4px 4px 0px 0px #1b1b1b" }}
          >{busy ? "SUBMITTING…" : "SUBMIT"}</button>
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
        position: "absolute", top: 62, right: 16, zIndex: 100,
        background: "#fff", border: "3px solid #1b1b1b", borderRadius: 8,
        boxShadow: "4px 4px 0px 0px #1b1b1b",
        overflow: "hidden", minWidth: 160,
      }}>
        <button onClick={() => { onClose(); onReport(); }} style={menuItemStyle()}>
          🚩 Report
        </button>
        <div style={{ height: 3, background: "#1b1b1b" }} />
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
    fontSize: 11, fontWeight: 900, cursor: "pointer",
    fontFamily: "'Montserrat', sans-serif",
    textTransform: "uppercase",
    color: "#1b1b1b",
  };
}

// ─── Profile Modal ────────────────────────────────────────────────────────────
function ProfileModal({ profile, revealed, onClose }) {
  if (!profile) return null;
  const isHostel = (stayVal) => stayVal && (stayVal.startsWith("BH") || stayVal.startsWith("GH") || stayVal.includes("Hostel"));

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.5)", display: "flex",
      alignItems: "center", justifyContent: "center",
      padding: 16,
    }} onClick={onClose}>
      <div style={{
        background: "#ffffff", border: "3px solid #1b1b1b",
        borderRadius: 16, boxShadow: "8px 8px 0px 0px #1b1b1b",
        width: "100%", maxWidth: 400, overflow: "hidden",
        position: "relative",
      }} onClick={e => e.stopPropagation()}>
        {/* Close Button */}
        <button 
          onClick={onClose}
          style={{
            position: "absolute", top: 14, right: 14, zIndex: 10,
            background: "#ffffff", border: "2px solid #1b1b1b",
            borderRadius: "50%", width: 32, height: 32,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 900, cursor: "pointer", boxShadow: "2px 2px 0px 0px #1b1b1b"
          }}
        >✕</button>

        {/* Blurred / Unblurred Photo */}
        <div style={{
          height: 200, background: "#f0edec", position: "relative",
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden", borderBottom: "3px solid #1b1b1b"
        }}>
          {revealed && profile.photoUrl ? (
            <img 
              src={profile.photoUrl} 
              alt={profile.name} 
              style={{ width: "100%", height: "100%", objectFit: "cover" }} 
            />
          ) : profile.blurredPhotoUrl ? (
            <img 
              src={profile.blurredPhotoUrl} 
              alt={profile.name} 
              style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(1.2px) contrast(1.05)" }} 
            />
          ) : (
            <div style={{ fontSize: 72 }}>{profile.avatar || "😊"}</div>
          )}

          {/* Verification Badge */}
          <div style={{
            position: "absolute", bottom: 12, left: 12,
            background: profile.verificationStatus === "approved" ? "#bdff00" : "#ffb2bf",
            border: "1.5px solid #1b1b1b", borderRadius: 4,
            padding: "3px 8px", fontSize: 9, fontWeight: 950, color: "#1b1b1b",
            boxShadow: "1px 1px 0px 0px #1b1b1b",
          }}>
            {profile.verificationStatus === "approved" ? "VERIFIED 🛡️" : "PENDING ⏳"}
          </div>
        </div>

        {/* Details Container */}
        <div style={{ padding: "16px 18px 24px", maxHeight: "60vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Header Name */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 52, height: 52, borderRadius: "50%", background: "#bdff00",
              border: "2px solid #1b1b1b", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, boxShadow: "2px 2px 0px 0px #1b1b1b"
            }}>{profile.avatar || "😊"}</div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 950, color: "#1b1b1b", textTransform: "uppercase" }}>{profile.name}</h3>
              <p style={{ margin: 0, fontSize: 11, color: "#555", fontWeight: 800, textTransform: "uppercase" }}>
                {(profile.branch || []).join(" + ")} · {profile.year?.[0]}
              </p>
              {profile.username && (
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "#7531d3", fontWeight: 900 }}>
                  @{profile.username.toLowerCase()}
                </p>
              )}
            </div>
          </div>

          {/* Stay / Vibes */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(profile.stay || []).map(s => (
              <span key={s} style={{
                display: "inline-block", padding: "4px 10px", borderRadius: 6,
                background: isHostel(s) ? "#DCFCE7" : "#EEF2FF",
                color: isHostel(s) ? "#15803D" : "#4338CA",
                border: "2px solid #1b1b1b", fontSize: 10, fontWeight: 800,
                boxShadow: "1.5px 1.5px 0px 0px #1b1b1b"
              }}>
                {isHostel(s) ? "🏠 " : "🏡 "}{s}
              </span>
            ))}
            {(profile.campusVibe || []).map(v => (
              <span key={v} style={{
                display: "inline-block", padding: "4px 10px", borderRadius: 6,
                background: "#FEF3C7", color: "#92400E",
                border: "2px solid #1b1b1b", fontSize: 10, fontWeight: 800,
                boxShadow: "1.5px 1.5px 0px 0px #1b1b1b"
              }}>{v}</span>
            ))}
          </div>

          {/* Interests */}
          {(profile.interests || []).length > 0 && (
            <div>
              <p style={{ margin: "0 0 6px", fontSize: 9, fontWeight: 900, color: "#BCBCBC", textTransform: "uppercase", letterSpacing: "0.08em" }}>Interests</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {(profile.interests || []).map(i => (
                  <span key={i} style={{
                    display: "inline-block", padding: "4px 10px", borderRadius: 6,
                    background: "#ffffff", border: "2px solid #1b1b1b", fontSize: 10, fontWeight: 800,
                    boxShadow: "1.5px 1.5px 0px 0px #1b1b1b"
                  }}>{i}</span>
                ))}
              </div>
            </div>
          )}

          {/* Saturday Plan */}
          {(profile.weekendVibe || []).length > 0 && (
            <div style={{ background: "#F5F4F0", borderRadius: 12, padding: "10px 12px", border: "2.5px solid #1b1b1b", boxShadow: "2px 2px 0px 0px #1b1b1b" }}>
              <p style={{ margin: "0 0 3px", fontSize: 9, fontWeight: 900, color: "#BCBCBC", textTransform: "uppercase", letterSpacing: "0.08em" }}>Ideal Saturday</p>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#222" }}>{(profile.weekendVibe || []).join("  ·  ")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
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
  const [showProfileModal, setShowProfileModal] = useState(false);

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
    if (!router.isReady || !matchId || !myPhone) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "matches", matchId));
        if (!snap.exists()) { router.push("/matches"); return; }
        const data = { id: snap.id, ...snap.data() };
        if (data.user1Id !== myPhone && data.user2Id !== myPhone) {
          setAccessDenied(true); return;
        }
        const otherId = data.user1Id === myPhone ? data.user2Id : data.user1Id;
        const profSnap = await getDoc(doc(db, "profiles", otherId));
        if (profSnap.exists()) {
          const otherData = profSnap.data();
          if (data.revealStatus !== "revealed") {
            delete otherData.photoUrl; // Security: delete photoUrl until mutual reveal
          }
          setOtherProfile({ id: otherId, ...otherData });
        }
        const myProfSnap = await getDoc(doc(db, "profiles", myPhone));
        if (myProfSnap.exists()) {
          const myData = myProfSnap.data();
          if (data.revealStatus !== "revealed") {
            delete myData.photoUrl; // Security: delete photoUrl until mutual reveal
          }
          setMyProfile({ id: myPhone, ...myData });
        }
        setLoading(false);
      } catch (e) {
        console.error("loadMatch:", e);
        setLoading(false);
      }
    })();
  }, [router.isReady, matchId, myPhone]);

  // Refetch profiles to obtain photoUrl once mutual reveal occurs
  useEffect(() => {
    if (matchData?.revealStatus === "revealed" && myPhone) {
      const otherId = matchData.user1Id === myPhone ? matchData.user2Id : matchData.user1Id;
      if (otherProfile && !otherProfile.photoUrl) {
        getDoc(doc(db, "profiles", otherId)).then(snap => {
          if (snap.exists()) setOtherProfile({ id: otherId, ...snap.data() });
        });
      }
      if (myProfile && !myProfile.photoUrl) {
        getDoc(doc(db, "profiles", myPhone)).then(snap => {
          if (snap.exists()) setMyProfile({ id: myPhone, ...snap.data() });
        });
      }
    }
  }, [matchData?.revealStatus, myPhone, otherProfile?.photoUrl, myProfile?.photoUrl]);

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
  if (accessDenied) {
    return (
      <Shell>
        <p style={{ color: "#ba1a1a", fontWeight: 900, textTransform: "uppercase", fontSize: 14 }}>
          You don't have access to this chat.
        </p>
      </Shell>
    );
  }
  if (loading || !matchData) return (
    <Shell>
      <div style={{ fontSize: 48, animation: "spin 1.2s linear infinite" }}>💬</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <p style={{ fontWeight: 900, fontSize: 14, marginTop: 12 }}>LOADING CHAT...</p>
    </Shell>
  );

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
        @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        textarea:focus { outline: none; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .neo-btn {
          transition: all 0.1s ease;
        }
        .neo-btn:active {
          transform: translate(2px, 2px) !important;
          box-shadow: 0px 0px 0px 0px #1b1b1b !important;
        }
      `}</style>

      {showReport && <ReportModal onSubmit={submitReport} onClose={() => setShowReport(false)} />}
      {showProfileModal && (
        <ProfileModal
          profile={otherProfile}
          revealed={isFullyRevealed}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      <div style={{
        display: "flex", flexDirection: "column",
        height: "100vh", overflow: "hidden",
        fontFamily: "'Montserrat', sans-serif",
        position: "relative",
      }}>

        {/* ── Header ── */}
        <header style={{
          background: "#ffffff",
          borderBottom: "3px solid #1b1b1b",
          padding: "12px 16px",
          display: "flex", alignItems: "center", gap: 10,
          flexShrink: 0, position: "relative",
          boxShadow: "0px 4px 0px 0px rgba(0,0,0,1)",
          zIndex: 10
        }}>
          {/* Back */}
          <button
            onClick={() => router.push("/matches")}
            className="neo-btn"
            style={{
              background: "#ffffff", border: "2px solid #1b1b1b", fontSize: 16, cursor: "pointer",
              width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: 6, boxShadow: "2px 2px 0px 0px #1b1b1b", fontWeight: 900,
              fontFamily: "inherit"
            }}
          >
            ←
          </button>

          {/* Avatar + Name section - clickable to see profile card */}
          <div
            onClick={() => setShowProfileModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flex: 1,
              minWidth: 0,
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: 8,
              transition: "background 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = "rgba(27,27,27,0.06)"}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
          >
            {/* Avatar — shows photo if revealed */}
            {isFullyRevealed ? (
              <div style={{ display: "flex", alignItems: "center", position: "relative", width: 52, height: 36, flexShrink: 0 }}>
                <div style={{ position: "absolute", left: 0, zIndex: 2 }}>
                  <Avatar profile={otherProfile} size={28} revealed={true} />
                </div>
                <div style={{ position: "absolute", left: 16, zIndex: 1 }}>
                  <Avatar profile={myProfile} size={28} revealed={true} />
                </div>
              </div>
            ) : (
              <Avatar profile={otherProfile} size={36} revealed={false} />
            )}

            {/* Name + status */}
            <div style={{ flex: 1, minWidth: 0, paddingLeft: 4 }}>
              <p style={{
                margin: 0, fontWeight: 950, fontSize: 14, color: "#1b1b1b",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                textTransform: "uppercase"
              }}>{otherProfile?.name || "…"}</p>

              {revealStatusText ? (
                <p style={{
                  margin: "2px 0 0", fontSize: 9, fontWeight: 900,
                  color: isFullyRevealed ? "#10B981" : theyWantReveal ? "#FF4757" : "#555",
                  animation: theyWantReveal && !myWantsReveal ? "pulse 2s infinite" : "none",
                  textTransform: "uppercase"
                }}>{revealStatusText}</p>
              ) : (
                <p style={{ margin: "2px 0 0", fontSize: 9, color: "#555", fontWeight: 900, textTransform: "uppercase" }}>
                  {(otherProfile?.branch || []).slice(0, 1).join("")}
                  {otherProfile?.year?.[0] ? ` · ${otherProfile.year[0]}` : ""}
                </p>
              )}
            </div>
          </div>

          {/* 👁️ Reveal toggle button */}
          <button
            onClick={toggleReveal}
            title={revealBtnTitle}
            className="neo-btn"
            style={{
              width: 32, height: 32, borderRadius: 6, border: "2px solid #1b1b1b",
              background: revealBtnBg,
              color: revealBtnColor,
              fontSize: 15, cursor: isFullyRevealed ? "default" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "inherit", flexShrink: 0,
              boxShadow: "2px 2px 0px 0px #1b1b1b",
              fontWeight: 900
            }}
          >{revealBtnLabel}</button>

          {/* ⋮ menu */}
          <button onClick={() => setShowMenu(v => !v)} className="neo-btn" style={{
            width: 32, height: 32, borderRadius: 6, border: "2px solid #1b1b1b",
            background: "#ffffff", color: "#1b1b1b", fontSize: 16,
            cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "2px 2px 0px 0px #1b1b1b", fontWeight: 900
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
              gap: 12, opacity: 0.8,
            }}>
              <Avatar profile={otherProfile} size={56} revealed={isFullyRevealed} />
              <p style={{ margin: 0, fontSize: 14, color: "#1b1b1b", fontWeight: 900, textAlign: "center", textTransform: "uppercase" }}>
                You matched with {otherProfile?.name}!<br />
                <span style={{ fontWeight: 700, fontSize: 12, color: "#555" }}>Break the ice 👋</span>
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
          background: "#ffffff",
          borderTop: "3px solid #1b1b1b",
          padding: "12px 14px 18px",
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
              flex: 1, padding: "10px 14px", borderRadius: 8,
              border: "2px solid #1b1b1b", fontSize: 13,
              fontFamily: "inherit", resize: "none",
              lineHeight: 1.5, background: "#ffffff",
              color: "#1b1b1b", maxHeight: 120, overflow: "hidden",
              boxShadow: "2px 2px 0px 0px #1b1b1b",
              fontWeight: 700
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="neo-btn"
            style={{
              width: 44, height: 44, borderRadius: 8, border: "2px solid #1b1b1b",
              background: input.trim() && !sending ? "#bdff00" : "#eeeeee",
              color: "#1b1b1b",
              fontSize: 18, cursor: input.trim() ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: input.trim() ? "2.5px 2.5px 0px 0px #1b1b1b" : "none",
              transition: "all 0.1s", fontFamily: "inherit", flexShrink: 0,
              fontWeight: 950
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
      height: "100vh",
      backgroundColor: "#f3f3f3",
      backgroundImage: "radial-gradient(#bcbcbc 1.5px, transparent 1.5px)",
      backgroundSize: "32px 32px",
      display: "flex", alignItems: "center", justifyContent: "center",
      gap: 12, flexDirection: "column",
      fontFamily: "'Montserrat', sans-serif",
      color: "#1b1b1b"
    }}>{children}</div>
  );
}

const outlineBtn = {
  flex: 1, padding: 13, borderRadius: 8, border: "3px solid #1b1b1b",
  background: "#ffffff", fontWeight: 900, fontSize: 13, cursor: "pointer",
  fontFamily: "'Montserrat', sans-serif", color: "#1b1b1b",
  boxShadow: "3px 3px 0px 0px #1b1b1b", textTransform: "uppercase"
};
function fillBtn(bg) {
  return {
    flex: 2, padding: 13, borderRadius: 8, border: "3px solid #1b1b1b",
    background: bg, color: "#1b1b1b", fontWeight: 950, fontSize: 13,
    cursor: "pointer", fontFamily: "'Montserrat', sans-serif",
    textTransform: "uppercase"
  };
}

