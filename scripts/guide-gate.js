/**
 * guide-gate.js — فرم دانلود راهنما (src/components/GuideGate.astro)
 *
 * نام و موبایل را بررسی می کند، به ورکر form-relay (POST /api/guide/<key>) می فرستد و
 * PDFی را که در همان پاسخ می آید دانلود می کند. نشانی مستقیم فایل وجود ندارد.
 * هیچ داده ای در مرورگر ذخیره نمی شود.
 */
(function () {
    "use strict";

    var DIGITS = "۰۱۲۳۴۵۶۷۸۹";
    var ARABIC = "٠١٢٣٤٥٦٧٨٩";
    function toEN(s) {
        return String(s || "").replace(/[۰-۹٠-٩]/g, function (c) {
            var i = DIGITS.indexOf(c);
            return String(i >= 0 ? i : ARABIC.indexOf(c));
        });
    }
    // همان قاعده ورکر (workers/form-relay/worker.js normalizeMobile)
    function normalizeMobile(v) {
        var d = toEN(v).replace(/[\s\-().]/g, "");
        if (d.indexOf("+98") === 0) d = "0" + d.slice(3);
        else if (d.indexOf("0098") === 0) d = "0" + d.slice(4);
        else if (/^98\d{10}$/.test(d)) d = "0" + d.slice(2);
        else if (/^9\d{9}$/.test(d)) d = "0" + d;
        return /^09\d{9}$/.test(d) ? d : null;
    }
    function cleanName(v) {
        var n = String(v || "").replace(/\s+/g, " ").trim();
        if (n.length < 2 || n.length > 60) return null;
        if (/[<>{}\[\]]|https?:|www\.|@|\d{4,}/i.test(toEN(n))) return null;
        return n;
    }

    var REASONS = {
        "bad-name": "نام را درست وارد کنید (دست کم دو حرف، بدون پیوند یا عدد).",
        "bad-mobile": "شماره موبایل را به شکل ۰۹xxxxxxxxx وارد کنید.",
        "rate-limited": "چند درخواست پشت هم فرستاده شد. یک دقیقه بعد دوباره تلاش کنید.",
        "captcha-missing": "بررسی امنیتی هنوز کامل نشده. چند لحظه صبر کنید و دوباره بزنید.",
        "captcha-failed": "بررسی امنیتی رد شد. صفحه را تازه کنید و دوباره تلاش کنید.",
        "captcha-unreachable": "بررسی امنیتی در دسترس نیست. اگر فیلترشکن روشن است خاموشش کنید.",
        "captcha-not-configured": "دانلود موقتا ممکن نیست. لطفا در تلگرام پیام بدهید.",
        "lead-failed": "ثبت درخواست انجام نشد و فایل هم ارسال نشد. چند دقیقه بعد دوباره تلاش کنید.",
        origin: "این فرم از این آدرس اجازه ارسال ندارد.",
    };
    var GENERIC = "دانلود انجام نشد. چند دقیقه بعد دوباره تلاش کنید یا در تلگرام پیام بدهید.";

    function show(el, text, ok) {
        el.textContent = text;
        el.hidden = false;
        el.style.display = "block";
        el.style.color = ok ? "#047857" : "#B50000"; // رنگ درون خطی: Tailwind پوشه public را نمی خواند
    }
    function turnstileToken(form) {
        var el = form.querySelector('[name="cf-turnstile-response"]');
        return el ? el.value : "";
    }
    // نشانی فارسی خوانا در پیام تلگرام، نه درصدی
    function pagePath() {
        try { return decodeURIComponent(location.pathname); } catch (e) { return location.pathname; }
    }
    function resetTurnstile() {
        try { if (window.turnstile) window.turnstile.reset(); } catch (e) {}
    }

    function bind(form) {
        var key = form.getAttribute("data-guide-gate");
        var status = form.querySelector("[data-status]");
        var btn = form.querySelector('button[type="submit"]');
        var label = btn.querySelector("[data-label]");
        var labelText = label.textContent;
        var busy = false;

        form.addEventListener("submit", function (ev) {
            ev.preventDefault();
            if (busy) return;
            var name = cleanName(form.elements.name.value);
            var mobile = normalizeMobile(form.elements.mobile.value);
            if (!name) { show(status, REASONS["bad-name"], false); form.elements.name.focus(); return; }
            if (!mobile) { show(status, REASONS["bad-mobile"], false); form.elements.mobile.focus(); return; }

            busy = true;
            btn.disabled = true;
            label.textContent = "در حال آماده سازی…";
            show(status, "در حال ثبت درخواست…", true);

            var ctrl = typeof AbortController === "function" ? new AbortController() : null;
            var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 45000) : null;

            fetch("/api/guide/" + encodeURIComponent(key), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name, mobile: mobile, page: pagePath(), turnstile: turnstileToken(form) }),
                signal: ctrl ? ctrl.signal : undefined,
            })
                .then(function (r) {
                    var type = r.headers.get("Content-Type") || "";
                    if (r.ok && type.indexOf("application/pdf") === 0) {
                        var cd = r.headers.get("Content-Disposition") || "";
                        var m = cd.match(/filename="([^"]+)"/);
                        return r.blob().then(function (b) { return { file: b, filename: m ? m[1] : "guide.pdf" }; });
                    }
                    return r.json().then(
                        function (j) { return { error: (j && j.error) || "unknown" }; },
                        function () { return { error: "unknown" }; },
                    );
                })
                .then(function (res) {
                    if (res.error) { show(status, REASONS[res.error] || GENERIC, false); return; }
                    var url = URL.createObjectURL(res.file);
                    var a = document.createElement("a");
                    a.href = url;
                    a.download = res.filename;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
                    show(status, "فایل دانلود شد. اگر دانلود شروع نشد، یک بار دیگر دکمه را بزنید.", true);
                    form.reset();
                })
                .catch(function () { show(status, GENERIC, false); })
                .then(function () {
                    if (timer) clearTimeout(timer);
                    resetTurnstile();
                    busy = false;
                    btn.disabled = false;
                    label.textContent = labelText;
                });
        });
    }

    var forms = document.querySelectorAll("form[data-guide-gate]");
    for (var i = 0; i < forms.length; i++) bind(forms[i]);
})();
