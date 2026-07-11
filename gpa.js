// ===== UWU GPA Calculator - content.js =====
//
// PART 1: PARSE
// The results table has no dedicated "semester" or "credit" column.
// Semesters are marked by full-width header rows (colspan=5, class
// "table-warning"), and each module row's credit value is embedded in
// the course code itself, e.g. "CST 121-3" -> 3 credits.
//
// Grade point scale per UWU by-laws (12-point UGC scale).
const GRADE_POINTS = {
  "A+": 4.0,
  A: 4.0,
  "A-": 3.7,
  "B+": 3.3,
  B: 3.0,
  "B-": 2.7,
  "C+": 2.3,
  C: 2.0,
  "C-": 1.7,
  "D+": 1.3,
  D: 1.0,
  E: 0.0,
};

// Grades that exist in the table but carry no grade point and are NOT
// simply "ungraded" - they're genuinely excluded from GPA math.
const NON_GRADE_TOKENS = new Set(["AB", "-", ""]);

/**
 * Pulls the trailing credit number off a course code.
 * "CST 121-3" -> 3. Returns null if no "-N" suffix is found, which we
 * treat as a non-credit / non-GPA course per the by-laws (section 11).
 */
function extractCredits(courseCode) {
  const match = courseCode.trim().match(/-(\d+)\s*$/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Reads every <tr> in the results table and buckets rows under the
 * semester header row that precedes them.
 *
 * Returns: [ { title: "100 Level Semester I", rows: [ {tr, code, name,
 *              grade, status, credits, gradePoint, isGraded} ] }, ... ]
 */
function parseResultsTable() {
  const table = document.querySelector(".card-body table");
  if (!table) return [];

  const semesters = [];
  let current = null;

  for (const tr of table.querySelectorAll("tbody > tr")) {
    const cells = tr.querySelectorAll("td");

    // Semester header row: a single merged cell spanning all columns.
    const headerCell = tr.querySelector('td[colspan="5"]');
    if (headerCell) {
      const h5 = headerCell.querySelector("h5");
      const title = h5
        ? h5.childNodes[0].textContent.trim()
        : headerCell.textContent.trim();
      current = { title, headerRow: tr, rows: [] };
      semesters.push(current);
      continue;
    }

    // Skip anything that isn't a normal 5-cell module row (defensive -
    // protects us if the site adds/reorders columns later).
    if (cells.length < 4 || !current) continue;

    const code = cells[0].textContent.trim();
    const name = cells[1].textContent.trim();
    const gradeRaw = cells[2].textContent.trim();
    const status = cells[3].textContent.trim();

    const credits = extractCredits(code);
    const gradePoint = GRADE_POINTS[gradeRaw] ?? null;

    // "Graded" means: we have a real letter grade with a known point
    // value AND it's not an absence marker. END REPEAT (grade "E") IS
    // graded - E is 0.0 points, a real outcome, not a pending state.
    const isGraded = gradePoint !== null && !NON_GRADE_TOKENS.has(gradeRaw);

    current.rows.push({
      tr,
      code,
      name,
      gradeRaw,
      status,
      credits,
      gradePoint,
      isGraded,
    });
  }

  return semesters;
}

// ===== PART 2: CALCULATE =====
//
// GPA = (sum of credits * gradePoint) / (sum of credits)
// Only rows with credits != null (GPA-eligible) AND isGraded (or an
// active what-if override) are included, per by-laws section 24.
//
// `overrides` is a Map of rowIndexKey -> gradeRaw string, used for the
// live what-if preview when the user picks a guess grade from a
// dropdown on a not-yet-graded row.

function rowKey(semesterIndex, rowIndex) {
  return `${semesterIndex}:${rowIndex}`;
}

function effectiveGrade(row, overrideGradeRaw) {
  if (overrideGradeRaw) {
    return {
      gradeRaw: overrideGradeRaw,
      gradePoint: GRADE_POINTS[overrideGradeRaw],
      isGraded: true,
      isWhatIf: true,
    };
  }
  return {
    gradeRaw: row.gradeRaw,
    gradePoint: row.gradePoint,
    isGraded: row.isGraded,
    isWhatIf: false,
  };
}

/**
 * Computes SGPA for a single semester's rows, and returns totals so the
 * caller can also roll them into an overall GPA.
 */
function computeSemesterGPA(rows, semesterIndex, overrides) {
  let totalCredits = 0;
  let totalPoints = 0;

  rows.forEach((row, rowIndex) => {
    if (!isRowGpaEligible(semesterIndex, rowIndex)) return; // manually marked Non-GPA
    if (row.credits === null) return; // can't weight a module with no parseable credit value

    const override = overrides.get(rowKey(semesterIndex, rowIndex));
    const eff = effectiveGrade(row, override);
    if (!eff.isGraded) return; // still pending, no guess entered yet

    totalCredits += row.credits;
    totalPoints += row.credits * eff.gradePoint;
  });

  const sgpa = totalCredits > 0 ? totalPoints / totalCredits : null;
  return { totalCredits, totalPoints, sgpa };
}

/**
 * Computes SGPA for every semester plus one overall GPA across all of
 * them (credit-weighted, matching the by-law formula - NOT a simple
 * average of the per-semester SGPAs, since semesters carry different
 * credit loads).
 */
function computeAllGPAs(semesters, overrides) {
  let overallCredits = 0;
  let overallPoints = 0;

  const perSemester = semesters.map((sem, semesterIndex) => {
    const result = computeSemesterGPA(sem.rows, semesterIndex, overrides);
    overallCredits += result.totalCredits;
    overallPoints += result.totalPoints;
    return result;
  });

  const overallGPA = overallCredits > 0 ? overallPoints / overallCredits : null;
  return {
    perSemester,
    overallCredits,
    overallGPA: overallGPA !== null ? round2(overallGPA) : null,
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// ===== PART 3: RENDER =====
//
// Injects three kinds of rows into the existing table so everything
// blends in as native content, not a floating overlay:
//   1. A dropdown cell next to each ungraded row, for what-if guesses.
//   2. An "SGPA / semester credits" row right after each semester's
//      last module row.
//   3. One "Overall GPA" row at the very end of the table.

const state = {
  overrides: new Map(), // rowKey -> chosen what-if gradeRaw
  gpaOverrides: new Map(), // rowKey -> true (GPA module) / false (Non-GPA), default true
};

// Every module defaults to "GPA" unless the student explicitly flips it,
// per your requirement. We no longer infer this from the credit suffix -
// that was a guess; this is now an explicit, per-row decision.
function isRowGpaEligible(semesterIndex, rowIndex) {
  const key = rowKey(semesterIndex, rowIndex);
  return state.gpaOverrides.has(key) ? state.gpaOverrides.get(key) : true;
}

function buildGradeDropdown(semesterIndex, rowIndex, onChange) {
  const select = document.createElement("select");
  select.className = "form-control form-control-sm gpa-whatif-select";
  select.style.width = "auto";
  select.style.display = "inline-block";

  const blank = document.createElement("option");
  blank.value = "";
  blank.textContent = "Guess grade…";
  select.appendChild(blank);

  Object.keys(GRADE_POINTS).forEach((g) => {
    const opt = document.createElement("option");
    opt.value = g;
    opt.textContent = g;
    select.appendChild(opt);
  });

  select.addEventListener("change", () => {
    const key = rowKey(semesterIndex, rowIndex);
    if (select.value) {
      state.overrides.set(key, select.value);
    } else {
      state.overrides.delete(key);
    }
    onChange();
  });

  return select;
}

// Shows a small colored badge (GPA / Non-GPA) next to the module,
// instead of recoloring the whole row - keeps the table's native look
// intact while still making the classification obvious at a glance.
function updateClassificationBadge(tr, isGpa) {
  let badge = tr.querySelector(".gpa-classification-badge");
  if (!badge) {
    badge = document.createElement("span");
    badge.className = "gpa-classification-badge";
    const lastCell = tr.querySelector("td:last-child");
    lastCell.insertBefore(badge, lastCell.firstChild);
  }
  badge.textContent = isGpa ? "GPA" : "Non-GPA";
  badge.classList.toggle("badge-gpa", isGpa);
  badge.classList.toggle("badge-nongpa", !isGpa);
}

function buildClassificationSelect(semesterIndex, rowIndex, tr, onChange) {
  const select = document.createElement("select");
  select.className = "form-control form-control-sm gpa-classification-select";
  select.style.width = "auto";
  select.style.display = "inline-block";

  const gpaOpt = document.createElement("option");
  gpaOpt.value = "gpa";
  gpaOpt.textContent = "GPA module";
  select.appendChild(gpaOpt);

  const nonGpaOpt = document.createElement("option");
  nonGpaOpt.value = "nongpa";
  nonGpaOpt.textContent = "Non-GPA module";
  select.appendChild(nonGpaOpt);

  select.value = "gpa"; // default, per requirement

  select.addEventListener("change", () => {
    const key = rowKey(semesterIndex, rowIndex);
    const isGpa = select.value === "gpa";
    state.gpaOverrides.set(key, isGpa);
    updateClassificationBadge(tr, isGpa);
    onChange();
  });

  return select;
}

/**
 * Attaches a GPA/Non-GPA classification dropdown + badge to every
 * module row (not just pending ones - an already-graded ESD/BGE course
 * might still need to be marked non-credit).
 */
function addClassificationControls(semesters, onChange) {
  semesters.forEach((sem, semesterIndex) => {
    sem.rows.forEach((row, rowIndex) => {
      if (row.tr.querySelector(".gpa-classification-select")) return; // already added

      const lastCell = row.tr.querySelector("td:last-child");
      const select = buildClassificationSelect(
        semesterIndex,
        rowIndex,
        row.tr,
        onChange,
      );
      lastCell.appendChild(select);

      // Paint the badge at its default (GPA) state.
      updateClassificationBadge(
        row.tr,
        isRowGpaEligible(semesterIndex, rowIndex),
      );
    });
  });
}

function addWhatIfDropdowns(semesters, onChange) {
  semesters.forEach((sem, semesterIndex) => {
    sem.rows.forEach((row, rowIndex) => {
      if (row.isGraded || row.credits === null) return; // only pending, GPA-eligible rows get a dropdown
      if (row.tr.querySelector(".gpa-whatif-select")) return; // already added

      const lastCell = row.tr.querySelector("td:last-child");
      const dropdown = buildGradeDropdown(semesterIndex, rowIndex, onChange);
      lastCell.appendChild(dropdown);
    });
  });
}

function makeSummaryRow(label, sgpaText, isWhatIf, extraClass) {
  const tr = document.createElement("tr");
  tr.className = `gpa-summary-row ${extraClass || ""}`;

  const td = document.createElement("td");
  td.colSpan = 5;
  td.className = "text-right";
  td.innerHTML = `<strong>${label}</strong> <span class="gpa-value">${sgpaText}</span>${isWhatIf ? ' <span class="gpa-whatif-badge">what-if</span>' : ""}`;
  tr.appendChild(td);

  return tr;
}

function renderSummaries(semesters, results) {
  // Clear any summary rows we injected on a previous run (e.g. after
  // a dropdown change triggers a re-render).
  document.querySelectorAll(".gpa-summary-row").forEach((el) => el.remove());

  const hasAnyWhatIf = state.overrides.size > 0;

  semesters.forEach((sem, i) => {
    const { sgpa, totalCredits } = results.perSemester[i];
    const text =
      sgpa !== null
        ? `${round2(sgpa).toFixed(2)} (${totalCredits} credits)`
        : "N/A (no graded courses yet)";
    const row = makeSummaryRow(
      `SGPA — ${sem.title}:`,
      text,
      hasAnyWhatIf,
      "gpa-sgpa-row",
    );

    const lastRowOfSemester = sem.rows[sem.rows.length - 1];
    if (lastRowOfSemester) {
      lastRowOfSemester.tr.insertAdjacentElement("afterend", row);
    }
  });

  const table = document.querySelector(".card-body table");
  const overallText =
    results.overallGPA !== null
      ? `${results.overallGPA.toFixed(2)} (${results.overallCredits} credits)`
      : "N/A";
  const overallRow = makeSummaryRow(
    "Overall GPA:",
    overallText,
    hasAnyWhatIf,
    "gpa-overall-row",
  );
  table.querySelector("tbody").appendChild(overallRow);
}

// ===== ENTRY POINT =====

function runGPACalculator() {
  const semesters = parseResultsTable();
  if (semesters.length === 0) return; // not a results page we recognise

  function recalculateAndRender() {
    const results = computeAllGPAs(semesters, state.overrides);
    renderSummaries(semesters, results);
  }

  addClassificationControls(semesters, recalculateAndRender);
  addWhatIfDropdowns(semesters, recalculateAndRender);
  recalculateAndRender();
}

runGPACalculator();
