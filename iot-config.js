window.KidGuardConfig = (() => {
    const STORAGE_KEY = "kidguard-api-base-url";
    const DEFAULTS = {
        apiBaseUrl: "https://kidguard-backend.onrender.com/api",
        deviceIdStorageKey: "kidguard-device-id",
        mapFocusStorageKey: "kidguard-map-focus",
        useDemoOnError: true,
        pollIntervalMs: 15000
    };

    function isLocalBrowserHost() {
        const hostname = window.location.hostname;
        return !hostname || hostname === "localhost" || hostname === "127.0.0.1";
    }

    function isLocalApiUrl(url) {
        try {
            const parsed = new URL(url, window.location.href);
            return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
        } catch (error) {
            return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(String(url || "").trim());
        }
    }

    function getApiBaseUrl() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (!saved) {
                return DEFAULTS.apiBaseUrl;
            }

            if (!isLocalBrowserHost() && isLocalApiUrl(saved)) {
                return DEFAULTS.apiBaseUrl;
            }

            return saved;
        } catch (error) {
            return DEFAULTS.apiBaseUrl;
        }
    }

    function setApiBaseUrl(url) {
        try {
            localStorage.setItem(STORAGE_KEY, url);
        } catch (error) {
            // Ignore storage errors in restricted browsers.
        }
    }

    return {
        defaults: DEFAULTS,
        getApiBaseUrl,
        setApiBaseUrl
    };
})();
