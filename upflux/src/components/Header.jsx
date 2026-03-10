import { useState, useEffect, useContext } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { AuthContext } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useNavigate } from "react-router-dom";

function Header({ onMenuClick }) {
  const { user } = useContext(AuthContext);
  const { theme, toggleTheme } = useTheme();
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsername = async () => {
      if (user?.uid) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) setUsername(userDoc.data().username);
        } catch (error) {
          console.error("Error fetching username:", error);
        }
      }
    };
    fetchUsername();
  }, [user]);

  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "0 32px", height: "64px",
      background: "var(--bg-glass)",
      backdropFilter: "blur(20px)",
      borderBottom: "1px solid var(--border-light)",
      boxShadow: "var(--shadow-soft)",
      position: "sticky", top: 0, zIndex: 100,
    }}>
      {/* Logo */}
      <div
        onClick={() => navigate("/dashboard")}
        style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
      >
        <div style={{
          width: 34, height: 34, borderRadius: "10px",
          background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "18px", boxShadow: "0 0 14px rgba(99,102,241,0.5)",
        }}>🚀</div>
        <span style={{ fontWeight: 800, fontSize: "18px", color: "#f1f5f9", letterSpacing: "-0.5px" }}>
          Up<span style={{ color: "#818cf8" }}>flux</span>
        </span>
      </div>

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {username && (
          <div style={{
            display: "flex", alignItems: "center", gap: "8px",
            background: "var(--bg-primary)", border: "1px solid var(--border-light)",
            borderRadius: "20px", padding: "6px 14px",
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: "50%",
              background: "linear-gradient(135deg,#6366f1,#ec4899)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "13px", fontWeight: 700, color: "#fff",
            }}>
              {username.charAt(0).toUpperCase()}
            </div>
            <span style={{ color: "var(--text-primary)", fontSize: "14px", fontWeight: 600 }}>{username}</span>
          </div>
        )}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          style={{
            width: 40, height: 40, borderRadius: "12px",
            background: "var(--bg-secondary)", border: "1px solid var(--border-light)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "20px", cursor: "pointer", transition: "all 0.2s",
            color: "var(--text-secondary)",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--brand-light)"; e.currentTarget.style.borderColor = "var(--border-accent)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-secondary)"; e.currentTarget.style.borderColor = "var(--border-light)"; }}
        >
          {theme === "dark" ? "🌙" : "☀️"}
        </button>

        {/* Hamburger */}
        <div
          onClick={onMenuClick}
          style={{
            width: 40, height: 40, borderRadius: "12px",
            background: "var(--bg-secondary)", border: "1px solid var(--border-light)",
            display: "flex", flexDirection: "column", justifyContent: "center",
            alignItems: "center", gap: "5px", cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--brand-light)"; e.currentTarget.style.borderColor = "var(--border-accent)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-secondary)"; e.currentTarget.style.borderColor = "var(--border-light)"; }}
        >
          {[0, 1, 2].map(i => (
            <div key={i} style={{ width: 18, height: 2, background: "var(--text-secondary)", borderRadius: "2px" }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default Header;
