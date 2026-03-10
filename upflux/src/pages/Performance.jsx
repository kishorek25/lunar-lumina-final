import { useState, useEffect, useContext } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../services/firebase";
import { AuthContext } from "../context/AuthContext";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell
} from "recharts";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

// Custom Tooltip for Area chart
const CustomLineTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-glass-solid)',
      border: '1px solid var(--brand-primary)',
      borderRadius: '12px', padding: '12px 18px',
      boxShadow: 'var(--shadow-md)',
      color: 'var(--text-primary)', fontSize: '14px',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--brand-accent)' }}>Attempt {label}</div>
      <div>🎯 Accuracy: <strong>{payload[0]?.value}%</strong></div>
      {payload[1] && <div>⭐ Score: <strong>{payload[1]?.value}</strong></div>}
    </div>
  );
};

// Custom Tooltip for Bar chart
const CustomBarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const val = parseFloat(payload[0]?.value);
  const color = val >= 75 ? '#10b981' : val >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{
      background: 'var(--bg-glass-solid)',
      border: `1px solid ${color}`,
      borderRadius: '12px', padding: '12px 18px',
      boxShadow: 'var(--shadow-soft)',
      color: 'var(--text-primary)', fontSize: '13px', minWidth: '140px',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text-secondary)', fontSize: '12px' }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: 800, color }}>{val}%</div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>Topic Accuracy</div>
    </div>
  );
};

// Custom animated dot
const CustomDot = ({ cx, cy, value }) => (
  <g>
    <circle cx={cx} cy={cy} r={5} fill="#6366f1" stroke="#fff" strokeWidth={2}
      style={{ filter: 'drop-shadow(0 0 6px #6366f1)' }} />
    <circle cx={cx} cy={cy} r={10} fill="#6366f120" />
  </g>
);




function Performance() {

  const { user } = useContext(AuthContext);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [attempts, setAttempts] = useState([]);

  const [loading, setLoading] = useState(true);

  const [aiStudyPlan, setAiStudyPlan] = useState([]);

  const [aiLoading, setAiLoading] = useState(false);

  const [aiError, setAiError] = useState("");



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

          score: doc.data().score || 0,

          total: doc.data().total || 0,

          xp: doc.data().xp || 0,

          topics: doc.data().topics || {},

          date: doc.data().createdAt?.toDate()?.toLocaleDateString() || `Attempt ${index + 1}`,

          ...doc.data()

        }));



        setAttempts(data);

        setLoading(false);

      } catch (err) {

        console.error("Error fetching attempts:", err);

        setLoading(false);

      }

    };



    fetchAttempts();

  }, [user]);



  // Calculate topic-wise performance

  const topicPerformance = attempts.reduce((acc, attempt) => {

    if (attempt.topics) {

      Object.entries(attempt.topics).forEach(([topic, stats]) => {

        if (!acc[topic]) {

          acc[topic] = { correct: 0, total: 0, attempts: 0 };

        }

        acc[topic].correct += stats.correct || 0;

        acc[topic].total += stats.total || 0;

        acc[topic].attempts += 1;

      });

    }

    return acc;

  }, {});



  const topicData = Object.entries(topicPerformance).map(([topic, stats]) => ({

    topic,

    accuracy: ((stats.correct / stats.total) * 100).toFixed(1),

    totalQuestions: stats.total,

    attempts: stats.attempts

  })).sort((a, b) => b.accuracy - a.accuracy);



  const weakTopics = topicData.filter((t) => parseFloat(t.accuracy) < 70);

  // Fetch AI study plan whenever weakTopics changes

  useEffect(() => {

    if (weakTopics.length === 0) { setAiStudyPlan([]); return; }

    const topicNames = weakTopics.map((t) => t.topic);

    setAiLoading(true);

    setAiError("");

    fetch(`${BACKEND_URL}/suggest-study-plan`, {

      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({ weakTopics: topicNames }),

    })

      .then((r) => r.json())

      .then((data) => {

        if (Array.isArray(data)) setAiStudyPlan(data);

        else setAiError("Could not load AI suggestions.");

      })

      .catch(() => setAiError("Failed to connect to AI service."))

      .finally(() => setAiLoading(false));

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, [attempts]);



  if (loading) {

    return (

      <div style={{ minHeight: '100vh' }}>

        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div style={{ padding: "40px" }}>

          <h2>Loading performance data...</h2>

        </div>

      </div>

    );

  }



  const containerStyle = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
  };

  const contentStyle = {
    padding: '40px',
    maxWidth: '1200px',
    margin: '0 auto',
  };

  const cardStyle = {
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.1)',
    padding: '30px',
    borderRadius: '20px',
    boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
    marginBottom: '30px',
  };

  const statsGrid = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '30px',
  };

  const totalXP = attempts.reduce((sum, attempt) => sum + (attempt.xp || 0), 0);
  const avgAccuracy = attempts.length > 0
    ? (attempts.reduce((sum, attempt) => sum + attempt.accuracy, 0) / attempts.length).toFixed(1)
    : 0;

  const statCards = [
    { label: 'Total Attempts', value: attempts.length, icon: '🎯', gradient: 'linear-gradient(135deg,#667eea,#764ba2)', glow: '#667eea' },
    { label: 'Avg Accuracy', value: `${avgAccuracy}%`, icon: '📊', gradient: 'linear-gradient(135deg,#11998e,#38ef7d)', glow: '#11998e' },
    { label: 'Total XP', value: totalXP, icon: '⚡', gradient: 'linear-gradient(135deg,#f7971e,#ffd200)', glow: '#f7971e' },
    { label: 'Topics Covered', value: topicData.length, icon: '📚', gradient: 'linear-gradient(135deg,#ee0979,#ff6a00)', glow: '#ee0979' },
  ];

  const BAR_COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
    '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
    '#f97316', '#a855f7', '#06b6d4', '#84cc16',
  ];






  return (
    <div style={containerStyle}>
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div style={contentStyle}>
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
        <h1 style={{ marginBottom: '8px', color: '#fff', fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
          📈 Performance Analytics
        </h1>
        <p style={{ color: '#94a3b8', marginBottom: '32px', fontSize: '14px' }}>Track your learning progress and discover growth areas</p>

        {/* Stat Cards */}
        <div style={statsGrid}>
          {statCards.map((s, i) => (
            <div key={i} style={{
              background: s.gradient,
              borderRadius: '18px',
              padding: '24px 20px',
              textAlign: 'center',
              boxShadow: `0 8px 32px ${s.glow}55`,
              position: 'relative', overflow: 'hidden',
              transition: 'transform 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ fontSize: '2rem', marginBottom: '6px' }}>{s.icon}</div>
              <div style={{ fontSize: '28px', fontWeight: 900, color: '#fff', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', marginTop: '6px', fontWeight: 600 }}>{s.label}</div>
              <div style={{
                position: 'absolute', top: '-20px', right: '-20px',
                width: '80px', height: '80px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)'
              }} />
            </div>
          ))}
        </div>




        {/* Performance Over Time */}
        {attempts.length > 0 && (
          <div style={cardStyle}>
            <h2 style={{ marginBottom: '6px', color: '#e2e8f0', fontWeight: 800, fontSize: '1.2rem' }}>🚀 Performance Over Time</h2>
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>Your accuracy trend across all quiz attempts</p>
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer>
                <AreaChart data={attempts} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="accuracyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="attempt" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} label={{ value: 'Attempt #', position: 'insideBottom', offset: -2, fill: '#475569', fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                  <Tooltip content={<CustomLineTooltip />} />
                  <Area type="monotone" dataKey="accuracy" stroke="#6366f1" strokeWidth={3}
                    fill="url(#accuracyGrad)" dot={<CustomDot />} activeDot={{ r: 7, fill: '#818cf8' }} name="Accuracy %" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}




        {/* Topic-wise Performance */}
        {topicData.length > 0 && (
          <div style={cardStyle}>
            <h2 style={{ marginBottom: '6px', color: '#e2e8f0', fontWeight: 800, fontSize: '1.2rem' }}>🎯 Topic-wise Performance</h2>
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>Accuracy per topic — green is strong, red needs work</p>
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer>
                <BarChart data={topicData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }} barCategoryGap="30%">
                  <defs>
                    {topicData.map((_, i) => (
                      <linearGradient key={i} id={`barGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={BAR_COLORS[i % BAR_COLORS.length]} stopOpacity={1} />
                        <stop offset="100%" stopColor={BAR_COLORS[i % BAR_COLORS.length]} stopOpacity={0.4} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="topic" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
                    angle={-30} textAnchor="end" interval={0} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="accuracy" name="Accuracy %" radius={[8, 8, 0, 0]}>
                    {topicData.map((_, i) => (
                      <Cell key={i} fill={`url(#barGrad${i})`}
                        style={{ filter: `drop-shadow(0 4px 8px ${BAR_COLORS[i % BAR_COLORS.length]}88)` }} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Topic Details Table */}
            <div style={{ marginTop: '30px' }}>
              <h3 style={{ marginBottom: '15px', color: 'var(--text-primary)', fontWeight: 700 }}>📋 Topic Details</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '13px', borderBottom: '1px solid var(--border-light)' }}>Topic</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '13px', borderBottom: '1px solid var(--border-light)' }}>Accuracy</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '13px', borderBottom: '1px solid var(--border-light)' }}>Progress</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '13px', borderBottom: '1px solid var(--border-light)' }}>Questions</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '13px', borderBottom: '1px solid var(--border-light)' }}>Attempts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topicData.map((topic, i) => {
                      const acc = parseFloat(topic.accuracy);
                      const barColor = acc >= 75 ? '#10b981' : acc >= 50 ? '#f59e0b' : '#ef4444';
                      return (
                        <tr key={topic.topic} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-glass-hover)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '14px 16px', color: 'var(--text-primary)', fontWeight: 600, fontSize: '14px' }}>{topic.topic}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <span style={{
                              background: acc >= 75 ? 'rgba(16,185,129,0.15)' : acc >= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                              color: barColor, padding: '4px 12px', borderRadius: '20px',
                              fontWeight: 700, fontSize: '13px', border: `1px solid ${barColor}44`,
                            }}>{topic.accuracy}%</span>
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'center', minWidth: '120px' }}>
                            <div style={{ background: 'var(--bg-secondary)', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
                              <div style={{
                                width: `${Math.min(acc, 100)}%`, height: '100%',
                                background: `linear-gradient(90deg, ${barColor}, ${barColor}99)`,
                                borderRadius: '999px', transition: 'width 1s ease',
                              }} />
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>{topic.totalQuestions}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>{topic.attempts}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}




        {weakTopics.length > 0 && (

          <div style={{ ...cardStyle, borderLeft: '4px solid #6366f1' }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>

              <h2 style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 800, fontSize: '20px' }}>🤖 AI-Suggested Study Plan</h2>

              <span style={{ fontSize: '11px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', padding: '3px 12px', borderRadius: '20px', fontWeight: 700 }}>Powered by Groq</span>

            </div>

            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px' }}>

              Personalized resources for your weak topics: <strong style={{ color: 'var(--brand-accent)' }}>{weakTopics.map((t) => t.topic).join(", ")}</strong>

            </p>

            {aiLoading && (

              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--brand-accent)', fontSize: '15px' }}>

                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✨</div>

                Generating personalized study plan...

              </div>

            )}

            {aiError && !aiLoading && (

              <div style={{ color: '#f87171', padding: '14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', fontSize: '14px' }}>

                ⚠️ {aiError}

              </div>

            )}

            {!aiLoading && !aiError && aiStudyPlan.length > 0 && (

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                {aiStudyPlan.map((item, idx) => (

                  <div

                    key={idx}

                    style={{

                      background: 'var(--bg-secondary)',

                      borderRadius: '14px',

                      border: '1px solid var(--border-light)',

                      padding: '16px 20px',

                      display: 'flex',

                      alignItems: 'flex-start',

                      justifyContent: 'space-between',

                      gap: '16px',

                      transition: 'background 0.2s',

                    }}

                    onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-light)'}

                    onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-secondary)'}

                  >

                    <div style={{ flex: 1 }}>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>

                        <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '15px' }}>{item.name}</span>

                        {item.type && (

                          <span style={{ fontSize: '11px', background: 'var(--brand-light)', color: 'var(--brand-accent)', padding: '3px 10px', borderRadius: '20px', fontWeight: 600, border: '1px solid var(--border-accent)' }}>

                            {item.type}

                          </span>

                        )}

                        <span style={{ fontSize: '11px', background: 'rgba(245,158,11,0.12)', color: '#fbbf24', padding: '3px 10px', borderRadius: '20px', fontWeight: 600, border: '1px solid rgba(245,158,11,0.25)' }}>

                          {item.weakTopic}

                        </span>

                      </div>

                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px', lineHeight: 1.5 }}>{item.description}</div>

                      {item.tip && (

                        <div style={{ fontSize: '12px', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>

                          💡 <em>{item.tip}</em>

                        </div>

                      )}

                    </div>

                    <a

                      href={item.url}

                      target="_blank"

                      rel="noopener noreferrer"

                      style={{

                        padding: '9px 18px',

                        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',

                        color: '#fff',

                        borderRadius: '10px',

                        textDecoration: 'none',

                        fontWeight: 700,

                        fontSize: '13px',

                        flexShrink: 0,

                        whiteSpace: 'nowrap',

                        boxShadow: '0 4px 12px rgba(99,102,241,0.3)',

                        transition: 'transform 0.15s',

                      }}

                      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}

                      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}

                    >

                      Learn →

                    </a>

                  </div>

                ))}

              </div>

            )}

          </div>

        )}



        {attempts.length === 0 && (
          <div style={{ ...cardStyle, textAlign: 'center', padding: '60px 30px' }}>
            <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🎓</div>
            <h2 style={{ marginBottom: '12px', color: 'var(--text-primary)', fontWeight: 800 }}>No Performance Data Yet</h2>
            <p style={{ color: '#64748b', marginBottom: '28px', fontSize: '15px' }}>
              Take your first quiz to start tracking your learning journey!
            </p>
            <button
              onClick={() => window.location.href = '/quiz'}
              style={{
                padding: '14px 32px',
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                color: 'white', border: 'none', borderRadius: '12px',
                cursor: 'pointer', fontSize: '15px', fontWeight: 700,
                boxShadow: '0 6px 24px #6366f155',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              🚀 Take Your First Quiz
            </button>
          </div>
        )}


      </div>

    </div>

  );

}



export default Performance;

