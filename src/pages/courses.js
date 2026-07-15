// src/pages/courses.js
// University Courses Directory — browse all programmes offered.
// Tap a course card to filter the swipe deck by that course.

import { useRouter } from "next/router";
import NavBar from "../components/NavBar";

const COURSE_STREAMS = [
  {
    stream: "Engineering",
    emoji: "🏗️",
    color: "#FF4757",
    courses: [
      { l: "CSE", e: "💻", full: "Computer Science & Engineering" },
      { l: "ECE", e: "📡", full: "Electronics & Communication Engg" },
      { l: "IT", e: "🖥️", full: "Information Technology" },
      { l: "EEE", e: "⚡", full: "Electrical & Electronics Engg" },
      { l: "Mechanical", e: "⚙️", full: "Mechanical Engineering" },
      { l: "Civil", e: "🏗️", full: "Civil Engineering" },
      { l: "Chemical Engg", e: "⚗️", full: "Chemical Engineering" },
      { l: "Biotech Engg", e: "🧬", full: "Biotechnology Engineering" },
      { l: "Aerospace", e: "✈️", full: "Aerospace Engineering" },
      { l: "Mining", e: "⛏️", full: "Mining Engineering" },
      { l: "Environmental Engg", e: "🌿", full: "Environmental Engineering" },
      { l: "Agricultural Engg", e: "🌾", full: "Agricultural Engineering" },
      { l: "Marine Engg", e: "🚢", full: "Marine Engineering" },
      { l: "Production Engg", e: "🏭", full: "Production Engineering" },
    ],
  },
  {
    stream: "Computer Applications",
    emoji: "🖥️",
    color: "#6C5CE7",
    courses: [
      { l: "BCA", e: "🖥️", full: "Bachelor of Computer Applications" },
      { l: "MCA", e: "💻", full: "Master of Computer Applications" },
    ],
  },
  {
    stream: "Management",
    emoji: "💼",
    color: "#00B894",
    courses: [
      { l: "BBA", e: "📊", full: "Bachelor of Business Administration" },
      { l: "MBA", e: "💼", full: "Master of Business Administration" },
      { l: "B.Com", e: "📈", full: "Bachelor of Commerce" },
      { l: "M.Com", e: "📉", full: "Master of Commerce" },
      { l: "PGDM", e: "📋", full: "Post Graduate Diploma in Management" },
    ],
  },
  {
    stream: "Science",
    emoji: "🔬",
    color: "#0984E3",
    courses: [
      { l: "BSc Physics", e: "⚛️", full: "B.Sc. Physics" },
      { l: "BSc Chemistry", e: "🧪", full: "B.Sc. Chemistry" },
      { l: "BSc Maths", e: "📐", full: "B.Sc. Mathematics" },
      { l: "BSc Biology", e: "🔬", full: "B.Sc. Biology" },
      { l: "BSc CS", e: "💻", full: "B.Sc. Computer Science" },
      { l: "BSc Biotech", e: "🧬", full: "B.Sc. Biotechnology" },
      { l: "MSc", e: "🔭", full: "Master of Science" },
    ],
  },
  {
    stream: "Arts & Humanities",
    emoji: "🎭",
    color: "#E84393",
    courses: [
      { l: "BA English", e: "📝", full: "B.A. English Literature" },
      { l: "BA History", e: "🏛️", full: "B.A. History" },
      { l: "BA Pol. Science", e: "🗳️", full: "B.A. Political Science" },
      { l: "BA Psychology", e: "🧠", full: "B.A. Psychology" },
      { l: "BA Sociology", e: "👥", full: "B.A. Sociology" },
      { l: "BA Economics", e: "💹", full: "B.A. Economics" },
      { l: "BA Philosophy", e: "🤔", full: "B.A. Philosophy" },
      { l: "MA", e: "🎓", full: "Master of Arts" },
    ],
  },
  {
    stream: "Law",
    emoji: "⚖️",
    color: "#FDCB6E",
    courses: [
      { l: "LLB", e: "⚖️", full: "Bachelor of Laws (3-year)" },
      { l: "LLM", e: "⚖️", full: "Master of Laws" },
      { l: "BA LLB", e: "⚖️", full: "B.A. + LLB (Integrated 5-year)" },
      { l: "BBA LLB", e: "⚖️", full: "BBA + LLB (Integrated 5-year)" },
    ],
  },
  {
    stream: "Medical & Allied Health",
    emoji: "🏥",
    color: "#10B981",
    courses: [
      { l: "MBBS", e: "🏥", full: "Bachelor of Medicine & Surgery" },
      { l: "BDS", e: "🦷", full: "Bachelor of Dental Surgery" },
      { l: "BPharm", e: "💊", full: "Bachelor of Pharmacy" },
      { l: "MPharm", e: "💊", full: "Master of Pharmacy" },
      { l: "BSc Nursing", e: "🩺", full: "B.Sc. Nursing" },
      { l: "Physiotherapy", e: "🏃", full: "B.Sc. Physiotherapy" },
    ],
  },
  {
    stream: "Architecture & Design",
    emoji: "🎨",
    color: "#E17055",
    courses: [
      { l: "B.Arch", e: "🏛️", full: "Bachelor of Architecture" },
      { l: "B.Des", e: "🎨", full: "Bachelor of Design" },
    ],
  },
  {
    stream: "Education",
    emoji: "📚",
    color: "#00CEC9",
    courses: [
      { l: "B.Ed", e: "📚", full: "Bachelor of Education" },
      { l: "M.Ed", e: "📚", full: "Master of Education" },
    ],
  },
  {
    stream: "Agriculture",
    emoji: "🌾",
    color: "#55A630",
    courses: [
      { l: "BSc Agriculture", e: "🌾", full: "B.Sc. Agriculture" },
      { l: "MSc Agriculture", e: "🌾", full: "M.Sc. Agriculture" },
    ],
  },
  {
    stream: "Hotel & Tourism",
    emoji: "🏨",
    color: "#F9A825",
    courses: [
      { l: "BHM", e: "🏨", full: "Bachelor of Hotel Management" },
      { l: "MTM", e: "🧳", full: "Master of Tourism Management" },
    ],
  },
];

export default function CoursesPage() {
  const router = useRouter();

  const totalCourses = COURSE_STREAMS.reduce((sum, s) => sum + s.courses.length, 0);

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
        }
        .course-card {
          background: #ffffff;
          border: 3px solid #1b1b1b;
          border-radius: 12px;
          padding: 14px 16px;
          cursor: pointer;
          transition: all 0.1s ease;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 4px 4px 0px 0px #1b1b1b;
        }
        .course-card:hover {
          transform: translate(2px, 2px);
          box-shadow: 2px 2px 0px 0px #1b1b1b;
        }
        .course-card:active {
          transform: translate(4px, 4px);
          box-shadow: 0px 0px 0px 0px #1b1b1b;
        }
        .stream-section { animation: fadeUp 0.4s ease both; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .neo-btn {
          transition: all 0.1s ease;
        }
        .neo-btn:active {
          transform: translate(2px, 2px) !important;
          box-shadow: 0px 0px 0px 0px #1b1b1b !important;
        }
      `}</style>

      <div style={{
        minHeight: "100vh",
        fontFamily: "'Montserrat', sans-serif",
        paddingBottom: 110,
      }}>
        {/* Header */}
        <header style={{
          background: "#ffffff",
          borderBottom: "3px solid #1b1b1b",
          padding: "16px 20px",
          position: "sticky", top: 0, zIndex: 10,
          boxShadow: "0px 4px 0px 0px rgba(0,0,0,1)"
        }}>
          <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={() => router.back()}
                className="neo-btn"
                style={{
                  background: "#ffffff", border: "2px solid #1b1b1b", fontSize: 16, cursor: "pointer",
                  width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
                  borderRadius: 6, boxShadow: "2px 2px 0px 0px #1b1b1b", fontWeight: 900
                }}
              >
                ←
              </button>
              <div>
                <h1 style={{ margin: 0, fontSize: 16, fontWeight: 950, color: "#1b1b1b", textTransform: "uppercase" }}>Courses Directory</h1>
                <p style={{ margin: 0, fontSize: 10, color: "#1b1b1b", fontWeight: 800 }}>{totalCourses} PROGRAMMES • {COURSE_STREAMS.length} STREAMS</p>
              </div>
            </div>
            <button
              onClick={() => router.push("/swipe")}
              className="neo-btn"
              style={{
                padding: "8px 16px", borderRadius: 8, border: "2px solid #1b1b1b",
                background: "#bdff00", color: "#1b1b1b",
                boxShadow: "2px 2px 0px 0px #1b1b1b",
                fontWeight: 900, fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                textTransform: "uppercase"
              }}
            >
              Start Swiping →
            </button>
          </div>
        </header>

        {/* Hero */}
        <div style={{
          maxWidth: 640, margin: "0 auto",
          padding: "28px 20px 12px",
        }}>
          <div style={{
            background: "#ecdcff",
            border: "3px solid #1b1b1b",
            boxShadow: "6px 6px 0px 0px #1b1b1b",
            borderRadius: 16, padding: "24px 22px",
            color: "#1b1b1b", marginBottom: 28,
          }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🎓</div>
            <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 950, textTransform: "uppercase" }}>All University Programmes</h2>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, opacity: 0.85, lineHeight: 1.5 }}>
              Browse every course offered across all departments. Tap any course card to find batchmates.
            </p>
          </div>

          {/* Stream Sections */}
          {COURSE_STREAMS.map((stream, si) => (
            <div
              key={stream.stream}
              className="stream-section"
              style={{ marginBottom: 28, animationDelay: `${si * 0.05}s` }}
            >
              {/* Stream header */}
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                marginBottom: 14,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 6,
                  background: stream.color,
                  border: "2px solid #1b1b1b",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16,
                  boxShadow: "2px 2px 0px 0px #1b1b1b",
                }}>
                  {stream.emoji}
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 950, fontSize: 14, color: "#1b1b1b", textTransform: "uppercase" }}>{stream.stream}</p>
                  <p style={{ margin: 0, fontSize: 10, color: "#1b1b1b", fontWeight: 800 }}>{stream.courses.length} PROGRAMMES</p>
                </div>
              </div>

              {/* Course cards */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 12,
              }}>
                {stream.courses.map((course) => (
                  <div
                    key={course.l}
                    className="course-card"
                    onClick={() => router.push(`/swipe?course=${encodeURIComponent(course.l)}`)}
                  >
                    <div style={{
                      width: 38, height: 38, borderRadius: 8, flexShrink: 0,
                      background: "#ffffff",
                      border: "2px solid #1b1b1b",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 18,
                      boxShadow: "2px 2px 0px 0px #1b1b1b",
                    }}>
                      {course.e}
                    </div>
                    <div style={{ minWidth: 0, paddingLeft: 4 }}>
                      <p style={{ margin: 0, fontWeight: 900, fontSize: 13, color: "#1b1b1b" }}>{course.l}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: "#1b1b1b", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {course.full}
                      </p>
                    </div>
                    <span style={{ marginLeft: "auto", fontSize: 14, color: "#1b1b1b", fontWeight: 900, flexShrink: 0 }}>→</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <NavBar active="/courses" />
      </div>
    </>
  );
}

