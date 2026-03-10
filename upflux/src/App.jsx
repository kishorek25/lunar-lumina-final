import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import TakeQuiz from "./pages/TakeQuiz.jsx";
import History from "./pages/History.jsx";
import Profile from "./pages/Profile.jsx";
import Performance from "./pages/Performance.jsx";
import Leaderboard from "./pages/Leaderboard.jsx";
import AITutor from "./pages/AITutor.jsx";
import Challenges from "./pages/Challenges.jsx";
import StudyPlanner from "./pages/StudyPlanner.jsx";
import ConceptModule from "./pages/ConceptModule.jsx";
import AcademicProfileSetup from "./pages/AcademicProfileSetup.jsx";
import StudentAcademics from "./pages/StudentAcademics.jsx";
import ProtectedRoute from "./components/layout/ProtectedRoute";

const pageVariants = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2, ease: "easeIn" } },
};

function AnimatedRoute({ children }) {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" style={{ minHeight: "100vh" }}>
      {children}
    </motion.div>
  );
}

function App() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<AnimatedRoute><Home /></AnimatedRoute>} />
        <Route path="/login" element={<AnimatedRoute><Login /></AnimatedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><AnimatedRoute><Dashboard /></AnimatedRoute></ProtectedRoute>} />
        <Route path="/quiz" element={<ProtectedRoute><AnimatedRoute><TakeQuiz /></AnimatedRoute></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><AnimatedRoute><History /></AnimatedRoute></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><AnimatedRoute><Profile /></AnimatedRoute></ProtectedRoute>} />
        <Route path="/performance" element={<ProtectedRoute><AnimatedRoute><Performance /></AnimatedRoute></ProtectedRoute>} />
        <Route path="/leaderboard" element={<ProtectedRoute><AnimatedRoute><Leaderboard /></AnimatedRoute></ProtectedRoute>} />
        <Route path="/ai-tutor" element={<ProtectedRoute><AnimatedRoute><AITutor /></AnimatedRoute></ProtectedRoute>} />
        <Route path="/challenges" element={<ProtectedRoute><AnimatedRoute><Challenges /></AnimatedRoute></ProtectedRoute>} />
        <Route path="/study-planner" element={<ProtectedRoute><AnimatedRoute><StudyPlanner /></AnimatedRoute></ProtectedRoute>} />
        <Route path="/concept/:topic" element={<ProtectedRoute><AnimatedRoute><ConceptModule /></AnimatedRoute></ProtectedRoute>} />
        <Route path="/academic-setup" element={<ProtectedRoute><AnimatedRoute><AcademicProfileSetup /></AnimatedRoute></ProtectedRoute>} />
        <Route path="/student-academics" element={<ProtectedRoute><AnimatedRoute><StudentAcademics /></AnimatedRoute></ProtectedRoute>} />
      </Routes>
    </AnimatePresence>
  );
}

export default App;
