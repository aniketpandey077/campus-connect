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
    <nav style={{
      position: "fixed", bottom: 0,
      left: "50%", transform: "translateX(-50%)",
      width: "100%", maxWidth: 480,
      background: "rgba(245,244,240,0.96)",
      backdropFilter: "blur(12px)",
      borderTop: "1px solid #E8E6E0",
      padding: "10px 8px 22px",
      display: "flex", justifyContent: "space-around",
      zIndex: 50,
    }}>
      {NAV_ITEMS.map(item => {
        const isActive = current === item.href;
        return (
          <button
            key={item.href}
            onClick={() => router.push(item.href)}
            style={{
              display: "flex", flexDirection: "column",
              alignItems: "center", gap: 3,
              background: "none", border: "none", cursor: "pointer",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              color: isActive ? "#FF4757" : "#BBB",
              fontWeight: isActive ? 800 : 600,
              fontSize: 10, padding: "4px 10px",
              borderTop: isActive ? "2px solid #FF4757" : "2px solid transparent",
              marginTop: isActive ? -2 : 0,
            }}
          >
            <span style={{ fontSize: 20, position: "relative", display: "inline-block" }}>
              {item.icon}
              {item.label === "Inbox" && totalUnread > 0 && (
                <span style={{
                  position: "absolute", top: -2, right: -4,
                  width: 8, height: 8, borderRadius: "50%",
                  background: "#FF4757", border: "1.5px solid #F5F4F0",
                }} />
              )}
            </span>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
