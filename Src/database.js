// better-sqlite3 is our SQLite library
// Unlike mongoose, it's synchronous (no async/await needed) which keeps things simple
const Database = require("better-sqlite3");
const path = require("path");

// This creates a file called "codearena.db" in your project root
// If the file doesn't exist, it creates it automatically
// If it already exists, it just opens it — safe to call every time the server starts
const db = new Database(path.join(__dirname, "../codearena.db"));

// This function creates our tables if they don't exist yet
// Think of tables like Excel sheets — each one holds one type of data
function initializeDatabase() {

  // USERS TABLE — stores everyone who signs up
  // Each user gets an auto-generated id, and their email must be unique
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // PRIMARY KEY = the unique identifier for each row (like MongoDB's _id)
  // AUTOINCREMENT = SQLite automatically assigns 1, 2, 3... so we don't have to
  // NOT NULL = this field is required, can't be empty
  // UNIQUE = no two users can have the same username or email
  // DEFAULT CURRENT_TIMESTAMP = automatically fills in the current date/time

  // SUBMISSIONS TABLE — every time someone submits code, we save it here
  // This lets us show a user their submission history and build a leaderboard
  db.exec(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      problem_id TEXT NOT NULL,
      code TEXT NOT NULL,
      verdict TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  // FOREIGN KEY = user_id must match an actual id in the users table
  // This is what makes it "relational" — submissions are linked to users
  // problem_id is TEXT because MongoDB IDs are strings, not numbers

  console.log("✅ SQL tables ready!");
}

// Export both the db connection and the init function
// db is exported so other files can run queries
// initializeDatabase is exported so server.js can call it on startup
module.exports = { db, initializeDatabase };