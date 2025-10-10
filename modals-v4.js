/* global modals v4 - singleton, delegation, SPA-safe */
(function () {
    const KEY = "__globalMobileModals_v4";

    if (window[KEY]?.inited) return; // جلوگیری از دوباره‌بایند شدن

    // نسخه‌های قدیمی را (اگر وجود داشت) ابورت کن
    try { window.__globalMobileModals_v1?.ac?.abort?.(); } catch { }
    try { window.__globalMobileModals_v2?.ac?.abort?.(); } catch { }
    try { window.__globalMobileModals_v3?.ac?.abort?.(); } catch { }

    const ac = new AbortController();
    window[KEY] = { ac, inited: true };

    const $ = (id) => document.getElementById(id);
    const root = document.documentElement;

    const toolsModal = $("mobile-launcher-tools");
    const othersModal = $("mobile-launcher-others");
    const toolsClose = $("tools-close");
    const othersClose = $("others-close");
    const toolsBackdrop = $("tools-backdrop");
    const othersBackdrop = $("others-backdrop");

    function lockScroll() { root.style.overflow = "hidden"; root.style.touchAction = "none"; }
    function unlockScroll() { root.style.overflow = ""; root.style.touchAction = ""; }
    function anyOpen() {
        return !toolsModal?.classList.contains("hidden") ||
            !othersModal?.classList.contains("hidden");
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
        closeAll();
        if (!modal) return;
        modal.classList.remove("hidden");
        btn?.setAttribute("aria-expanded", "true");
        lockScroll();
    }
    function closeAll() {
        const tb = $("tools-launcher-toggle");
        const ob = $("others-launcher-toggle");
        closeModal(toolsModal, tb);
        closeModal(othersModal, ob);
    }

    // delegation: یک لیسنر روی document
    document.addEventListener("click", (e) => {
        const t = e.target;

        const toolsBtn = t.closest?.("#tools-launcher-toggle");
        if (toolsBtn) {
            const isOpen = toolsBtn.getAttribute("aria-expanded") === "true";
            isOpen ? closeModal(toolsModal, toolsBtn) : openModal(toolsModal, toolsBtn);
            return;
        }

        const othersBtn = t.closest?.("#others-launcher-toggle");
        if (othersBtn) {
            const isOpen = othersBtn.getAttribute("aria-expanded") === "true";
            isOpen ? closeModal(othersModal, othersBtn) : openModal(othersModal, othersBtn);
            return;
        }

        if (t.closest?.("#tools-close") || t.closest?.("#tools-backdrop")) {
            closeModal(toolsModal, $("tools-launcher-toggle")); return;
        }
        if (t.closest?.("#others-close") || t.closest?.("#others-backdrop")) {
            closeModal(othersModal, $("others-launcher-toggle")); return;
        }

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

    // در ناوبری‌های SPA فقط ببند
    window.addEventListener("astro:after-swap", closeAll, { signal: ac.signal });
    window.addEventListener("astro:page-load", closeAll, { signal: ac.signal });

    // هوک‌های تست دستی
    window[KEY].openTools = () => openModal(toolsModal, $("tools-launcher-toggle"));
    window[KEY].openOthers = () => openModal(othersModal, $("others-launcher-toggle"));
    window[KEY].closeAll = closeAll;

})();
