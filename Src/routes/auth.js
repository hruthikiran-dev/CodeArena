const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");     // for hashing passwords
const jwt = require("jsonwebtoken");    // for creating tokens
const { db } = require("../database"); // our SQL database

// ---------------------------------------------------------------------------
// POST /auth/signup — create a new account
// ---------------------------------------------------------------------------
// "next" is added as third parameter so we can pass errors to the centralized handler
router.post("/signup", async (req, res, next) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "Please provide username, email and password" });
  }

  try {
    // Hash the password before saving — never store plain text passwords
    // "10" is the salt rounds — how many times to scramble it. 10 is the standard.
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save the user to SQL using a prepared statement
    // The ? marks are placeholders — prevents SQL injection attacks
    const stmt = db.prepare(`
      INSERT INTO users (username, email, password)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(username, email, hashedPassword);
    // result.lastInsertRowid gives us the auto-generated id of the new user

    // Create a JWT token — stores the user's id and username inside it
    // expiresIn: "7d" means they stay logged in for 7 days
    const token = jwt.sign(
      { id: result.lastInsertRowid, username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 201 = "Created successfully"
    res.status(201).json({
      message: "Account created successfully!",
      token,
      user: { id: result.lastInsertRowid, username, email }
    });

  } catch (error) {
    // Pass error to centralized handler instead of handling it here
    // The errorHandler middleware will figure out what kind of error it is
    next(error);
  }
});

// ---------------------------------------------------------------------------
// POST /auth/login — log into an existing account
// ---------------------------------------------------------------------------
router.post("/login", async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Please provide email and password" });
  }

  try {
    // Look up the user by email in SQL
    // .get() returns one matching row, or undefined if not found
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

    if (!user) {
      // We say "email or password" — never tell exactly which one was wrong
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // bcrypt.compare() hashes the input and checks if it matches the stored hash
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Password correct — create and return a token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "Logged in successfully!",
      token,
      user: { id: user.id, username: user.username, email: user.email }
    });

  } catch (error) {
    // Pass to centralized error handler
    next(error);
  }
});

module.exports = router;