/* global modals v4 - singleton, delegation, SPA-safe */
(function () {
    const KEY = "__globalMobileModals_v4";
    if (window[KEY]?.inited) return;

    // Abort old generations if any
    try { window.__globalMobileModals_v1?.ac?.abort?.(); } catch { }
    try { window.__globalMobileModals_v2?.ac?.abort?.(); } catch { }
    try { window.__globalMobileModals_v3?.ac?.abort?.(); } catch { }

    const ac = new AbortController();
    window[KEY] = { ac, inited: true };

    const $ = (id) => document.getElementById(id);
    const root = document.documentElement;

    // ✅ به جای نگه داشتن رفرنس های ثابت، هربار DOM را تازه بگیر
    const getToolsModal = () => $("mobile-launcher-tools");
    const getOthersModal = () => $("mobile-launcher-others");
    const getToolsBtn = () => $("tools-launcher-toggle");
    const getOthersBtn = () => $("others-launcher-toggle");

    function lockScroll() { root.style.overflow = "hidden"; root.style.touchAction = "none"; }
    function unlockScroll() { root.style.overflow = ""; root.style.touchAction = ""; }

    function anyOpen() {
        return !getToolsModal()?.classList.contains("hidden") ||
            !getOthersModal()?.classList.contains("hidden");
    }

    function closeModal(modal, btn) {
        if (!modal) return;
        if (!modal.classList.contains("hidden")) {
            modal.classList.add("hidden");
            btn?.setAttribute("aria-expanded", "false");
        }
        if (!anyOpen()) unlockScroll();
    }

    function openModal(modal, btn) {
        closeAll();                       // فقط یکی باز باشد
        if (!modal) return;
        modal.classList.remove("hidden");
        btn?.setAttribute("aria-expanded", "true");
        lockScroll();
    }

    function closeAll() {
        closeModal(getToolsModal(), getToolsBtn());
        closeModal(getOthersModal(), getOthersBtn());
    }

    // Delegated click (برای کارکردن روی همه صفحات SPA)
    document.addEventListener("click", (e) => {
        const t = e.target;

        const toolsBtn = t.closest?.("#tools-launcher-toggle");
        if (toolsBtn) {
            const isOpen = toolsBtn.getAttribute("aria-expanded") === "true";
            isOpen ? closeModal(getToolsModal(), toolsBtn)
                : openModal(getToolsModal(), toolsBtn);
            return;
        }

        const othersBtn = t.closest?.("#others-launcher-toggle");
        if (othersBtn) {
            const isOpen = othersBtn.getAttribute("aria-expanded") === "true";
            isOpen ? closeModal(getOthersModal(), othersBtn)
                : openModal(getOthersModal(), othersBtn);
            return;
        }

        if (t.closest?.("#tools-close") || t.closest?.("#tools-backdrop")) { closeModal(getToolsModal(), getToolsBtn()); return; }
        if (t.closest?.("#others-close") || t.closest?.("#others-backdrop")) { closeModal(getOthersModal(), getOthersBtn()); return; }

        // ساب منوی «مرکز محتوا» داخل مودال «سایر منوها»
        const contentExpand = t.closest?.("#content-expand");
        if (contentExpand) {
            const sub = $("content-subgrid");
            const expanded = contentExpand.getAttribute("aria-expanded") === "true";
            if (expanded) {
                sub?.classList.add("hidden");
                contentExpand.setAttribute("aria-expanded", "false");
            } else {
                sub?.classList.remove("hidden");
                contentExpand.setAttribute("aria-expanded", "true");
            }
        }
    }, { signal: ac.signal });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeAll();
    }, { signal: ac.signal });

    // در سوییچ های Astro Transitions مودال ها را ببند (رفرنس ها خودکار تازه می شوند)
    window.addEventListener("astro:after-swap", () => setTimeout(closeAll, 100), { signal: ac.signal });
    window.addEventListener("astro:page-load", () => setTimeout(closeAll, 100), { signal: ac.signal });

    // Hooks برای تست دستی در کنسول
    window[KEY].openTools = () => openModal(getToolsModal(), getToolsBtn());
    window[KEY].openOthers = () => openModal(getOthersModal(), getOthersBtn());
    window[KEY].closeAll = closeAll;
})();
