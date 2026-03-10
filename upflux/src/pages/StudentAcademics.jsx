import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { db } from "../services/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { getStudentProfile, updateStudentProfile } from "../services/academicProfileService";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

const SEMESTERS = [
    "Semester 1", "Semester 2", "Semester 3", "Semester 4",
    "Semester 5", "Semester 6", "Semester 7", "Semester 8"
];

const AVAILABLE_SUBJECTS = [
    "Computer Science", "Mathematics", "Physics", "Chemistry",
    "Data Structures", "Algorithms", "DBMS", "Operating Systems",
    "Computer Networks", "Machine Learning", "Web Development", "Statistics"
];

function StudentAcademics() {
    const { user } = useContext(AuthContext);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profile, setProfile] = useState(null);
    const [attempts, setAttempts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    const [editData, setEditData] = useState({
        collegeName: "",
        department: "",
        semester: "",
        subjects: []
    });

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            try {
                const [profileData, attemptsSnap] = await Promise.all([
                    getStudentProfile(user.uid),
                    getDocs(query(
                        collection(db, "quizAttempts"),
                        where("userId", "==", user.uid),
                        orderBy("createdAt", "desc")
                    ))
                ]);

                if (profileData) {
                    setProfile(profileData);
                    setEditData(profileData);
                }

                const attemptsData = attemptsSnap.docs.map(doc => doc.data());
                setAttempts(attemptsData);
            } catch (error) {
                console.error("Error fetching academics data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    const handleEditToggle = () => {
        setIsEditing(!isEditing);
        if (!isEditing && profile) {
            setEditData(profile);
        }
    };

    const handleSubjectToggle = (subject) => {
        setEditData(prev => ({
            ...prev,
            subjects: prev.subjects.includes(subject)
                ? prev.subjects.filter(s => s !== subject)
                : [...prev.subjects, subject]
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateStudentProfile(user.uid, editData);
            setProfile(editData);
            setIsEditing(false);
        } catch (error) {
            alert("Failed to update profile.");
        } finally {
            setSaving(false);
        }
    };

    // Calculate subject performance
    const subjectPerformance = (profile?.subjects || []).map(subject => {
        const relevantAttempts = attempts.filter(att =>
            att.topics && Object.keys(att.topics).some(t => t.toLowerCase() === subject.toLowerCase())
        );

        const totalAccuracy = relevantAttempts.reduce((acc, att) => {
            // Find the specific topic's accuracy in this attempt
            const topicKey = Object.keys(att.topics).find(t => t.toLowerCase() === subject.toLowerCase());
            const stats = att.topics[topicKey];
            const accVal = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
            return acc + accVal;
        }, 0);

        const avgAccuracy = relevantAttempts.length > 0 ? (totalAccuracy / relevantAttempts.length).toFixed(1) : 0;

        return {
            name: subject,
            accuracy: avgAccuracy,
            attempts: relevantAttempts.length
        };
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--bg-app)]">
                <Header onMenuClick={() => setSidebarOpen(true)} />
                <div className="flex items-center justify-center h-[calc(100vh-80px)]">
                    <div className="text-indigo-400 text-xl animate-pulse font-bold">Loading Academic Data...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg-app)]">
            <Header onMenuClick={() => setSidebarOpen(true)} />
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="max-w-6xl mx-auto px-6 pt-6">
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

            <main className="max-w-6xl mx-auto p-6 md:p-10 space-y-10 animate-in fade-in duration-700">
                <header>
                    <h1 className="text-4xl font-black text-[var(--text-primary)] tracking-tight mb-2">Student Academics</h1>
                    <p className="text-[var(--text-secondary)]">Manage your educational profile and track subject mastery.</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Profile Card */}
                    <div className="lg:col-span-1">
                        <div className="bg-[var(--bg-glass)] backdrop-blur-xl border border-[var(--border-light)] rounded-2xl p-8 shadow-[var(--shadow-md)] relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-bl-full -mr-16 -mt-16 transition-all group-hover:scale-110" />

                            <div className="flex justify-between items-start mb-6 relative">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl shadow-xl shadow-indigo-500/20">
                                    🏠
                                </div>
                                <button
                                    onClick={handleEditToggle}
                                    className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold rounded-lg transition-all active:scale-95"
                                >
                                    Edit Profile
                                </button>
                            </div>

                            <div className="space-y-6 relative">
                                <div>
                                    <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-1">{profile?.collegeName || "Not Set"}</h2>
                                    <p className="text-[var(--text-secondary)] font-medium">{profile?.department || "No Department"} • {profile?.semester || "N/A"}</p>
                                </div>

                                <div className="pt-4 border-t border-[var(--border-light)]">
                                    <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest mb-4">Core Subjects</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {profile?.subjects?.map(sub => (
                                            <span key={sub} className="px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-lg text-xs font-semibold text-[var(--text-secondary)]">
                                                {sub}
                                            </span>
                                        )) || <span className="text-[var(--text-muted)] italic text-sm">No subjects selected</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Performance Table */}
                    <div className="lg:col-span-2">
                        <div className="bg-[var(--bg-glass)] backdrop-blur-xl border border-[var(--border-light)] rounded-2xl shadow-[var(--shadow-md)] overflow-hidden">
                            <div className="p-6 border-bottom border-[var(--border-light)] bg-[var(--bg-secondary)]">
                                <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                                    <span className="text-2xl">📈</span> Subject Performance
                                </h2>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-[var(--bg-secondary)]">
                                            <th className="p-5 text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider">Subject</th>
                                            <th className="p-5 text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider text-center">Accuracy</th>
                                            <th className="p-5 text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider text-center">Attempts</th>
                                            <th className="p-5 text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider">Progress</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {subjectPerformance.length > 0 ? (
                                            subjectPerformance.map((item, idx) => {
                                                const acc = parseFloat(item.accuracy);
                                                const progressColor = acc >= 80 ? 'bg-emerald-500' : acc >= 50 ? 'bg-amber-500' : 'bg-rose-500';
                                                const textColor = acc >= 80 ? 'text-emerald-400' : acc >= 50 ? 'text-amber-400' : 'text-rose-400';

                                                return (
                                                    <tr key={idx} className="border-t border-[var(--border-light)] hover:bg-[var(--bg-glass-hover)] transition-colors group">
                                                        <td className="p-5">
                                                            <div className="font-bold text-[var(--text-primary)] group-hover:text-indigo-400 transition-colors">{item.name}</div>
                                                        </td>
                                                        <td className="p-5 text-center">
                                                            <span className={`font-black text-lg ${textColor}`}>{item.accuracy}%</span>
                                                        </td>
                                                        <td className="p-5 text-center">
                                                            <span className="px-3 py-1 bg-[var(--bg-secondary)] rounded-full text-[var(--text-secondary)] text-sm font-bold border border-[var(--border-light)]">
                                                                {item.attempts}
                                                            </span>
                                                        </td>
                                                        <td className="p-5 min-w-[200px]">
                                                            <div className="flex items-center gap-4">
                                                                <div className="flex-1 h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full ${progressColor} transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,0,0,0.5)]`}
                                                                        style={{ width: `${item.accuracy}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan="4" className="p-20 text-center text-[var(--text-muted)] italic">
                                                    No performance data found for your subjects. Try taking some quizzes!
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Edit Modal */}
                {isEditing && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
                        <div className="w-full max-w-2xl bg-[var(--bg-body-color)] border border-[var(--border-light)] rounded-3xl shadow-[var(--shadow-lg)] p-8 animate-in zoom-in duration-300">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-3xl font-black text-[var(--text-primary)]">Edit Academic Details</h2>
                                <button onClick={() => setIsEditing(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-2 text-2xl">✕</button>
                            </div>

                            <form onSubmit={handleSave} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-[var(--text-secondary)]">College Name</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                                            value={editData.collegeName}
                                            onChange={(e) => setEditData({ ...editData, collegeName: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-[var(--text-secondary)]">Department</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                                            value={editData.department}
                                            onChange={(e) => setEditData({ ...editData, department: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-[var(--text-secondary)]">Semester</label>
                                    <select
                                        className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium appearance-none"
                                        value={editData.semester}
                                        onChange={(e) => setEditData({ ...editData, semester: e.target.value })}
                                    >
                                        {SEMESTERS.map(sem => <option key={sem} value={sem} className="bg-[var(--bg-primary)]">{sem}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-sm font-bold text-[var(--text-secondary)]">Subjects</label>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                        {AVAILABLE_SUBJECTS.map(subject => (
                                            <button
                                                key={subject}
                                                type="button"
                                                onClick={() => handleSubjectToggle(subject)}
                                                className={`px-3 py-2 rounded-lg text-xs font-black transition-all border ${editData.subjects.includes(subject)
                                                    ? "bg-indigo-600 border-indigo-500 text-white shadow-lg"
                                                    : "bg-[var(--bg-secondary)] border-[var(--border-light)] text-[var(--text-secondary)] hover:border-indigo-500/50"
                                                    }`}
                                            >
                                                {subject}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-8 flex gap-4">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black py-4 rounded-xl shadow-xl shadow-indigo-600/20 active:scale-95 transition-all text-lg"
                                    >
                                        {saving ? "Updating..." : "Save Changes"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(false)}
                                        className="px-8 py-4 bg-[var(--bg-secondary)] text-[var(--text-secondary)] font-bold rounded-xl active:scale-95 transition-all"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

export default StudentAcademics;
