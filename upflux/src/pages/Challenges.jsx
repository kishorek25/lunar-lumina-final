import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

const API_BASE = "http://localhost:5000";

function Challenges() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [progress, setProgress] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [currentChallenge, setCurrentChallenge] = useState(null);
  const [loadingChallenge, setLoadingChallenge] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setLoadingProgress(false);
      return;
    }
    const fetchProgress = async () => {
      try {
        const res = await fetch(`${API_BASE}/challenge-progress/${user.uid}`);
        const data = await res.json();
        setProgress(data);
      } catch (err) {
        console.error("Challenge progress error:", err);
        setProgress({ highestCompleted: 0, completedLevels: [], unlockedLevels: [1], totalLevels: 20 });
      } finally {
        setLoadingProgress(false);
      }
    };
    fetchProgress();
  }, [user]);

  const unlockedLevels = progress?.unlockedLevels || [1];
  const highestCompleted = progress?.highestCompleted || 0;

  const startLevel = async (level) => {
    setError("");
    setResult(null);
    setSelectedAnswer(null);
    setLoadingChallenge(true);
    setCurrentChallenge(null);
    setQuestionStartTime(null);

    try {
      const res = await fetch(`${API_BASE}/generate-challenge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, userId: user?.uid }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to generate challenge");
      }

      setCurrentChallenge(data);
      setQuestionStartTime(Date.now());
    } catch (err) {
      setError(err.message || "Failed to load challenge");
    } finally {
      setLoadingChallenge(false);
    }
  };

  const submitAnswer = async () => {
    if (!selectedAnswer || !currentChallenge) return;

    const timeTaken = questionStartTime ? (Date.now() - questionStartTime) / 1000 : null;

    try {
      const res = await fetch(`${API_BASE}/evaluate-challenge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge: currentChallenge,
          userAnswer: selectedAnswer,
          userId: user?.uid,
          timeTaken,
        }),
      });

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message || "Failed to evaluate answer");
    }
  };

  const resetAndBack = async () => {
    setCurrentChallenge(null);
    setResult(null);
    setSelectedAnswer(null);
    setError("");
    if (user?.uid) {
      try {
        const res = await fetch(`${API_BASE}/challenge-progress/${user.uid}`);
        const data = await res.json();
        setProgress(data);
      } catch (err) {
        console.error("Progress fetch error:", err);
      }
    }
  };

  if (!user) {
    return (
      <div style={{ padding: "40px", maxWidth: "600px", margin: "0 auto" }}>
        <h2>Challenges</h2>
        <p>Please log in to access challenges.</p>
        <button
          onClick={() => navigate("/login")}
          style={{
            marginTop: "12px",
            padding: "8px 16px",
            backgroundColor: "#6366f1",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Log In
        </button>
      </div>
    );
  }

  const containerStyle = {
    padding: "40px",
    maxWidth: "800px",
    margin: "0 auto",
  };

  const cardStyle = {
    backgroundColor: "var(--bg-glass)",
    backdropFilter: "blur(24px)",
    borderRadius: "20px",
    border: "1px solid var(--border-light)",
    boxShadow: "var(--shadow-md)",
    padding: "24px",
    marginBottom: "20px",
  };

  const levelGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: "12px",
    marginTop: "16px",
  };

  const levelBtnStyle = (unlocked, completed) => ({
    padding: "16px",
    borderRadius: "12px",
    border: completed ? "2px solid #10b981" : unlocked ? "2px solid var(--brand-primary)" : "1px solid var(--border-light)",
    backgroundColor: completed ? "#ecfdf5" : unlocked ? "var(--bg-secondary)" : "var(--bg-primary)",
    color: unlocked ? "var(--text-primary)" : "var(--text-muted)",
    cursor: unlocked ? "pointer" : "not-allowed",
    fontWeight: 600,
    fontSize: "14px",
    transition: "all 0.2s ease",
  });

  const optionBtnStyle = (opt) => ({
    display: "block",
    width: "100%",
    padding: "14px 18px",
    marginBottom: "10px",
    borderRadius: "12px",
    border: selectedAnswer === opt ? "2px solid var(--brand-primary)" : "1px solid var(--border-light)",
    backgroundColor: selectedAnswer === opt ? "var(--brand-light)" : "var(--bg-secondary)",
    color: "var(--text-primary)",
    cursor: "pointer",
    textAlign: "left",
    fontSize: "15px",
    transition: "all 0.2s ease",
  });

  const submitBtnStyle = {
    marginTop: "16px",
    padding: "12px 28px",
    backgroundColor: "var(--brand-primary)",
    color: "white",
    border: "none",
    borderRadius: "12px",
    cursor: selectedAnswer ? "pointer" : "not-allowed",
    opacity: selectedAnswer ? 1 : 0.6,
    fontWeight: 700,
    boxShadow: selectedAnswer ? "var(--shadow-md)" : "none",
    transition: "all 0.2s ease",
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-app)" }}>
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div style={containerStyle}>
        <div style={{ marginBottom: "16px" }}>
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
        <h2>Challenges</h2>
        <p style={{ color: "#6b7280", marginBottom: "8px" }}>
          Complete levels 1–20. Each level has one question. Unlock the next level by answering correctly.
        </p>

        {error && (
          <div style={{ padding: "12px", backgroundColor: "#fef2f2", color: "#b91c1c", borderRadius: "8px", marginBottom: "16px" }}>
            {error}
          </div>
        )}

        {!currentChallenge && !loadingChallenge && (
          <div style={cardStyle}>
            <h3>Select a Level</h3>
            {loadingProgress ? (
              <p>Loading progress...</p>
            ) : (
              <div style={levelGridStyle}>
                {Array.from({ length: 20 }, (_, i) => i + 1).map((level) => {
                  const unlocked = unlockedLevels.includes(level);
                  const completed = (progress?.completedLevels || []).includes(level);
                  return (
                    <button
                      key={level}
                      style={levelBtnStyle(unlocked, completed)}
                      onClick={() => unlocked && startLevel(level)}
                      disabled={!unlocked}
                    >
                      Level {level}
                      {completed && " ✓"}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {loadingChallenge && (
          <div style={cardStyle}>
            <p>Generating challenge...</p>
          </div>
        )}

        {currentChallenge && !result && (
          <div style={cardStyle}>
            <p style={{ color: "#6b7280", fontSize: "13px", marginBottom: "8px" }}>
              Level {currentChallenge.level} • {currentChallenge.difficulty}
            </p>
            <h3>{currentChallenge.question}</h3>
            <div style={{ marginTop: "16px" }}>
              {["A", "B", "C", "D"].map((opt) => (
                <button
                  key={opt}
                  style={optionBtnStyle(opt)}
                  onClick={() => setSelectedAnswer(opt)}
                >
                  {opt}. {currentChallenge.options?.[opt]}
                </button>
              ))}
            </div>
            <button
              style={submitBtnStyle}
              onClick={submitAnswer}
              disabled={!selectedAnswer}
            >
              Submit Answer
            </button>
          </div>
        )}

        {result && (
          <div style={cardStyle}>
            <h3>{result.isCorrect ? "Correct!" : "Incorrect"}</h3>
            <p>
              Your answer: {result.userAnswer}. Correct answer: {result.correctAnswer}.
            </p>
            <p style={{ marginTop: "12px" }}>{result.explanation}</p>
            {result.timeBonus > 0 && (
              <p style={{ color: "#10b981", marginTop: "8px" }}>Time bonus: +{result.timeBonus} XP</p>
            )}
            {result.nextLevelUnlocked && (
              <p style={{ color: "#6366f1", marginTop: "8px", fontWeight: 600 }}>
                Next level unlocked!
              </p>
            )}
            <button
              style={{
                marginTop: "20px",
                padding: "10px 24px",
                backgroundColor: "#6366f1",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: 600,
              }}
              onClick={resetAndBack}
            >
              Back to Levels
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Challenges;
