# UoM GPA Calculator — Chrome Extension

Automatically calculates your GPA directly on the University of Moratuwa LMS results page. Supports both the **4.0** and **4.2** grading scales, separates GPA and Non-GPA credits, and lets you project your GPA for pending results.

---

## Features

- Calculates weighted GPA on both **4.0** and **4.2** scales
- Displays two summary rows at the bottom of your results table
  - **My GPA (4.0 scale)** — shows your GPA and **GPA Credits** in bold
  - **My GPA (4.2 scale)** — shows your GPA and **Non-GPA Credits**
- For subjects with a **Pending** result, a **Guess...** dropdown appears so you can select an expected grade and see your projected GPA update in real time
- Color-coded summary rows so they stand out from the rest of the table

---

## How the output looks

| Column | My GPA (4.0 scale) row | My GPA (4.2 scale) row |
|--------|------------------------|------------------------|
| Label | Blue background | Blue background |
| GPA value | White background | White background |
| Credit info | **GPA Credits: X** (bold, amber) | Non-GPA Credits: Y (plain) |

---

## Installation

Chrome does not allow loading extensions from a folder by default. You need to enable **Developer Mode** first.

### Step 1 — Download the extension

Clone or download this repository to your computer.

```
git clone https://github.com/arunapbandara/gpa-cal-extention.git
```

Or click **Code → Download ZIP** on GitHub, then extract the ZIP to somewhere easy to find (e.g. your Desktop).

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

The extension named **UoM GPA Calculator** will appear in your extensions list.

### Step 5 — Open your results page

1. Go to: `https://lms.uom.lk/mis_exam/reports/view_my_results.php`
2. Log in if prompted
3. Your GPA rows will appear automatically at the bottom of the results table

---

## Grading scales

| Grade | 4.0 Scale | 4.2 Scale |
|-------|-----------|-----------|
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

---

## Projecting pending results

If any subject shows **Pending**, a **Guess...** dropdown appears inline next to the grade. Selecting a grade instantly recalculates both GPA rows without reloading the page.

---

## Updating the extension

After pulling new changes from this repository:

1. Go to `chrome://extensions`
2. Find **UoM GPA Calculator** and click the **refresh (↺) icon**
3. Reload your results page

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| GPA rows don't appear | Confirm you are on the exact URL (`view_my_results.php`) and reload the page |
| Extension not listed after loading | Make sure the folder you selected contains `manifest.json` directly inside it, not in a sub-folder |
| GPA shows `-` | No results with valid GPA credits found yet, or all pending subjects have no grade selected |
| Non-GPA Credits shows `0` | Your table may store non-GPA credit values in a different column — open an issue with a screenshot |

---

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Extension config — defines which page the script runs on and the extension name/version |
| `gpa.js` | All logic — parses the results table, tracks GPA and non-GPA credits, injects summary rows |
