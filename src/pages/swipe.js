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
  addDoc, getDoc, doc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import NavBar from "../components/NavBar";
import { useRequireAuth } from "../lib/useAuth";

// SSR-safe: react-tinder-card uses DOM APIs, must be client-only
const TinderCard = dynamic(() => import("react-tinder-card"), { ssr: false });

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

  const cardBgs = {
    CSE: "#ffd9de", IT: "#ecdcff", ECE: "#d6baff", Mechanical: "#eeeeee",
    Civil: "#f0fdf4", EEE: "#fef3c7", Biotech: "#dcfce7", Chemical: "#ffedd5",
    "MBA/BBA": "#fdf2f8"
  };
  const headerBg = cardBgs[profile.branch?.[0]] || "#bdff00";

  return (
    <div style={{
      width: "100%",
      height: "100%",
      borderRadius: 16,
      background: "#fff",
      border: "3px solid #1b1b1b",
      boxShadow: "8px 8px 0px 0px #1b1b1b",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      userSelect: "none",
      WebkitUserSelect: "none",
      position: "relative",
    }}>
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

      {/* Solid header — avatar, name, tagline */}
      <div style={{
        background: headerBg,
        minHeight: 230,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        padding: "24px 20px 20px",
        borderBottom: "3px solid #1b1b1b",
        fontFamily: "'Montserrat', sans-serif",
      }}>
        {/* Photo-hidden badge & Verification badge */}
        <div style={{
          position: "absolute", top: 14, left: 14,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          alignItems: "flex-start",
        }}>
          <div style={{
            background: "#1b1b1b",
            border: "1.5px solid #1b1b1b",
            borderRadius: 4,
            padding: "3px 8px",
            fontSize: 9, fontWeight: 900, color: "#fff",
            letterSpacing: "0.06em",
          }}>
            🔒 PHOTO HIDDEN
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
            {profile.verificationStatus === "approved" ? "VERIFIED 🛡️" : "PENDING ⏳"}
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
          }}>
            ⚡ {sharedCount} COMMON
          </div>
        )}

        {/* Avatar circle */}
        <div style={{
          width: 88, height: 88, borderRadius: "50%",
          background: "#ffffff",
          border: "3px solid #1b1b1b",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 48,
          marginBottom: 12,
          boxShadow: "3px 3px 0px 0px #1b1b1b",
        }}>
          {profile.avatar || "😊"}
        </div>

        <h3 style={{ margin: 0, fontSize: 24, fontWeight: 950, color: "#1b1b1b", letterSpacing: -0.5, textTransform: "uppercase" }}>
          {profile.name}
        </h3>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#1b1b1b", fontWeight: 800, textTransform: "uppercase" }}>
          {(profile.branch || []).slice(0, 2).join(" + ")}
          {profile.year?.[0] ? ` · ${profile.year[0]}` : ""}
        </p>

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
          }}>
            {swipeHint === "like" ? "💚" : "✕"}
          </div>
        )}
      </div>

      {/* Info section */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px 18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}>
        {/* Stay + Vibe badges */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {(profile.stay || []).map(s => (
            <Tag key={s}
              color={s === "Hostel" ? "#DCFCE7" : "#EEF2FF"}
              text={s === "Hostel" ? "#15803D" : "#4338CA"}
            >
              {s === "Hostel" ? "🏠 " : "🏡 "}{s}
            </Tag>
          ))}
          {(profile.campusVibe || []).slice(0, 2).map(v => (
            <Tag key={v} color="#FEF3C7" text="#92400E">{v}</Tag>
          ))}
        </div>

        {/* Interests */}
        {(profile.interests || []).length > 0 && (
          <div>
            <p style={{ margin: "0 0 7px", fontSize: 10, fontWeight: 800, color: "#BCBCBC", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Into
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {(profile.interests || []).slice(0, 7).map(i => (
                <Tag key={i}>{i}</Tag>
              ))}
              {(profile.interests || []).length > 7 && (
                <Tag color="transparent" text="#AAA">+{(profile.interests).length - 7}</Tag>
              )}
            </div>
          </div>
        )}

        {/* Squad / Looking for */}
        {(profile.squad || []).length > 0 && (
          <div>
            <p style={{ margin: "0 0 7px", fontSize: 10, fontWeight: 800, color: "#BCBCBC", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Looking for
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {(profile.squad || []).slice(0, 4).map(s => (
                <Tag key={s} color="#EEF2FF" text="#4338CA">{s}</Tag>
              ))}
            </div>
          </div>
        )}

        {/* Weekend vibe prompt */}
        {(profile.weekendVibe || []).length > 0 && (
          <div style={{
            background: "#F5F4F0",
            borderRadius: 12,
            padding: "10px 13px",
          }}>
            <p style={{ margin: "0 0 3px", fontSize: 10, fontWeight: 800, color: "#BCBCBC", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              My ideal Saturday
            </p>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#222" }}>
              {(profile.weekendVibe || []).join("  ·  ")}
            </p>
          </div>
        )}

        {/* Default campus spot */}
        {(profile.defaultSpot || []).length > 0 && (
          <p style={{ margin: 0, fontSize: 12, color: "#888", fontWeight: 500 }}>
            📍 Usually at: {(profile.defaultSpot || []).slice(0, 2).join(", ")}
          </p>
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

  // profiles sorted ascending by score: profiles[last] = best match = visually on top
  const [profiles, setProfiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const currentIndexRef = useRef(-1);

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [matchModal, setMatchModal] = useState(null);
  const [swipeHint, setSwipeHint] = useState(null); // "like" | "pass"
  const [myVerificationStatus, setMyVerificationStatus] = useState("pending");

  // One ref per card — must be stable per profiles array
  const childRefs = useMemo(
    () => profiles.map(() => createRef()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profiles.length]
  );

  useEffect(() => {
    if (!user) return;
    const userId = user.uid;
    myPhoneRef.current = userId;
    loadData(userId);
  }, [user]);

  async function loadData(phone) {
    setLoading(true);
    setFetchError("");
    try {
      // 1. Own profile
      const mySnap = await getDoc(doc(db, "profiles", phone));
      if (!mySnap.exists()) { router.push("/onboarding"); return; }
      const me = { id: phone, ...mySnap.data() };
      myProfileRef.current = me;
      setMyVerificationStatus(me.verificationStatus || "pending");

      // 2. All completed profiles except self
      const allSnap = await getDocs(collection(db, "profiles"));
      const others = [];
      allSnap.forEach(d => {
        if (d.id !== phone && d.data().profileComplete) {
          others.push({ id: d.id, ...d.data() });
        }
      });

      // 3. Profiles I've already swiped on
      const swipesSnap = await getDocs(
        query(collection(db, "swipes"), where("swiperId", "==", phone))
      );
      const alreadySwiped = new Set();
      swipesSnap.forEach(d => alreadySwiped.add(d.data().swipedId));

      // 4. Filter + score + sort ascending (best match = last = on top of stack)
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
  if (loading) {
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
              CAMPUS CONNECT
            </span>
          </div>
          <span style={{ 
            fontSize: 9, fontWeight: 900, color: "#1b1b1b", background: "#ffffff",
            padding: "4px 8px", border: "2px solid #1b1b1b", boxShadow: "1.5px 1.5px 0px 0px #1b1b1b",
            textTransform: "uppercase"
          }}>
            {currentIndex >= 0
              ? `${currentIndex + 1} REMAINING`
              : "ALL DONE"}
          </span>
        </div>

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
          height: 560,
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
              <div style={{ fontSize: 60 }}>🎉</div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#0D0D0D" }}>
                You're all caught up!
              </h2>
              <p style={{ margin: 0, fontSize: 14, color: "#888", maxWidth: 260, lineHeight: 1.6 }}>
                No new profiles right now. Come back after more students join Campus Connect.
              </p>
              <button
                onClick={() => loadData(myPhoneRef.current)}
                style={{ ...solidBtn("#6366F1"), marginTop: 8 }}
              >
                Refresh
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
                swipeThreshold={80}
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
        <NavBar active="/swipe" />
      </div>
    </>
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
