// src/pages/courses.js
// University Courses Directory — browse all programmes offered.
// Tap a course card to filter the swipe deck by that course.

import { useRouter } from "next/router";

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
        * { box-sizing: border-box; }
        body { margin: 0; background: #F5F4F0; }
        .course-card {
          background: #fff;
          border-radius: 14px;
          padding: 12px 14px;
          cursor: pointer;
          border: 2px solid transparent;
          transition: all 0.18s;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 1px 6px rgba(0,0,0,0.04);
        }
        .course-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.10);
        }
        .stream-section { animation: fadeUp 0.4s ease both; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "#F5F4F0",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        paddingBottom: 60,
      }}>
        {/* Header */}
        <header style={{
          background: "#fff",
          borderBottom: "1px solid #EDECE8",
          padding: "16px 20px",
          position: "sticky", top: 0, zIndex: 10,
        }}>
          <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={() => router.back()}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", padding: 0, lineHeight: 1 }}
              >
                ←
              </button>
              <div>
                <h1 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "#111" }}>Courses Directory</h1>
                <p style={{ margin: 0, fontSize: 11, color: "#AAA", fontWeight: 600 }}>{totalCourses} programmes • {COURSE_STREAMS.length} streams</p>
              </div>
            </div>
            <button
              onClick={() => router.push("/swipe")}
              style={{
                padding: "8px 16px", borderRadius: 10, border: "none",
                background: "#FF4757", color: "#fff",
                fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
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
            background: "linear-gradient(135deg, #FF4757 0%, #6C5CE7 100%)",
            borderRadius: 20, padding: "24px 22px",
            color: "#fff", marginBottom: 28,
          }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🎓</div>
            <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 900 }}>All University Programmes</h2>
            <p style={{ margin: 0, fontSize: 13, opacity: 0.85, lineHeight: 1.5 }}>
              Browse every course offered across all departments. Tap any course to find batchmates.
            </p>
          </div>

          {/* Stream Sections */}
          {COURSE_STREAMS.map((stream, si) => (
            <div
              key={stream.stream}
              className="stream-section"
              style={{ marginBottom: 24, animationDelay: `${si * 0.05}s` }}
            >
              {/* Stream header */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                marginBottom: 12,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: stream.color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16,
                }}>
                  {stream.emoji}
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 900, fontSize: 14, color: "#111" }}>{stream.stream}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#AAA", fontWeight: 600 }}>{stream.courses.length} programmes</p>
                </div>
                <div style={{
                  marginLeft: "auto",
                  height: 2, flex: 1, maxWidth: 120,
                  background: `${stream.color}30`,
                  borderRadius: 999,
                }} />
              </div>

              {/* Course cards */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 8,
              }}>
                {stream.courses.map((course) => (
                  <div
                    key={course.l}
                    className="course-card"
                    onClick={() => router.push(`/swipe?course=${encodeURIComponent(course.l)}`)}
                    style={{ borderColor: "transparent" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = stream.color}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "transparent"}
                  >
                    <div style={{
                      width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                      background: `${stream.color}15`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 18,
                    }}>
                      {course.e}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 800, fontSize: 13, color: "#111" }}>{course.l}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: "#888", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {course.full}
                      </p>
                    </div>
                    <span style={{ marginLeft: "auto", fontSize: 14, color: "#CCC", flexShrink: 0 }}>→</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
