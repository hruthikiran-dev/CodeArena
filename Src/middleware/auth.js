// jsonwebtoken lets us create and verify JWT tokens
const jwt = require("jsonwebtoken");

// This is middleware — a function that sits between the request and the route
// It runs BEFORE the actual route handler
// Think of it as a bouncer at a club — checks your ID before letting you in
function authMiddleware(req, res, next) {

  // The token comes in the request "headers" — extra info sent alongside the request
  // Convention is to send it as: Authorization: Bearer eyJhbGc...
  const authHeader = req.headers["authorization"];

  // If no authorization header was sent at all, reject immediately
  if (!authHeader) {
    return res.status(401).json({ error: "No token provided. Please log in." });
    // 401 = "Unauthorized" — you need to be logged in to do this
  }

  // The header looks like "Bearer eyJhbGc..."
  // We split by space and take the second part — the actual token
  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Invalid token format." });
  }

  // jwt.verify() checks two things:
  // 1. Was this token created by our server (using our JWT_SECRET)?
  // 2. Has it expired?
  // If both pass, it gives us back the data we stored inside the token
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Invalid or expired token. Please log in again." });
    }

    // decoded contains whatever we put in the token when we created it
    // We'll store { id, username } in the token — so now we know who this user is
    // We attach it to req.user so the route handler can access it
    req.user = decoded;

    // next() means "ok this person is legit, continue to the actual route"
    next();
  });
}

module.exports = { authMiddleware };