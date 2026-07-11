// ===== core/engine.js =====
//
// Shared building blocks used by EVERY university adapter: the
// what-if grade dropdown, the GPA/Non-GPA classification badge, and
// summary-row rendering. This is deliberately the ONLY shared layer -
// table parsing (finding rows, reading grades/credits, detecting
// "pending") stays inside each adapter, because table structures
// differ too much between universities to generalize safely without
// making the parsing logic fragile for all of them.
//
// A new university adapter should only ever need functions from here,
// never duplicate them.

function createEngine() {
  // Isolated per page-load / per adapter run - two adapters never run
  // on the same page, but keeping this inside the factory means every
  // run starts clean.
  const state = {
    whatIfOverrides: new Map(), // rowId -> chosen grade string
    gpaOverrides: new Map(), // rowId -> true (GPA) / false (Non-GPA)
  };

  function key(rowId) {
    return String(rowId);
  }

  // ---- What-if grade dropdown ----

  function buildWhatIfDropdown(rowId, gradeOptions, onChange) {
    const select = document.createElement("select");
    select.className = "gpa-ext-whatif-select";

    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "Guess grade…";
    select.appendChild(blank);

    gradeOptions.forEach((g) => {
      const opt = document.createElement("option");
      opt.value = g;
      opt.textContent = g;
      select.appendChild(opt);
    });

    select.addEventListener("change", () => {
      const k = key(rowId);
      if (select.value) state.whatIfOverrides.set(k, select.value);
      else state.whatIfOverrides.delete(k);
      onChange();
    });

    return select;
  }

  function getWhatIfOverride(rowId) {
    return state.whatIfOverrides.get(key(rowId)) || null;
  }

  function hasAnyWhatIf() {
    return state.whatIfOverrides.size > 0;
  }

  // ---- GPA / Non-GPA classification badge + selector ----
  // Renders a small colored badge (never recolors the whole row) plus
  // a dropdown to flip it. Defaults to "GPA" unless told otherwise.

  function buildClassificationControl(rowId, defaultIsGpa, onChange) {
    const wrap = document.createElement("span");
    wrap.className = "gpa-ext-classification-wrap";

    const badge = document.createElement("span");
    badge.className = "gpa-ext-classification-badge";
    wrap.appendChild(badge);

    const select = document.createElement("select");
    select.className = "gpa-ext-classification-select";
    [
      ["gpa", "GPA module"],
      ["nongpa", "Non-GPA module"],
    ].forEach(([value, text]) => {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = text;
      select.appendChild(opt);
    });
    select.value = defaultIsGpa ? "gpa" : "nongpa";
    wrap.appendChild(select);

    function paint(isGpa) {
      badge.textContent = isGpa ? "GPA" : "Non-GPA";
      badge.classList.toggle("badge-gpa", isGpa);
      badge.classList.toggle("badge-nongpa", !isGpa);
    }
    paint(defaultIsGpa);

    select.addEventListener("change", () => {
      const isGpa = select.value === "gpa";
      state.gpaOverrides.set(key(rowId), isGpa);
      paint(isGpa);
      onChange();
    });

    return wrap;
  }

  function isGpaEligible(rowId, defaultValue = true) {
    const k = key(rowId);
    return state.gpaOverrides.has(k) ? state.gpaOverrides.get(k) : defaultValue;
  }

  // ---- Summary rows (SGPA / Overall GPA / per-scale GPA, etc.) ----

  function makeSummaryRow({
    colSpan,
    label,
    value,
    extraText,
    isWhatIf,
    rowClass,
    bgClass,
  }) {
    const tr = document.createElement("tr");
    tr.className = `gpa-ext-summary-row ${rowClass || ""} ${bgClass || ""}`;

    const td = document.createElement("td");
    td.colSpan = colSpan;
    td.className = "text-right";
    td.innerHTML =
      `<strong>${label}</strong> <span class="gpa-ext-value">${value}</span>` +
      (extraText ? ` <span class="gpa-ext-extra">${extraText}</span>` : "") +
      (isWhatIf ? ' <span class="gpa-ext-whatif-badge">what-if</span>' : "");
    tr.appendChild(td);
    return tr;
  }

  function clearPreviousSummaryRows() {
    document
      .querySelectorAll(".gpa-ext-summary-row")
      .forEach((el) => el.remove());
  }

  // ---- Repeat/resit handling ----
  // Given a flat list of module entries that may contain the same
  // course code more than once (a resit/repeat), returns the Set of
  // entry ids that should actually count toward GPA math: the single
  // highest-graded attempt per code. Every other attempt for that code
  // is excluded so its credit is never counted twice. Entries with no
  // code, or that aren't graded, never win (they simply don't compete).
  //
  // This is dynamic by design - call it fresh on every recalculation,
  // since what-if guesses can change which attempt currently has the
  // higher grade point.
  function selectBestAttempts(entries) {
    const byCode = new Map();
    entries.forEach((e) => {
      if (!e.code) return; // no code to group by - treat as unique, always "wins" on its own
      if (!byCode.has(e.code)) byCode.set(e.code, []);
      byCode.get(e.code).push(e);
    });

    const winners = new Set();
    byCode.forEach((group) => {
      const graded = group.filter((e) => e.isGraded);
      if (graded.length === 0) return; // nothing graded yet in this group - no winner to pick
      let best = graded[0];
      graded.forEach((e) => {
        if (e.gradePoint > best.gradePoint) best = e;
      });
      winners.add(best.id);
    });

    return winners;
  }

  // For an entry with no `code` (grouping key), it should always be
  // treated as its own winner - this helper makes that check explicit
  // at call sites instead of relying on Set membership alone.
  function isWinningAttempt(entry, winners) {
    if (!entry.code) return true;
    return winners.has(entry.id);
  }

  return {
    state,
    buildWhatIfDropdown,
    getWhatIfOverride,
    hasAnyWhatIf,
    buildClassificationControl,
    isGpaEligible,
    makeSummaryRow,
    clearPreviousSummaryRows,
    selectBestAttempts,
    isWinningAttempt,
  };
}

window.GPAEngine = { createEngine };
