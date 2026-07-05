const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  username:  { type: String, required: true },
  problemId: { type: String, required: true },
  code:      { type: String, required: true },
  verdict:   { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Submission", submissionSchema);