// src/pages/onboarding.js
// Campus Connect — multi-step profile creation.
// Design: Neo-Brutalist Bento from Stitch (Montserrat, dot background, bold shadows).

import { useState, useRef } from "react";
import { useRouter } from "next/router";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useRequireAuth } from "../lib/useAuth";
import { fileToFirestorePhoto } from "../lib/imageUtils";

// ─── Design tokens from Stitch Template ─────────────────────────────────────────
const PRIMARY = "#4b6700";
const PRIMARY_CONTAINER = "#bdff00"; // Lime green
const ON_PRIMARY_CONTAINER = "#547300";
const SECONDARY = "#7531d3"; // Purple accent
const BLK = "#1b1b1b";
const BG = "#f3f3f3";

const STEPS = [
  { id: "name",      label: "IDENTITY" },
  { id: "branch",    label: "COURSE" },
  { id: "year",      label: "YEAR" },
  { id: "stay",      label: "STAY" },
  { id: "vibe",      label: "VIBE" },
  { id: "interests", label: "INTERESTS" },
  { id: "squad",     label: "SQUAD" },
  { id: "spot",      label: "SPOT" },
  { id: "prompt",    label: "VIBE CARD" },
  { id: "photo",     label: "VERIFICATION" },
];

const OPT = {
  branch: [
    { l: "CSE", e: "💻" }, { l: "ECE", e: "📡" }, { l: "IT", e: "🖥️" },
    { l: "Mechanical", e: "⚙️" }, { l: "Civil", e: "🏗️" }, { l: "EEE", e: "⚡" },
    { l: "Chemical Engg", e: "⚗️" }, { l: "Biotech Engg", e: "🧬" },
    { l: "Aerospace", e: "✈️" }, { l: "Mining", e: "⛏️" },
    { l: "Environmental Engg", e: "🌿" }, { l: "Agricultural Engg", e: "🌾" },
    { l: "Marine Engg", e: "🚢" }, { l: "Production Engg", e: "🏭" },
    { l: "BCA", e: "🖥️" }, { l: "MCA", e: "💻" },
    { l: "BBA", e: "📊" }, { l: "MBA", e: "💼" },
    { l: "B.Com", e: "📈" }, { l: "M.Com", e: "📉" }, { l: "PGDM", e: "📋" },
    { l: "BSc Physics", e: "⚛️" }, { l: "BSc Chemistry", e: "🧪" },
    { l: "BSc Maths", e: "📐" }, { l: "BSc Biology", e: "🔬" },
    { l: "BSc CS", e: "💻" }, { l: "BSc Biotech", e: "🧬" },
    { l: "MSc", e: "🔭" },
    { l: "BA English", e: "📝" }, { l: "BA History", e: "🏛️" },
    { l: "BA Pol. Science", e: "🗳️" }, { l: "BA Psychology", e: "🧠" },
    { l: "BA Sociology", e: "👥" }, { l: "BA Economics", e: "💹" },
    { l: "BA Philosophy", e: "🤔" }, { l: "MA", e: "🎓" },
    { l: "LLB", e: "⚖️" }, { l: "LLM", e: "⚖️" },
    { l: "BA LLB", e: "⚖️" }, { l: "BBA LLB", e: "⚖️" },
    { l: "MBBS", e: "🏥" }, { l: "BDS", e: "🦷" },
    { l: "BPharm", e: "💊" }, { l: "MPharm", e: "💊" },
    { l: "BSc Nursing", e: "🩺" }, { l: "Physiotherapy", e: "🏃" },
    { l: "B.Arch", e: "🏛️" }, { l: "B.Des", e: "🎨" },
    { l: "B.Ed", e: "📚" }, { l: "M.Ed", e: "📚" },
    { l: "BSc Agriculture", e: "🌾" }, { l: "MSc Agriculture", e: "🌾" },
    { l: "BHM", e: "🏨" }, { l: "MTM", e: "🧳" },
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

export default function Onboarding() {
  const router = useRouter();
  const scrollRef = useRef(null);
  const { user, loading: authLoading } = useRequireAuth();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // States
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

  // Photo
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState("");
  const [idCardFile, setIdCardFile] = useState(null);
  const [idCardPreview, setIdCardPreview] = useState("");
  const [uploadProgress, setUploadProgress] = useState("");

  const profilePickerRef = useRef(null);
  const idPickerRef = useRef(null);

  const handleFileChange = (setFile, setPreview) => (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const validate = () => {
    if (step === 1 && name.trim().length < 2) return "Enter at least 2 characters for your name";
    if (step === 2 && branch.length === 0) return "Pick at least one branch";
    if (step === 3 && year.length === 0) return "Select your year";
    if (step === 4 && stay.length === 0) return "Hostel or Day Scholar?";
    if (step === 5 && vibe.length === 0) return "Pick at least one vibe";
    if (step === 6 && interests.length < 3) return `Pick ${3 - interests.length} more interest${3 - interests.length > 1 ? "s" : ""}`;
    if (step === 7 && squad.length === 0) return "Select at least one squad type";
    if (step === 8 && spot.length === 0) return "Pick your go-to spot(s)";
    if (step === 9 && prompt.length === 0) return "Pick at least one Saturday plan";
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

    setSaving(true);
    setUploadProgress("Uploading photos…");
    try {
      const userId = user?.uid;
      const phone = user?.phoneNumber || user?.email || "";
      if (!userId) throw new Error("Not authenticated — please sign in again.");

      setUploadProgress("Processing profile photo…");
      const photoUrl = await fileToFirestorePhoto(profilePhotoFile);

      let idCardUrl = "";
      if (idCardFile) {
        setUploadProgress("Processing college ID…");
        idCardUrl = await fileToFirestorePhoto(idCardFile);
        await setDoc(doc(db, "verifications", userId), {
          idCardUrl, status: "pending", submittedAt: serverTimestamp(),
        });
      }

      setUploadProgress("Saving profile…");
      await setDoc(doc(db, "profiles", userId), {
        id: userId, phone, avatar,
        name: name.trim(), branch, year, stay,
        campusVibe: vibe, interests, squad,
        defaultSpot: spot, weekendVibe: prompt,
        photoUrl, verificationStatus: "pending",
        createdAt: serverTimestamp(), profileComplete: true,
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

  const toggleOption = (list, setList, item, single = false) => {
    if (single) {
      setList(list.includes(item) ? [] : [item]);
    } else {
      setList(list.includes(item) ? list.filter(x => x !== item) : [...list, item]);
    }
  };

  const addCustomOption = (list, setList, text) => {
    const trimmed = text.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
    }
  };

  if (authLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: BG }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 8, animation: "bounce 1s infinite" }}>⚡</div>
          <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}`}</style>
          <p style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 800, color: BLK }}>LOADING...</p>
        </div>
      </div>
    );
  }

  // Calculate percentage progress
  const progressPercent = Math.round((step / STEPS.length) * 100);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,500;0,600;0,700;0,800;0,900;1,800;1,900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body {
          background-color: #f3f3f3;
          background-image: radial-gradient(#bcbcbc 1.5px, transparent 1.5px);
          background-size: 32px 32px;
          font-family: 'Montserrat', sans-serif;
          color: #1b1b1b;
        }

        .neo-shadow {
          box-shadow: 6px 6px 0px 0px #1b1b1b;
        }

        .neo-shadow-small {
          box-shadow: 3px 3px 0px 0px #1b1b1b;
        }

        .neo-button-hover {
          transition: all 0.1s ease;
        }
        .neo-button-hover:hover {
          transform: translate(2px, 2px);
          box-shadow: 2px 2px 0px 0px #1b1b1b;
        }
        .neo-button-hover:active {
          transform: translate(4px, 4px);
          box-shadow: 0px 0px 0px 0px #1b1b1b;
        }

        .glass-bento {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        input:focus, select:focus, textarea:focus {
          outline: none !important;
          border-color: ${SECONDARY} !important;
          box-shadow: 3px 3px 0px 0px ${SECONDARY} !important;
        }

        .step-transition {
          animation: slideUp 0.3s cubic-bezier(.22,1,.36,1) both;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .shake {
          animation: shake 0.3s ease;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
      `}</style>

      {/* Fixed Navigation Bar */}
      <nav style={{
        position: "fixed", top: 0, left: 0, width: "100%", zIndex: 50,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "16px 20px", background: "#fff",
        borderBottom: "3px solid #1b1b1b",
        boxShadow: "0px 4px 0px 0px rgba(0, 0, 0, 0.15)"
      }}>
        <div style={{
          fontFamily: "Montserrat", fontSize: "24px", fontWeight: 900,
          fontStyle: "italic", tracking: "-0.04em", color: PRIMARY
        }}>
          CAMPUS CONNECT
        </div>
        <div style={{
          background: BLK, color: PRIMARY_CONTAINER,
          padding: "4px 10px", borderRadius: 4,
          fontSize: "11px", fontWeight: 800, letterSpacing: "0.06em"
        }}>
          {STEPS[step - 1].label}
        </div>
      </nav>

      {/* Main Container */}
      <main style={{
        width: "100%", maxWidth: "600px", margin: "100px auto 140px",
        padding: "0 16px", display: "flex", flexDirection: "column", gap: "20px"
      }}>
        
        {/* Main Bento container */}
        <div className="glass-bento neo-shadow" style={{
          border: "3px solid #1b1b1b", padding: "24px",
          display: "flex", flexDirection: "column", gap: "24px"
        }}>
          
          {/* Header Block with Progress */}
          <header style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{
              width: "100%", height: "32px", background: "#eee",
              border: "3px solid #1b1b1b", display: "flex", overflow: "hidden"
            }}>
              {/* Progress bars segment */}
              <div style={{
                height: "100%", background: PRIMARY_CONTAINER,
                width: `${progressPercent}%`,
                borderRight: step < STEPS.length ? "3px solid #1b1b1b" : "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "width 0.4s ease-out"
              }}>
                <span style={{ fontSize: "11px", fontWeight: 900, color: ON_PRIMARY_CONTAINER }}>
                  {progressPercent}%
                </span>
              </div>
            </div>
            
            <h1 style={{
              fontSize: "32px", fontWeight: 900, textTransform: "uppercase",
              fontStyle: "italic", letterSpacing: "-0.04em", color: BLK,
              lineHeight: "1.1"
            }}>
              BUILD YOUR <span style={{
                background: PRIMARY_CONTAINER, padding: "2px 8px",
                border: `3px solid ${BLK}`, display: "inline-block",
                transform: "rotate(-1deg)"
              }}>VIBE</span>
            </h1>
          </header>

          {/* Form Step Section */}
          <div key={step} className="step-transition" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* Step 1: Identity */}
            {step === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                
                {/* Profile Photo Upload inside Bento */}
                <div className="neo-shadow-small" style={{
                  border: "3px solid #1b1b1b", background: "#fff",
                  padding: "24px", display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", position: "relative"
                }}>
                  <input
                    ref={profilePickerRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleFileChange(setProfilePhotoFile, setProfilePhotoPreview)}
                  />
                  <div
                    onClick={() => profilePickerRef.current?.click()}
                    style={{
                      width: "130px", height: "130px", borderRadius: "50%",
                      border: "3px solid #1b1b1b", background: "#ecdcff",
                      display: "flex", flexDirection: "column", alignItems: "center",
                      justifyContent: "center", cursor: "pointer", overflow: "hidden",
                      transition: "background 0.2s"
                    }}
                  >
                    {profilePhotoPreview ? (
                      <img src={profilePhotoPreview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <>
                        <span className="material-symbols-outlined" style={{ fontSize: "40px", color: BLK }}>photo_camera</span>
                        <p style={{ fontSize: "9px", fontWeight: 900, marginTop: "4px", textTransform: "uppercase" }}>ADD PHOTO</p>
                      </>
                    )}
                  </div>
                  <div style={{
                    position: "absolute", top: "-10px", right: "-10px",
                    width: "36px", height: "36px", background: SECONDARY,
                    border: "3px solid #1b1b1b", borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center", color: "#fff"
                  }}>★</div>
                  <p style={{ fontSize: "12px", fontWeight: 800, marginTop: "12px", textTransform: "uppercase", color: SECONDARY }}>
                    PROFILE PIC
                  </p>
                  <p style={{ fontSize: "11px", color: "#666", marginTop: "4px" }}>Let them see your energy ⚡</p>
                </div>

                {/* Name & Avatar options */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 900, textTransform: "uppercase", color: SECONDARY }}>
                    YOUR FULL NAME
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Rivera"
                    style={{
                      width: "100%", background: "#fff", border: "3px solid #1b1b1b",
                      padding: "16px", fontSize: "18px", fontWeight: 700,
                      textTransform: "uppercase", borderRadius: "0px",
                      boxShadow: name.length >= 2 ? "3px 3px 0px 0px #1b1b1b" : "none"
                    }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 900, textTransform: "uppercase", color: SECONDARY }}>
                    CHOOSE EMOJI AVATAR
                  </label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {AVATARS.map(av => (
                      <button
                        key={av}
                        type="button"
                        onClick={() => setAvatar(av)}
                        style={{
                          width: "44px", height: "44px", fontSize: "20px",
                          border: "3px solid #1b1b1b", background: avatar === av ? PRIMARY_CONTAINER : "#fff",
                          cursor: "pointer", transition: "all 0.1s",
                          boxShadow: avatar === av ? "3px 3px 0px 0px #1b1b1b" : "none",
                          transform: avatar === av ? "translate(-2px, -2px)" : "none"
                        }}
                      >
                        {av}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* Steps 2-9: General selection steps */}
            {step === 2 && (
              <SelectionStep
                label="COURSE / BRANCH"
                options={OPT.branch}
                value={branch}
                onChange={setBranch}
                placeholder="Search or add course..."
              />
            )}

            {step === 3 && (
              <SelectionStep
                label="CURRENT GRADUATION YEAR"
                options={OPT.year}
                value={year}
                onChange={(val) => setYear(val)}
                single={true}
              />
            )}

            {step === 4 && (
              <SelectionStep
                label="WHERE YOU STAY"
                options={OPT.stay}
                value={stay}
                onChange={setStay}
              />
            )}

            {step === 5 && (
              <SelectionStep
                label="CAMPUS ALTER-EGO VIBES"
                options={OPT.vibe}
                value={vibe}
                onChange={setVibe}
                placeholder="Write custom vibe..."
              />
            )}

            {step === 6 && (
              <SelectionStep
                label="YOUR DEEPEST INTERESTS (SELECT >= 3)"
                options={OPT.interests}
                value={interests}
                onChange={setInterests}
                placeholder="Write custom interest..."
              />
            )}

            {step === 7 && (
              <SelectionStep
                label="SQUAD OBJECTIVES"
                options={OPT.squad}
                value={squad}
                onChange={setSquad}
              />
            )}

            {step === 8 && (
              <SelectionStep
                label="CAMPUS HANGOUT SPOTS"
                options={OPT.spot}
                value={spot}
                onChange={setSpot}
              />
            )}

            {step === 9 && (
              <SelectionStep
                label="MY IDEAL SATURDAY"
                options={OPT.prompt}
                value={prompt}
                onChange={setPrompt}
              />
            )}

            {/* Step 10: Private ID Verification */}
            {step === 10 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                
                {/* Fallback Profile Photo Uploader if missed in Step 1 */}
                {!profilePhotoFile && (
                  <div className="neo-shadow-small" style={{
                    border: "3px solid #1b1b1b", background: "#ffd9de",
                    padding: "24px", display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center", position: "relative",
                    cursor: "pointer"
                  }} onClick={() => profilePickerRef.current?.click()}>
                    <input
                      ref={profilePickerRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleFileChange(setProfilePhotoFile, setProfilePhotoPreview)}
                    />
                    <div style={{
                      width: "80px", height: "80px", borderRadius: "50%",
                      border: "3px solid #1b1b1b", background: "#ffffff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      overflow: "hidden"
                    }}>
                      {profilePhotoPreview ? (
                        <img src={profilePhotoPreview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ fontSize: "36px" }}>📸</span>
                      )}
                    </div>
                    <p style={{ fontSize: "11px", fontWeight: 950, marginTop: "12px", textTransform: "uppercase", color: "#1b1b1b" }}>
                      ⚠️ UPLOAD PROFILE PHOTO REQUIRED
                    </p>
                    <p style={{ fontSize: "9px", color: "#555", marginTop: "4px", fontWeight: 800, textTransform: "uppercase" }}>
                      Tap to select your profile photo
                    </p>
                  </div>
                )}

                <div style={{ marginBottom: "8px" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: 800, textTransform: "uppercase" }}>
                    Student Verification
                  </h3>
                  <p style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                    Upload your ID to request access verification. Admins review it privately.
                  </p>
                </div>

                <div className="neo-shadow-small" style={{
                  border: "3px solid #1b1b1b", background: "#fff",
                  padding: "24px", display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", position: "relative",
                  cursor: "pointer"
                }} onClick={() => idPickerRef.current?.click()}>
                  <input
                    ref={idPickerRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleFileChange(setIdCardFile, setIdCardPreview)}
                  />
                  <div style={{
                    width: "100%", height: "140px",
                    border: "3px dashed #1b1b1b", background: idCardPreview ? "transparent" : "#fcf8ff",
                    display: "flex", flexDirection: "column", alignItems: "center",
                    justifyContent: "center", overflow: "hidden"
                  }}>
                    {idCardPreview ? (
                      <img src={idCardPreview} alt="ID Card Preview" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    ) : (
                      <>
                        <span className="material-symbols-outlined" style={{ fontSize: "48px", color: BLK }}>badge</span>
                        <p style={{ fontSize: "11px", fontWeight: 850, marginTop: "6px", textTransform: "uppercase" }}>
                          TAP TO UPLOAD COLLEGE ID
                        </p>
                      </>
                    )}
                  </div>
                  {idCardFile && (
                    <div style={{
                      position: "absolute", top: "8px", right: "8px",
                      background: PRIMARY_CONTAINER, color: BLK, border: "2px solid #1b1b1b",
                      padding: "2px 8px", fontSize: "10px", fontWeight: 900
                    }}>
                      ✓ SELECTED
                    </div>
                  )}
                </div>

                <div style={{
                  background: "#fff", border: "3px solid #1b1b1b",
                  padding: "16px", display: "flex", gap: "10px", alignItems: "center"
                }}>
                  <span style={{ fontSize: "20px" }}>🔒</span>
                  <p style={{ fontSize: "11px", fontWeight: 650, color: "#444" }}>
                    Your ID is stored securely, encrypted, and is never shown to other users.
                  </p>
                </div>

                {uploadProgress && (
                  <div className="neo-shadow-small" style={{
                    background: PRIMARY_CONTAINER, border: "3px solid #1b1b1b",
                    padding: "12px", fontSize: "12px", fontWeight: 800, textAlign: "center"
                  }}>
                    {uploadProgress.toUpperCase()}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Validation Error Banner */}
          {error && (
            <div className="shake" style={{
              background: "#ffdad6", border: "3px solid #1b1b1b",
              padding: "12px 16px", color: "#ba1a1a",
              fontWeight: 800, fontSize: "13px",
              boxShadow: "3px 3px 0px 0px #1b1b1b"
            }}>
              ⚠️ {error.toUpperCase()}
            </div>
          )}

          {/* Continue / Finish Action Button */}
          <button
            type="button"
            onClick={handleNext}
            disabled={saving}
            className="neo-button-hover"
            style={{
              width: "100%", background: PRIMARY_CONTAINER, color: BLK,
              border: "3px solid #1b1b1b", padding: "18px",
              fontFamily: "Montserrat", fontSize: "18px", fontWeight: 900,
              fontStyle: "italic", textTransform: "uppercase",
              boxShadow: "4px 4px 0px 0px #1b1b1b", cursor: saving ? "wait" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
            }}
          >
            {saving ? "SAVING..." : step === STEPS.length ? "LAUNCH PROFILE 🚀" : "CONTINUE →"}
          </button>

        </div>

        {/* Previous Navigation / Back Control */}
        {step > 1 && (
          <button
            type="button"
            onClick={handleBack}
            disabled={saving}
            className="neo-button-hover"
            style={{
              alignSelf: "flex-start", background: "#fff", color: BLK,
              border: "3px solid #1b1b1b", padding: "12px 24px",
              fontFamily: "Montserrat", fontSize: "13px", fontWeight: 800,
              textTransform: "uppercase", boxShadow: "3px 3px 0px 0px #1b1b1b",
              cursor: "pointer"
            }}
          >
            ← Back
          </button>
        )}

      </main>

      {/* Page Footer */}
      <footer style={{
        width: "100%", padding: "24px 20px", background: SECONDARY,
        borderTop: "3px solid #1b1b1b", display: "flex", flexDirection: "column",
        alignItems: "center", gap: "12px", color: "#fff"
      }}>
        <div style={{ fontFamily: "Montserrat", fontSize: "18px", fontWeight: 900, fontStyle: "italic" }}>
          CAMPUS CONNECT
        </div>
        <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em" }}>
          © 2026 CAMPUS CONNECT. BUILT FOR THE BOLD.
        </p>
      </footer>
    </>
  );
}

// ─── Selection component (Multi/Single selection grids with WriteOwn fallback) ─────
function SelectionStep({ label, options, value, onChange, single = false, placeholder }) {
  const [customText, setCustomText] = useState("");

  const handleToggle = (itemLabel) => {
    if (single) {
      onChange(value.includes(itemLabel) ? [] : [itemLabel]);
    } else {
      onChange(value.includes(itemLabel) ? value.filter(v => v !== itemLabel) : [...value, itemLabel]);
    }
  };

  const handleCustomAddSubmit = (e) => {
    if (e.key === "Enter" || e.type === "click") {
      e.preventDefault();
      const text = customText.trim();
      if (text) {
        addCustomOption(value, onChange, text);
        setCustomText("");
      }
    }
  };

  const standardLabels = options.map(o => o.l);
  const customItems = value.filter(v => !standardLabels.includes(v));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <label style={{ fontSize: "12px", fontWeight: 900, textTransform: "uppercase", color: SECONDARY }}>
        {label}
      </label>

      {/* Option Grid */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {options.map(opt => {
          const selected = value.includes(opt.l);
          return (
            <button
              key={opt.l}
              type="button"
              onClick={() => handleToggle(opt.l)}
              style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                padding: "8px 16px", border: "2px solid #1b1b1b",
                background: selected ? PRIMARY_CONTAINER : "#fff",
                fontWeight: 700, fontSize: "13px", cursor: "pointer",
                boxShadow: selected ? "3px 3px 0px 0px #1b1b1b" : "none",
                transform: selected ? "translate(-2px, -2px)" : "none",
                transition: "all 0.1s"
              }}
            >
              <span>{opt.e}</span> {opt.l}
            </button>
          );
        })}

        {/* Custom items added */}
        {customItems.map(customVal => (
          <button
            key={customVal}
            type="button"
            onClick={() => handleToggle(customVal)}
            style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "8px 16px", border: "2px solid #1b1b1b",
              background: PRIMARY_CONTAINER,
              fontWeight: 700, fontSize: "13px", cursor: "pointer",
              boxShadow: "3px 3px 0px 0px #1b1b1b",
              transform: "translate(-2px, -2px)"
            }}
          >
            ✏️ {customVal}
          </button>
        ))}
      </div>

      {/* Custom item input */}
      {placeholder && (
        <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={handleCustomAddSubmit}
            placeholder={placeholder}
            style={{
              flex: 1, padding: "10px 12px", border: "3px solid #1b1b1b",
              fontSize: "13px", fontWeight: 700, fontFamily: "inherit"
            }}
          />
          <button
            type="button"
            onClick={handleCustomAddSubmit}
            className="neo-button-hover"
            style={{
              padding: "0 18px", background: PRIMARY_CONTAINER, color: BLK,
              border: "3px solid #1b1b1b", fontWeight: 900, cursor: "pointer",
              fontSize: "12px", textTransform: "uppercase",
              boxShadow: "3px 3px 0px 0px #1b1b1b"
            }}
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}
