// dotenv MUST be the very first line — loads .env file into process.env
require("dotenv").config();

// ── Imports — in this exact order ──
const express = require("express");
const path = require("path");

// MongoDB connection function
const { connectDB } = require("./db");

// Judge function — compiles and runs submitted code
const { runCode } = require("./judge");

// Problem model — blueprint for problems stored in MongoDB
const Problem = require("./models/Problem");

// Auth routes (signup/login) and JWT checker middleware
const authRoutes = require("./routes/auth");
const { authMiddleware } = require("./middleware/auth");

// Centralized error handler — handles all errors from all routes
const { errorHandler } = require("./middleware/errorHandler");

// SQLite — imported last, after express is set up
const { db, initializeDatabase } = require("./database");

// ── Create the Express app ──
const app = express();

// Parse incoming JSON so req.body works in all routes
app.use(express.json());

// Serve everything in public/ as static files
// path.join + __dirname makes the path absolute so it works anywhere
// __dirname = Src/ folder, "../public" = one level up into CodeArena/public/
app.use(express.static(path.join(__dirname, "../public")));

// Mount auth routes — handles /auth/signup and /auth/login
app.use("/auth", authRoutes);

// ---------------------------------------------------------------------------
// ROUTE 1: POST /problems — add a new problem to MongoDB
// ---------------------------------------------------------------------------
// "next" is the third parameter — lets us pass errors to the centralized handler
app.post("/problems", async (req, res, next) => {
  const { title, description, difficulty, testCases } = req.body;

  try {
    // Create a new Problem using our Mongoose model
    // new Problem() builds it in memory, .save() writes it to MongoDB
    const problem = new Problem({ title, description, difficulty, testCases });
    await problem.save();

    // 201 = "Created successfully"
    res.status(201).json({ message: "Problem created!", problem });

  } catch (error) {
    // Instead of handling the error here, pass it to the centralized handler
    // errorHandler middleware will figure out what kind of error it is
    next(error);
  }
});

// ---------------------------------------------------------------------------
// ROUTE 2: GET /problems — fetch all problems for the list page
// ---------------------------------------------------------------------------
app.get("/problems", async (req, res, next) => {
  try {
    // .find({}) = get everything, no filter
    // .select() = only return these 3 fields — skip testCases for the list view
    const problems = await Problem.find({}).select("title difficulty createdAt");
    res.status(200).json(problems);

  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// ROUTE 3: GET /problems/:id — fetch one specific problem by its MongoDB ID
// ":id" is a URL parameter — /problems/abc123 sets req.params.id = "abc123"
// ---------------------------------------------------------------------------
app.get("/problems/:id", async (req, res, next) => {
  try {
    // findById() searches MongoDB for exactly this ID
    // If the ID format is invalid, mongoose throws a CastError
    // — our errorHandler catches that and returns "Invalid ID format"
    const problem = await Problem.findById(req.params.id);

    if (!problem) {
      // 404 = "Not Found" — the ID was valid format but nothing matched
      return res.status(404).json({ error: "Problem not found" });
    }

    res.status(200).json(problem);

  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// ROUTE 4: POST /submit — judge a code submission
// authMiddleware runs first, verifies the JWT token, then this route runs
// ---------------------------------------------------------------------------
app.post("/submit", authMiddleware, async (req, res, next) => {
  const { code, problemId } = req.body;

  // req.user is set by authMiddleware — contains { id, username } of logged in user
  const userId = req.user.id;

  if (!code || !problemId) {
    return res.status(400).json({ error: "Please send both 'code' and 'problemId'" });
  }

  try {
    const problem = await Problem.findById(problemId);
    if (!problem) return res.status(404).json({ error: "Problem not found" });

    let finalVerdict = "Accepted"; // assume correct until a test case fails
    let failedOn = null;
    let failDetails = null;

    // Run code against every test case — stop immediately at first failure
    for (const testCase of problem.testCases) {
      // runCode() from judge.js — compiles, runs, compares output, returns verdict
      const result = await runCode(code, testCase.expectedOutput, testCase.input);

      if (result.verdict !== "Accepted") {
        finalVerdict = result.verdict;
        failedOn = testCase.input;
        failDetails = result;
        break;
      }
    }

    // Save submission to SQL — stores full history, not just correct ones
    // This powers the leaderboard and submission history
    const stmt = db.prepare(`
      INSERT INTO submissions (user_id, problem_id, code, verdict)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(userId, problemId, code, finalVerdict);

    if (finalVerdict !== "Accepted") {
      return res.status(200).json({
        verdict: finalVerdict,
        failedOn,
        details: failDetails
      });
    }

    res.status(200).json({
      verdict: "Accepted",
      passedAll: true,
      totalTestCases: problem.testCases.length
    });

  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// ROUTE 5: GET /leaderboard — rank users by accepted submissions
// ---------------------------------------------------------------------------
app.get("/leaderboard", (req, res, next) => {
  try {
    // SQL JOIN query — combines users and submissions tables
    // COUNT = how many accepted submissions per user
    // LEFT JOIN = include users even if they have zero accepted submissions
    // ORDER BY solved DESC = highest count first
    const leaderboard = db.prepare(`
      SELECT
        u.username,
        COUNT(s.id) as solved,
        MAX(s.created_at) as last_submission
      FROM users u
      LEFT JOIN submissions s
        ON u.id = s.user_id
        AND s.verdict = 'Accepted'
      GROUP BY u.id, u.username
      ORDER BY solved DESC
      LIMIT 10
    `).all();

    res.status(200).json(leaderboard);

  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// 404 handler — catches any request that didn't match a route above
// Express runs middleware top to bottom — if we reach here, nothing matched
// ---------------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
});

// ---------------------------------------------------------------------------
// Centralized error handler — MUST be last, after all routes
// Any route that calls next(error) ends up here
// Express identifies it as an error handler by the 4-parameter signature
// ---------------------------------------------------------------------------
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Start the server
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 3000;

// Connect to MongoDB first, initialize SQL tables, then start listening
connectDB().then(() => {
  initializeDatabase();
  app.listen(PORT, () => {
    console.log(`✅ CodeArena server running on http://localhost:${PORT}`);
  });
});