import { useParams, Link } from "react-router-dom";
import { concepts } from "../data/modules/concepts";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { useState } from "react";

function ConceptModule() {
  const { topic } = useParams();
  const module = concepts[topic];
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!module) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-app)" }}>
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div style={{ maxWidth: "896px", margin: "0 auto", padding: "24px" }}>
          <h1 style={{ fontSize: "1.875rem", fontWeight: 700, color: "var(--text-primary)" }}>
            Module Not Found
          </h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "8px" }}>
            No learning module found for "<strong>{topic}</strong>".
          </p>
          <Link
            to="/study-planner"
            style={{
              display: "inline-block",
              marginTop: "16px",
              padding: "10px 24px",
              backgroundColor: "var(--brand-primary)",
              color: "#fff",
              borderRadius: "12px",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: 600,
              boxShadow: "var(--shadow-md)",
            }}
          >
            ← Back to Study Planner
          </Link>
        </div>
      </div>
    );
  }

  const sectionStyle = {
    backgroundColor: "var(--bg-glass)",
    backdropFilter: "blur(24px)",
    borderRadius: "20px",
    border: "1px solid var(--border-light)",
    boxShadow: "var(--shadow-md)",
    padding: "24px",
    marginBottom: "20px",
  };

  const sectionTitleStyle = {
    fontSize: "13px",
    fontWeight: 700,
    color: "var(--brand-primary)",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    marginBottom: "12px",
  };

  const sectionTextStyle = {
    fontSize: "15px",
    color: "var(--text-primary)",
    lineHeight: 1.8,
    margin: 0,
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-app)" }}>
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div style={{ maxWidth: "896px", margin: "0 auto", padding: "40px 24px" }}>
        <Link
          to="/study-planner"
          style={{
            color: "var(--brand-primary)",
            textDecoration: "none",
            fontSize: "14px",
            fontWeight: 600,
            marginBottom: "24px",
            display: "inline-block",
            transition: "all 0.2s",
          }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--brand-accent)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--brand-primary)"}
        >
          ← Back to Study Planner
        </Link>

        <h1 style={{ fontSize: "2.25rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "32px", letterSpacing: "-0.02em" }}>
          {module.title}
        </h1>

        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Explanation</div>
          <p style={sectionTextStyle}>{module.explanation}</p>
        </div>

        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Key Idea</div>
          <p style={sectionTextStyle}>{module.keyIdea}</p>
        </div>

        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Example</div>
          <p style={sectionTextStyle}>{module.example}</p>
        </div>

        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Practice</div>
          <p style={sectionTextStyle}>{module.practice}</p>
        </div>

        <button
          onClick={() => window.print()}
          style={{
            marginTop: "12px",
            padding: "12px 28px",
            backgroundColor: "var(--brand-primary)",
            color: "#fff",
            border: "none",
            borderRadius: "12px",
            fontSize: "15px",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "var(--shadow-md)",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
          onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
        >
          Download Module
        </button>
      </div>
    </div>
  );
}

export default ConceptModule;
