// src/pages/events.js
// Campus Events & Hangouts — create/join casual campus meetups.
// Firestore collection: events/{eventId}
// TODO: replace localStorage "cc_phone" with auth.currentUser.uid once Firebase Auth is live.

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import {
  collection, query, orderBy, onSnapshot,
  doc, getDoc, addDoc, updateDoc,
  arrayUnion, arrayRemove, serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import NavBar from "../components/NavBar";
import { useRequireAuth } from "../lib/useAuth";

// ─── Config ───────────────────────────────────────────────────────────────────
const CATEGORIES = {
  All:    { icon: "✨", bg: "#F5F4F0",  color: "#555"    },
  Study:  { icon: "📚", bg: "#EEF2FF",  color: "#4338CA" },
  Chill:  { icon: "😎", bg: "#FEF3C7",  color: "#92400E" },
  Food:   { icon: "🍕", bg: "#FFF7ED",  color: "#C2410C" },
  Sports: { icon: "⚽", bg: "#DCFCE7",  color: "#15803D" },
  Gaming: { icon: "🎮", bg: "#F3E8FF",  color: "#7E22CE" },
  Music:  { icon: "🎵", bg: "#FDF2F8",  color: "#BE185D" },
  Other:  { icon: "🌀", bg: "#F5F4F0",  color: "#555"    },
};

const LOCATIONS = [
  "Library", "Canteen", "Uni Mall (LPU)", "Unipolis (LPU)", "Block 33 (LPU)",
  "Block 34 (LPU)", "Block 36 (LPU)", "Block 37 (LPU)", "Block 38 (LPU)", "Block 13 (LPU)",
  "Block 25 (LPU)", "Block 28 (LPU)", "Indoor Stadium", "Main Gate",
  "Hostel Common Room", "Lab Block", "Other",
];

const WHEN_OPTIONS = [
  "Right now", "In 30 mins", "In 1 hour", "This evening", "Tonight", "Tomorrow morning", "Tomorrow",
];

const MAX_PEOPLE_OPTIONS = [2, 3, 4, 5, 6, 8, 10];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function timeAgo(ts) {
  if (!ts?.toDate) return "";
  const d = ts.toDate();
  const diff = (Date.now() - d) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// ── Event card ─────────────────────────────────────────────────────────────────────────────────
function EventCard({ event, myPhone, onJoin, onLeave, creatorProfile }) {
  const cat = CATEGORIES[event.category] || CATEGORIES.Other;
  const isJoined = (event.attendees || []).includes(myPhone);
  const isMine   = event.creatorId === myPhone;
  const filled   = (event.attendees || []).length;
  const isFull   = filled >= event.maxPeople && !isJoined;

  return (
    <div style={{
      background: "#fff",
      border: "3px solid #1b1b1b",
      boxShadow: "6px 6px 0px 0px #1b1b1b",
      borderRadius: 16,
      overflow: "hidden",
    }}>
      {/* Colour strip */}
      <div style={{
        background: cat.bg, padding: "14px 16px 12px",
        borderBottom: "3px solid #1b1b1b",
        display: "flex", alignItems: "flex-start", gap: 10,
      }}>
        {/* Category badge */}
        <span style={{
          fontSize: 22, width: 42, height: 42, flexShrink: 0,
          background: "#fff", borderRadius: 8,
          border: "2px solid #1b1b1b",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "2px 2px 0px 0px #1b1b1b",
        }}>{cat.icon}</span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <span style={{
              fontSize: 9, fontWeight: 900, color: cat.color,
              textTransform: "uppercase", letterSpacing: "0.06em",
              fontFamily: "'Montserrat', sans-serif"
            }}>{event.category}</span>
            {isMine && (
              <span style={{
                fontSize: 9, fontWeight: 900, color: "#fff",
                background: "#7531d3", border: "1.5px solid #1b1b1b",
                borderRadius: 4, padding: "1px 6px",
                boxShadow: "1px 1px 0px 0px #1b1b1b",
                fontFamily: "'Montserrat', sans-serif"
              }}>YOUR EVENT</span>
            )}
            {/* OPEN TO ALL badge */}
            <span style={{
              fontSize: 9, fontWeight: 900, color: "#15803D",
              background: "#DCFCE7", border: "1.5px solid #1b1b1b",
              borderRadius: 4, padding: "1px 6px",
              boxShadow: "1px 1px 0px 0px #1b1b1b",
              fontFamily: "'Montserrat', sans-serif"
            }}>OPEN TO ALL 🌍</span>
          </div>
          <h3 style={{
            margin: 0, fontSize: 16, fontWeight: 950,
            color: "#1b1b1b", lineHeight: 1.3,
            textTransform: "uppercase",
            fontFamily: "'Montserrat', sans-serif"
          }}>{event.title}</h3>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "12px 16px 14px", fontFamily: "'Montserrat', sans-serif" }}>
        {/* Location + when */}
        <div style={{ display: "flex", gap: 14, marginBottom: 10, fontWeight: 800, fontSize: 12, color: "#1b1b1b" }}>
          <span>
            📍 {event.location.toUpperCase()}
          </span>
          <span>
            🕐 {event.when.toUpperCase()}
          </span>
        </div>

        {/* Description */}
        {event.description && (
          <p style={{
            margin: "0 0 12px", fontSize: 13, color: "#555",
            lineHeight: 1.5, fontWeight: 700,
          }}>{event.description}</p>
        )}

        {/* Creator + attendees + CTA */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Creator avatar — blurred photo if available, else emoji */}
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "#f0edec", border: "2px solid #1b1b1b",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, boxShadow: "1.5px 1.5px 0px 0px #1b1b1b",
            overflow: "hidden", position: "relative",
          }}>
            {creatorProfile?.blurredPhotoUrl ? (
              <img
                src={creatorProfile.blurredPhotoUrl}
                alt=""
                style={{
                  width: "100%", height: "100%", objectFit: "cover",
                  filter: "blur(4px) contrast(1.05)",
                }}
              />
            ) : (
              <span style={{ fontSize: 18 }}>{creatorProfile?.avatar || "😊"}</span>
            )}
          </div>

          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 900, color: "#1b1b1b" }}>
              {isMine ? "YOU" : (creatorProfile?.name || "Someone").toUpperCase()} IS GOING
            </p>
            <p style={{ margin: 0, fontSize: 10, color: "#555", fontWeight: 800 }}>
              {filled}/{event.maxPeople} SPOTS • {timeAgo(event.createdAt).toUpperCase()}
            </p>
          </div>

          {/* Spot progress */}
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {Array.from({ length: event.maxPeople }).map((_, i) => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: "50%",
                border: "1.5px solid #1b1b1b",
                background: i < filled ? "#bdff00" : "#ffffff",
              }} />
            ))}
          </div>

          {/* Join / Leave / Full button */}
          {!isMine && (
            <button
              onClick={isJoined ? onLeave : onJoin}
              disabled={isFull}
              className="neo-btn"
              style={{
                padding: "7px 16px", borderRadius: 8, border: "2px solid #1b1b1b",
                background: isFull ? "#eeeeee" : isJoined ? "#ffb2bf" : "#bdff00",
                color: "#1b1b1b",
                boxShadow: isFull ? "none" : "2px 2px 0px 0px #1b1b1b",
                fontWeight: 900, fontSize: 11, cursor: isFull ? "not-allowed" : "pointer",
                fontFamily: "inherit", flexShrink: 0,
                textTransform: "uppercase"
              }}
            >
              {isFull ? "Full" : isJoined ? "Leave" : "Join"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Create Event Modal ───────────────────────────────────────────────────────
function CreateModal({ onClose, onCreate }) {
  const [form, setForm] = useState({
    title: "", category: "Chill", location: "Canteen",
    when: "Right now", maxPeople: 4, description: "",
    customLocation: "", roomNumber: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.title.trim()) return;
    setSubmitting(true);
    const baseLoc = form.location === "Other" ? (form.customLocation.trim() || "Other") : form.location;
    const finalLoc = baseLoc + (form.roomNumber?.trim() ? ` (Room ${form.roomNumber.trim()})` : "");
    await onCreate({
      title: form.title.trim(),
      category: form.category,
      location: finalLoc,
      when: form.when,
      maxPeople: form.maxPeople,
      description: form.description.trim(),
    });
  };

  const catList = Object.keys(CATEGORIES).filter(c => c !== "All");

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(27,27,27,0.85)",
      backdropFilter: "blur(4px)",
      display: "flex", flexDirection: "column", justifyContent: "flex-end",
      fontFamily: "'Montserrat', sans-serif",
    }}>
      <div style={{
        background: "#fff",
        borderTop: "4px solid #1b1b1b",
        borderLeft: "4px solid #1b1b1b",
        borderRight: "4px solid #1b1b1b",
        borderRadius: "24px 24px 0 0",
        padding: "20px 20px 40px",
        maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0px -6px 0px 0px rgba(0,0,0,1)",
        animation: "slideUp 0.3s cubic-bezier(.22,1,.36,1)",
      }}>
        <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>

        {/* Drag handle */}
        <div style={{ width: 44, height: 6, borderRadius: 3, background: "#1b1b1b", margin: "0 auto 20px" }} />

        <h3 style={{ margin: "0 0 20px", fontSize: 22, fontWeight: 950, color: "#1b1b1b", textTransform: "uppercase" }}>
          Create a hangout ✨
        </h3>

        {/* Title */}
        <label style={labelStyle}>What's the plan?</label>
        <input
          placeholder='e.g. "Anyone for a walk to canteen?"'
          value={form.title}
          onChange={e => set("title", e.target.value)}
          style={inputStyle}
        />

        {/* Category chips */}
        <label style={labelStyle}>Category</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
          {catList.map(c => {
            const cat = CATEGORIES[c];
            const active = form.category === c;
            return (
              <button key={c} onClick={() => set("category", c)} className="neo-btn" style={{
                padding: "8px 14px", borderRadius: 8,
                border: "2px solid #1b1b1b",
                background: active ? cat.bg : "#ffffff",
                color: "#1b1b1b",
                boxShadow: active ? "2.5px 2.5px 0px 0px #1b1b1b" : "none",
                fontWeight: 900, fontSize: 12, cursor: "pointer",
                fontFamily: "inherit",
              }}>
                {cat.icon} {c.toUpperCase()}
              </button>
            );
          })}
        </div>

        {/* Location chips */}
        <label style={labelStyle}>Where?</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: form.location === "Other" ? 8 : 18 }}>
          {LOCATIONS.map(loc => (
            <button key={loc} onClick={() => set("location", loc)} className="neo-btn" style={{
              padding: "8px 14px", borderRadius: 8,
              border: "2px solid #1b1b1b",
              background: form.location === loc ? "#ffb2bf" : "#ffffff",
              color: "#1b1b1b",
              boxShadow: form.location === loc ? "2.5px 2.5px 0px 0px #1b1b1b" : "none",
              fontWeight: 900, fontSize: 12, cursor: "pointer",
              fontFamily: "inherit",
            }}>{loc.toUpperCase()}</button>
          ))}
        </div>
        {form.location === "Other" && (
          <>
            <label style={labelStyle}>Custom Place Name</label>
            <input
              placeholder='e.g. "Mechanical Workshop", "Audi 2"'
              value={form.customLocation}
              onChange={e => set("customLocation", e.target.value)}
              style={{ ...inputStyle, marginBottom: 18 }}
            />
          </>
        )}

        {/* Room Number Option */}
        <label style={labelStyle}>Room / Lab Number (Optional)</label>
        <input
          placeholder='e.g. "Room 402", "Lab 203"'
          value={form.roomNumber}
          onChange={e => set("roomNumber", e.target.value)}
          style={{ ...inputStyle, marginBottom: 18 }}
        />

        {/* When chips */}
        <label style={labelStyle}>When?</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
          {WHEN_OPTIONS.map(w => (
            <button key={w} onClick={() => set("when", w)} className="neo-btn" style={{
              padding: "8px 14px", borderRadius: 8,
              border: "2px solid #1b1b1b",
              background: form.when === w ? "#ecdcff" : "#ffffff",
              color: "#1b1b1b",
              boxShadow: form.when === w ? "2.5px 2.5px 0px 0px #1b1b1b" : "none",
              fontWeight: 900, fontSize: 12, cursor: "pointer",
              fontFamily: "inherit",
            }}>{w.toUpperCase()}</button>
          ))}
        </div>

        {/* Max people */}
        <label style={labelStyle}>How many people? (including you)</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {MAX_PEOPLE_OPTIONS.map(n => (
            <button key={n} onClick={() => set("maxPeople", n)} className="neo-btn" style={{
              width: 42, height: 42, borderRadius: 8,
              border: "2px solid #1b1b1b",
              background: form.maxPeople === n ? "#bdff00" : "#ffffff",
              color: "#1b1b1b",
              boxShadow: form.maxPeople === n ? "2.5px 2.5px 0px 0px #1b1b1b" : "none",
              fontWeight: 950, fontSize: 14, cursor: "pointer",
              fontFamily: "inherit",
            }}>{n}</button>
          ))}
        </div>

        {/* Description */}
        <label style={labelStyle}>Add a note (optional)</label>
        <textarea
          placeholder="e.g. Bringing my laptop, will share notes"
          value={form.description}
          onChange={e => set("description", e.target.value)}
          rows={2}
          style={{
            ...inputStyle,
            resize: "none", height: 70, marginBottom: 24,
          }}
        />

        {/* Buttons */}
        <div style={{ display: "flex", gap: 14 }}>
          <button onClick={onClose} className="neo-btn" style={{
            flex: 1, padding: 14, borderRadius: 8,
            border: "3px solid #1b1b1b", background: "#ffffff",
            fontWeight: 900, fontSize: 14, cursor: "pointer", fontFamily: "inherit", color: "#1b1b1b",
            boxShadow: "3px 3px 0px 0px #1b1b1b", textTransform: "uppercase"
          }}>Cancel</button>
          <button
            onClick={submit}
            disabled={!form.title.trim() || submitting}
            className="neo-btn"
            style={{
              flex: 2, padding: 14, borderRadius: 8, border: "3px solid #1b1b1b",
              background: form.title.trim() && !submitting ? "#bdff00" : "#eeeeee",
              color: "#1b1b1b",
              fontWeight: 950, fontSize: 14,
              cursor: form.title.trim() ? "pointer" : "not-allowed",
              fontFamily: "inherit",
              boxShadow: form.title.trim() && !submitting ? "4px 4px 0px 0px #1b1b1b" : "none",
              textTransform: "uppercase"
            }}
          >{submitting ? "Posting…" : "Post Event 🎉"}</button>
        </div>
      </div>
    </div>
  );
}

const labelStyle = {
  display: "block", fontSize: 10, fontWeight: 900,
  color: "#1b1b1b", textTransform: "uppercase",
  letterSpacing: "0.1em", marginBottom: 8,
  fontFamily: "'Montserrat', sans-serif",
};
const inputStyle = {
  width: "100%", padding: "12px 14px", borderRadius: 8,
  border: "2px solid #1b1b1b", fontSize: 14,
  fontFamily: "'Montserrat', sans-serif",
  fontWeight: 700,
  color: "#1b1b1b", background: "#ffffff", marginBottom: 18,
  boxShadow: "2px 2px 0px 0px #1b1b1b",
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Events() {
  const router = useRouter();
  const { user, loading: authLoading } = useRequireAuth();
  const [myPhone, setMyPhone]         = useState(null);
  const [myProfile, setMyProfile]     = useState(null);
  const [events, setEvents]           = useState([]);
  const [creators, setCreators]       = useState({}); // id → profile
  const [filter, setFilter]           = useState("All");
  const [showCreate, setShowCreate]   = useState(false);
  const [loading, setLoading]         = useState(true);

  // ── Auth + my profile ──
  useEffect(() => {
    if (!user) return;
    const phone = user.uid;
    setMyPhone(phone);

    getDoc(doc(db, "profiles", phone)).then(snap => {
      if (!snap.exists()) { router.push("/onboarding"); return; }
      setMyProfile({ id: phone, ...snap.data() });
    });
  }, [user]);

  // ── Real-time events feed ──
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "events"), orderBy("createdAt", "desc")),
      snap => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setEvents(docs);
        setLoading(false);

        // Batch-fetch creator profiles we don't have yet
        const needed = [...new Set(docs.map(e => e.creatorId))]
          .filter(id => id && !creators[id]);
        if (needed.length > 0) {
          Promise.all(needed.map(id => getDoc(doc(db, "profiles", id)))).then(snaps => {
            const updates = {};
            snaps.forEach((s, i) => { if (s.exists()) updates[needed[i]] = s.data(); });
            setCreators(prev => ({ ...prev, ...updates }));
          });
        }
      },
      error => {
        console.error("Error loading events:", error);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  // ── Create event ──
  const createEvent = async (data) => {
    if (!myPhone) return;
    try {
      await addDoc(collection(db, "events"), {
        ...data,
        creatorId: myPhone,
        attendees: [myPhone], // creator auto-joins
        createdAt: serverTimestamp(),
        status: "open",
      });
      setShowCreate(false);
    } catch (e) {
      console.error("Create event error:", e);
      alert("Failed to create event. Try again.");
    }
  };

  // ── Join event ──
  const joinEvent = async (eventId) => {
    if (!myPhone) return;
    try {
      await updateDoc(doc(db, "events", eventId), {
        attendees: arrayUnion(myPhone),
      });
    } catch (e) {
      console.error("Join error:", e);
    }
  };

  // ── Leave event ──
  const leaveEvent = async (eventId) => {
    if (!myPhone) return;
    try {
      await updateDoc(doc(db, "events", eventId), {
        attendees: arrayRemove(myPhone),
      });
    } catch (e) {
      console.error("Leave error:", e);
    }
  };

  // Filter
  const filtered = filter === "All"
    ? events
    : events.filter(e => e.category === filter);

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

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreate={createEvent}
        />
      )}

      <div style={{
        minHeight: "100vh",
        fontFamily: "'Montserrat', sans-serif",
        paddingBottom: 110,
      }}>
        {/* ── Header ── */}
        <div style={{
          background: "#ffffff",
          borderBottom: "3px solid #1b1b1b",
          position: "sticky", top: 0, zIndex: 10,
          padding: "16px 20px 0",
          boxShadow: "0px 4px 0px 0px rgba(0,0,0,1)"
        }}>
          <div style={{ maxWidth: 480, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 950, color: "#1b1b1b", textTransform: "uppercase" }}>
                  Campus Events 🗓️
                </h1>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "#555", fontWeight: 800 }}>
                  OPEN TO ALL · JOIN ANY EVENT, NO MATCH NEEDED
                </p>
              </div>
              <button
                onClick={() => setShowCreate(true)}
                className="neo-btn"
                style={{
                  padding: "9px 16px", borderRadius: 8, border: "2px solid #1b1b1b",
                  background: "#bdff00", color: "#1b1b1b",
                  fontWeight: 950, fontSize: 12, cursor: "pointer",
                  fontFamily: "inherit",
                  boxShadow: "2px 2px 0px 0px #1b1b1b",
                  textTransform: "uppercase"
                }}
              >+ Create</button>
            </div>

            {/* Filter tabs */}
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 14, scrollbarWidth: "none" }}>
              {Object.keys(CATEGORIES).map(cat => {
                const c = CATEGORIES[cat];
                const active = filter === cat;
                return (
                  <button key={cat} onClick={() => setFilter(cat)} className="neo-btn" style={{
                    padding: "6px 14px", borderRadius: 8, flexShrink: 0,
                    border: "2px solid #1b1b1b",
                    background: active ? c.bg : "#ffffff",
                    color: "#1b1b1b",
                    fontWeight: 900, fontSize: 12,
                    cursor: "pointer", fontFamily: "inherit",
                    boxShadow: active ? "2px 2px 0px 0px #1b1b1b" : "none",
                  }}>
                    {c.icon} {cat.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "16px 20px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 48 }}>
              <div style={{ fontSize: 40, animation: "spin 1.2s linear infinite" }}>🗓️</div>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{
              background: "#ffffff",
              border: "3px solid #1b1b1b",
              boxShadow: "6px 6px 0px 0px #1b1b1b",
              borderRadius: 16,
              padding: "48px 28px", textAlign: "center",
            }}>
              <div style={{ fontSize: 56, marginBottom: 14 }}>
                {CATEGORIES[filter]?.icon || "✨"}
              </div>
              <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 950, color: "#1b1b1b", textTransform: "uppercase" }}>
                {filter === "All" ? "No events yet" : `No ${filter} events yet`}
              </h2>
              <p style={{ margin: "0 0 24px", fontSize: 13, color: "#555", fontWeight: 700, lineHeight: 1.6 }}>
                Be the first to create one — your campus crew is waiting!
              </p>
              <button onClick={() => setShowCreate(true)} className="neo-btn" style={{
                padding: "12px 28px", borderRadius: 8, border: "3px solid #1b1b1b",
                background: "#bdff00", color: "#1b1b1b",
                fontWeight: 950, fontSize: 13, cursor: "pointer",
                fontFamily: "inherit", boxShadow: "4px 4px 0px 0px #1b1b1b",
                textTransform: "uppercase"
              }}>
                Create event 🎉
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {filtered.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  myPhone={myPhone}
                  creatorProfile={creators[event.creatorId]}
                  onJoin={() => joinEvent(event.id)}
                  onLeave={() => leaveEvent(event.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <NavBar active="/events" />
    </>
  );
}
