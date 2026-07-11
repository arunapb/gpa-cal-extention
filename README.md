# Uni GPA Calculator — Chrome Extension

Automatically calculates your GPA directly on supported Sri Lankan university exam results portals. Detects which university's page you're on and applies the correct grading rules, table structure, and calculation logic automatically.

---

## Supported Universities

| University | Portal | Scales |
|---|---|---|
| University of Moratuwa (UoM) | `lms.uom.lk` | 4.0 and 4.2 |
| Uva Wellassa University (UWU) | `exam.uwu.ac.lk` | 4.0 (12-point) |

---

## What it does

### University of Moratuwa (UoM)

- Reads your results on `lms.uom.lk/mis_exam/reports/view_my_results.php`
- Shows four rows at the bottom of the table:
  - **Overall GPA (4.0 scale)**
  - **Overall GPA (4.2 scale)**
  - **GPA Credits** — total credits counted toward GPA
  - **Non-GPA Credits** — credits excluded from GPA calculation
- Modules already marked as non-GPA by the portal (credit column shows `-`) are excluded automatically — no manual override needed
- For **Pending** results, shows a **Guess grade…** dropdown so you can project your GPA instantly

### Uva Wellassa University (UWU)

- Reads your results on `exam.uwu.ac.lk/ug/user/` (Provisional Results / End-Semester Exam views)
- Shows an **SGPA** row after each semester's section
- Shows an **Overall GPA** row at the bottom of the full table
- Each module row gets a **GPA / Non-GPA** badge with a toggle dropdown — you can reclassify any module and the GPA updates live
- For ungraded modules, shows a **Guess grade…** dropdown to project your GPA
- Handles **repeat/resit** attempts: only the highest-graded attempt per course code counts toward GPA, re-evaluated live as you change what-if guesses

---

## Installation

Chrome does not allow installing extensions from a folder by default, so you need to enable **Developer Mode** first.

### Step 1 — Download the extension files

Clone or download this repository to your computer.

```
git clone https://github.com/arunapbandara/gpa-cal-extention.git
```

Or click **Code → Download ZIP** on GitHub, then extract the ZIP somewhere easy to find (e.g. your Desktop).

### Step 2 — Open Chrome Extensions page

Open **Google Chrome** and go to:

```
chrome://extensions
```

### Step 3 — Enable Developer Mode

In the top-right corner of the Extensions page, toggle **Developer mode** ON.

### Step 4 — Load the extension

1. Click the **Load unpacked** button (top-left)
2. In the file picker, navigate to the folder you downloaded/extracted in Step 1
3. Select the folder (it must contain `manifest.json` at its top level)
4. Click **Select Folder**

The extension named **Uni GPA Calculator** will now appear in your list of extensions.

### Step 5 — Visit your results page

**UoM:** Go to [https://lms.uom.lk/mis_exam/reports/view_my_results.php](https://lms.uom.lk/mis_exam/reports/view_my_results.php)

**UWU:** Go to your Provisional Results or End-Semester Exam page on `exam.uwu.ac.lk`

Log in if prompted. Your GPA will be calculated and displayed automatically.

---

## Grading Scales

### University of Moratuwa

| Grade | 4.0 Scale | 4.2 Scale |
|---|---|---|
| A+    | 4.0       | 4.2       |
| A     | 4.0       | 4.0       |
| A-    | 3.7       | 3.7       |
| B+    | 3.3       | 3.3       |
| B     | 3.0       | 3.0       |
| B-    | 2.7       | 2.7       |
| C+    | 2.3       | 2.3       |
| C     | 2.0       | 2.0       |
| C-    | 1.7       | 1.7       |
| D     | 1.0       | 1.0       |
| E     | 0.0       | 0.0       |

### Uva Wellassa University

| Grade | Points |
|---|---|
| A+    | 4.0    |
| A     | 4.0    |
| A-    | 3.7    |
| B+    | 3.3    |
| B     | 3.0    |
| B-    | 2.7    |
| C+    | 2.3    |
| C     | 2.0    |
| C-    | 1.7    |
| D+    | 1.3    |
| D     | 1.0    |
| E     | 0.0    |

---

## Features

### What-if grade projection

For any module with a **Pending** or ungraded result, a **Guess grade…** dropdown appears next to it. Select an expected grade and all GPA rows update instantly. A **what-if** badge appears on every GPA row when any projection is active.

### GPA / Non-GPA classification (UWU)

Every module row on the UWU portal has a small badge showing **GPA** or **Non-GPA**. A dropdown next to it lets you reclassify the module — the GPA recalculates immediately. This is useful if a module's classification differs from its default.

### Repeat / Resit deduplication

If you sat a module more than once (resit or repeat attempt), only the attempt with the **highest grade** counts toward your GPA. This is evaluated live, so changing a what-if guess can change which attempt wins.

---

## Updating the extension

After pulling new changes from this repo:

1. Go to `chrome://extensions`
2. Find **Uni GPA Calculator** and click the **refresh icon**

---

## Troubleshooting

| Problem | Fix |
|---|---|
| GPA rows don't appear | Make sure you are on the exact results URL for your university. Reload the page. |
| Extension not listed after loading | Ensure the folder you selected contains `manifest.json` at the top level, not inside a sub-folder. |
| GPA shows `-` or `N/A` | You may have no results with valid credit values yet, or all results are Pending with no grade guessed. |
| UWU page detected but wrong GPA | Check that each module's GPA / Non-GPA classification badge is set correctly for your degree programme. |

---

## Files

| File | Purpose |
|---|---|
| `manifest.json` | Extension configuration — registers URL matches and script load order |
| `core/engine.js` | Shared engine — what-if dropdowns, classification badges, summary row rendering, repeat deduplication |
| `adapters/uom.js` | University of Moratuwa adapter — table parsing, dual-scale GPA calculation |
| `adapters/uwu.js` | Uva Wellassa University adapter — semester-grouped parsing, SGPA + Overall GPA |
| `main.js` | Entry point — finds the adapter that matches the current page and runs it |
| `styles.css` | Shared styles for all summary rows, badges, and dropdowns |
| `icons/` | Extension icons (16 px, 48 px, 128 px) |

---

## Adding support for another university

1. Create `adapters/newuni.js` following the same self-registering pattern as `adapters/uwu.js` or `adapters/uom.js`
2. Add the new file and its URL match pattern to `manifest.json`
3. Nothing in `core/engine.js` or `main.js` needs to change
