/* eslint-disable */
/* @ts-nocheck */
/**
 * form-handoff.js — تحویل پیام فرم به تلگرام یا واتساپ، بدون نیاز به سرور
 *
 * چرا: سرور فرم ها (agentbot.zamani.tax) از دسترس خارج شده و ارسال ها گم می شدند.
 * این اسکریپت به جای POST، محتوای فرم را به یک پیام آماده تبدیل می کند و
 * کاربر آن را با یک کلیک در تلگرام (اولویت اول) یا واتساپ می فرستد.
 *
 * نکته تلگرام: لینک https://t.me/<user> نمی تواند متن آماده داشته باشد،
 * ولی پروتکل tg://resolve?domain=<user>&text=... این کار را می کند
 * (نیازمند نصب بودن اپ تلگرام). برای حالتی که اپ باز نشود، متن پیام
 * روی کلیپ بورد کپی می شود و لینک وب تلگرام هم نمایش داده می شود.
 *
 * استفاده: به فرم صفت data-handoff بدهید و اختیارا data-subject.
 *   <form id="..." data-handoff data-subject="درخواست مشاوره مالیاتی">
 * سپس در اسکریپت صفحه، به جای fetch به سرور، این را صدا بزنید:
 *   window.ZamaniHandoff.show(formElement)
 */
(function () {
    var OWNER_TG = "zamani_acc";
    var OWNER_WA = "989124689983";

    var DIGIT_MAP = {
        "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
        "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
        "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
        "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
    };

    function toEnglishDigits(s) {
        return String(s || "").replace(/[۰-۹٠-٩]/g, function (ch) {
            return DIGIT_MAP[ch] || ch;
        });
    }

    function fieldValue(form, name) {
        var el = form.querySelector('[name="' + name + '"]');
        if (!el) return "";
        return String(el.value || "").trim();
    }

    /** ساخت متن پیام از روی فیلدهای فرم */
    function compose(form) {
        var subject =
            form.getAttribute("data-subject") || "درخواست از سایت zamani.tax";
        var lines = [subject, ""];

        var name = fieldValue(form, "name");
        var company = fieldValue(form, "company");
        var mobile = toEnglishDigits(fieldValue(form, "mobile"));
        var contact = fieldValue(form, "email");
        var message = fieldValue(form, "message");

        if (name) lines.push("نام: " + name);
        if (company) lines.push("کسب و کار: " + company);
        if (mobile) lines.push("شماره تماس: " + mobile);
        if (contact) lines.push("راه ارتباطی دیگر: " + contact);

        if (message) {
            lines.push("");
            lines.push(message);
        }

        lines.push("");
        lines.push("ارسال از: " + (location.href || "zamani.tax"));

        return lines.join("\n");
    }

    function telegramAppLink(text) {
        return (
            "tg://resolve?domain=" +
            OWNER_TG +
            "&text=" +
            encodeURIComponent(text)
        );
    }

    function telegramWebLink() {
        return "https://t.me/" + OWNER_TG;
    }

    function whatsappLink(text) {
        return "https://wa.me/" + OWNER_WA + "?text=" + encodeURIComponent(text);
    }

    function makeLink(href, label, hint, primary) {
        var a = document.createElement("a");
        a.href = href;
        a.rel = "noopener";
        if (href.indexOf("tg://") !== 0) a.target = "_blank";
        a.className =
            "flex-1 text-center px-5 py-3 rounded-2xl font-bold transition hover:opacity-90 " +
            (primary
                ? "bg-[#172778] text-white"
                : "border-2 border-[#172778] text-[#172778]");
        a.appendChild(document.createTextNode(label));
        if (hint) {
            var s = document.createElement("span");
            s.className = "block text-xs font-normal mt-1 opacity-80";
            s.appendChild(document.createTextNode(hint));
            a.appendChild(s);
        }
        return a;
    }

    /** پیدا کردن یا ساختن ظرف دکمه ها، درست بعد از فرم */
    function panelFor(form) {
        var id = (form.id || "form") + "-handoff";
        var el = document.getElementById(id);
        if (el) return el;
        el = document.createElement("div");
        el.id = id;
        el.className =
            "mt-4 rounded-2xl border-2 border-[#C49344] bg-white p-5 text-[#2F3859]";
        el.setAttribute("role", "status");
        form.parentNode.insertBefore(el, form.nextSibling);
        return el;
    }

    /**
     * نمایش پنل تحویل پیام. فرم را ارسال نمی کند؛ فقط پیام را آماده می کند.
     * @returns {string} متن ساخته شده
     */
    function show(form) {
        var text = compose(form);
        var panel = panelFor(form);
        panel.innerHTML = "";

        var title = document.createElement("p");
        title.className = "font-bold";
        title.textContent = "پیام شما آماده شد";
        panel.appendChild(title);

        var desc = document.createElement("p");
        desc.className = "text-sm text-gray-600 mt-1";
        desc.textContent =
            "یکی از دو راه زیر را انتخاب کنید تا پیام برای ما ارسال شود.";
        panel.appendChild(desc);

        var row = document.createElement("div");
        row.className = "mt-4 flex flex-col sm:flex-row gap-3";
        row.appendChild(
            makeLink(
                telegramAppLink(text),
                "ارسال در تلگرام",
                "اپ تلگرام باز می شود",
                true,
            ),
        );
        row.appendChild(
            makeLink(whatsappLink(text), "ارسال در واتساپ", "", false),
        );
        panel.appendChild(row);

        // اگر تلگرام باز نشد: متن کپی شده است و لینک وب هم هست
        var fallback = document.createElement("p");
        fallback.className = "text-xs text-gray-500 mt-3 leading-relaxed";
        panel.appendChild(fallback);

        // متن راهنما بر اساس نتیجه واقعی کپی نوشته می شود، نه فرض.
        function renderFallback(copied) {
            fallback.textContent = copied
                ? "متن پیام در کلیپ بورد کپی شد. اگر تلگرام باز نشد، "
                : "اگر تلگرام باز نشد، ";
            var web = document.createElement("a");
            web.href = telegramWebLink();
            web.target = "_blank";
            web.rel = "noopener";
            web.className = "underline text-[#172778]";
            web.textContent = "تلگرام را از اینجا باز کنید";
            fallback.appendChild(web);
            fallback.appendChild(
                document.createTextNode(
                    copied ? " و پیام را بچسبانید." : " و پیام را بنویسید.",
                ),
            );
        }

        // کپی می تواند رد شود (بدون فوکوس، بدون https، رد اجازه توسط مرورگر)
        var canCopy =
            navigator.clipboard && typeof navigator.clipboard.writeText === "function";
        if (canCopy) {
            navigator.clipboard.writeText(text).then(
                function () {
                    renderFallback(true);
                },
                function () {
                    renderFallback(false);
                },
            );
        } else {
            renderFallback(false);
        }

        panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
        return text;
    }

    window.ZamaniHandoff = {
        compose: compose,
        show: show,
        telegramAppLink: telegramAppLink,
        telegramWebLink: telegramWebLink,
        whatsappLink: whatsappLink,
    };

    // اتصال خودکار برای فرم هایی که منطق اختصاصی ندارند
    function autoBind() {
        var forms = document.querySelectorAll("form[data-handoff-auto]");
        Array.prototype.forEach.call(forms, function (form) {
            form.addEventListener("submit", function (e) {
                e.preventDefault();
                var hp = form.querySelector('input[name="website"]');
                if (hp && hp.value) return;
                if (!form.checkValidity()) {
                    form.reportValidity();
                    return;
                }
                show(form);
            });
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", autoBind, { once: true });
    } else {
        autoBind();
    }
})();
