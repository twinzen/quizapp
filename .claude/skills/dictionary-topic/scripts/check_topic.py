#!/usr/bin/env python3
"""Validate a Writing Dictionary topic file and, if it passes, rewrite it in the house layout.

Usage: python3 check_topic.py dictionary/<section-folder>/<category-folder>/<topic>.json [--no-format]
"""
import json
import sys
from collections import Counter
from pathlib import Path

RANGES = {
    ("words", "nouns"): (20, 40),
    ("words", "adjectives"): (20, 40),
    ("words", "verbs"): (20, 40),
    ("phrases", "nounsAndAdjectives"): (12, 24),
    ("phrases", "verbs"): (12, 24),
}
SENTENCES = 30
KEYS = ["section", "category", "topic", "vibes", "words", "phrases", "sentences"]
MAX_EXPLANATION_WORDS = 25


def find_index(path):
    for parent in path.resolve().parents:
        if (parent / "dictionary.json").is_file():
            return parent / "dictionary.json"
    return None


def check(path):
    errors = []
    try:
        d = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        return None, [f"Not valid JSON: {e}"]

    if list(d) != KEYS:
        errors.append(f"Top-level keys must be exactly {KEYS} in that order, found {list(d)}")
        if set(KEYS) - set(d):
            return d, errors

    index_path = find_index(path)
    allowed = []
    if index_path is None:
        errors.append("Could not find dictionary.json above this file")
    else:
        index = json.loads(index_path.read_text(encoding="utf-8"))
        allowed = [v["name"] for v in index.get("vibes", [])]
        rel = path.resolve().relative_to(index_path.parent).as_posix()
        section = next((s for s in index.get("sections", []) if s["name"] == d["section"]), None)
        category = None
        if section is None:
            errors.append(f'Section "{d["section"]}" is not in dictionary.json')
        else:
            category = next((c for c in section["categories"] if c["name"] == d["category"]), None)
            if category is None:
                errors.append(f'Category "{d["category"]}" is not in section "{d["section"]}" in dictionary.json')
        if category is not None:
            folder = f'dictionary/{section["folder"]}/{category["folder"]}'
            if path.resolve().parent != (index_path.parent / folder).resolve():
                errors.append(f'File should be in {folder}/ for "{d["section"]}" / "{d["category"]}"')
            entry = next((t for t in category["topics"] if t["file"] == rel), None)
            if entry is None:
                errors.append(f'Not registered: add {{"name": "{d["topic"]}", "file": "{rel}"}} to "{d["section"]}" / "{d["category"]}" in dictionary.json')
            elif entry["name"] != d["topic"]:
                errors.append(f'Topic name "{d["topic"]}" differs from "{entry["name"]}" in dictionary.json')

    lists = {(g, k): d[g].get(k) for (g, k) in RANGES}
    lists[("sentences",)] = d["sentences"]
    used = Counter()

    for where, entries in lists.items():
        label = ".".join(where)
        if not isinstance(entries, list):
            errors.append(f"{label}: missing or not a list")
            continue
        is_word = where[0] == "words"
        want = {"text", "vibe", "explanation"} if is_word else {"text", "vibe"}
        texts = Counter()
        for e in entries:
            if not isinstance(e, dict) or set(e) != want:
                errors.append(f"{label}: entry must have exactly {sorted(want)}: {json.dumps(e, ensure_ascii=False)}")
                continue
            text = e["text"]
            texts[text.strip().lower()] += 1
            used[e["vibe"]] += 1
            if not text.strip():
                errors.append(f"{label}: empty text")
            if allowed and e["vibe"] not in allowed:
                errors.append(f'{label}: "{text}" has unknown vibe "{e["vibe"]}" (allowed: {", ".join(allowed)})')
            if is_word:
                n = len(e["explanation"].split())
                if n == 0:
                    errors.append(f'{label}: "{text}" has an empty explanation')
                elif n > MAX_EXPLANATION_WORDS:
                    errors.append(f'{label}: explanation of "{text}" is {n} words; keep it short for a Year 2 reader')
            elif where[0] == "phrases" and text.rstrip().endswith("."):
                errors.append(f'{label}: phrase "{text}" should not end with a full stop')
            elif where[0] == "sentences" and text.rstrip()[-1:] not in ".!?":
                errors.append(f'{label}: sentence should end with punctuation: "{text}"')
        for text, n in texts.items():
            if n > 1:
                errors.append(f'{label}: "{text}" appears {n} times')
        if where in RANGES:
            lo, hi = RANGES[where]
            if not lo <= len(entries) <= hi:
                errors.append(f"{label}: has {len(entries)} entries, expected {lo}-{hi}")
        elif len(entries) != SENTENCES:
            errors.append(f"sentences: has {len(entries)} entries, expected {SENTENCES}")

    sentences = [e["text"].lower() for e in d["sentences"] if isinstance(e, dict) and "text" in e]
    for group in ("nounsAndAdjectives", "verbs"):
        for e in d["phrases"].get(group) or []:
            if isinstance(e, dict) and "text" in e and not any(e["text"].lower() in s for s in sentences):
                errors.append(f'phrases.{group}: "{e["text"]}" does not appear word for word in any sentence')

    expected_vibes = [v for v in allowed if used[v]] if allowed else sorted(used)
    if d["vibes"] != expected_vibes:
        errors.append(f"vibes: should list the vibes used, in dictionary.json order: {json.dumps(expected_vibes)}")

    if not errors:
        print(f'{d["section"]} / {d["category"]} / {d["topic"]}')
        for where, entries in lists.items():
            print(f"  {'.'.join(where):28} {len(entries)}")
        print("  vibes: " + ", ".join(f"{v} {used[v]}" for v in expected_vibes))
    return d, errors


def block(entries, indent):
    lines = ",\n".join(indent + "  " + json.dumps(e, ensure_ascii=False) for e in entries)
    return "[\n" + lines + "\n" + indent + "]"


def render(d):
    def group(name):
        return ",\n".join(f'    "{k}": ' + block(v, "    ") for k, v in d[name].items())

    return (
        "{\n"
        f'  "section": {json.dumps(d["section"], ensure_ascii=False)},\n'
        f'  "category": {json.dumps(d["category"], ensure_ascii=False)},\n'
        f'  "topic": {json.dumps(d["topic"], ensure_ascii=False)},\n'
        f'  "vibes": {json.dumps(d["vibes"], ensure_ascii=False)},\n'
        '  "words": {\n' + group("words") + "\n  },\n"
        '  "phrases": {\n' + group("phrases") + "\n  },\n"
        '  "sentences": ' + block(d["sentences"], "  ") + "\n}\n"
    )


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) != 1:
        sys.exit(__doc__)
    path = Path(args[0])
    d, errors = check(path)
    if errors:
        print(f"{len(errors)} problem(s) in {path}:")
        for e in errors:
            print(f"  - {e}")
        sys.exit(1)
    if "--no-format" not in sys.argv:
        out = render(d)
        assert json.loads(out) == d
        if out != path.read_text(encoding="utf-8"):
            path.write_text(out, encoding="utf-8")
            print("Reformatted to house layout.")
    print("OK")


if __name__ == "__main__":
    main()
