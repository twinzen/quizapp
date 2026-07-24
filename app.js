// Shared helpers for parsing the QUIZ_*.txt question bank format:
// Question Num|Question|Option-A|Option-B|...|Option-N|Answer|Explanation|
// The number of options is read from the header row, so banks with 4, 5,
// or more options are all supported.
//
// Since each question is a single line in the file, a literal "\n" (the two
// characters backslash + n, not an actual newline) can be used inside a
// field to force a line break when rendered — handy for multi-step
// explanations. See renderInline().

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Renders **bold** spans and literal "\n" line breaks inside already-escaped text.
function renderInline(str) {
  return escapeHtml(str)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\\n/g, "<br>");
}

// A Question field may optionally use "Subtitle::Main question" to show
// a small tag line above the main question text (as in the quiz screenshot).
function splitQuestion(raw) {
  const idx = raw.indexOf("::");
  if (idx === -1) {
    return { subtitle: "", main: raw };
  }
  return { subtitle: raw.slice(0, idx).trim(), main: raw.slice(idx + 2).trim() };
}

function parseQuizBank(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  // The header row's "Option-X" columns tell us how many options (and
  // which letters) this bank uses, e.g. A-D or A-E.
  const header = lines[0].split("|");
  let optionLetters = header
    .filter((h) => /^Option-[A-Z]$/i.test(h.trim()))
    .map((h) => h.trim().slice(-1).toUpperCase());
  if (optionLetters.length === 0) {
    optionLetters = ["A", "B", "C", "D"];
  }

  const rows = lines.slice(1);

  return rows.map((line) => {
    const cols = line.split("|");
    const options = {};
    optionLetters.forEach((letter, i) => {
      options[letter] = (cols[2 + i] || "").trim();
    });
    const answer = cols[2 + optionLetters.length];
    const explanation = cols[3 + optionLetters.length];
    return {
      num: (cols[0] || "").trim(),
      question: (cols[1] || "").trim(),
      options,
      optionLetters,
      answer: (answer || "").trim().toUpperCase(),
      explanation: (explanation || "").trim(),
    };
  });
}

async function fetchQuizBank(file) {
  const res = await fetch(file, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to load ${file} (HTTP ${res.status})`);
  }
  const text = await res.text();
  return parseQuizBank(text);
}

function quizDisplayNameFromFile(file) {
  return file.replace(/^QUIZ_/, "").replace(/\.txt$/i, "").replace(/_/g, " ");
}

// Fisher-Yates shuffle, returns a new array without mutating the input.
function shuffle(arr) {
  const result = arr.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Randomly picks `count` questions from the bank. If count is falsy or
// exceeds the bank size, all questions are used (shuffled).
function pickRandomQuestions(questions, count) {
  const shuffled = shuffle(questions);
  if (!count || count >= shuffled.length) return shuffled;
  return shuffled.slice(0, count);
}
