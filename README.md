# Quiz App

A small static website for practice quizzes, writing reports and a writing dictionary. It is plain HTML, CSS and JavaScript with no build step and no dependencies.

## Run locally

The pages load their content (`quizzes.json`, `QUIZ_*.txt` and so on) with `fetch`, and browsers block that when a page is opened straight from disk. Opening `index.html` by double-clicking it won't work, so serve the folder with a local web server instead.

Python 3 includes one. From the project folder, run:

```sh
cd quiz-app
python3 -m http.server 8000
```

Then open <http://localhost:8000> in your browser.

- To use a different port, change `8000` (for example `python3 -m http.server 8080`).
- To stop the server, press `Ctrl+C` in the terminal.
- On Windows, use `python` or `py` if `python3` isn't found.
- To open the site from another device on the same network (a phone or tablet, say), run `python3 -m http.server 8000 --bind 0.0.0.0` and go to `http://<your-computer's-IP>:8000`.

Files are fetched with `cache: "no-store"`, so after you edit a quiz or report you only need to refresh the page. There's no need to restart the server.

## Pages

| Page | What it does |
| --- | --- |
| `index.html` | Home page, with tabs for quizzes, writing reports and the dictionary |
| `quiz.html?file=QUIZ_....txt` | Runs one quiz |
| `report.html?file=REPORT_....txt` | Shows one marked writing report |
| `dictionary.html` | Browses the writing dictionary |

## Project layout

```
index.html, quiz.html, report.html, dictionary.html   pages
app.js                 parsing helpers for quiz and report files
style.css              styles shared by all pages
quizzes.json           list of quizzes shown on the home page
reports.json           list of writing reports shown on the home page
dictionary.json        index of dictionary sections, categories and topics
QUIZ_*.txt             question banks
REPORT_*.txt           marked writing reports
figures/               images used by quiz questions
dictionary/            dictionary topic files (see dictionary/README.md)
PROMPT_TEMPLATE.md     prompts for generating REPORT_*.txt files
```

## Adding a quiz

1. Create a `QUIZ_<Name>.txt` file. Each line is one question, with fields separated by `|`:

   ```
   Question_Num|Question|Option-A|Option-B|Option-C|Option-D|Answer|Explanation|
   1|x ÷ 7 + 4 = 5|8|63|7|31|C|Subtract 4, then multiply by 7 -> x = 7.|
   ```

   - The header row sets how many options there are, so 4, 5 or more all work.
   - You can add `Feedback-A|Feedback-B|...` columns to explain why each option is right or wrong.
   - Inside a field, `**bold**` makes text bold and a literal `\n` starts a new line.
   - To show an image above a question, put `[figure:figures/<folder>/<image>.svg]` at the start of the Question field.

2. Add an entry to `quizzes.json`:

   ```json
   {
     "file": "QUIZ_<Name>.txt",
     "name": "Display name",
     "description": "One-line description",
     "number_of_questions": 10,
     "category": "Math"
   }
   ```

   `category` must be one of the tabs listed in `CATEGORIES` in `index.html` (currently `English`, `Math` and `Problem Solving`). To add a new tab, add its name to that list.

## Adding a writing report

1. Create a `REPORT_<Title>.txt` file. `PROMPT_TEMPLATE.md` explains the format and has the prompts used to generate it.
2. Add an entry to `reports.json` with `file`, `name`, `date`, `writtenBy` and `year`.

## Adding a dictionary topic

See [dictionary/README.md](dictionary/README.md).
