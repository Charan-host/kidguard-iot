(() => {
    const STORAGE_KEY = "kidguard-theme";
    const DARK_VALUE = "dark";

    function applyTheme(isDark) {
        document.documentElement.classList.toggle("dark-mode", isDark);
        if (document.body) {
            document.body.classList.toggle("dark-mode", isDark);
        }

        const toggle = document.getElementById("nightModeToggle");
        if (toggle) {
            toggle.checked = isDark;
        }
    }

    function isDarkThemeSaved() {
        try {
            return localStorage.getItem(STORAGE_KEY) === DARK_VALUE;
        } catch (error) {
            return false;
        }
    }

    function saveTheme(isDark) {
        try {
            localStorage.setItem(STORAGE_KEY, isDark ? DARK_VALUE : "light");
        } catch (error) {
            // Ignore storage errors and keep runtime theme only.
        }
    }

    function initTheme() {
        const isDark = isDarkThemeSaved();
        applyTheme(isDark);

        const toggle = document.getElementById("nightModeToggle");
        if (toggle) {
            toggle.addEventListener("change", () => {
                const next = toggle.checked;
                saveTheme(next);
                applyTheme(next);
            });
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initTheme);
    } else {
        initTheme();
    }
})();
