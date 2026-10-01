---
name: dictionary-topic
description: Generate a new topic file for the Writing Dictionary in this repo (dictionary/<category>/<topic>.json) and register it in dictionary.json. Use this whenever the user gives a topic or setting and wants dictionary content for it, e.g. "create a dictionary for Mountains", "add Caves under Landscapes", "new topic: Gardens", "/dictionary-topic Seasons", or asks to extend, fix or regenerate an existing topic file, even if they don't say "skill" or "JSON".
---

# Writing Dictionary topic

The Writing Dictionary is a bank of descriptive vocabulary that a Year 10 student uses when writing about a setting. The register is literary: the vocabulary, imagery and sentence craft a student would meet in good fiction. It is organised as category → topic, with one JSON file per topic. This skill produces one topic file from a topic name.

`dictionary/landscapes/beaches.json` is the reference example. Read it before writing a new topic: it shows the tone, the difficulty level and the density expected far better than any description can.

## Workflow

1. **Read the index and the example.** `dictionary.json` lists the categories, the topics that already exist and the allowed vibes. Read `dictionary/landscapes/beaches.json` as the model to follow.
2. **Place the topic.** Use the category the user names. If they give only a topic, pick the existing category it clearly belongs to (Mountains → Landscapes, Roads → Settlements, Sound → Atmosphere). Ask only if it fits none of them or could reasonably go in two. If the topic file already exists, treat the request as an update of that file, not a new one.
3. **Write the file** at `dictionary/<category folder>/<topic>.json`, with the topic name lowercase and hyphenated (`forests-and-woods.json`).
4. **Register it** by adding `{ "name": "<Topic>", "file": "dictionary/<folder>/<topic>.json" }` to that category's `topics` list in `dictionary.json`. The app cannot list folders, so a topic that is not in the index is invisible.
5. **Validate** with the bundled script and fix whatever it reports, then run it again until it passes:
   ```bash
   python3 .claude/skills/dictionary-topic/scripts/check_topic.py dictionary/<folder>/<topic>.json
   ```
   When the file passes, the script also rewrites it in the house layout (one entry per line), so there is no need to hand-format the JSON.
6. **Report** the counts per list and the spread of vibes. Leave committing to the user unless they ask for it.

## File format

```json
{
  "category": "Landscapes",
  "topic": "Beaches",
  "vibes": ["General", "Peaceful", "Wild"],
  "words": {
    "nouns":      [{ "text": "dunes", "vibe": "General", "explanation": "Hills made of sand." }],
    "adjectives": [{ "text": "tranquil", "vibe": "Peaceful", "explanation": "Very calm, quiet and peaceful." }],
    "verbs":      [{ "text": "crashed", "vibe": "Wild", "explanation": "Hit something very hard with a loud noise." }]
  },
  "phrases": {
    "nounsAndAdjectives": [{ "text": "White, foaming breakers", "vibe": "Wild" }],
    "verbs":              [{ "text": "Crashed onto the rocks", "vibe": "Wild" }]
  },
  "sentences": [
    { "text": "White, foaming breakers crashed onto the rocks, flinging spray high into the air.", "vibe": "Wild" }
  ]
}
```

## How much to write

| List | Count |
|---|---|
| Nouns | 20–40 |
| Adjectives | 20–40 |
| Verbs | 20–40 |
| Phrases – nouns and adjectives | 12–24 |
| Phrases – verbs | 12–24 |
| Sentences | 30 |

Aim for the upper half of each range (around 30 words per list and 20 phrases per list) when the topic can support it. Do not pad: a word that would never be used to describe this setting is worse than a shorter list.

## Writing the content

**Words** are for a Year 10 writer, so favour precise, literary vocabulary ("shingle", "spume", "desolate", "languid", "seethed") over words they have used since primary school ("sand", "big", "soft", "went"). Keep a plain word only when it is the natural name for something in the setting. Write verbs in the past tense, because stories are told in the past tense and the verbs can then be dropped straight into a sentence. Keep words lowercase.

**Explanations** go on words only, and are written for a Year 2 child (age 6–7), who may be reading the dictionary alongside an older sibling. Use one or two very short sentences, everyday words, and a familiar comparison where it helps ("Curved like a banana or a thin moon."). Give the meaning that fits this setting, not every meaning of the word, and never explain a word with a harder word. Match the tense of verbs ("crashed" → "Hit something very hard with a loud noise.").

**Phrases** are ready-made building blocks. Noun-and-adjective phrases pair a noun with one or two adjectives ("Small, sheltered cove"). Verb phrases start with a past-tense verb and say what something did ("Stretched for miles"). Start each with a capital letter and leave off the full stop. Build them mostly from the words in the word lists, so a student sees each word in use.

**Sentences** show the phrases at work in complete, well-made sentences a Year 10 student could aim for. Vary the openers, the lengths and the structures, use the senses the setting calls for, and let many of them carry a simile, a metaphor or personification that is fresh rather than stock.

Every phrase must appear word for word in at least one sentence. This is the reason the sentences exist: the student looks up a phrase and sees how it sits in real writing. In practice that means most sentences carry one or two phrases. A verb phrase that contains a pronoun ("Crunched beneath his feet") has to appear with that same pronoun, so write the phrase and its sentence together.

The easiest order is words → phrases → sentences, writing each sentence around the phrases it has to carry, rather than writing sentences freely and patching phrases in afterwards.

## Vibes

Every word, phrase and sentence gets exactly one vibe, which the app shows as a badge so a student can pick vocabulary to match the mood of their writing.

- The allowed vibes are the names in the `vibes` list of `dictionary.json`. Read them from there, because the list can change.
- **General** is for common, neutral, natural description that fits any mood: most nouns, plain adjectives of size and shape, plain verbs of position. Expect roughly half of the entries to be General. Only give a mood vibe to something that really carries that mood.
- Spread the sentences across the vibes so that each mood the setting can have gets at least two or three example sentences. A topic need not use every vibe (a cave is rarely Lively).
- The top-level `vibes` list names the vibes actually used in the file, in the same order as `dictionary.json`.
- If the setting has a strong mood that no existing vibe covers, prefer the nearest existing one. Add a new vibe to `dictionary.json` (name, colour, description) only when the gap is real, and tell the user you did, since it changes the shared list.

## What the checker enforces

`scripts/check_topic.py` checks the things that are easy to get subtly wrong by eye: the counts above, that every entry has a valid vibe, that words have explanations, that nothing is duplicated, that every phrase appears in a sentence, that the top-level `vibes` list matches what is used, and that the file is registered in `dictionary.json`. It prints each problem with the entry concerned and exits non-zero until all are fixed. It cannot judge quality: whether the words suit the setting and whether a six-year-old could follow the explanations is still down to careful writing.
