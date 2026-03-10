import { useState, useContext, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import questions from "../data/programmingQuestions";
import { addDoc, collection, serverTimestamp, query, where, orderBy, getDocs, limit, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { AuthContext } from "../context/AuthContext";
import { shuffleArray, getStaticQuestionId, withShuffledOptions } from "../utils/quizUtils";
import { calculateXpForAttempt } from "../utils/xpUtils";
import { getActivityDays, computeStreak } from "../utils/streakUtils";
import StudyPlanWithLinks from "../components/StudyPlanWithLinks";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

const TOPICS = [
  { value: "Data Structures", icon: "🌲", desc: "Arrays, Trees, Graphs, Heaps" },
  { value: "OOPS", icon: "🧱", desc: "Classes, Inheritance, Polymorphism" },
  { value: "Python", icon: "🐍", desc: "Syntax, Libraries, Best Practices" },
  { value: "Machine Learning", icon: "🤖", desc: "Algorithms, Models, Evaluation" },
  { value: "DBMS", icon: "🗄️", desc: "SQL, Normalization, Transactions" },
  { value: "Operating Systems", icon: "💻", desc: "Processes, Memory, Scheduling" },
  { value: "All Topics", icon: "🎯", desc: "Mixed questions across all topics" },
  { value: "Custom", icon: "📁", desc: "Upload your own syllabus file" },
];

const DIFFICULTIES = [
  { value: "All", label: "All", color: "#818cf8" },
  { value: "easy", label: "Easy", color: "#10b981" },
  { value: "medium", label: "Medium", color: "#f59e0b" },
  { value: "hard", label: "Hard", color: "#ef4444" },
];

const glass = {
  background: "var(--bg-glass)",
  backdropFilter: "blur(24px)",
  border: "1px solid var(--border-light)",
  borderRadius: "20px",
  boxShadow: "var(--shadow-md)",
};

function TakeQuiz() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [selectedTopic, setSelectedTopic] = useState("");
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [quizStarted, setQuizStarted] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState("All");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [topicStats, setTopicStats] = useState({});
  const [userAnswers, setUserAnswers] = useState([]);
  const [selectedConfidence, setSelectedConfidence] = useState(null);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [quizDate, setQuizDate] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [difficulty, setDifficulty] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const hasAnalyzed = useRef(false);
  const [explanations, setExplanations] = useState(null);
  const [explainingWrong, setExplainingWrong] = useState(false);
  const [lastEarnedXp, setLastEarnedXp] = useState(null);
  const [currentStreakValue, setCurrentStreakValue] = useState(null);
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    if (!quizStarted) return;
    setQuestionStartTime(new Date());
  }, [quizStarted, currentQuestion]);

  const startQuiz = async () => {
    if (!selectedTopic) return;
    const topicVal = selectedTopic === "All Topics" ? "All" : selectedTopic;
    let filteredPool = questions.filter((q) =>
      (topicVal === "All" || q.topic === topicVal) &&
      (selectedDifficulty === "All" || q.difficulty === selectedDifficulty)
    );
    if (filteredPool.length === 0) { alert("No questions available for this combination."); return; }
    filteredPool = filteredPool.map((q) => ({ ...q, id: getStaticQuestionId(q) }));

    let quizQuestions;
    if (!user?.uid) {
      quizQuestions = shuffleArray(filteredPool).slice(0, 10);
    } else {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};
      const usedStaticQuestionIds = userData.usedStaticQuestionIds || {};
      const poolKey = `${topicVal}|${selectedDifficulty}`;
      const usedForKey = new Set(usedStaticQuestionIds[poolKey] || []);
      const unusedPool = filteredPool.filter((q) => !usedForKey.has(q.id));
      quizQuestions = [];
      quizQuestions.push(...shuffleArray(unusedPool).slice(0, 10));
      if (quizQuestions.length < 10) {
        const alreadyIds = new Set(quizQuestions.map((q) => q.id));
        quizQuestions.push(...shuffleArray(filteredPool).filter((q) => !alreadyIds.has(q.id)).slice(0, 10 - quizQuestions.length));
      }
      const uniqueById = [];
      const seen = new Set();
      for (const q of quizQuestions) {
        if (!q?.id || seen.has(q.id)) continue;
        uniqueById.push(q);
        seen.add(q.id);
        if (uniqueById.length === 10) break;
      }
      quizQuestions = uniqueById;
      const updatedIdsForKey = Array.from(new Set([...usedForKey, ...quizQuestions.map((q) => q.id)]));
      await setDoc(userRef, { usedStaticQuestionIds: { ...usedStaticQuestionIds, [poolKey]: updatedIdsForKey } }, { merge: true });
    }
    const quizOfTen = withShuffledOptions(quizQuestions).slice(0, 10);
    setFilteredQuestions(quizOfTen);
    setStartTime(new Date());
    setQuizDate(new Date());
    setQuizStarted(true);
  };

  const generateQuiz = async () => {
    if (!uploadedFile || !difficulty) { alert("Upload file and select difficulty"); return; }
    const formData = new FormData();
    formData.append("file", uploadedFile);
    formData.append("difficulty", difficulty);
    const response = await fetch("http://localhost:5000/generate-quiz", { method: "POST", body: formData });
    const data = await response.json();
    const limited = Array.isArray(data) ? data.slice(0, 10) : [];
    setFilteredQuestions(withShuffledOptions(limited));
    setStartTime(new Date());
    setQuizDate(new Date());
    setQuizStarted(true);
  };

  const handleNext = () => {
    if (!selectedAnswer) return;
    const current = filteredQuestions[currentQuestion];
    const isCorrect = selectedAnswer === current.correctAnswer;
    const now = new Date();
    const responseTimeMs = questionStartTime ? now - questionStartTime : null;
    if (isCorrect) setScore((prev) => prev + 1);
    setUserAnswers((prev) => [...prev, { question: current.question, userAnswer: selectedAnswer, correctAnswer: current.correctAnswer, isCorrect, confidence: selectedConfidence || "Medium", responseTimeMs }]);
    setTopicStats((prev) => {
      const topic = current.topic || "Custom";
      const prevTopic = prev[topic] || { correct: 0, total: 0 };
      return { ...prev, [topic]: { correct: prevTopic.correct + (isCorrect ? 1 : 0), total: prevTopic.total + 1 } };
    });
    setSelectedAnswer(null);
    setSelectedConfidence(null);
    if (currentQuestion + 1 < filteredQuestions.length) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      setQuizFinished(true);
    }
  };

  useEffect(() => {
    if (!quizFinished || hasAnalyzed.current) return;
    hasAnalyzed.current = true;
    setEndTime(new Date());
    const saveAndAnalyze = async () => {
      if (!user?.uid) return;
      const total = filteredQuestions.length;
      const accuracy = total > 0 ? (score / total) * 100 : 0;
      const quizDifficulty = selectedDifficulty !== "All" ? selectedDifficulty : difficulty || "medium";
      let previousAccuracy = null;
      try {
        const prevQ = query(collection(db, "quizAttempts"), where("userId", "==", user.uid), orderBy("createdAt", "desc"), limit(1));
        const prevSnap = await getDocs(prevQ);
        if (prevSnap.docs.length > 0) {
          const d = prevSnap.docs[0].data();
          previousAccuracy = typeof d.accuracy === "number" ? d.accuracy : (d.score && d.total ? (d.score / d.total) * 100 : null);
        }
      } catch (_) { }
      const { xp: xpEarned } = calculateXpForAttempt(score, total, quizDifficulty, topicStats, previousAccuracy);
      setLastEarnedXp(xpEarned);
      await addDoc(collection(db, "quizAttempts"), { userId: user.uid, score, total, accuracy, topics: topicStats, xp: xpEarned, difficulty: quizDifficulty, createdAt: serverTimestamp(), userAnswers });
      try {
        const allQ = query(collection(db, "quizAttempts"), where("userId", "==", user.uid), orderBy("createdAt", "asc"));
        const allSnap = await getDocs(allQ);
        const allAttempts = allSnap.docs.map((d) => ({ createdAt: d.data().createdAt }));
        const activityDays = getActivityDays(allAttempts);
        const { currentStreak, lastActivityDateKey } = computeStreak(activityDays);
        setCurrentStreakValue(currentStreak);
        await setDoc(doc(db, "users", user.uid), { currentStreak, lastActivityDateKey: lastActivityDateKey ?? null }, { merge: true });
      } catch (e) { console.error("Streak update error:", e); }
      let previousQuizzes = [];
      try {
        const q = query(collection(db, "quizAttempts"), where("userId", "==", user.uid), orderBy("createdAt", "desc"), limit(4));
        const snapshot = await getDocs(q);
        previousQuizzes = snapshot.docs.slice(1, 4).map((doc) => ({ overallScore: doc.data().accuracy || 0 }));
      } catch (err) { }
      setAnalyzing(true);
      try {
        const res = await fetch("http://localhost:5000/analyze-performance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentQuiz: { overallScore: accuracy, difficulty: quizDifficulty, topics: topicStats }, previousQuizzes }) });
        setAnalysis(await res.json());
      } catch (err) { console.error("Analysis error:", err); }
      setAnalyzing(false);
    };
    saveAndAnalyze();
  }, [quizFinished]);

  useEffect(() => {
    if (!quizFinished || userAnswers.length === 0) return;
    const wrongOnes = userAnswers.filter((a) => !a.isCorrect);
    if (wrongOnes.length === 0) return;
    const fetchExplanations = async () => {
      setExplainingWrong(true);
      try {
        const res = await fetch("http://localhost:5000/explain-wrong", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wrongAnswers: wrongOnes }) });
        const data = await res.json();
        setExplanations(data.explanations || []);
      } catch (err) { console.error("Explanation error:", err); }
      setExplainingWrong(false);
    };
    fetchExplanations();
  }, [quizFinished, userAnswers]);

  /* ═══════════════════════════════════════════
     RESULTS SCREEN
  ═══════════════════════════════════════════ */
  if (quizFinished) {
    const wrongAnswers = userAnswers.filter((a) => !a.isCorrect);
    const correctAnswers = userAnswers.filter((a) => a.isCorrect);
    const timeTaken = endTime && startTime ? Math.floor((endTime - startTime) / 1000) : 0;
    const mins = Math.floor(timeTaken / 60);
    const secs = (timeTaken % 60).toString().padStart(2, "0");
    const accuracy = filteredQuestions.length > 0 ? Math.round((score / filteredQuestions.length) * 100) : 0;
    const accColor = accuracy >= 75 ? "#10b981" : accuracy >= 50 ? "#f59e0b" : "#ef4444";
    const accEmoji = accuracy >= 75 ? "🎉" : accuracy >= 50 ? "💪" : "📖";

    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-app)" }}>
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div style={{ maxWidth: "860px", margin: "0 auto", padding: "32px 20px" }}>

          {/* Score Hero */}
          <div style={{ ...glass, padding: "36px", marginBottom: "20px", textAlign: "center", background: `linear-gradient(135deg, ${accColor}18, var(--bg-primary))`, borderColor: `${accColor}30` }}>
            <div style={{ fontSize: "3.5rem", marginBottom: "8px" }}>{accEmoji}</div>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 6px" }}>Quiz Complete!</h1>
            <div style={{ display: "flex", justifyContent: "center", gap: "32px", marginTop: "24px", flexWrap: "wrap" }}>
              {[
                { label: "Score", value: `${score}/${filteredQuestions.length}`, color: accColor },
                { label: "Accuracy", value: `${accuracy}%`, color: accColor },
                { label: "XP Earned", value: lastEarnedXp != null ? `⚡ ${lastEarnedXp}` : "—", color: "#f59e0b" },
                { label: "Time", value: `${mins}:${secs}`, color: "var(--brand-primary)" },
                { label: "Streak", value: currentStreakValue != null ? `🔥 ${currentStreakValue}d` : "—", color: "#fb923c" },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "1.7rem", fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "2px" }}>{s.label}</div>
                </div>
              ))}
            </div>
            {/* Accuracy bar */}
            <div style={{ background: "var(--bg-secondary)", borderRadius: "999px", height: "10px", overflow: "hidden", marginTop: "24px" }}>
              <div style={{ width: `${accuracy}%`, height: "100%", background: `linear-gradient(90deg, ${accColor}, ${accColor}88)`, borderRadius: "999px", transition: "width 1.2s ease" }} />
            </div>
          </div>

          {/* Topic breakdown */}
          {Object.keys(topicStats).length > 0 && (
            <div style={{ ...glass, padding: "24px", marginBottom: "20px" }}>
              <h3 style={{ color: "var(--text-primary)", fontWeight: 700, marginBottom: "16px" }}>📊 Topic Breakdown</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {Object.entries(topicStats).map(([topic, stats]) => {
                  const pct = Math.round((stats.correct / stats.total) * 100);
                  const c = pct >= 75 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";
                  return (
                    <div key={topic}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ color: "var(--text-secondary)", fontSize: "14px" }}>{topic}</span>
                        <span style={{ color: c, fontWeight: 700, fontSize: "14px" }}>{stats.correct}/{stats.total} ({pct}%)</span>
                      </div>
                      <div style={{ background: "var(--bg-secondary)", borderRadius: "999px", height: "6px", overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: c, borderRadius: "999px", transition: "width 0.8s ease" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Analysis */}
          {analyzing && (
            <div style={{ ...glass, padding: "24px", marginBottom: "20px", textAlign: "center" }}>
              <div style={{ fontSize: "1.5rem", marginBottom: "8px" }}>🤖</div>
              <p style={{ color: "var(--text-secondary)" }}>Analyzing your performance with AI...</p>
            </div>
          )}
          {analysis && !analysis.error && (
            <div style={{ ...glass, padding: "24px", marginBottom: "20px" }}>
              <h3 style={{ color: "var(--text-primary)", fontWeight: 700, marginBottom: "16px" }}>🤖 AI Performance Analysis</h3>
              {analysis.performanceSummary && <p style={{ color: "var(--text-secondary)", marginBottom: "16px", lineHeight: 1.65 }}>{analysis.performanceSummary}</p>}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "12px", marginBottom: "16px" }}>
                {[
                  { label: "Trend", value: analysis.trendAnalysis, icon: "📈" },
                  { label: "Velocity", value: analysis.learningVelocity, icon: "⚡" },
                  { label: "Risk", value: analysis.riskLevel, icon: "🛡️" },
                  { label: "Recommended", value: analysis.recommendedDifficulty, icon: "🎯" },
                ].map(m => m.value ? (
                  <div key={m.label} style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-light)", borderRadius: "14px", padding: "14px" }}>
                    <div style={{ fontSize: "18px", marginBottom: "4px" }}>{m.icon}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{m.label}</div>
                    <div style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "14px", marginTop: "2px" }}>{m.value}</div>
                  </div>
                ) : null)}
              </div>
              {analysis.weakTopics?.length > 0 && (
                <div style={{ marginBottom: "12px" }}>
                  <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 600 }}>Weak topics: </span>
                  {analysis.weakTopics.map((t, i) => (
                    <span key={i} style={{ fontSize: "12px", padding: "3px 10px", borderRadius: "20px", background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)", marginRight: "6px", marginBottom: "4px", display: "inline-block", fontWeight: 600 }}>{t}</span>
                  ))}
                </div>
              )}
              {analysis.strongTopics?.length > 0 && (
                <div style={{ marginBottom: "12px" }}>
                  <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 600 }}>Strong topics: </span>
                  {analysis.strongTopics.map((t, i) => (
                    <span key={i} style={{ fontSize: "12px", padding: "3px 10px", borderRadius: "20px", background: "rgba(16,185,129,0.12)", color: "#34d399", border: "1px solid rgba(16,185,129,0.2)", marginRight: "6px", marginBottom: "4px", display: "inline-block", fontWeight: 600 }}>{t}</span>
                  ))}
                </div>
              )}
              {analysis.motivation && (
                <div style={{ background: "var(--brand-light)", border: "1px solid var(--border-accent)", borderRadius: "14px", padding: "14px", marginTop: "8px" }}>
                  <p style={{ color: "var(--brand-accent)", fontStyle: "italic", margin: 0, lineHeight: 1.6 }}>💡 {analysis.motivation}</p>
                </div>
              )}
              {analysis.studyPlan && <div style={{ marginTop: "12px" }}><StudyPlanWithLinks studyPlan={analysis.studyPlan} /></div>}
            </div>
          )}

          {/* Answer Review toggle */}
          <div style={{ ...glass, padding: "24px", marginBottom: "20px" }}>
            <button
              onClick={() => setShowReview(!showReview)}
              style={{ width: "100%", background: "none", border: "none", cursor: "pointer", color: "var(--text-primary)", fontSize: "16px", fontWeight: 700, textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <span>📋 Answer Review ({userAnswers.length} questions)</span>
              <span style={{ color: "var(--text-secondary)" }}>{showReview ? "▲ Hide" : "▼ Show"}</span>
            </button>
            {showReview && (
              <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                {userAnswers.map((a, i) => {
                  const wrongIdx = userAnswers.filter((x, xi) => !x.isCorrect && xi <= i).length - 1;
                  const explanation = !a.isCorrect && explanations ? explanations[wrongIdx] : null;
                  return (
                    <div key={i} style={{
                      padding: "16px", borderRadius: "14px",
                      background: a.isCorrect ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)",
                      border: `1px solid ${a.isCorrect ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
                    }}>
                      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                        <span style={{ fontSize: "18px", flexShrink: 0 }}>{a.isCorrect ? "✅" : "❌"}</span>
                        <div style={{ flex: 1 }}>
                          <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "14px", marginBottom: "6px" }}>{a.question}</p>
                          <p style={{ color: a.isCorrect ? "#34d399" : "#f87171", fontSize: "13px", margin: 0 }}>Your answer: {a.userAnswer}</p>
                          {!a.isCorrect && <p style={{ color: "#34d399", fontSize: "13px", margin: "3px 0 0" }}>Correct: {a.correctAnswer}</p>}
                          {explanation && (
                            <div style={{ marginTop: "8px", padding: "10px 12px", background: "var(--brand-light)", borderRadius: "10px", border: "1px solid var(--border-accent)" }}>
                              <p style={{ color: "var(--brand-accent)", fontSize: "13px", margin: 0, lineHeight: 1.6 }}>💡 {explanation}</p>
                            </div>
                          )}
                          {explainingWrong && !a.isCorrect && !explanation && (
                            <p style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "6px" }}>Loading explanation...</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              onClick={() => navigate("/dashboard")}
              style={{ flex: 1, minWidth: "140px", padding: "14px 24px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "none", borderRadius: "14px", cursor: "pointer", fontWeight: 700, fontSize: "15px", boxShadow: "0 4px 16px rgba(99,102,241,0.4)" }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
            >🏠 Go to Dashboard</button>
            <button
              onClick={() => window.location.reload()}
              style={{ flex: 1, minWidth: "140px", padding: "14px 24px", background: "var(--bg-secondary)", color: "var(--brand-primary)", border: "1px solid var(--border-light)", borderRadius: "14px", cursor: "pointer", fontWeight: 700, fontSize: "15px" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--bg-glass-hover)"}
              onMouseLeave={e => e.currentTarget.style.background = "var(--bg-secondary)"}
            >🔁 Try Again</button>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     TOPIC SELECTION SCREEN
  ═══════════════════════════════════════════ */
  if (!quizStarted) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-app)" }}>
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 20px" }}>
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
          <div style={{ marginBottom: "28px" }}>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 6px" }}>📝 Take a Quiz</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Choose a topic and difficulty to start a 10-question quiz</p>
          </div>

          {/* Topic Grid */}
          <div style={{ ...glass, padding: "24px", marginBottom: "20px" }}>
            <h3 style={{ color: "var(--text-primary)", fontWeight: 700, marginBottom: "16px", fontSize: "15px" }}>Select Topic</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: "12px" }}>
              {TOPICS.map(({ value, icon, desc }) => {
                const isSelected = selectedTopic === value;
                return (
                  <div
                    key={value}
                    onClick={() => setSelectedTopic(value)}
                    style={{
                      padding: "16px", borderRadius: "14px", cursor: "pointer",
                      background: isSelected ? "linear-gradient(135deg,rgba(99,102,241,0.25),rgba(139,92,246,0.15))" : "var(--bg-secondary)",
                      border: isSelected ? "1px solid var(--brand-primary)" : "1px solid var(--border-light)",
                      transition: "all 0.2s",
                      boxShadow: isSelected ? "0 0 20px rgba(99,102,241,0.2)" : "none",
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "var(--bg-glass-hover)"; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "var(--bg-secondary)"; }}
                  >
                    <div style={{ fontSize: "24px", marginBottom: "6px" }}>{icon}</div>
                    <div style={{ color: isSelected ? "var(--brand-primary)" : "var(--text-primary)", fontWeight: 700, fontSize: "14px", marginBottom: "3px" }}>{value}</div>
                    <div style={{ color: "var(--text-secondary)", fontSize: "12px", lineHeight: 1.4 }}>{desc}</div>
                    {isSelected && <div style={{ marginTop: "8px", fontSize: "11px", color: "var(--brand-primary)", fontWeight: 700 }}>✓ Selected</div>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Difficulty */}
          <div style={{ ...glass, padding: "24px", marginBottom: "20px" }}>
            <h3 style={{ color: "var(--text-primary)", fontWeight: 700, marginBottom: "14px", fontSize: "15px" }}>Select Difficulty</h3>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {DIFFICULTIES.map(({ value, label, color }) => {
                const diffVal = selectedTopic === "Custom" ? difficulty : selectedDifficulty;
                const isSelected = diffVal === value;
                return (
                  <button
                    key={value}
                    onClick={() => selectedTopic === "Custom" ? setDifficulty(value) : setSelectedDifficulty(value)}
                    style={{
                      padding: "10px 22px", borderRadius: "12px", cursor: "pointer", fontWeight: 700, fontSize: "14px", transition: "all 0.2s",
                      background: isSelected ? `${color}22` : "var(--bg-secondary)",
                      border: isSelected ? `1.5px solid ${color}66` : "1.5px solid var(--border-light)",
                      color: isSelected ? color : "var(--text-secondary)",
                      boxShadow: isSelected ? `0 0 16px ${color}33` : "none",
                    }}
                  >{label}</button>
                );
              })}
            </div>
          </div>

          {/* Custom file upload */}
          {selectedTopic === "Custom" && (
            <div style={{ ...glass, padding: "24px", marginBottom: "20px" }}>
              <h3 style={{ color: "var(--text-primary)", fontWeight: 700, marginBottom: "12px", fontSize: "15px" }}>📁 Upload Syllabus File</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginBottom: "14px" }}>Upload a .txt or .pdf file to generate custom questions from your content.</p>
              <label style={{
                display: "inline-block", padding: "12px 24px",
                background: "var(--brand-light)", color: "var(--brand-primary)",
                border: "1.5px dashed var(--brand-primary)", borderRadius: "12px",
                cursor: "pointer", fontWeight: 600, fontSize: "14px", transition: "all 0.2s",
              }}>
                {uploadedFile ? `✅ ${uploadedFile.name}` : "Choose File"}
                <input type="file" accept=".txt,.pdf" style={{ display: "none" }} onChange={(e) => setUploadedFile(e.target.files[0])} />
              </label>
            </div>
          )}

          {/* Start button */}
          <button
            onClick={selectedTopic === "Custom" ? generateQuiz : startQuiz}
            disabled={!selectedTopic || (selectedTopic === "Custom" && (!uploadedFile || !difficulty))}
            style={{
              width: "100%", padding: "16px", borderRadius: "16px", border: "none", cursor: selectedTopic ? "pointer" : "not-allowed",
              background: selectedTopic ? "linear-gradient(135deg,var(--brand-primary),var(--brand-accent))" : "var(--bg-secondary)",
              color: selectedTopic ? "#fff" : "var(--text-muted)",
              fontWeight: 800, fontSize: "16px", letterSpacing: "0.01em",
              boxShadow: selectedTopic ? "var(--shadow-glow)" : "none",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => { if (selectedTopic) e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
          >
            {selectedTopic === "Custom" ? "✨ Generate AI Quiz" : selectedTopic ? `🚀 Start ${selectedTopic} Quiz` : "Select a topic to begin"}
          </button>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     ACTIVE QUIZ SCREEN
  ═══════════════════════════════════════════ */
  const q = filteredQuestions[currentQuestion];
  const progress = ((currentQuestion) / filteredQuestions.length) * 100;
  const optionLetters = ["A", "B", "C", "D"];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-app)" }}>
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "32px 20px" }}>

        {/* Progress header */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <span style={{ color: "var(--text-secondary)", fontSize: "13px", fontWeight: 600 }}>
              Question {currentQuestion + 1} of {filteredQuestions.length}
            </span>
            <span style={{ color: "var(--brand-primary)", fontSize: "13px", fontWeight: 700 }}>
              ✓ {score} correct
            </span>
          </div>
          <div style={{ background: "var(--bg-secondary)", borderRadius: "999px", height: "8px", overflow: "hidden" }}>
            <div style={{
              width: `${progress}%`, height: "100%",
              background: "linear-gradient(90deg,var(--brand-primary),var(--brand-second))",
              borderRadius: "999px", transition: "width 0.5s ease",
            }} />
          </div>
          {/* step dots */}
          <div style={{ display: "flex", gap: "4px", marginTop: "8px", justifyContent: "center", flexWrap: "wrap" }}>
            {filteredQuestions.map((_, i) => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: "50%",
                background: i < currentQuestion ? "var(--brand-primary)" : i === currentQuestion ? "var(--brand-accent)" : "var(--bg-secondary)",
                transition: "background 0.3s",
              }} />
            ))}
          </div>
        </div>

        {/* Question card */}
        <div style={{ ...glass, padding: "32px", marginBottom: "16px" }}>
          {q?.difficulty && (
            <span style={{
              fontSize: "12px", fontWeight: 700, padding: "3px 12px", borderRadius: "999px", marginBottom: "16px", display: "inline-block",
              background: q.difficulty === "easy" ? "rgba(16,185,129,0.12)" : q.difficulty === "hard" ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)",
              color: q.difficulty === "easy" ? "#34d399" : q.difficulty === "hard" ? "#f87171" : "#fbbf24",
              border: `1px solid ${q.difficulty === "easy" ? "#34d39944" : q.difficulty === "hard" ? "#f8717144" : "#fbbf2444"}`,
            }}>{q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)}</span>
          )}
          <h2 style={{ color: "var(--text-primary)", fontSize: "1.15rem", fontWeight: 700, lineHeight: 1.6, margin: 0 }}>
            {q?.question}
          </h2>
        </div>

        {/* Options */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
          {q?.options?.map((option, index) => {
            const isSelected = selectedAnswer === option;
            return (
              <div
                key={index}
                onClick={() => setSelectedAnswer(option)}
                style={{
                  display: "flex", alignItems: "center", gap: "14px",
                  padding: "16px 20px", borderRadius: "14px", cursor: "pointer",
                  background: isSelected ? "var(--brand-light)" : "var(--bg-secondary)",
                  border: isSelected ? "1.5px solid var(--brand-primary)" : "1.5px solid var(--border-light)",
                  boxShadow: isSelected ? "var(--shadow-glow)" : "none",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.background = "var(--bg-glass-hover)"; e.currentTarget.style.borderColor = "var(--border-light)"; } }}
                onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.background = "var(--bg-secondary)"; e.currentTarget.style.borderColor = "var(--border-light)"; } }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  background: isSelected ? "linear-gradient(135deg,var(--brand-primary),var(--brand-accent))" : "var(--bg-primary)",
                  color: isSelected ? "#fff" : "var(--text-secondary)",
                  fontWeight: 800, fontSize: "13px", flexShrink: 0,
                  border: isSelected ? "none" : "1px solid var(--border-light)",
                }}>{optionLetters[index]}</div>
                <span style={{ color: isSelected ? "var(--text-primary)" : "var(--text-secondary)", fontSize: "14px", fontWeight: isSelected ? 600 : 400, lineHeight: 1.5 }}>{option}</span>
              </div>
            );
          })}
        </div>

        {/* Confidence (optional) */}
        <div style={{ ...glass, padding: "14px 20px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span style={{ color: "var(--text-secondary)", fontSize: "13px", fontWeight: 600 }}>Confidence:</span>
          {["Low", "Medium", "High"].map(c => (
            <button
              key={c}
              onClick={() => setSelectedConfidence(c)}
              style={{
                padding: "5px 14px", borderRadius: "999px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 600,
                background: selectedConfidence === c ? "var(--brand-light)" : "var(--bg-primary)",
                color: selectedConfidence === c ? "var(--brand-primary)" : "var(--text-muted)",
                border: selectedConfidence === c ? "1px solid var(--brand-primary)" : "1px solid var(--border-light)",
              }}
            >{c}</button>
          ))}
        </div>

        {/* Next button */}
        <button
          onClick={handleNext}
          disabled={!selectedAnswer}
          style={{
            width: "100%", padding: "15px", borderRadius: "14px", border: "none",
            cursor: selectedAnswer ? "pointer" : "not-allowed",
            background: selectedAnswer ? "linear-gradient(135deg,var(--brand-primary),var(--brand-accent))" : "var(--bg-secondary)",
            color: selectedAnswer ? "#fff" : "var(--text-muted)",
            fontWeight: 800, fontSize: "15px",
            boxShadow: selectedAnswer ? "var(--shadow-glow)" : "none",
            transition: "all 0.2s",
          }}
          onMouseEnter={e => { if (selectedAnswer) e.currentTarget.style.transform = "translateY(-2px)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
        >
          {currentQuestion + 1 === filteredQuestions.length ? "🏁 Finish Quiz" : "Next Question →"}
        </button>
      </div>
    </div>
  );
}

export default TakeQuiz;