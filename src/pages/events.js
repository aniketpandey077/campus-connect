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
  "Library", "Canteen", "Hostel Common Room", "Basketball Court",
  "Football Ground", "Seminar Hall", "Parking Lot", "Rooftop",
  "College Cafe", "Lab Block", "Other",
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

// ─── Event card ───────────────────────────────────────────────────────────────
function EventCard({ event, myPhone, onJoin, onLeave, creatorProfile }) {
  const cat = CATEGORIES[event.category] || CATEGORIES.Other;
  const isJoined = (event.attendees || []).includes(myPhone);
  const isMine   = event.creatorId === myPhone;
  const filled   = (event.attendees || []).length;
  const isFull   = filled >= event.maxPeople && !isJoined;

  return (
    <div style={{
      background: "#fff", borderRadius: 18,
      boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
      overflow: "hidden",
    }}>
      {/* Colour strip */}
      <div style={{
        background: cat.bg, padding: "14px 16px 12px",
        borderBottom: `2px solid ${cat.color}20`,
        display: "flex", alignItems: "flex-start", gap: 10,
      }}>
        {/* Category badge */}
        <span style={{
          fontSize: 22, width: 42, height: 42, flexShrink: 0,
          background: "#fff", borderRadius: 12,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}>{cat.icon}</span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <span style={{
              fontSize: 10, fontWeight: 800, color: cat.color,
              textTransform: "uppercase", letterSpacing: "0.06em",
            }}>{event.category}</span>
            {isMine && (
              <span style={{
                fontSize: 9, fontWeight: 700, color: "#fff",
                background: "#6366F1", borderRadius: 999, padding: "1px 7px",
              }}>YOUR EVENT</span>
            )}
          </div>
          <h3 style={{
            margin: 0, fontSize: 16, fontWeight: 800,
            color: "#0D0D0D", lineHeight: 1.3,
          }}>{event.title}</h3>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "12px 16px 14px" }}>
        {/* Location + when */}
        <div style={{ display: "flex", gap: 14, marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: "#666", fontWeight: 500 }}>
            📍 {event.location}
          </span>
          <span style={{ fontSize: 12, color: "#666", fontWeight: 500 }}>
            🕐 {event.when}
          </span>
        </div>

        {/* Description */}
        {event.description && (
          <p style={{
            margin: "0 0 10px", fontSize: 13, color: "#888",
            lineHeight: 1.5,
          }}>{event.description}</p>
        )}

        {/* Creator + attendees + CTA */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Creator avatar */}
          <div style={{
            fontSize: 18, width: 30, height: 30, borderRadius: "50%",
            background: "#F5F4F0",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            {creatorProfile?.avatar || "😊"}
          </div>

          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#888" }}>
              {isMine ? "You" : (creatorProfile?.name || "Someone")} is going
            </p>
            <p style={{ margin: 0, fontSize: 11, color: "#C0BDB8" }}>
              {filled}/{event.maxPeople} spots • {timeAgo(event.createdAt)}
            </p>
          </div>

          {/* Spot progress */}
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {Array.from({ length: event.maxPeople }).map((_, i) => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: "50%",
                background: i < filled ? "#10B981" : "#E0DED8",
              }} />
            ))}
          </div>

          {/* Join / Leave / Full button */}
          {!isMine && (
            <button
              onClick={isJoined ? onLeave : onJoin}
              disabled={isFull}
              style={{
                padding: "7px 16px", borderRadius: 10, border: "none",
                background: isFull ? "#E0DED8" : isJoined ? "#fff" : "#10B981",
                color: isFull ? "#AAA" : isJoined ? "#DC2626" : "#fff",
                border: isJoined ? "1.5px solid #DC262620" : "none",
                fontWeight: 700, fontSize: 12, cursor: isFull ? "not-allowed" : "pointer",
                fontFamily: "inherit", flexShrink: 0,
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
    customLocation: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.title.trim()) return;
    setSubmitting(true);
    await onCreate({
      title: form.title.trim(),
      category: form.category,
      location: form.location === "Other" ? form.customLocation || "Other" : form.location,
      when: form.when,
      maxPeople: form.maxPeople,
      description: form.description.trim(),
    });
  };

  const catList = Object.keys(CATEGORIES).filter(c => c !== "All");

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.55)",
      display: "flex", flexDirection: "column", justifyContent: "flex-end",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <div style={{
        background: "#fff", borderRadius: "22px 22px 0 0",
        padding: "20px 20px 40px",
        maxHeight: "90vh", overflowY: "auto",
        animation: "slideUp 0.3s cubic-bezier(.22,1,.36,1)",
      }}>
        <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>

        {/* Drag handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "#E0DED8", margin: "0 auto 18px" }} />

        <h3 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 900, color: "#0D0D0D" }}>
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
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 18 }}>
          {catList.map(c => {
            const cat = CATEGORIES[c];
            const active = form.category === c;
            return (
              <button key={c} onClick={() => set("category", c)} style={{
                padding: "6px 14px", borderRadius: 999,
                border: active ? `2px solid ${cat.color}` : "2px solid #E0DED8",
                background: active ? cat.bg : "transparent",
                color: active ? cat.color : "#888",
                fontWeight: 700, fontSize: 12, cursor: "pointer",
                fontFamily: "inherit",
              }}>
                {cat.icon} {c}
              </button>
            );
          })}
        </div>

        {/* Location chips */}
        <label style={labelStyle}>Where?</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: form.location === "Other" ? 8 : 18 }}>
          {LOCATIONS.map(loc => (
            <button key={loc} onClick={() => set("location", loc)} style={{
              padding: "6px 14px", borderRadius: 999,
              border: form.location === loc ? "2px solid #FF4757" : "2px solid #E0DED8",
              background: form.location === loc ? "#FFF0F1" : "transparent",
              color: form.location === loc ? "#FF4757" : "#888",
              fontWeight: 700, fontSize: 12, cursor: "pointer",
              fontFamily: "inherit",
            }}>{loc}</button>
          ))}
        </div>
        {form.location === "Other" && (
          <input
            placeholder="Type location..."
            value={form.customLocation}
            onChange={e => set("customLocation", e.target.value)}
            style={{ ...inputStyle, marginBottom: 18 }}
          />
        )}

        {/* When chips */}
        <label style={labelStyle}>When?</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 18 }}>
          {WHEN_OPTIONS.map(w => (
            <button key={w} onClick={() => set("when", w)} style={{
              padding: "6px 14px", borderRadius: 999,
              border: form.when === w ? "2px solid #6366F1" : "2px solid #E0DED8",
              background: form.when === w ? "#EEF2FF" : "transparent",
              color: form.when === w ? "#4338CA" : "#888",
              fontWeight: 700, fontSize: 12, cursor: "pointer",
              fontFamily: "inherit",
            }}>{w}</button>
          ))}
        </div>

        {/* Max people */}
        <label style={labelStyle}>How many people? (including you)</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {MAX_PEOPLE_OPTIONS.map(n => (
            <button key={n} onClick={() => set("maxPeople", n)} style={{
              width: 42, height: 42, borderRadius: 10,
              border: form.maxPeople === n ? "2px solid #FF4757" : "2px solid #E0DED8",
              background: form.maxPeople === n ? "#FFF0F1" : "transparent",
              color: form.maxPeople === n ? "#FF4757" : "#888",
              fontWeight: 800, fontSize: 14, cursor: "pointer",
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
            resize: "none", height: 70, marginBottom: 20,
          }}
        />

        {/* Buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: 13, borderRadius: 12,
            border: "2px solid #E0DED8", background: "transparent",
            fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", color: "#666",
          }}>Cancel</button>
          <button
            onClick={submit}
            disabled={!form.title.trim() || submitting}
            style={{
              flex: 2, padding: 13, borderRadius: 12, border: "none",
              background: form.title.trim() && !submitting ? "#FF4757" : "#E0DED8",
              color: form.title.trim() && !submitting ? "#fff" : "#AAA",
              fontWeight: 800, fontSize: 14,
              cursor: form.title.trim() ? "pointer" : "not-allowed",
              fontFamily: "inherit",
            }}
          >{submitting ? "Posting…" : "Post Event 🎉"}</button>
        </div>
      </div>
    </div>
  );
}

const labelStyle = {
  display: "block", fontSize: 10, fontWeight: 800,
  color: "#C0BDB8", textTransform: "uppercase",
  letterSpacing: "0.1em", marginBottom: 8,
};
const inputStyle = {
  width: "100%", padding: "12px 14px", borderRadius: 12,
  border: "2px solid #E0DED8", fontSize: 14,
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  color: "#111", background: "#FAFAF8", marginBottom: 18,
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
        * { box-sizing: border-box; }
        body { margin: 0; background: #F5F4F0; }
      `}</style>

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreate={createEvent}
        />
      )}

      <div style={{
        minHeight: "100dvh", background: "#F5F4F0",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        paddingBottom: 100,
      }}>
        {/* ── Header ── */}
        <div style={{
          background: "#fff", borderBottom: "1px solid #EDECE8",
          position: "sticky", top: 0, zIndex: 10,
          padding: "16px 20px 0",
        }}>
          <div style={{ maxWidth: 480, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#0D0D0D" }}>
                  Campus Events 🗓️
                </h1>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#AAA" }}>
                  Casual hangouts, right on campus
                </p>
              </div>
              <button
                onClick={() => setShowCreate(true)}
                style={{
                  padding: "9px 16px", borderRadius: 12, border: "none",
                  background: "#FF4757", color: "#fff",
                  fontWeight: 800, fontSize: 13, cursor: "pointer",
                  fontFamily: "inherit",
                  boxShadow: "0 3px 12px #FF475745",
                }}
              >+ Create</button>
            </div>

            {/* Filter tabs */}
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 14, scrollbarWidth: "none" }}>
              {Object.keys(CATEGORIES).map(cat => {
                const c = CATEGORIES[cat];
                const active = filter === cat;
                return (
                  <button key={cat} onClick={() => setFilter(cat)} style={{
                    padding: "6px 14px", borderRadius: 999, flexShrink: 0,
                    border: "none",
                    background: active ? c.bg : "#F5F4F0",
                    color: active ? c.color : "#888",
                    fontWeight: active ? 800 : 600, fontSize: 12,
                    cursor: "pointer", fontFamily: "inherit",
                    outline: active ? `2px solid ${c.color}40` : "none",
                  }}>
                    {c.icon} {cat}
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
              background: "#fff", borderRadius: 20,
              padding: "48px 28px", textAlign: "center",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}>
              <div style={{ fontSize: 56, marginBottom: 14 }}>
                {CATEGORIES[filter]?.icon || "✨"}
              </div>
              <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 900, color: "#0D0D0D" }}>
                {filter === "All" ? "No events yet" : `No ${filter} events yet`}
              </h2>
              <p style={{ margin: "0 0 24px", fontSize: 14, color: "#888", lineHeight: 1.6 }}>
                Be the first to create one — your campus crew is waiting!
              </p>
              <button onClick={() => setShowCreate(true)} style={{
                padding: "12px 28px", borderRadius: 12, border: "none",
                background: "#FF4757", color: "#fff",
                fontWeight: 800, fontSize: 14, cursor: "pointer",
                fontFamily: "inherit", boxShadow: "0 4px 14px #FF475750",
              }}>
                Create event 🎉
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
