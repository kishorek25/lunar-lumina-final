import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "../services/firebase";
import { signOut } from "firebase/auth";

const NAV_ITEMS = [
  { path: "/dashboard", icon: "📊", label: "Dashboard" },
  { path: "/student-academics", icon: "🎓", label: "Student Academics" },
  { path: "/profile", icon: "👤", label: "Profile" },
  { path: "/quiz", icon: "📝", label: "Take Quiz" },
  { path: "/history", icon: "📜", label: "History" },
  { path: "/performance", icon: "📈", label: "Performance" },
  { path: "/leaderboard", icon: "🏆", label: "Leaderboard" },
  { path: "/challenges", icon: "🎮", label: "Challenges" },
  { path: "/study-planner", icon: "📚", label: "Study Planner" },
];

function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (path) => {
    navigate(path);
    onClose();
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 999,
          }}
        />
      )}

      {/* Sidebar panel */}
      <div style={{
        position: "fixed", top: 0, right: isOpen ? 0 : "-320px",
        width: "300px", height: "100vh",
        background: "var(--bg-glass)",
        backdropFilter: "blur(24px)",
        borderLeft: "1px solid var(--border-light)",
        boxShadow: isOpen ? "var(--shadow-lg)" : "none",
        transition: "right 0.35s cubic-bezier(0.22,1,0.36,1)",
        zIndex: 1000,
        display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{
          padding: "24px 20px 16px",
          borderBottom: "1px solid var(--border-light)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: 34, height: 34, borderRadius: "10px",
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px",
            }}>🚀</div>
            <span style={{ fontWeight: 800, fontSize: "17px", color: "var(--text-primary)" }}>
              Up<span style={{ color: "var(--brand-accent)" }}>flux</span>
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "var(--bg-secondary)", border: "1px solid var(--border-light)",
              borderRadius: "10px", width: 36, height: 36,
              color: "var(--text-secondary)", cursor: "pointer", fontSize: "18px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >✕</button>
        </div>

        {/* Nav items */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px" }}>
          {NAV_ITEMS.map(({ path, icon, label }) => {
            const isActive = location.pathname === path;
            return (
              <div
                key={path}
                onClick={() => handleNavigation(path)}
                style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "12px 14px", borderRadius: "12px", marginBottom: "4px",
                  cursor: "pointer", transition: "all 0.2s",
                  background: isActive
                    ? "linear-gradient(135deg,rgba(99,102,241,0.25),rgba(139,92,246,0.15))"
                    : "transparent",
                  border: isActive ? "1px solid var(--border-accent)" : "1px solid transparent",
                  color: isActive ? "var(--brand-accent)" : "var(--text-secondary)",
                  fontWeight: isActive ? 700 : 500,
                  fontSize: "14px",
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = "var(--bg-glass-hover)";
                    e.currentTarget.style.color = "var(--text-primary)";
                    e.currentTarget.style.transform = "translateX(4px)";
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-secondary)";
                    e.currentTarget.style.transform = "translateX(0)";
                  }
                }}
              >
                <span style={{ fontSize: "18px", width: 24, textAlign: "center" }}>{icon}</span>
                <span>{label}</span>
                {isActive && <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "var(--brand-accent)" }} />}
              </div>
            );
          })}
        </div>

        {/* Logout */}
        <div style={{ padding: "12px", borderTop: "1px solid var(--border-light)" }}>
          <div
            onClick={handleLogout}
            style={{
              display: "flex", alignItems: "center", gap: "12px",
              padding: "12px 14px", borderRadius: "12px", cursor: "pointer",
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)",
              color: "#f87171", fontWeight: 600, fontSize: "14px",
              transition: "var(--transition-fast)",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.18)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
          >
            <span style={{ fontSize: "18px" }}>🚪</span>
            <span>Logout</span>
          </div>
        </div>
      </div>
    </>
  );
}

export default Sidebar;
