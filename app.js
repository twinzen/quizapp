// Shared helpers for parsing the QUIZ_*.txt question bank format:
// Question Num|Question|Option-A|Option-B|Option-C|Option-D|Answer|

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Renders **bold** spans inside already-escaped text.
function renderInline(str) {
  return escapeHtml(str).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
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

  // First line is the header, skip it.
  const rows = lines.slice(1);

  return rows.map((line) => {
    const cols = line.split("|");
    const [num, question, a, b, c, d, answer, explanation] = cols;
    return {
      num: (num || "").trim(),
      question: (question || "").trim(),
      options: {
        A: (a || "").trim(),
        B: (b || "").trim(),
        C: (c || "").trim(),
        D: (d || "").trim(),
      },
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
