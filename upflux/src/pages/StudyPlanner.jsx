import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { studyCurriculum } from "../data/studyCurriculum";

function StudyPlanner() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState(null);

  const cardStyle = {
    background: "var(--bg-glass)",
    backdropFilter: "blur(24px)",
    border: "1px solid var(--border-light)",
    borderRadius: "20px",
    boxShadow: "var(--shadow-lg)",
    marginBottom: "16px",
    overflow: "hidden",
    transition: "all 0.3s ease",
  };

  const headerStyle = {
    padding: "18px 20px",
    cursor: "pointer",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "var(--bg-secondary)",
    borderBottom: "1px solid var(--border-light)",
    transition: "all 0.2s ease",
  };

  const contentStyle = { padding: "20px" };

  const topicRowStyle = {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "16px",
    padding: "14px 16px",
    borderRadius: "12px",
    marginBottom: "8px",
    background: "var(--bg-primary)",
    border: "1px solid var(--border-light)",
    transition: "all 0.2s ease",
  };

  const linkStyle = {
    flexShrink: 0,
    padding: "7px 16px",
    background: "var(--brand-primary)",
    color: "#fff",
    borderRadius: "10px",
    textDecoration: "none",
    fontSize: "13px",
    fontWeight: 600,
    whiteSpace: "nowrap",
    boxShadow: "var(--shadow-sm)",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-app)" }}>
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div style={{ padding: "40px", maxWidth: "900px", margin: "0 auto" }}>
        <div style={{ marginBottom: "20px" }}>
          <button
            onClick={() => window.history.back()}
            style={{
              background: "var(--bg-secondary)", border: "1px solid var(--border-light)",
              borderRadius: "12px", padding: "8px 16px", color: "var(--text-secondary)",
              cursor: "pointer", fontSize: "14px", fontWeight: 600, transition: "var(--transition-fast)",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--bg-glass-hover)"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--bg-secondary)"}
          >← Back</button>
        </div>
        <h1 style={{ marginBottom: "8px", color: "var(--text-primary)", fontSize: "28px", fontWeight: 800 }}>
          📚 Study Planner
        </h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: "28px", fontSize: "15px", lineHeight: 1.6 }}>
          Unit-based curriculum from beginner to advanced. Click any topic to review it in the Learning Module.
        </p>

        {studyCurriculum.map((section) => {
          const isExpanded = expandedCategory === section.id;
          return (
            <div key={section.id} style={cardStyle}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setExpandedCategory(isExpanded ? null : section.id)}
                onKeyDown={(e) =>
                  (e.key === "Enter" || e.key === " ") &&
                  setExpandedCategory(isExpanded ? null : section.id)
                }
                style={{
                  ...headerStyle,
                  background: isExpanded ? "var(--brand-light)" : "var(--bg-secondary)",
                  borderBottom: isExpanded ? "1px solid var(--brand-primary)" : "1px solid var(--border-light)",
                }}
                onMouseEnter={(e) => {
                  if (!isExpanded) e.currentTarget.style.background = "var(--bg-glass-hover)";
                }}
                onMouseLeave={(e) => {
                  if (!isExpanded) e.currentTarget.style.background = "var(--bg-secondary)";
                }}
              >
                <h2 style={{ margin: 0, fontSize: "17px", color: isExpanded ? "var(--brand-primary)" : "var(--text-primary)", fontWeight: 700 }}>
                  {section.category}
                </h2>
                <span style={{ fontSize: "20px", color: isExpanded ? "var(--brand-primary)" : "var(--text-muted)", fontWeight: 300 }}>
                  {isExpanded ? "−" : "+"}
                </span>
              </div>

              {isExpanded && (
                <div style={contentStyle}>
                  {section.topics.map((topic, idx) => (
                    <div
                      key={idx}
                      style={topicRowStyle}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(99,102,241,0.1)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
                          {idx + 1}. {topic.name}
                        </div>
                        <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                          {topic.description}
                        </div>
                      </div>
                      <Link
                        to={`/concept/${new URL(topic.url, "http://x").searchParams.get("concept")}`}
                        style={linkStyle}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#4f46e5";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#6366f1";
                        }}
                      >
                        Study →
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div style={{
          ...cardStyle,
          background: "rgba(16,185,129,0.08)",
          border: "1px solid rgba(16,185,129,0.2)",
          padding: "20px",
        }}>
          <h3 style={{ margin: "0 0 12px 0", color: "#34d399" }}>💡 Tips</h3>
          <ul style={{ color: "#6ee7b7", paddingLeft: "20px", margin: 0, lineHeight: 1.8 }}>
            <li>Follow topics in order within each category for best progression.</li>
            <li>Take a quiz after completing a section to reinforce learning.</li>
            <li>Check your Performance page for a personalized weak-topic study plan.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default StudyPlanner;
