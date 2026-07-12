// src/pages/search.js
// Global @username search — find any Unihood user, no match required.

import { useState } from "react";
import { useRouter } from "next/router";
import {
  collection, query, where, getDocs,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import NavBar from "../components/NavBar";
import { useRequireAuth } from "../lib/useAuth";

export default function SearchPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useRequireAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults]         = useState(null);   // null=idle, []=not found, array=found
  const [searching, setSearching]     = useState(false);

  const handleSearch = async (e) => {
    e?.preventDefault();
    const handle = searchQuery.trim().replace(/^@/, "").toLowerCase();
    if (!handle) return;
    setSearching(true);
    setResults(null);
    try {
      const q = query(collection(db, "profiles"));
      const snap = await getDocs(q);
      const list = [];
      snap.forEach((doc) => {
        const data = doc.data();
        if (data.profileComplete) {
          const uname = (data.username || "").toLowerCase();
          const dname = (data.name || "").toLowerCase();
          const ucity = (data.city || "").toLowerCase();
          const ustate = (data.state || "").toLowerCase();
          if (uname.includes(handle) || dname.includes(handle) || ucity.includes(handle) || ustate.includes(handle)) {
            list.push({ id: doc.id, ...data, photoUrl: undefined }); // strip private photo
          }
        }
      });
      setResults(list);
    } catch (err) {
      console.error("Search error:", err);
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  if (authLoading) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;750;900;950&display=swap');
        * { box-sizing: border-box; }
        body {
          margin: 0;
          background-color: #f3f3f3;
          background-image: radial-gradient(#bcbcbc 1.5px, transparent 1.5px);
          background-size: 32px 32px;
        }
        .neo-btn { transition: all 0.1s ease; }
        .neo-btn:active {
          transform: translate(2px, 2px) !important;
          box-shadow: 0px 0px 0px 0px #1b1b1b !important;
        }
        input:focus { outline: none; border-color: #7531d3 !important; }
      `}</style>

      <div style={{
        minHeight: "100vh",
        fontFamily: "'Montserrat', sans-serif",
        paddingBottom: 120,
      }}>
        {/* Header */}
        <div style={{
          background: "#ffffff",
          borderBottom: "3px solid #1b1b1b",
          padding: "18px 20px",
          position: "sticky", top: 0, zIndex: 10,
          boxShadow: "0px 4px 0px 0px rgba(0,0,0,1)",
        }}>
          <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => router.back()}
              className="neo-btn"
              style={{
                background: "#f3f3f3", border: "2px solid #1b1b1b",
                borderRadius: 8, padding: "6px 12px",
                cursor: "pointer", fontSize: 15, fontWeight: 900,
                boxShadow: "2px 2px 0px 0px #1b1b1b", flexShrink: 0,
              }}
            >←</button>
            <div>
              <h1 style={{ margin: 0, fontSize: 18, fontWeight: 950, color: "#1b1b1b", textTransform: "uppercase" }}>
                🔍 Find Anyone
              </h1>
              <p style={{ margin: "1px 0 0", fontSize: 10, color: "#555", fontWeight: 800 }}>
                SEARCH BY @USERNAME · NO MATCH NEEDED
              </p>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px" }}>
          {/* Search bar */}
          <form onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1, position: "relative" }}>
              <span style={{
                position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                fontSize: 15, color: "#7531d3", fontWeight: 900, zIndex: 1,
              }}>@</span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  if (!e.target.value.trim()) setResult(null);
                }}
                placeholder="username"
                autoCapitalize="none"
                autoCorrect="off"
                style={{
                  width: "100%", padding: "14px 14px 14px 32px",
                  border: "2.5px solid #1b1b1b", borderRadius: 10,
                  fontSize: 15, fontWeight: 800,
                  fontFamily: "inherit", background: "#fff",
                  boxShadow: "3px 3px 0px 0px #1b1b1b",
                  color: "#1b1b1b",
                }}
              />
            </div>
            <button
              type="submit"
              disabled={searching || !searchQuery.trim()}
              className="neo-btn"
              style={{
                padding: "14px 22px",
                background: (searching || !searchQuery.trim()) ? "#eeeeee" : "#1b1b1b",
                color: (searching || !searchQuery.trim()) ? "#555" : "#bdff00",
                border: "2.5px solid #1b1b1b", borderRadius: 10,
                cursor: (searching || !searchQuery.trim()) ? "not-allowed" : "pointer",
                fontSize: 14, fontWeight: 950, fontFamily: "inherit",
                boxShadow: (searching || !searchQuery.trim()) ? "none" : "3px 3px 0px 0px #555",
                textTransform: "uppercase", flexShrink: 0,
              }}
            >
              {searching ? "…" : "GO"}
            </button>
          </form>

          {/* Idle hint */}
          {results === null && !searching && (
            <div style={{ marginTop: 48, textAlign: "center" }}>
              <div style={{ fontSize: 64, marginBottom: 12 }}>🔎</div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color: "#888", textTransform: "uppercase" }}>
                Search any Unihood student
              </p>
              <p style={{ margin: "6px 0 0", fontSize: 11, color: "#bbb", fontWeight: 700 }}>
                Try @username or name, no @ needed too
              </p>
              <div style={{ marginTop: 24, display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                {["akhya", "nightowl", "coderkid", "canteenking"].map(ex => (
                  <button
                    key={ex}
                    onClick={() => { setSearchQuery(ex); }}
                    className="neo-btn"
                    style={{
                      padding: "5px 12px", background: "#fff",
                      border: "2px solid #1b1b1b", borderRadius: 6,
                      fontSize: 11, fontWeight: 800, cursor: "pointer",
                      boxShadow: "2px 2px 0px 0px #1b1b1b", fontFamily: "inherit",
                      color: "#7531d3",
                    }}
                  >@{ex}</button>
                ))}
              </div>
            </div>
          )}

          {/* Searching */}
          {searching && (
            <div style={{ marginTop: 32, textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>⏳</div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: "#7531d3", textTransform: "uppercase" }}>
                Searching for &quot;{searchQuery.replace(/^@/, "")}&quot;…
              </p>
            </div>
          )}

          {/* Not found */}
          {results && results.length === 0 && (
            <div style={{
              marginTop: 20,
              background: "#ffe0e0", border: "2.5px solid #1b1b1b",
              borderRadius: 12, padding: "18px 18px",
              boxShadow: "4px 4px 0px 0px #1b1b1b",
              display: "flex", alignItems: "center", gap: 14,
            }}>
              <span style={{ fontSize: 32 }}>😕</span>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 950, color: "#1b1b1b", textTransform: "uppercase" }}>
                  No users found
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "#555", fontWeight: 700 }}>
                  No match found for &quot;{searchQuery}&quot;
                </p>
              </div>
            </div>
          )}

          {/* Found — profiles list */}
          {results && results.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 20 }}>
              {results.map((res) => (
                <div
                  key={res.id}
                  style={{
                    background: "#fff", border: "2.5px solid #1b1b1b",
                    borderRadius: 16, boxShadow: "6px 6px 0px 0px #1b1b1b",
                    overflow: "hidden",
                  }}
                >
                  {/* Blurred photo banner */}
                  <div style={{
                    height: 130, overflow: "hidden", position: "relative",
                    background: "#222",
                  }}>
                    {res.blurredPhotoUrl ? (
                      <img
                        src={res.blurredPhotoUrl}
                        alt=""
                        style={{
                          width: "100%", height: "100%", objectFit: "cover",
                          filter: "blur(20px) brightness(0.85)",
                          transform: "scale(1.15)",
                        }}
                      />
                    ) : (
                      <div style={{
                        width: "100%", height: "100%",
                        background: "linear-gradient(135deg, #7531d3, #bdff00)",
                      }} />
                    )}
                    {/* Verification */}
                    <div style={{
                      position: "absolute", top: 10, right: 10,
                      background: res.verificationStatus === "approved" ? "#bdff00" : "#ffb2bf",
                      border: "1.5px solid #1b1b1b", borderRadius: 4,
                      padding: "3px 9px", fontSize: 9, fontWeight: 950, color: "#1b1b1b",
                      boxShadow: "1.5px 1.5px 0px 0px #1b1b1b",
                    }}>
                      {res.verificationStatus === "approved" ? "VERIFIED 🛡️" : "VERIFICATION PENDING ⏳"}
                    </div>
                    {/* PHOTO BLURRED notice */}
                    <div style={{
                      position: "absolute", top: 10, left: 10,
                      background: "rgba(27,27,27,0.8)", borderRadius: 4,
                      padding: "3px 8px", fontSize: 9, fontWeight: 900, color: "#fff",
                    }}>
                      🔒 PHOTO BLURRED
                    </div>
                  </div>

                  <div style={{ padding: "16px 18px" }}>
                    {/* Avatar + name row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                      <div style={{
                        width: 56, height: 56, borderRadius: "50%",
                        background: "#bdff00", border: "3px solid #1b1b1b",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 32, flexShrink: 0, boxShadow: "3px 3px 0px 0px #1b1b1b",
                        marginTop: -36, position: "relative",
                      }}>
                        {res.avatar || "😊"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h2 style={{
                          margin: 0, fontSize: 19, fontWeight: 950,
                          color: "#1b1b1b", textTransform: "uppercase", letterSpacing: -0.5,
                        }}>
                          {res.name}
                        </h2>
                        <p style={{ margin: "2px 0 0", fontSize: 12, color: "#7531d3", fontWeight: 900 }}>
                          @{res.username}
                        </p>
                      </div>
                    </div>

                    {/* Info pills */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                      {(res.branch || []).map(b => (
                        <span key={b} style={{
                          padding: "4px 10px", border: "2px solid #1b1b1b", borderRadius: 6,
                          fontSize: 11, fontWeight: 800, background: "#ecdcff",
                          boxShadow: "1.5px 1.5px 0px 0px #1b1b1b",
                        }}>{b}</span>
                      ))}
                      {res.year?.[0] && (
                        <span style={{
                          padding: "4px 10px", border: "2px solid #1b1b1b", borderRadius: 6,
                          fontSize: 11, fontWeight: 800, background: "#fef3c7",
                          boxShadow: "1.5px 1.5px 0px 0px #1b1b1b",
                        }}>{res.year[0]}</span>
                      )}
                      {(res.stay || []).slice(0, 1).map(s => (
                        <span key={s} style={{
                          padding: "4px 10px", border: "2px solid #1b1b1b", borderRadius: 6,
                          fontSize: 11, fontWeight: 800, background: "#dcfce7",
                          boxShadow: "1.5px 1.5px 0px 0px #1b1b1b",
                        }}>🏠 {s}</span>
                      ))}
                      {res.city && (
                        <span style={{
                          padding: "4px 10px", border: "2px solid #1b1b1b", borderRadius: 6,
                          fontSize: 11, fontWeight: 800, background: "#ffd9de",
                          boxShadow: "1.5px 1.5px 0px 0px #1b1b1b",
                        }}>📍 {res.city.toUpperCase()}</span>
                      )}
                    </div>

                    {/* Interests */}
                    {(res.interests || []).length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <p style={{ margin: "0 0 6px", fontSize: 9, fontWeight: 900, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.1em" }}>Into</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {(res.interests || []).slice(0, 6).map(i => (
                            <span key={i} style={{
                              padding: "4px 9px", border: "1.5px solid #1b1b1b", borderRadius: 5,
                              fontSize: 11, fontWeight: 700, background: "#fff",
                              boxShadow: "1px 1px 0px 0px #1b1b1b",
                            }}>{i}</span>
                          ))}
                          {(res.interests || []).length > 6 && (
                            <span style={{ padding: "4px 9px", fontSize: 11, fontWeight: 700, color: "#aaa" }}>
                              +{res.interests.length - 6}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Campus vibe */}
                    {(res.campusVibe || []).length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <p style={{ margin: "0 0 6px", fontSize: 9, fontWeight: 900, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.1em" }}>Campus Vibe</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {(res.campusVibe || []).slice(0, 3).map(v => (
                            <span key={v} style={{
                              padding: "4px 9px", border: "1.5px solid #1b1b1b", borderRadius: 5,
                              fontSize: 11, fontWeight: 700, background: "#FEF3C7",
                              boxShadow: "1px 1px 0px 0px #1b1b1b",
                            }}>{v}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Squad / looking for */}
                    {(res.squad || []).length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <p style={{ margin: "0 0 6px", fontSize: 9, fontWeight: 900, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.1em" }}>Looking for</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {(res.squad || []).slice(0, 4).map(s => (
                            <span key={s} style={{
                              padding: "4px 9px", border: "1.5px solid #1b1b1b", borderRadius: 5,
                              fontSize: 11, fontWeight: 700, background: "#EEF2FF",
                              boxShadow: "1px 1px 0px 0px #1b1b1b",
                            }}>{s}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Privacy notice */}
                    <p style={{
                      margin: "10px 0 0", fontSize: 10, color: "#bbb",
                      fontWeight: 700, textAlign: "center",
                      paddingTop: 10, borderTop: "1.5px solid #eee",
                    }}>
                      🔒 Real photo revealed only after mutual match &amp; both reveal
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <NavBar />
    </>
  );
}
