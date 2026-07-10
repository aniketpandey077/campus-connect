import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/useAuth";

const NAV_ITEMS = [
  { icon: "🔥", label: "Swipe",   href: "/swipe"   },
  { icon: "🎓", label: "Courses", href: "/courses" },
  { icon: "🗓️", label: "Events",  href: "/events"  },
  { icon: "💬", label: "Inbox",   href: "/matches" },
  { icon: "👤", label: "Profile", href: "/profile" },
];

export default function NavBar({ active }) {
  const router = useRouter();
  const current = active || router.pathname;

  const { user } = useAuth();
  const [counts, setCounts] = useState({ user1Sum: 0, user2Sum: 0 });

  useEffect(() => {
    const phone = user?.uid;
    if (!phone) return;

    // Listen to matches where user1Id is phone
    const q1 = query(collection(db, "matches"), where("user1Id", "==", phone));
    const unsub1 = onSnapshot(q1, (snap) => {
      let sum = 0;
      snap.docs.forEach(d => {
        sum += d.data().user1Unread || 0;
      });
      setCounts(prev => ({ ...prev, user1Sum: sum }));
    });

    // Listen to matches where user2Id is phone
    const q2 = query(collection(db, "matches"), where("user2Id", "==", phone));
    const unsub2 = onSnapshot(q2, (snap) => {
      let sum = 0;
      snap.docs.forEach(d => {
        sum += d.data().user2Unread || 0;
      });
      setCounts(prev => ({ ...prev, user2Sum: sum }));
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [user]);

  const totalUnread = counts.user1Sum + counts.user2Sum;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;750;900&display=swap');
        .nav-btn {
          transition: all 0.1s ease;
        }
        .nav-btn:active {
          transform: translate(1px, 1px) !important;
          box-shadow: 0px 0px 0px 0px #1b1b1b !important;
        }
      `}</style>
      <nav style={{
        position: "fixed", bottom: 16,
        left: "50%", transform: "translateX(-50%)",
        width: "calc(100% - 32px)", maxWidth: 440,
        background: "#ffffff",
        border: "3px solid #1b1b1b",
        boxShadow: "4px 4px 0px 0px #1b1b1b",
        borderRadius: 16,
        padding: "8px 6px",
        display: "flex", justifyContent: "space-around",
        alignItems: "center",
        zIndex: 100,
      }}>
        {NAV_ITEMS.map(item => {
          const isActive = current === item.href;
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className="nav-btn"
              style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", gap: 2,
                background: isActive ? "#bdff00" : "none",
                border: isActive ? "2px solid #1b1b1b" : "2px solid transparent",
                boxShadow: isActive ? "2px 2px 0px 0px #1b1b1b" : "none",
                borderRadius: 10,
                cursor: "pointer",
                fontFamily: "'Montserrat', sans-serif",
                color: "#1b1b1b",
                fontWeight: 900,
                fontSize: 10,
                padding: "6px 12px",
                textTransform: "uppercase",
                letterSpacing: "0.02em",
              }}
            >
              <span style={{ fontSize: 18, position: "relative", display: "inline-block" }}>
                {item.icon}
                {item.label === "Inbox" && totalUnread > 0 && (
                  <span style={{
                    position: "absolute", top: -8, right: -12,
                    minWidth: 18, height: 18, borderRadius: 9,
                    background: "#ffb2bf", border: "2px solid #1b1b1b",
                    fontSize: 8, fontWeight: 950, color: "#1b1b1b",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "0 4px",
                    boxShadow: "1.5px 1.5px 0px 0px #1b1b1b",
                  }}>
                    {totalUnread}
                  </span>
                )}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
