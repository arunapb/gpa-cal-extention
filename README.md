# UWU GPA Calculator — Chrome Extension

Automatically calculates your SGPA per semester and overall GPA directly on the Uva Wellassa University examination results portal. Supports the **UGC 12-point grading scale**, lets you classify modules as GPA or Non-GPA, and projects your GPA for pending results.

---

## Features

- Calculates **SGPA** for each semester and displays it right after that semester's modules
- Calculates a credit-weighted **Overall GPA** at the bottom of the table
- Every module row gets a **GPA / Non-GPA** toggle so you can exclude non-credit courses from the calculation
- For modules with no grade yet, a **Guess grade…** dropdown appears so you can select an expected grade and see your SGPA and overall GPA update in real time
- A **what-if** badge appears on all GPA rows whenever any guessed grade is active, so you always know the numbers are projections

---

## How the output looks

| Injected row | What it shows |
|---|---|
| **SGPA — \<Semester title\>** | SGPA value + total graded credits for that semester |
| **Overall GPA** | Credit-weighted GPA across all semesters |

Both rows show `N/A` until at least one graded, GPA-eligible module exists.

---

## Installation

Chrome does not allow loading extensions from a folder by default. You need to enable **Developer Mode** first.

### Step 1 — Download the extension

Clone only the `uwu` branch to your computer:

```
git clone --branch uwu --single-branch https://github.com/arunapbandara/gpa-cal-extention.git
```

Or to download without Git: on GitHub switch to the **uwu** branch, then click **Code → Download ZIP**, and extract the ZIP somewhere easy to find (e.g. your Desktop).

### Step 2 — Open the Chrome Extensions page

1. Open **Google Chrome**
2. Type the following in the address bar and press **Enter**:
   ```
   chrome://extensions
   ```

### Step 3 — Enable Developer Mode

In the **top-right corner** of the Extensions page, toggle **Developer mode** ON.

### Step 4 — Load the extension

1. Click **Load unpacked** (top-left)
2. In the file picker, navigate to the folder you downloaded/extracted in Step 1
3. Select the folder — it must contain `manifest.json` and `gpa.js` at the top level
4. Click **Select Folder**

The extension named **UWU GPA Calculator** will appear in your extensions list.

### Step 5 — Open your results page

1. Go to: `https://exam.uwu.ac.lk/ug/user/`
2. Log in if prompted
3. Navigate to your results page — SGPA and Overall GPA rows will appear automatically

---

## Grading scale

UWU uses the UGC 12-point scale:

| Grade | Points |
|-------|--------|
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

Grades marked **AB** or **-** are excluded from GPA calculations.

---

## Credit extraction

The extension reads the credit value directly from the course code suffix. For example, `CST 121-3` carries **3 credits**. If a course code has no `-N` suffix the module is treated as non-credit and skipped automatically.

---

## GPA / Non-GPA classification

Every module row shows a small **GPA module / Non-GPA module** dropdown in the last column. All modules default to **GPA** — flip any row to **Non-GPA** to exclude it from the calculation without hiding it from the table. The SGPA and Overall GPA rows update instantly.

---

## Projecting pending results

If any module has no grade yet, a **Guess grade…** dropdown appears inline on that row. Selecting a grade instantly recalculates the SGPA for that semester and the Overall GPA. A **what-if** badge on every GPA row reminds you the numbers include projected grades.

---

## Updating the extension

After pulling new changes from this repository:

1. Go to `chrome://extensions`
2. Find **UWU GPA Calculator** and click the **refresh (↺) icon**
3. Reload your results page

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| GPA rows don't appear | Confirm you are on a results page under `exam.uwu.ac.lk/ug/user/` and reload |
| Extension not listed after loading | Make sure the folder you selected contains `manifest.json` directly inside it, not in a sub-folder |
| SGPA shows `N/A` | No graded GPA-eligible modules found yet for that semester, or all are marked Non-GPA |
| Credits not counted | Check that the course code ends with `-N` (e.g. `CST 121-3`); courses without that suffix are skipped |

---

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Extension config — defines which pages the script runs on and the extension name/version |
| `gpa.js` | All logic — parses the results table, computes SGPA/GPA, injects summary rows and dropdowns |
| `styles.css` | Styles for the injected summary rows, badges, and dropdowns |
