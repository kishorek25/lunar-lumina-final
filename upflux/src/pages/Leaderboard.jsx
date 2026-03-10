import { useContext, useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { AuthContext } from "../context/AuthContext";
import { subscribeToLeaderboardUsers } from "../services/leaderboardService";
import "../styles/leaderboard.css";

const FILTERS = {
  ALL_TIME: "all",
  WEEK: "week",
  MONTH: "month",
};

function Leaderboard() {
  const { user: authUser } = useContext(AuthContext);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState(FILTERS.ALL_TIME);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authUser?.uid) return;

    const unsubscribe = subscribeToLeaderboardUsers(
      (fetchedUsers) => {
        setUsers(fetchedUsers);
        setLoading(false);
      },
      (err) => {
        console.error("Leaderboard listener error:", err);
        setError("Failed to load leaderboard.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [authUser?.uid]);

  const passesTimeFilter = (u) => {
    if (filter === FILTERS.ALL_TIME) return true;
    if (!u.lastQuizDate) return false;

    const last = u.lastQuizDate.toDate ? u.lastQuizDate.toDate() : u.lastQuizDate;
    const now = new Date();
    const diffDays = (now - last) / (1000 * 60 * 60 * 24);

    if (filter === FILTERS.WEEK) return diffDays <= 7;
    if (filter === FILTERS.MONTH) return diffDays <= 30;
    return true;
  };

  const {
    topTen,
    currentUserRank,
    currentUserStats,
    totalRankedUsers,
  } = useMemo(() => {
    if (!users.length) {
      return {
        topTen: [],
        currentUserRank: null,
        currentUserStats: null,
        totalRankedUsers: 0,
      };
    }

    const normalized = users
      .filter((u) => passesTimeFilter(u))
      .map((u) => {
        const baseUsername = (u.username || "").trim();
        let derived = baseUsername;

        // If username is missing, derive it from email local-part just for display
        if (!derived && u.email) {
          const emailStr = String(u.email).trim();
          if (emailStr.includes("@")) {
            derived = emailStr.split("@")[0];
          }
        }

        return {
          ...u,
          totalScore: Number(u.totalScore || 0),
          totalXP: Number(u.totalXP || 0),
          learningVelocity: Number(u.learningVelocity ?? 0),
          quizzesAttempted: Number(u.quizzesAttempted || 0),
          averageScore: Number(u.averageScore || 0),
          username: derived,
        };
      })
      .filter((u) => u.username);

    const sortedAll = normalized.sort((a, b) => {
      if (b.totalXP !== a.totalXP) return b.totalXP - a.totalXP;
      return b.learningVelocity - a.learningVelocity;
    });

    const totalRanked = sortedAll.length;

    const searched = sortedAll.filter((u) =>
      u.username.toLowerCase().includes(search.toLowerCase())
    );

    const topTenWithRank = searched.slice(0, 10).map((u, index) => ({
      ...u,
      rank: index + 1,
    }));

    let currentRank = null;
    let currentStats = null;

    if (authUser?.uid) {
      const indexInAll = sortedAll.findIndex((u) => u.id === authUser.uid);
      if (indexInAll !== -1) {
        currentRank = indexInAll + 1;
        currentStats = sortedAll[indexInAll];
      }
    }

    return {
      topTen: topTenWithRank,
      currentUserRank: currentRank,
      currentUserStats: currentStats,
      totalRankedUsers: totalRanked,
    };
  }, [users, filter, search, authUser?.uid]);

  const getTrendArrow = (u) => {
    if (u.previousAverageScore == null) return "→";
    const diff = u.averageScore - Number(u.previousAverageScore || 0);
    if (diff > 1) return "↑";
    if (diff < -1) return "↓";
    return "→";
  };

  const getBadgeSuggestion = (u) => {
    if (!u) return "Complete more quizzes to unlock badges.";

    if (u.averageScore >= 85 && u.quizzesAttempted >= 20) {
      return "Legendary Learner – keep pushing high-difficulty quizzes.";
    }
    if (u.averageScore >= 75 && u.quizzesAttempted >= 10) {
      return "Consistent Performer – maintain your streak and aim for harder topics.";
    }
    if (u.averageScore >= 60) {
      return "Rising Star – focus on weak areas to break into the top tier.";
    }
    return "Momentum Builder – start with easier quizzes and build confidence.";
  };

  const motivationalMessage =
    currentUserRank && currentUserRank === 1
      ? "You’re leading the galaxy. Maintain the throne!"
      : "Climb the ranks by improving your accuracy and consistency.";

  return (
    <div className="leaderboard-page">
      <Header onMenuClick={() => setSidebarOpen((open) => !open)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="leaderboard-main">
        <div style={{ marginBottom: "24px" }}>
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
        <section className="leaderboard-header">
          <div>
            <h1 className="leaderboard-title">Leaderboard</h1>
            <p className="leaderboard-subtitle">
              Ranked by Total XP, then Learning velocity (tie breaker).
            </p>
          </div>

          <div className="leaderboard-controls">
            <div className="leaderboard-filters">
              <button
                type="button"
                className={`filter-chip ${filter === FILTERS.WEEK ? "filter-chip--active" : ""
                  }`}
                onClick={() => setFilter(FILTERS.WEEK)}
              >
                This Week
              </button>
              <button
                type="button"
                className={`filter-chip ${filter === FILTERS.MONTH ? "filter-chip--active" : ""
                  }`}
                onClick={() => setFilter(FILTERS.MONTH)}
              >
                This Month
              </button>
              <button
                type="button"
                className={`filter-chip ${filter === FILTERS.ALL_TIME ? "filter-chip--active" : ""
                  }`}
                onClick={() => setFilter(FILTERS.ALL_TIME)}
              >
                All Time
              </button>
            </div>

            <input
              type="text"
              className="leaderboard-search"
              placeholder="Search by username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </section>

        <section className="your-rank-section">
          <div className="glass-card your-rank-card">
            <div className="your-rank-main">
              <h2>Your Rank</h2>
              {currentUserRank ? (
                <p className="your-rank-number">#{currentUserRank}</p>
              ) : (
                <p className="your-rank-number your-rank-number--muted">
                  Not ranked yet
                </p>
              )}
              <p className="your-rank-total">
                {totalRankedUsers > 0
                  ? `out of ${totalRankedUsers} learners`
                  : "No leaderboard data yet"}
              </p>
            </div>

            <div className="your-rank-stats">
              {currentUserStats ? (
                <>
                  <div className="stat-item">
                    <span className="stat-label">Total XP</span>
                    <span className="stat-value">
                      {currentUserStats.totalXP}
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Quizzes</span>
                    <span className="stat-value">
                      {currentUserStats.quizzesAttempted}
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Average</span>
                    <span className="stat-value">
                      {currentUserStats.averageScore.toFixed(1)}%
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Velocity</span>
                    <span className="stat-value">
                      {currentUserStats.learningVelocity.toFixed(2)}
                    </span>
                  </div>
                </>
              ) : (
                <p className="your-rank-hint">
                  Complete your first quiz to join the leaderboard.
                </p>
              )}
            </div>

            <div className="your-rank-badge">
              <p className="badge-title">Suggested Badge</p>
              <p className="badge-text">{getBadgeSuggestion(currentUserStats)}</p>
            </div>
          </div>

          <div className="glass-card motivation-card">
            <h3>Motivation</h3>
            <p>{motivationalMessage}</p>
          </div>
        </section>

        <section className="leaderboard-table-section">
          <div className="glass-card leaderboard-table-card">
            <div className="table-header-row">
              <span>Rank</span>
              <span>Username</span>
              <span>Total XP</span>
              <span>Velocity</span>
              <span>Quizzes</span>
              <span>Average</span>
            </div>

            {loading ? (
              <div className="table-body">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="table-row skeleton-row"
                  >
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="table-body">
                <p className="error-text">{error}</p>
              </div>
            ) : topTen.length === 0 ? (
              <div className="table-body">
                <p className="empty-text">
                  No learners match this filter yet. Try a different period or
                  complete more quizzes.
                </p>
              </div>
            ) : (
              <div className="table-body">
                {topTen.map((u) => {
                  const isCurrent = authUser?.uid === u.id;

                  let rankClass = "";
                  if (u.rank === 1) rankClass = "row--gold";
                  else if (u.rank === 2) rankClass = "row--silver";
                  else if (u.rank === 3) rankClass = "row--bronze";

                  return (
                    <div
                      key={`${u.id}-${u.rank}`}
                      className={`table-row leaderboard-row ${rankClass} ${isCurrent ? "row--current-user" : ""
                        }`}
                    >
                      <span className="rank-cell">
                        <span className="rank-number">#{u.rank}</span>
                        {u.rank === 1 && (
                          <span className="rank-badge rank-badge--crown">
                            <span className="crown-shape" />
                          </span>
                        )}
                        {u.rank === 2 && (
                          <span className="rank-badge rank-badge--silver" />
                        )}
                        {u.rank === 3 && (
                          <span className="rank-badge rank-badge--bronze" />
                        )}
                      </span>

                      <span className="username-cell">{u.username}</span>
                      <span>{u.totalXP}</span>
                      <span>{u.learningVelocity.toFixed(2)}</span>
                      <span>{u.quizzesAttempted}</span>
                      <span>{u.averageScore.toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default Leaderboard;

