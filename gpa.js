// Grade point mappings
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

const gradePoints42 = {
  "A+": 4.2,
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

const gradeOptions = Object.keys(gradePoints40);

const rowsData = [];
let nonGpaCredits = 0;
let lastTableFound = null;
let gpa40Row = null;
let gpa42Row = null;

const allRows = document.querySelectorAll("tr");

allRows.forEach((row) => {
  const cells = row.querySelectorAll("td");

  if (row.className.includes("bodytext") && cells.length === 5) {
    lastTableFound = row.closest("table");

    const gradeCell = cells[2];
    const rawGrade = gradeCell.textContent.trim();
    const gpaCreditText = cells[3].textContent.trim();

    if (gpaCreditText === "-") {
      const rawCredit = parseFloat(cells[4]?.textContent.trim());
      if (!isNaN(rawCredit)) nonGpaCredits += rawCredit;
      return;
    }

    const credit = parseFloat(gpaCreditText);
    if (isNaN(credit)) return;

    if (rawGrade.startsWith("Pending")) {
      const select = document.createElement("select");
      select.style.marginLeft = "8px";

      const blankOption = document.createElement("option");
      blankOption.value = "";
      blankOption.textContent = "Guess...";
      select.appendChild(blankOption);

      gradeOptions.forEach((g) => {
        const opt = document.createElement("option");
        opt.value = g;
        opt.textContent = g;
        select.appendChild(opt);
      });

      gradeCell.appendChild(select);
      select.addEventListener("change", recalculate);

      rowsData.push({ isPending: true, credit, selectEl: select });
    } else {
      const cleanGrade = rawGrade.split(" (")[0].trim();
      if (gradePoints40[cleanGrade] === undefined) {
        console.warn("Unrecognized grade, skipping:", cleanGrade);
        return;
      }
      rowsData.push({ isPending: false, credit, grade: cleanGrade });
    }
  }
});

function recalculate() {
  let qp40 = 0,
    qp42 = 0,
    totalCredits = 0;

  rowsData.forEach((entry) => {
    let grade;
    if (entry.isPending) {
      grade = entry.selectEl.value;
      if (!grade) return;
    } else {
      grade = entry.grade;
    }

    totalCredits += entry.credit;
    qp40 += gradePoints40[grade] * entry.credit;
    qp42 += gradePoints42[grade] * entry.credit;
  });

  const gpa40 = totalCredits > 0 ? (qp40 / totalCredits).toFixed(2) : "-";
  const gpa42 = totalCredits > 0 ? (qp42 / totalCredits).toFixed(2) : "-";

  gpa40Row.querySelector(".gpa-value").textContent = gpa40;
  gpa40Row.querySelector(".gpa-detail").innerHTML =
    `<b>GPA Credits: ${totalCredits}</b>`;

  gpa42Row.querySelector(".gpa-value").textContent = gpa42;
  gpa42Row.querySelector(".gpa-detail").textContent =
    `Non-GPA Credits: ${nonGpaCredits}`;
}

function buildGpaRow(labelText, detailBgColor) {
  const tr = document.createElement("tr");

  const labelTd = document.createElement("td");
  labelTd.colSpan = 2;
  labelTd.style.backgroundColor = "#C6E0F0";
  labelTd.innerHTML = `<b>${labelText}</b>`;

  const valueTd = document.createElement("td");
  valueTd.style.backgroundColor = "#FFFFFF";
  valueTd.innerHTML = `<b class="gpa-value">-</b>`;

  const detailTd = document.createElement("td");
  detailTd.colSpan = 2;
  if (detailBgColor) detailTd.style.backgroundColor = detailBgColor;
  detailTd.className = "bodytext";
  detailTd.innerHTML = `<span class="gpa-detail"></span>`;

  tr.appendChild(labelTd);
  tr.appendChild(valueTd);
  tr.appendChild(detailTd);
  return tr;
}

if (lastTableFound) {
  const tbody = lastTableFound.querySelector("tbody") || lastTableFound;

  gpa40Row = buildGpaRow("My GPA (4.0 scale)", "#FFE8B0");
  gpa42Row = buildGpaRow("My GPA (4.2 scale)", null);

  tbody.appendChild(gpa40Row);
  tbody.appendChild(gpa42Row);

  recalculate();
}
