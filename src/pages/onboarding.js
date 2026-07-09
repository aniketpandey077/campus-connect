// src/pages/onboarding.js
// Campus Connect — multi-step profile creation.
// Design: warm white editorial — NOT dark, NOT purple gradients.
// All fields are multi-select + write-your-own.
// TODO: swap localStorage "cc_phone" with auth.currentUser.uid when Firebase Auth is live.

import { useState, useRef } from "react";
import { useRouter } from "next/router";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useRequireAuth } from "../lib/useAuth";
import { fileToFirestorePhoto } from "../lib/imageUtils";

// ─── Per-step configuration ────────────────────────────────────────────────────
const STEPS = [
  { id: "name",      label: "Your name",        accent: "#FF4757" },
  { id: "branch",    label: "Your branch",       accent: "#00B894" },
  { id: "year",      label: "Your year",         accent: "#FDCB6E" },
  { id: "stay",      label: "Where you stay",    accent: "#0984E3" },
  { id: "vibe",      label: "Your campus vibe",  accent: "#E84393" },
  { id: "interests", label: "Your interests",    accent: "#E17055" },
  { id: "squad",     label: "Squad goals",       accent: "#6C5CE7" },
  { id: "spot",      label: "Your go-to spot",   accent: "#00CEC9" },
  { id: "prompt",    label: "Vibe card",         accent: "#F9A825" },
  { id: "photo",     label: "Verify yourself",   accent: "#10B981" },
];

// ─── Option data ───────────────────────────────────────────────────────────────
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

// ─── Helpers ───────────────────────────────────────────────────────────────────
// Returns true if color is "light" (needs dark text)
const needsDarkText = (hex) => {
  const c = parseInt(hex.slice(1), 16);
  const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 160;
};

// ─── Chip component ────────────────────────────────────────────────────────────
function Chip({ label, emoji, selected, onClick, accent, custom }) {
  const dark = needsDarkText(accent);
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: emoji ? 6 : 0,
        padding: "9px 16px",
        borderRadius: 999,
        border: selected
          ? `2px solid ${accent}`
          : "2px solid #E0DED8",
        background: selected ? accent : "#FFFFFF",
        color: selected ? (dark ? "#111" : "#fff") : "#444",
        fontWeight: selected ? 700 : 500,
        fontSize: 13.5,
        cursor: "pointer",
        transition: "all 0.15s",
        fontFamily: "inherit",
        transform: selected ? "scale(1.04)" : "scale(1)",
        boxShadow: selected ? `0 2px 12px ${accent}40` : "none",
        position: "relative",
      }}
    >
      {emoji && <span style={{ fontSize: 15 }}>{emoji}</span>}
      {label}
      {custom && selected && (
        <span style={{
          marginLeft: 4, fontSize: 10, opacity: 0.7,
          background: "rgba(0,0,0,0.12)", borderRadius: 4, padding: "1px 4px",
        }}>
          custom
        </span>
      )}
    </button>
  );
}

// ─── WriteOwn component ────────────────────────────────────────────────────────
function WriteOwn({ onAdd, accent, placeholder = "Type your answer and press Enter..." }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const ref = useRef(null);
  const dark = needsDarkText(accent);

  const commit = () => {
    const t = text.trim();
    if (t) { onAdd(t); setText(""); }
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { setOpen(true); setTimeout(() => ref.current?.focus(), 60); }}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "9px 16px", borderRadius: 999,
          border: `2px dashed ${accent}80`,
          background: "transparent",
          color: accent,
          fontWeight: 600, fontSize: 13,
          cursor: "pointer", fontFamily: "inherit",
          transition: "all 0.15s",
        }}
      >
        ✏️ write your own
      </button>
    );
  }

  return (
    <div style={{
      display: "flex", gap: 8, width: "100%",
      padding: "10px 14px", borderRadius: 14,
      border: `2px solid ${accent}`,
      background: `${accent}08`,
    }}>
      <input
        ref={ref}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") { setOpen(false); setText(""); }
        }}
        placeholder={placeholder}
        style={{
          flex: 1, border: "none", background: "transparent",
          fontSize: 14, fontFamily: "inherit", color: "#111",
          outline: "none",
        }}
      />
      <button
        type="button"
        onClick={commit}
        style={{
          padding: "4px 14px", borderRadius: 8, border: "none",
          background: accent, color: dark ? "#111" : "#fff",
          fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
        }}
      >Add</button>
      <button
        type="button"
        onClick={() => { setOpen(false); setText(""); }}
        style={{
          padding: "4px 8px", borderRadius: 8, border: "none",
          background: "#F0EEE8", color: "#888",
          fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
        }}
      >✕</button>
    </div>
  );
}

// ─── Generic multi-select chip grid ───────────────────────────────────────────
function ChipGrid({ options, value, onChange, accent, writeOwn = true, writeOwnPlaceholder }) {
  const optionLabels = options.map(o => o.l);

  const toggle = (label) => {
    if (value.includes(label)) onChange(value.filter(v => v !== label));
    else onChange([...value, label]);
  };

  const addCustom = (text) => {
    if (!value.includes(text)) onChange([...value, text]);
  };

  // custom entries = those in value not in optionLabels
  const customEntries = value.filter(v => !optionLabels.includes(v));

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
      {options.map((opt, i) => (
        <Chip
          key={opt.l}
          label={opt.l}
          emoji={opt.e}
          selected={value.includes(opt.l)}
          onClick={() => toggle(opt.l)}
          accent={accent}
        />
      ))}
      {customEntries.map(c => (
        <Chip key={c} label={c} selected onClick={() => toggle(c)} accent={accent} custom />
      ))}
      {writeOwn && (
        <WriteOwn onAdd={addCustom} accent={accent} placeholder={writeOwnPlaceholder} />
      )}
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ step, accent }) {
  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 28, alignItems: "center" }}>
      {STEPS.map((s, i) => (
        <div
          key={i}
          style={{
            height: 3,
            borderRadius: 999,
            flex: 1,
            background: i < step
              ? STEPS[i].accent   // each completed step gets its OWN color
              : "#E8E6E0",
            transition: "background 0.4s",
          }}
        />
      ))}
    </div>
  );
}

// ─── Step header ──────────────────────────────────────────────────────────────
function StepQ({ step, question, sub }) {
  const cfg = STEPS[step - 1];
  return (
    <div style={{ marginBottom: 22 }}>
      <span style={{
        fontSize: 11, fontWeight: 800, letterSpacing: "0.12em",
        color: cfg.accent, textTransform: "uppercase", display: "block", marginBottom: 8,
      }}>
        {cfg.label}
      </span>
      <h2 style={{
        margin: 0, fontSize: 28, fontWeight: 800, color: "#0D0D0D",
        lineHeight: 1.2, letterSpacing: -0.5,
      }}>
        {question}
      </h2>
      {sub && (
        <p style={{ margin: "6px 0 0", fontSize: 14, color: "#888", fontWeight: 400 }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ─── Step 1 — Name + Avatar ───────────────────────────────────────────────────
function StepName({ name, setName, avatar, setAvatar }) {
  const accent = STEPS[0].accent;
  return (
    <>
      <StepQ step={1} question="What do we call you?" sub="This shows on your campus profile." />

      <p style={{ fontSize: 12, fontWeight: 700, color: "#AAA", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
        Pick an avatar
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
        {AVATARS.map(em => (
          <button
            key={em}
            type="button"
            onClick={() => setAvatar(em)}
            style={{
              width: 46, height: 46, borderRadius: 12, fontSize: 22,
              border: avatar === em ? `2px solid ${accent}` : "2px solid #E0DED8",
              background: avatar === em ? `${accent}15` : "#fff",
              cursor: "pointer",
              transform: avatar === em ? "scale(1.12)" : "scale(1)",
              transition: "all 0.15s",
            }}
          >{em}</button>
        ))}
      </div>

      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Your name..."
        autoFocus
        style={{
          width: "100%", padding: "15px 18px", borderRadius: 14,
          border: `2px solid ${name.length >= 2 ? accent : "#E0DED8"}`,
          fontSize: 17, fontWeight: 600, color: "#111",
          outline: "none", fontFamily: "inherit",
          background: "#fff",
          transition: "border-color 0.2s",
          boxSizing: "border-box",
        }}
      />
    </>
  );
}

// ─── Generic select step (used for branch, year, stay, vibe, spot, prompt) ───
function GenericStep({ stepNum, question, sub, options, value, onChange, writeOwn, placeholder }) {
  const cfg = STEPS[stepNum - 1];
  return (
    <>
      <StepQ step={stepNum} question={question} sub={sub} />
      <ChipGrid
        options={options}
        value={value}
        onChange={onChange}
        accent={cfg.accent}
        writeOwn={writeOwn}
        writeOwnPlaceholder={placeholder}
      />
    </>
  );
}

// ─── Step 10 — Photo + ID Upload ─────────────────────────────────────────────
function StepPhoto({
  profilePhotoFile, setProfilePhotoFile, profilePhotoPreview, setProfilePhotoPreview,
  idCardFile,       setIdCardFile,       idCardPreview,       setIdCardPreview,
  uploadProgress, accent,
}) {
  const profileRef = useRef(null);
  const idRef      = useRef(null);

  function onFilePick(setFile, setPreview) {
    return (e) => {
      const file = e.target.files?.[0];
      if (!file || !file.type.startsWith("image/")) return;
      setFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target.result);
      reader.readAsDataURL(file);
    };
  }

  return (
    <>
      <StepQ step={10}
        question="Verify yourself ✅"
        sub="Your photo is only shown to mutual reveals. Your ID stays private — admins review it to approve your profile."
      />

      {/* Profile photo */}
      <p style={{ fontSize: 10, fontWeight: 800, color: "#C0BDB8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
        Your photo (shown after mutual reveal)
      </p>
      <input ref={profileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onFilePick(setProfilePhotoFile, setProfilePhotoPreview)} />
      <div
        onClick={() => profileRef.current?.click()}
        style={{
          width: "100%", height: 160, borderRadius: 16, cursor: "pointer",
          border: profilePhotoFile ? `2px solid ${accent}` : "2px dashed #D0CEC8",
          background: profilePhotoFile ? `${accent}08` : "#FAFAF8",
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden", marginBottom: 18, position: "relative",
          boxSizing: "border-box"
        }}
      >
        {profilePhotoPreview ? (
          <img src={profilePhotoPreview} alt="profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 6 }}>🤳</div>
            <p style={{ margin: 0, fontWeight: 700, color: accent, fontSize: 14 }}>Tap to upload photo</p>
            <p style={{ margin: "3px 0 0", fontSize: 11, color: "#AAA" }}>JPG/PNG • shown only to mutual reveals</p>
          </div>
        )}
        {profilePhotoFile && (
          <div style={{
            position: "absolute", top: 8, right: 8,
            background: accent, color: "#fff", borderRadius: 999,
            fontSize: 11, fontWeight: 700, padding: "3px 10px",
          }}>✓ Selected</div>
        )}
      </div>

      {/* College ID */}
      <p style={{ fontSize: 10, fontWeight: 800, color: "#C0BDB8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
        College ID card (optional — private verification)
      </p>
      <input ref={idRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onFilePick(setIdCardFile, setIdCardPreview)} />
      <div
        onClick={() => idRef.current?.click()}
        style={{
          width: "100%", height: 140, borderRadius: 16, cursor: "pointer",
          border: idCardFile ? "2px solid #6C5CE7" : "2px dashed #D0CEC8",
          background: idCardFile ? "#6C5CE710" : "#FAFAF8",
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden", marginBottom: 14, position: "relative",
          boxSizing: "border-box"
        }}
      >
        {idCardPreview ? (
          <img src={idCardPreview} alt="id" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 6 }}>🪪</div>
            <p style={{ margin: 0, fontWeight: 700, color: "#6C5CE7", fontSize: 14 }}>Tap to upload college ID</p>
            <p style={{ margin: "3px 0 0", fontSize: 11, color: "#AAA" }}>Only admins see this — never shown to other users</p>
          </div>
        )}
        {idCardFile && (
          <div style={{
            position: "absolute", top: 8, right: 8,
            background: "#6C5CE7", color: "#fff", borderRadius: 999,
            fontSize: 11, fontWeight: 700, padding: "3px 10px",
          }}>✓ Selected</div>
        )}
      </div>

      <div style={{ background: "#F0FDF4", borderRadius: 12, padding: "11px 14px", fontSize: 12, color: "#15803D", fontWeight: 600, lineHeight: 1.5 }}>
        🔒 Your ID is stored privately and never shown to other users or on your profile. It's only used to verify you're a real student.
      </div>

      {uploadProgress && (
        <div style={{ marginTop: 14, background: "#EEF2FF", borderRadius: 10, padding: "10px 14px", fontSize: 12, fontWeight: 700, color: "#4338CA" }}>
          ⏳ {uploadProgress}
        </div>
      )}
    </>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function Onboarding() {
  const router = useRouter();
  const scrollRef = useRef(null);
  const { user, loading: authLoading } = useRequireAuth();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Form state — all arrays now (multi-select)
  const [avatar, setAvatar] = useState("😎");
  const [name, setName] = useState("");
  const [branch, setBranch] = useState([]);
  const [year, setYear] = useState([]);
  const [stay, setStay] = useState([]);
  const [vibe, setVibe] = useState([]);
  const [interests, setInterests] = useState([]);
  const [squad, setSquad] = useState([]);
  const [spot, setSpot] = useState([]);
  const [prompt, setPrompt] = useState([]);

  // Photo upload state
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState("");
  const [idCardFile, setIdCardFile]               = useState(null);
  const [idCardPreview, setIdCardPreview]         = useState("");
  const [uploadProgress, setUploadProgress]       = useState("");

  const accent = STEPS[step - 1].accent;
  const dark = needsDarkText(accent);

  const validate = () => {
    if (step === 1 && name.trim().length < 2) return "Enter at least 2 characters for your name";
    if (step === 2 && branch.length === 0) return "Pick at least one branch";
    if (step === 3 && year.length === 0) return "Select your year";
    if (step === 4 && stay.length === 0) return "Hostel or Day Scholar?";
    if (step === 5 && vibe.length === 0) return "Pick at least one vibe that fits you";
    if (step === 6 && interests.length < 3) return `Pick ${3 - interests.length} more interest${3 - interests.length > 1 ? "s" : ""}`;
    if (step === 7 && squad.length === 0) return "Select at least one squad type";
    if (step === 8 && spot.length === 0) return "Pick your go-to spot(s)";
    if (step === 9 && prompt.length === 0) return "Pick at least one vibe";
    if (step === 10 && !profilePhotoFile) return "Upload your profile photo first";
    return "";
  };

  const handleNext = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError("");

    if (step < STEPS.length) {
      setStep(s => s + 1);
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Final submit
    setSaving(true);
    setUploadProgress("Uploading photos…");
    try {
      const userId = user?.uid;
      const phone  = user?.phoneNumber || user?.email || "";
      if (!userId) throw new Error("Not authenticated — please sign in again.");

      /**
       * Firestore: profiles/{phone}
       * {
       *   phone:          string    — temp doc ID, swap for uid
       *   avatar:         string    — emoji
       *   name:           string
       *   branch:         string[]  — multi-select (e.g. ["CSE", "Biotech"])
       *   year:           string[]  — usually 1 entry
       *   stay:           string[]  — "Hostel" | "Day Scholar" (or both for some)
       *   campusVibe:     string[]  — multiple alter-egos allowed
       *   interests:      string[]  — ≥3, including custom entries
       *   squad:          string[]  — what kind of friends they want
       *   defaultSpot:    string[]  — favourite campus spot(s)
       *   weekendVibe:    string[]  — prompt card selection(s)
       *   createdAt:      Timestamp
       *   profileComplete: true
       * }
       */
      // 1. Compress profile photo to fit Firestore's 1MB field limit (free tier, no Storage)
      setUploadProgress("Processing profile photo…");
      const photoUrl = await fileToFirestorePhoto(profilePhotoFile);

      // 2. Compress + save ID card (optional)
      let idCardUrl = "";
      if (idCardFile) {
        setUploadProgress("Processing college ID…");
        idCardUrl = await fileToFirestorePhoto(idCardFile);

        // 3. Write verification doc (private — NOT on the public profile)
        await setDoc(doc(db, "verifications", userId), {
          idCardUrl,
          status: "pending",
          submittedAt: serverTimestamp(),
        });
      }

      setUploadProgress("Saving profile…");

      // 4. Save public profile doc (photoUrl saved here for reveal; verificationStatus starts pending)
      await setDoc(doc(db, "profiles", userId), {
        id: userId,
        phone,
        avatar,
        name: name.trim(),
        branch,
        year,
        stay,
        campusVibe: vibe,
        interests,
        squad,
        defaultSpot: spot,
        weekendVibe: prompt,
        photoUrl,                        // used only in mutual reveal
        verificationStatus: "pending",   // admin sets to "approved" in console
        createdAt: serverTimestamp(),
        profileComplete: true,
      });

      router.push("/swipe");
    } catch (e) {
      console.error("Profile save failed:", e);
      setError(e?.message || "Couldn't save — check your connection and try again.");
      setSaving(false);
    }
  };

  const handleBack = () => {
    setError("");
    setStep(s => Math.max(1, s - 1));
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (authLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <div style={{ fontSize: 24 }}>Loading...</div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #F5F4F0; }
        ::placeholder { color: #BBB; }
        button:active { opacity: 0.85; }
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .step-enter { animation: fadeSlide 0.35s cubic-bezier(.22,1,.36,1) both; }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%,60% { transform: translateX(-6px); }
          40%,80% { transform: translateX(6px); }
        }
        .shake { animation: shake 0.35s ease; }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "#F5F4F0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}>
        {/* Scrollable content */}
        <div
          ref={scrollRef}
          style={{
            width: "100%", maxWidth: 480,
            flex: 1, overflowY: "auto",
            padding: "28px 20px 140px",
          }}
        >
          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: accent,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 15, transition: "background 0.4s",
            }}>🔥</div>
            <span style={{ fontWeight: 800, fontSize: 14, color: "#111", letterSpacing: -0.2 }}>
              Campus Connect
            </span>
          </div>

          {/* Progress */}
          <ProgressBar step={step} accent={accent} />

          {/* Step content — key forces remount + animation */}
          <div key={step} className="step-enter">
            {step === 1 && (
              <StepName name={name} setName={setName} avatar={avatar} setAvatar={setAvatar} />
            )}
            {step === 2 && (
              <GenericStep stepNum={2}
                question="What are you studying?"
                sub="Pick all that apply — dual degrees welcome 🎓"
                options={OPT.branch} value={branch} onChange={setBranch}
                writeOwn placeholder="e.g. Physics, Law, Design..."
              />
            )}
            {step === 3 && (
              <GenericStep stepNum={3}
                question="Which year are you in?"
                sub="Backlog years count too, no judgement 😌"
                options={OPT.year} value={year} onChange={setYear}
                writeOwn placeholder="e.g. 5th Year, Postgrad..."
              />
            )}
            {step === 4 && (
              <GenericStep stepNum={4}
                question="Where do you stay?"
                sub="This helps surface people near you for impromptu plans"
                options={OPT.stay} value={stay} onChange={setStay}
                writeOwn placeholder="e.g. Off-campus PG, Rented apartment..."
              />
            )}
            {step === 5 && (
              <GenericStep stepNum={5}
                question="Your campus alter-ego is..."
                sub="Pick all that resonate. You can be multiple things 🤷"
                options={OPT.vibe} value={vibe} onChange={setVibe}
                writeOwn placeholder="e.g. Hackathon veteran, Debate champion..."
              />
            )}
            {step === 6 && (
              <GenericStep stepNum={6}
                question="What gets you going?"
                sub={`Pick at least 3 — ${interests.length} selected so far`}
                options={OPT.interests} value={interests} onChange={setInterests}
                writeOwn placeholder="e.g. Birdwatching, Robotics, Poetry..."
              />
            )}
            {step === 7 && (
              <GenericStep stepNum={7}
                question="What kind of squad are you building?"
                sub="Pick everything you're open to — more options = better matches"
                options={OPT.squad} value={squad} onChange={setSquad}
                writeOwn placeholder="e.g. Movie nights, Jam sessions..."
              />
            )}
            {step === 8 && (
              <GenericStep stepNum={8}
                question="Where do people find you?"
                sub="Your default campus spot(s) — pick as many as fit"
                options={OPT.spot} value={spot} onChange={setSpot}
                writeOwn placeholder="e.g. Rooftop, Design studio, Backstage..."
              />
            )}
            {step === 9 && (
              <GenericStep stepNum={9}
                question="My ideal Saturday looks like..."
                sub="Shows on your profile card — pick all that match your mood"
                options={OPT.prompt} value={prompt} onChange={setPrompt}
                writeOwn placeholder="e.g. Cooking for the whole hostel floor..."
              />
            )}
            {step === 10 && (
              <StepPhoto
                profilePhotoFile={profilePhotoFile}
                setProfilePhotoFile={setProfilePhotoFile}
                profilePhotoPreview={profilePhotoPreview}
                setProfilePhotoPreview={setProfilePhotoPreview}
                idCardFile={idCardFile}
                setIdCardFile={setIdCardFile}
                idCardPreview={idCardPreview}
                setIdCardPreview={setIdCardPreview}
                uploadProgress={uploadProgress}
                accent={accent}
              />
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="shake" style={{
              marginTop: 18,
              padding: "12px 16px",
              borderRadius: 12,
              background: "#FFF0F0",
              border: "1.5px solid #FFCDD2",
              color: "#C62828",
              fontSize: 13, fontWeight: 600,
            }}>
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Fixed bottom bar */}
        <div style={{
          position: "fixed", bottom: 0,
          left: "50%", transform: "translateX(-50%)",
          width: "100%", maxWidth: 480,
          background: "rgba(245,244,240,0.95)",
          backdropFilter: "blur(12px)",
          borderTop: "1px solid #E8E6E0",
          padding: "14px 20px 24px",
          display: "flex",
          gap: 10,
        }}>
          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              disabled={saving}
              style={{
                width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                border: `2px solid ${accent}`,
                background: "transparent",
                color: accent,
                fontSize: 18, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s",
              }}
            >←</button>
          )}
          <button
            type="button"
            onClick={handleNext}
            disabled={saving}
            style={{
              flex: 1, height: 48, borderRadius: 12,
              border: "none",
              background: saving ? "#CCC" : accent,
              color: saving ? "#888" : (dark ? "#111" : "#fff"),
              fontWeight: 800, fontSize: 15,
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              letterSpacing: -0.2,
              boxShadow: saving ? "none" : `0 4px 16px ${accent}50`,
              transition: "all 0.2s",
            }}
          >
            {saving ? "Saving..." : step === STEPS.length ? "Create profile 🚀" : "Continue →"}
          </button>
        </div>
      </div>
    </>
  );
}
