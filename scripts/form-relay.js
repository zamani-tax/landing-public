/* eslint-disable */
/* @ts-nocheck */
/**
 * form-relay.js — ارسال هر فرم سایت به گروه تلگرام
 *
 * جایگزین form-handoff.js شد. آن نسخه فقط یک پیام آماده می کرد و کاربر
 * باید خودش در تلگرام یا واتساپ می فرستاد. حالا فرم مستقیم به ورکر
 * zamani.tax/api/form می رود و از آنجا در گروه می نشیند؛ کاربر فقط
 * یک دکمه می زند و تمام.
 *
 * ─── استفاده ساده (بدون نوشتن جاوااسکریپت) ───────────────────
 *   <form data-relay data-subject="درخواست از صفحه حسابرسی">
 *     <input name="name" required />
 *     <input name="mobile" required />
 *     <textarea name="message"></textarea>
 *     <input type="text" name="website" tabindex="-1" hidden />   ← تله ربات
 *     <button type="submit">ارسال</button>
 *   </form>
 * برچسب هر فیلد از data-label، یا legend فیلدست، یا name گرفته می شود.
 *
 * ─── استفاده از صفحه ای که منطق خودش را دارد ─────────────────
 *   window.ZamaniRelay.send(formEl).then(ok => ...)
 *
 * روی localhost چیزی ارسال نمی شود تا تست محلی گروه را پر نکند.
 */
(function () {
    var ENDPOINT = "/api/form";
    var NL = String.fromCharCode(10);
    var IS_LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

    var DIGITS = {
        "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
        "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
        "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
        "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
    };
    function toEN(s) {
        return String(s || "").replace(/[۰-۹٠-٩]/g, function (c) { return DIGITS[c] || c; });
    }

    var REASONS = {
        "captcha-missing": "بررسی امنیتی هنوز کامل نشده. چند لحظه صبر کنید و دوباره بزنید.",
        "captcha-failed": "بررسی امنیتی رد شد. صفحه را تازه کنید و دوباره تلاش کنید.",
        "captcha-unreachable": "بررسی امنیتی در دسترس نیست. اگر فیلترشکن روشن است خاموشش کنید.",
        "too-large": "متن فرم بیش از حد بلند است. کمی کوتاهش کنید.",
        origin: "این فرم از این آدرس اجازه ارسال ندارد.",
    };

    function labelOf(el) {
        if (el.dataset && el.dataset.label) return el.dataset.label;
        var fs = el.closest("fieldset");
        if (fs && fs.dataset.label) return fs.dataset.label;
        var lg = fs && fs.querySelector("legend");
        if (lg) return lg.textContent.trim();
        var lb = el.closest("label");
        if (lb) {
            var txt = lb.textContent.replace(el.value || "", "").trim();
            if (txt) return txt.split(NL)[0].slice(0, 40);
        }
        return el.name;
    }

    function isHidden(el) {
        return !!(el.closest(".hidden") || el.closest("[hidden]"));
    }

    /** ساخت متن پیام از روی فیلدهای فرم */
    function compose(form) {
        var subject = form.getAttribute("data-subject") || "درخواست از سایت";
        var lines = [subject, ""];
        var seen = {};
        Array.prototype.forEach.call(
            form.querySelectorAll("input, textarea, select"),
            function (el) {
                if (!el.name || seen[el.name] || isHidden(el)) return;
                if (el.name === "website") return; // تله ربات
                if (el.type === "hidden") return; // فیلدهای داخلی مثل form_name و page_url
                if (/^cf-turnstile/.test(el.name)) return;
                var val = "";
                if (el.type === "checkbox" || el.type === "radio") {
                    seen[el.name] = true;
                    var picked = [];
                    Array.prototype.forEach.call(
                        form.querySelectorAll('[name="' + el.name + '"]'),
                        function (b) { if (b.checked && !isHidden(b)) picked.push(b.value); },
                    );
                    val = picked.join("، ");
                } else {
                    val = String(el.value || "").trim();
                    if (el.type === "tel") val = toEN(val);
                }
                if (val) lines.push("• " + labelOf(el) + ": " + val);
            },
        );
        lines.push("", "ارسال از: " + location.href);
        return lines.join(NL);
    }

    function refCode() {
        var n = Math.floor(1000 + Math.random() * 9000);
        var ym = "";
        try {
            var y = "", m = "";
            new Intl.DateTimeFormat("en-u-ca-persian", { year: "numeric", month: "2-digit" })
                .formatToParts(new Date())
                .forEach(function (p) {
                    if (p.type === "year") y = p.value.replace(/\D/g, "");
                    if (p.type === "month") m = p.value.replace(/\D/g, "");
                });
            if (y && m) ym = y.slice(-2) + m.padStart(2, "0");
        } catch (e) {}
        return "ZT-" + (ym ? ym + "-" : "") + n;
    }

    function turnstileToken(form) {
        var el =
            form.querySelector('[name="cf-turnstile-response"]') ||
            document.querySelector('[name="cf-turnstile-response"]');
        return el ? el.value : "";
    }

    function resetTurnstile() {
        try { if (window.turnstile) window.turnstile.reset(); } catch (e) {}
    }

    /**
     * ارسال فرم به ورکر.
     * @returns Promise<{ok:boolean, ref:string, error?:string}>
     */
    function send(form) {
        var text = compose(form);
        var ref = refCode();

        if (IS_LOCAL) {
            console.info("[form-relay] حالت آزمایشی — ارسال نشد:" + NL + text);
            return Promise.resolve({ ok: true, ref: ref, local: true });
        }

        return fetch(ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                form: form.getAttribute("data-form") || form.id || "form",
                ref: ref,
                page: location.href,
                text: text,
                turnstile: turnstileToken(form),
            }),
        })
            .then(function (res) {
                if (res.ok) return { ok: true, ref: ref };
                return res
                    .json()
                    .catch(function () { return {}; })
                    .then(function (b) { return { ok: false, ref: ref, error: b.error }; });
            })
            .catch(function () { return { ok: false, ref: ref, error: "network" }; })
            .then(function (r) { resetTurnstile(); return r; });
    }

    // ---------- نمایش نتیجه ----------
    function panelFor(form) {
        var id = (form.id || "form") + "-relay-result";
        var el = document.getElementById(id);
        if (el) return el;
        el = document.createElement("div");
        el.id = id;
        el.setAttribute("role", "status");
        el.className = "mt-4";
        form.parentNode.insertBefore(el, form.nextSibling);
        return el;
    }

    function renderResult(form, result) {
        var p = panelFor(form);
        if (result.ok) {
            p.className = "mt-4 rounded-2xl border-2 border-green-300 bg-green-50 p-5 text-center";
            p.innerHTML =
                '<div class="text-3xl">✓</div>' +
                '<p class="mt-1 font-extrabold text-green-900">پیام شما ارسال شد</p>' +
                '<p class="mt-1 text-sm text-green-800">در اولین فرصت تماس می گیریم.</p>' +
                '<p class="mt-3 text-sm text-gray-700">کد پیگیری: <span class="font-mono font-bold text-[#B50000]">' +
                result.ref +
                "</span></p>" +
                (result.local
                    ? '<p class="mt-3 text-xs text-[#8A6520]">حالت آزمایشی روی localhost — چیزی ارسال نشد.</p>'
                    : "");
            form.reset();
        } else {
            p.className = "mt-4 rounded-2xl border-2 border-red-300 bg-red-50 p-5";
            p.innerHTML =
                '<p class="font-extrabold text-red-900">ارسال انجام نشد</p>' +
                '<p class="mt-1 text-sm text-red-800">یک بار دیگر تلاش کنید. اگر باز هم نشد، در تلگرام ' +
                '<a href="https://t.me/zamani_acc" class="underline font-medium">@zamani_acc</a> پیام بدهید.</p>' +
                (REASONS[result.error]
                    ? '<p class="mt-2 text-sm font-medium text-red-900">' + REASONS[result.error] + "</p>"
                    : "");
        }
        p.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    // ---------- اتصال خودکار ----------
    function bind(form) {
        form.addEventListener("submit", function (e) {
            e.preventDefault();

            var hp = form.querySelector('input[name="website"]');
            if (hp && hp.value) return; // ربات

            var mobile = form.querySelector('[name="mobile"]');
            if (mobile) {
                var v = toEN(mobile.value).replace(/\D/g, "");
                if (v !== mobile.value) mobile.value = v;
                if (mobile.hasAttribute("required") && !/^09\d{9}$/.test(v)) {
                    mobile.setCustomValidity("شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود.");
                    mobile.reportValidity();
                    setTimeout(function () { mobile.setCustomValidity(""); }, 50);
                    return;
                }
            }
            if (!form.checkValidity()) { form.reportValidity(); return; }

            var btn = form.querySelector('button[type="submit"]');
            var original = btn ? btn.textContent : "";
            if (btn) { btn.disabled = true; btn.textContent = "در حال ارسال…"; }

            send(form).then(function (r) {
                if (btn) { btn.disabled = false; btn.textContent = original; }
                renderResult(form, r);
            });
        });
    }

    function init() {
        Array.prototype.forEach.call(document.querySelectorAll("form[data-relay]"), bind);
    }

    window.ZamaniRelay = { send: send, compose: compose, renderResult: renderResult, refCode: refCode };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
