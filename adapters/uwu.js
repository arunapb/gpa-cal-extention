// ===== adapters/uwu.js =====
// University: Uva Wellassa University (UWU)
// Page: exam.uwu.ac.lk/ug/user/*  (Provisional Results / End-Semester Exam)
//
// Table shape: semester-grouped, credit value embedded in the course
// code suffix ("CST 121-3" -> 3 credits), single 12-point grading scale.

(function () {
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
  const GRADE_OPTIONS = Object.keys(GRADE_POINTS);
  const NON_GRADE_TOKENS = new Set(["AB", "-", ""]);

  function extractCredits(courseCode) {
    const match = courseCode.trim().match(/-(\d+)\s*$/);
    return match ? Number.parseInt(match[1], 10) : null;
  }

  function parseResultsTable() {
    const table = document.querySelector(".card-body table");
    if (!table) return [];

    const semesters = [];
    let current = null;

    for (const tr of table.querySelectorAll("tbody > tr")) {
      const cells = tr.querySelectorAll("td");
      const headerCell = tr.querySelector('td[colspan="5"]');

      if (headerCell) {
        const h5 = headerCell.querySelector("h5");
        const title = h5
          ? h5.childNodes[0].textContent.trim()
          : headerCell.textContent.trim();
        current = { title, rows: [] };
        semesters.push(current);
        continue;
      }

      if (cells.length < 4 || !current) continue;

      const code = cells[0].textContent.trim();
      const gradeRaw = cells[2].textContent.trim();
      const status = cells[3].textContent.trim().toUpperCase();
      const credits = extractCredits(code);
      const gradePoint = GRADE_POINTS[gradeRaw] ?? null;
      const isGraded = gradePoint !== null && !NON_GRADE_TOKENS.has(gradeRaw);
      const isPass = status === "PASS";

      current.rows.push({
        tr,
        code,
        gradeRaw,
        credits,
        gradePoint,
        isGraded,
        isPass,
      });
    }

    return semesters;
  }

  function round2(n) {
    return Math.round(n * 100) / 100;
  }

  function run(engine) {
    const semesters = parseResultsTable();
    if (semesters.length === 0) return false; // not this page's table shape

    function effectiveGrade(row, rowId) {
      const override = engine.getWhatIfOverride(rowId);
      if (override)
        return { gradePoint: GRADE_POINTS[override], isGraded: true };
      return { gradePoint: row.gradePoint, isGraded: row.isGraded };
    }

    function buildEligibleEntries(rows, semesterIndex) {
      const entries = [];
      rows.forEach((row, rowIndex) => {
        const rowId = `uwu:${semesterIndex}:${rowIndex}`;
        if (!engine.isGpaEligible(rowId)) return;
        if (row.credits === null) return;
        const eff = effectiveGrade(row, rowId);
        entries.push({
          id: rowId,
          code: row.code,
          credit: row.credits,
          gradePoint: eff.gradePoint,
          isGraded: eff.isGraded,
        });
      });
      return entries;
    }

    function recalculateAndRender() {
      engine.clearPreviousSummaryRows();
      const isWhatIf = engine.hasAnyWhatIf();

      // Pass 1: per-semester SGPA (dedup only within each semester).
      const allWinningEntriesAcrossSemesters = [];

      semesters.forEach((sem, semesterIndex) => {
        const entries = buildEligibleEntries(sem.rows, semesterIndex);
        const winners = engine.selectBestAttempts(entries);

        let totalCredits = 0,
          totalPoints = 0;
        entries.forEach((e) => {
          if (!e.isGraded) return;
          if (!engine.isWinningAttempt(e, winners)) return;
          totalCredits += e.credit;
          totalPoints += e.credit * e.gradePoint;
          allWinningEntriesAcrossSemesters.push(e); // candidate for the cross-semester pass below
        });

        const sgpa = totalCredits > 0 ? totalPoints / totalCredits : null;
        const text =
          sgpa !== null
            ? `${round2(sgpa).toFixed(4)} (${totalCredits} credits)`
            : "N/A (no graded courses yet)";
        const row = engine.makeSummaryRow({
          colSpan: 5,
          label: `SGPA — ${sem.title}:`,
          value: text,
          isWhatIf,
          rowClass: "gpa-sgpa-row",
        });
        const lastRow = sem.rows.at(-1);
        if (lastRow) lastRow.tr.insertAdjacentElement("afterend", row);
      });

      // Pass 2: Overall GPA - dedup AGAIN across all semesters, so a
      // course resat in a later semester only counts once, using
      // whichever attempt (from any semester) has the higher grade.
      const overallWinners = engine.selectBestAttempts(
        allWinningEntriesAcrossSemesters,
      );
      let overallCredits = 0,
        overallPoints = 0;
      allWinningEntriesAcrossSemesters.forEach((e) => {
        if (!engine.isWinningAttempt(e, overallWinners)) return;
        overallCredits += e.credit;
        overallPoints += e.credit * e.gradePoint;
      });

      const overallGPA =
        overallCredits > 0 ? round2(overallPoints / overallCredits) : null;
      const overallText =
        overallGPA !== null
          ? `${overallGPA.toFixed(4)} (${overallCredits} credits)`
          : "N/A";
      const table = document.querySelector(".card-body table");
      table
        .querySelector("tbody")
        .appendChild(
          engine.makeSummaryRow({
            colSpan: 5,
            label: "Overall GPA:",
            value: overallText,
            isWhatIf,
            rowClass: "gpa-overall-row",
          }),
        );
    }

    // Attach classification badge + selector to every module row.
    semesters.forEach((sem, semesterIndex) => {
      sem.rows.forEach((row, rowIndex) => {
        const rowId = `uwu:${semesterIndex}:${rowIndex}`;
        const lastCell = row.tr.querySelector("td:last-child");
        lastCell.appendChild(
          engine.buildClassificationControl(rowId, true, recalculateAndRender),
        );

        // Explicitly keyed off the status text, not just the derived
        // grade flags - guarantees PASS rows never get a dropdown even
        // if some future/unexpected status text doesn't fit neatly
        // into "ungraded" or "end repeat".
        if (!row.isPass && row.credits !== null) {
          lastCell.appendChild(
            engine.buildWhatIfDropdown(
              rowId,
              GRADE_OPTIONS,
              recalculateAndRender,
            ),
          );
        }
      });
    });

    recalculateAndRender();
    return true;
  }

  window.GPAAdapters = window.GPAAdapters || [];
  window.GPAAdapters.push({
    id: "uwu",
    // Require a ?d=... param, not just the path prefix - the bare
    // dashboard URL (https://exam.uwu.ac.lk/ug/user/) shares this same
    // path but has no results table at all, and every real results
    // view (Provisional Results, End-Semester Exam, etc.) is loaded
    // via a distinct ?d= id.
    matches: (loc) =>
      loc.hostname === "exam.uwu.ac.lk" &&
      loc.pathname.startsWith("/ug/user/") &&
      new URLSearchParams(loc.search).has("d"),
    run,
  });
})();
