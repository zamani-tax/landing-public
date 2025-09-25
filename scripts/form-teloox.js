/* eslint-disable */
/* @ts-nocheck */
(function () {
    var form = document.getElementById("qaForm");
    var msg = document.getElementById("formMsg");
    var btn = document.getElementById("submitBtn");
    if (!form || !msg || !btn) return;

    function toEN(s) {
        return String(s || "")
            .replace(/[۰-۹]/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹".indexOf(d); })
            .replace(/[٠-٩]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩".indexOf(d); });
    }

    function showMsg(text, ok) {
        msg.textContent = text;
        msg.classList.remove("hidden");
        msg.className = "mb-4 rounded-lg border px-4 py-3 text-sm " +
            (ok ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800");
    }

    form.addEventListener("submit", function (e) {
        e.preventDefault();

        // honeypot
        var hp = form.querySelector('input[name="website"]');
        if (hp && hp.value) return;

        // phone normalize & validate
        var phoneEl = form.querySelector("#phone");
        if (phoneEl) {
            phoneEl.value = toEN(phoneEl.value).replace(/\D/g, "");
            var valid = /^09\d{9}$/.test(phoneEl.value);
            if (!valid) {
                showMsg("شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود.", false);
                phoneEl.focus();
                return;
            }
        }

        var fd = new FormData(form);
        fd.append("form_name", "article_contact");
        fd.append("page_url", window.location.href || "");

        btn.disabled = true;

        fetch("https://teloox.ir/forms.php", { method: "POST", body: fd })
            .then(function (res) {
                var ok = res.ok;
                var ct = res.headers.get("content-type") || "";
                if (ct.indexOf("application/json") !== -1) {
                    return res.json().then(function (j) {
                        ok = ok && ((j.success !== undefined) ? j.success : true);
                        showMsg(ok ? (j.message || "درخواست ثبت شد") : (j.message || "ارسال ناموفق بود"), ok);
                        if (ok) form.reset();
                    });
                } else {
                    showMsg(ok ? "درخواست ثبت شد" : "ارسال ناموفق بود", ok);
                    if (ok) form.reset();
                    return;
                }
            })
            .catch(function () { showMsg("خطا در ارتباط.", false); })
            .finally(function () { btn.disabled = false; });
    });
})();
