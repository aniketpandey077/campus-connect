import { useEffect } from "react";
import { useRouter } from "next/router";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/useAuth";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    getDoc(doc(db, "profiles", user.uid))
      .then((snap) => {
        router.replace(snap.exists() ? "/swipe" : "/onboarding");
      })
      .catch(() => {
        router.replace("/onboarding");
      });
  }, [user, loading, router]);

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#F5F4F0" }}>
      <div style={{ fontSize: 24 }}>Loading...</div>
    </div>
  );
}
