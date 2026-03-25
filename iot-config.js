window.KidGuardConfig = (() => {
    const STORAGE_KEY = "kidguard-api-base-url";
    const DEFAULTS = {
        apiBaseUrl: "http://localhost:3000/api",
        deviceIdStorageKey: "kidguard-device-id",
        mapFocusStorageKey: "kidguard-map-focus",
        useDemoOnError: true,
        pollIntervalMs: 15000
    };

    function getApiBaseUrl() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved || DEFAULTS.apiBaseUrl;
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
