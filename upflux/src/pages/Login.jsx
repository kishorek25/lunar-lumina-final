import { useState } from "react";
import { auth, db } from "../services/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { collection, query, where, getDocs, setDoc, doc } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupError, setSignupError] = useState("");
  const navigate = useNavigate();

  // Check if username already exists
  const checkUsernameExists = async (username) => {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username", "==", username));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  };

  const handleSignup = async () => {
    try {
      setSignupError("");

      const rawUsername = window.prompt("Create a username (at least 3 characters):", "");
      if (!rawUsername) {
        setSignupError("Username is required to create an account.");
        return;
      }

      const trimmedUsername = rawUsername.trim();

      if (trimmedUsername.length < 3) {
        setSignupError("Username must be at least 3 characters long.");
        return;
      }

      const usernameExists = await checkUsernameExists(trimmedUsername);
      if (usernameExists) {
        setSignupError("Username already exists. Please try a different name.");
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      await setDoc(doc(db, "users", userCredential.user.uid), {
        username: trimmedUsername,
        email: email,
        createdAt: new Date()
      });

      alert("Signup successful!");
      navigate("/academic-setup");
    } catch (error) {
      setSignupError(error.message);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setSignupError("");
      alert("Login successful!");
      navigate("/academic-setup");
    } catch (error) {
      setSignupError(error.message);
    }
  };

  const buttonStyle = {
    background: 'var(--brand-primary)',
    color: 'white',
    padding: '12px 24px',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    marginRight: '10px',
    fontSize: '15px',
    fontWeight: '700',
    transition: 'all 0.2s',
    boxShadow: 'var(--shadow-sm)',
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', textAlign: 'center', background: 'var(--bg-app)' }}>
      <div style={{ background: 'var(--bg-glass)', padding: '40px', borderRadius: '24px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-lg)', maxWidth: '400px', width: '100%', backdropFilter: 'blur(24px)' }}>
        <Link to="/" style={{ ...buttonStyle, display: 'inline-block', marginBottom: '24px', textDecoration: 'none', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}>← Back to Home</Link>
        <h1 style={{ color: 'var(--text-primary)', fontWeight: 800, marginBottom: '24px' }}>Welcome to Upflux</h1>

        <div style={{ textAlign: 'left', marginBottom: '8px' }}>
          <label style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, marginLeft: '4px' }}>Email Address</label>
        </div>
        <input
          type="email"
          placeholder="email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: '100%', padding: '14px', marginBottom: '20px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--bg-primary)', color: 'var(--text-primary)', boxSizing: 'border-box', outline: 'none' }}
        />

        <div style={{ textAlign: 'left', marginBottom: '8px' }}>
          <label style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, marginLeft: '4px' }}>Password</label>
        </div>
        <input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        )}

        <div>
          <button onClick={handleLogin} style={buttonStyle}>Login</button>
          <button onClick={handleSignup} style={buttonStyle}>Signup</button>
        </div>
      </div>
    </div>
  );
}

export default Login;