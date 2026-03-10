import { useState, useEffect, useContext } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { buildLearningBehaviorProfileForUser } from "../services/learningProfileEngine";
import { AuthContext } from "../context/AuthContext";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

function Profile() {
  const { user } = useContext(AuthContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    username: ""
  });

  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.uid) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserData(data);
            setFormData({
              username: data.username || ""
            });
          }

          // Build or refresh learning behavior profile (logic only, no UI coupling)
          await buildLearningBehaviorProfileForUser(user.uid);
        } catch (error) {
          console.error("Error fetching user data:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchUserData();
  }, [user]);

  const handleUpdateProfile = async () => {
    try {
      const trimmedUsername = (formData.username || "").trim();
      if (!trimmedUsername) {
        alert("Username cannot be empty.");
        return;
      }

      await updateDoc(doc(db, "users", user.uid), {
        username: trimmedUsername
      });

      setUserData({
        ...userData,
        username: trimmedUsername
      });

      setEditMode(false);
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Error updating profile. Please try again.");
    }
  };

  const page = { minHeight: "100vh", background: "var(--bg-app)" };
  const wrap = { maxWidth: "800px", margin: "0 auto", padding: "40px 24px", animation: "dashboardFadeIn 0.5s ease both" };
  const card = {
    background: "var(--bg-glass)",
    backdropFilter: "blur(24px)",
    border: "1px solid var(--border-light)",
    borderRadius: "20px", padding: "28px 32px",
    boxShadow: "var(--shadow-lg)",
    marginBottom: "24px", transition: "all 0.3s ease"
  };
  const btn = { padding: "10px 22px", border: "none", borderRadius: "12px", cursor: "pointer", fontSize: "14px", fontWeight: 600, transition: "all 0.2s ease", marginRight: "10px" };
  const primaryBtn = { ...btn, background: "var(--brand-primary)", color: "#fff", boxShadow: "var(--shadow-md)" };
  const secondaryBtn = { ...btn, background: "var(--bg-secondary)", color: "var(--text-secondary)", border: "1px solid var(--border-light)" };
  const inputStyle = { width: "100%", padding: "12px 16px", marginBottom: "16px", borderRadius: "12px", border: "1px solid var(--border-light)", background: "var(--bg-secondary)", color: "var(--text-primary)", boxSizing: "border-box", fontSize: "15px", outline: "none", transition: "all 0.2s ease" };
  const infoRow = { display: "flex", alignItems: "center", gap: "12px", padding: "12px 0", borderBottom: "1px solid var(--border-light)", opacity: "0.8" };
  const infoLabel = { fontSize: "13px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", minWidth: "120px" };
  const infoValue = { fontSize: "15px", color: "var(--text-primary)", fontWeight: 500 };


  if (loading) {
    return (
      <div style={page}>
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div style={wrap}>
          <div style={{ marginBottom: "20px" }}>
            <button
              onClick={() => window.history.back()}
              style={{
                background: "var(--bg-secondary)", border: "1px solid var(--border-light)",
                borderRadius: "12px", padding: "8px 14px", color: "var(--text-secondary)",
                cursor: "pointer", fontSize: "14px", fontWeight: 600, transition: "var(--transition-fast)",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--bg-glass-hover)"}
              onMouseLeave={e => e.currentTarget.style.background = "var(--bg-secondary)"}
            >← Back</button>
          </div>
          <div className="skeleton" style={{ height: "120px", borderRadius: "16px", marginBottom: "24px" }} />
          <div className="skeleton" style={{ height: "200px", borderRadius: "16px", marginBottom: "24px" }} />
          <div className="skeleton" style={{ height: "100px", borderRadius: "16px" }} />
        </div>
      </div>
    );
  }

  const initials = (userData?.username || user?.email || "?").charAt(0).toUpperCase();

  return (
    <div style={page}>
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div style={wrap}>
        {/* Profile Hero */}
        <div style={{
          background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #3B82F6 100%)",
          borderRadius: "16px",
          padding: "32px",
          marginBottom: "24px",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          gap: "24px",
          boxShadow: "0 10px 30px -5px rgba(79,70,229,0.3)",
          animation: "dashboardSlideUp 0.5s ease both",
        }}>
          <div style={{
            width: "72px", height: "72px", borderRadius: "50%",
            background: "rgba(255,255,255,0.2)", display: "flex",
            alignItems: "center", justifyContent: "center",
            fontSize: "28px", fontWeight: 700, flexShrink: 0,
          }}>
            {initials}
          </div>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: 700, margin: "0 0 4px 0", color: "#fff" }}>
              {userData?.username || "Your Profile"}
            </h1>
            <p style={{ fontSize: "14px", margin: 0, opacity: 0.85 }}>{user?.email}</p>
          </div>
        </div>

        {/* User Info Card */}
        <div className="dash-card-hover" style={{ ...card, animation: "dashboardSlideUp 0.5s ease both", animationDelay: "0.1s" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "20px", color: "var(--text-primary)" }}>User Information</h2>

          {editMode ? (
            <div>
              <label style={{ fontSize: "13px", color: "#6b7280", display: "block", marginBottom: "6px" }}>Username</label>
              <input
                type="text"
                placeholder="Enter username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = "var(--brand-primary)"; e.target.style.boxShadow = "var(--shadow-glow)"; }}
                onBlur={(e) => { e.target.style.borderColor = "var(--border-light)"; e.target.style.boxShadow = "none"; }}
              />
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={handleUpdateProfile}
                  style={primaryBtn}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.03)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                >
                  Save Changes
                </button>
                <button onClick={() => setEditMode(false)} style={secondaryBtn}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-glass-hover)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-secondary)"; }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={infoRow}>
                <span style={infoLabel}>Email</span>
                <span style={infoValue}>{user?.email}</span>
              </div>
              <div style={infoRow}>
                <span style={infoLabel}>Username</span>
                <span style={infoValue}>{userData?.username || "Not set"}</span>
              </div>
              <div style={{ ...infoRow, borderBottom: "none" }}>
                <span style={infoLabel}>Member Since</span>
                <span style={infoValue}>{userData?.createdAt?.toDate()?.toLocaleDateString() || "Unknown"}</span>
              </div>
              <div style={{ marginTop: "20px" }}>
                <button
                  onClick={() => setEditMode(true)}
                  style={primaryBtn}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.03)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                >
                  Edit Profile
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Account Settings Card */}
        <div className="dash-card-hover" style={{ ...card, animation: "dashboardSlideUp 0.5s ease both", animationDelay: "0.2s" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "12px", color: "var(--text-primary)" }}>Account Settings</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: 1.6 }}>
            Additional account settings and preferences will be available here in future updates.
          </p>
        </div>

      </div>
    </div>
  );
}

export default Profile;
