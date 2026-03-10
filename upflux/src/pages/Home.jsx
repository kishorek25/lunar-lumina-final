import { Link, useNavigate } from "react-router-dom";
import { useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";

function Home() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);

  const buttonStyle = {
    background: 'var(--brand-primary)',
    color: 'white',
    padding: '14px 32px',
    border: 'none',
    borderRadius: '16px',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block',
    fontSize: '16px',
    fontWeight: '800',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: 'var(--shadow-md)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', textAlign: 'center', background: 'var(--bg-app)' }}>
      <div style={{ background: 'var(--bg-glass)', padding: '48px', borderRadius: '32px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-lg)', maxWidth: '700px', backdropFilter: 'blur(32px)' }}>
        <h1 style={{ fontSize: '3.5rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '24px', letterSpacing: '-0.02em', background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Upflux
        </h1>
        <p style={{ fontSize: '18px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '32px' }}>
          "Learners benefit because they no longer wait for failure to understand their progress.
          Our system detects stagnation early, provides personalized improvement suggestions, and helps them maintain continuous growth."
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {user ? (
            <Link to="/dashboard" style={buttonStyle} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
              Go to Dashboard →
            </Link>
          ) : (
            <Link to="/login" style={buttonStyle} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
              Get Started for Free
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;