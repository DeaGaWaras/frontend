 // absensi-haid.js
// Frontend renderer + heuristic detection untuk absensi haid
import { getHaidAggregate } from "./api-consolidated.js";

const DAYS = 31;

function createEl(tag, attrs = {}, text) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  if (text !== undefined) el.textContent = text;
  return el;
}

function parseDateString(s) {
  // Try parsing ISO-like date strings
  const d = new Date(s);
  if (!isNaN(d)) return d;
  return null;
}

function monthFromInput(value) {
  // value = "YYYY-MM"
  if (!value) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  const [y, m] = value.split("-");
  return { year: parseInt(y, 10), month: parseInt(m, 10) };
}

function sameMonthYear(dateObj, year, month) {
  return dateObj.getFullYear() === year && dateObj.getMonth() + 1 === month;
}

function analyzeDays(daySet) {
  // daySet: Set<number> of days with X
  if (!daySet || daySet.size === 0) return { honest: false, suspect: false };
  const days = Array.from(daySet).sort((a, b) => a - b);

  // find consecutive sequences
  let maxSeq = 1;
  let curSeq = 1;
  for (let i = 1; i < days.length; i++) {
    if (days[i] === days[i - 1] + 1) {
      curSeq++;
      if (curSeq > maxSeq) maxSeq = curSeq;
    } else {
      curSeq = 1;
    }
  }

  // detect small gaps (1-2 empty days between Xs)
  let hasSmallGap = false;
  for (let i = 1; i < days.length; i++) {
    const gapEmpty = days[i] - days[i - 1] - 1; // number of empty days between
    if (gapEmpty >= 1 && gapEmpty <= 2) {
      hasSmallGap = true;
      break;
    }
  }

  return {
    honest: maxSeq >= 4, // 4 atau lebih berurutan -> jujur
    suspect: hasSmallGap && days.length >= 2,
    total: days.length,
    maxSeq,
  };
}

function normalizeClass(cls) {
  if (!cls) return { grade: 99, section: "" };
  let s = String(cls).trim().toUpperCase();
  // remove common separators
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
      // fallback: try to extract leading number
      const mm = s.match(/^(\d+)/);
      if (mm) {
        grade = parseInt(mm[1], 10);
        section = s.slice(mm[1].length) || "";
      } else {
        // unknown format: push to end
        grade = 99;
        section = s;
      }
    }
  }
  // normalize section to a single letter or string for sorting
  section = section || "";
  return { grade, section };
}

function classCompare(a, b) {
  // a and b are class strings
  const na = normalizeClass(a || "");
  const nb = normalizeClass(b || "");
  if (na.grade !== nb.grade) return na.grade - nb.grade;
  // compare section lexicographically
  const sa = na.section || "";
  const sb = nb.section || "";
  if (sa === sb) return 0;
  return sa < sb ? -1 : 1;
}

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
    // Call optimized aggregated endpoint from backend
    // Backend returns { success: true, data: [{ studentId, name, classId, days: [1,2,3...] }] }
    response = await getHaidAggregate(monthStr);
  } catch (err) {
    summary.textContent = "Gagal memuat data absensi: " + err.message;
    return;
  }

  // Backend returns aggregated data: [{ studentId, name, classId, days: [1,2,3...] }]
  // days array contains day numbers (1-31) for haid absensi in the requested month
  const data = response.data || response || [];
  const studentsArr = [];
  if (Array.isArray(data)) {
    data.forEach((item) => {
      if (!item || !item.studentId) return;
      const sid = item.studentId;
      const name = item.name || item.nama || `Siswa ${sid}`;
      const kelas = item.classId || item.kelas || "-";
      const daysSet = new Set(item.days || []);
      studentsArr.push({ studentId: sid, name, kelas, days: daysSet });
    });
  }

  // sort students by kelas (10..11..12 then section) then by name
  studentsArr.sort((a, b) => {
    const c = classCompare(a.kelas, b.kelas);
    if (c !== 0) return c;
    return (a.name || "").localeCompare(b.name || "");
  });

  // Table header
  const thead = createEl("thead");
  const trh = createEl("tr");
  trh.appendChild(createEl("th", { class: "p-2 border text-left" }, "No"));
  trh.appendChild(createEl("th", { class: "p-2 border text-left" }, "Nama"));
  trh.appendChild(
    createEl("th", { class: "p-2 border text-center w-20" }, "Kelas")
  );
  for (let d = 1; d <= DAYS; d++) {
    trh.appendChild(
      createEl("th", { class: "p-1 border text-center w-6" }, String(d))
    );
  }
  thead.appendChild(trh);
  table.appendChild(thead);

  const tbody = createEl("tbody");

  let idx = 1;
  for (const info of studentsArr) {
    const tr = createEl("tr");
    tr.appendChild(
      createEl("td", { class: "p-1 border text-sm" }, String(idx++))
    );
    const nameCell = createEl("td", {
      class: "p-1 border text-sm font-medium text-left",
    });
    nameCell.textContent = info.name;
    const small = createEl(
      "div",
      { class: "text-xs text-gray-500 mt-1" },
      `📚 ${info.kelas}`
    );
    nameCell.appendChild(small);
    tr.appendChild(nameCell);

    // Kelas column
    tr.appendChild(
      createEl("td", { class: "p-1 border text-sm text-center" }, info.kelas)
    );

    for (let d = 1; d <= DAYS; d++) {
      const cell = createEl("td", { class: "p-1 border text-center text-sm" });
      if (info.days.has(d)) {
        cell.textContent = "X";
        cell.classList.add("text-red-600", "font-semibold");
      } else {
        cell.textContent = "-";
        cell.classList.add("text-gray-400");
      }
      tr.appendChild(cell);
    }

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);

  // Analyze patterns
  const suspects = [];
  const honest = [];
  for (const info of studentsArr) {
    const an = analyzeDays(info.days);
    if (an.honest)
      honest.push({
        id: info.studentId,
        name: info.name,
        total: an.total,
        maxSeq: an.maxSeq,
      });
    else if (an.suspect)
      suspects.push({ id: info.studentId, name: info.name, total: an.total });
  }

  if (suspects.length === 0 && honest.length === 0) {
    summary.textContent = `Tidak ada data haid untuk ${monthStr}.`;
  } else {
    summary.textContent = `Menampilkan ${studentsArr.length} siswi untuk ${monthStr}.`;
  }

  suspects.forEach((s) => {
    const li = createEl("li", {}, `${s.name} — total X: ${s.total}`);
    suspectList.appendChild(li);
  });
  honest.forEach((h) => {
    const li = createEl(
      "li",
      {},
      `${h.name} — total X: ${h.total}, berurutan: ${h.maxSeq}`
    );
    honestList.appendChild(li);
  });
}

function init() {
  const picker = document.getElementById("monthPicker");
  const refresh = document.getElementById("refreshBtn");
  // set default to current month
  const now = new Date();
  picker.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}`;

  refresh.addEventListener("click", (e) => {
    e.preventDefault();
    renderAbsensi();
  });

  // render once
  renderAbsensi();
}

document.addEventListener("DOMContentLoaded", init);
