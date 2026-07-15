// src/pages/chat/[matchId].js
// Real-time chat between two matched users.
// Features: Reply, Emoji, Photo, Voice Note, Typing/Seen/Presence, Delete, Voice/Video Call.

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import {
  collection, query, orderBy, onSnapshot,
  doc, getDoc, addDoc, updateDoc, deleteDoc,
  increment, arrayUnion, serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../lib/firebase";
import { useRequireAuth } from "../../lib/useAuth";

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

// ─── Emoji Data ───────────────────────────────────────────────────────────────
const EMOJI_CATEGORIES = {
  "Smileys": ["😀","😂","🤣","😊","😍","🥰","😘","😜","🤪","😎","🥳","🤩","😇","🙃","😋","🤗","🤔","🫡","😏","😌","🥹","😭","😤","🔥","💀","👻","🤡"],
  "Gestures": ["👋","🙌","👏","🤝","👍","👎","✌️","🤞","🫶","💪","🫰","👊","🤙","✋","🤚","👆","👇","👈","👉","🖐️"],
  "Hearts": ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💕","💗","💝","💘","💖","💓","💔","❤️‍🔥","❣️"],
  "Campus": ["📚","🎓","🏫","📝","✏️","🎒","💻","📖","🧪","🔬","📐","🗓️","🍕","🍔","☕","🧃","🎵","🎮","⚽","🏀","🏋️","🚴"],
  "Fun": ["🎉","🎊","🪩","🌟","⭐","✨","💫","🌈","🦋","🌸","🌻","🍀","🎶","🎧","📸","💡","🚀","👑","💎","🏆","🎯","💯"],
  "Reactions": ["👀","🫣","🤫","🤭","😱","😳","🙄","😑","🫠","😵‍💫","🥱","😴","🤮","🤢","💩","🤯","😈","👹"],
};

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
          filter: "blur(4px) contrast(1.05)",
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

// ─── Image Lightbox ───────────────────────────────────────────────────────────
function ImageLightbox({ src, onClose }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 3000,
      background: "rgba(0,0,0,0.9)", display: "flex",
      alignItems: "center", justifyContent: "center",
      cursor: "zoom-out",
    }}>
      <img src={src} alt="" style={{
        maxWidth: "92vw", maxHeight: "88vh", objectFit: "contain",
        borderRadius: 8, border: "3px solid #fff",
      }} />
      <button onClick={onClose} style={{
        position: "absolute", top: 20, right: 20,
        background: "#fff", border: "2px solid #1b1b1b",
        borderRadius: "50%", width: 36, height: 36,
        fontWeight: 900, fontSize: 16, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "2px 2px 0px 0px #1b1b1b",
      }}>✕</button>
    </div>
  );
}

// ─── Audio Player ─────────────────────────────────────────────────────────────
function AudioBubblePlayer({ url, isMe }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setProgress(a.currentTime);
    const onLoad = () => setDuration(a.duration || 0);
    const onEnd = () => { setPlaying(false); setProgress(0); };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onLoad);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onLoad);
      a.removeEventListener("ended", onEnd);
    };
  }, []);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); }
    else { audioRef.current.play(); }
    setPlaying(!playing);
  };

  const fmt = (s) => {
    if (!s || !isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 180 }}>
      <audio ref={audioRef} src={url} preload="metadata" />
      <button onClick={toggle} style={{
        width: 32, height: 32, borderRadius: "50%",
        border: "2px solid #1b1b1b", background: isMe ? "#bdff00" : "#ecdcff",
        fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "1.5px 1.5px 0px 0px #1b1b1b", flexShrink: 0,
      }}>{playing ? "⏸" : "▶"}</button>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{
          height: 5, background: "#ddd", borderRadius: 3, overflow: "hidden",
          border: "1px solid #1b1b1b",
        }}>
          <div style={{
            height: "100%", width: `${duration ? (progress / duration) * 100 : 0}%`,
            background: isMe ? "#7531d3" : "#bdff00", transition: "width 0.2s",
          }} />
        </div>
        <span style={{ fontSize: 9, fontWeight: 800, color: "#555" }}>
          {fmt(playing ? progress : duration)} 🎙️
        </span>
      </div>
    </div>
  );
}

// ─── Chat bubble ──────────────────────────────────────────────────────────────
function Bubble({ msg, isMe, otherProfile, myProfile, showAvatar, revealed, onReply, onDelete, onImageClick, otherLastReadAt }) {
  const [showActions, setShowActions] = useState(false);
  const isDeleted = msg.deleted === true;

  // Determine seen status for my messages
  const isSeen = isMe && otherLastReadAt && msg.timestamp &&
    msg.timestamp.toDate && otherLastReadAt.toDate &&
    msg.timestamp.toDate() <= otherLastReadAt.toDate();

  // Reply preview
  const replyBox = msg.replyTo ? (
    <div
      onClick={() => {
        const el = document.getElementById(`msg-${msg.replyTo.id}`);
        if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.style.background = "#fef3c7"; setTimeout(() => el.style.background = "", 1200); }
      }}
      style={{
        background: isMe ? "rgba(117,49,211,0.1)" : "rgba(189,255,0,0.15)",
        borderLeft: `3px solid ${isMe ? "#7531d3" : "#bdff00"}`,
        padding: "5px 8px", borderRadius: "4px",
        marginBottom: 6, cursor: "pointer",
        fontSize: 10, fontWeight: 800, color: "#555",
      }}
    >
      <span style={{ color: isMe ? "#7531d3" : "#1b1b1b", fontWeight: 950, textTransform: "uppercase" }}>
        {msg.replyTo.senderName}
      </span>
      <div style={{ marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
        {msg.replyTo.type === "image" ? "📷 Photo" : msg.replyTo.type === "audio" ? "🎙️ Voice note" : msg.replyTo.content}
      </div>
    </div>
  ) : null;

  return (
    <div
      id={`msg-${msg.id}`}
      onMouseEnter={() => !isDeleted && setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onTouchStart={() => !isDeleted && setShowActions(true)}
      style={{
        display: "flex",
        flexDirection: isMe ? "row-reverse" : "row",
        alignItems: "flex-end",
        gap: 8, marginBottom: 8,
        fontFamily: "'Montserrat', sans-serif",
        position: "relative",
        transition: "background 0.3s",
      }}
    >
      {!isMe && (
        <div style={{ width: 28, height: 28, flexShrink: 0 }}>
          {showAvatar
            ? <Avatar profile={otherProfile} size={28} revealed={revealed} />
            : <div style={{ width: 28, height: 28 }} />
          }
        </div>
      )}

      {/* Action buttons (reply + delete) */}
      {showActions && (
        <div style={{
          display: "flex", gap: 4, alignItems: "center",
          position: "absolute", [isMe ? "left" : "right"]: isMe ? "auto" : "auto",
          top: "50%", transform: "translateY(-50%)",
          ...(isMe ? { left: 0 } : { right: 0 }),
          zIndex: 5,
        }}>
          <button onClick={() => onReply(msg)} title="Reply" style={{
            width: 26, height: 26, borderRadius: 6,
            border: "1.5px solid #1b1b1b", background: "#fff",
            fontSize: 12, cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center",
            boxShadow: "1px 1px 0px 0px #1b1b1b",
          }}>↩️</button>
          {isMe && (
            <button onClick={() => onDelete(msg)} title="Delete for Everyone" style={{
              width: 26, height: 26, borderRadius: 6,
              border: "1.5px solid #1b1b1b", background: "#ffb2bf",
              fontSize: 12, cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center",
              boxShadow: "1px 1px 0px 0px #1b1b1b",
            }}>🗑️</button>
          )}
        </div>
      )}

      <div style={{
        maxWidth: "72%",
        padding: isDeleted ? "10px 14px" : (msg.type === "image" ? "4px" : "10px 14px"),
        borderRadius: isMe ? "12px 2px 12px 12px" : "2px 12px 12px 12px",
        background: isDeleted ? "#f0f0f0" : (isMe ? "#ecdcff" : "#fff"),
        color: isDeleted ? "#999" : "#1b1b1b",
        border: `2.5px solid ${isDeleted ? "#ccc" : "#1b1b1b"}`,
        fontSize: 13, lineHeight: 1.5,
        fontWeight: 700,
        boxShadow: isDeleted ? "none" : "3px 3px 0px 0px #1b1b1b",
        wordBreak: "break-word",
        overflowWrap: "break-word",
      }}>
        {replyBox}

        {isDeleted ? (
          <div style={{ fontStyle: "italic", fontSize: 12, fontWeight: 600 }}>🚫 This message was deleted</div>
        ) : msg.type === "image" ? (
          <img
            src={msg.fileUrl}
            alt="Photo"
            onClick={() => onImageClick(msg.fileUrl)}
            style={{
              width: "100%", maxWidth: 260, borderRadius: 8,
              cursor: "zoom-in", display: "block",
            }}
          />
        ) : msg.type === "audio" ? (
          <AudioBubblePlayer url={msg.fileUrl} isMe={isMe} />
        ) : (
          <div>{msg.content}</div>
        )}

        <div style={{
          fontSize: 9, marginTop: 4, textAlign: "right",
          color: isDeleted ? "#bbb" : "#555", fontWeight: 800,
          display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 4,
        }}>
          <span>{msgTime(msg.timestamp)}</span>
          {isSeen && <span style={{ color: "#7531d3", fontWeight: 950 }}>✓✓</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────
function TypingIndicator({ name }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "6px 14px", fontFamily: "'Montserrat', sans-serif",
    }}>
      <div style={{
        display: "flex", gap: 4, padding: "8px 14px",
        borderRadius: "2px 12px 12px 12px",
        background: "#fff", border: "2px solid #1b1b1b",
        boxShadow: "2px 2px 0px 0px #1b1b1b",
      }}>
        <style>{`
          @keyframes typingBounce {
            0%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-6px); }
          }
        `}</style>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 7, height: 7, borderRadius: "50%",
            background: "#7531d3", animation: `typingBounce 1.4s ${i * 0.16}s infinite ease-in-out`,
          }} />
        ))}
      </div>
      <span style={{ fontSize: 10, fontWeight: 800, color: "#555", textTransform: "uppercase" }}>
        {name} is typing…
      </span>
    </div>
  );
}

// ─── Emoji Picker ─────────────────────────────────────────────────────────────
function EmojiPicker({ onSelect, onClose }) {
  const [activeTab, setActiveTab] = useState(Object.keys(EMOJI_CATEGORIES)[0]);
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 90 }} />
      <div style={{
        position: "absolute", bottom: 70, left: 14, right: 14, zIndex: 100,
        background: "#fff", border: "3px solid #1b1b1b", borderRadius: 14,
        boxShadow: "6px 6px 0px 0px #1b1b1b", overflow: "hidden",
        maxHeight: 320, display: "flex", flexDirection: "column",
        fontFamily: "'Montserrat', sans-serif",
        animation: "slideUp 0.25s cubic-bezier(.22,1,.36,1)",
      }}>
        {/* Category Tabs */}
        <div style={{
          display: "flex", overflowX: "auto", borderBottom: "2.5px solid #1b1b1b",
          background: "#f5f4f0", padding: "6px 6px 0",
          gap: 2, flexShrink: 0,
        }}>
          {Object.keys(EMOJI_CATEGORIES).map(cat => (
            <button key={cat} onClick={() => setActiveTab(cat)} style={{
              padding: "6px 10px", borderRadius: "6px 6px 0 0",
              border: activeTab === cat ? "2px solid #1b1b1b" : "2px solid transparent",
              borderBottom: activeTab === cat ? "2px solid #fff" : "2px solid transparent",
              background: activeTab === cat ? "#fff" : "transparent",
              fontSize: 9, fontWeight: 950, cursor: "pointer",
              color: "#1b1b1b", fontFamily: "inherit",
              textTransform: "uppercase", whiteSpace: "nowrap",
              marginBottom: -2.5,
            }}>{cat}</button>
          ))}
        </div>
        {/* Emoji Grid */}
        <div style={{
          padding: 10, display: "flex", flexWrap: "wrap", gap: 4,
          overflowY: "auto", flex: 1,
        }}>
          {EMOJI_CATEGORIES[activeTab].map(e => (
            <button key={e} onClick={() => onSelect(e)} style={{
              width: 36, height: 36, fontSize: 20,
              background: "none", border: "none", cursor: "pointer",
              borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.1s",
            }}
            onMouseEnter={ev => ev.currentTarget.style.background = "#f0edec"}
            onMouseLeave={ev => ev.currentTarget.style.background = "none"}
            >{e}</button>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Recording UI ─────────────────────────────────────────────────────────────
function RecordingBar({ duration, onCancel, onSend }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, flex: 1,
      background: "#FFF0F1", border: "2px solid #1b1b1b", borderRadius: 8,
      padding: "8px 14px", boxShadow: "2px 2px 0px 0px #1b1b1b",
    }}>
      <style>{`@keyframes recPulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
      <div style={{
        width: 12, height: 12, borderRadius: "50%", background: "#DC2626",
        animation: "recPulse 1s infinite",
      }} />
      <span style={{ fontSize: 14, fontWeight: 900, color: "#DC2626", fontFamily: "'Montserrat', sans-serif" }}>
        {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, "0")}
      </span>
      <div style={{ flex: 1 }} />
      <button onClick={onCancel} className="neo-btn" style={{
        width: 32, height: 32, borderRadius: 6,
        border: "2px solid #1b1b1b", background: "#fff",
        fontSize: 14, cursor: "pointer", display: "flex",
        alignItems: "center", justifyContent: "center",
        boxShadow: "1.5px 1.5px 0px 0px #1b1b1b",
      }}>✕</button>
      <button onClick={onSend} className="neo-btn" style={{
        width: 32, height: 32, borderRadius: 6,
        border: "2px solid #1b1b1b", background: "#bdff00",
        fontSize: 14, cursor: "pointer", display: "flex",
        alignItems: "center", justifyContent: "center",
        boxShadow: "1.5px 1.5px 0px 0px #1b1b1b",
      }}>↑</button>
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
              style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(7px) contrast(1.05)", transform: "scale(1.08)" }} 
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
            {profile.verificationStatus === "approved" ? "VERIFIED 🛡️" : "VERIFICATION PENDING ⏳"}
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

// ─── Call Overlay ──────────────────────────────────────────────────────────────
function CallOverlay({
  callState,
  otherProfile,
  revealed,
  localVideoRef,
  remoteVideoRef,
  remoteAudioRef,
  onEnd,
  onAccept,
  onDecline,
  callTimer,
  micMuted,
  speakerMuted,
  videoOff,
  onToggleMic,
  onToggleSpeaker,
  onToggleVideo
}) {
  if (!callState) return null;

  const isVideo = callState.type === "video";
  const isRinging = callState.status === "ringing";
  const isOutgoing = callState.direction === "outgoing";
  const isConnected = callState.status === "connected";

  const fmtTimer = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 5000,
      background: isVideo && isConnected ? "#000" : "linear-gradient(135deg, #1b1b1b 0%, #333 100%)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "'Montserrat', sans-serif", color: "#fff",
    }}>
      <style>{`
        @keyframes callPulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.15);opacity:0.6} }
        @keyframes callRing { 0%{transform:rotate(0)} 10%{transform:rotate(15deg)} 20%{transform:rotate(-15deg)} 30%{transform:rotate(10deg)} 40%{transform:rotate(-10deg)} 50%{transform:rotate(0)} 100%{transform:rotate(0)} }
      `}</style>

      {/* Audio element to play audio for voice calls */}
      {!isVideo && (
        <audio ref={remoteAudioRef} autoPlay playsInline muted={speakerMuted} />
      )}

      {/* Video Streams */}
      {isVideo && (
        <>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            muted={speakerMuted}
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%",
              objectFit: "cover",
              display: isConnected ? "block" : "none",
            }}
          />
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{
              position: "absolute", top: 20, right: 20,
              width: 120, height: 160, objectFit: "cover",
              borderRadius: 12, border: "3px solid #fff",
              boxShadow: "4px 4px 0px 0px rgba(0,0,0,0.5)",
              zIndex: 2,
              display: isConnected && !videoOff ? "block" : "none",
            }}
          />
        </>
      )}

      {/* Non-connected, audio, or video off avatar UI */}
      {(!isConnected || !isVideo || (isVideo && videoOff)) && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, zIndex: 2 }}>
          <div style={{ animation: isRinging ? "callPulse 2s infinite" : "none" }}>
            <Avatar profile={otherProfile} size={100} revealed={revealed} />
          </div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 950, textTransform: "uppercase" }}>
            {otherProfile?.name || "…"}
          </h2>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#ccc", textTransform: "uppercase" }}>
            {isRinging && isOutgoing && "Calling…"}
            {isRinging && !isOutgoing && `Incoming ${isVideo ? "Video" : "Voice"} Call`}
            {callState.status === "connecting" && "Connecting…"}
            {isConnected && fmtTimer(callTimer)}
            {callState.status === "ended" && "Call Ended"}
          </p>
          {isRinging && isOutgoing && (
            <div style={{ fontSize: 28, animation: "callRing 1.5s infinite" }}>
              {isVideo ? "📹" : "📞"}
            </div>
          )}
        </div>
      )}

      {/* Controls Container */}
      <div style={{
        position: "absolute", bottom: 60,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 20, zIndex: 3,
      }}>
        {/* Toggle buttons for active call */}
        {isConnected && (
          <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
            {/* Microphone Toggle */}
            <button onClick={onToggleMic} style={{
              width: 48, height: 48, borderRadius: "50%",
              border: "2px solid #fff", background: micMuted ? "#DC2626" : "rgba(255,255,255,0.2)",
              color: "#fff", fontSize: 20, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "2px 2px 0px 0px rgba(0,0,0,0.3)",
            }} title={micMuted ? "Unmute Mic" : "Mute Mic"}>
              {micMuted ? "🔇" : "🎙️"}
            </button>

            {/* Speaker Toggle */}
            <button onClick={onToggleSpeaker} style={{
              width: 48, height: 48, borderRadius: "50%",
              border: "2px solid #fff", background: speakerMuted ? "#DC2626" : "rgba(255,255,255,0.2)",
              color: "#fff", fontSize: 20, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "2px 2px 0px 0px rgba(0,0,0,0.3)",
            }} title={speakerMuted ? "Unmute Speaker" : "Mute Speaker"}>
              {speakerMuted ? "🔇" : "🔊"}
            </button>

            {/* Camera Toggle (Video calls only) */}
            {isVideo && (
              <button onClick={onToggleVideo} style={{
                width: 48, height: 48, borderRadius: "50%",
                border: "2px solid #fff", background: videoOff ? "#DC2626" : "rgba(255,255,255,0.2)",
                color: "#fff", fontSize: 20, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "2px 2px 0px 0px rgba(0,0,0,0.3)",
              }} title={videoOff ? "Turn Camera On" : "Turn Camera Off"}>
                {videoOff ? "📷🚫" : "📹"}
              </button>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 20 }}>
          {/* Incoming ringing: Accept + Decline */}
          {isRinging && !isOutgoing && (
            <>
              <button onClick={onDecline} style={{
                width: 60, height: 60, borderRadius: "50%",
                border: "3px solid #fff", background: "#DC2626",
                fontSize: 24, cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center",
                boxShadow: "3px 3px 0px 0px rgba(255,255,255,0.3)",
              }}>✕</button>
              <button onClick={onAccept} style={{
                width: 60, height: 60, borderRadius: "50%",
                border: "3px solid #fff", background: "#10B981",
                fontSize: 24, cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center",
                boxShadow: "3px 3px 0px 0px rgba(255,255,255,0.3)",
              }}>{isVideo ? "📹" : "📞"}</button>
            </>
          )}

          {/* Outgoing ringing / connected / connecting: End */}
          {(isOutgoing || isConnected || callState.status === "connecting") && (
            <button onClick={onEnd} style={{
              width: 60, height: 60, borderRadius: "50%",
              border: "3px solid #fff", background: "#DC2626",
              fontSize: 24, cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center",
              boxShadow: "3px 3px 0px 0px rgba(255,255,255,0.3)",
            }}>📵</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Presence Floating Avatar ─────────────────────────────────────────────────
function PresenceAvatar({ profile, revealed }) {
  return (
    <div style={{
      position: "fixed", bottom: 90, right: 16, zIndex: 50,
      animation: "presencePop 0.4s cubic-bezier(.22,1,.36,1)",
    }}>
      <style>{`@keyframes presencePop { from{transform:scale(0);opacity:0} to{transform:scale(1);opacity:1} }`}</style>
      <div style={{ position: "relative" }}>
        <Avatar profile={profile} size={36} revealed={revealed} />
        <div style={{
          position: "absolute", bottom: -1, right: -1,
          width: 12, height: 12, borderRadius: "50%",
          background: "#10B981", border: "2px solid #fff",
        }} />
      </div>
      <p style={{
        margin: "3px 0 0", fontSize: 8, fontWeight: 950,
        color: "#10B981", textAlign: "center",
        textTransform: "uppercase", fontFamily: "'Montserrat', sans-serif",
      }}>HERE</p>
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

  // ── New feature state ──
  const [replyingTo,    setReplyingTo]    = useState(null); // { id, senderName, content, type }
  const [showEmoji,     setShowEmoji]     = useState(false);
  const [lightboxSrc,   setLightboxSrc]   = useState(null);
  const [isRecording,   setIsRecording]   = useState(false);
  const [recDuration,   setRecDuration]   = useState(0);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // ── Call state ──
  const [callState, setCallState] = useState(null); // { type, status, direction }
  const [callTimer, setCallTimer] = useState(0);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [micMuted, setMicMuted] = useState(false);
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);

  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const myPhoneRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recIntervalRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const pcRef = useRef(null); // RTCPeerConnection
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const callTimerRef = useRef(null);
  const callDocUnsubRef = useRef(null);

  // Stream effect triggers to attach streams without DOM races
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, localVideoRef.current, videoOff]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, remoteVideoRef.current]);

  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, remoteAudioRef.current]);

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

  // ── Real-time match doc (reveal state, typing, presence, etc.) ──
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

  // ── Presence: set online on mount, offline on unmount ──
  useEffect(() => {
    if (!matchId || !myPhone || !matchData) return;
    const isUser1 = matchData.user1Id === myPhone;
    const onlineField = isUser1 ? "user1Online" : "user2Online";

    updateDoc(doc(db, "matches", matchId), { [onlineField]: true }).catch(() => {});

    const handleBeforeUnload = () => {
      // Best-effort on unload
      try {
        const payload = JSON.stringify({ [onlineField]: false });
        navigator.sendBeacon?.(`/__presence_offline`, payload); // won't work, just fallback
      } catch {}
      updateDoc(doc(db, "matches", matchId), { [onlineField]: false }).catch(() => {});
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      updateDoc(doc(db, "matches", matchId), { [onlineField]: false }).catch(() => {});
    };
  }, [matchId, myPhone, matchData?.user1Id]);

  // ── Update lastReadAt continuously when chat is open ──
  useEffect(() => {
    if (!matchId || !myPhone || !matchData || !messages.length) return;
    const isUser1 = matchData.user1Id === myPhone;
    const readField = isUser1 ? "user1LastReadAt" : "user2LastReadAt";
    updateDoc(doc(db, "matches", matchId), { [readField]: serverTimestamp() }).catch(() => {});
  }, [matchId, myPhone, matchData?.user1Id, messages.length]);

  // ── Typing: debounced ──
  const setTyping = useCallback((val) => {
    if (!matchId || !myPhone || !matchData) return;
    const isUser1 = matchData.user1Id === myPhone;
    const typingField = isUser1 ? "user1Typing" : "user2Typing";
    updateDoc(doc(db, "matches", matchId), { [typingField]: val }).catch(() => {});
  }, [matchId, myPhone, matchData?.user1Id]);

  const handleInputChange = (e) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";

    // Typing indicator
    setTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setTyping(false), 3000);
  };

  // ── Send message ──
  const sendMessage = async () => {
    const content = input.trim();
    if (!content || sending || !matchId || !myPhoneRef.current || !matchData) return;
    setSending(true);
    setInput("");
    setShowEmoji(false);
    try {
      const phone = myPhoneRef.current;
      const isUser1 = matchData.user1Id === phone;
      const unreadField = isUser1 ? "user2Unread" : "user1Unread";

      const msgData = {
        senderId: phone, content, timestamp: serverTimestamp(),
        type: "text",
      };
      if (replyingTo) {
        msgData.replyTo = {
          id: replyingTo.id,
          senderName: replyingTo.senderName,
          content: replyingTo.content,
          type: replyingTo.type || "text",
        };
      }

      await addDoc(collection(db, "chats", matchId, "messages"), msgData);
      await updateDoc(doc(db, "matches", matchId), {
        messageCount: increment(1),
        lastMessage: content,
        lastMessageAt: serverTimestamp(),
        lastSenderId: phone,
        [unreadField]: increment(1),
      });
      setReplyingTo(null);
      setTyping(false);
    } catch (e) {
      console.error("send:", e);
      setInput(content);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  // ── Send Photo ──
  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !matchId || !myPhoneRef.current || !matchData) return;
    setUploadingMedia(true);
    try {
      const phone = myPhoneRef.current;
      const isUser1 = matchData.user1Id === phone;
      const unreadField = isUser1 ? "user2Unread" : "user1Unread";
      
      let url;
      try {
        const uploadPromise = (async () => {
          const fileName = `${Date.now()}_${file.name}`;
          const storageRef = ref(storage, `chats/${matchId}/photos/${fileName}`);
          await uploadBytes(storageRef, file);
          return await getDownloadURL(storageRef);
        })();

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Storage upload timeout")), 3000)
        );

        url = await Promise.race([uploadPromise, timeoutPromise]);
      } catch (storageError) {
        console.warn("Storage upload failed or timed out, falling back to base64 inline compression:", storageError);
        // Fallback to local base64 compression via imageUtils
        const { fileToFirestorePhoto } = await import("../../lib/imageUtils");
        url = await fileToFirestorePhoto(file);
      }

      const msgData = {
        senderId: phone, content: "📷 Photo", timestamp: serverTimestamp(),
        type: "image", fileUrl: url,
      };
      if (replyingTo) {
        msgData.replyTo = {
          id: replyingTo.id,
          senderName: replyingTo.senderName,
          content: replyingTo.content,
          type: replyingTo.type || "text",
        };
      }

      await addDoc(collection(db, "chats", matchId, "messages"), msgData);
      await updateDoc(doc(db, "matches", matchId), {
        messageCount: increment(1),
        lastMessage: "📷 Photo",
        lastMessageAt: serverTimestamp(),
        lastSenderId: phone,
        [unreadField]: increment(1),
      });
      setReplyingTo(null);
    } catch (e) {
      console.error("photo upload:", e);
      alert("Failed to send photo: " + e.message);
    } finally {
      setUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Voice Recording ──
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecDuration(0);
      recIntervalRef.current = setInterval(() => setRecDuration(d => d + 1), 1000);
    } catch (e) {
      console.error("mic access:", e);
      alert("Microphone access denied.");
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop());
    }
    clearInterval(recIntervalRef.current);
    setIsRecording(false);
    setRecDuration(0);
    audioChunksRef.current = [];
  };

  const sendRecording = async () => {
    if (!mediaRecorderRef.current || !matchId || !myPhoneRef.current || !matchData) return;
    const recorder = mediaRecorderRef.current;
    const dur = recDuration;
    clearInterval(recIntervalRef.current);
    setIsRecording(false);
    setRecDuration(0);

    return new Promise((resolve) => {
      recorder.onstop = async () => {
        recorder.stream?.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        audioChunksRef.current = [];
        if (blob.size === 0) { resolve(); return; }
        setUploadingMedia(true);
        try {
          const phone = myPhoneRef.current;
          const isUser1 = matchData.user1Id === phone;
          const unreadField = isUser1 ? "user2Unread" : "user1Unread";
          
          let url;
          try {
            const uploadPromise = (async () => {
              const fileName = `${Date.now()}_voice.webm`;
              const storageRef = ref(storage, `chats/${matchId}/audio/${fileName}`);
              await uploadBytes(storageRef, blob);
              return await getDownloadURL(storageRef);
            })();

            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Storage upload timeout")), 3000)
            );

            url = await Promise.race([uploadPromise, timeoutPromise]);
          } catch (storageError) {
            console.warn("Storage audio upload failed or timed out, falling back to base64 inline:", storageError);
            url = await new Promise((res) => {
              const reader = new FileReader();
              reader.onloadend = () => res(reader.result);
              reader.readAsDataURL(blob);
            });
          }

          const msgData = {
            senderId: phone, content: "🎙️ Voice note", timestamp: serverTimestamp(),
            type: "audio", fileUrl: url, duration: dur,
          };
          if (replyingTo) {
            msgData.replyTo = {
              id: replyingTo.id,
              senderName: replyingTo.senderName,
              content: replyingTo.content,
              type: replyingTo.type || "text",
            };
          }

          await addDoc(collection(db, "chats", matchId, "messages"), msgData);
          await updateDoc(doc(db, "matches", matchId), {
            messageCount: increment(1),
            lastMessage: "🎙️ Voice note",
            lastMessageAt: serverTimestamp(),
            lastSenderId: phone,
            [unreadField]: increment(1),
          });
          setReplyingTo(null);
        } catch (e) {
          console.error("voice upload:", e);
          alert("Failed to send voice note: " + e.message);
        } finally {
          setUploadingMedia(false);
        }
        resolve();
      };
      if (recorder.state !== "inactive") recorder.stop();
      else resolve();
    });
  };

  // ── Delete for Everyone ──
  const deleteForEveryone = async (msg) => {
    if (!msg || msg.senderId !== myPhoneRef.current) return;
    try {
      await updateDoc(doc(db, "chats", matchId, "messages", msg.id), {
        deleted: true,
        content: "This message was deleted.",
        fileUrl: null,
      });
    } catch (e) {
      console.error("delete:", e);
      alert("Failed to delete message.");
    }
  };

  // ── Reply handler ──
  const handleReply = (msg) => {
    const senderName = msg.senderId === myPhoneRef.current ? (myProfile?.name || "You") : (otherProfile?.name || "Them");
    setReplyingTo({
      id: msg.id,
      senderName,
      content: msg.content,
      type: msg.type || "text",
    });
    inputRef.current?.focus();
  };

  // ── Emoji select ──
  const handleEmojiSelect = (emoji) => {
    setInput(prev => prev + emoji);
    inputRef.current?.focus();
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

  // ── WebRTC Voice/Video Call ──
  const ICE_SERVERS = { iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }] };

  const startCall = async (type) => {
    if (!matchId || !myPhoneRef.current || !matchData || callState) return;
    try {
      const phone = myPhoneRef.current;
      const otherId = matchData.user1Id === phone ? matchData.user2Id : matchData.user1Id;
      const constraints = type === "video" ? { audio: true, video: true } : { audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;
      const rStream = new MediaStream();
      remoteStreamRef.current = rStream;
      setRemoteStream(rStream);

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (e) => {
        e.streams[0].getTracks().forEach(track => {
          rStream.addTrack(track);
        });
      };

      const callDocRef = doc(db, "matches", matchId, "calls", "active_call");

      // Set up real-time candidate adding
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          const candRef = collection(db, "matches", matchId, "calls", "active_call", "callerCandidates");
          addDoc(candRef, e.candidate.toJSON()).catch(() => {});
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const { setDoc } = await import("firebase/firestore");
      await setDoc(callDocRef, {
        callerId: phone, receiverId: otherId,
        type, status: "ringing",
        offer: { type: offer.type, sdp: offer.sdp },
        answer: null,
        createdAt: serverTimestamp(),
      });

      setCallState({ type, status: "ringing", direction: "outgoing" });

      // Reset mute controls
      setMicMuted(false);
      setSpeakerMuted(false);
      setVideoOff(false);

      // Listen for answer + remote candidates
      let unsubReceiverCand = null;
      callDocUnsubRef.current = onSnapshot(callDocRef, async (snap) => {
        if (!snap.exists()) { endCall(); return; }
        const data = snap.data();
        if (data.status === "rejected" || data.status === "ended") {
          endCall();
          return;
        }
        if (data.status === "accepted" && data.answer && pc.signalingState !== "stable") {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          
          const receiverCandRef = collection(db, "matches", matchId, "calls", "active_call", "receiverCandidates");
          unsubReceiverCand = onSnapshot(receiverCandRef, (cSnap) => {
            cSnap.docChanges().forEach(async (change) => {
              if (change.type === "added") {
                const cData = change.doc.data();
                await pc.addIceCandidate(new RTCIceCandidate(cData)).catch(() => {});
              }
            });
          });

          setCallState(prev => ({ ...prev, status: "connected" }));
          setCallTimer(0);
          callTimerRef.current = setInterval(() => setCallTimer(t => t + 1), 1000);
        }
      });

      const prevUnsub = callDocUnsubRef.current;
      callDocUnsubRef.current = () => {
        prevUnsub?.();
        unsubReceiverCand?.();
      };

    } catch (e) {
      console.error("startCall:", e);
      alert("Could not start call. Check camera/mic permissions.");
      endCall();
    }
  };

  // Listen for incoming calls
  useEffect(() => {
    if (!matchId || !myPhone || callState) return;
    const callDocRef = doc(db, "matches", matchId, "calls", "active_call");
    const unsub = onSnapshot(callDocRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.status === "ringing" && data.receiverId === myPhone && !callState) {
        setCallState({ type: data.type, status: "ringing", direction: "incoming" });
      }
    });
    return () => unsub();
  }, [matchId, myPhone, callState]);

  const acceptCall = async () => {
    if (!matchId || !myPhoneRef.current || !matchData) return;
    try {
      const callDocRef = doc(db, "matches", matchId, "calls", "active_call");
      const callSnap = await getDoc(callDocRef);
      if (!callSnap.exists()) return;
      const callData = callSnap.data();

      const constraints = callData.type === "video" ? { audio: true, video: true } : { audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;
      const rStream = new MediaStream();
      remoteStreamRef.current = rStream;
      setRemoteStream(rStream);

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (e) => {
        e.streams[0].getTracks().forEach(track => {
          rStream.addTrack(track);
        });
      };

      await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));

      // Listen for caller candidates
      const callerCandRef = collection(db, "matches", matchId, "calls", "active_call", "callerCandidates");
      const unsubCallerCand = onSnapshot(callerCandRef, (cSnap) => {
        cSnap.docChanges().forEach(async (change) => {
          if (change.type === "added") {
            const cData = change.doc.data();
            await pc.addIceCandidate(new RTCIceCandidate(cData)).catch(() => {});
          }
        });
      });

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          const candRef = collection(db, "matches", matchId, "calls", "active_call", "receiverCandidates");
          addDoc(candRef, e.candidate.toJSON()).catch(() => {});
        }
      };

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await updateDoc(callDocRef, {
        status: "accepted",
        answer: { type: answer.type, sdp: answer.sdp },
      });

      setCallState(prev => ({ ...prev, status: "connected" }));
      setCallTimer(0);
      callTimerRef.current = setInterval(() => setCallTimer(t => t + 1), 1000);

      // Reset mute controls
      setMicMuted(false);
      setSpeakerMuted(false);
      setVideoOff(false);

      // Listen for end
      const unsubCallDoc = onSnapshot(callDocRef, (snap) => {
        if (!snap.exists()) { endCall(); return; }
        const data = snap.data();
        if (data.status === "ended") endCall();
      });

      callDocUnsubRef.current = () => {
        unsubCallDoc();
        unsubCallerCand();
      };

    } catch (e) {
      console.error("acceptCall:", e);
      alert("Failed to accept call. Check permissions.");
      endCall();
    }
  };

  const declineCall = async () => {
    if (!matchId) return;
    try {
      await updateDoc(doc(db, "matches", matchId, "calls", "active_call"), { status: "rejected" });
    } catch {}
    setCallState(null);
  };

  const endCall = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    remoteStreamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    pcRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setMicMuted(false);
    setSpeakerMuted(false);
    setVideoOff(false);

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;

    clearInterval(callTimerRef.current);
    callDocUnsubRef.current?.();
    callDocUnsubRef.current = null;

    if (matchId) {
      deleteDoc(doc(db, "matches", matchId, "calls", "active_call")).catch(() => {});
    }
    setCallState(null);
    setCallTimer(0);
  }, [matchId]);

  // Mic, Video, Speaker controllers
  const toggleMic = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => {
        t.enabled = micMuted;
      });
      setMicMuted(!micMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => {
        t.enabled = videoOff;
      });
      setVideoOff(!videoOff);
    }
  };

  const toggleSpeaker = () => {
    setSpeakerMuted(!speakerMuted);
  };

  // Cleanup call on unmount
  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      pcRef.current?.close();
      clearInterval(callTimerRef.current);
      callDocUnsubRef.current?.();
    };
  }, []);

  // ── Computed reveal values ──
  const isUser1        = matchData?.user1Id === myPhone;
  const isFullyRevealed = matchData?.revealStatus === "revealed";
  const myWantsReveal   = isUser1 ? (matchData?.user1WantsReveal || false) : (matchData?.user2WantsReveal || false);
  const theyWantReveal  = isUser1 ? (matchData?.user2WantsReveal || false) : (matchData?.user1WantsReveal || false);

  // Typing & presence computed
  const theyAreTyping = isUser1 ? matchData?.user2Typing : matchData?.user1Typing;
  const theyAreOnline = isUser1 ? matchData?.user2Online : matchData?.user1Online;
  const otherLastReadAt = isUser1 ? matchData?.user2LastReadAt : matchData?.user1LastReadAt;

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

      {/* Lightbox */}
      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      {/* Call Overlay */}
      <CallOverlay
        callState={callState}
        otherProfile={otherProfile}
        revealed={isFullyRevealed}
        localVideoRef={localVideoRef}
        remoteVideoRef={remoteVideoRef}
        remoteAudioRef={remoteAudioRef}
        onEnd={endCall}
        onAccept={acceptCall}
        onDecline={declineCall}
        callTimer={callTimer}
        micMuted={micMuted}
        speakerMuted={speakerMuted}
        videoOff={videoOff}
        onToggleMic={toggleMic}
        onToggleSpeaker={toggleSpeaker}
        onToggleVideo={toggleVideo}
      />

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
          display: "flex", alignItems: "center", gap: 8,
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
              <div style={{ position: "relative" }}>
                <Avatar profile={otherProfile} size={36} revealed={false} />
                {theyAreOnline && (
                  <div style={{
                    position: "absolute", bottom: -1, right: -1,
                    width: 10, height: 10, borderRadius: "50%",
                    background: "#10B981", border: "2px solid #fff",
                  }} />
                )}
              </div>
            )}

            {/* Name + status */}
            <div style={{ flex: 1, minWidth: 0, paddingLeft: 4 }}>
              <p style={{
                margin: 0, fontWeight: 950, fontSize: 14, color: "#1b1b1b",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                textTransform: "uppercase"
              }}>{otherProfile?.name || "…"}</p>

              {theyAreOnline ? (
                <p style={{ margin: "2px 0 0", fontSize: 9, fontWeight: 900, color: "#10B981", textTransform: "uppercase" }}>
                  Online now
                </p>
              ) : revealStatusText ? (
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

          {/* 📞 Voice Call */}
          <button
            onClick={() => startCall("voice")}
            title="Voice Call"
            className="neo-btn"
            style={{
              width: 32, height: 32, borderRadius: 6, border: "2px solid #1b1b1b",
              background: "#DCFCE7", color: "#1b1b1b", fontSize: 14,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "inherit", flexShrink: 0,
              boxShadow: "2px 2px 0px 0px #1b1b1b", fontWeight: 900
            }}
          >📞</button>

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
                myProfile={myProfile}
                showAvatar={showAvatar}
                revealed={isFullyRevealed}
                onReply={handleReply}
                onDelete={deleteForEveryone}
                onImageClick={(src) => setLightboxSrc(src)}
                otherLastReadAt={otherLastReadAt}
              />
            );
          })}

          {/* Typing indicator */}
          {theyAreTyping && <TypingIndicator name={otherProfile?.name || "…"} />}

          <div ref={bottomRef} style={{ height: 1 }} />
        </div>

        {/* Presence floating avatar */}
        {theyAreOnline && <PresenceAvatar profile={otherProfile} revealed={isFullyRevealed} />}

        {/* Emoji Picker */}
        {showEmoji && (
          <EmojiPicker
            onSelect={handleEmojiSelect}
            onClose={() => setShowEmoji(false)}
          />
        )}

        {/* ── Reply Preview ── */}
        {replyingTo && (
          <div style={{
            flexShrink: 0, background: "#f5f4f0",
            borderTop: "2.5px solid #1b1b1b",
            padding: "8px 14px",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{
              flex: 1, borderLeft: "3px solid #7531d3",
              padding: "4px 10px", fontSize: 11, fontWeight: 700, color: "#555",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              <span style={{ color: "#7531d3", fontWeight: 950, textTransform: "uppercase" }}>
                {replyingTo.senderName}
              </span>
              <div style={{ marginTop: 1 }}>
                {replyingTo.type === "image" ? "📷 Photo" : replyingTo.type === "audio" ? "🎙️ Voice note" : replyingTo.content}
              </div>
            </div>
            <button onClick={() => setReplyingTo(null)} style={{
              width: 26, height: 26, borderRadius: "50%",
              border: "2px solid #1b1b1b", background: "#fff",
              fontSize: 12, cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center",
              boxShadow: "1px 1px 0px 0px #1b1b1b",
            }}>✕</button>
          </div>
        )}

        {/* ── Upload progress ── */}
        {uploadingMedia && (
          <div style={{
            flexShrink: 0, background: "#ecdcff",
            borderTop: "2px solid #1b1b1b",
            padding: "8px 14px", display: "flex", alignItems: "center", gap: 8,
            fontSize: 11, fontWeight: 900, color: "#1b1b1b", textTransform: "uppercase",
          }}>
            <div style={{
              width: 16, height: 16, border: "3px solid #7531d3",
              borderTopColor: "transparent", borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }} />
            Uploading…
          </div>
        )}

        {/* ── Input bar ── */}
        <div style={{
          flexShrink: 0,
          background: "#ffffff",
          borderTop: "3px solid #1b1b1b",
          padding: "12px 14px 18px",
          display: "flex", gap: 8, alignItems: "flex-end",
          position: "relative",
        }}>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handlePhotoSelect}
          />

          {/* Attach Photo */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingMedia}
            className="neo-btn"
            title="Send Photo"
            style={{
              width: 38, height: 38, borderRadius: 8, border: "2px solid #1b1b1b",
              background: "#fff", color: "#1b1b1b", fontSize: 16,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "2px 2px 0px 0px #1b1b1b", flexShrink: 0,
              fontFamily: "inherit", fontWeight: 900,
            }}
          >📎</button>

          {/* Emoji */}
          <button
            onClick={() => setShowEmoji(v => !v)}
            className="neo-btn"
            title="Emoji"
            style={{
              width: 38, height: 38, borderRadius: 8, border: "2px solid #1b1b1b",
              background: showEmoji ? "#fef3c7" : "#fff", color: "#1b1b1b", fontSize: 16,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "2px 2px 0px 0px #1b1b1b", flexShrink: 0,
              fontFamily: "inherit", fontWeight: 900,
            }}
          >😃</button>

          {isRecording ? (
            <RecordingBar
              duration={recDuration}
              onCancel={cancelRecording}
              onSend={sendRecording}
            />
          ) : (
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={handleInputChange}
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
          )}

          {/* Mic / Send toggle */}
          {input.trim() ? (
            <button
              onClick={sendMessage}
              disabled={sending}
              className="neo-btn"
              style={{
                width: 44, height: 44, borderRadius: 8, border: "2px solid #1b1b1b",
                background: "#bdff00", color: "#1b1b1b",
                fontSize: 18, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "2.5px 2.5px 0px 0px #1b1b1b",
                transition: "all 0.1s", fontFamily: "inherit", flexShrink: 0,
                fontWeight: 950
              }}
            >{sending ? "…" : "↑"}</button>
          ) : !isRecording ? (
            <button
              onClick={startRecording}
              disabled={uploadingMedia}
              className="neo-btn"
              title="Record Voice Note"
              style={{
                width: 44, height: 44, borderRadius: 8, border: "2px solid #1b1b1b",
                background: "#FFF0F1", color: "#1b1b1b",
                fontSize: 18, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "2.5px 2.5px 0px 0px #1b1b1b",
                transition: "all 0.1s", fontFamily: "inherit", flexShrink: 0,
                fontWeight: 950,
              }}
            >🎙️</button>
          ) : null}
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
