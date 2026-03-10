import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";
import { AuthContext } from "../context/AuthContext";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

const DARK = {
  page: { minHeight: "100vh", background: "var(--bg-app)" },
  content: { maxWidth: "900px", margin: "0 auto", padding: "32px 24px" },
  card: {
    background: "var(--bg-glass)",
    backdropFilter: "blur(24px)",
    border: "1px solid var(--border-light)",
    borderRadius: "20px",
    padding: "24px",
    marginBottom: "16px",
    boxShadow: "var(--shadow-md)",
    transition: "transform 0.2s",
  },
};

function History() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user?.uid) { setLoading(false); return; }
      try {
        const q = query(
          collection(db, "quizAttempts"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "asc")
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            score: d.score || 0,
            total: d.total || 0,
            accuracy: d.accuracy || 0,
            xp: d.xp || 0,
            topics: d.topics || {},
            createdAt: d.createdAt?.toDate?.() || null,
          };
        });
        setAttempts(data.reverse());
      } catch (err) {
        console.error("Error fetching history:", err);
      }
      setLoading(false);
    };
    fetchHistory();
  }, [user]);

  return (
    <div style={DARK.page}>
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div style={DARK.content}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "28px" }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: "var(--bg-secondary)", border: "1px solid var(--border-light)",
              borderRadius: "12px", padding: "8px 16px", color: "var(--text-secondary)",
              cursor: "pointer", fontSize: "14px", fontWeight: 600, transition: "all 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--bg-glass-hover)"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--bg-secondary)"}
          >← Back</button>
          <div>
            <h1 style={{ color: "var(--text-primary)", fontSize: "1.8rem", fontWeight: 800, margin: 0 }}>📜 Quiz History</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: 0 }}>
              {loading ? "Loading..." : `${attempts.length} attempt${attempts.length !== 1 ? "s" : ""} total`}
            </p>
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "2rem", marginBottom: "12px" }}>⏳</div>
            <p>Loading your history...</p>
          </div>
        )}

        {!loading && attempts.length === 0 && (
          <div style={{ ...DARK.card, textAlign: "center", padding: "60px 30px" }}>
            <div style={{ fontSize: "3rem", marginBottom: "12px" }}>📭</div>
            <h3 style={{ color: "var(--text-primary)", marginBottom: "8px" }}>No quiz attempts yet</h3>
            <p style={{ color: "var(--text-secondary)" }}>Take a quiz to see your history here.</p>
            <button
              onClick={() => navigate("/quiz")}
              style={{
                marginTop: "20px", padding: "12px 28px",
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                color: "#fff", border: "none", borderRadius: "12px",
                cursor: "pointer", fontWeight: 700, fontSize: "14px",
                boxShadow: "0 4px 16px rgba(99,102,241,0.35)",
              }}
            >Take a Quiz</button>
          </div>
        )}

        {!loading && attempts.map((attempt, index) => {
          const acc = attempt.accuracy;
          const accColor = acc >= 75 ? "#10b981" : acc >= 50 ? "#f59e0b" : "#ef4444";
          return (
            <div
              key={attempt.id}
              style={DARK.card}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                    <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "16px" }}>
                      Attempt #{attempts.length - index}
                    </span>
                    <span style={{
                      fontSize: "12px", padding: "2px 10px", borderRadius: "20px",
                      background: `${accColor}22`, color: accColor,
                      border: `1px solid ${accColor}44`, fontWeight: 700,
                    }}>{acc.toFixed(1)}%</span>
                  </div>
                  {attempt.createdAt && (
                    <p style={{ color: "var(--text-secondary)", fontSize: "12px", margin: 0 }}>
                      {attempt.createdAt.toLocaleDateString()} · {attempt.createdAt.toLocaleTimeString()}
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", gap: "16px" }}>
                  {[
                    { label: "Score", value: `${attempt.score}/${attempt.total}` },
                    { label: "XP", value: `⚡ ${attempt.xp}` },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: "center" }}>
                      <div style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: "18px" }}>{s.value}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: "11px", fontWeight: 600 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ marginTop: "12px", background: "var(--bg-secondary)", borderRadius: "999px", height: "6px", overflow: "hidden" }}>
                <div style={{
                  width: `${Math.min(acc, 100)}%`, height: "100%",
                  background: `linear-gradient(90deg,${accColor},${accColor}99)`,
                  borderRadius: "999px", transition: "width 1s ease",
                }} />
              </div>

              {Object.keys(attempt.topics).length > 0 && (
                <div style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {Object.entries(attempt.topics).map(([topic, stats]) => {
                    const topicAcc = stats.total > 0 ? ((stats.correct / stats.total) * 100) : 0;
                    const tc = topicAcc >= 75 ? "#10b981" : topicAcc >= 50 ? "#f59e0b" : "#ef4444";
                    return (
                      <span key={topic} style={{
                        fontSize: "12px", padding: "3px 10px", borderRadius: "20px",
                        background: `${tc}18`, color: tc, border: `1px solid ${tc}33`, fontWeight: 600,
                      }}>
                        {topic}: {stats.correct}/{stats.total}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default History;
