// ===== adapters/uom.js =====
// University: University of Moratuwa (UoM)
// Page: lms.uom.lk/mis_exam/reports/view_my_results.php*
//
// Table shape: flat (no semester grouping), a dedicated GPA-credit
// column that already says "-" for non-GPA modules (more reliable
// than guessing from a course code, so no manual classification
// override is needed here), and TWO simultaneous grading scales
// (4.0 and 4.2, differing only in what A+ is worth).

(function () {
  const gradePoints40 = {
    "A+": 4.0,
    A: 4.0,
    "A-": 3.7,
    "B+": 3.3,
    B: 3.0,
    "B-": 2.7,
    "C+": 2.3,
    C: 2.0,
    "C-": 1.7,
    D: 1.0,
    E: 0.0,
  };
  const gradePoints42 = { ...gradePoints40, "A+": 4.2 };
  const GRADE_OPTIONS = Object.keys(gradePoints40);

  function run(engine) {
    const rowsData = [];
    let nonGpaCredits = 0;
    let lastTableFound = null;

    const allRows = document.querySelectorAll("tr");
    let rowCounter = 0;

    allRows.forEach((row) => {
      const cells = row.querySelectorAll("td");
      if (!(row.className.includes("bodytext") && cells.length === 5)) return;

      lastTableFound = row.closest("table");
      const rowId = `uom:${rowCounter++}`;
      const code = cells[0].textContent.trim(); // used to detect repeat/resit rows with the same course code

      const gradeCell = cells[2];
      const rawGrade = gradeCell.textContent.trim();
      const gpaCreditText = cells[3].textContent.trim();

      if (gpaCreditText === "-") {
        const rawCredit = Number.parseFloat(cells[4]?.textContent.trim());
        if (!Number.isNaN(rawCredit)) nonGpaCredits += rawCredit;
        return; // UoM's own column already marks this Non-GPA - trustworthy, no override needed
      }

      const credit = Number.parseFloat(gpaCreditText);
      if (Number.isNaN(credit)) return;

      if (rawGrade.startsWith("Pending")) {
        const dropdown = engine.buildWhatIfDropdown(
          rowId,
          GRADE_OPTIONS,
          recalculateAndRender,
        );
        gradeCell.appendChild(dropdown);
        rowsData.push({ rowId, code, isPending: true, credit });
      } else {
        const cleanGrade = rawGrade.split(" (")[0].trim();
        if (gradePoints40[cleanGrade] === undefined) {
          console.warn("[UoM GPA] Unrecognized grade, skipping:", cleanGrade);
          return;
        }
        rowsData.push({
          rowId,
          code,
          isPending: false,
          credit,
          grade: cleanGrade,
        });
      }
    });

    if (!lastTableFound) return false; // not this page's table shape

    function recalculateAndRender() {
      const isWhatIf = engine.hasAnyWhatIf();

      const entries = rowsData.map((entry) => {
        const grade = entry.isPending
          ? engine.getWhatIfOverride(entry.rowId)
          : entry.grade;
        return {
          id: entry.rowId,
          code: entry.code,
          credit: entry.credit,
          gradePoint: grade ? gradePoints40[grade] : null, // used for dedup comparison; grade order is identical on both scales
          gradePoint42: grade ? gradePoints42[grade] : null,
          isGraded: !!grade,
        };
      });

      // A course resat and listed twice (e.g. one failed attempt, one
      // pass) only counts once, using whichever attempt has the higher
      // grade - re-evaluated live so what-if guesses can change the winner.
      const winners = engine.selectBestAttempts(entries);

      let qp40 = 0,
        qp42 = 0,
        totalCredits = 0;
      entries.forEach((e) => {
        if (!e.isGraded) return;
        if (!engine.isWinningAttempt(e, winners)) return;
        totalCredits += e.credit;
        qp40 += e.gradePoint * e.credit;
        qp42 += e.gradePoint42 * e.credit;
      });

      const gpa40 = totalCredits > 0 ? (qp40 / totalCredits).toFixed(4) : "-";
      const gpa42 = totalCredits > 0 ? (qp42 / totalCredits).toFixed(4) : "-";

      engine.clearPreviousSummaryRows();

      const gpa40Row = engine.makeSummaryRow({
        colSpan: 5,
        label: "Overall GPA (4.0 scale):",
        value: gpa40,
        isWhatIf,
        rowClass: "gpa-uom-40-row",
      });
      const gpa42Row = engine.makeSummaryRow({
        colSpan: 5,
        label: "Overall GPA (4.2 scale):",
        value: gpa42,
        isWhatIf,
        rowClass: "gpa-uom-42-row",
      });
      const gpaCreditsRow = engine.makeSummaryRow({
        colSpan: 5,
        label: "GPA Credits:",
        value: totalCredits,
        rowClass: "gpa-uom-credits-row",
      });
      const nonGpaCreditsRow = engine.makeSummaryRow({
        colSpan: 5,
        label: "Non-GPA Credits:",
        value: nonGpaCredits,
        rowClass: "gpa-uom-nongpa-credits-row",
      });

      const tbody = lastTableFound.querySelector("tbody") || lastTableFound;
      tbody.appendChild(gpa40Row);
      tbody.appendChild(gpa42Row);
      tbody.appendChild(gpaCreditsRow);
      tbody.appendChild(nonGpaCreditsRow);
    }

    recalculateAndRender();
    return true;
  }

  window.GPAAdapters = window.GPAAdapters || [];
  window.GPAAdapters.push({
    id: "uom",
    matches: (loc) =>
      loc.hostname === "lms.uom.lk" &&
      loc.pathname.startsWith("/mis_exam/reports/view_my_results.php"),
    run,
  });
})();
