// absensi-haid.js
// Renderer + export excel untuk absensi haid

import { getHaidAggregate } from "./api-consolidated.js";

const DAYS = 31;

// Helper to create element
function createEl(tag, attrs = {}, text) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  if (text !== undefined) el.textContent = text;
  return el;
}

function monthFromInput(value) {
  if (!value) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  const [y, m] = value.split("-");
  return { year: parseInt(y, 10), month: parseInt(m, 10) };
}

// Normalizer kelas
function normalizeClass(cls) {
  if (!cls) return { grade: 99, section: "" };
  let s = String(cls).trim().toUpperCase();
  s = s.replace(/[.\-\/_\s]+/g, "");
  let grade = 99;
  let section = "";
  if (s.startsWith("XII")) {
    grade = 12;
    section = s.slice(3);
  } else if (s.startsWith("XI")) {
    grade = 11;
    section = s.slice(2);
  } else if (s.startsWith("X")) {
    grade = 10;
    section = s.slice(1);
  } else {
    const m = s.match(/^(\d{2})(.*)$/);
    if (m) {
      grade = parseInt(m[1], 10);
      section = m[2] || "";
    } else {
      const mm = s.match(/^(\d+)/);
      if (mm) {
        grade = parseInt(mm[1], 10);
        section = s.slice(mm[1].length) || "";
      } else {
        grade = 99;
        section = s;
      }
    }
  }
  return { grade, section };
}

function classCompare(a, b) {
  const na = normalizeClass(a || "");
  const nb = normalizeClass(b || "");
  if (na.grade !== nb.grade) return na.grade - nb.grade;
  const sa = na.section || "";
  const sb = nb.section || "";
  return sa.localeCompare(sb);
}

// ================================
//           RENDER TABLE
// ================================
async function renderAbsensi() {
  const table = document.getElementById("absensiTable");
  const suspectList = document.getElementById("suspectList");
  const honestList = document.getElementById("honestList");
  const summary = document.getElementById("summary");

  table.innerHTML = "";
  suspectList.innerHTML = "";
  honestList.innerHTML = "";

  summary.textContent = "Memuat data...";

  const monthVal = document.getElementById("monthPicker").value;
  const { year, month } = monthFromInput(monthVal);
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;

  let response;
  try {
    response = await getHaidAggregate(monthStr);
  } catch (err) {
    summary.textContent = "Gagal memuat data: " + err.message;
    return;
  }

  const data = response.data || response || [];
  const studentsArr = [];

  data.forEach((item) => {
    if (!item || !item.studentId) return;
    studentsArr.push({
      studentId: item.studentId,
      name: item.name || item.nama,
      kelas: item.classId || item.kelas,
      days: new Set(item.days || []),
    });
  });

  // Sorting kelas → nama
  studentsArr.sort((a, b) => {
    const c = classCompare(a.kelas, b.kelas);
    if (c !== 0) return c;
    return (a.name || "").localeCompare(b.name || "");
  });

  // Simpan global untuk export excel
  window._lastAbsensiData = studentsArr;

  // Render table Head
  const thead = createEl("thead");
  const trh = createEl("tr");

  trh.appendChild(createEl("th", { class: "p-2 border" }, "No"));
  trh.appendChild(createEl("th", { class: "p-2 border" }, "Nama"));
  trh.appendChild(createEl("th", { class: "p-2 border text-center" }, "Kelas"));

  for (let d = 1; d <= DAYS; d++) {
    trh.appendChild(
      createEl("th", { class: "p-1 border text-center" }, String(d))
    );
  }

  thead.appendChild(trh);
  table.appendChild(thead);

  // Render table Body
  const tbody = createEl("tbody");
  let idx = 1;

  studentsArr.forEach((info) => {
    const tr = createEl("tr");

    tr.appendChild(createEl("td", { class: "p-1 border" }, idx++));
    tr.appendChild(createEl("td", { class: "p-1 border" }, info.name));
    tr.appendChild(createEl("td", { class: "p-1 border text-center" }, info.kelas));

    for (let d = 1; d <= DAYS; d++) {
      const cell = createEl("td", { class: "p-1 border text-center" });
      cell.textContent = info.days.has(d) ? "X" : "-";
      tr.appendChild(cell);
    }

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);

  summary.textContent = `Menampilkan ${studentsArr.length} siswi untuk ${monthStr}.`;
}

// ===================================
//            EXPORT EXCEL
// ===================================
// ===================================
//        EXPORT EXCEL CANTIK
// ===================================
function exportToExcel(studentsArr, year, month) {
  const wb = XLSX.utils.book_new();
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;

  // =====================================================
  // SHEET 1 → ABSENSI (menggunakan JSON → Worksheet)
  // =====================================================
  const rows = [];

  studentsArr.forEach((s) => {
    const row = {
      Nama: s.name,
      Kelas: s.kelas,
    };

    for (let d = 1; d <= 31; d++) {
      row[`Tgl ${d}`] = s.days.has(d) ? "X" : "-";
    }

    rows.push(row);
  });

  const wsAbs = XLSX.utils.json_to_sheet(rows);

  // Bold header
  const rangeAbs = XLSX.utils.decode_range(wsAbs["!ref"]);
  for (let C = rangeAbs.s.c; C <= rangeAbs.e.c; C++) {
    const cell = XLSX.utils.encode_cell({ r: 0, c: C });
    if (wsAbs[cell]) {
      wsAbs[cell].s = {
        font: { bold: true },
        alignment: { horizontal: "center" }
      };
    }
  }

  XLSX.utils.book_append_sheet(wb, wsAbs, "Absensi");

  // =====================================================
  // SHEET 2 → STATUS LIST (Normal + Abnormal)
  // =====================================================
  const suspectItems = [...document.querySelectorAll("#suspectList li")].map(li => li.textContent);
  const honestItems = [...document.querySelectorAll("#honestList li")].map(li => li.textContent);

  const listData = [
    ["Kategori", "Nama"],
    ...suspectItems.map(v => ["Abnormal", v]),
    ...honestItems.map(v => ["Normal", v]),
  ];

  const wsList = XLSX.utils.aoa_to_sheet(listData);

  // header bold
  wsList["A1"].s = { font: { bold: true } };
  wsList["B1"].s = { font: { bold: true } };

  // Auto width
  wsList["!cols"] = [
    { wch: 12 },
    { wch: 40 },
  ];

  XLSX.utils.book_append_sheet(wb, wsList, "Status List");

  // =====================================================
  // SAVE FILE
  // =====================================================
  XLSX.writeFile(wb, `absensi_haid_${monthStr}.xlsx`);
}


// ===================================
//                INIT
// ===================================
function init() {
  const picker = document.getElementById("monthPicker");
  const refresh = document.getElementById("refreshBtn");
  const excelBtn = document.getElementById("downloadExcel");

  // Set default bulan sekarang
  const now = new Date();
  picker.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}`;

  refresh.addEventListener("click", (e) => {
    e.preventDefault();
    renderAbsensi();
  });

  // tombol download excel
  excelBtn.addEventListener("click", () => {
    const monthVal = picker.value;
    const { year, month } = monthFromInput(monthVal);

    if (!window._lastAbsensiData || window._lastAbsensiData.length === 0) {
      alert("Data belum siap diunduh!");
      return;
    }

    exportToExcel(window._lastAbsensiData, year, month);
  });

  renderAbsensi();
}

document.addEventListener("DOMContentLoaded", init);
