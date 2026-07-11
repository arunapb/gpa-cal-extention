# UoM GPA Calculator — Chrome Extension

Automatically calculates your GPA directly on the University of Moratuwa LMS results page. Supports both the **4.0** and **4.2** grading scales, and lets you guess pending grades to see a projected GPA.

---

## What it does

- Reads your result table on `lms.uom.lk` and calculates your weighted GPA
- Shows two rows at the bottom of the table: **GPA (4.0 scale)** and **GPA (4.2 scale)**
- For subjects with **Pending** results, shows a dropdown so you can guess the grade and see your projected GPA instantly

---

## Installation

Chrome does not allow installing extensions from a ZIP or folder by default, so you need to enable **Developer Mode** first.

### Step 1 — Download the extension files

Clone the **`uom` branch** of this repository to your computer.

```
git clone -b uom https://github.com/arunapbandara/gpa-cal-extention.git
```

Or on GitHub, switch to the **`uom` branch**, then click **Code → Download ZIP** and extract it somewhere easy to find (e.g. your Desktop).

> **Note:** Use the `uom` branch — `main` does not contain the extension files.

### Step 2 — Open Chrome Extensions page

1. Open **Google Chrome**
2. In the address bar, type:
   ```
   chrome://extensions
   ```
   and press **Enter**

### Step 3 — Enable Developer Mode

In the top-right corner of the Extensions page, toggle **Developer mode** ON.

### Step 4 — Load the extension

1. Click the **Load unpacked** button (top-left)
2. In the file picker, navigate to the folder you downloaded/extracted in Step 1
3. Select the folder (it should contain `manifest.json` and `gpa.js`)
4. Click **Select Folder**

The extension named **UoM GPA Calculator** will now appear in your list of extensions.

### Step 5 — Visit your results page

1. Go to [https://lms.uom.lk/mis_exam/reports/view_my_results.php](https://lms.uom.lk/mis_exam/reports/view_my_results.php)
2. Log in if prompted
3. Your GPA will be calculated and displayed automatically at the bottom of your results table

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

If any of your results show **Pending**, a **Guess...** dropdown will appear next to that subject. Select an expected grade and the GPA rows will update in real time.

---

## Updating the extension

If you pull new changes from this repo:

1. Go to `chrome://extensions`
2. Find **UoM GPA Calculator** and click the **refresh icon**

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| GPA rows don't appear | Make sure you are on the exact results URL (`view_my_results.php`). Reload the page. |
| Extension not listed after loading | Ensure the folder you selected contains `manifest.json` at the top level, not inside a sub-folder. |
| GPA shows `-` | You may have no results with valid credit values yet, or all results are Pending with no grade guessed. |

---

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Extension configuration — tells Chrome which pages to run the script on |
| `gpa.js` | Core logic — reads the results table, calculates GPA, and injects the GPA rows |
