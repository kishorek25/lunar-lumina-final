import { useContext, useEffect, useState, useRef } from "react";
import { AuthContext } from "../context/AuthContext";
import { db } from "../services/firebase";
import { doc, getDoc } from "firebase/firestore";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

const MAX_HISTORY_MESSAGES = 14;
const API_BASE = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

// Typing dots animation component
function TypingDots() {
  return (
    <div style={{ display: "flex", gap: "5px", alignItems: "center", padding: "4px 0" }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 8, height: 8,
            borderRadius: "50%",
            background: "#818cf8",
            animation: `typingBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes typingBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function AITutor() {
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const chatEndRef = useRef(null);
  const chatAreaRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.uid) { setLoadingProfile(false); return; }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        setProfile(snap.exists() ? snap.data() : null);
      } catch (err) {
        console.error("AI Tutor profile fetch error:", err);
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();
  }, [user]);

  // Auto-scroll to bottom whenever conversation changes or loading
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation, loading]);

  const learningProfile = profile?.learningProfile || {};
  const weakTopics = learningProfile.weakTopics || [];
  const learningVelocity = learningProfile.learningVelocity ?? null;
  const riskLevel = learningProfile.riskLevel || "Unknown";

  const handleAsk = async () => {
    const trimmed = message.trim();
    if (!trimmed) { setError("Please type a question."); return; }
    setError("");
    setMessage("");
    setLoading(true);
    const userMsg = { role: "user", content: trimmed };
    setConversation((prev) => [...prev, userMsg]);

    try {
      const historyForApi = conversation.slice(-Math.floor(MAX_HISTORY_MESSAGES / 2) * 2);
      const res = await fetch(`${API_BASE}/ai-tutor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessage: trimmed, weakTopics, learningVelocity, riskLevel, conversationHistory: historyForApi }),
      });
      const data = await res.json();
      const replyText = data?.reply || "AI Tutor is temporarily unavailable.";
      setConversation((prev) => {
        const next = [...prev, { role: "assistant", content: replyText }];
        return next.slice(-MAX_HISTORY_MESSAGES - 2);
      });
    } catch (err) {
      console.error("AI Tutor request error:", err);
      setConversation((prev) => [...prev, { role: "assistant", content: "AI Tutor is temporarily unavailable. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAsk(); }
  };

  const quickPrompts = [
    "Explain recursion with an example",
    "What is Big O notation?",
    "How does a hash table work?",
    "Difference between stack and queue",
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        maxWidth: "860px", width: "100%", margin: "0 auto",
        padding: "24px 20px", height: "calc(100vh - 64px)",
      }}>
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
        {/* Header Card */}
        <div style={{
          background: "rgba(255,255,255,0.06)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "20px",
          padding: "20px 28px",
          marginBottom: "16px",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "22px", boxShadow: "0 0 18px rgba(99,102,241,0.5)",
            }}>🤖</div>
            <div>
              <h2 style={{ margin: 0, color: "#f1f5f9", fontWeight: 800, fontSize: "1.3rem" }}>AI Tutor</h2>
              <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>Conversational mentor · remembers our conversation</p>
            </div>
            <div style={{
              marginLeft: "auto", fontSize: "12px",
              background: "rgba(16,185,129,0.15)", color: "#10b981",
              border: "1px solid rgba(16,185,129,0.3)",
              borderRadius: "20px", padding: "4px 12px", fontWeight: 600,
            }}>● Online</div>
          </div>
          {!loadingProfile && weakTopics.length > 0 && (
            <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
              <span style={{ fontSize: "12px", color: "#64748b", alignSelf: "center" }}>Focus areas:</span>
              {weakTopics.map((t) => (
                <span key={t} style={{
                  fontSize: "12px", padding: "3px 10px", borderRadius: "20px",
                  background: "rgba(99,102,241,0.15)", color: "#818cf8",
                  border: "1px solid rgba(99,102,241,0.3)", fontWeight: 600,
                }}>{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* Chat Card */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          background: "var(--bg-glass)",
          backdropFilter: "blur(24px)",
          border: "1px solid var(--border-light)",
          borderRadius: "24px",
          overflow: "hidden",
          height: "calc(100vh - 160px)",
          boxShadow: "var(--shadow-lg)",
        }}>
          {/* Messages area */}
          <div
            ref={chatAreaRef}
            style={{
              flex: 1, overflowY: "auto", padding: "24px",
              display: "flex", flexDirection: "column", gap: "14px",
              scrollBehavior: "smooth",
            }}
          >
            {conversation.length === 0 && !loading && (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <div style={{ fontSize: "3rem", marginBottom: "12px" }}>🎓</div>
                <p style={{ color: "#475569", fontSize: "15px", marginBottom: "24px" }}>
                  Ask me anything about programming, algorithms, data structures, or CS concepts.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center" }}>
                  {quickPrompts.map((q) => (
                    <button
                      key={q}
                      onClick={() => { setMessage(q); textareaRef.current?.focus(); }}
                      style={{
                        background: "rgba(99,102,241,0.12)", color: "#818cf8",
                        border: "1px solid rgba(99,102,241,0.25)", borderRadius: "20px",
                        padding: "8px 16px", fontSize: "13px", cursor: "pointer",
                        transition: "all 0.2s", fontWeight: 500,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.25)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(99,102,241,0.12)"; e.currentTarget.style.transform = "translateY(0)"; }}
                    >{q}</button>
                  ))}
                </div>
              </div>
            )}

            {conversation.map((msg, idx) => {
              const isUser = msg.role === "user";
              return (
                <div key={idx} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", alignItems: "flex-end", gap: "8px" }}>
                  {!isUser && (
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                      background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px",
                    }}>🤖</div>
                  )}
                  <div style={{
                    maxWidth: "78%",
                    padding: "12px 18px",
                    borderRadius: isUser ? "20px 20px 6px 20px" : "20px 20px 20px 6px",
                    background: isUser
                      ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
                      : "var(--bg-secondary)",
                    border: isUser ? "none" : "1px solid var(--border-light)",
                    color: isUser ? "#fff" : "var(--text-primary)",
                    fontSize: "14px", lineHeight: 1.65,
                    whiteSpace: "pre-wrap", wordBreak: "break-word",
                    boxShadow: isUser ? "var(--shadow-glow)" : "none",
                    animation: "chatFadeIn 0.25s ease-out",
                  }}>
                    {msg.content}
                  </div>
                  {isUser && (
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                      background: "linear-gradient(135deg,#f59e0b,#ef4444)",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px",
                    }}>👤</div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px",
                }}>🤖</div>
                <div style={{
                  padding: "12px 18px", borderRadius: "20px 20px 20px 6px",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-light)",
                }}>
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input area */}
          <div style={{
            padding: "16px 20px",
            borderTop: "1px solid var(--border-light)",
            background: "var(--bg-glass)",
            flexShrink: 0,
          }}>
            {error && (
              <p style={{ color: "#f87171", fontSize: "12px", marginBottom: "8px" }}>{error}</p>
            )}
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
              <textarea
                ref={textareaRef}
                style={{
                  flex: 1, minHeight: "48px", maxHeight: "120px",
                  padding: "13px 18px", borderRadius: "16px",
                  border: "1px solid var(--border-light)",
                  background: "var(--bg-primary)",
                  color: "var(--text-primary)", resize: "none",
                  boxSizing: "border-box", fontSize: "14px",
                  outline: "none", fontFamily: "Inter, sans-serif",
                  lineHeight: 1.5,
                  transition: "border-color 0.2s",
                }}
                placeholder="Ask a question... (Enter to send, Shift+Enter for newline)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={e => e.target.style.borderColor = "var(--brand-primary)"}
                onBlur={e => e.target.style.borderColor = "var(--border-light)"}
                disabled={loading}
                rows={1}
              />
              <button
                type="button"
                onClick={handleAsk}
                disabled={loading}
                style={{
                  padding: "13px 22px",
                  background: loading ? "rgba(99,102,241,0.4)" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                  color: "#fff", border: "none", borderRadius: "16px",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontWeight: 700, fontSize: "14px", flexShrink: 0,
                  boxShadow: loading ? "none" : "0 4px 16px rgba(99,102,241,0.4)",
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
              >
                {loading ? "..." : "Send ↑"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes chatFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default AITutor;
