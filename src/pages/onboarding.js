// src/pages/onboarding.js
// Campus Connect — multi-step profile creation.
// Design: Neo-Brutalist Bento from Stitch (Montserrat, dot background, bold shadows).

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { signOut } from "firebase/auth";
import { useRequireAuth } from "../lib/useAuth";
import { fileToFirestorePhoto, fileToBlurredPlaceholder } from "../lib/imageUtils";
import { INDIA_STATES_CITIES } from "../lib/indiaStatesCities";

// ─── Design tokens from Stitch Template ─────────────────────────────────────────
const PRIMARY = "#4b6700";
const PRIMARY_CONTAINER = "#bdff00"; // Lime green
const ON_PRIMARY_CONTAINER = "#547300";
const SECONDARY = "#7531d3"; // Purple accent
const BLK = "#1b1b1b";
const BG = "#f3f3f3";

const STEPS = [
  { id: "name",      label: "IDENTITY" },
  { id: "location",  label: "LOCATION" },
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

export default function Onboarding() {
  const router = useRouter();
  const scrollRef = useRef(null);
  const { user, loading: authLoading } = useRequireAuth();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // States
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [userState, setUserState] = useState("");
  const [city, setCity] = useState("");
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [locLoading, setLocLoading] = useState(false);
  const [avatar, setAvatar] = useState("😎");

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }
    setLocLoading(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setLatitude(lat);
        setLongitude(lon);

        try {
          const res = await fetch(`/api/reverse-geocode?lat=${lat}&lon=${lon}`);
          if (!res.ok) throw new Error("Location service error");
          const data = await res.json();
          if (data && (data.state || data.city)) {
            setUserState(data.state || "");
            setCity(data.city || "");
          } else {
            setError("Could not resolve city/state from GPS. Please enter manually.");
          }
        } catch (err) {
          console.error("Reverse geocoding failed:", err);
          setError("Location lookup failed. Please enter state and city manually.");
        } finally {
          setLocLoading(false);
        }
      },
      (err) => {
        console.error("Geolocation error:", err);
        setError("GPS access denied or unavailable. Please type state and city manually.");
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

  // Photo
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState("");
  const [idCardFile, setIdCardFile] = useState(null);
  const [idCardPreview, setIdCardPreview] = useState("");
  const [uploadProgress, setUploadProgress] = useState("");

  const profilePickerRef = useRef(null);
  const idPickerRef = useRef(null);
  const idCameraRef = useRef(null);

  const [verificationMethod, setVerificationMethod] = useState("id_card"); // "id_card" | "student_id"
  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState("");

  // Pre-fill studentName with their onboarding name if empty when reaching the verification step
  useEffect(() => {
    if (step === 11 && !studentName && name) {
      setStudentName(name);
    }
  }, [step, name, studentName]);

  const handleFileChange = (setFile, setPreview) => (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const validate = () => {
    if (step === 1) {
      if (name.trim().length < 2) return "Enter at least 2 characters for your name";
      if (username.trim().length < 3) return "Username must be at least 3 characters";
      if (!/^[a-z0-9_]+$/.test(username.trim())) return "Username can only contain small letters, numbers, and underscores";
    }
    if (step === 2) {
      if (!userState.trim()) return "Please select or enter your state";
      if (!city.trim()) return "Please select or enter your city";
    }
    if (step === 3 && branch.length === 0) return "Pick at least one branch";
    if (step === 4 && year.length === 0) return "Select your year";
    if (step === 5 && stay.length === 0) return "Hostel or Day Scholar?";
    if (step === 6 && vibe.length === 0) return "Pick at least one vibe";
    if (step === 7 && interests.length < 3) return `Pick ${3 - interests.length} more interest${3 - interests.length > 1 ? "s" : ""}`;
    if (step === 8 && squad.length === 0) return "Select at least one squad type";
    if (step === 9 && spot.length === 0) return "Pick your go-to spot(s)";
    if (step === 10 && prompt.length === 0) return "Pick at least one Saturday plan";
    if (step === 11) {
      if (!profilePhotoFile) return "Upload your profile photo first";
      if (verificationMethod === "id_card" && !idCardFile) {
        return "Please upload your ID card image or choose the ID & Name method";
      }
      if (verificationMethod === "student_id") {
        if (!studentName.trim()) return "Please enter your student name";
        if (!studentId.trim()) return "Please enter your student registration ID/roll number";
      }
    }
    return "";
  };

  const handleNext = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError("");

    if (step === 1) {
      setSaving(true);
      try {
        const uQuery = query(
          collection(db, "profiles"),
          where("username", "==", username.trim().toLowerCase())
        );
        const snap = await getDocs(uQuery);
        if (!snap.empty) {
          setError("This username is already taken. Choose a different one!");
          setSaving(false);
          return;
        }
      } catch (e) {
        console.error("Username validation query failed:", e);
      }
      setSaving(false);
    }

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
      const blurredPhotoUrl = await fileToBlurredPlaceholder(profilePhotoFile);

      let idCardUrl = "";
      const verificationData = {
        status: "pending",
        submittedAt: serverTimestamp(),
        verificationMethod,
      };

      if (verificationMethod === "id_card") {
        if (idCardFile) {
          setUploadProgress("Processing college ID…");
          idCardUrl = await fileToFirestorePhoto(idCardFile);
          verificationData.idCardUrl = idCardUrl;
        }
      } else {
        verificationData.studentId = studentId.trim();
        verificationData.studentName = studentName.trim();
      }

      await setDoc(doc(db, "verifications", userId), verificationData);

      setUploadProgress("Saving profile…");
      await setDoc(doc(db, "profiles", userId), {
        id: userId, phone, avatar,
        username: username.trim().toLowerCase(),
        name: name.trim(), branch, year, stay,
        state: userState.trim(), city: city.trim(),
        latitude: latitude || null, longitude: longitude || null,
        campusVibe: vibe, interests, squad,
        defaultSpot: spot, weekendVibe: prompt,
        photoUrl, blurredPhotoUrl, verificationStatus: "pending",
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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (e) {
      console.error("Sign out failed:", e);
    }
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
          min-height: 100vh;
        }

        .neo-shadow {
          box-shadow: 8px 8px 0px 0px #1b1b1b;
        }

        .neo-shadow-small {
          box-shadow: 4px 4px 0px 0px #1b1b1b;
        }

        .neo-button-hover {
          transition: all 0.1s ease;
        }
        .neo-button-hover:hover {
          background: #bdff00 !important;
          color: #1b1b1b !important;
          transform: translate(2px, 2px);
          box-shadow: 2px 2px 0px 0px #1b1b1b;
        }
        .neo-button-hover:active {
          transform: translate(4px, 4px);
          box-shadow: 0px 0px 0px 0px #1b1b1b;
        }

        .glass-bento {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        input:focus, select:focus, textarea:focus {
          outline: none !important;
          border-color: ${SECONDARY} !important;
          box-shadow: 3px 3px 0px 0px ${SECONDARY} !important;
        }

        .step-transition {
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
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
          UNIHOOD
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            background: BLK, color: PRIMARY_CONTAINER,
            padding: "4px 10px", borderRadius: 4,
            fontSize: "11px", fontWeight: 800, letterSpacing: "0.06em"
          }}>
            {STEPS[step - 1].label}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              padding: "5px 12px", borderRadius: 6, border: "2px solid #1b1b1b",
              background: "transparent", color: "#666", fontWeight: 800,
              fontSize: "11px", cursor: "pointer", fontFamily: "Montserrat"
            }}
          >
            SIGN OUT
          </button>
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

                {/* Unique Username Input */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 900, textTransform: "uppercase", color: SECONDARY }}>
                    CHOOSE UNIQUE USERNAME (FOR SEARCHES)
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    placeholder="e.g. alex_rivera"
                    style={{
                      width: "100%", background: "#fff", border: "3px solid #1b1b1b",
                      padding: "16px", fontSize: "18px", fontWeight: 700,
                      borderRadius: "0px",
                      boxShadow: username.length >= 3 ? "3px 3px 0px 0px #1b1b1b" : "none"
                    }}
                  />
                  <span style={{ fontSize: "10px", fontWeight: 800, color: "#888" }}>
                    Handles will be shown as @{username || "your_handle"} (letters, numbers, underscores only)
                  </span>
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

            {/* Step 2: Location Step */}
            {step === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <h2 style={{ fontSize: "20px", fontWeight: 950, textTransform: "uppercase", color: "#1b1b1b", margin: 0 }}>
                  📍 Where are you from?
                </h2>
                <p style={{ fontSize: "11px", fontWeight: 800, color: "#555", margin: 0, textTransform: "uppercase" }}>
                  Used to connect you with other students from your hometown or nearby cities!
                </p>

                {/* GPS Detector button */}
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={locLoading}
                  style={{
                    width: "100%", padding: "14px", border: "3px solid #1b1b1b",
                    background: "#ecdcff", color: "#1b1b1b", fontWeight: 950,
                    fontSize: "13px", cursor: "pointer", fontFamily: "inherit",
                    boxShadow: "3px 3px 0px 0px #1b1b1b", textTransform: "uppercase",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
                  }}
                >
                  {locLoading ? "Detecting location..." : "📍 Use My Current Location"}
                </button>

                {/* OpenStreetMap Preview */}
                {latitude && longitude && (
                  <div style={{ border: "3px solid #1b1b1b", borderRadius: "10px", overflow: "hidden", boxShadow: "3px 3px 0px 0px #1b1b1b", height: "180px", width: "100%" }}>
                    <iframe
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.02}%2C${latitude - 0.02}%2C${longitude + 0.02}%2C${latitude + 0.02}&layer=mapnik&marker=${latitude}%2C${longitude}`}
                    />
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 950, textTransform: "uppercase", color: "#1b1b1b" }}>
                    Select State
                  </label>
                  <select
                    value={userState}
                    onChange={(e) => {
                      setUserState(e.target.value);
                      setCity("");
                    }}
                    style={{
                      width: "100%", padding: "14px", border: "3px solid #1b1b1b",
                      borderRadius: "8px", fontSize: "13px", fontWeight: 800,
                      outline: "none", fontFamily: "inherit",
                      background: "#fff", boxShadow: "2px 2px 0px 0px #1b1b1b",
                      color: "#1b1b1b", cursor: "pointer",
                      appearance: "none",
                      backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%231b1b1b' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 16px center",
                      backgroundSize: "16px"
                    }}
                  >
                    <option value="" disabled>Select State...</option>
                    {Object.keys(INDIA_STATES_CITIES).map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 950, textTransform: "uppercase", color: "#1b1b1b" }}>
                    Select City
                  </label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={!userState}
                    style={{
                      width: "100%", padding: "14px", border: "3px solid #1b1b1b",
                      borderRadius: "8px", fontSize: "13px", fontWeight: 800,
                      outline: "none", fontFamily: "inherit",
                      background: userState ? "#fff" : "#f3f3f3", boxShadow: "2px 2px 0px 0px #1b1b1b",
                      color: "#1b1b1b", cursor: userState ? "pointer" : "not-allowed",
                      appearance: "none",
                      backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%231b1b1b' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 16px center",
                      backgroundSize: "16px"
                    }}
                  >
                    <option value="" disabled>Select City...</option>
                    {(INDIA_STATES_CITIES[userState] || []).map(ct => (
                      <option key={ct} value={ct}>{ct}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Steps 3-10: General selection steps */}
            {step === 3 && (
              <SelectionStep
                label="COURSE / BRANCH"
                options={OPT.branch}
                value={branch}
                onChange={setBranch}
                placeholder="Search or add course..."
              />
            )}

            {step === 4 && (
              <SelectionStep
                label="CURRENT GRADUATION YEAR"
                options={OPT.year}
                value={year}
                onChange={(val) => setYear(val)}
                single={true}
              />
            )}

            {step === 5 && (
              <SelectionStep
                label="WHERE YOU STAY"
                options={OPT.stay}
                value={stay}
                onChange={setStay}
              />
            )}

            {step === 6 && (
              <SelectionStep
                label="CAMPUS ALTER-EGO VIBES"
                options={OPT.vibe}
                value={vibe}
                onChange={setVibe}
                placeholder="Write custom vibe..."
              />
            )}

            {step === 7 && (
              <SelectionStep
                label="YOUR DEEPEST INTERESTS (SELECT >= 3)"
                options={OPT.interests}
                value={interests}
                onChange={setInterests}
                placeholder="Write custom interest..."
              />
            )}

            {step === 8 && (
              <SelectionStep
                label="SQUAD OBJECTIVES"
                options={OPT.squad}
                value={squad}
                onChange={setSquad}
              />
            )}

            {step === 9 && (
              <SelectionStep
                label="CAMPUS HANGOUT SPOTS"
                options={OPT.spot}
                value={spot}
                onChange={setSpot}
              />
            )}

            {step === 10 && (
              <SelectionStep
                label="MY IDEAL SATURDAY"
                options={OPT.prompt}
                value={prompt}
                onChange={setPrompt}
              />
            )}

            {/* Step 11: Private ID Verification */}
            {step === 11 && (
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

                {/* Verification Badge Convincing Banner */}
                <div className="neo-shadow-small" style={{
                  border: "3px solid #1b1b1b",
                  background: "#bdff00",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  boxShadow: "4px 4px 0px 0px #1b1b1b"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "28px", color: BLK, fontWeight: 900 }}>verified_user</span>
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.01em" }}>
                      GET A VERIFIED BADGE 🛡️
                    </h3>
                  </div>
                  <p style={{ margin: 0, fontSize: "12px", fontWeight: 700, lineHeight: "1.5", color: "#1b1b1b" }}>
                    Verify your profile to unlock the ultimate campus experience. Verified students get a shiny badge on their card, show up first in search, and get up to <span style={{ textDecoration: "underline", fontWeight: 900 }}>3x more matches!</span>
                  </p>
                </div>

                {/* Option Selector: Choose verification method */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 900, color: "#555", textTransform: "uppercase" }}>
                    Choose Verification Method:
                  </span>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <button
                      type="button"
                      onClick={() => setVerificationMethod("id_card")}
                      className="neo-button-hover"
                      style={{
                        flex: 1,
                        background: verificationMethod === "id_card" ? "#bdff00" : "#fff",
                        color: BLK,
                        border: "3px solid #1b1b1b",
                        padding: "12px",
                        fontWeight: 900,
                        fontSize: "12px",
                        textTransform: "uppercase",
                        boxShadow: verificationMethod === "id_card" ? "3px 3px 0px 0px #1b1b1b" : "1px 1px 0px 0px #1b1b1b",
                        cursor: "pointer",
                        transition: "all 0.1s"
                      }}
                    >
                      🪪 Upload ID Card
                    </button>
                    <button
                      type="button"
                      onClick={() => setVerificationMethod("student_id")}
                      className="neo-button-hover"
                      style={{
                        flex: 1,
                        background: verificationMethod === "student_id" ? "#bdff00" : "#fff",
                        color: BLK,
                        border: "3px solid #1b1b1b",
                        padding: "12px",
                        fontWeight: 900,
                        fontSize: "12px",
                        textTransform: "uppercase",
                        boxShadow: verificationMethod === "student_id" ? "3px 3px 0px 0px #1b1b1b" : "1px 1px 0px 0px #1b1b1b",
                        cursor: "pointer",
                        transition: "all 0.1s"
                      }}
                    >
                      ✏️ Use ID & Name
                    </button>
                  </div>
                </div>

                {/* Render selected verification method fields */}
                {verificationMethod === "id_card" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ marginBottom: "2px" }}>
                      <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 900, textTransform: "uppercase" }}>
                        Method 1: Upload College ID Card
                      </h4>
                      <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#666" }}>
                        Take a clear picture of your physical ID card or upload it from your gallery.
                      </p>
                    </div>

                    <div className="neo-shadow-small" style={{
                      border: "3px solid #1b1b1b", background: "#fff",
                      padding: "20px", display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center", gap: "16px"
                    }}>
                      {/* Hidden file inputs */}
                      <input
                        ref={idPickerRef}
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={handleFileChange(setIdCardFile, setIdCardPreview)}
                      />
                      <input
                        ref={idCameraRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        style={{ display: "none" }}
                        onChange={handleFileChange(setIdCardFile, setIdCardPreview)}
                      />

                      <div style={{
                        width: "100%", height: "150px",
                        border: "3px dashed #1b1b1b", background: idCardPreview ? "transparent" : "#fcf8ff",
                        display: "flex", flexDirection: "column", alignItems: "center",
                        justifyContent: "center", overflow: "hidden"
                      }}>
                        {idCardPreview ? (
                          <img src={idCardPreview} alt="ID Card Preview" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                        ) : (
                          <>
                            <span className="material-symbols-outlined" style={{ fontSize: "40px", color: BLK }}>badge</span>
                            <p style={{ fontSize: "10px", fontWeight: 900, marginTop: "6px", textTransform: "uppercase", color: "#666" }}>
                              No ID Image Selected
                            </p>
                          </>
                        )}
                      </div>

                      {/* Photo Capture/Gallery Action Buttons */}
                      <div style={{ display: "flex", gap: "10px", width: "100%" }}>
                        <button
                          type="button"
                          onClick={() => idCameraRef.current?.click()}
                          className="neo-button-hover"
                          style={{
                            flex: 1,
                            background: "#fff",
                            border: "3px solid #1b1b1b",
                            padding: "10px",
                            fontWeight: 900,
                            fontSize: "11px",
                            textTransform: "uppercase",
                            boxShadow: "2px 2px 0px 0px #1b1b1b",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px"
                          }}
                        >
                          📷 Open Camera
                        </button>
                        <button
                          type="button"
                          onClick={() => idPickerRef.current?.click()}
                          className="neo-button-hover"
                          style={{
                            flex: 1,
                            background: "#fff",
                            border: "3px solid #1b1b1b",
                            padding: "10px",
                            fontWeight: 900,
                            fontSize: "11px",
                            textTransform: "uppercase",
                            boxShadow: "2px 2px 0px 0px #1b1b1b",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px"
                          }}
                        >
                          🖼️ Open Gallery
                        </button>
                      </div>

                      {idCardFile && (
                        <div style={{
                          background: "#bdff00", color: BLK, border: "2px solid #1b1b1b",
                          padding: "4px 10px", fontSize: "10px", fontWeight: 900, textTransform: "uppercase"
                        }}>
                          ✓ Image Selected
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ marginBottom: "2px" }}>
                      <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 900, textTransform: "uppercase" }}>
                        Method 2: Use Student ID & Name
                      </h4>
                      <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#666" }}>
                        Enter your registration/roll number and full student name as printed on your ID.
                      </p>
                    </div>

                    <div className="neo-shadow-small" style={{
                      border: "3px solid #1b1b1b", background: "#fff",
                      padding: "20px", display: "flex", flexDirection: "column",
                      gap: "14px"
                    }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label style={{ fontSize: "11px", fontWeight: 900, color: BLK, textTransform: "uppercase" }}>
                          Full Name (As on ID Card)
                        </label>
                        <input
                          type="text"
                          value={studentName}
                          onChange={(e) => setStudentName(e.target.value)}
                          placeholder="e.g., Aniket Pandey"
                          style={{
                            padding: "12px",
                            border: "3px solid #1b1b1b",
                            fontSize: "13px",
                            fontWeight: 800,
                            fontFamily: "inherit",
                            background: "#fff",
                            outline: "none"
                          }}
                        />
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label style={{ fontSize: "11px", fontWeight: 900, color: BLK, textTransform: "uppercase" }}>
                          Student Registration ID / Roll No
                        </label>
                        <input
                          type="text"
                          value={studentId}
                          onChange={(e) => setStudentId(e.target.value)}
                          placeholder="e.g., 12114562 or CSE-2023-04"
                          style={{
                            padding: "12px",
                            border: "3px solid #1b1b1b",
                            fontSize: "13px",
                            fontWeight: 800,
                            fontFamily: "inherit",
                            background: "#fff",
                            outline: "none"
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

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
          UNIHOOD
        </div>
        <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em" }}>
          © 2026 UNIHOOD. BUILT FOR THE BOLD.
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
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "12px" }}>
          <span style={{ fontSize: "11px", fontWeight: 800, color: "#555" }}>
            ✍️ Don't see yours? Write your own custom option below:
          </span>
          <div style={{ display: "flex", gap: "8px" }}>
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
        </div>
      )}
    </div>
  );
}
