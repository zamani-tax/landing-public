// src/lib/payroll.ts
function toMonthlyBase(mode, baseWage, days, workHoursMonthly) {
  if (mode === "monthly") {
    const baseMonthly2 = baseWage;
    const hourlyWage2 = baseMonthly2 / workHoursMonthly;
    return { baseMonthly: baseMonthly2, hourlyWage: hourlyWage2 };
  }
  if (mode === "daily") {
    const baseMonthly2 = baseWage * days;
    const hourlyWage2 = baseMonthly2 / workHoursMonthly;
    return { baseMonthly: baseMonthly2, hourlyWage: hourlyWage2 };
  }
  const baseMonthly = baseWage * workHoursMonthly;
  const hourlyWage = baseWage;
  return { baseMonthly, hourlyWage };
}
function calcTaxProgressive(taxable, exemptionMonthly, brackets) {
  let remaining = Math.max(0, taxable - exemptionMonthly);
  let tax = 0;
  let prevCap = 0;
  for (const b of brackets) {
    if (remaining <= 0) break;
    const cap = b.upTo ?? Number.POSITIVE_INFINITY;
    const width = Math.max(0, cap - prevCap);
    const slice = Math.min(remaining, width);
    tax += slice * b.rate;
    remaining -= slice;
    prevCap = cap;
  }
  return Math.max(0, Math.floor(tax));
}
function computePayroll(cfg, input) {
  const { baseMonthly, hourlyWage } = toMonthlyBase(
    input.mode,
    input.baseWage,
    input.days,
    cfg.workHoursMonthly
  );
  const allowances = {
    housing: input.includeHousing ? cfg.allowances.housing : 0,
    food: input.includeFood ? cfg.allowances.food : 0,
    child: input.includeChildAllowance ? cfg.allowances.childPerKid * (input.married ? input.childCount : 0) : 0
  };
  const overtime = input.hoursOvertime > 0 ? Math.floor(input.hoursOvertime * hourlyWage * input.overtimeFactor) : 0;
  const severanceMonthly = input.includeSeverance ? input.severanceMonthly : 0;
  const grossBeforeDeductions = baseMonthly + allowances.housing + allowances.food + allowances.child + overtime + severanceMonthly;
  const insuranceBase = input.includeInsurance ? baseMonthly + allowances.housing + allowances.food + allowances.child + overtime : 0;
  const workerIns = Math.floor(insuranceBase * cfg.insurance.worker);
  const employerIns = Math.floor(insuranceBase * cfg.insurance.employer);
  const unempIns = Math.floor(insuranceBase * cfg.insurance.unemployment);
  const taxableIncomeBase = input.includeTax ? grossBeforeDeductions - workerIns : 0;
  const tax = input.includeTax ? calcTaxProgressive(taxableIncomeBase, cfg.tax.exemptionMonthly, cfg.tax.brackets) : 0;
  const netPay = grossBeforeDeductions - workerIns - tax;
  const employerCost = grossBeforeDeductions + employerIns + unempIns;
  return {
    hourlyWage: Math.floor(hourlyWage),
    baseMonthly: Math.floor(baseMonthly),
    allowancesIncluded: allowances,
    overtime,
    severanceMonthly,
    grossBeforeDeductions: Math.floor(grossBeforeDeductions),
    insuranceBase: Math.floor(insuranceBase),
    insurance: {
      worker: workerIns,
      employer: employerIns,
      unemployment: unempIns,
      total: workerIns + employerIns + unempIns
    },
    taxableIncome: Math.max(0, Math.floor(taxableIncomeBase)),
    tax,
    netPay: Math.floor(netPay),
    employerCost: Math.floor(employerCost)
  };
}

// src/scripts/salary-calculator.ts
var $ = (s) => document.querySelector(s);
var Rial = (n) => new Intl.NumberFormat("fa-IR").format(Math.floor(Number(n || 0)));
var FALLBACK_CFG = {
  year: 1404,
  workHoursMonthly: 220,
  insurance: { worker: 0.07, employer: 0.2, unemployment: 0.03 },
  allowances: { housing: 9e6, food: 22e6, childPerKid: 5e6 },
  tax: {
    exemptionMonthly: 24e7,
    brackets: [
      { upTo: 6e7, rate: 0.1 },
      { upTo: 8e7, rate: 0.15 },
      { upTo: 12e7, rate: 0.2 },
      { upTo: 166666667, rate: 0.25 },
      { upTo: null, rate: 0.3 }
    ]
  }
};
var state = {
  cfg: FALLBACK_CFG,
  input: {
    mode: "daily",
    baseWage: 3463656,
    days: 30,
    hoursOvertime: 0,
    overtimeFactor: 1.4,
    married: false,
    childCount: 0,
    includeHousing: true,
    includeFood: true,
    includeChildAllowance: true,
    includeInsurance: true,
    includeTax: true,
    includeSeverance: false,
    severanceMonthly: 0
  }
};
async function loadConfig() {
  try {
    const base = "/";
    const res = await fetch(`${base}payroll-1404.json`, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    state.cfg = await res.json();
    const el = $("#cfg-source");
    if (el) el.textContent = `\u067E\u06CC\u06A9\u0631\u0628\u0646\u062F\u06CC: \u0627\u0632 ${base}payroll-1404.json`;
  } catch (err) {
    state.cfg = FALLBACK_CFG;
    const el = $("#cfg-source");
    if (el) el.textContent = "\u067E\u06CC\u06A9\u0631\u0628\u0646\u062F\u06CC: \u0646\u0633\u062E\u0647 \u0628\u0627\u0646\u062F\u0644 (\u062F\u0627\u062E\u0644\u06CC)";
    console.warn("Load config failed, fallback used:", err);
  }
  renderOutputs();
}
function renderForm() {
  const root = $("#form-root");
  if (!root) return;
  root.innerHTML = `
    <div class="grid grid-cols-2 gap-3">
      <label class="col-span-2 text-sm">\u062D\u0627\u0644\u062A \u0645\u062D\u0627\u0633\u0628\u0647
        <select id="f-mode" class="w-full border rounded-lg p-2">
          <option value="daily">\u0631\u0648\u0632\u0627\u0646\u0647</option>
          <option value="monthly">\u0645\u0627\u0647\u0627\u0646\u0647</option>
          <option value="hourly">\u0633\u0627\u0639\u062A\u06CC</option>
        </select>
      </label>

      <label class="text-sm">\u0645\u0632\u062F \u067E\u0627\u06CC\u0647
        <input id="f-base" type="number" class="w-full border rounded-lg p-2" min="0" value="${state.input.baseWage}">
      </label>

      <label class="text-sm">\u0631\u0648\u0632\u0647\u0627\u06CC \u06A9\u0627\u0631\u06A9\u0631\u062F
        <input id="f-days" type="number" class="w-full border rounded-lg p-2" min="0" value="${state.input.days}">
      </label>

      <label class="text-sm">\u0633\u0627\u0639\u062A \u0627\u0636\u0627\u0641\u0647\u200C\u06A9\u0627\u0631\u06CC
        <input id="f-ot" type="number" class="w-full border rounded-lg p-2" min="0" value="${state.input.hoursOvertime}">
      </label>

      <label class="text-sm">\u0636\u0631\u06CC\u0628 \u0627\u0636\u0627\u0641\u0647\u200C\u06A9\u0627\u0631\u06CC
        <input id="f-otf" type="number" step="0.1" class="w-full border rounded-lg p-2" min="0" value="${state.input.overtimeFactor}">
      </label>

      <label class="text-sm flex items-center gap-2 col-span-2">
        <input id="f-married" type="checkbox" ${state.input.married ? "checked" : ""}>
        \u0645\u062A\u0623\u0647\u0644
      </label>

      <label class="text-sm">\u062A\u0639\u062F\u0627\u062F \u0641\u0631\u0632\u0646\u062F
        <input id="f-kids" type="number" class="w-full border rounded-lg p-2" min="0" value="${state.input.childCount}">
      </label>

      <div class="col-span-2 grid grid-cols-2 gap-2 text-sm" id="switches"></div>

      <label class="text-sm col-span-2">\u0633\u0646\u0648\u0627\u062A \u0645\u0627\u0647\u0627\u0646\u0647 (\u0631\u06CC\u0627\u0644)
        <input id="f-sev" type="number" class="w-full border rounded-lg p-2" min="0" value="${state.input.severanceMonthly}">
      </label>
    </div>
  `;
  const switches = $("#switches");
  if (switches) {
    const keys = ["Housing", "Food", "ChildAllowance", "Insurance", "Tax", "Severance"];
    const labels = {
      Housing: "\u062D\u0642 \u0645\u0633\u06A9\u0646",
      Food: "\u0628\u0646 \u06A9\u0627\u0631\u06AF\u0631\u06CC",
      ChildAllowance: "\u062D\u0642 \u0627\u0648\u0644\u0627\u062F",
      Insurance: "\u0628\u06CC\u0645\u0647",
      Tax: "\u0645\u0627\u0644\u06CC\u0627\u062A",
      Severance: "\u0633\u0646\u0648\u0627\u062A \u062A\u0648\u0627\u0641\u0642\u06CC"
    };
    switches.innerHTML = keys.map((key) => {
      const id = "f-" + key.toLowerCase();
      const includeProp = `include${key}`;
      const checked = state.input[includeProp] ? "checked" : "";
      const label = labels[key];
      return `<label class="flex items-center gap-2"><input id="${id}" type="checkbox" ${checked}> ${label}</label>`;
    }).join("");
  }
  const modeSel = document.getElementById("f-mode");
  if (modeSel) modeSel.value = state.input.mode;
  document.getElementById("f-mode")?.addEventListener("change", (e) => {
    state.input.mode = e.target.value;
    renderOutputs();
  });
  document.getElementById("f-base")?.addEventListener("input", (e) => {
    state.input.baseWage = Number(e.target.value || 0);
    renderOutputs();
  });
  document.getElementById("f-days")?.addEventListener("input", (e) => {
    state.input.days = Number(e.target.value || 0);
    renderOutputs();
  });
  document.getElementById("f-ot")?.addEventListener("input", (e) => {
    state.input.hoursOvertime = Number(e.target.value || 0);
    renderOutputs();
  });
  document.getElementById("f-otf")?.addEventListener("input", (e) => {
    state.input.overtimeFactor = Number(e.target.value || 0);
    renderOutputs();
  });
  document.getElementById("f-married")?.addEventListener("change", (e) => {
    state.input.married = e.target.checked;
    renderOutputs();
  });
  document.getElementById("f-kids")?.addEventListener("input", (e) => {
    state.input.childCount = Number(e.target.value || 0);
    renderOutputs();
  });
  document.getElementById("f-housing")?.addEventListener("change", (e) => {
    state.input.includeHousing = e.target.checked;
    renderOutputs();
  });
  document.getElementById("f-food")?.addEventListener("change", (e) => {
    state.input.includeFood = e.target.checked;
    renderOutputs();
  });
  document.getElementById("f-childallowance")?.addEventListener("change", (e) => {
    state.input.includeChildAllowance = e.target.checked;
    renderOutputs();
  });
  document.getElementById("f-insurance")?.addEventListener("change", (e) => {
    state.input.includeInsurance = e.target.checked;
    renderOutputs();
  });
  document.getElementById("f-tax")?.addEventListener("change", (e) => {
    state.input.includeTax = e.target.checked;
    renderOutputs();
  });
  document.getElementById("f-severance")?.addEventListener("change", (e) => {
    state.input.includeSeverance = e.target.checked;
    renderOutputs();
  });
  document.getElementById("f-sev")?.addEventListener("input", (e) => {
    state.input.severanceMonthly = Number(e.target.value || 0);
    renderOutputs();
  });
}
function renderLawEditor() {
  const law = $("#law-root");
  if (!law) return;
  const cfg = state.cfg;
  law.innerHTML = `
    <label class="text-sm">\u0645\u0639\u0627\u0641\u06CC\u062A \u0645\u0627\u0647\u0627\u0646\u0647
      <input id="t-exm" type="number" class="w-full border rounded-lg p-2" value="${cfg.tax.exemptionMonthly}">
    </label>
    <div class="text-sm md:col-span-2">
      <p class="mb-2">\u0637\u0628\u0642\u0627\u062A:</p>
      ${cfg.tax.brackets.map(
    (b, i) => `
        <div class="flex items-center gap-2 mb-2">
          <input data-i="${i}" data-k="upTo" type="number" class="flex-1 border rounded-lg p-2" placeholder="\u0633\u0642\u0641 \u062A\u062C\u0645\u0639\u06CC" value="${b.upTo ?? ""}">
          <input data-i="${i}" data-k="rate" type="number" step="0.01" class="w-28 border rounded-lg p-2" placeholder="\u0646\u0631\u062E" value="${b.rate}">
        </div>`
  ).join("")}
    </div>
    <div class="text-xs text-gray-500 md:col-span-2">* \u0627\u06AF\u0631 \u0633\u0642\u0641 \u067E\u0644\u0647 \u0622\u062E\u0631 \u0646\u0627\u0645\u062D\u062F\u0648\u062F \u0627\u0633\u062A\u060C \u0641\u06CC\u0644\u062F \u0633\u0642\u0641 \u0631\u0627 \u062E\u0627\u0644\u06CC \u0628\u06AF\u0630\u0627\u0631.</div>
  `;
  document.getElementById("t-exm")?.addEventListener("input", (e) => {
    state.cfg.tax.exemptionMonthly = Number(e.target.value || 0);
    renderOutputs();
  });
  law.querySelectorAll("input[data-i]").forEach((inp) => {
    inp.addEventListener("input", () => {
      const idx = Number(inp.dataset.i);
      const key = inp.dataset.k;
      const v = inp.value;
      if (key === "upTo") state.cfg.tax.brackets[idx].upTo = v === "" ? null : Number(v);
      else state.cfg.tax.brackets[idx].rate = Number(v || 0);
      renderOutputs();
    });
  });
}
function renderOutputs() {
  const out = $("#outputs");
  if (!out) return;
  const r = computePayroll(state.cfg, state.input);
  out.innerHTML = `
    <div class="border rounded-xl p-3">
      <div class="text-xs text-gray-500 mb-1">\u062E\u0627\u0644\u0635 \u067E\u0631\u062F\u0627\u062E\u062A\u06CC</div>
      <div class="text-2xl font-bold">${Rial(r.netPay)} \u0631\u06CC\u0627\u0644</div>
    </div>
    <div class="border rounded-xl p-3">
      <div class="text-xs text-gray-500 mb-1">\u0645\u0627\u0644\u06CC\u0627\u062A</div>
      <div class="text-xl font-semibold">${Rial(r.tax)} \u0631\u06CC\u0627\u0644</div>
    </div>
    <div class="border rounded-xl p-3">
      <div class="text-xs text-gray-500 mb-1">\u0628\u06CC\u0645\u0647 \u06A9\u0627\u0631\u06AF\u0631</div>
      <div class="text-xl font-semibold">${Rial(r.insurance.worker)} \u0631\u06CC\u0627\u0644</div>
    </div>
    <div class="border rounded-xl p-3">
      <div class="text-xs text-gray-500 mb-1">\u0647\u0632\u06CC\u0646\u0647 \u06A9\u0644 \u06A9\u0627\u0631\u0641\u0631\u0645\u0627</div>
      <div class="text-xl font-semibold">${Rial(r.employerCost)} \u0631\u06CC\u0627\u0644</div>
    </div>
  `;
}
function bindButtons() {
  const preset = $("#btn-preset");
  const pdf = $("#btn-pdf");
  preset?.addEventListener("click", () => {
    state.input.mode = "daily";
    state.input.baseWage = 3e6;
    state.input.days = 30;
    state.input.hoursOvertime = 20;
    state.input.overtimeFactor = 1.4;
    state.input.married = true;
    state.input.childCount = 1;
    renderForm();
    renderOutputs();
  });
  pdf?.addEventListener("click", async () => {
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) return alert("jsPDF \u0644\u0648\u062F \u0646\u0634\u062F.");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    doc.setFontSize(14);
    doc.text(`\u06AF\u0632\u0627\u0631\u0634 \u062D\u0642\u0648\u0642 \u0648 \u062F\u0633\u062A\u0645\u0632\u062F \u06F1\u06F4\u06F0\u06F4`, 40, 50);
    const r = computePayroll(state.cfg, state.input);
    const lines = [
      `\u062E\u0627\u0644\u0635 \u067E\u0631\u062F\u0627\u062E\u062A\u06CC: ${Rial(r.netPay)} \u0631\u06CC\u0627\u0644`,
      `\u0645\u0627\u0644\u06CC\u0627\u062A: ${Rial(r.tax)} \u0631\u06CC\u0627\u0644`,
      `\u0628\u06CC\u0645\u0647 \u06A9\u0627\u0631\u06AF\u0631: ${Rial(r.insurance.worker)} \u0631\u06CC\u0627\u0644`,
      `\u0647\u0632\u06CC\u0646\u0647 \u06A9\u0644 \u06A9\u0627\u0631\u0641\u0631\u0645\u0627: ${Rial(r.employerCost)} \u0631\u06CC\u0627\u0644`
    ];
    lines.forEach((t, i) => doc.text(t, 40, 90 + i * 24));
    doc.save("salary-1404.pdf");
  });
}
function init() {
  renderForm();
  renderLawEditor();
  bindButtons();
  loadConfig();
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
//# sourceMappingURL=salary-calculator.js.map
