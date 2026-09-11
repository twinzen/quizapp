// Shared helpers for parsing the QUIZ_*.txt question bank format:
// Question Num|Question|Option-A|Option-B|...|Option-N|Answer|Explanation|Feedback-A|Feedback-B|...|Feedback-N|
// The number of options is read from the header row, so banks with 4, 5,
// or more options are all supported. The trailing Feedback-X columns are
// optional — banks without them just parse with an empty feedback map.
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

// Renders **bold** spans, literal "\n" line breaks, "(expr)/N" fractions
// (e.g. "(3x + 49)/5"), and simple "N/D" fractions (e.g. "3/5") as stacked
// numerator-over-denominator spans, inside already-escaped text. Also turns
// the \u0001..\u0002 highlight markers left by markMistakes() into <mark>
// spans — those control characters pass through escapeHtml() untouched.
function renderInline(str) {
  return escapeHtml(str)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\\n/g, "<br>")
    .replace(/\r?\n/g, "<br>")
    .replace(
      /\(([^()]+)\)\s*\/\s*(\d+)/g,
      '<span class="frac"><span class="frac-num">$1</span><span class="frac-den">$2</span></span>'
    )
    .replace(
      /(\d+)\/(\d+)/g,
      '<span class="frac"><span class="frac-num">$1</span><span class="frac-den">$2</span></span>'
    )
    .replace(/\u0001/g, '<mark class="mistake-highlight">')
    .replace(/\u0002/g, "</mark>");
}

// Like renderInline(), but skips the fraction stacking — for text where a
// "7/10" should read as plain text (e.g. a report score) rather than a
// math fraction.
function renderPlainInline(str) {
  return escapeHtml(str)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\\n/g, "<br>")
    .replace(/\r?\n/g, "<br>");
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

  // Optional "Feedback-X" columns hold, per option, why that specific
  // option is wrong (e.g. the meaning of the word a student picked).
  const feedbackLetters = header
    .filter((h) => /^Feedback-[A-Z]$/i.test(h.trim()))
    .map((h) => h.trim().slice(-1).toUpperCase());

  const rows = lines.slice(1);

  return rows.map((line) => {
    const cols = line.split("|");
    const options = {};
    optionLetters.forEach((letter, i) => {
      options[letter] = (cols[2 + i] || "").trim();
    });
    const answer = cols[2 + optionLetters.length];
    const explanation = cols[3 + optionLetters.length];
    const feedback = {};
    feedbackLetters.forEach((letter, i) => {
      feedback[letter] = (cols[4 + optionLetters.length + i] || "").trim();
    });
    return {
      num: (cols[0] || "").trim(),
      question: (cols[1] || "").trim(),
      options,
      optionLetters,
      answer: (answer || "").trim().toUpperCase(),
      explanation: (explanation || "").trim(),
      feedback,
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

// ---------------------------------------------------------------------
// Writing report format: REPORT_*.txt
//
// A handful of "KEY: value" metadata lines, followed by [BLOCK]...[/BLOCK]
// sections. ORIGINAL_WRITING and REFERENCE_WRITING are free-form prose
// (blank line = new paragraph). MISTAKE and LEARNING_POINT blocks may
// repeat any number of times.
//
//   TITLE: My Trip to the Zoo
//   OVERALL_COMMENT: Good descriptive language, but watch subject-verb agreement.
//
//   [BREAKDOWN]
//   CONTENT_ORGANISATION: 16
//   VOCABULARY_DESCRIPTION: 14
//   SENTENCE_STRUCTURE_STYLE: 15
//   GRAMMAR: 12
//   MECHANICS_FORMATTING: 16
//   [/BREAKDOWN]
//
//   [ORIGINAL_WRITING]
//   Paragraph one...
//
//   Paragraph two...
//   [/ORIGINAL_WRITING]
//
//   [MISTAKE]
//   WRONG: he go to the zoo
//   CORRECT: he goes to the zoo
//   DESCRIPTION: Subject-verb agreement — "he" needs "goes", not "go".
//   [/MISTAKE]
//
//   [REFERENCE_WRITING]
//   Sample outstanding essay text...
//   [/REFERENCE_WRITING]
//
//   [LEARNING_POINT]
//   DESCRIPTION: Uses varied sentence openers instead of starting every
//   sentence with "I".
//   ORIGINAL: I went to the zoo. I saw a lion. I liked it.
//   BETTER_VERSION: At the zoo, I saw a lion. I liked it so much that...
//   [/LEARNING_POINT]
//
// The BREAKDOWN block scores five fixed categories, each worth 20% (max 20
// points), so the overall score always totals out of 100. Older reports
// without a BREAKDOWN block may instead use a plain "SCORE: 8/10" meta line,
// which is shown as-is.

// Fixed 20%-each categories that make up the breakdown score. Order here is
// the order they render in.
const REPORT_CATEGORIES = [
  { key: "CONTENT_ORGANISATION", label: "Content & Organisation" },
  { key: "VOCABULARY_DESCRIPTION", label: "Vocabulary & Description" },
  { key: "SENTENCE_STRUCTURE_STYLE", label: "Sentence Structure & Style" },
  { key: "GRAMMAR", label: "Grammar" },
  { key: "MECHANICS_FORMATTING", label: "Technical Accuracy" },
];
const REPORT_CATEGORY_MAX = 100 / REPORT_CATEGORIES.length; // 20 points each

// Splits the lines of a block into named fields, e.g. ["QUOTE: foo", "more foo",
// "EXPLANATION: bar"] with fieldNames ["QUOTE", "EXPLANATION"] becomes
// { QUOTE: "foo\nmore foo", EXPLANATION: "bar" }. A field's value keeps
// accumulating lines until the next known field tag appears.
function parseFieldedBlock(blockLines, fieldNames) {
  const fields = {};
  const tagPattern = new RegExp(`^(${fieldNames.join("|")}):\\s*(.*)$`);
  let current = null;
  let buffer = [];

  function flush() {
    if (current) fields[current] = buffer.join("\n").trim();
    buffer = [];
  }

  for (const line of blockLines) {
    const m = line.trim().match(tagPattern);
    if (m) {
      flush();
      current = m[1];
      buffer.push(m[2]);
    } else if (current) {
      buffer.push(line);
    }
  }
  flush();

  return fields;
}

function parseReportFile(text) {
  const lines = text.split(/\r?\n/);
  const meta = {};
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (trimmed === "") { i++; continue; }
    if (trimmed.startsWith("[")) break;
    const m = trimmed.match(/^([A-Z_]+):\s*(.*)$/);
    if (m) meta[m[1]] = m[2];
    i++;
  }

  const mistakes = [];
  const learningPoints = [];
  const breakdown = {};
  let originalWriting = "";
  let referenceWriting = "";

  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith("[") && !trimmed.startsWith("[/")) {
      const tag = trimmed.slice(1, -1);
      const closeTag = `[/${tag}]`;
      const blockLines = [];
      i++;
      while (i < lines.length && lines[i].trim() !== closeTag) {
        blockLines.push(lines[i]);
        i++;
      }
      i++; // skip the closing tag line
      const blockText = blockLines.join("\n").trim();

      if (tag === "ORIGINAL_WRITING") {
        originalWriting = blockText;
      } else if (tag === "REFERENCE_WRITING") {
        referenceWriting = blockText;
      } else if (tag === "MISTAKE") {
        // WRONG/CORRECT/DESCRIPTION is the current format; QUOTE/EXPLANATION
        // is the older format (still accepted, just without a CORRECT field).
        const fields = parseFieldedBlock(blockLines, ["WRONG", "CORRECT", "DESCRIPTION", "QUOTE", "EXPLANATION"]);
        mistakes.push({
          wrong: fields.WRONG || fields.QUOTE || "",
          correct: fields.CORRECT || "",
          description: fields.DESCRIPTION || fields.EXPLANATION || "",
        });
      } else if (tag === "LEARNING_POINT") {
        const fields = parseFieldedBlock(blockLines, ["DESCRIPTION", "ORIGINAL", "BETTER_VERSION"]);
        const hasFields = Object.keys(fields).length > 0;
        learningPoints.push({
          description: hasFields ? fields.DESCRIPTION || "" : blockText,
          original: fields.ORIGINAL || "",
          betterVersion: fields.BETTER_VERSION || "",
        });
      } else if (tag === "BREAKDOWN") {
        blockLines.forEach((line) => {
          const bm = line.trim().match(/^([A-Z_]+):\s*([\d.]+)/);
          if (bm) breakdown[bm[1]] = parseFloat(bm[2]);
        });
      }
    } else {
      i++;
    }
  }

  return {
    title: meta.TITLE || "",
    score: meta.SCORE || "",
    overallComment: meta.OVERALL_COMMENT || "",
    originalWriting,
    referenceWriting,
    mistakes,
    learningPoints,
    breakdown,
  };
}

// The breakdown score is only "complete" (and its 100-point total
// trustworthy) once every fixed category has a numeric value.
function hasCompleteBreakdown(breakdown) {
  return REPORT_CATEGORIES.every((c) => typeof breakdown[c.key] === "number" && !Number.isNaN(breakdown[c.key]));
}

function breakdownTotal(breakdown) {
  return REPORT_CATEGORIES.reduce((sum, c) => sum + (breakdown[c.key] || 0), 0);
}

async function fetchReport(file) {
  const res = await fetch(file, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to load ${file} (HTTP ${res.status})`);
  }
  const text = await res.text();
  return parseReportFile(text);
}

function reportDisplayNameFromFile(file) {
  return file.replace(/^REPORT_/, "").replace(/\.txt$/i, "").replace(/_/g, " ");
}

// Renders free-form prose as HTML paragraphs: a blank line starts a new
// paragraph, a single line break becomes <br>. Reuses renderInline() so
// **bold** highlighting still works inside report writing samples.
function renderParagraphs(text) {
  if (!text) return "";
  return text
    .split(/\n{2,}/)
    .map((para) => `<p>${renderInline(para)}</p>`)
    .join("");
}

// Finds each mistake's WRONG text inside the original writing as a plain
// (non-overlapping) substring match, longest first so a mistake fully
// contained inside another (e.g. "macaroon and slushie" inside the whole
// sentence it's part of) doesn't get double-marked.
function findMistakeRanges(text, mistakes) {
  const wrongs = [...new Set((mistakes || []).map((m) => m.wrong).filter(Boolean))].sort(
    (a, b) => b.length - a.length
  );
  const ranges = [];
  wrongs.forEach((wrong) => {
    let fromIndex = 0;
    let idx;
    while ((idx = text.indexOf(wrong, fromIndex)) !== -1) {
      const end = idx + wrong.length;
      const overlaps = ranges.some((r) => idx < r.end && end > r.start);
      if (!overlaps) ranges.push({ start: idx, end });
      fromIndex = idx + 1;
    }
  });
  return ranges.sort((a, b) => a.start - b.start);
}

// Wraps each matched mistake range in \u0001..\u0002 markers, which
// renderInline() later turns into <mark> spans (see renderInline()).
function markMistakes(text, mistakes) {
  const ranges = findMistakeRanges(text, mistakes);
  if (!ranges.length) return text;
  let result = "";
  let cursor = 0;
  ranges.forEach(({ start, end }) => {
    result += text.slice(cursor, start) + "\u0001" + text.slice(start, end) + "\u0002";
    cursor = end;
  });
  return result + text.slice(cursor);
}

// Like renderParagraphs(), but also highlights every mistake's WRONG text
// (see markMistakes()) — used for the "My Writing" panel so it lines up
// visually with the "Things to Fix" list.
function renderParagraphsWithHighlights(text, mistakes) {
  if (!text) return "";
  return markMistakes(text, mistakes)
    .split(/\n{2,}/)
    .map((para) => `<p>${renderInline(para)}</p>`)
    .join("");
}
