// src/scripts/salary-calculator.ts
import { computePayroll, type PayrollConfig, type PayrollInput } from "~/lib/payroll";
// نسخه‌ی درونی (باندل‌شده)
import bundledCfg from "~/data/payroll-1404.json";

const $ = (s: string) => document.querySelector(s) as HTMLElement | null;
const Rial = (n: number | string) =>
    new Intl.NumberFormat("fa-IR").format(Math.floor(Number(n || 0)));

const FALLBACK_CFG: PayrollConfig = bundledCfg as PayrollConfig;

const state: { cfg: PayrollConfig; input: PayrollInput } = {
    cfg: FALLBACK_CFG,
    input: {
        mode: "daily",
        baseWage: 0,
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
        severanceMonthly: 0,
    },
};

// ⬇️ تلاش برای خوندن JSON بیرونی
async function loadConfig() {
    try {
        const base = import.meta.env.BASE_URL; // در GH Pages میشه /repo-name/
        const res = await fetch(`${base}payroll-1404.json`, { cache: "no-store" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        state.cfg = (await res.json()) as PayrollConfig;
        const el = $("#cfg-source");
        if (el) el.textContent = `پیکربندی: از ${base}payroll-1404.json`;
    } catch (err) {
        state.cfg = FALLBACK_CFG;
        const el = $("#cfg-source");
        if (el) el.textContent = "پیکربندی: نسخه باندل (داخلی)";
        console.warn("Load config failed, fallback used:", err);
    }
    renderOutputs();
}

function renderForm() {
    const root = $("#form-root");
    if (!root) return;
    root.innerHTML = `
    <div class="grid grid-cols-2 gap-3">
      <label class="col-span-2 text-sm">حالت محاسبه
        <select id="f-mode" class="w-full border rounded-lg p-2">
          <option value="daily">روزانه</option>
          <option value="monthly">ماهانه</option>
          <option value="hourly">ساعتی</option>
        </select>
      </label>

      <label class="text-sm">مزد پایه
        <input id="f-base" type="number" class="w-full border rounded-lg p-2" min="0" value="${state.input.baseWage}">
      </label>

      <label class="text-sm">روزهای کارکرد
        <input id="f-days" type="number" class="w-full border rounded-lg p-2" min="0" value="${state.input.days}">
      </label>

      <label class="text-sm">ساعت اضافه‌کاری
        <input id="f-ot" type="number" class="w-full border rounded-lg p-2" min="0" value="${state.input.hoursOvertime}">
      </label>

      <label class="text-sm">ضریب اضافه‌کاری
        <input id="f-otf" type="number" step="0.1" class="w-full border rounded-lg p-2" min="0" value="${state.input.overtimeFactor}">
      </label>

      <label class="text-sm flex items-center gap-2 col-span-2">
        <input id="f-married" type="checkbox" ${state.input.married ? "checked" : ""}>
        متأهل
      </label>

      <label class="text-sm">تعداد فرزند
        <input id="f-kids" type="number" class="w-full border rounded-lg p-2" min="0" value="${state.input.childCount}">
      </label>

      <div class="col-span-2 grid grid-cols-2 gap-2 text-sm" id="switches"></div>

      <label class="text-sm col-span-2">سنوات ماهانه (ریال)
        <input id="f-sev" type="number" class="w-full border rounded-lg p-2" min="0" value="${state.input.severanceMonthly}">
      </label>
    </div>
  `;

    const switches = $("#switches");
    if (switches) {
        const keys = ["Housing", "Food", "ChildAllowance", "Insurance", "Tax", "Severance"] as const;
        const labels: Record<(typeof keys)[number], string> = {
            Housing: "حق مسکن",
            Food: "بن کارگری",
            ChildAllowance: "حق اولاد",
            Insurance: "بیمه",
            Tax: "مالیات",
            Severance: "سنوات توافقی",
        };

        switches.innerHTML = keys
            .map((key) => {
                const id = "f-" + key.toLowerCase();
                const includeProp = `include${key}` as keyof PayrollInput;
                const checked = (state.input[includeProp] as unknown as boolean) ? "checked" : "";
                const label = labels[key];
                return `<label class="flex items-center gap-2"><input id="${id}" type="checkbox" ${checked}> ${label}</label>`;
            })
            .join("");
    }

    const modeSel = document.getElementById("f-mode") as HTMLSelectElement | null;
    if (modeSel) modeSel.value = state.input.mode;

    (document.getElementById("f-mode") as HTMLSelectElement | null)?.addEventListener("change", (e) => {
        state.input.mode = (e.target as HTMLSelectElement).value as PayrollInput["mode"];
        renderOutputs();
    });
    (document.getElementById("f-base") as HTMLInputElement | null)?.addEventListener("input", (e) => {
        state.input.baseWage = Number((e.target as HTMLInputElement).value || 0);
        renderOutputs();
    });
    (document.getElementById("f-days") as HTMLInputElement | null)?.addEventListener("input", (e) => {
        state.input.days = Number((e.target as HTMLInputElement).value || 0);
        renderOutputs();
    });
    (document.getElementById("f-ot") as HTMLInputElement | null)?.addEventListener("input", (e) => {
        state.input.hoursOvertime = Number((e.target as HTMLInputElement).value || 0);
        renderOutputs();
    });
    (document.getElementById("f-otf") as HTMLInputElement | null)?.addEventListener("input", (e) => {
        state.input.overtimeFactor = Number((e.target as HTMLInputElement).value || 0);
        renderOutputs();
    });
    (document.getElementById("f-married") as HTMLInputElement | null)?.addEventListener("change", (e) => {
        state.input.married = (e.target as HTMLInputElement).checked;
        renderOutputs();
    });
    (document.getElementById("f-kids") as HTMLInputElement | null)?.addEventListener("input", (e) => {
        state.input.childCount = Number((e.target as HTMLInputElement).value || 0);
        renderOutputs();
    });
    (document.getElementById("f-housing") as HTMLInputElement | null)?.addEventListener("change", (e) => {
        state.input.includeHousing = (e.target as HTMLInputElement).checked;
        renderOutputs();
    });
    (document.getElementById("f-food") as HTMLInputElement | null)?.addEventListener("change", (e) => {
        state.input.includeFood = (e.target as HTMLInputElement).checked;
        renderOutputs();
    });
    (document.getElementById("f-childallowance") as HTMLInputElement | null)?.addEventListener("change", (e) => {
        state.input.includeChildAllowance = (e.target as HTMLInputElement).checked;
        renderOutputs();
    });
    (document.getElementById("f-insurance") as HTMLInputElement | null)?.addEventListener("change", (e) => {
        state.input.includeInsurance = (e.target as HTMLInputElement).checked;
        renderOutputs();
    });
    (document.getElementById("f-tax") as HTMLInputElement | null)?.addEventListener("change", (e) => {
        state.input.includeTax = (e.target as HTMLInputElement).checked;
        renderOutputs();
    });
    (document.getElementById("f-severance") as HTMLInputElement | null)?.addEventListener("change", (e) => {
        state.input.includeSeverance = (e.target as HTMLInputElement).checked;
        renderOutputs();
    });
    (document.getElementById("f-sev") as HTMLInputElement | null)?.addEventListener("input", (e) => {
        state.input.severanceMonthly = Number((e.target as HTMLInputElement).value || 0);
        renderOutputs();
    });
}

function renderLawEditor() {
    const law = $("#law-root");
    if (!law) return;
    const cfg = state.cfg;
    law.innerHTML = `
    <label class="text-sm">معافیت ماهانه
      <input id="t-exm" type="number" class="w-full border rounded-lg p-2" value="${cfg.tax.exemptionMonthly}">
    </label>
    <div class="text-sm md:col-span-2">
      <p class="mb-2">طبقات:</p>
      ${cfg.tax.brackets
            .map(
                (b, i) => `
        <div class="flex items-center gap-2 mb-2">
          <input data-i="${i}" data-k="upTo" type="number" class="flex-1 border rounded-lg p-2" placeholder="سقف تجمعی" value="${b.upTo ?? ""}">
          <input data-i="${i}" data-k="rate" type="number" step="0.01" class="w-28 border rounded-lg p-2" placeholder="نرخ" value="${b.rate}">
        </div>`
            )
            .join("")}
    </div>
    <div class="text-xs text-gray-500 md:col-span-2">* اگر سقف پله آخر نامحدود است، فیلد سقف را خالی بگذار.</div>
  `;

    (document.getElementById("t-exm") as HTMLInputElement | null)?.addEventListener("input", (e) => {
        state.cfg.tax.exemptionMonthly = Number((e.target as HTMLInputElement).value || 0);
        renderOutputs();
    });

    law.querySelectorAll<HTMLInputElement>('input[data-i]').forEach((inp) => {
        inp.addEventListener("input", () => {
            const idx = Number(inp.dataset.i!);
            const key = inp.dataset.k!;
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
      <div class="text-xs text-gray-500 mb-1">خالص پرداختی</div>
      <div class="text-2xl font-bold">${Rial(r.netPay)} ریال</div>
    </div>
    <div class="border rounded-xl p-3">
      <div class="text-xs text-gray-500 mb-1">مالیات</div>
      <div class="text-xl font-semibold">${Rial(r.tax)} ریال</div>
    </div>
    <div class="border rounded-xl p-3">
      <div class="text-xs text-gray-500 mb-1">بیمه کارگر</div>
      <div class="text-xl font-semibold">${Rial(r.insurance.worker)} ریال</div>
    </div>
    <div class="border rounded-xl p-3">
      <div class="text-xs text-gray-500 mb-1">هزینه کل کارفرما</div>
      <div class="text-xl font-semibold">${Rial(r.employerCost)} ریال</div>
    </div>
  `;
}

function bindButtons() {
    const preset = $("#btn-preset");
    const pdf = $("#btn-pdf");

    preset?.addEventListener("click", () => {
        state.input.mode = "daily";
        state.input.baseWage = 3_000_000;
        state.input.days = 30;
        state.input.hoursOvertime = 20;
        state.input.overtimeFactor = 1.4;
        state.input.married = true;
        state.input.childCount = 1;
        renderForm();
        renderOutputs();
    });

    pdf?.addEventListener("click", async () => {
        const { jsPDF } = (window as any).jspdf || {};
        if (!jsPDF) return alert("jsPDF لود نشد.");
        const doc = new jsPDF({ unit: "pt", format: "a4" });
        doc.setFontSize(14);
        doc.text(`گزارش حقوق و دستمزد ۱۴۰۴`, 40, 50);
        const r = computePayroll(state.cfg, state.input);
        const lines = [
            `خالص پرداختی: ${Rial(r.netPay)} ریال`,
            `مالیات: ${Rial(r.tax)} ریال`,
            `بیمه کارگر: ${Rial(r.insurance.worker)} ریال`,
            `هزینه کل کارفرما: ${Rial(r.employerCost)} ریال`,
        ];
        lines.forEach((t, i) => doc.text(t, 40, 90 + i * 24));
        doc.save("salary-1404.pdf");
    });
}

document.addEventListener("DOMContentLoaded", () => {
    renderForm();
    renderLawEditor();
    bindButtons();
    loadConfig();
});
