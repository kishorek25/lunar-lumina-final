import { useEffect, useState, useContext, useMemo, useRef } from "react";
import { collection, query, where, getDocs, orderBy, doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import SuggestionPopup from "../components/SuggestionPopup";
import StudyPlanWithLinks from "../components/StudyPlanWithLinks";
import { getActivityDays, computeStreak, isStreakAboutToExpire } from "../utils/streakUtils";
import { sendEmailAlert } from "../services/emailAlertService";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from "recharts";

function Dashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [attempts, setAttempts] = useState([]);
  const [availableTopics, setAvailableTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState("All");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [totalXP, setTotalXP] = useState(0);
  const [level, setLevel] = useState(1);

  // Local analytics
  const [velocity, setVelocity] = useState(null);
  const [status, setStatus] = useState("");
  const [localInsights, setLocalInsights] = useState([]);

  // AI insights
  const [aiInsights, setAiInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const hasFetchedInsights = useRef(false);
  const hasTriedEmailAlert = useRef(false);

  // Intelligent suggestion popup
  const [suggestion, setSuggestion] = useState(null);
  const [showPopup, setShowPopup] = useState(false);

  // ---------------- FETCH DATA ----------------
  useEffect(() => {
    const fetchAttempts = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        const q = query(
          collection(db, "quizAttempts"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "asc")
        );

        const snapshot = await getDocs(q);

        const data = snapshot.docs.map((doc, index) => ({
          attempt: index + 1,
          accuracy: doc.data().accuracy || 0,
          topics: doc.data().topics || {},
          xp: doc.data().xp || 0,
          ...doc.data()
        }));

        setAttempts(data);

        // XP calculation
        let xpSum = 0;
        data.forEach((a) => (xpSum += a.xp || 0));
        setTotalXP(xpSum);
        setLevel(Math.floor(xpSum / 200) + 1);

        setAvailableTopics([
          "Data Structures",
          "OOPS",
          "Python",
          "Machine Learning",
          "DBMS",
          "Operating Systems",
          "Custom"
        ]);

        setLoading(false);
      } catch (err) {
        console.error("Error fetching attempts:", err);
        setLoading(false);
      }
    };

    fetchAttempts();
  }, [user]);

  // ---------------- EMAIL ALERT ENGINE ----------------
  useEffect(() => {
    if (!user?.uid || hasTriedEmailAlert.current) return;
    hasTriedEmailAlert.current = true;

    sendEmailAlert({
      uid: user.uid,
      email: user.email,
      username: user.displayName || "",
    }).catch((err) => {
      console.error("Email alert error:", err);
    });
  }, [user]);

  // ---------------- LOGIN SUGGESTION POPUP ENGINE ----------------
  useEffect(() => {
    const evaluateSuggestions = async () => {
      if (!user?.uid) return;

      // Only once per login/session
      const key = `learning_popup_shown_${user.uid}`;
      if (sessionStorage.getItem(key)) return;

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const profile = userDoc.exists() ? userDoc.data().learningProfile || null : null;

        const accuracies = attempts
          .map((a) => {
            if (typeof a.accuracy === "number") return a.accuracy;
            if (typeof a.score === "number" && typeof a.total === "number" && a.total > 0) {
              return (a.score / a.total) * 100;
            }
            return null;
          })
          .filter((v) => v !== null);

        const latestAccuracy = accuracies.length ? accuracies[accuracies.length - 1] : null;
        const velocityValue = typeof profile?.learningVelocity === "number" ? profile.learningVelocity : 0;
        const plateau = Boolean(profile?.plateauDetected);
        const topicMastery = profile?.topicMastery || {};

        // Weak topic detection: lowest mastery below threshold
        let weakestTopic = null;
        let weakestValue = Infinity;
        Object.entries(topicMastery).forEach(([topic, value]) => {
          if (typeof value === "number" && value < weakestValue) {
            weakestValue = value;
            weakestTopic = topic;
          }
        });
        const hasWeakTopic = weakestTopic && weakestValue < 60;

        // Streak detection: use shared streak util
        const activityDays = getActivityDays(attempts);
        const streakAboutToExpire = isStreakAboutToExpire(activityDays);

        // Choose exactly one suggestion by priority
        let chosen = null;

        if (!attempts.length) {
          chosen = {
            type: "first-quiz",
            title: "Welcome back!",
            message:
              "Start your first quiz today to unlock personalized insights, streak tracking, and smarter recommendations."
          };
        } else if (plateau) {
          chosen = {
            type: "plateau",
            title: "You're on a plateau",
            message:
              "Your last few quiz scores are almost flat. Try switching topics or difficulty for a short focused sprint to break the stagnation."
          };
        } else if (velocityValue < 0 && latestAccuracy !== null) {
          chosen = {
            type: "decline",
            title: "Performance is dipping",
            message:
              "Your recent quiz trend is declining. Revisit your weakest topics and do a short revision quiz to recover momentum."
          };
        } else if (hasWeakTopic) {
          chosen = {
            type: "weak-topic",
            title: "Target your weakest topic",
            message: `Your lowest mastery is in ${weakestTopic}. Take a quick quiz focused on this topic to turn it into a strength.`
          };
        } else if (streakAboutToExpire) {
          chosen = {
            type: "streak",
            title: "Keep your streak alive",
            message:
              "You're close to losing your recent quiz streak. Take a short quiz today to lock in another day of progress."
          };
        } else if (latestAccuracy !== null && velocityValue >= 0) {
          chosen = {
            type: "growth",
            title: "Nice progress so far",
            message:
              "Your scores are trending in a healthy direction. Try a slightly higher difficulty quiz to keep pushing your growth."
          };
        }

        if (chosen) {
          setSuggestion(chosen);
          setShowPopup(true);
          sessionStorage.setItem(key, "1");
        }
      } catch (err) {
        console.error("Error evaluating login suggestions:", err);
      }
    };

    evaluateSuggestions();
  }, [user, attempts]);

  // ---------------- FILTER BY TOPIC ----------------
  const displayAttempts = useMemo(() => {
    if (selectedTopic === "All") return attempts;

    return attempts
      .map((attempt) => {
        const topicStats = attempt.topics?.[selectedTopic];
        if (!topicStats) return null;

        return {
          ...attempt,
          accuracy:
            (topicStats.correct / topicStats.total) * 100
        };
      })
      .filter(Boolean);
  }, [attempts, selectedTopic]);

  // ---------------- LOCAL ANALYTICS ENGINE ----------------
  useEffect(() => {
    if (displayAttempts.length === 0) {
      setVelocity(null);
      setStatus("");
      setLocalInsights([]);
      return;
    }

    const accuracies = displayAttempts.map((a) => a.accuracy);
    const insights = [];

    // Single attempt
    if (accuracies.length === 1) {
      const acc = accuracies[0];
      setVelocity("N/A");

      if (acc >= 75) {
        insights.push({ type: "success", text: `Strong first attempt (${acc.toFixed(0)}%). Keep going!` });
        setStatus("Good Start");
      } else if (acc >= 50) {
        insights.push({ type: "info", text: `Decent start (${acc.toFixed(0)}%). Room for improvement.` });
        setStatus("Needs Practice");
      } else {
        insights.push({ type: "warning", text: `Low accuracy (${acc.toFixed(0)}%). Focus on fundamentals.` });
        setStatus("Needs Attention");
      }

      insights.push({ type: "info", text: "Take more quizzes to unlock trend analysis and stagnation detection." });
      setLocalInsights(insights);
      return;
    }

    // Multiple attempts
    const first = accuracies[0];
    const last = accuracies[accuracies.length - 1];
    const slope = (last - first) / (displayAttempts.length - 1);

    setVelocity(slope.toFixed(2));

    if (slope < -2) {
      insights.push({ type: "danger", text: "Performance is declining sharply. Immediate revision needed." });
    } else if (slope < 0) {
      insights.push({ type: "warning", text: "Slight downward trend detected. Review weak areas." });
    } else if (slope < 1) {
      insights.push({ type: "info", text: "Growth rate is slow. Increase focused practice." });
    } else {
      insights.push({ type: "success", text: "Learning curve is improving steadily." });
    }

    if (accuracies.length >= 3) {
      const recent3 = accuracies.slice(-3);
      const range = Math.max(...recent3) - Math.min(...recent3);
      if (range <= 3) {
        insights.push({ type: "warning", text: "Stagnation detected: last 3 attempts show no meaningful improvement. Change your study approach." });
      }
    }

    const variance = Math.max(...accuracies) - Math.min(...accuracies);
    if (variance > 40) {
      insights.push({ type: "warning", text: "Performance is highly inconsistent across attempts." });
    } else if (variance < 10 && accuracies.length >= 3) {
      insights.push({ type: "success", text: "Performance is consistent. Good stability." });
    }

    if (accuracies.length >= 4) {
      const prev2Avg = (accuracies[accuracies.length - 4] + accuracies[accuracies.length - 3]) / 2;
      const last2Avg = (accuracies[accuracies.length - 2] + accuracies[accuracies.length - 1]) / 2;
      if (last2Avg - prev2Avg > 10) {
        insights.push({ type: "success", text: "Strong recent momentum. Keep it up!" });
      } else if (prev2Avg - last2Avg > 10) {
        insights.push({ type: "danger", text: "Recent drop in performance. Revisit fundamentals." });
      }
    }

    const avg = accuracies.reduce((sum, a) => sum + a, 0) / accuracies.length;
    if (avg >= 75) {
      insights.push({ type: "success", text: `Average accuracy: ${avg.toFixed(0)}%. Strong overall.` });
    } else if (avg >= 50) {
      insights.push({ type: "info", text: `Average accuracy: ${avg.toFixed(0)}%. Improving but needs work.` });
    } else {
      insights.push({ type: "warning", text: `Average accuracy: ${avg.toFixed(0)}%. Below threshold — prioritize weak topics.` });
    }

    if (totalXP < 200) {
      insights.push({ type: "info", text: "Early learning stage. Complete more quizzes to level up." });
    } else if (level >= 5) {
      insights.push({ type: "success", text: "Advanced learner. Challenge yourself with hard difficulty." });
    } else if (level >= 3) {
      insights.push({ type: "info", text: "Good engagement. Try higher difficulty quizzes." });
    }

    const growthDrop = first - last;
    const stagnationIndex = 0.5 * Math.max(0, growthDrop) + 0.3 * (3 - Math.min(3, Math.abs(slope)));

    if (stagnationIndex > 3) {
      setStatus("High Stagnation Risk");
    } else if (stagnationIndex > 1.5) {
      setStatus("Moderate Risk");
    } else {
      setStatus("Stable Learning Growth");
    }

    setLocalInsights(insights);
  }, [displayAttempts, totalXP, level]);

  // ---------------- AI INSIGHTS ENGINE ----------------
  useEffect(() => {
    if (attempts.length < 1 || hasFetchedInsights.current) return;
    hasFetchedInsights.current = true;

    const fetchInsights = async () => {
      setInsightsLoading(true);

      const aggregatedTopics = {};
      attempts.forEach((a) => {
        if (!a.topics) return;
        Object.entries(a.topics).forEach(([topic, stats]) => {
          if (!aggregatedTopics[topic]) {
            aggregatedTopics[topic] = { correct: 0, total: 0 };
          }
          aggregatedTopics[topic].correct += stats.correct || 0;
          aggregatedTopics[topic].total += stats.total || 0;
        });
      });

      const latest = attempts[attempts.length - 1];
      const previous = attempts.slice(0, -1).slice(-5).map((a) => ({
        overallScore: a.accuracy || 0
      }));

      try {
        const res = await fetch("http://localhost:5000/analyze-performance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentQuiz: {
              overallScore: latest.accuracy || 0,
              difficulty: "medium",
              topics: aggregatedTopics
            },
            previousQuizzes: previous
          })
        });

        if (!res.ok) {
          throw new Error(`Backend server not available (${res.status})`);
        }

        const data = await res.json();
        setAiInsights(data);
      } catch (err) {
        console.log("AI insights unavailable - backend server not running");
        setAiInsights({ error: "Backend unavailable" });
      }
      setInsightsLoading(false);
    };

    fetchInsights();
  }, [attempts]);

  const getRiskBadgeClass = (statusText) => {
    if (!statusText) return "badge badge-green";
    const lower = statusText.toLowerCase();
    if (lower.includes("high")) return "badge badge-red";
    if (lower.includes("moderate")) return "badge badge-yellow";
    return "badge badge-green";
  };

  const xpForNextLevel = (level) * 200;
  const xpProgress = Math.min((totalXP / xpForNextLevel) * 100, 100);

  const velocityPercent = velocity !== null && velocity !== "N/A"
    ? Math.min(Math.max((parseFloat(velocity) + 5) * 10, 0), 100)
    : 0;

  /* ================================================================
     STYLES — inline objects for the upgraded UI
     ================================================================ */

  const pageStyle = {
    minHeight: "100vh",
  };

  const containerStyle = {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "32px 40px",
    animation: "dashboardFadeIn 0.5s ease both",
  };

  const welcomeRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "28px",
    flexWrap: "wrap",
    gap: "12px",
  };

  const xpCardStyle = {
    background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #3B82F6 100%)",
    color: "#fff",
    borderRadius: "16px",
    padding: "28px 32px",
    marginBottom: "24px",
    boxShadow: "0 10px 30px -5px rgba(79, 70, 229, 0.3)",
    animation: "dashboardSlideUp 0.5s ease both",
    animationDelay: "0.1s",
  };

  const quickActionsStyle = {
    display: "flex",
    gap: "12px",
    marginBottom: "28px",
    flexWrap: "wrap",
    animation: "dashboardSlideUp 0.5s ease both",
    animationDelay: "0.15s",
  };

  const actionBtnBase = {
    padding: "12px 24px",
    borderRadius: "10px",
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "14px",
    transition: "all 0.2s ease",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
  };

  const metricsGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
    animation: "dashboardSlideUp 0.5s ease both",
    animationDelay: "0.2s",
  };

  const metricCardStyle = {
    background: "var(--bg-glass)",
    backdropFilter: "blur(16px)",
    borderRadius: "16px",
    padding: "22px 24px",
    border: "1px solid var(--border-light)",
    boxShadow: "var(--shadow-soft)",
    transition: "var(--transition)",
    cursor: "default",
  };

  const metricLabelStyle = {
    fontSize: "12px",
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "6px",
  };

  const metricValueStyle = {
    fontSize: "28px",
    fontWeight: 700,
    color: "var(--text-primary)",
    margin: 0,
  };

  const cardStyle = {
    background: "var(--bg-glass)",
    backdropFilter: "blur(16px)",
    borderRadius: "16px",
    padding: "24px",
    border: "1px solid var(--border-light)",
    boxShadow: "var(--shadow-soft)",
    marginBottom: "24px",
  };


  const hoverLift = {
    onMouseEnter: (e) => {
      e.currentTarget.style.transform = "translateY(-4px) scale(1.02)";
      e.currentTarget.style.boxShadow = "var(--shadow-md)";
    },
    onMouseLeave: (e) => {
      e.currentTarget.style.transform = "translateY(0) scale(1)";
      e.currentTarget.style.boxShadow = "var(--shadow-soft)";
    },
  };

  /* ================================================================
     SKELETON LOADING STATE
     ================================================================ */

  if (loading) {
    return (
      <div style={pageStyle}>
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div style={containerStyle}>
          {/* Skeleton welcome header */}
          <div style={{ marginBottom: "28px" }}>
            <div className="skeleton" style={{ height: "28px", width: "220px", borderRadius: "8px", marginBottom: "10px" }} />
            <div className="skeleton" style={{ height: "16px", width: "340px", borderRadius: "6px" }} />
          </div>

          {/* Skeleton XP card */}
          <div className="skeleton" style={{ height: "130px", borderRadius: "16px", marginBottom: "24px" }} />

          {/* Skeleton quick actions */}
          <div style={{ display: "flex", gap: "12px", marginBottom: "28px" }}>
            <div className="skeleton" style={{ height: "44px", width: "140px", borderRadius: "10px" }} />
            <div className="skeleton" style={{ height: "44px", width: "160px", borderRadius: "10px" }} />
          </div>

          {/* Skeleton metrics grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ background: "#fff", borderRadius: "14px", padding: "22px", border: "1px solid #e5e7eb" }}>
                <div className="skeleton skeleton-line short" />
                <div className="skeleton skeleton-line medium" />
                <div className="skeleton skeleton-line" />
              </div>
            ))}
          </div>

          {/* Skeleton chart */}
          <div className="skeleton" style={{ height: "300px", borderRadius: "14px" }} />
        </div>
      </div>
    );
  }

  /* ================================================================
     COMPUTED VALUES FOR RENDER
     ================================================================ */
  const streakDays = getActivityDays(attempts);
  const { currentStreak } = computeStreak(streakDays);
  const streakExpiring = isStreakAboutToExpire(streakDays) && currentStreak > 0;

  /* ================================================================
     MAIN RENDER
     ================================================================ */
  return (
    <div style={pageStyle}>
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div style={containerStyle}>
        {/* ─── Welcome Header ─── */}
        <div style={welcomeRowStyle}>
          <div>
            <h1 style={{ fontSize: "26px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "4px" }}>
              Welcome back 👋
            </h1>
            <p style={{ fontSize: "15px", color: "var(--text-secondary)", margin: 0 }}>
              Track your learning progress with AI insights
            </p>
          </div>
          {currentStreak > 0 && (
            <span className="streak-badge">
              🔥 {currentStreak} day{currentStreak !== 1 ? "s" : ""} streak
            </span>
          )}
        </div>

        {/* ─── Level Progress Card ─── */}
        <div style={xpCardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
            <div>
              <h3 style={{ color: "#fff", fontSize: "22px", fontWeight: 700, margin: 0, marginBottom: "4px" }}>
                Level {level}
              </h3>
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "14px", margin: 0 }}>
                {totalXP} / {xpForNextLevel} XP to next level
              </p>
            </div>
            <div style={{
              background: "rgba(255,255,255,0.2)",
              borderRadius: "12px",
              padding: "10px 18px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: "24px", fontWeight: 700 }}>{totalXP}</div>
              <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.85 }}>Total XP</div>
            </div>
          </div>
          <div style={{
            width: "100%",
            height: "10px",
            background: "rgba(255,255,255,0.25)",
            borderRadius: "9999px",
            overflow: "hidden",
            marginTop: "16px",
          }}>
            <div style={{
              height: "100%",
              borderRadius: "9999px",
              background: "rgba(255,255,255,0.9)",
              width: `${xpProgress}%`,
              transition: "width 0.7s ease",
            }} />
          </div>
        </div>

        {/* ─── Streak Expiry Warning ─── */}
        {streakExpiring && (
          <div style={{
            ...cardStyle,
            borderLeft: "4px solid #f59e0b",
            background: "rgba(245,158,11,0.1)",
            padding: "14px 20px",
          }}>
            <p style={{ color: "#fbbf24", fontSize: "14px", margin: 0, fontWeight: 500 }}>
              ⚡ Take a quiz today to keep your streak alive.
            </p>
          </div>
        )}

        {/* ─── Quick Actions ─── */}
        <div style={quickActionsStyle}>
          <button
            style={{
              ...actionBtnBase,
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              color: "#fff",
              boxShadow: "0 4px 16px rgba(99,102,241,0.4)",
            }}
            onClick={() => navigate("/quiz")}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.05)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(99,102,241,0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(99,102,241,0.4)";
            }}
            onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.95)"; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1.05)"; }}
          >
            🚀 Start Quiz
          </button>
          <button
            style={{
              ...actionBtnBase,
              background: "rgba(255,255,255,0.08)",
              color: "#818cf8",
              border: "1.5px solid rgba(99,102,241,0.4)",
            }}
            onClick={() => navigate("/ai-tutor")}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.05)";
              e.currentTarget.style.background = "rgba(99,102,241,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.background = "rgba(255,255,255,0.08)";
            }}
            onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.95)"; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1.05)"; }}
          >
            🤖 AI Tutor
          </button>
        </div>

        {/* ─── Topic Filter ─── */}
        <div style={{ ...cardStyle, animation: "dashboardSlideUp 0.5s ease both", animationDelay: "0.18s" }}>
          <h3 style={{ marginBottom: "12px", fontSize: "16px", color: "#e2e8f0" }}>Filter by Topic</h3>
          <select
            style={{ maxWidth: "300px", background: "rgba(255,255,255,0.08)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", padding: "10px 14px", fontSize: "14px", outline: "none", width: "100%" }}
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
          >
            <option value="All" style={{ background: "#1e1b4b" }}>All Topics</option>
            {availableTopics.map((topic, index) => (
              <option key={index} value={topic} style={{ background: "#1e1b4b" }}>{topic}</option>
            ))}
          </select>
          <p style={{ marginTop: "12px", fontSize: "14px", color: "#64748b" }}>
            Total Attempts: {displayAttempts.length}
          </p>
        </div>

        {displayAttempts.length === 0 && selectedTopic !== "All" && (
          <div style={cardStyle}>
            <p style={{ color: "#64748b" }}>No attempts found for {selectedTopic}. Take a quiz on this topic to see analytics.</p>
          </div>
        )}

        {/* ─── Metrics Grid (3 cards) ─── */}
        {velocity !== null && (
          <>
            <div style={metricsGridStyle}>
              {/* Learning Velocity */}
              <div style={metricCardStyle} {...hoverLift}>
                <p style={metricLabelStyle}>Learning Velocity</p>
                <p style={metricValueStyle}>{velocity}</p>
                {velocity !== "N/A" && (
                  <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.08)", borderRadius: "9999px", overflow: "hidden", marginTop: "10px" }}>
                    <div style={{
                      height: "100%",
                      borderRadius: "9999px",
                      background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
                      width: `${velocityPercent}%`,
                      transition: "width 0.7s ease",
                    }} />
                  </div>
                )}
              </div>

              {/* Total Attempts */}
              <div style={metricCardStyle} {...hoverLift}>
                <p style={metricLabelStyle}>Total Attempts</p>
                <p style={metricValueStyle}>{displayAttempts.length}</p>
              </div>

              {/* Risk Status */}
              <div style={metricCardStyle} {...hoverLift}>
                <p style={metricLabelStyle}>Risk Status</p>
                <span className={getRiskBadgeClass(status)} style={{ marginTop: "4px", fontSize: "14px" }}>
                  {status || "N/A"}
                </span>
              </div>
            </div>

            {/* ─── AI Learning Insights ─── */}
            {localInsights.length > 0 && (
              <div style={{ ...cardStyle, animation: "dashboardSlideUp 0.5s ease both", animationDelay: "0.25s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                  <span style={{ fontSize: "18px" }}>💡</span>
                  <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>AI Learning Insights</h4>
                </div>
                <div className="insight-list">
                  {localInsights.map((ins, i) => (
                    <div key={i} className={`insight-item ${ins.type}`}>
                      {ins.text}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ─── AI Insights Loading Skeleton ─── */}
        {insightsLoading && (
          <div style={cardStyle}>
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line medium" />
            <div className="skeleton skeleton-line short" />
          </div>
        )}

        {aiInsights && aiInsights.error && (
          <div style={{
            ...cardStyle,
            borderLeft: "4px solid #f59e0b",
            background: "rgba(245,158,11,0.08)",
          }}>
            <h3 style={{ marginBottom: "8px", fontSize: "16px", color: "#fbbf24" }}>AI Performance Analysis</h3>
            <p style={{ color: "#94a3b8", fontSize: "14px" }}>
              AI insights are currently unavailable. The backend server is not running.
              You can still use all other features including local analytics and performance tracking.
            </p>
          </div>
        )}

        {/* ─── AI Insights Full ─── */}
        {aiInsights && !aiInsights.error && (
          <div style={{ animation: "dashboardSlideUp 0.5s ease both", animationDelay: "0.3s" }}>
            <h3 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "20px" }}>AI Performance Analysis</h3>

            <div style={cardStyle}>
              <h4 style={{ marginBottom: "8px", fontSize: "15px" }}>Summary</h4>
              <p>{aiInsights.performanceSummary}</p>
            </div>

            <div style={metricsGridStyle}>
              <div style={metricCardStyle} {...hoverLift}>
                <p style={metricLabelStyle}>AI Learning Velocity</p>
                <p style={{ fontWeight: 600, margin: 0 }}>{aiInsights.learningVelocity}</p>
              </div>
              <div style={metricCardStyle} {...hoverLift}>
                <p style={metricLabelStyle}>Trend</p>
                <p style={{ fontWeight: 600, margin: 0 }}>{aiInsights.trendAnalysis}</p>
              </div>
              <div style={metricCardStyle} {...hoverLift}>
                <p style={metricLabelStyle}>Risk Level</p>
                <span className={getRiskBadgeClass(aiInsights.riskLevel)}>
                  {aiInsights.riskLevel}
                </span>
              </div>
            </div>

            {aiInsights.weakTopics?.length > 0 && (
              <div style={cardStyle}>
                <h4 style={{ marginBottom: "10px", fontSize: "15px" }}>Weak Topics</h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                  {aiInsights.weakTopics.map((t, i) => (
                    <span key={i} className="pill-tag pill-tag-red">{t}</span>
                  ))}
                </div>
              </div>
            )}

            {aiInsights.moderateTopics?.length > 0 && (
              <div style={cardStyle}>
                <h4 style={{ marginBottom: "10px", fontSize: "15px" }}>Moderate Topics</h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                  {aiInsights.moderateTopics.map((t, i) => (
                    <span key={i} className="pill-tag pill-tag-indigo">{t}</span>
                  ))}
                </div>
              </div>
            )}

            {aiInsights.strongTopics?.length > 0 && (
              <div style={cardStyle}>
                <h4 style={{ marginBottom: "10px", fontSize: "15px" }}>Strong Topics</h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                  {aiInsights.strongTopics.map((t, i) => (
                    <span key={i} className="badge badge-green">{t}</span>
                  ))}
                </div>
              </div>
            )}

            <div style={cardStyle}>
              <h4 style={{ marginBottom: "8px", fontSize: "15px" }}>Recommended Difficulty</h4>
              <span className="badge badge-yellow">{aiInsights.recommendedDifficulty}</span>
            </div>

            {aiInsights.studyPlan && (
              <div style={cardStyle}>
                <StudyPlanWithLinks studyPlan={aiInsights.studyPlan} />
              </div>
            )}

            {aiInsights.improvementStrategies?.length > 0 && (
              <div style={cardStyle}>
                <h4 style={{ marginBottom: "10px", fontSize: "15px" }}>Improvement Strategies</h4>
                <ol style={{ paddingLeft: "20px", lineHeight: 1.8, color: "#374151" }}>
                  {aiInsights.improvementStrategies.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
              </div>
            )}

            {aiInsights.motivation && (
              <div style={{
                ...cardStyle,
                background: "rgba(99,102,241,0.1)",
                borderColor: "rgba(99,102,241,0.25)",
              }}>
                <h4 style={{ marginBottom: "8px", fontSize: "15px", color: "#818cf8" }}>💡 Motivation</h4>
                <p style={{ fontStyle: "italic", color: "#94a3b8" }}>{aiInsights.motivation}</p>
              </div>
            )}
          </div>
        )}

        {/* ─── Chart ─── */}
        {displayAttempts.length > 0 && (
          <div style={{
            ...cardStyle,
            animation: "dashboardSlideUp 0.5s ease both",
            animationDelay: "0.35s",
          }}>
            <h3 style={{ marginBottom: "16px", fontSize: "16px", color: "#e2e8f0", fontWeight: 700 }}>📈 Accuracy Trend</h3>
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <AreaChart data={displayAttempts}>
                  <defs>
                    <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="attempt" tick={{ fontSize: 13, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 13, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(15,12,41,0.95)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                      padding: "10px 14px",
                      color: "#f1f5f9",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="accuracy"
                    stroke="#6366f1"
                    strokeWidth={3}
                    fill="url(#colorAccuracy)"
                    animationDuration={800}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* ─── Suggestion Popup ─── */}
      {showPopup && suggestion && (
        <SuggestionPopup
          title={suggestion.title}
          message={suggestion.message}
          onClose={() => setShowPopup(false)}
        />
      )}
    </div>
  );
}

export default Dashboard;
