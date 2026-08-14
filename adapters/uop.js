// ===== adapters/uop.js =====
// University: University of Peradeniya (UoP), Faculty of Science
// Pages: sciims.pdn.ac.lk/Student/FinalGrades, sciims.pdn.ac.lk/Student/AllGrades
//
// The two pages have genuinely different table shapes, both handled here:
//  - FinalGrades: a plain static table, rows grouped under "NNN / NNNN
//    LEVEL - Semester X" header rows (level number is in the header text,
//    not a column).
//  - AllGrades: a *live* DataTables-powered table (search/sort/pagination,
//    "dt-container" wrapper) with NO level-header rows at all - every
//    course is a flat row, so the level has to be read off the course
//    code itself (e.g. "STA4043" -> 4000/400 level). Because DataTables
//    owns and redraws this table's <tbody> on every search/sort/page
//    change, we never inject rows into it directly - anything we put
//    there would vanish on the next redraw. Instead all summary rows
//    for this page go into a separate table rendered right after it.
// Both share a single "Credit for GPA" column that is already 0 for
// non-GPA courses (English, career-dev, etc.) - trustworthy, same idea
// as UoM's dedicated column.
//
// Unlike UWU/UoM, UoP's official GPA is NOT a flat credit-weighted mean of
// every course. Per the Faculty of Science Student Handbook (Sec. 6 -
// "Assignment of Grades, Grade Points and GPA"), a GPA is computed per
// LEVEL (1000/2000/3000/4000, i.e. our 100/200/300/400), then the overall
// GPA is those level GPAs combined with fixed percentage weights that
// differ for the 3-year B.Sc. degree (1000/2000/3000 only) vs a 4-year
// Honours/Special degree (1000/2000/3000/4000):
//   B.Sc. (3-year) : 1000=20%  2000=40%  3000=40%
//   Honours (4-year): 1000=20%  2000=20%  3000=30%  4000=30%
// Which weight table applies depends on the student's own degree pathway,
// which isn't present anywhere in the page - so it's asked once via a
// dropdown and remembered per-browser (localStorage), auto-guessed from
// whether any 4000-level (400) courses appear at all.
//
// Handbook Sec. 8 ("Attendance and Repetition of a Course Unit"): a course
// graded C-, D+, D or E may be repeated for a better grade, but "the
// maximum grade given shall be a grade C" - so those rows get a capped
// what-if dropdown (same mechanism as the Incomplete-grade one below)
// instead of being treated as a fixed final grade.

(function () {
  const gradePoints = {
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
    I: 0.0, // Incomplete - counts as 0 by default; simulate a retake via the dropdown
  };
  const GRADE_OPTIONS = Object.keys(gradePoints).filter((g) => g !== "I");
  // Repeat of a C-/D+/D/E grade is capped at C (Handbook Sec. 8).
  const REPEAT_CAPPED_GRADES = new Set(["C-", "D+", "D", "E"]);
  const REPEAT_RETAKE_OPTIONS = ["C", "C-", "D+", "D", "E"];

  const WEIGHTS_GENERAL = { 100: 20, 200: 40, 300: 40 };
  const WEIGHTS_HONOURS = { 100: 20, 200: 20, 300: 30, 400: 30 };

  const STORAGE_KEY = "gpaExtUopDegreeType"; // manual override: "general" | "honours"
  const DETECTED_CACHE_KEY = "gpaExtUopDetectedDegree"; // cached {type, name} from /Student

  function detectTypeFromDegreeName(name) {
    return /honou?rs/i.test(name) ? "honours" : "general";
  }

  // sciims.pdn.ac.lk/Student ("My Data") has a table row - icon + "Degree"
  // label, then a ": Bachelor of Science Honours in Statistics" value cell -
  // that's the one authoritative place the degree pathway is stated. Fetched
  // same-origin (browser sends the student's session cookie automatically),
  // parsed once, then cached so repeat visits don't refetch it.
  async function detectDegreeType() {
    const cached = localStorage.getItem(DETECTED_CACHE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        /* fall through and refetch */
      }
    }
    try {
      const res = await fetch("/Student", { credentials: "same-origin" });
      if (!res.ok) return null;
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      let name = null;
      doc.querySelectorAll("table tbody tr").forEach((tr) => {
        const cells = tr.querySelectorAll("td");
        if (cells.length < 2) return;
        if (cells[0].textContent.trim().toLowerCase() !== "degree") return;
        name = cells[1].textContent.replace(/^:/, "").trim();
      });
      if (!name) return null;
      const detected = { type: detectTypeFromDegreeName(name), name };
      localStorage.setItem(DETECTED_CACHE_KEY, JSON.stringify(detected));
      return detected;
    } catch (e) {
      console.warn("[UoP GPA] Could not auto-detect degree programme:", e);
      return null;
    }
  }

  function parseLevelHeader(text) {
    const match = text.trim().match(/(\d{3})\s*\/\s*\d{3,4}\s*LEVEL/i);
    return match ? Number.parseInt(match[1], 10) : null;
  }

  // AllGrades has no level-header rows - the course code's own leading
  // digit is the level (e.g. "STA4043" -> 4000 level -> our 400).
  function levelFromCode(code) {
    const match = code.match(/(\d)\d{3}/);
    return match ? Number.parseInt(match[1], 10) * 100 : null;
  }

  function run(engine) {
    const table = document.querySelector("#dtTable table");
    if (!table) return false; // not this page's table shape

    const headerCells = Array.from(table.querySelectorAll("thead th")).map(
      (th) => th.textContent.trim(),
    );
    const codeIdx = headerCells.findIndex((h) => /course/i.test(h));
    const gradeIdx = headerCells.findIndex((h) => /grade/i.test(h));
    const creditIdx = headerCells.findIndex((h) => /credit/i.test(h));
    const semesterIdx = headerCells.findIndex((h) => /semester/i.test(h));
    if (codeIdx === -1 || gradeIdx === -1 || creditIdx === -1) return false;

    // AllGrades is a live DataTables table (search/sort/pagination) - it
    // owns and redraws its own <tbody>, so we must never inject rows into
    // it. FinalGrades is a plain static table, safe to append/insert into.
    const isLiveDataTable = !!table.closest(".dt-container");

    const levelGroups = new Map(); // levelNum -> { rows: [] }
    const semesterGroups = []; // { label, rows: [], lastRowEl }
    const semesterGroupByLabel = new Map(); // flat-mode (AllGrades) only
    let currentSemesterGroup = null;
    let currentLevelRows = null;
    let nonGpaCourseCount = 0;
    let rowCounter = 0;

    const trs = table.querySelectorAll("tbody > tr");
    trs.forEach((tr) => {
      const cells = tr.querySelectorAll("td");

      if (cells.length === 1) {
        const levelNum = parseLevelHeader(cells[0].textContent);
        if (levelNum !== null) {
          if (!levelGroups.has(levelNum)) levelGroups.set(levelNum, { rows: [] });
          currentLevelRows = levelGroups.get(levelNum).rows;
          currentSemesterGroup = {
            label: cells[0].textContent.trim(),
            rows: [],
            lastRowEl: null,
          };
          semesterGroups.push(currentSemesterGroup);
        }
        return; // header row, or a blank "&nbsp;" spacer row - nothing else to do
      }

      // Site's own "Number of Courses", "Total Credits", "Total Subjects"
      // etc. rows use colspan and don't reach the Credit column - skip them.
      if (cells.length <= creditIdx) return;

      const code = cells[codeIdx].textContent.trim();
      const rawGrade = cells[gradeIdx].textContent.trim();
      const credit = Number.parseFloat(cells[creditIdx].textContent.trim());

      if (Number.isNaN(credit) || credit === 0) {
        nonGpaCourseCount++;
        return; // "Credit for GPA" already marks this Non-GPA - trustworthy
      }

      let levelRows = currentLevelRows;
      let semGroup = currentSemesterGroup;

      if (!levelRows) {
        // No level-header rows on this page (AllGrades) - derive both from
        // the row itself instead.
        const levelNum = levelFromCode(code);
        if (levelNum === null) {
          console.warn("[UoP GPA] Could not determine level, skipping:", code);
          return;
        }
        if (!levelGroups.has(levelNum)) levelGroups.set(levelNum, { rows: [] });
        levelRows = levelGroups.get(levelNum).rows;

        const semLabel =
          semesterIdx !== -1 ? cells[semesterIdx].textContent.trim() : `${levelNum} Level`;
        semGroup = semesterGroupByLabel.get(semLabel);
        if (!semGroup) {
          semGroup = { label: semLabel, rows: [], lastRowEl: null };
          semesterGroupByLabel.set(semLabel, semGroup);
          semesterGroups.push(semGroup);
        }
      }

      const rowId = `uop:${rowCounter++}`;
      let rowDesc;
      // AllGrades renders an ungraded module as literal text "Pending"
      // (inside a <small>), not a blank cell - treat both the same way.
      const isBlankOrPending = rawGrade === "" || /pending/i.test(rawGrade);

      if (isBlankOrPending || rawGrade === "I") {
        const dropdown = engine.buildWhatIfDropdown(
          rowId,
          GRADE_OPTIONS,
          recalculateAndRender,
        );
        cells[gradeIdx].appendChild(dropdown);
        rowDesc = {
          rowId,
          code,
          credit,
          isPending: true,
          fallbackGrade: rawGrade === "I" ? "I" : null,
        };
      } else if (REPEAT_CAPPED_GRADES.has(rawGrade)) {
        const dropdown = engine.buildWhatIfDropdown(
          rowId,
          REPEAT_RETAKE_OPTIONS,
          recalculateAndRender,
        );
        cells[gradeIdx].appendChild(dropdown);
        rowDesc = { rowId, code, credit, isPending: true, fallbackGrade: rawGrade };
      } else if (gradePoints[rawGrade] !== undefined) {
        rowDesc = { rowId, code, credit, grade: rawGrade };
      } else {
        console.warn("[UoP GPA] Unrecognized grade, skipping:", rawGrade);
        return;
      }

      levelRows.push(rowDesc);
      semGroup.rows.push(rowDesc);
      semGroup.lastRowEl = tr;
    });

    if (levelGroups.size === 0) return false; // no level-grouped rows found

    function toEntry(r) {
      const override = r.isPending ? engine.getWhatIfOverride(r.rowId) : null;
      const grade = r.isPending ? override || r.fallbackGrade || null : r.grade;
      return {
        id: r.rowId,
        code: r.code,
        credit: r.credit,
        gradePoint: grade ? gradePoints[grade] : null,
        isGraded: !!grade,
      };
    }

    function creditWeightedGpa(rows) {
      const entries = rows.map(toEntry);
      const winners = engine.selectBestAttempts(entries);
      let credits = 0,
        points = 0;
      entries.forEach((e) => {
        if (!e.isGraded || !engine.isWinningAttempt(e, winners)) return;
        credits += e.credit;
        points += e.credit * e.gradePoint;
      });
      return { credits, gpa: credits > 0 ? points / credits : null };
    }

    const hasLevel400 = levelGroups.has(400);
    // Filled in asynchronously once (and if) the /Student fetch resolves;
    // read synchronously by getDegreeType() everywhere else.
    let detectedDegree = null;
    try {
      const cached = localStorage.getItem(DETECTED_CACHE_KEY);
      if (cached) detectedDegree = JSON.parse(cached);
    } catch (e) {
      /* ignore malformed cache */
    }

    function getDegreeType() {
      const manual = localStorage.getItem(STORAGE_KEY);
      if (manual === "general" || manual === "honours") return manual;
      if (detectedDegree) return detectedDegree.type;
      return hasLevel400 ? "honours" : "general"; // last-resort guess
    }

    function degreeTypeSourceNote() {
      if (localStorage.getItem(STORAGE_KEY)) return "(manually set)";
      if (detectedDegree) return `(auto-detected: ${detectedDegree.name})`;
      return "(guessed from levels present - could not read /Student)";
    }

    function buildDegreeTypeRow() {
      const tr = document.createElement("tr");
      tr.className = "gpa-uop-degreetype-row";
      const td = document.createElement("td");
      td.colSpan = headerCells.length;
      td.className = "text-right";

      const label = document.createElement("strong");
      label.textContent = "Degree Programme: ";
      td.appendChild(label);

      const select = document.createElement("select");
      select.className = "gpa-ext-whatif-select";
      [
        ["general", "BSc (General) — 100/200/300 @ 20/40/40%"],
        ["honours", "BSc Honours — 100/200/300/400 @ 20/20/30/30%"],
      ].forEach(([value, text]) => {
        const opt = document.createElement("option");
        opt.value = value;
        opt.textContent = text;
        select.appendChild(opt);
      });
      select.value = getDegreeType();
      select.addEventListener("change", () => {
        localStorage.setItem(STORAGE_KEY, select.value);
        note.textContent = degreeTypeSourceNote();
        recalculateAndRender();
      });
      td.appendChild(select);

      const note = document.createElement("span");
      note.className = "gpa-ext-extra";
      note.textContent = degreeTypeSourceNote();
      td.appendChild(note);

      tr.appendChild(td);
      return { tr, select, note };
    }

    // FinalGrades: append/insert straight into the real table, as before.
    // AllGrades: DataTables owns that table's <tbody> and redraws it on
    // every search/sort/page-size change, wiping anything we put there -
    // so render into a separate table placed right after it instead.
    let tbody;
    if (isLiveDataTable) {
      const summaryTable = document.createElement("table");
      summaryTable.className = "table gpa-uop-summary-table";
      tbody = document.createElement("tbody");
      summaryTable.appendChild(tbody);
      const wrapper = document.createElement("div");
      wrapper.className = "table-responsive text-nowrap mt-3";
      wrapper.appendChild(summaryTable);
      (document.getElementById("dtTable") || table).insertAdjacentElement(
        "afterend",
        wrapper,
      );
    } else {
      tbody = table.querySelector("tbody") || table;
    }

    const degreeTypeRow = buildDegreeTypeRow();
    tbody.insertBefore(degreeTypeRow.tr, tbody.firstChild);

    // Auto-detect in the background; only touch the UI if the student
    // hasn't already picked a value themselves in the meantime.
    detectDegreeType().then((result) => {
      if (!result) return;
      detectedDegree = result;
      degreeTypeRow.note.textContent = degreeTypeSourceNote();
      if (!localStorage.getItem(STORAGE_KEY)) {
        degreeTypeRow.select.value = result.type;
        recalculateAndRender();
      }
    });

    function recalculateAndRender() {
      engine.clearPreviousSummaryRows();
      const isWhatIf = engine.hasAnyWhatIf();

      // Per-semester SGPA (dedup only within that semester's own rows).
      semesterGroups.forEach((group) => {
        if (!group.lastRowEl) return;
        const { credits, gpa } = creditWeightedGpa(group.rows);
        const row = engine.makeSummaryRow({
          colSpan: headerCells.length,
          label: `SGPA — ${group.label}:`,
          value: gpa !== null ? gpa.toFixed(4) : "-",
          extraText: `(${credits} credits)`,
          isWhatIf,
          rowClass: "gpa-sgpa-row",
        });
        if (isLiveDataTable) {
          tbody.appendChild(row);
        } else {
          group.lastRowEl.insertAdjacentElement("afterend", row);
        }
      });

      // Per-level GPA (dedup across all of that level's semesters) - this
      // is the figure UoP's own formula actually feeds into the overall GPA.
      const levelStats = new Map();
      [100, 200, 300, 400].forEach((lvl) => {
        const group = levelGroups.get(lvl);
        if (!group) return;
        const stats = creditWeightedGpa(group.rows);
        levelStats.set(lvl, stats);
        tbody.appendChild(
          engine.makeSummaryRow({
            colSpan: headerCells.length,
            label: `Level ${lvl} GPA:`,
            value: stats.gpa !== null ? stats.gpa.toFixed(4) : "-",
            extraText: `(${stats.credits} credits)`,
            isWhatIf,
            rowClass: "gpa-uop-level-row",
          }),
        );
      });

      const degreeType = getDegreeType();
      const weights =
        degreeType === "honours" ? WEIGHTS_HONOURS : WEIGHTS_GENERAL;

      let weightedSum = 0,
        weightUsed = 0,
        totalGpaCredits = 0;
      Object.entries(weights).forEach(([lvl, pct]) => {
        const stats = levelStats.get(Number(lvl));
        if (stats) totalGpaCredits += stats.credits;
        if (stats && stats.gpa !== null) {
          weightedSum += stats.gpa * pct;
          weightUsed += pct;
        }
      });

      const overallGpa = weightUsed > 0 ? weightedSum / weightUsed : null;
      const weightLabel = Object.entries(weights)
        .map(([lvl, pct]) => `${lvl}L=${pct}%`)
        .join(", ");

      tbody.appendChild(
        engine.makeSummaryRow({
          colSpan: headerCells.length,
          label: "Overall GPA:",
          value: overallGpa !== null ? overallGpa.toFixed(4) : "-",
          extraText:
            `= Σ(Level GPA × Weight) using ${weightLabel}` +
            (weightUsed < 100 && weightUsed > 0
              ? " — provisional, renormalized to levels completed so far"
              : ""),
          isWhatIf,
          rowClass: "gpa-uop-overall-row",
        }),
      );
      tbody.appendChild(
        engine.makeSummaryRow({
          colSpan: headerCells.length,
          label: "GPA Credits:",
          value: totalGpaCredits,
          rowClass: "gpa-uop-credits-row",
        }),
      );
      tbody.appendChild(
        engine.makeSummaryRow({
          colSpan: headerCells.length,
          label: "Non-GPA Courses (Credit for GPA = 0):",
          value: nonGpaCourseCount,
          rowClass: "gpa-uop-nongpa-row",
        }),
      );
    }

    recalculateAndRender();
    return true;
  }

  window.GPAAdapters = window.GPAAdapters || [];
  window.GPAAdapters.push({
    id: "uop",
    matches: (loc) =>
      loc.hostname === "sciims.pdn.ac.lk" &&
      /^\/student\/(finalgrades|allgrades)\/?$/i.test(loc.pathname),
    run,
  });
})();
