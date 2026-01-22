# Translation Guide for Content Editors

## Overview

The Culture for Change website uses **Google Translate** to automatically translate content from Greek to other languages. However, automatic translation doesn't always produce accurate results, especially for:

- Organization names and acronyms
- Technical terms
- Proper nouns
- Specialized vocabulary

This guide explains two tools you can use to control how your content is translated.

---

## Table of Contents

1. [The Two Translation Tools](#the-two-translation-tools)
2. [Tool 1: The {word} Syntax](#tool-1-the-word-syntax)
3. [Tool 2: English Override Fields](#tool-2-english-override-fields)
4. [When to Use Which Tool](#when-to-use-which-tool)
5. [Step-by-Step Examples](#step-by-step-examples)
6. [Best Practices](#best-practices)
7. [Common Scenarios](#common-scenarios)
8. [Troubleshooting](#troubleshooting)

---

## The Two Translation Tools

| Tool | Purpose | Best For |
|------|---------|----------|
| `{word}` syntax | Prevents specific words from being translated | Acronyms, brand names, technical terms |
| EngTitle / EngDescription | Provides a complete manual English translation | Entire titles or descriptions that need accurate translation |

---

## Tool 1: The {word} Syntax

### What It Does

When you wrap a word or phrase in curly braces `{like this}`, that text will:
1. **NOT be translated** by Google Translate
2. Appear exactly as you typed it in all languages
3. The curly braces themselves will be removed from the display

### How to Use It

Simply wrap any word or phrase you want to protect in curly braces:

```
Regular text {protected text} more regular text
```

### Examples

#### Example 1: Protecting an English Acronym

**What you type in Strapi:**
```
Το πρόγραμμα {S.I.M.A.} ξεκινά τον Φεβρουάριο
```

**What appears on the website (Greek):**
```
Το πρόγραμμα S.I.M.A. ξεκινά τον Φεβρουάριο
```

**What appears when translated to English:**
```
The program S.I.M.A. starts in February
```

Notice: `S.I.M.A.` stays exactly the same, while the rest is translated.

#### Example 2: Protecting a Brand Name

**What you type in Strapi:**
```
Συνεργασία με το {Culture for Change} και το {Creative Europe}
```

**What appears when translated:**
```
Cooperation with Culture for Change and Creative Europe
```

The organization names remain unchanged.

#### Example 3: Protecting Multiple Words

**What you type in Strapi:**
```
Το {New European Bauhaus} είναι μια πρωτοβουλία της ΕΕ
```

**What appears when translated:**
```
The New European Bauhaus is an EU initiative
```

#### Example 4: Greek and English Versions Together

**What you type in Strapi:**
```
Σύστημα Ηλεκτρονικής Μάθησης Ανοιχτής πρόσβασης – {Σ.Η.Μ.Α.}/{S.I.M.A.}
```

**What appears (Greek):**
```
Σύστημα Ηλεκτρονικής Μάθησης Ανοιχτής πρόσβασης – Σ.Η.Μ.Α./S.I.M.A.
```

**What appears (English):**
```
Open Access Electronic Learning System – Σ.Η.Μ.Α./S.I.M.A.
```

Both acronyms are protected from translation.

---

## Tool 2: English Override Fields

### What They Are

In Strapi, Activities and Open Calls have optional English fields:

- **EngTitle** - English version of the title
- **EngDescription** - English version of the description

### What They Do

When a visitor views the website in English (via Google Translate):
- If EngTitle is filled in → Shows your English title instead of Google's translation
- If EngDescription is filled in → Shows your English description instead of Google's translation

### How to Use Them

1. Go to **Content Manager** in Strapi
2. Select an **Activity** or **Open Call**
3. Find the **EngTitle** field (below Title)
4. Find the **EngDescription** field (below Description)
5. Enter your manual English translation
6. **Save** and **Publish**

### Important Notes

- These fields are **optional** - leave them empty if Google's translation is acceptable
- EngDescription uses the **rich text editor** (same as Description) - you can add formatting, links, etc.
- You can combine this with the `{word}` syntax in the English fields too

---

## When to Use Which Tool

### Use `{word}` syntax when:

- You have a few specific words that shouldn't be translated
- The rest of the text can be translated automatically
- You're protecting acronyms, names, or technical terms
- Quick and easy solution

### Use EngTitle/EngDescription when:

- The entire title or description needs careful translation
- Google Translate produces poor results for the whole text
- The content is important and you want full control
- You have time to write a proper English version

### Use BOTH together when:

- You provide an English override but it also contains terms that shouldn't be translated to other languages
- Example: Your EngTitle contains `{UNESCO}` to protect it when someone translates from English to German

---

## Step-by-Step Examples

### Scenario 1: New Activity with Protected Acronym

**Task:** Create an activity about the S.I.M.A. program

1. Go to Content Manager → Activities → Create new entry

2. **Title field:**
   ```
   Νέο Πρόγραμμα {S.I.M.A.} για την Κοινωνία των Πολιτών
   ```

3. **EngTitle field:** (optional but recommended)
   ```
   New {S.I.M.A.} Program for Civil Society
   ```

4. **Description field:**
   ```
   Το πρόγραμμα {S.I.M.A.} (System for Intelligent Management and Automation)
   στοχεύει στην ενίσχυση της κοινωνίας των πολιτών μέσω της τεχνολογίας.

   Οι συμμετέχοντες θα μάθουν για:
   - Ψηφιακά εργαλεία
   - Διαχείριση έργων
   - Συνεργατικές πλατφόρμες
   ```

5. **EngDescription field:** (optional)
   ```
   The {S.I.M.A.} program (System for Intelligent Management and Automation)
   aims to strengthen civil society through technology.

   Participants will learn about:
   - Digital tools
   - Project management
   - Collaborative platforms
   ```

6. Save and Publish

### Scenario 2: Open Call with Organization Names

**Task:** Create an open call from Creative Europe

1. Go to Content Manager → Open Calls → Create new entry

2. **Title field:**
   ```
   Πρόσκληση {Creative Europe} για Πολιτιστικά Έργα 2026
   ```

3. **EngTitle field:**
   ```
   {Creative Europe} Call for Cultural Projects 2026
   ```

4. Fill in other required fields (Deadline, Description, Link, Image, etc.)

5. Save and Publish

### Scenario 3: Activity with Complex Greek Acronym

**Task:** Activity about Σ.Η.Μ.Α. (Greek acronym with English equivalent S.I.M.A.)

1. **Title field:**
   ```
   Εκπαιδευτικό Πρόγραμμα {Σ.Η.Μ.Α.} ({S.I.M.A.})
   ```

2. **EngTitle field:**
   ```
   Educational Program {Σ.Η.Μ.Α.} ({S.I.M.A.})
   ```

Both the Greek and English acronyms are protected in both versions.

---

## Best Practices

### DO:

1. **Always protect organization names**
   ```
   Συνεργασία με {UNESCO}, {UNICEF} και {Culture for Change}
   ```

2. **Protect program/project names**
   ```
   Το έργο {New European Bauhaus} χρηματοδοτείται από την ΕΕ
   ```

3. **Protect technical terms that have specific meanings**
   ```
   Η πλατφόρμα χρησιμοποιεί {open source} λογισμικό
   ```

4. **Protect email addresses and URLs**
   ```
   Επικοινωνήστε στο {info@cultureforchange.gr}
   ```

5. **Provide EngTitle for important announcements**
   - Funding calls
   - Major events
   - Press releases

6. **Test your translations**
   - After publishing, visit the page
   - Use Google Translate to switch to English
   - Verify the protected words appear correctly

### DON'T:

1. **Don't overuse {word} syntax**
   - Only protect what needs protection
   - Let Google translate common words

2. **Don't forget to close braces**
   ```
   Wrong: {Culture for Change
   Right: {Culture for Change}
   ```

3. **Don't nest braces**
   ```
   Wrong: {The {UNESCO} program}
   Right: The {UNESCO} program
   ```

4. **Don't use braces for formatting**
   - Braces are only for translation control
   - Use the rich text editor for bold, italics, etc.

---

## Common Scenarios

### Scenario A: EU Program Names

| Greek Text | With Protection |
|------------|-----------------|
| Πρόγραμμα Erasmus+ | Πρόγραμμα {Erasmus+} |
| Creative Europe 2026 | {Creative Europe} 2026 |
| Horizon Europe | {Horizon Europe} |
| New European Bauhaus | {New European Bauhaus} |

### Scenario B: Organization Names

| Greek Text | With Protection |
|------------|-----------------|
| Συνεργασία με UNESCO | Συνεργασία με {UNESCO} |
| Culture for Change | {Culture for Change} |
| Ευρωπαϊκή Επιτροπή | Ευρωπαϊκή Επιτροπή (let it translate) |

### Scenario C: Mixed Acronyms (Greek + English)

| Greek Text | With Protection |
|------------|-----------------|
| Σ.Η.Μ.Α./S.I.M.A. | {Σ.Η.Μ.Α.}/{S.I.M.A.} |
| ΜΚΟ (NGO) | {ΜΚΟ} ({NGO}) |
| ΕΕ/EU | {ΕΕ}/{EU} |

### Scenario D: Technical Terms

| Greek Text | With Protection |
|------------|-----------------|
| open source λογισμικό | {open source} λογισμικό |
| machine learning τεχνολογίες | {machine learning} τεχνολογίες |
| startup επιχειρήσεις | {startup} επιχειρήσεις |

---

## Troubleshooting

### Problem: The curly braces appear on the website

**Cause:** The content might not be going through the LocalizedText component.

**Solution:**
- Clear your browser cache
- If the problem persists, contact the developer

### Problem: The English field isn't showing when translated

**Cause:**
- The EngTitle/EngDescription field might be empty
- The content might not be published

**Solution:**
1. Check that the English field has content
2. Make sure you clicked "Publish" (not just "Save")
3. Clear your browser cache and refresh

### Problem: Google Translate still translates protected words

**Cause:**
- Forgot to add curly braces
- Typo in the braces

**Solution:**
1. Edit the content in Strapi
2. Make sure the word is wrapped: `{word}` not `{word` or `word}`
3. Save and Publish

### Problem: Part of the text is missing

**Cause:** Unclosed or mismatched braces

**Solution:**
1. Check that every `{` has a matching `}`
2. Don't nest braces inside other braces

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│                    TRANSLATION QUICK REFERENCE               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  PROTECT A WORD FROM TRANSLATION:                           │
│  ─────────────────────────────────                          │
│  Type:    Συνεργασία με {UNESCO}                            │
│  Shows:   Συνεργασία με UNESCO                              │
│  English: Cooperation with UNESCO                            │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  PROVIDE ENGLISH OVERRIDE:                                   │
│  ─────────────────────────                                  │
│  Title:     Νέα Πρόσκληση 2026                              │
│  EngTitle:  New Call 2026                                    │
│  (When viewing in English, shows "New Call 2026")           │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  COMBINE BOTH:                                               │
│  ─────────────                                              │
│  Title:     Πρόσκληση {Creative Europe}                     │
│  EngTitle:  {Creative Europe} Call                          │
│  (Protected in both Greek and English views)                │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  REMEMBER:                                                   │
│  ─────────                                                  │
│  ✓ {word} = protected from translation                      │
│  ✓ EngTitle = your English title                            │
│  ✓ EngDescription = your English description                │
│  ✓ Always PUBLISH after changes                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Need Help?

If you encounter issues or have questions about the translation system, contact the development team.

---

*Last updated: January 2026*
