// src/pages/profile/edit.js
// Single-page form to edit all profile details.
// Design: clean, warm editorial style matching onboarding.
// TODO: swap localStorage "cc_phone" with auth.currentUser.uid when Auth is ready.

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useRequireAuth } from "../../lib/useAuth";

const OPT = {
  branch: [
    { l: "CSE", e: "💻" }, { l: "ECE", e: "📡" }, { l: "IT", e: "🖥️" },
    { l: "Mechanical", e: "⚙️" }, { l: "Civil", e: "🏗️" }, { l: "EEE", e: "⚡" },
    { l: "Biotech", e: "🧬" }, { l: "Chemical", e: "⚗️" }, { l: "MBA/BBA", e: "📊" },
  ],
  year: [
    { l: "1st Year", e: "🌱" }, { l: "2nd Year", e: "🌿" },
    { l: "3rd Year", e: "🌳" }, { l: "4th Year", e: "🎓" },
  ],
  stay: [
    { l: "Hostel", e: "🏠" }, { l: "Day Scholar", e: "🏡" },
  ],
  vibe: [
    { l: "Night owl", e: "🦉" }, { l: "Canteen regular", e: "🍽️" },
    { l: "Library hermit", e: "📚" }, { l: "Fest addict", e: "🎉" },
    { l: "Startup dreamer", e: "🚀" }, { l: "Sports junkie", e: "⚽" },
    { l: "Bunk champion", e: "😴" }, { l: "Meme lord", e: "😂" },
    { l: "Gym rat", e: "💪" }, { l: "Coding grinder", e: "👨‍💻" },
    { l: "Social butterfly", e: "🦋" }, { l: "Chill philosopher", e: "🌊" },
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
    { l: "Study group", e: "📖" }, { l: "Canteen crew", e: "☕" },
    { l: "Fest buddies", e: "🎉" }, { l: "Late-night talks", e: "🌙" },
    { l: "Gaming gang", e: "🕹️" }, { l: "Gym partners", e: "🏋️" },
    { l: "Project partners", e: "💡" }, { l: "Campus explorers", e: "🗺️" },
    { l: "Off-campus escape", e: "🛵" }, { l: "Just vibe", e: "😌" },
    { l: "Hostel hangout", e: "🏠" }, { l: "Road trip crew", e: "🚗" },
  ],
  spot: [
    { l: "Canteen", e: "🍽️" }, { l: "Library", e: "📚" },
    { l: "Sports ground", e: "⚽" }, { l: "Hostel terrace", e: "🌃" },
    { l: "Auditorium steps", e: "🎭" }, { l: "Campus garden", e: "🌿" },
    { l: "Computer labs", e: "💻" }, { l: "Off-campus café", e: "☕" },
    { l: "Parking lot (midnight)", e: "🌙" }, { l: "Workshop area", e: "🔧" },
  ],
  prompt: [
    { l: "Netflix all night 🛋️", e: "🛋️" },
    { l: "Spontaneous road trip 🛵", e: "🛵" },
    { l: "Gaming marathon 🎮", e: "🎮" },
    { l: "Café hopping ☕", e: "☕" },
    { l: "Hostel party 🎉", e: "🎉" },
    { l: "Solo recharge 🌙", e: "🌙" },
    { l: "Fest volunteering 🙌", e: "🙌" },
    { l: "Midnight Maggi run 🍜", e: "🍜" },
  ],
};

const AVATARS = ["😎", "🤩", "🥷", "🧠", "🎭", "🦋", "🐉", "👾", "🌙", "🔥", "⚡", "🎯"];

function Chip({ label, emoji, selected, onClick, color = "#FF4757" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: emoji ? 6 : 0,
        padding: "8px 14px", borderRadius: 999,
        border: selected ? `2px solid ${color}` : "2px solid #E8E6E0",
        background: selected ? `${color}10` : "#fff",
        color: selected ? color : "#444",
        fontSize: 13, fontWeight: 700, cursor: "pointer",
        transition: "all 0.15s", fontFamily: "inherit",
      }}
    >
      {emoji && <span>{emoji}</span>}
      {label}
    </button>
  );
}

function Section({ title, children }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 20, padding: 20,
      marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.04)"
    }}>
      <h3 style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 800, color: "#C0BDB8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {title}
      </h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
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
  const [avatar, setAvatar] = useState("😎");
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
      setAvatar(data.avatar || "😎");
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
      <div style={{ display: "flex", gap: 6, width: "100%", marginTop: 8 }}>
        <input
          type="text"
          value={customText[key] || ""}
          onChange={(e) => setCustomText(prev => ({ ...prev, [key]: e.target.value }))}
          placeholder="Write your own..."
          style={{
            flex: 1, padding: "8px 12px", borderRadius: 10,
            border: "2px solid #E8E6E0", fontSize: 13, outline: "none",
            fontFamily: "inherit"
          }}
        />
        <button
          type="button"
          onClick={() => handleAddCustom(key, setList, list)}
          style={{
            padding: "8px 14px", borderRadius: 10, border: "none",
            background: color, color: "#fff", fontWeight: 700,
            fontSize: 12, cursor: "pointer", fontFamily: "inherit"
          }}
        >
          Add
        </button>
      </div>
    );
  };

  const handleSave = async () => {
    if (name.trim().length < 2) { alert("Please enter at least 2 characters for your name."); return; }
    if (branch.length === 0) { alert("Please select your branch."); return; }
    if (year.length === 0) { alert("Please select your year."); return; }
    if (interests.length < 3) { alert("Please select at least 3 interests."); return; }

    setSaving(true);
    try {
      await updateDoc(doc(db, "profiles", phone), {
        name: name.trim(),
        avatar,
        branch,
        year,
        stay,
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

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#F5F4F0", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}>
        <div style={{ fontSize: 40, animation: "spin 1.2s linear infinite" }}>🔄</div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #F5F4F0; }
        input:focus { border-color: #FF4757 !important; }
      `}</style>

      <div style={{
        minHeight: "100vh", background: "#F5F4F0",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        paddingBottom: 40
      }}>
        {/* Sticky Header */}
        <header style={{
          background: "#fff", borderBottom: "1px solid #EDECE8",
          padding: "16px 20px", position: "sticky", top: 0, zIndex: 10,
        }}>
          <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button onClick={() => router.push("/profile")} style={{
              background: "none", border: "none", color: "#666",
              fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit"
            }}>
              Cancel
            </button>
            <span style={{ fontWeight: 900, fontSize: 15, color: "#111" }}>Edit Profile</span>
            <button onClick={handleSave} disabled={saving} style={{
              background: "none", border: "none", color: "#FF4757",
              fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit"
            }}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </header>

        {/* Scroll Form Container */}
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "16px 20px" }}>
          
          {/* Section: Name */}
          <div style={{
            background: "#fff", borderRadius: 20, padding: 20,
            marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.04)"
          }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 800, color: "#C0BDB8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Your Name
            </h3>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Display name..."
              style={{
                width: "100%", padding: "12px 16px", borderRadius: 12,
                border: "2px solid #E8E6E0", fontSize: 15, outline: "none",
                fontFamily: "inherit", transition: "all 0.15s"
              }}
            />
          </div>

          {/* Section: Avatar */}
          <Section title="Pick Avatar">
            {AVATARS.map(av => (
              <button
                key={av}
                type="button"
                onClick={() => setAvatar(av)}
                style={{
                  width: 48, height: 48, borderRadius: 12, fontSize: 24,
                  border: avatar === av ? "2px solid #FF4757" : "2px solid #E8E6E0",
                  background: avatar === av ? "#FF475710" : "#fff",
                  cursor: "pointer", display: "flex", alignItems: "center",
                  justifyContent: "center", transition: "all 0.15s"
                }}
              >
                {av}
              </button>
            ))}
          </Section>

          {/* Section: Branch */}
          <Section title="Branch / Major">
            {OPT.branch.map(b => (
              <Chip
                key={b.l} label={b.l} emoji={b.e} color="#00B894"
                selected={branch.includes(b.l)}
                onClick={() => handleChipToggle(branch, setBranch, b.l)}
              />
            ))}
            {/* Custom items already added */}
            {branch.filter(b => !OPT.branch.map(x => x.l).includes(b)).map(customVal => (
              <Chip
                key={customVal} label={customVal} emoji="✏️" color="#00B894"
                selected={true}
                onClick={() => handleChipToggle(branch, setBranch, customVal)}
              />
            ))}
            {renderCustomInput("branch", setBranch, branch, "#00B894")}
          </Section>

          {/* Section: Year */}
          <Section title="Year">
            {OPT.year.map(y => (
              <Chip
                key={y.l} label={y.l} emoji={y.e} color="#FDCB6E"
                selected={year.includes(y.l)}
                onClick={() => handleChipToggle(year, setYear, y.l, true)}
              />
            ))}
            {/* Custom items already added */}
            {year.filter(y => !OPT.year.map(x => x.l).includes(y)).map(customVal => (
              <Chip
                key={customVal} label={customVal} emoji="✏️" color="#FDCB6E"
                selected={true}
                onClick={() => handleChipToggle(year, setYear, customVal, true)}
              />
            ))}
            {renderCustomInput("year", setYear, year, "#FDCB6E")}
          </Section>

          {/* Section: Stay */}
          <Section title="Stay Type">
            {OPT.stay.map(s => (
              <Chip
                key={s.l} label={s.l} emoji={s.e} color="#0984E3"
                selected={stay.includes(s.l)}
                onClick={() => handleChipToggle(stay, setStay, s.l)}
              />
            ))}
            {/* Custom items already added */}
            {stay.filter(s => !OPT.stay.map(x => x.l).includes(s)).map(customVal => (
              <Chip
                key={customVal} label={customVal} emoji="✏️" color="#0984E3"
                selected={true}
                onClick={() => handleChipToggle(stay, setStay, customVal)}
              />
            ))}
            {renderCustomInput("stay", setStay, stay, "#0984E3")}
          </Section>

          {/* Section: Vibe */}
          <Section title="Campus Vibe">
            {OPT.vibe.map(v => (
              <Chip
                key={v.l} label={v.l} emoji={v.e} color="#E84393"
                selected={vibe.includes(v.l)}
                onClick={() => handleChipToggle(vibe, setVibe, v.l)}
              />
            ))}
            {/* Custom items already added */}
            {vibe.filter(v => !OPT.vibe.map(x => x.l).includes(v)).map(customVal => (
              <Chip
                key={customVal} label={customVal} emoji="✏️" color="#E84393"
                selected={true}
                onClick={() => handleChipToggle(vibe, setVibe, customVal)}
              />
            ))}
            {renderCustomInput("vibe", setVibe, vibe, "#E84393")}
          </Section>

          {/* Section: Interests */}
          <Section title="Interests (select at least 3)">
            {OPT.interests.map(i => (
              <Chip
                key={i.l} label={i.l} emoji={i.e} color="#E17055"
                selected={interests.includes(i.l)}
                onClick={() => handleChipToggle(interests, setInterests, i.l)}
              />
            ))}
            {/* Custom items already added */}
            {interests.filter(i => !OPT.interests.map(x => x.l).includes(i)).map(customVal => (
              <Chip
                key={customVal} label={customVal} emoji="✏️" color="#E17055"
                selected={true}
                onClick={() => handleChipToggle(interests, setInterests, customVal)}
              />
            ))}
            {renderCustomInput("interests", setInterests, interests, "#E17055")}
          </Section>

          {/* Section: Squad Goals */}
          <Section title="Looking For">
            {OPT.squad.map(sq => (
              <Chip
                key={sq.l} label={sq.l} emoji={sq.e} color="#6C5CE7"
                selected={squad.includes(sq.l)}
                onClick={() => handleChipToggle(squad, setSquad, sq.l)}
              />
            ))}
            {/* Custom items already added */}
            {squad.filter(sq => !OPT.squad.map(x => x.l).includes(sq)).map(customVal => (
              <Chip
                key={customVal} label={customVal} emoji="✏️" color="#6C5CE7"
                selected={true}
                onClick={() => handleChipToggle(squad, setSquad, customVal)}
              />
            ))}
            {renderCustomInput("squad", setSquad, squad, "#6C5CE7")}
          </Section>

          {/* Section: Spots */}
          <Section title="Go-to Spots">
            {OPT.spot.map(sp => (
              <Chip
                key={sp.l} label={sp.l} emoji={sp.e} color="#00CEC9"
                selected={spot.includes(sp.l)}
                onClick={() => handleChipToggle(spot, setSpot, sp.l)}
              />
            ))}
            {/* Custom items already added */}
            {spot.filter(sp => !OPT.spot.map(x => x.l).includes(sp)).map(customVal => (
              <Chip
                key={customVal} label={customVal} emoji="✏️" color="#00CEC9"
                selected={true}
                onClick={() => handleChipToggle(spot, setSpot, customVal)}
              />
            ))}
            {renderCustomInput("spot", setSpot, spot, "#00CEC9")}
          </Section>

          {/* Section: Prompts */}
          <Section title="My ideal Saturday looks like...">
            {OPT.prompt.map(p => (
              <Chip
                key={p.l} label={p.l} emoji={p.e} color="#F9A825"
                selected={prompt.includes(p.l)}
                onClick={() => handleChipToggle(prompt, setPrompt, p.l)}
              />
            ))}
            {/* Custom items already added */}
            {prompt.filter(p => !OPT.prompt.map(x => x.l).includes(p)).map(customVal => (
              <Chip
                key={customVal} label={customVal} emoji="✏️" color="#F9A825"
                selected={true}
                onClick={() => handleChipToggle(prompt, setPrompt, customVal)}
              />
            ))}
            {renderCustomInput("prompt", setPrompt, prompt, "#F9A825")}
          </Section>

          <button onClick={handleSave} disabled={saving} style={{
            width: "100%", padding: 14, borderRadius: 14, border: "none",
            background: "#FF4757", color: "#fff", fontWeight: 800,
            fontSize: 15, cursor: "pointer", fontFamily: "inherit",
            boxShadow: "0 4px 16px rgba(255,71,87,0.3)", marginTop: 24
          }}>
            {saving ? "Saving Changes..." : "Save Changes"}
          </button>
        </div>
      </div>
    </>
  );
}
