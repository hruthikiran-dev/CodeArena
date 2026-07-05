// // We need two built-in Node.js tools:
// // "exec" - to run terminal commands (compile + run the code)
// // "fs"   - to read and write files (we'll save the submitted code to a temp file)
// const { exec } = require("child_process");
// const fs = require("fs");
// const path = require("path"); // helps us build file paths that work on any OS

// // ---------------------------------------------------------------------------
// // This is our main judge function.
// // It takes:
// //   - code           : the C++ code as a plain string (what the user typed)
// //   - expectedOutput : the correct answer, also as a string (e.g. "9")
// // It returns a Promise that resolves to a verdict object like:
// //   { verdict: "Accepted" } or { verdict: "Wrong Answer" } etc.
// //
// // Why a Promise? Because compiling and running takes time. A Promise lets us
// // say "start this job, and when it's done, give me the result" without
// // freezing the entire server while waiting.
// // ---------------------------------------------------------------------------
// function runCode(code, expectedOutput) {
//   return new Promise((resolve) => {

//     // --- Step 1: Save the submitted code to a temporary file ---
//     // We can't compile a string directly. g++ needs an actual file.
//     // So we create a temp file, write the code into it, then compile that file.
//     // "path.join" builds the file path correctly whether you're on Mac/Windows/Linux
//     const tempDir = path.join(__dirname, "temp"); // __dirname = the folder THIS file is in
//     const fileName = `solution_${Date.now()}.cpp`; // unique name using timestamp so two
//                                                     // submissions don't overwrite each other
//     const filePath = path.join(tempDir, fileName);             // full path to the .cpp file
//     const outputPath = path.join(tempDir, fileName + ".out"); // full path to the compiled program

//     // Create the temp folder if it doesn't exist yet
//     // { recursive: true } means "don't crash if the folder already exists"
//     fs.mkdirSync(tempDir, { recursive: true });

//     // Write the user's code string into the .cpp file
//     fs.writeFileSync(filePath, code);

//     // --- Step 2: Compile the .cpp file ---
//     const compileCommand = `g++ ${filePath} -o ${outputPath}`;
//     // This is exactly what you'd type in terminal: g++ solution.cpp -o solution.out

//     exec(compileCommand, (compileError, _, compileStderr) => {
//       // If compileError exists → the code had syntax errors, couldn't compile
//       if (compileError) {
//         cleanup(filePath, outputPath); // delete the temp files (explained below)
//         return resolve({
//           verdict: "Compilation Error",
//           details: compileStderr // the actual compiler error message
//         });
//       }

//       // --- Step 3: Run the compiled program ---
//       // We set a timeout of 5 seconds. If the program runs longer than that,
//       // we kill it — this is how we handle infinite loops (Time Limit Exceeded)
//       // We use "exec" but pipe the input to the program via stdin
// // This is like typing "3 9 5" into the terminal yourself after running the program
//       const runProcess = exec(outputPath, { timeout: 5000 }, (runError, runStdout, runStderr) => {

//         // If runError AND the error is a timeout (killed = true), it means
//         // the program ran too long — classic infinite loop situation
//         if (runError && runError.killed) {
//           cleanup(filePath, outputPath);
//           return resolve({ verdict: "Time Limit Exceeded" });
//         }

//         // If runError for any other reason → program crashed while running
//         if (runError) {
//           cleanup(filePath, outputPath);
//           return resolve({
//             verdict: "Runtime Error",
//             details: runStderr
//           });
//         }

//         // --- Step 4: Compare output to expected answer ---
//         const actualOutput = runStdout.trim(); // .trim() removes trailing newlines/spaces
//         const expected = expectedOutput.trim();

//         cleanup(filePath, outputPath); // clean up temp files before returning

//         if (actualOutput === expected) {
//           return resolve({ verdict: "Accepted" });
//         } else {
//           return resolve({
//             verdict: "Wrong Answer",
//             expected: expected,
//             got: actualOutput
//           });
//         }
//       });
//     });
//   });
// }

// // ---------------------------------------------------------------------------
// // cleanup() - deletes the temporary files we created
// // We don't want the server's hard drive filling up with thousands of
// // temp .cpp and .out files from every submission ever made
// // ---------------------------------------------------------------------------
// function cleanup(filePath, outputPath) {
//   // "try" because the file might not exist if compilation failed early
//   try { fs.unlinkSync(filePath); } catch {}    // delete the .cpp file
//   try { fs.unlinkSync(outputPath); } catch {}  // delete the compiled output file
// }

// // Export the function so other files can use it
// // (just like how you "import" things — this is the "export" side)
// module.exports = { runCode };




const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

// Added "input" as a third parameter — this is the test case input
// e.g. "3 9 5" for the "find largest number" problem
function runCode(code, expectedOutput, input = "") {
  return new Promise((resolve) => {

    const tempDir = path.join(__dirname, "temp");
    const fileName = `solution_${Date.now()}.cpp`;
    const filePath = path.join(tempDir, fileName);
    const outputPath = path.join(tempDir, fileName + ".out");

    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(filePath, code);

    const compileCommand = `g++ ${filePath} -o ${outputPath}`;

    exec(compileCommand, (compileError, _, compileStderr) => {
      if (compileError) {
        cleanup(filePath, outputPath);
        return resolve({ verdict: "Compilation Error", details: compileStderr });
      }

      // Run the compiled program
      const runProcess = exec(
        outputPath,
        { timeout: 5000 },
        (runError, runStdout, runStderr) => {

          if (runError && runError.killed) {
            cleanup(filePath, outputPath);
            return resolve({ verdict: "Time Limit Exceeded" });
          }

          if (runError) {
            cleanup(filePath, outputPath);
            return resolve({ verdict: "Runtime Error", details: runStderr });
          }

          const actualOutput = runStdout.trim();
          const expected = expectedOutput.trim();
          cleanup(filePath, outputPath);

          if (actualOutput === expected) {
            return resolve({ verdict: "Accepted" });
          } else {
            return resolve({ verdict: "Wrong Answer", expected, got: actualOutput });
          }
        }
      );

      // Feed the test case input into the program
      // Without this, programs using "cin" wait forever for input → Time Limit Exceeded
      runProcess.stdin.write(input + "\n");
      runProcess.stdin.end();
    });
  });
}

function cleanup(filePath, outputPath) {
  try { fs.unlinkSync(filePath); } catch {}
  try { fs.unlinkSync(outputPath); } catch {}
}

module.exports = { runCode };