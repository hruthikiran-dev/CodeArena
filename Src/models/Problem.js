const mongoose = require("mongoose");

// A "schema" is just a blueprint — it defines what fields a Problem has
// and what type each field is. MongoDB will enforce this shape.
const problemSchema = new mongoose.Schema({

  title: {
    type: String,
    required: true  // every problem MUST have a title
  },

  description: {
    type: String,
    required: true  // the problem statement ("Given an array, return the largest number...")
  },

  difficulty: {
    type: String,
    enum: ["Easy", "Medium", "Hard"], // only these three values are allowed
    required: true
  },

  // testCases is an ARRAY — one problem can have multiple test cases
  // e.g. test case 1: input "3 1 4", expected output "4"
  //      test case 2: input "9 2 7", expected output "9"
  testCases: [
    {
      input: { type: String, required: true },    // what gets fed into the program
      expectedOutput: { type: String, required: true } // what the program should print
    }
  ],

  // When was this problem created? MongoDB fills this in automatically
  createdAt: {
    type: Date,
    default: Date.now
  }

});

// "Problem" becomes the MongoDB collection name (stored as "problems" in the DB)
// Think of a collection like a table in SQL
module.exports = mongoose.model("Problem", problemSchema);