# Writing Dictionary

Descriptive vocabulary for settings, organised as **category → topic**.

```
dictionary.json                    index of categories and topics (repo root, like quizzes.json)
dictionary/
  landscapes/
    beaches.json                   one file per topic
    forests-and-woods.json
    mountains.json
    caves.json
  settlements/
    roads.json
    gardens.json
    buildings.json
  atmosphere/
    seasons.json
    sound.json
    smell-and-touch.json
```

Only `landscapes/beaches.json` exists so far; the other names show the naming convention.

## Adding a topic

In Claude Code, run `/dictionary-topic <topic>` (e.g. `/dictionary-topic Mountains`) to generate, register and validate a topic file. To do it by hand:

1. Create `dictionary/<category-folder>/<topic-name>.json` (lowercase, hyphens for spaces).
2. Add it to that category's `topics` list in `dictionary.json`.

## Topic file format

```json
{
  "category": "Landscapes",
  "topic": "Beaches",
  "vibes": ["General", "Peaceful", "Wild"],
  "words": {
    "nouns": [{ "text": "Shore", "vibe": "General", "explanation": "The land right next to the sea." }],
    "adjectives": [{ "text": "tranquil", "vibe": "Peaceful", "explanation": "Very calm, quiet and peaceful." }],
    "verbs": [{ "text": "crashed", "vibe": "Wild", "explanation": "Hit something very hard with a loud noise." }]
  },
  "phrases": {
    "nounsAndAdjectives": [{ "text": "Jagged, black rocks", "vibe": "Menacing" }],
    "verbs": [{ "text": "Stretched for miles", "vibe": "General" }]
  },
  "sentences": [{ "text": "The beach was long and narrow.", "vibe": "General" }]
}
```

Every entry is `{ "text", "vibe" }` with exactly one vibe. Words also have an `explanation`: a short meaning in very simple language (Year 2 level). The top-level `vibes` list names every vibe used in the file.

## Vibes

The vibe badges are defined once in `dictionary.json` under `vibes` (name, badge colour, description) and shared by all topics. An entry's `vibe` must match one of those names. Use `General` for common, neutral words, phrases and sentences that fit any mood.
