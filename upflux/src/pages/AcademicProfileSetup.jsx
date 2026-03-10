import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { saveStudentProfile, getStudentProfile } from "../services/academicProfileService";

const SEMESTERS = [
    "Semester 1", "Semester 2", "Semester 3", "Semester 4",
    "Semester 5", "Semester 6", "Semester 7", "Semester 8"
];

const AVAILABLE_SUBJECTS = [
    "Computer Science", "Mathematics", "Physics", "Chemistry",
    "Data Structures", "Algorithms", "DBMS", "Operating Systems",
    "Computer Networks", "Machine Learning", "Web Development", "Statistics"
];

function AcademicProfileSetup() {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        collegeName: "",
        department: "",
        semester: SEMESTERS[0],
        subjects: []
    });

    useEffect(() => {
        const checkProfile = async () => {
            if (!user) {
                navigate("/login");
                return;
            }
            try {
                const profile = await getStudentProfile(user.uid);
                if (profile) {
                    // If profile exists, skip to dashboard
                    navigate("/dashboard");
                } else {
                    setLoading(false);
                }
            } catch (error) {
                console.error("Error checking profile:", error);
                setLoading(false);
            }
        };
        checkProfile();
    }, [user, navigate]);

    const handleSubjectToggle = (subject) => {
        setFormData(prev => ({
            ...prev,
            subjects: prev.subjects.includes(subject)
                ? prev.subjects.filter(s => s !== subject)
                : [...prev.subjects, subject]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.collegeName || !formData.department || formData.subjects.length === 0) {
            alert("Please fill in all fields and select at least one subject.");
            return;
        }

        setSaving(true);
        try {
            await saveStudentProfile(user.uid, formData);
            navigate("/dashboard");
        } catch (error) {
            alert("Failed to save profile. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-app)]">
                <div className="text-[var(--brand-primary)] text-xl animate-pulse font-bold">Checking profile status...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg-app)]">
            <div className="w-full max-w-2xl bg-[var(--bg-glass)] backdrop-blur-xl border border-[var(--border-light)] rounded-2xl shadow-[var(--shadow-lg)] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="p-8">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl shadow-lg shadow-indigo-500/20">
                            🎓
                        </div>
                        <div>
                            <h1 className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">Complete Your Profile</h1>
                            <p className="text-[var(--text-secondary)]">Tell us about your academic background to personalize your experience.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-[var(--text-secondary)] ml-1">College Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. MIT, Stanford"
                                    className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
                                    value={formData.collegeName}
                                    onChange={(e) => setFormData({ ...formData, collegeName: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-[var(--text-secondary)] ml-1">Department</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Computer Science"
                                    className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
                                    value={formData.department}
                                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-[var(--text-secondary)] ml-1">Semester / Year</label>
                            <select
                                className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-xl text-[var(--text-primary)] appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium cursor-pointer"
                                value={formData.semester}
                                onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                            >
                                {SEMESTERS.map(sem => (
                                    <option key={sem} value={sem} className="bg-[var(--bg-primary)] text-[var(--text-primary)]">{sem}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-[var(--text-secondary)] ml-1">Subjects Studying</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {AVAILABLE_SUBJECTS.map(subject => (
                                    <button
                                        key={subject}
                                        type="button"
                                        onClick={() => handleSubjectToggle(subject)}
                                        className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${formData.subjects.includes(subject)
                                            ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300 shadow-lg shadow-indigo-500/10"
                                            : "bg-[var(--bg-secondary)] border-[var(--border-light)] text-[var(--text-secondary)] hover:bg-[var(--bg-glass-hover)] hover:border-[var(--brand-primary)]"
                                            }`}
                                    >
                                        {subject}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 flex items-center gap-4">
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 rounded-xl shadow-xl shadow-indigo-600/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                            >
                                {saving ? "Saving..." : "Save Academic Profile"}
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate("/dashboard")}
                                className="px-6 py-4 bg-[var(--bg-secondary)] hover:bg-[var(--bg-glass-hover)] border border-[var(--border-light)] text-[var(--text-secondary)] font-bold rounded-xl transition-all"
                            >
                                Skip
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default AcademicProfileSetup;
