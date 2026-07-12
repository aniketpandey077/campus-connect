// src/pages/profile/edit.js
// Single-page form to edit all profile details.
// Design: clean, warm editorial style matching onboarding.
// TODO: swap localStorage "cc_phone" with auth.currentUser.uid when Auth is ready.

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "../../lib/firebase";
import { useRequireAuth } from "../../lib/useAuth";

const OPT = {
  branch: [
    // ── Engineering (BTech / BE) ──
    { l: "CSE", e: "💻" }, { l: "ECE", e: "📡" }, { l: "IT", e: "🖥️" },
    { l: "Mechanical", e: "⚙️" }, { l: "Civil", e: "🏗️" }, { l: "EEE", e: "⚡" },
    { l: "Chemical Engg", e: "⚗️" }, { l: "Biotech Engg", e: "🧬" },
    { l: "Aerospace", e: "✈️" }, { l: "Mining", e: "⛏️" },
    { l: "Environmental Engg", e: "🌿" }, { l: "Agricultural Engg", e: "🌾" },
    { l: "Marine Engg", e: "🚢" }, { l: "Production Engg", e: "🏭" },
    // ── Computer Applications ──
    { l: "BCA", e: "🖥️" }, { l: "MCA", e: "💻" },
    // ── Management ──
    { l: "BBA", e: "📊" }, { l: "MBA", e: "💼" },
    { l: "B.Com", e: "📈" }, { l: "M.Com", e: "📉" }, { l: "PGDM", e: "📋" },
    // ── Science ──
    { l: "BSc Physics", e: "⚛️" }, { l: "BSc Chemistry", e: "🧪" },
    { l: "BSc Maths", e: "📐" }, { l: "BSc Biology", e: "🔬" },
    { l: "BSc CS", e: "💻" }, { l: "BSc Biotech", e: "🧬" },
    { l: "MSc", e: "🔭" },
    // ── Arts & Humanities ──
    { l: "BA English", e: "📝" }, { l: "BA History", e: "🏛️" },
    { l: "BA Pol. Science", e: "🗳️" }, { l: "BA Psychology", e: "🧠" },
    { l: "BA Sociology", e: "👥" }, { l: "BA Economics", e: "💹" },
    { l: "BA Philosophy", e: "🤔" }, { l: "MA", e: "🎓" },
    // ── Law ──
    { l: "LLB", e: "⚖️" }, { l: "LLM", e: "⚖️" },
    { l: "BA LLB", e: "⚖️" }, { l: "BBA LLB", e: "⚖️" },
    // ── Medical & Allied Health ──
    { l: "MBBS", e: "🏥" }, { l: "BDS", e: "🦷" },
    { l: "BPharm", e: "💊" }, { l: "MPharm", e: "💊" },
    { l: "BSc Nursing", e: "🩺" }, { l: "Physiotherapy", e: "🏃" },
    // ── Architecture & Design ──
    { l: "B.Arch", e: "🏛️" }, { l: "B.Des", e: "🎨" },
    // ── Education ──
    { l: "B.Ed", e: "📚" }, { l: "M.Ed", e: "📚" },
    // ── Agriculture ──
    { l: "BSc Agriculture", e: "🌾" }, { l: "MSc Agriculture", e: "🌾" },
    // ── Hotel & Tourism ──
    { l: "BHM", e: "🏨" }, { l: "MTM", e: "🧳" },
  ],
  year: [
    { l: "1st Year", e: "🌱" }, { l: "2nd Year", e: "🌿" },
    { l: "3rd Year", e: "🌳" }, { l: "4th Year", e: "🎓" },
  ],
  stay: [
    { l: "Day Scholar (Phagwara PG)", e: "🏡" },
    { l: "BH-1", e: "🏠" },
    { l: "BH-2", e: "🏠" },
    { l: "BH-3", e: "🏠" },
    { l: "BH-4", e: "🏠" },
    { l: "BH-5", e: "🏠" },
    { l: "BH-6", e: "🏠" },
    { l: "BH-7", e: "🏠" },
    { l: "BH-8", e: "🏠" },
    { l: "BH-9 (BS)", e: "🏠" },
    { l: "BH-10 (BS)", e: "🏠" },
    { l: "GH-1", e: "👧" },
    { l: "GH-2", e: "👧" },
    { l: "GH-3", e: "👧" },
    { l: "GH-4", e: "👧" },
    { l: "GH-5", e: "👧" },
    { l: "GH-6", e: "👧" },
    { l: "GH-7", e: "👧" },
    { l: "Girls Apartment", e: "🏢" },
    { l: "Boys Apartment", e: "🏢" },
    { l: "Staff Apartment", e: "🏢" },
  ],
  vibe: [
    { l: "75% Attendance Savior (UMS Grinder)", e: "📈" }, { l: "Uni Mall Food Court Mayor", e: "🍔" },
    { l: "Unipolis Event Organizer (DSA runner)", e: "📣" }, { l: "Block 34 Library Regular", e: "📖" },
    { l: "Bunking Champion (UMS Victim)", e: "😴" }, { l: "Coding Grinder in Block 36", e: "💻" },
    { l: "MBA Suit-walker in Block 13", e: "💼" }, { l: "LPUNET Login Loop Survivor", e: "🌐" },
    { l: "Main Gate Chai Tapri Regular", e: "☕" },
    { l: "UMC Survivor (Scholarship intact!)", e: "🚨" },
    { l: "Minor UMC / Indiscipline Warning recipient", e: "⚠️" },
    { l: "Backbencher (Last Row Philosopher)", e: "🤫" },
    { l: "Night Owl (Late-Night Maggi Crew)", e: "🦉" },
    { l: "Exam Night One-Shot Legend", e: "🏆" },
    { l: "Silent Observer (Introvert Mode)", e: "🍃" },
    { l: "Society Gossip (Tea Spiller)", e: "🍵" },
    { l: "Freelance Hustler (Tech/Design)", e: "💸" },
    { l: "Gym Bro / Fitness Regular", e: "🏋️" },
    { l: "Campus Photographer / Reel Maker", e: "📸" },
    { l: "Bunking at Robopark / CC", e: "🤖" },
    { l: "Always Late to Block 36 Lab", e: "🏃" },
    { l: "Hostel Room DJ / Music Head", e: "🎵" },
    { l: "Always Asking for Outpass", e: "📝" },
  ],
  interests: [
    { l: "Music", e: "🎵" }, { l: "Gaming", e: "🎮" }, { l: "Sports", e: "⚽" },
    { l: "Reading", e: "📚" }, { l: "Fitness", e: "💪" }, { l: "Movies/TV", e: "🎬" },
    { l: "Travel", e: "✈️" }, { l: "Art", e: "🎨" }, { l: "Tech/Coding", e: "👨‍💻" },
    { l: "Cooking", e: "🍳" }, { l: "Photography", e: "📸" }, { l: "Dance", e: "💃" },
    { l: "Anime", e: "🌸" }, { l: "Fashion", e: "👗" }, { l: "Hackathons", e: "⚡" },
    { l: "Fests & Events", e: "🎉" }, { l: "Startups", e: "🚀" },
    { l: "Memes", e: "😂" }, { l: "Thrifting", e: "🛍️" }, { l: "Podcasts", e: "🎙️" },
    { l: "Astrology", e: "🔮" }, { l: "Chess", e: "♟️" }, { l: "Sketching", e: "✏️" },
  ],
  squad: [
    { l: "UMS attendance proxy exchange partner", e: "📖" }, { l: "Uni Mall food sharing crew", e: "🍔" },
    { l: "DSA event attendance proxy seeker", e: "🤝" }, { l: "Late-night chat sessions", e: "💬" },
    { l: "Gate 1 autos sharing squad", e: "🛵" },
  ],
  spot: [
    { l: "Robopark", e: "🤖" }, { l: "CC", e: "🥤" },
    { l: "Uni Mall (Food Court)", e: "🍔" }, { l: "Unipolis steps", e: "🎭" },
    { l: "Block 34 Canteen (Chai break)", e: "☕" }, { l: "Block 36 Computer Labs", e: "💻" },
    { l: "Block 13 DSA Office", e: "🛡️" }, { l: "Main Gate (UMS Outpass Area)", e: "🚪" },
    { l: "Hostel Room Vibe", e: "🏠" }, { l: "Jalandhar Bypass / Haveli Excursion", e: "🚗" },
  ],
  prompt: [
    { l: "Requesting Outpass on UMS", e: "📝" },
    { l: "Pleading to DSA for Indiscipline fine waiver", e: "🙏" },
    { l: "Calculating UMC risk before exam", e: "📝" },
    { l: "Excursion to Jalandhar/Phagwara", e: "🛵" },
    { l: "Struggling to connect to LPUNET", e: "🌐" },
    { l: "Chilling at Unipolis concert", e: "🎵" },
    { l: "UMS Attendance calculation session", e: "📊" },
    { l: "Uni Mall window shopping", e: "🛍️" },
    { l: "Mess food avoidance survival run", e: "🍜" },
    { l: "Maggi at local tapri near Main Gate", e: "🍜" },
  ],
};

const AVATARS = ["😎", "🤩", "🥷", "🧠", "🎭", "🦋", "🐉", "👾", "🌙", "🔥", "⚡", "🎯"];

function Chip({ label, emoji, selected, onClick, color = "#FF4757" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="neo-btn"
      style={{
        display: "inline-flex", alignItems: "center", gap: emoji ? 6 : 0,
        padding: "8px 14px", borderRadius: 8,
        border: "2px solid #1b1b1b",
        background: selected ? color : "#ffffff",
        color: "#1b1b1b",
        fontSize: 12, fontWeight: 900, cursor: "pointer",
        transition: "all 0.1s", fontFamily: "inherit",
        boxShadow: selected ? "2.5px 2.5px 0px 0px #1b1b1b" : "none",
      }}
    >
      {emoji && <span>{emoji}</span>}
      {label.toUpperCase()}
    </button>
  );
}

function Section({ title, children }) {
  return (
    <div style={{
      background: "#fff", border: "3px solid #1b1b1b", borderRadius: 12, padding: 20,
      marginBottom: 20, boxShadow: "4px 4px 0px 0px #1b1b1b"
    }}>
      <h3 style={{
        margin: "0 0 14px", fontSize: 11, fontWeight: 950,
        color: "#1b1b1b", textTransform: "uppercase", letterSpacing: "0.08em",
        borderBottom: "2px solid #1b1b1b", paddingBottom: 6
      }}>
        {title}
      </h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        {children}
      </div>
    </div>
  );
}

export default function EditProfile() {
  const router = useRouter();
  const { user, loading: authLoading } = useRequireAuth();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [userState, setUserState] = useState("");
  const [city, setCity] = useState("");
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [locLoading, setLocLoading] = useState(false);
  const [avatar, setAvatar] = useState("😎");
  const [alwaysOpen, setAlwaysOpen] = useState(false);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setLatitude(lat);
        setLongitude(lon);

        try {
          const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
          if (!res.ok) throw new Error("Location service error");
          const data = await res.json();
          if (data) {
            const resolvedState = data.principalSubdivision || "";
            const resolvedCity = data.city || data.locality || "";
            setUserState(resolvedState);
            setCity(resolvedCity);
          } else {
            alert("Could not resolve city/state from GPS. Please enter manually.");
          }
        } catch (err) {
          console.error("Reverse geocoding failed:", err);
          alert("Location lookup failed. Please enter state and city manually.");
        } finally {
          setLocLoading(false);
        }
      },
      (err) => {
        console.error("Geolocation error:", err);
        alert("GPS access denied or unavailable. Please type state and city manually.");
        setLocLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };
  const [branch, setBranch] = useState([]);
  const [year, setYear] = useState([]);
  const [stay, setStay] = useState([]);
  const [vibe, setVibe] = useState([]);
  const [interests, setInterests] = useState([]);
  const [squad, setSquad] = useState([]);
  const [spot, setSpot] = useState([]);
  const [prompt, setPrompt] = useState([]);

  // Custom additions list (Write your own fallback tracking)
  const [customText, setCustomText] = useState({});

  useEffect(() => {
    if (!user) return;
    setPhone(user.uid);
    loadProfile(user.uid);
  }, [user]);

  const loadProfile = async (num) => {
    try {
      const snap = await getDoc(doc(db, "profiles", num));
      if (!snap.exists()) { router.push("/onboarding"); return; }
      const data = snap.data();
      setName(data.name || "");
      setUsername(data.username || "");
      setUserState(data.state || "");
      setCity(data.city || "");
      setLatitude(data.latitude || null);
      setLongitude(data.longitude || null);
      setAvatar(data.avatar || "😎");
      setAlwaysOpen(data.alwaysOpen || false);
      setBranch(data.branch || []);
      setYear(data.year || []);
      setStay(data.stay || []);
      setVibe(data.campusVibe || []);
      setInterests(data.interests || []);
      setSquad(data.squad || []);
      setSpot(data.defaultSpot || []);
      setPrompt(data.weekendVibe || []);
    } catch (e) {
      alert("Failed to load profile details.");
    } finally {
      setLoading(false);
    }
  };

  const handleChipToggle = (list, setList, val, single = false) => {
    if (single) {
      setList(list.includes(val) ? [] : [val]);
    } else {
      setList(list.includes(val) ? list.filter(v => v !== val) : [...list, val]);
    }
  };

  // ── Render dynamic "Write your own" dialogs ──
  const handleAddCustom = (key, setList, list) => {
    const text = customText[key]?.trim();
    if (!text) return;
    setList([...list, text]);
    setCustomText(prev => ({ ...prev, [key]: "" }));
  };

  const renderCustomInput = (key, setList, list, color = "#FF4757") => {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", marginTop: 12 }}>
        <span style={{ fontSize: "11px", fontWeight: 800, color: "#555" }}>
          ✍️ Don't see yours? Write your own custom option:
        </span>
        <div style={{ display: "flex", gap: 10, width: "100%" }}>
          <input
            type="text"
            value={customText[key] || ""}
            onChange={(e) => setCustomText(prev => ({ ...prev, [key]: e.target.value }))}
            placeholder="Write your own..."
            style={{
              flex: 1, padding: "8px 12px", borderRadius: 8,
              border: "2px solid #1b1b1b", fontSize: 13, outline: "none",
              fontFamily: "inherit", color: "#1b1b1b", background: "#ffffff",
              boxShadow: "2px 2px 0px 0px #1b1b1b",
            }}
          />
          <button
            type="button"
            onClick={() => handleAddCustom(key, setList, list)}
            className="neo-btn"
            style={{
              padding: "8px 16px", borderRadius: 8, border: "2px solid #1b1b1b",
              background: "#bdff00", color: "#1b1b1b", fontWeight: 900,
              fontSize: 12, cursor: "pointer", fontFamily: "inherit",
              boxShadow: "2px 2px 0px 0px #1b1b1b", textTransform: "uppercase"
            }}
          >
            Add
          </button>
        </div>
      </div>
    );
  };

  const handleSave = async () => {
    if (name.trim().length < 2) { alert("Please enter at least 2 characters for your name."); return; }
    if (username.trim().length < 3) { alert("Username must be at least 3 characters."); return; }
    if (!/^[a-z0-9_]+$/.test(username.trim())) { alert("Username can only contain small letters, numbers, and underscores."); return; }
    if (branch.length === 0) { alert("Please select your branch."); return; }
    if (year.length === 0) { alert("Please select your year."); return; }
    if (!userState.trim()) { alert("Please select or enter your state."); return; }
    if (!city.trim()) { alert("Please select or enter your city."); return; }
    if (interests.length < 3) { alert("Please select at least 3 interests."); return; }

    setSaving(true);
    try {
      // Check username uniqueness if changed
      const oldSnap = await getDoc(doc(db, "profiles", phone));
      const oldUsername = oldSnap.data()?.username || "";
      if (username.trim().toLowerCase() !== oldUsername.toLowerCase()) {
        const uQuery = query(
          collection(db, "profiles"),
          where("username", "==", username.trim().toLowerCase())
        );
        const uSnap = await getDocs(uQuery);
        if (!uSnap.empty) {
          alert("This username is already taken. Choose a different one!");
          setSaving(false);
          return;
        }
      }

      await updateDoc(doc(db, "profiles", phone), {
        name: name.trim(),
        username: username.trim().toLowerCase(),
        avatar,
        alwaysOpen,
        branch,
        year,
        stay,
        state: userState.trim(),
        city: city.trim(),
        latitude: latitude || null,
        longitude: longitude || null,
        campusVibe: vibe,
        interests,
        squad,
        defaultSpot: spot,
        weekendVibe: prompt,
      });
      router.push("/profile");
    } catch (e) {
      alert("Failed to save changes. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    const doubleConfirm = confirm(
      "WARNING: Are you sure you want to delete your account? This will permanently remove your profile, verification, and all data from Unihood. This action cannot be undone."
    );
    if (!doubleConfirm) return;

    setSaving(true);
    try {
      // 1. Delete user profile from Firestore
      await deleteDoc(doc(db, "profiles", phone));

      // 2. Delete verification document from Firestore
      await deleteDoc(doc(db, "verifications", phone));

      // 3. Delete user account from Firebase Authentication
      if (auth.currentUser) {
        await auth.currentUser.delete();
      }

      alert("Your account has been successfully deleted.");
      router.push("/login");
    } catch (e) {
      console.error("Account deletion failed:", e);
      alert(
        "Failed to delete account. For security reasons, you may need to log out, log back in, and try again immediately."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        backgroundColor: "#f3f3f3",
        backgroundImage: "radial-gradient(#bcbcbc 1.5px, transparent 1.5px)",
        backgroundSize: "32px 32px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        fontFamily: "'Montserrat', sans-serif"
      }}>
        <div style={{ fontSize: 48, animation: "spin 1.2s linear infinite" }}>⚙️</div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ fontWeight: 900, fontSize: 14 }}>LOADING PROFILE DETAILS...</p>
      </div>
    );
  }

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
        paddingBottom: 60
      }}>
        {/* Sticky Header */}
        <header style={{
          background: "#ffffff",
          borderBottom: "3px solid #1b1b1b",
          padding: "16px 20px",
          position: "sticky", top: 0, zIndex: 10,
          boxShadow: "0px 4px 0px 0px rgba(0,0,0,1)"
        }}>
          <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button onClick={() => router.push("/profile")} className="neo-btn" style={{
              background: "#ffffff", border: "2px solid #1b1b1b", color: "#1b1b1b",
              fontWeight: 900, fontSize: 11, cursor: "pointer", fontFamily: "inherit",
              boxShadow: "2px 2px 0px 0px #1b1b1b", textTransform: "uppercase",
              padding: "6px 12px", borderRadius: 6
            }}>
              Cancel
            </button>
            <span style={{ fontWeight: 950, fontSize: 16, color: "#1b1b1b", textTransform: "uppercase" }}>Edit Profile</span>
            <button onClick={handleSave} disabled={saving} className="neo-btn" style={{
              background: "#bdff00", border: "2px solid #1b1b1b", color: "#1b1b1b",
              fontWeight: 950, fontSize: 11, cursor: "pointer", fontFamily: "inherit",
              boxShadow: "2px 2px 0px 0px #1b1b1b", textTransform: "uppercase",
              padding: "6px 12px", borderRadius: 6
            }}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </header>

        {/* Scroll Form Container */}
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "16px 20px" }}>
          
          {/* Section: Name */}
          <div style={{
            background: "#fff", border: "3px solid #1b1b1b", borderRadius: 12, padding: 20,
            marginBottom: 20, boxShadow: "4px 4px 0px 0px #1b1b1b"
          }}>
            <h3 style={{
              margin: "0 0 12px", fontSize: 11, fontWeight: 950,
              color: "#1b1b1b", textTransform: "uppercase", letterSpacing: "0.08em",
              borderBottom: "2px solid #1b1b1b", paddingBottom: 6
            }}>
              Your Name
            </h3>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Display name..."
              style={{
                width: "100%", padding: "12px 16px", borderRadius: 8,
                border: "2px solid #1b1b1b", fontSize: 14, outline: "none",
                fontFamily: "inherit", color: "#1b1b1b", background: "#ffffff",
                boxShadow: "2px 2px 0px 0px #1b1b1b", marginTop: 4,
                fontWeight: 700
              }}
            />

            <h3 style={{
              margin: "16px 0 12px", fontSize: 11, fontWeight: 950,
              color: "#1b1b1b", textTransform: "uppercase", letterSpacing: "0.08em",
              borderBottom: "2px solid #1b1b1b", paddingBottom: 6
            }}>
              Your Username (For Search)
            </h3>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              placeholder="e.g. alex_rivera"
              style={{
                width: "100%", padding: "12px 16px", borderRadius: 8,
                border: "2px solid #1b1b1b", fontSize: 14, outline: "none",
                fontFamily: "inherit", color: "#1b1b1b", background: "#ffffff",
                boxShadow: "2px 2px 0px 0px #1b1b1b", marginTop: 4,
                fontWeight: 700
              }}
            />
            <span style={{ fontSize: 10, fontWeight: 800, color: "#888", display: "block", marginTop: 6 }}>
              Handles are shown as @{username || "your_handle"} (small letters, numbers, underscores only)
            </span>
          </div>

          {/* Section: Location */}
          <div style={{
            background: "#fff", border: "3px solid #1b1b1b", borderRadius: 12, padding: 20,
            marginBottom: 20, boxShadow: "4px 4px 0px 0px #1b1b1b"
          }}>
            <h3 style={{
              margin: "0 0 12px", fontSize: 11, fontWeight: 950,
              color: "#1b1b1b", textTransform: "uppercase", letterSpacing: "0.08em",
              borderBottom: "2px solid #1b1b1b", paddingBottom: 6
            }}>
              📍 Where are you from?
            </h3>
            
            <button
              type="button"
              onClick={detectLocation}
              disabled={locLoading}
              style={{
                width: "100%", padding: "12px", border: "2px solid #1b1b1b",
                background: "#ecdcff", color: "#1b1b1b", fontWeight: 950,
                fontSize: "12px", cursor: "pointer", fontFamily: "inherit",
                boxShadow: "2px 2px 0px 0px #1b1b1b", textTransform: "uppercase",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                marginBottom: "16px"
              }}
            >
              {locLoading ? "Detecting location..." : "📍 Use My Current Location"}
            </button>

            {/* Map Preview */}
            {latitude && longitude && (
              <div style={{ border: "2px solid #1b1b1b", borderRadius: "8px", overflow: "hidden", boxShadow: "2px 2px 0px 0px #1b1b1b", height: "150px", width: "100%", marginBottom: "16px" }}>
                <iframe
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.02}%2C${latitude - 0.02}%2C${longitude + 0.02}%2C${latitude + 0.02}&layer=mapnik&marker=${latitude}%2C${longitude}`}
                />
              </div>
            )}

            <h3 style={{
              margin: "0 0 12px", fontSize: 11, fontWeight: 950,
              color: "#1b1b1b", textTransform: "uppercase", letterSpacing: "0.08em",
              borderBottom: "2px solid #1b1b1b", paddingBottom: 6
            }}>
              Your State
            </h3>
            <input
              type="text"
              list="indian-states"
              value={userState}
              onChange={(e) => setUserState(e.target.value)}
              placeholder="Select or enter state..."
              style={{
                width: "100%", padding: "12px 16px", borderRadius: 8,
                border: "2px solid #1b1b1b", fontSize: 14, outline: "none",
                fontFamily: "inherit", color: "#1b1b1b", background: "#ffffff",
                boxShadow: "2px 2px 0px 0px #1b1b1b", marginTop: 4,
                fontWeight: 700
              }}
            />
            <datalist id="indian-states">
              {["Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Jammu and Kashmir", "Ladakh", "Puducherry"].map(st => (
                <option key={st} value={st} />
              ))}
            </datalist>

            <h3 style={{
              margin: "16px 0 12px", fontSize: 11, fontWeight: 950,
              color: "#1b1b1b", textTransform: "uppercase", letterSpacing: "0.08em",
              borderBottom: "2px solid #1b1b1b", paddingBottom: 6
            }}>
              Your City
            </h3>
            <input
              type="text"
              list="indian-cities"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Select or enter city..."
              style={{
                width: "100%", padding: "12px 16px", borderRadius: 8,
                border: "2px solid #1b1b1b", fontSize: 14, outline: "none",
                fontFamily: "inherit", color: "#1b1b1b", background: "#ffffff",
                boxShadow: "2px 2px 0px 0px #1b1b1b", marginTop: 4,
                fontWeight: 700
              }}
            />
            <datalist id="indian-cities">
              {["Jalandhar", "Phagwara", "Ludhiana", "Amritsar", "Patiala", "Bathinda", "Chandigarh", "Mohali", "Panchkula", "Delhi", "Mumbai", "Pune", "Nagpur", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Ahmedabad", "Surat", "Jaipur", "Jodhpur", "Udaipur", "Kota", "Lucknow", "Kanpur", "Varanasi", "Noida", "Ghaziabad", "Gurugram", "Faridabad", "Patna", "Ranchi", "Bhopal", "Indore", "Raipur", "Dehradun", "Shimla", "Guwahati", "Bhubaneswar"].map(ct => (
                <option key={ct} value={ct} />
              ))}
            </datalist>
          </div>

          {/* Section: Avatar */}
          <Section title="Pick Avatar">
            {AVATARS.map(av => (
              <button
                key={av}
                type="button"
                onClick={() => setAvatar(av)}
                className="neo-btn"
                style={{
                  width: 48, height: 48, borderRadius: 8, fontSize: 24,
                  border: "2px solid #1b1b1b",
                  background: avatar === av ? "#bdff00" : "#ffffff",
                  cursor: "pointer", display: "flex", alignItems: "center",
                  justifyContent: "center", transition: "all 0.1s",
                  boxShadow: avatar === av ? "2px 2px 0px 0px #1b1b1b" : "none"
                }}
              >
                {av}
              </button>
            ))}
          </Section>

          {/* Section: Visibility / Privacy Toggle */}
          <div style={{
            background: "#fff", border: "3px solid #1b1b1b", borderRadius: 12, padding: 20,
            marginBottom: 20, boxShadow: "4px 4px 0px 0px #1b1b1b"
          }}>
            <h3 style={{
              margin: "0 0 12px", fontSize: 11, fontWeight: 950,
              color: "#1b1b1b", textTransform: "uppercase", letterSpacing: "0.08em",
              borderBottom: "2px solid #1b1b1b", paddingBottom: 6
            }}>
              Profile Visibility
            </h3>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
              <div style={{ paddingRight: 10 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: "#1b1b1b" }}>
                  ALWAYS KEEP PROFILE OPEN
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 10, color: "#555", fontWeight: 700, lineHeight: 1.4 }}>
                  Turn this on to skip anonymous matching and always reveal your name and avatar by default.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAlwaysOpen(!alwaysOpen)}
                className="neo-btn"
                style={{
                  padding: "8px 16px", borderRadius: 8,
                  border: "2.5px solid #1b1b1b",
                  background: alwaysOpen ? "#bdff00" : "#ffb2bf",
                  color: "#1b1b1b",
                  fontSize: 11, fontWeight: 950, cursor: "pointer",
                  boxShadow: "2.5px 2.5px 0px 0px #1b1b1b",
                  flexShrink: 0,
                  textTransform: "uppercase"
                }}
              >
                {alwaysOpen ? "ON 🟢" : "OFF 🔴"}
              </button>
            </div>
          </div>

          {/* Section: Branch */}
          <Section title="Branch / Major">
            {OPT.branch.map(b => (
              <Chip
                key={b.l} label={b.l} emoji={b.e} color="#ffd9de"
                selected={branch.includes(b.l)}
                onClick={() => handleChipToggle(branch, setBranch, b.l)}
              />
            ))}
            {/* Custom items already added */}
            {branch.filter(b => !OPT.branch.map(x => x.l).includes(b)).map(customVal => (
              <Chip
                key={customVal} label={customVal} emoji="✏️" color="#ffd9de"
                selected={true}
                onClick={() => handleChipToggle(branch, setBranch, customVal)}
              />
            ))}
            {renderCustomInput("branch", setBranch, branch, "#ffd9de")}
          </Section>

          {/* Section: Year */}
          <Section title="Year">
            {OPT.year.map(y => (
              <Chip
                key={y.l} label={y.l} emoji={y.e} color="#fef3c7"
                selected={year.includes(y.l)}
                onClick={() => handleChipToggle(year, setYear, y.l, true)}
              />
            ))}
            {/* Custom items already added */}
            {year.filter(y => !OPT.year.map(x => x.l).includes(y)).map(customVal => (
              <Chip
                key={customVal} label={customVal} emoji="✏️" color="#fef3c7"
                selected={true}
                onClick={() => handleChipToggle(year, setYear, customVal, true)}
              />
            ))}
            {renderCustomInput("year", setYear, year, "#fef3c7")}
          </Section>

          {/* Section: Stay */}
          <Section title="Stay Type">
            {OPT.stay.map(s => (
              <Chip
                key={s.l} label={s.l} emoji={s.e} color="#f0fdf4"
                selected={stay.includes(s.l)}
                onClick={() => handleChipToggle(stay, setStay, s.l)}
              />
            ))}
            {/* Custom items already added */}
            {stay.filter(s => !OPT.stay.map(x => x.l).includes(s)).map(customVal => (
              <Chip
                key={customVal} label={customVal} emoji="✏️" color="#f0fdf4"
                selected={true}
                onClick={() => handleChipToggle(stay, setStay, customVal)}
              />
            ))}
            {renderCustomInput("stay", setStay, stay, "#f0fdf4")}
          </Section>

          {/* Section: Vibe */}
          <Section title="Campus Vibe">
            {OPT.vibe.map(v => (
              <Chip
                key={v.l} label={v.l} emoji={v.e} color="#ffd9de"
                selected={vibe.includes(v.l)}
                onClick={() => handleChipToggle(vibe, setVibe, v.l)}
              />
            ))}
            {/* Custom items already added */}
            {vibe.filter(v => !OPT.vibe.map(x => x.l).includes(v)).map(customVal => (
              <Chip
                key={customVal} label={customVal} emoji="✏️" color="#ffd9de"
                selected={true}
                onClick={() => handleChipToggle(vibe, setVibe, customVal)}
              />
            ))}
            {renderCustomInput("vibe", setVibe, vibe, "#ffd9de")}
          </Section>

          {/* Section: Interests */}
          <Section title="Interests (select at least 3)">
            {OPT.interests.map(i => (
              <Chip
                key={i.l} label={i.l} emoji={i.e} color="#ecdcff"
                selected={interests.includes(i.l)}
                onClick={() => handleChipToggle(interests, setInterests, i.l)}
              />
            ))}
            {/* Custom items already added */}
            {interests.filter(i => !OPT.interests.map(x => x.l).includes(i)).map(customVal => (
              <Chip
                key={customVal} label={customVal} emoji="✏️" color="#ecdcff"
                selected={true}
                onClick={() => handleChipToggle(interests, setInterests, customVal)}
              />
            ))}
            {renderCustomInput("interests", setInterests, interests, "#ecdcff")}
          </Section>

          {/* Section: Squad Goals */}
          <Section title="Looking For">
            {OPT.squad.map(sq => (
              <Chip
                key={sq.l} label={sq.l} emoji={sq.e} color="#d6baff"
                selected={squad.includes(sq.l)}
                onClick={() => handleChipToggle(squad, setSquad, sq.l)}
              />
            ))}
            {/* Custom items already added */}
            {squad.filter(sq => !OPT.squad.map(x => x.l).includes(sq)).map(customVal => (
              <Chip
                key={customVal} label={customVal} emoji="✏️" color="#d6baff"
                selected={true}
                onClick={() => handleChipToggle(squad, setSquad, customVal)}
              />
            ))}
            {renderCustomInput("squad", setSquad, squad, "#d6baff")}
          </Section>

          {/* Section: Spots */}
          <Section title="Go-to Spots">
            {OPT.spot.map(sp => (
              <Chip
                key={sp.l} label={sp.l} emoji={sp.e} color="#eeeeee"
                selected={spot.includes(sp.l)}
                onClick={() => handleChipToggle(spot, setSpot, sp.l)}
              />
            ))}
            {/* Custom items already added */}
            {spot.filter(sp => !OPT.spot.map(x => x.l).includes(sp)).map(customVal => (
              <Chip
                key={customVal} label={customVal} emoji="✏️" color="#eeeeee"
                selected={true}
                onClick={() => handleChipToggle(spot, setSpot, customVal)}
              />
            ))}
            {renderCustomInput("spot", setSpot, spot, "#eeeeee")}
          </Section>

          {/* Section: Prompts */}
          <Section title="My ideal Saturday looks like...">
            {OPT.prompt.map(p => (
              <Chip
                key={p.l} label={p.l} emoji={p.e} color="#bdff00"
                selected={prompt.includes(p.l)}
                onClick={() => handleChipToggle(prompt, setPrompt, p.l)}
              />
            ))}
            {/* Custom items already added */}
            {prompt.filter(p => !OPT.prompt.map(x => x.l).includes(p)).map(customVal => (
              <Chip
                key={customVal} label={customVal} emoji="✏️" color="#bdff00"
                selected={true}
                onClick={() => handleChipToggle(prompt, setPrompt, customVal)}
              />
            ))}
            {renderCustomInput("prompt", setPrompt, prompt, "#bdff00")}
          </Section>

          <button onClick={handleSave} disabled={saving} className="neo-btn" style={{
            width: "100%", padding: 16, borderRadius: 8, border: "3px solid #1b1b1b",
            background: "#bdff00", color: "#1b1b1b", fontWeight: 950,
            fontSize: 15, cursor: "pointer", fontFamily: "inherit",
            boxShadow: "4px 4px 0px 0px #1b1b1b", marginTop: 24,
            textTransform: "uppercase"
          }}>
            {saving ? "Saving Changes..." : "Save Changes"}
          </button>

          <button onClick={() => router.push("/profile")} disabled={saving} className="neo-btn" style={{
            width: "100%", padding: 14, borderRadius: 8, border: "3px solid #1b1b1b",
            background: "#ffffff", color: "#1b1b1b", fontWeight: 950,
            fontSize: 14, cursor: "pointer", fontFamily: "inherit",
            boxShadow: "4px 4px 0px 0px #1b1b1b", marginTop: 16,
            textTransform: "uppercase"
          }}>
            Cancel & Go Back
          </button>

          <button onClick={handleDeleteAccount} disabled={saving} className="neo-btn" style={{
            width: "100%", padding: 14, borderRadius: 8, border: "3px solid #1b1b1b",
            background: "#ffb2bf", color: "#b90e4f", fontWeight: 950,
            fontSize: 13, cursor: "pointer", fontFamily: "inherit",
            boxShadow: "4px 4px 0px 0px #1b1b1b", marginTop: 16,
            textTransform: "uppercase", marginBottom: 40
          }}>
            {saving ? "Processing..." : "Delete Account"}
          </button>
        </div>
      </div>
    </>
  );
}
