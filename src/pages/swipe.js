// src/pages/swipe.js
// Swipe deck — core matching screen.
// Reads profiles from Firestore, excludes self + already-swiped users,
// scores by shared interests/squad/year/stay, renders a Tinder-style swipe stack.
// TODO: replace localStorage "cc_phone" with auth.currentUser.uid when Firebase Auth is live.

import dynamic from "next/dynamic";
import { useState, useEffect, useRef, useMemo, createRef } from "react";
import { useRouter } from "next/router";
import {
  collection, query, where, getDocs,
  addDoc, getDoc, doc, serverTimestamp, updateDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import NavBar from "../components/NavBar";
import { useRequireAuth } from "../lib/useAuth";
import { INDIA_STATES_CITIES } from "../lib/indiaStatesCities";



// ─── Branch → gradient map ────────────────────────────────────────────────────
const BRANCH_GRAD = {
  CSE:        ["#6C63FF", "#3B82F6"],
  IT:         ["#8B5CF6", "#EC4899"],
  ECE:        ["#F43F5E", "#FB923C"],
  Mechanical: ["#0EA5E9", "#06B6D4"],
  Civil:      ["#10B981", "#34D399"],
  EEE:        ["#F59E0B", "#EF4444"],
  Biotech:    ["#34D399", "#06B6D4"],
  Chemical:   ["#FB923C", "#F59E0B"],
  "MBA/BBA":  ["#A855F7", "#EC4899"],
  default:    ["#6366F1", "#8B5CF6"],
};

function getGradient(branches = []) {
  const key = branches[0] || "default";
  const [a, b] = BRANCH_GRAD[key] || BRANCH_GRAD.default;
  return `linear-gradient(145deg, ${a} 0%, ${b} 100%)`;
}

// ─── Match score ──────────────────────────────────────────────────────────────
function computeScore(me, them) {
  let score = 0;
  // +2 per shared interest
  const myI = me.interests || [], theirI = them.interests || [];
  score += myI.filter(x => theirI.includes(x)).length * 2;
  // +2 per shared squad goal
  const myS = me.squad || [], theirS = them.squad || [];
  score += myS.filter(x => theirS.includes(x)).length * 2;
  // +2 if same year (compare first entries)
  const myY = (me.year || [])[0], theirY = (them.year || [])[0];
  if (myY && myY === theirY) score += 2;
  // +1 if same stay type
  const myH = (me.stay || [])[0], theirH = (them.stay || [])[0];
  if (myH && myH === theirH) score += 1;
  // +1 per shared campus vibe
  const myV = me.campusVibe || [], theirV = them.campusVibe || [];
  score += myV.filter(x => theirV.includes(x)).length;

  // Location scoring algorithm
  const myCity = (me.city || "").trim().toLowerCase();
  const theirCity = (them.city || "").trim().toLowerCase();
  const myState = (me.state || "").trim().toLowerCase();
  const theirState = (them.state || "").trim().toLowerCase();

  if (myCity && myCity === theirCity && myState && myState === theirState) {
    score += 100; // Nearest: same city & state
  } else if (myState && myState === theirState) {
    score += 50;  // Near: same state, different city
  }
  return score;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Tag({ children, color = "#ffffff", text = "#1b1b1b" }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "5px 12px",
      borderRadius: "6px",
      background: color,
      color: text,
      border: "2px solid #1b1b1b",
      boxShadow: "2px 2px 0px 0px #1b1b1b",
      fontSize: 11,
      fontWeight: 800,
      fontFamily: "'Montserrat', sans-serif",
      whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

// The card content — what users see for each profile
function ProfileCard({ profile, swipeHint }) {
  const sharedCount = profile._shared || 0;
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      width: "100%",
      height: "100%",
      borderRadius: 16,
      background: "#f0f0f0",
      border: "3px solid #1b1b1b",
      boxShadow: "8px 8px 0px 0px #1b1b1b",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      userSelect: "none",
      WebkitUserSelect: "none",
      position: "relative",
    }}>
      {/* Full-card blurred photo — lighter blur so face shape is visible */}
      {profile.blurredPhotoUrl ? (
        <div style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${profile.blurredPhotoUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center top",
          filter: "blur(20px) brightness(0.92)",
          transform: "scale(1.15)",
          zIndex: 0,
        }} />
      ) : (
        <div style={{
          position: "absolute", inset: 0,
          background: getGradient(profile.branch || []),
          zIndex: 0,
        }} />
      )}

      {/* Visual Stamps Overlay */}
      {swipeHint === "like" && (
        <div style={{
          position: "absolute", top: 130, left: 30, zIndex: 10,
          border: "4px solid #bdff00", color: "#1b1b1b",
          fontSize: 32, fontWeight: 900, borderRadius: 10,
          padding: "8px 16px",
          letterSpacing: "0.1em",
          animation: "stampIn 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
          background: "#bdff00",
          boxShadow: "4px 4px 0px 0px #1b1b1b",
          transform: "rotate(-12deg)",
        }}>
          LIKE
        </div>
      )}
      {swipeHint === "pass" && (
        <div style={{
          position: "absolute", top: 130, right: 30, zIndex: 10,
          border: "4px solid #ffb2bf", color: "#1b1b1b",
          fontSize: 32, fontWeight: 900, borderRadius: 10,
          padding: "8px 16px",
          letterSpacing: "0.1em",
          animation: "stampInPass 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
          background: "#ffb2bf",
          boxShadow: "4px 4px 0px 0px #1b1b1b",
          transform: "rotate(12deg)",
        }}>
          NOPE
        </div>
      )}

      {/* Bottom gradient overlay — always shows name + course only */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 4,
        background: "linear-gradient(to top, rgba(5,5,5,0.88) 0%, rgba(5,5,5,0.5) 50%, transparent 100%)",
        padding: "70px 16px 80px",
        pointerEvents: "none",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            background: "rgba(255,255,255,0.18)", backdropFilter: "blur(6px)",
            border: "2px solid rgba(255,255,255,0.65)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26, flexShrink: 0,
          }}>{profile.avatar || "😊"}</div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{
              margin: 0, fontSize: 20, fontWeight: 950, color: "#fff",
              letterSpacing: -0.5, textTransform: "uppercase",
              textShadow: "0 1px 6px rgba(0,0,0,0.5)",
            }}>{profile.name}</h3>
            {profile.username && (
              <p style={{ margin: "1px 0 0", fontSize: 10, color: "#bdff00", fontWeight: 900 }}>
                @{profile.username.toLowerCase()}
              </p>
            )}
            <p style={{
              margin: "2px 0 0", fontSize: 12,
              color: "rgba(255,255,255,0.82)", fontWeight: 800, textTransform: "uppercase",
            }}>
              {(profile.branch || []).slice(0, 2).join(" + ")}
              {profile.year?.[0] ? ` · ${profile.year[0]}` : ""}
              {profile.city ? ` · 📍 ${profile.city}` : ""}
            </p>
          </div>
        </div>
      </div>

      {/* SEE MORE / LESS button */}
      <button
        onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
        style={{
          position: "absolute", bottom: 74, right: 14, zIndex: 6,
          background: "rgba(255,255,255,0.92)", backdropFilter: "blur(6px)",
          border: "2px solid #1b1b1b", borderRadius: 20,
          padding: "5px 12px", fontSize: 10, fontWeight: 900,
          color: "#1b1b1b", cursor: "pointer",
          boxShadow: "2px 2px 0px 0px #1b1b1b",
          textTransform: "uppercase",
          fontFamily: "'Montserrat', sans-serif",
        }}
      >
        {expanded ? "✕ LESS" : "☰ MORE"}
      </button>

      {/* Expandable drawer — slides up with interests/vibes */}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 5,
        maxHeight: expanded ? "62%" : 0,
        overflow: "hidden",
        transition: "max-height 0.32s cubic-bezier(0.4,0,0.2,1)",
      }}>
        <div style={{
          background: "rgba(255,255,255,0.97)",
          borderTop: "3px solid #1b1b1b",
          padding: "14px 16px 20px",
          display: "flex", flexDirection: "column", gap: 10,
          fontFamily: "'Montserrat', sans-serif",
          maxHeight: "62vh", overflowY: "auto",
        }}>
          {/* Stay + Vibe */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(profile.stay || []).map(s => {
              const isHostel = s?.startsWith("BH") || s?.startsWith("GH") || s?.includes("Hostel");
              return (
                <Tag key={s} color={isHostel ? "#DCFCE7" : "#EEF2FF"} text={isHostel ? "#15803D" : "#4338CA"}>
                  {isHostel ? "🏠 " : "🏡 "}{s}
                </Tag>
              );
            })}
            {(profile.campusVibe || []).slice(0, 2).map(v => (
              <Tag key={v} color="#FEF3C7" text="#92400E">{v}</Tag>
            ))}
          </div>

          {/* Interests */}
          {(profile.interests || []).length > 0 && (
            <div>
              <p style={{ margin: "0 0 6px", fontSize: 9, fontWeight: 900, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.1em" }}>Into</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {(profile.interests || []).slice(0, 7).map(i => <Tag key={i}>{i}</Tag>)}
                {(profile.interests || []).length > 7 && <Tag color="transparent" text="#AAA">+{profile.interests.length - 7}</Tag>}
              </div>
            </div>
          )}

          {/* Squad */}
          {(profile.squad || []).length > 0 && (
            <div>
              <p style={{ margin: "0 0 6px", fontSize: 9, fontWeight: 900, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.1em" }}>Looking for</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {(profile.squad || []).slice(0, 4).map(s => <Tag key={s} color="#EEF2FF" text="#4338CA">{s}</Tag>)}
              </div>
            </div>
          )}

          {/* Weekend vibe */}
          {(profile.weekendVibe || []).length > 0 && (
            <div style={{ background: "#F5F4F0", borderRadius: 10, padding: "8px 12px" }}>
              <p style={{ margin: "0 0 2px", fontSize: 9, fontWeight: 900, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.1em" }}>Ideal Saturday</p>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#222" }}>{(profile.weekendVibe || []).join("  ·  ")}</p>
            </div>
          )}

          {/* Location */}
          {profile.city && (
            <p style={{ margin: 0, fontSize: 11, color: "#555", fontWeight: 750, textTransform: "uppercase" }}>
              🏠 From: {profile.city}{profile.state ? `, ${profile.state}` : ""}
            </p>
          )}

          {/* Spot */}
          {(profile.defaultSpot || []).length > 0 && (
            <p style={{ margin: 0, fontSize: 11, color: "#888", fontWeight: 600 }}>
              📍 Usually at: {(profile.defaultSpot || []).slice(0, 2).join(", ")}
            </p>
          )}
        </div>
      </div>

      {/* Transparent header section for top badges + swipe hint */}
      <div style={{
        background: "transparent",
        minHeight: 220,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        padding: "24px 20px 20px",
        fontFamily: "'Montserrat', sans-serif",
        overflow: "hidden",
        zIndex: 2,
      }}>
        {/* Photo-hidden badge & Verification badge */}
        <div style={{
          position: "absolute", top: 14, left: 14,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          alignItems: "flex-start",
          zIndex: 3,
        }}>
          <div style={{
            background: "#1b1b1b",
            border: "1.5px solid #1b1b1b",
            borderRadius: 4,
            padding: "3px 8px",
            fontSize: 9, fontWeight: 900, color: "#fff",
            letterSpacing: "0.06em",
          }}>
            🔒 PHOTO BLURRED
          </div>
          <div style={{
            background: profile.verificationStatus === "approved" ? "#bdff00" : "#ffb2bf",
            border: "1.5px solid #1b1b1b",
            borderRadius: 4,
            padding: "3px 8px",
            fontSize: 9, fontWeight: 950, color: "#1b1b1b",
            letterSpacing: "0.06em",
            boxShadow: "1px 1px 0px 0px #1b1b1b",
          }}>
            {profile.verificationStatus === "approved" ? "VERIFIED 🛡️" : "VERIFICATION PENDING ⏳"}
          </div>
        </div>

        {/* Match score */}
        {sharedCount > 0 && (
          <div style={{
            position: "absolute", top: 14, right: 14,
            background: "#ffffff",
            border: "2px solid #1b1b1b",
            borderRadius: 6,
            padding: "4px 8px",
            fontSize: 10, fontWeight: 900,
            color: "#1b1b1b",
            boxShadow: "2px 2px 0px 0px #1b1b1b",
            zIndex: 3,
          }}>
            ⚡ {sharedCount} COMMON
          </div>
        )}



        {/* Swipe hint overlay */}
        {swipeHint && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: swipeHint === "like"
              ? "rgba(189,255,0,0.4)"
              : "rgba(255,178,191,0.4)",
            fontSize: 56,
            animation: "hintFade 0.4s ease forwards",
            zIndex: 4,
          }}>
            {swipeHint === "like" ? "💚" : "✕"}
          </div>
        )}
      </div>

    </div>
  );
}

// "It's a Match!" overlay modal
function MatchModal({ matched, onContinue }) {
  const cardBgs = {
    CSE: "#ffd9de", IT: "#ecdcff", ECE: "#d6baff", Mechanical: "#eeeeee",
    Civil: "#f0fdf4", EEE: "#fef3c7", Biotech: "#dcfce7", Chemical: "#ffedd5",
    "MBA/BBA": "#fdf2f8"
  };
  const headerBg = cardBgs[matched.branch?.[0]] || "#bdff00";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(27,27,27,0.85)",
      backdropFilter: "blur(4px)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: 24,
      fontFamily: "'Montserrat', sans-serif",
    }}>
      <div style={{ 
        textAlign: "center", 
        animation: "popIn 0.35s cubic-bezier(.22,1,.36,1) both",
        background: "#ffffff",
        border: "4px solid #1b1b1b",
        boxShadow: "8px 8px 0px 0px #1b1b1b",
        padding: "40px 24px",
        maxWidth: 380,
        width: "100%",
      }}>
        {/* Avatars */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 24 }}>
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            background: "#ffffff",
            border: "3px solid #1b1b1b",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 42,
            boxShadow: "3px 3px 0px 0px #1b1b1b",
          }}>{matched.myAvatar}</div>
          <span style={{ fontSize: 28 }}>⚡</span>
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            background: headerBg,
            border: "3px solid #1b1b1b",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 42,
            boxShadow: "3px 3px 0px 0px #1b1b1b",
          }}>{matched.avatar || "😊"}</div>
        </div>

        <h1 style={{
          margin: "0 0 12px", fontSize: 28, fontWeight: 950,
          color: "#1b1b1b", letterSpacing: -1, textTransform: "uppercase"
        }}>IT'S A MATCH! 🎉</h1>
        <p style={{ margin: "0 0 16px", fontSize: 14, color: "#555", fontWeight: 700 }}>
          You and <strong>{matched.name.toUpperCase()}</strong> liked each other!
        </p>
        <p style={{
          margin: "0 0 28px", fontSize: 11,
          color: "#1b1b1b",
          padding: "10px 14px",
          background: "#ffd9de",
          border: "2px solid #1b1b1b",
          boxShadow: "2px 2px 0px 0px #1b1b1b",
          fontWeight: 800,
          textTransform: "uppercase",
        }}>
          🔒 Photos hidden until reveal session!
        </p>

        <button
          onClick={onContinue}
          style={{
            width: "100%",
            padding: "14px 20px",
            border: "3px solid #1b1b1b",
            background: "#bdff00",
            color: "#1b1b1b",
            fontWeight: 900,
            fontSize: 14,
            textTransform: "uppercase",
            cursor: "pointer",
            boxShadow: "4px 4px 0px 0px #1b1b1b",
            fontFamily: "inherit",
          }}
        >Keep swiping ✨</button>
      </div>
    </div>
  );
}

// ─── Main Swipe Component ─────────────────────────────────────────────────────
export default function Swipe() {
  const router = useRouter();
  const { user, loading: authLoading } = useRequireAuth();
  const myPhoneRef = useRef(null);
  const myProfileRef = useRef(null);

  // Location prompt modal for legacy users (Compulsory)
  const [showLocModal, setShowLocModal] = useState(false);
  const [modalState, setModalState] = useState("");
  const [modalCity, setModalCity] = useState("");
  const [modalLat, setModalLat] = useState(null);
  const [modalLon, setModalLon] = useState(null);
  const [modalLocLoading, setModalLocLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  const detectModalLocation = () => {
    if (!navigator.geolocation) {
      setModalError("Geolocation is not supported by your browser");
      return;
    }
    setModalLocLoading(true);
    setModalError("");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setModalLat(lat);
        setModalLon(lon);

        try {
          const res = await fetch(`/api/reverse-geocode?lat=${lat}&lon=${lon}`);
          if (!res.ok) throw new Error("Location service error");
          const data = await res.json();
          if (data && (data.state || data.city)) {
            setModalState(data.state || "");
            setModalCity(data.city || "");
          } else {
            setModalError("Could not resolve city/state from GPS.");
          }
        } catch (err) {
          console.error("Reverse geocoding failed:", err);
          setModalError("Location lookup failed. Please type manually.");
        } finally {
          setModalLocLoading(false);
        }
      },
      (err) => {
        console.error("Geolocation error:", err);
        setModalError("GPS access denied or unavailable.");
        setModalLocLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const saveModalLocation = async () => {
    if (!modalState.trim() || !modalCity.trim()) {
      setModalError("Please select or enter both state and city.");
      return;
    }
    setModalLocLoading(true);
    try {
      const phone = myPhoneRef.current;
      await updateDoc(doc(db, "profiles", phone), {
        state: modalState.trim(),
        city: modalCity.trim(),
        latitude: modalLat || null,
        longitude: modalLon || null,
      });
      if (myProfileRef.current) {
        myProfileRef.current.state = modalState.trim();
        myProfileRef.current.city = modalCity.trim();
        myProfileRef.current.latitude = modalLat || null;
        myProfileRef.current.longitude = modalLon || null;
      }
      setShowLocModal(false);
      loadData(phone);
    } catch (err) {
      console.error("Failed to save location from modal:", err);
      setModalError("Failed to save. Please try again.");
    } finally {
      setModalLocLoading(false);
    }
  };

  const [TinderCard, setTinderCard] = useState(null);

  // profiles sorted ascending by score: profiles[last] = best match = visually on top
  const [profiles, setProfiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const currentIndexRef = useRef(-1);

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [matchModal, setMatchModal] = useState(null);
  const [swipeHint, setSwipeHint] = useState(null); // "like" | "pass"
  const [myVerificationStatus, setMyVerificationStatus] = useState("pending");

  // Filter state
  const [filterOpen, setFilterOpen] = useState(false);
  const [availableCities, setAvailableCities] = useState([]);
  const [activeFilters, setActiveFilters] = useState({ branch: [], squad: [], interests: [], year: [], stay: [], city: [] });
  const activeFilterCount = Object.values(activeFilters).flat().length;

  useEffect(() => {
    import("react-tinder-card").then(mod => {
      setTinderCard(() => mod.default);
    });
  }, []);

  // One ref per card — must be stable per profiles array
  const childRefs = useMemo(
    () => profiles.map(() => createRef()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profiles.length]
  );

  useEffect(() => {
    if (!user || !router.isReady) return;
    const userId = user.uid;
    myPhoneRef.current = userId;
    loadData(userId, router.query.course);
  }, [user, router.isReady, router.query.course]);

  // Reload when filters change (after initial load)
  useEffect(() => {
    if (!myPhoneRef.current) return;
    loadData(myPhoneRef.current, router.query.course);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(activeFilters)]);

  async function loadData(phone, filterCourse) {
    setLoading(true);
    setFetchError("");
    try {
      // 1. Own profile
      const mySnap = await getDoc(doc(db, "profiles", phone));
      if (!mySnap.exists()) { router.push("/onboarding"); return; }
      const me = { id: phone, ...mySnap.data() };
      myProfileRef.current = me;
      setMyVerificationStatus(me.verificationStatus || "pending");

      console.log("Checking location status for profile:", phone, "-> City:", me.city, "-> State:", me.state, "-> Will Show Modal:", (!me.city || !me.state));

      if (!me.city || !me.state) {
        setShowLocModal(true);
      }

      // 2. All completed profiles except self (sanitized to remove photoUrl from memory)
      const allSnap = await getDocs(collection(db, "profiles"));
      let others = [];
      allSnap.forEach(d => {
        if (d.id !== phone && d.data().profileComplete) {
          const profileData = d.data();
          delete profileData.photoUrl; // Security: do not leak photoUrl prior to match/reveal
          others.push({ id: d.id, ...profileData });
        }
      });

      // Extract available cities for filtering (except current user)
      const cities = Array.from(new Set(others.map(p => p.city).filter(Boolean)));
      setAvailableCities(cities);

      // 3. Profiles I've already swiped on
      const swipesSnap = await getDocs(
        query(collection(db, "swipes"), where("swiperId", "==", phone))
      );
      const alreadySwiped = new Set();
      swipesSnap.forEach(d => alreadySwiped.add(d.data().swipedId));

      // 4. Filter by course (from URL query) OR by active branch filters
      if (filterCourse) {
        others = others.filter(p => (p.branch || []).includes(filterCourse));
      }
      // Active branch filter (from drawer)
      if (activeFilters.branch.length > 0) {
        others = others.filter(p => activeFilters.branch.some(b => (p.branch || []).includes(b)));
      }
      // Squad filter
      if (activeFilters.squad.length > 0) {
        others = others.filter(p => activeFilters.squad.some(s => (p.squad || []).includes(s)));
      }
      // Interests filter
      if (activeFilters.interests.length > 0) {
        others = others.filter(p => activeFilters.interests.some(i => (p.interests || []).includes(i)));
      }
      // Year filter
      if (activeFilters.year.length > 0) {
        others = others.filter(p => activeFilters.year.some(y => (p.year || []).includes(y)));
      }
      // Stay filter
      if (activeFilters.stay.length > 0) {
        others = others.filter(p => activeFilters.stay.some(s => (p.stay || []).includes(s)));
      }
      // City filter
      if (activeFilters.city && activeFilters.city.length > 0) {
        others = others.filter(p => p.city && activeFilters.city.some(c => p.city.trim().toLowerCase() === c.trim().toLowerCase()));
      }

      // 5. Filter + score + sort ascending (best match = last = on top of stack)
      const blockedByMe = new Set(me.blockedUsers || []);
      const unseen = others
        .filter(p => !alreadySwiped.has(p.id))
        .filter(p => !blockedByMe.has(p.id))   // never show blocked users
        .map(p => {
          const score = computeScore(me, p);
          // Count total shared things for the "X common" badge
          const sharedInterests = (me.interests || []).filter(x => (p.interests || []).includes(x)).length;
          const sharedSquad = (me.squad || []).filter(x => (p.squad || []).includes(x)).length;
          return { ...p, _score: score, _shared: sharedInterests + sharedSquad };
        })
        .sort((a, b) => a._score - b._score); // ascending → best last → on top

      const startIdx = unseen.length - 1;
      setProfiles(unseen);
      setCurrentIndex(startIdx);
      currentIndexRef.current = startIdx;
    } catch (e) {
      console.error("loadData error:", e);
      setFetchError("Couldn't load profiles — check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  // Called by react-tinder-card onSwipe (direction: "left" | "right")
  const handleSwipe = async (direction, profile, index) => {
    // Update index immediately (don't wait for Firestore)
    const newIndex = index - 1;
    setCurrentIndex(newIndex);
    currentIndexRef.current = newIndex;

    const phone = myPhoneRef.current;
    const firestoreDir = direction === "right" ? "like" : "pass";

    try {
      // Write swipe record
      await addDoc(collection(db, "swipes"), {
        swiperId: phone,
        swipedId: profile.id,
        direction: firestoreDir,
        timestamp: serverTimestamp(),
      });

      // Mutual match check — only on likes
      if (direction === "right") {
        const mutualQ = query(
          collection(db, "swipes"),
          where("swiperId", "==", profile.id),
          where("swipedId", "==", phone),
          where("direction", "==", "like")
        );
        const mutualSnap = await getDocs(mutualQ);

        if (!mutualSnap.empty) {
          // 🎉 Mutual match — write to matches collection
          await addDoc(collection(db, "matches"), {
            user1Id: phone,
            user2Id: profile.id,
            matchedAt: serverTimestamp(),
            revealStatus: "hidden", // photos stay hidden until both opt in
          });
          // Show the match modal
          setMatchModal({
            ...profile,
            myAvatar: myProfileRef.current?.avatar || "😊",
          });
        }
      }
    } catch (e) {
      console.error("Swipe write error:", e);
    }
  };

  // Programmatic swipe via buttons (like/pass)
  const triggerSwipe = async (dir) => {
    const idx = currentIndexRef.current;
    if (idx < 0 || idx >= profiles.length) return;
    const ref = childRefs[idx];
    if (!ref?.current) return;

    setSwipeHint(dir === "right" ? "like" : "pass");
    setTimeout(() => setSwipeHint(null), 500);

    await ref.current.swipe(dir);
  };

  // ── Loading ──
  if (loading || !TinderCard) {
    return (
      <PageShell>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 52, marginBottom: 16, animation: "spin 1.2s linear infinite" }}>⚡</div>
          <p style={{ fontSize: 15, color: "#1b1b1b", fontWeight: 900, fontFamily: "Montserrat", margin: 0 }}>
            FINDING YOUR CAMPUS PEOPLE...
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </PageShell>
    );
  }

  // ── Error ──
  if (fetchError) {
    return (
      <PageShell>
        <div style={{ textAlign: "center", maxWidth: 300 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>😕</div>
          <p style={{ color: "#ba1a1a", fontWeight: 900, fontFamily: "Montserrat", margin: "0 0 20px" }}>{fetchError.toUpperCase()}</p>
          <button
            onClick={() => loadData(myPhoneRef.current)}
            style={solidBtn("#bdff00")}
          >
            TRY AGAIN
          </button>
        </div>
      </PageShell>
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
          overflow-x: hidden; 
        }
        @keyframes popIn {
          from { transform: scale(0.7) translateY(20px); opacity: 0; }
          to   { transform: scale(1) translateY(0);      opacity: 1; }
        }
        @keyframes hintFade {
          0%   { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes stampIn {
          from { transform: scale(1.4) rotate(-20deg); opacity: 0; }
          to   { transform: scale(1) rotate(-12deg); opacity: 1; }
        }
        @keyframes stampInPass {
          from { transform: scale(1.4) rotate(20deg); opacity: 0; }
          to   { transform: scale(1) rotate(12deg); opacity: 1; }
        }
        .action-btn {
          transition: all 0.1s ease;
        }
        .action-btn:active {
          transform: translate(2px, 2px) !important;
          box-shadow: 0px 0px 0px 0px #1b1b1b !important;
        }
        /* Make TinderCard wrapper fill the container */
        .tc-wrapper {
          position: absolute !important;
          width: 100% !important;
          height: 100% !important;
        }
      `}</style>

      {/* Match modal */}
      {matchModal && (
        <MatchModal
          matched={matchModal}
          onContinue={() => setMatchModal(null)}
        />
      )}

      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: "'Montserrat', sans-serif",
        paddingBottom: 170,
      }}>
        {/* ── Top bar ── */}
        <div style={{
          width: "100%", maxWidth: 480,
          padding: "20px 20px 0",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: "#7531d3",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, border: "2px solid #1b1b1b",
              boxShadow: "2px 2px 0px 0px #1b1b1b"
            }}>🔥</div>
            <span style={{ fontWeight: 900, fontSize: 15, color: "#1b1b1b", fontStyle: "italic", letterSpacing: "-0.02em" }}>
              UNIHOOD
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* Search Button */}
            <button
              onClick={() => router.push("/search")}
              className="action-btn"
              style={{
                padding: "5px 12px", borderRadius: 8,
                border: "2px solid #1b1b1b",
                background: "#ffffff",
                color: "#1b1b1b", fontWeight: 900, fontSize: 11,
                cursor: "pointer", fontFamily: "inherit",
                boxShadow: "2px 2px 0px 0px #1b1b1b",
                textTransform: "uppercase", display: "flex", alignItems: "center", gap: 5,
              }}
            >
              🔍 Search
            </button>
            {/* Filter Button */}
            <button
              onClick={() => setFilterOpen(true)}
              className="action-btn"
              style={{
                position: "relative",
                padding: "5px 12px", borderRadius: 8,
                border: "2px solid #1b1b1b",
                background: activeFilterCount > 0 ? "#ecdcff" : "#ffffff",
                color: "#1b1b1b", fontWeight: 900, fontSize: 11,
                cursor: "pointer", fontFamily: "inherit",
                boxShadow: "2px 2px 0px 0px #1b1b1b",
                textTransform: "uppercase", display: "flex", alignItems: "center", gap: 5,
              }}
            >
              🎛 Filter
              {activeFilterCount > 0 && (
                <span style={{
                  background: "#7531d3", color: "#fff",
                  borderRadius: "50%", width: 16, height: 16,
                  fontSize: 9, fontWeight: 950,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "1.5px solid #1b1b1b",
                }}>{activeFilterCount}</span>
              )}
            </button>
            <span style={{ 
              fontSize: 9, fontWeight: 900, color: "#1b1b1b", background: "#ffffff",
              padding: "4px 8px", border: "2px solid #1b1b1b", boxShadow: "1.5px 1.5px 0px 0px #1b1b1b",
              textTransform: "uppercase"
            }}>
              {currentIndex >= 0
                ? `${currentIndex + 1} LEFT`
                : "ALL DONE"}
            </span>
          </div>
        </div>

        {/* Filter Drawer */}
        {filterOpen && (
          <FilterDrawer
            active={activeFilters}
            availableCities={availableCities}
            onApply={(f) => { setActiveFilters(f); setFilterOpen(false); }}
            onClose={() => setFilterOpen(false)}
          />
        )}

        {/* Verification pending banner */}
        {myVerificationStatus === "pending" && (
          <div style={{
            width: "calc(100% - 40px)",
            maxWidth: 440,
            background: "#fef3c7",
            border: "3px solid #1b1b1b",
            borderRadius: 12,
            boxShadow: "4px 4px 0px 0px #1b1b1b",
            padding: "12px 16px",
            marginTop: 14,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}>
            <span style={{ fontSize: 24 }}>⏳</span>
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 900, color: "#1b1b1b", textTransform: "uppercase" }}>
                Profile Pending Verification
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 10, color: "#555", fontWeight: 700, lineHeight: 1.4 }}>
                You'll appear to others once verified.
              </p>
            </div>
          </div>
        )}

        {/* ── Card stack ── */}
        <div style={{
          position: "relative",
          width: "calc(100% - 40px)",
          maxWidth: 440,
          height: "min(560px, 65vh)",
          margin: "18px 20px 0",
          flexShrink: 0,
        }}>
          {currentIndex < 0 ? (
            /* Empty state */
            <div style={{
              width: "100%", height: "100%",
              background: "#fff",
              borderRadius: 24,
              boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 14, padding: 32, textAlign: "center",
            }}>
              <div style={{ fontSize: 60 }}>🚴‍♂️</div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#0D0D0D" }}>
                UMS Savior, you're caught up!
              </h2>
              <p style={{ margin: 0, fontSize: 14, color: "#888", maxWidth: 260, lineHeight: 1.6 }}>
                No new profiles right now. Go maintain your attendance above 75% on UMS or head to Uni Mall for a quick snack!
              </p>
              <button
                onClick={() => loadData(myPhoneRef.current)}
                style={{ ...solidBtn("#bdff00"), marginTop: 8 }}
              >
                Refresh UMS Feed
              </button>
            </div>
          ) : (
            /* Card stack — profiles rendered lowest-score-first so highest is on top */
            profiles.map((profile, i) => (
              <TinderCard
                key={profile.id}
                ref={childRefs[i]}
                className="tc-wrapper"
                onSwipe={(dir) => handleSwipe(dir, profile, i)}
                preventSwipe={["up", "down"]}
                swipeRequirementType="position"
                swipeThreshold={35}
                onSwipeRequirementFulfilled={(dir) => {
                  if (i === currentIndexRef.current) {
                    setSwipeHint(dir === "right" ? "like" : "pass");
                  }
                }}
                onSwipeRequirementUnfulfilled={() => setSwipeHint(null)}
              >
                <ProfileCard
                  profile={profile}
                  swipeHint={i === currentIndex ? swipeHint : null}
                />
              </TinderCard>
            ))
          )}
        </div>
        {/* ── Floating action buttons panel ── */}
        {currentIndex >= 0 && (
          <div style={{
            position: "fixed", bottom: 92,
            left: "50%", transform: "translateX(-50%)",
            width: "calc(100% - 32px)", maxWidth: 440,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 24,
            zIndex: 90,
          }}>
            <button
              onClick={() => triggerSwipe("left")}
              className="action-btn"
              style={{
                width: 56, height: 56, borderRadius: "50%",
                border: "3px solid #1b1b1b", background: "#ffb2bf",
                fontSize: 22, fontWeight: 900, cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "4px 4px 0px 0px #1b1b1b",
              }}
            >✕</button>
            <div style={{
              textAlign: "center", minWidth: 120,
              background: "#ffffff", border: "2px solid #1b1b1b",
              borderRadius: 10, padding: "6px 12px",
              boxShadow: "2px 2px 0px 0px #1b1b1b",
            }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color: "#1b1b1b", textTransform: "uppercase" }}>
                {profiles[currentIndex]?.name}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 10, color: "#555", fontWeight: 800, textTransform: "uppercase" }}>
                {(profiles[currentIndex]?.branch || []).slice(0, 1).join("")}
              </p>
            </div>
            <button
              onClick={() => triggerSwipe("right")}
              className="action-btn"
              style={{
                width: 56, height: 56, borderRadius: "50%",
                border: "3px solid #1b1b1b", background: "#bdff00",
                fontSize: 22, fontWeight: 900, cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "4px 4px 0px 0px #1b1b1b",
              }}
            >💚</button>
          </div>
        )}

        {/* Location Update Modal for Existing Users (Compulsory) */}
        {showLocModal && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 300,
            background: "rgba(27,27,27,0.85)",
            backdropFilter: "blur(5px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Montserrat', sans-serif",
            padding: "20px"
          }}>
            <div style={{
              background: "#fff",
              border: "4px solid #1b1b1b",
              borderRadius: "20px",
              padding: "24px",
              maxWidth: "400px",
              width: "100%",
              boxShadow: "8px 8px 0px 0px #1b1b1b",
              display: "flex",
              flexDirection: "column",
              gap: "16px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "28px" }}>📍</span>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 950, textTransform: "uppercase", color: "#1b1b1b" }}>
                  Set Your Location
                </h3>
              </div>

              <p style={{ margin: 0, fontSize: "12px", color: "#555", fontWeight: 800, lineHeight: "1.4", textTransform: "uppercase" }}>
                We've added location-based matching! Set your city and state to see nearby students first.
              </p>

              {modalError && (
                <div style={{
                  fontSize: "11px", fontWeight: 800, color: "#b90e4f",
                  background: "#ffd9de", border: "2px solid #1b1b1b",
                  padding: "8px 12px", borderRadius: "6px"
                }}>
                  ⚠️ {modalError}
                </div>
              )}

              {/* GPS Button */}
              <button
                type="button"
                onClick={detectModalLocation}
                disabled={modalLocLoading}
                style={{
                  width: "100%", padding: "12px", border: "2px solid #1b1b1b",
                  background: "#ecdcff", color: "#1b1b1b", fontWeight: 950,
                  fontSize: "12px", cursor: "pointer", fontFamily: "inherit",
                  boxShadow: "2.5px 2.5px 0px 0px #1b1b1b", textTransform: "uppercase",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
                }}
              >
                {modalLocLoading ? "Detecting location..." : "📍 Use Current Location"}
              </button>

              {/* Map Preview */}
              {modalLat && modalLon && (
                <div style={{ border: "2px solid #1b1b1b", borderRadius: "8px", overflow: "hidden", boxShadow: "2px 2px 0px 0px #1b1b1b", height: "130px", width: "100%" }}>
                  <iframe
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${modalLon - 0.02}%2C${modalLat - 0.02}%2C${modalLon + 0.02}%2C${modalLat + 0.02}&layer=mapnik&marker=${modalLat}%2C${modalLon}`}
                  />
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "10px", fontWeight: 950, textTransform: "uppercase", color: "#1b1b1b" }}>State</label>
                <select
                  value={modalState}
                  onChange={(e) => {
                    setModalState(e.target.value);
                    setModalCity("");
                  }}
                  style={{
                    width: "100%", padding: "10px 12px", border: "2px solid #1b1b1b",
                    borderRadius: "6px", fontSize: "13px", fontWeight: 900,
                    outline: "none", fontFamily: "inherit", background: "#fff",
                    color: "#1b1b1b", cursor: "pointer",
                    appearance: "none",
                    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%231b1b1b' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 12px center",
                    backgroundSize: "14px"
                  }}
                >
                  <option value="" disabled>Select State...</option>
                  {Object.keys(INDIA_STATES_CITIES).map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "10px", fontWeight: 950, textTransform: "uppercase", color: "#1b1b1b" }}>City</label>
                <select
                  value={modalCity}
                  onChange={(e) => setModalCity(e.target.value)}
                  disabled={!modalState}
                  style={{
                    width: "100%", padding: "10px 12px", border: "2px solid #1b1b1b",
                    borderRadius: "6px", fontSize: "13px", fontWeight: 900,
                    outline: "none", fontFamily: "inherit", background: modalState ? "#fff" : "#f3f3f3",
                    color: "#1b1b1b", cursor: modalState ? "pointer" : "not-allowed",
                    appearance: "none",
                    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%231b1b1b' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 12px center",
                    backgroundSize: "14px"
                  }}
                >
                  <option value="" disabled>Select City...</option>
                  {(INDIA_STATES_CITIES[modalState] || []).map(ct => (
                    <option key={ct} value={ct}>{ct}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={saveModalLocation}
                disabled={modalLocLoading}
                style={{
                  width: "100%", padding: "12px", border: "2px solid #1b1b1b",
                  background: "#bdff00", color: "#1b1b1b", fontWeight: 950,
                  fontSize: "13px", cursor: "pointer", fontFamily: "inherit",
                  boxShadow: "3px 3px 0px 0px #1b1b1b", textTransform: "uppercase",
                  marginTop: "8px"
                }}
              >
                Save Location
              </button>
            </div>
          </div>
        )}

        <NavBar active="/swipe" />
      </div>
    </>
  );
}

// ─── Filter Drawer ────────────────────────────────────────────────────────────
const FILTER_OPTS = {
  branch: [
    "CSE", "IT", "ECE", "Mechanical", "Civil", "EEE",
    "BCA", "MCA", "BBA", "MBA", "BSc CS", "B.Arch", "LLB", "MBBS", "BPharm",
  ],
  squad: [
    "Study group", "Canteen crew", "Fest buddies", "Late-night talks",
    "Gaming gang", "Gym partners", "Project partners", "Campus explorers",
    "Hostel hangout", "Road trip crew", "Just vibe",
  ],
  interests: [
    "Music", "Gaming", "Sports", "Reading", "Fitness", "Movies/TV",
    "Travel", "Art", "Tech/Coding", "Cooking", "Photography", "Dance",
    "Anime", "Fashion", "Hackathons", "Memes",
  ],
  year: ["1st Year", "2nd Year", "3rd Year", "4th Year"],
  stay: ["Hostel", "Day Scholar"],
};

const FILTER_LABELS = {
  branch: "🎓 Department",
  squad: "🤝 Looking For",
  interests: "✨ Interests",
  year: "📅 Year",
  stay: "🏠 Stay Type",
};

function FilterDrawer({ active, availableCities = [], onApply, onClose }) {
  const [local, setLocal] = useState(active);

  const toggle = (key, val) => {
    setLocal(prev => ({
      ...prev,
      [key]: prev[key].includes(val)
        ? prev[key].filter(v => v !== val)
        : [...prev[key], val],
    }));
  };

  const clearAll = () => setLocal({ branch: [], squad: [], interests: [], year: [], stay: [], city: [] });

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(27,27,27,0.75)",
      backdropFilter: "blur(3px)",
      display: "flex", flexDirection: "column", justifyContent: "flex-end",
      fontFamily: "'Montserrat', sans-serif",
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff",
          borderTop: "4px solid #1b1b1b",
          borderLeft: "4px solid #1b1b1b",
          borderRight: "4px solid #1b1b1b",
          borderRadius: "24px 24px 0 0",
          padding: "20px 20px 40px",
          maxHeight: "85vh", overflowY: "auto",
          boxShadow: "0px -6px 0px 0px rgba(0,0,0,1)",
          animation: "slideUp 0.28s cubic-bezier(.22,1,.36,1)",
        }}
      >
        <style>{"@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}"}</style>

        {/* Handle */}
        <div style={{ width: 44, height: 6, borderRadius: 3, background: "#1b1b1b", margin: "0 auto 18px" }} />

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 950, color: "#1b1b1b", textTransform: "uppercase" }}>
            🎛 Filter People
          </h3>
          <button onClick={clearAll} style={{
            padding: "5px 12px", borderRadius: 6,
            border: "2px solid #1b1b1b", background: "#ffb2bf",
            fontWeight: 900, fontSize: 11, cursor: "pointer",
            fontFamily: "inherit", color: "#1b1b1b",
            boxShadow: "2px 2px 0px 0px #1b1b1b",
            textTransform: "uppercase",
          }}>Clear All</button>
        </div>

        {/* Filter sections */}
        {Object.entries(FILTER_OPTS).map(([key, opts]) => (
          <div key={key} style={{ marginBottom: 20 }}>
            <p style={{ margin: "0 0 10px", fontSize: 10, fontWeight: 950, color: "#1b1b1b",
              textTransform: "uppercase", letterSpacing: "0.06em",
              borderBottom: "2px solid #1b1b1b", paddingBottom: 6,
            }}>{FILTER_LABELS[key]}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {opts.map(opt => {
                const sel = local[key].includes(opt);
                return (
                  <button
                    key={opt}
                    onClick={() => toggle(key, opt)}
                    style={{
                      padding: "7px 13px", borderRadius: 8,
                      border: "2px solid #1b1b1b",
                      background: sel ? "#ecdcff" : "#ffffff",
                      color: "#1b1b1b",
                      boxShadow: sel ? "2px 2px 0px 0px #1b1b1b" : "none",
                      fontWeight: 900, fontSize: 11, cursor: "pointer",
                      fontFamily: "inherit",
                      textTransform: "uppercase",
                    }}
                  >{opt}</button>
                );
              })}
            </div>
          </div>
        ))}
        {/* City Filter */}
        {availableCities.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: "0 0 10px", fontSize: 10, fontWeight: 950, color: "#1b1b1b",
              textTransform: "uppercase", letterSpacing: "0.06em",
              borderBottom: "2px solid #1b1b1b", paddingBottom: 6,
            }}>📍 City / Hometown</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {availableCities.map(opt => {
                const sel = (local.city || []).includes(opt);
                return (
                  <button
                    key={opt}
                    onClick={() => toggle("city", opt)}
                    style={{
                      padding: "7px 13px", borderRadius: 8,
                      border: "2px solid #1b1b1b",
                      background: sel ? "#ecdcff" : "#ffffff",
                      color: "#1b1b1b",
                      boxShadow: sel ? "2px 2px 0px 0px #1b1b1b" : "none",
                      fontWeight: 900, fontSize: 11, cursor: "pointer",
                      fontFamily: "inherit",
                      textTransform: "uppercase",
                    }}
                  >{opt}</button>
                );
              })}
            </div>
          </div>
        )}

        {/* Apply */}
        <button
          onClick={() => onApply(local)}
          style={{
            width: "100%", padding: "14px", borderRadius: 10,
            border: "3px solid #1b1b1b",
            background: "#bdff00", color: "#1b1b1b",
            fontWeight: 950, fontSize: 14, cursor: "pointer",
            fontFamily: "inherit",
            boxShadow: "4px 4px 0px 0px #1b1b1b",
            textTransform: "uppercase",
            marginTop: 8,
          }}
        >Apply Filters ✅</button>
      </div>
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────
function PageShell({ children }) {
  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#f3f3f3",
      backgroundImage: "radial-gradient(#bcbcbc 1.5px, transparent 1.5px)",
      backgroundSize: "32px 32px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Montserrat', sans-serif",
    }}>
      {children}
    </div>
  );
}

function solidBtn(bg, color = "#1b1b1b") {
  return {
    padding: "12px 28px",
    borderRadius: 8,
    border: "3px solid #1b1b1b",
    background: bg,
    color,
    fontWeight: 900,
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "'Montserrat', sans-serif",
    boxShadow: "4px 4px 0px 0px #1b1b1b",
  };
}
