require("dotenv").config();



if (!process.env.GROQ_API_KEY) {

  console.error("\n❌ GROQ_API_KEY is missing!");

  console.error("Create a .env file in the backend folder with:");

  console.error("  GROQ_API_KEY=your_key_here\n");

  console.error("Get a free API key at: https://console.groq.com/keys\n");

  process.exit(1);

}



const express = require("express");

const cors = require("cors");

const multer = require("multer");

const axios = require("axios");

const { Resend } = require("resend");

const Groq = require("groq-sdk");



const app = express();

const PORT = process.env.PORT || 5000;

const upload = multer({ storage: multer.memoryStorage() });



app.use(cors());

app.use(express.json());



// In-memory user progress storage (for demonstration)

// In production, use proper database

const userProgressStore = new Map();



// Helper: extract syllabus text from uploaded file (txt or pdf)

async function extractSyllabusFromFile(file) {

  const mimetype = (file.mimetype || "").toLowerCase();

  if (mimetype.includes("text/plain") || file.originalname?.toLowerCase().endsWith(".txt")) {

    return file.buffer.toString("utf-8");

  }

  if (mimetype.includes("pdf") || file.originalname?.toLowerCase().endsWith(".pdf")) {

    try {

      const pdfParse = require("pdf-parse");

      const data = await pdfParse(file.buffer);

      return data.text;

    } catch (err) {

      throw new Error("Failed to parse PDF file");

    }

  }

  throw new Error("Unsupported file type. Use .txt or .pdf");

}



// AI Challenge Generator with Level Progression

app.post("/generate-challenge", async (req, res) => {

  try {

    const { level, userId, questionIndex } = req.body;



    if (!level || level < 1 || level > 20) {

      return res.status(400).json({ error: "Level must be between 1 and 20" });

    }



    // Check if level is unlocked (user must complete all previous levels)

    if (level > 1 && userId) {

      try {

        const userProgress = userProgressStore.get(userId) || { highestCompleted: 0, completedLevels: [] };

        

        if (level > userProgress.highestCompleted + 1) {

          return res.status(403).json({ 

            error: "Level locked", 

            message: `Complete level ${userProgress.highestCompleted} to unlock level ${userProgress.highestCompleted + 1}`,

            requiredLevel: userProgress.highestCompleted + 1

          });

        }

      } catch (error) {

        console.error("Progress check error:", error);

      }

    }



    // Determine difficulty based on level

    let difficulty;

    if (level <= 5) difficulty = "Easy";

    else if (level <= 10) difficulty = "Medium";

    else if (level <= 15) difficulty = "Hard";

    else difficulty = "Expert";



    // Different domains for variety

    const domains = [

      "Data Structures & Algorithms",

      "Database Management Systems", 

      "Operating Systems",

      "Computer Networks",

      "Artificial Intelligence & Machine Learning",

      "Web Development",

      "Cybersecurity",

      "Cloud Computing",

      "Mobile Development",

      "Software Engineering Principles",

      "DevOps & CI/CD",

      "System Design"

    ];

    

    const selectedDomain = domains[Math.floor(Math.random() * domains.length)];



    const groqChallenge = new Groq({ apiKey: process.env.GROQ_API_KEY });



    const prompt = `

Generate a unique multiple-choice challenge question for level ${level} (${difficulty} difficulty).



Focus Domain: ${selectedDomain}



Requirements:

- Must be solvable within 10 seconds

- Clear, unambiguous wording

- Only 1 correct answer

- Short and focused question

- AVOID basic definitions like "What does CPU stand for?"

- Focus on practical concepts, algorithms, or problem-solving

- Create realistic scenarios or technical problems

- Ensure to question tests understanding, not just memorization



Return ONLY this exact JSON structure:

{

  "level": "${level}",

  "difficulty": "${difficulty}",

  "question": "Your question here",

  "options": {

    "A": "Option A text",

    "B": "Option B text", 

    "C": "Option C text",

    "D": "Option D text"

  },

  "correctAnswer": "A",

  "explanation": "Brief explanation of why the correct answer is right"

}



Only valid JSON. No extra text.

`;



    const response = await groqChallenge.chat.completions.create({

      model: "llama-3.1-8b-instant",

      messages: [{ role: "user", content: prompt }],

      temperature: 0.7,

      max_tokens: 500,

    });



    const content = response.choices[0].message.content;

    const jsonMatch = content.match(/\{[\s\S]*\}/);



    if (!jsonMatch) {

      return res.status(500).json({ error: "Failed to parse AI response" });

    }



    const challengeData = JSON.parse(jsonMatch[0]);

    res.json(challengeData);

  } catch (error) {

    console.error("Challenge Error:", error.message);

    res.status(500).json({ error: "Failed to generate challenge" });

  }

});



// Evaluate Challenge Answer

app.post("/evaluate-challenge", async (req, res) => {

  try {

    const { challenge, userAnswer, userId, timeTaken } = req.body;



    if (!challenge || !userAnswer) {

      return res.status(400).json({ error: "Missing challenge or userAnswer" });

    }



    const isCorrect = userAnswer === challenge.correctAnswer;

    const timeBonus = timeTaken && timeTaken < 5 ? 10 : 0;



    // Update user progress if correct answer and userId provided

    let nextLevelUnlocked = false;

    if (isCorrect && userId) {

      try {

        const userProgress = userProgressStore.get(userId) || { highestCompleted: 0, completedLevels: [] };

        

        // Update progress if this level is higher than previously completed

        if (challenge.level > userProgress.highestCompleted) {

          userProgress.highestCompleted = challenge.level;

          userProgress.completedLevels = userProgress.completedLevels || [];

          

          if (!userProgress.completedLevels.includes(challenge.level)) {

            userProgress.completedLevels.push(challenge.level);

            userProgress.completedLevels.sort((a, b) => a - b);

          }

          

          userProgressStore.set(userId, userProgress);

          nextLevelUnlocked = true;

        }

      } catch (error) {

        console.error("Progress save error:", error);

      }

    }



    const result = {

      isCorrect,

      correctAnswer: challenge.correctAnswer,

      userAnswer,

      explanation: challenge.explanation,

      timeBonus,

      nextLevelUnlocked

    };



    res.json(result);



  } catch (error) {

    console.error("CHALLENGE EVALUATION ERROR:", error);

    res.status(500).json({ error: "Challenge evaluation failed" });

  }

});



// Update User Challenge Progress

app.post("/update-challenge-progress", async (req, res) => {

  try {

    const { userId, level, score, totalQuestions, passed } = req.body;

    

    if (!userId || !level) {

      return res.status(400).json({ error: "Missing userId or level" });

    }



    const userProgress = userProgressStore.get(userId) || { highestCompleted: 0, completedLevels: [] };

    

    // Only update if this level was passed and is higher than previously completed

    if (passed && level > userProgress.highestCompleted) {

      userProgress.highestCompleted = level;

      userProgress.completedLevels = userProgress.completedLevels || [];

      

      if (!userProgress.completedLevels.includes(level)) {

        userProgress.completedLevels.push(level);

        userProgress.completedLevels.sort((a, b) => a - b);

      }

      

      userProgressStore.set(userId, userProgress);

    }

    

    const updatedProgress = {

      ...userProgress,

      totalLevels: 20,

      unlockedLevels: Array.from({ length: userProgress.highestCompleted + 1 }, (_, i) => i + 1)

    };

    

    res.json(updatedProgress);



  } catch (error) {

    console.error("PROGRESS UPDATE ERROR:", error);

    res.status(500).json({ error: "Failed to update progress" });

  }

});



// Get User Challenge Progress

app.get("/challenge-progress/:userId", async (req, res) => {

  try {

    const { userId } = req.params;

    

    if (!userId) {

      return res.status(400).json({ error: "Missing userId" });

    }



    const userProgress = userProgressStore.get(userId) || {

      highestCompleted: 0,

      completedLevels: []

    };

    

    const progress = {

      ...userProgress,

      totalLevels: 20,

      unlockedLevels: Array.from({ length: userProgress.highestCompleted + 1 }, (_, i) => i + 1)

    };

    

    res.json(progress);



  } catch (error) {

    console.error("PROGRESS FETCH ERROR:", error);

    res.status(500).json({ error: "Failed to fetch progress" });

  }

});



// Generate Quiz from Syllabus (Groq only, GROQ_API_KEY)

app.post("/generate-quiz", upload.single("file"), async (req, res) => {

  try {

    let syllabus;

    const difficulty = req.body?.difficulty;



    if (req.file) {

      syllabus = await extractSyllabusFromFile(req.file);

    } else {

      syllabus = req.body?.syllabus;

    }



    if (!difficulty || !syllabus) {

      return res.status(400).json({ error: "Missing difficulty or syllabus. Send JSON { difficulty, syllabus } or FormData with file and difficulty." });

    }



    const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });



    const prompt = `

Generate 10 multiple-choice questions from this syllabus: "${syllabus}"



Difficulty: ${difficulty}



Requirements:

- Questions must be based on the syllabus content

- Each question must have 4 options (A, B, C, D)

- Only one correct answer per question

- Questions should be clear and unambiguous

- Include a brief explanation for each correct answer



Return ONLY this JSON format:

{

  "questions": [

    {

      "question": "Question text here",

      "options": {

        "A": "Option A",

        "B": "Option B", 

        "C": "Option C",

        "D": "Option D"

      },

      "correctAnswer": "A",

      "explanation": "Brief explanation"

    }

  ]

}



Only valid JSON. No extra text.

`;



    const response = await groqClient.chat.completions.create({

      model: "llama-3.1-8b-instant",

      messages: [{ role: "user", content: prompt }],

      temperature: 0.7,

      max_tokens: 2000,

    });



    const content = response.choices[0].message.content;

    const jsonMatch = content.match(/\{[\s\S]*\}/);



    if (!jsonMatch) {

      return res.status(500).json({ error: "Failed to parse AI response" });

    }



    const quizData = JSON.parse(jsonMatch[0]);

    const questions = Array.isArray(quizData) ? quizData : (quizData.questions || []);

    res.json(questions);

  } catch (error) {

    console.error("Quiz Error:", error.message);

    res.status(500).json({ error: "Failed to generate quiz" });

  }

});



// Evaluate Quiz Answers

app.post("/evaluate-quiz", async (req, res) => {

  try {

    const { questions, userAnswers } = req.body;



    if (!questions || !userAnswers) {

      return res.status(400).json({ error: "Missing questions or userAnswers" });

    }



    let score = 0;

    const results = questions.map((question, index) => {

      const userAnswer = userAnswers[index];

      const isCorrect = userAnswer === question.correctAnswer;

      if (isCorrect) score++;

      

      return {

        question: question.question,

        userAnswer,

        correctAnswer: question.correctAnswer,

        isCorrect,

        explanation: question.explanation

      };

    });



    const totalQuestions = questions.length;

    const percentage = Math.round((score / totalQuestions) * 100);



    res.json({

      score,

      totalQuestions,

      percentage,

      results

    });



  } catch (error) {

    console.error("QUIZ EVALUATION ERROR:", error);

    res.status(500).json({ error: "Failed to evaluate quiz" });

  }

});



// AI Tutor Endpoint - Conversational mode with history (Groq, GROQ_API_KEY)

const MAX_HISTORY_MESSAGES = 14; // ~7 exchanges, keep last 10-15 total



app.post("/ai-tutor", async (req, res) => {

  try {

    const groqKey = process.env.GROQ_API_KEY;

    if (!groqKey) {

      console.error("AI Tutor Error: GROQ_API_KEY is missing");

      return res.status(500).json({ reply: "AI Tutor is not configured. Set GROQ_API_KEY in backend .env." });

    }



    const { userMessage, message, weakTopics = [], learningVelocity, riskLevel, conversationHistory = [] } = req.body;

    const currentMessage = userMessage || message;



    if (!currentMessage || !String(currentMessage).trim()) {

      return res.status(400).json({ error: "Missing message or userMessage" });

    }



    const contextParts = [];

    if (Array.isArray(weakTopics) && weakTopics.length > 0) {

      contextParts.push(`The learner's weak topics to prioritize: ${weakTopics.join(", ")}. When relevant, gently guide them toward these areas.`);

    }

    if (learningVelocity != null) contextParts.push(`Learning velocity: ${learningVelocity}.`);

    if (riskLevel) contextParts.push(`Risk level: ${riskLevel}.`);

    const learnerContext = contextParts.length > 0 ? contextParts.join(" ") : "";



    const systemContent = `You are an intelligent learning mentor inside an adaptive learning platform.



Behave like:

- Coursera mentor

- Step-by-step teacher

- Ask guiding questions

- Encourage thinking

- Provide examples

- Keep responses structured



If student struggles:

- Break topic into smaller steps

- Give analogy

- Give mini practice question



Never give too long lecture.

Keep conversational.



${learnerContext ? `Internal context (use silently to tailor focus; do NOT mention velocity, risk level, or weak topics in your reply): ${learnerContext}` : ""}



Focus on programming, computer science, data structures, algorithms, and related concepts. Never mention "velocity", "risk level", or "weak topics" in your answers.`;



    const history = Array.isArray(conversationHistory)

      ? conversationHistory

          .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)

          .slice(-MAX_HISTORY_MESSAGES)

          .map((m) => ({ role: m.role, content: String(m.content).trim() }))

      : [];



    const messages = [

      { role: "system", content: systemContent },

      ...history,

      { role: "user", content: String(currentMessage).trim() },

    ];



    const groqTutor = new Groq({ apiKey: groqKey });

    const groqResponse = await groqTutor.chat.completions.create({

      model: "llama-3.1-8b-instant",

      messages,

      temperature: 0.7,

      max_tokens: 600,

    });



    const content = groqResponse.choices[0]?.message?.content || "";

    res.json({ reply: content.trim() || "No response from AI tutor." });

  } catch (error) {

    console.error("AI Tutor Error:", error.message);

    res.status(500).json({

      reply: "AI Tutor is temporarily unavailable. Please try again later.",

    });

  }

});



// Send Alert Email (Resend only, isolated from AI and quiz logic)

// Supports: Plateau Detection Alert, Streak Loss Warning, Daily Performance Summary

app.post("/send-alert-email", async (req, res) => {

  try {

    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {

      console.error("Email Error: RESEND_API_KEY is missing");

      return res.status(500).json({ error: "Email service is not configured" });

    }



    const { to, user_name, email_title, email_message, dynamic_content, email_type } = req.body;



    if (!to || !user_name || !email_title || !email_message) {

      return res.status(400).json({

        error: "Missing required fields: to, user_name, email_title, email_message",

      });

    }



    const resend = new Resend(apiKey);

    const fromAddress = "onboarding@resend.dev";



    const emailBody = [

      `Hi ${user_name || "Learner"},`,

      "",

      email_message,

      "",

      dynamic_content ? `Details:\n${dynamic_content}` : "",

    ]

      .filter(Boolean)

      .join("\n");



    const { data, error } = await resend.emails.send({

      from: fromAddress,

      to: Array.isArray(to) ? to : [to],

      subject: email_title,

      text: emailBody,

    });



    if (error) {

      console.error("Email Error:", error.message);

      return res.status(500).json({ error: error.message || "Failed to send email" });

    }



    res.json({ success: true });

  } catch (error) {

    console.error("Email Error:", error.message);

    res.status(500).json({ error: "Failed to send email" });

  }

});



// Analyze Performance (AI-powered, accepts currentQuiz+previousQuizzes or quizAttempts+topics)

app.post("/analyze-performance", async (req, res) => {

  try {

    let quizAttempts = req.body.quizAttempts;

    let topics = req.body.topics || {};



    // Support frontend format: currentQuiz + previousQuizzes

    if (req.body.currentQuiz && req.body.previousQuizzes) {

      const prev = req.body.previousQuizzes.map((p) => ({ score: p.overallScore || 0 }));

      quizAttempts = [...prev, { score: req.body.currentQuiz.overallScore || 0 }];

      const rawTopics = req.body.currentQuiz.topics || {};

      Object.entries(rawTopics).forEach(([topic, stats]) => {

        const total = Number(stats.total || 0);

        const correct = Number(stats.correct || 0);

        topics[topic] = {

          correct,

          total,

          accuracy: total > 0 ? (correct / total) * 100 : 0,

        };

      });

    }



    if (!quizAttempts || quizAttempts.length === 0) {

      return res.status(400).json({ error: "Missing quizAttempts or currentQuiz" });

    }



    const scores = quizAttempts.map((a) => Number(a.score || a.overallScore || 0));

    const totalQuizzes = scores.length;

    const averageScore = scores.reduce((s, v) => s + v, 0) / totalQuizzes;

    const latestScore = scores[scores.length - 1] || 0;



    // Compute slope (learning velocity)

    let learningVelocityNum = 0;

    if (scores.length >= 2) {

      const first = scores[0];

      const last = scores[scores.length - 1];

      learningVelocityNum = (last - first) / (scores.length - 1);

    }



    const topicKeys = Object.keys(topics);

    const weakTopics = topicKeys.filter((t) => (topics[t]?.accuracy ?? 0) < 70);

    const strongTopics = topicKeys.filter((t) => (topics[t]?.accuracy ?? 0) > 80);

    const moderateTopics = topicKeys.filter(

      (t) => ((topics[t]?.accuracy ?? 0) >= 70 && (topics[t]?.accuracy ?? 0) <= 80)

    );



    const groqAnalyze = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const prompt = `You are an AI learning coach. Analyze this quiz performance and respond with ONLY valid JSON (no markdown, no extra text).



Data:

- Recent scores (oldest to newest): ${JSON.stringify(scores)}

- Average score: ${averageScore.toFixed(1)}

- Latest score: ${latestScore}

- Learning velocity (score change per quiz): ${learningVelocityNum.toFixed(2)}

- Weak topics (<70%): ${weakTopics.join(", ") || "None"}

- Strong topics (>80%): ${strongTopics.join(", ") || "None"}

- Moderate topics (70-80%): ${moderateTopics.join(", ") || "None"}



Return this exact JSON structure (all string values, keep it concise):

{

  "performanceSummary": "1-2 sentence overall summary",

  "learningVelocity": "1 sentence on trend (improving/declining/stable)",

  "trendAnalysis": "1-2 sentences on what the scores show",

  "riskLevel": "Low" or "Moderate" or "High",

  "weakTopics": [${weakTopics.map((t) => `"${t}"`).join(", ")}],

  "moderateTopics": [${moderateTopics.map((t) => `"${t}"`).join(", ")}],

  "strongTopics": [${strongTopics.map((t) => `"${t}"`).join(", ")}],

  "recommendedDifficulty": "Easy" or "Medium" or "Hard",

  "studyPlan": { "Focus Areas": "2-3 bullet points", "Daily Goal": "brief goal", "Review": "what to review" },

  "improvementStrategies": ["strategy 1", "strategy 2", "strategy 3"],

  "motivation": "1 short encouraging sentence"

}`;



    const response = await groqAnalyze.chat.completions.create({

      model: "llama-3.1-8b-instant",

      messages: [{ role: "user", content: prompt }],

      temperature: 0.6,

      max_tokens: 1200,

    });



    const content = response.choices[0].message.content;

    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {

      // Fallback to basic insights if AI fails

      return res.json({

        performanceSummary: `Latest score: ${latestScore}. Average: ${averageScore.toFixed(0)}%.`,

        learningVelocity: learningVelocityNum >= 1 ? "Improving" : learningVelocityNum <= -1 ? "Declining" : "Stable",

        trendAnalysis: `You have taken ${totalQuizzes} quiz(zes).`,

        riskLevel: latestScore < 50 ? "High" : latestScore < 70 ? "Moderate" : "Low",

        weakTopics,

        moderateTopics,

        strongTopics,

        recommendedDifficulty: latestScore >= 80 ? "Hard" : latestScore >= 60 ? "Medium" : "Easy",

        studyPlan: { "Focus Areas": weakTopics.join(", ") || "General practice", "Daily Goal": "Complete one quiz", "Review": "Weak topics" },

        improvementStrategies: ["Practice weak topics", "Review wrong answers", "Try consistent daily practice"],

        motivation: "Keep going! Consistent practice leads to improvement.",

      });

    }



    const aiInsights = JSON.parse(jsonMatch[0]);

    res.json(aiInsights);

  } catch (error) {

    console.error("Analyze Performance Error:", error.message);

    res.status(500).json({ error: "Failed to analyze performance" });

  }

});



// Explain Wrong Answers

app.post("/explain-wrong", async (req, res) => {

  try {

    const { wrongAnswers } = req.body;



    if (!wrongAnswers) {

      return res.status(400).json({ error: "Missing wrongAnswers" });

    }



    const groqExplain = new Groq({ apiKey: process.env.GROQ_API_KEY });



    const prompt = `Explain these incorrect answers. For each, say why the user's answer is wrong, why the correct answer is right, and a key concept. Keep each under 100 words.



${wrongAnswers.map((item, index) =>

  `${index + 1}. Q: ${item.question}\n   User: ${item.userAnswer} | Correct: ${item.correctAnswer}`

).join('\n\n')}



Return ONLY a JSON array of strings, one per question, in order. Example: ["explanation 1", "explanation 2"]

No other text.`;



    const response = await groqExplain.chat.completions.create({

      model: "llama-3.1-8b-instant",

      messages: [{ role: "user", content: prompt }],

      temperature: 0.7,

      max_tokens: 1000,

    });



    let explanations = [];

    const content = response.choices[0].message.content;

    const arrMatch = content.match(/\[[\s\S]*\]/);

    if (arrMatch) {

      try {

        explanations = JSON.parse(arrMatch[0]);

      } catch (_) {}

    }

    if (!Array.isArray(explanations) || explanations.length < wrongAnswers.length) {

      explanations = wrongAnswers.map(() => content || "Explanation unavailable.");

    }

    res.json({ explanations });

  } catch (error) {

    console.error("Explain Wrong Error:", error.message);

    res.status(500).json({ error: "Failed to generate explanations" });

  }

});



// AI Study Plan Suggestion (Groq) - for weak topics in Performance Analytics
app.post("/suggest-study-plan", async (req, res) => {
  try {
    const { weakTopics } = req.body;
    if (!weakTopics || weakTopics.length === 0) {
      return res.status(400).json({ error: "No weak topics provided" });
    }

    const groqStudy = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const prompt = `You are an expert CS tutor. A student is weak in these topics: ${weakTopics.join(", ")}.

For EACH weak topic, suggest 2 high-quality study resources.

Return ONLY this exact JSON array, no markdown, no extra text:
[
  {
    "weakTopic": "topic name",
    "name": "Resource title",
    "description": "One sentence description of what this resource covers",
    "url": "https://actual-working-url.com",
    "type": "Video/Article/Course/Documentation",
    "tip": "One short study tip for this topic"
  }
]

Use REAL URLs from: MDN, GeeksForGeeks, W3Schools, YouTube, freeCodeCamp, Khan Academy, CS50, MIT OpenCourseWare, Coursera, or official docs.
Return only valid JSON array. No other text.`;

    const response = await groqStudy.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      max_tokens: 1500,
    });

    const content = response.choices[0].message.content;
    const arrMatch = content.match(/\[[\s\S]*\]/);
    if (!arrMatch) {
      return res.status(500).json({ error: "Failed to parse AI response" });
    }

    const studyPlan = JSON.parse(arrMatch[0]);
    res.json(studyPlan);
  } catch (error) {
    console.error("Study Plan Error:", error.message);
    res.status(500).json({ error: "Failed to generate study plan" });
  }
});

app.listen(PORT, () => {

  console.log(`Server running on port ${PORT}`);

});

