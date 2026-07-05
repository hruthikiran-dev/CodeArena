// This is a centralized error handler — one place that handles ALL errors
// Instead of writing res.status(500) in every single route, we just call next(error)
// and Express automatically sends it here

// The 4-parameter signature (err, req, res, next) is how Express knows
// this is an error handler, not a regular middleware — don't remove "next" even
// if we don't use it, Express needs to see all 4 params
function errorHandler(err, req, res, next) {

  // Log the full error in the server terminal so we can debug
  console.error("❌ Error:", err.message);

  // MongoDB invalid ID format — e.g. /problems/notanid
  // CastError happens when mongoose can't convert a string to a MongoDB ObjectId
  if (err.name === "CastError") {
    return res.status(400).json({ error: "Invalid ID format" });
  }

  // MongoDB duplicate key — e.g. signing up with an existing email
  if (err.code === 11000) {
    return res.status(400).json({ error: "That username or email is already taken" });
  }

  // MongoDB validation error — e.g. missing required field on a model
  if (err.name === "ValidationError") {
    return res.status(400).json({ error: err.message });
  }

  // JWT errors — invalid or expired token
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ error: "Invalid token — please log in again" });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ error: "Token expired — please log in again" });
  }

  // SQLite foreign key error — submitting with a user that doesn't exist in DB
  if (err.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
    return res.status(400).json({ error: "Invalid user — please log out and log in again" });
  }

  // Generic fallback for anything we didn't specifically handle above
  // err.status is used if the error came with a status code, otherwise default to 500
  const status = err.status || 500;
  const message = err.message || "Something went wrong on the server";

  res.status(status).json({ error: message });
}

module.exports = { errorHandler };