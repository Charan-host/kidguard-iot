window.KidGuardIoT = (() => {
    const cfg = window.KidGuardConfig;
    const defaults = cfg.defaults;

    function getDeviceId() {
        try {
            return localStorage.getItem(defaults.deviceIdStorageKey) || "KB-2024-0123";
        } catch (error) {
            return "KB-2024-0123";
        }
    }

    function setDeviceId(deviceId) {
        try {
            localStorage.setItem(defaults.deviceIdStorageKey, deviceId);
        } catch (error) {
            // Ignore storage errors.
        }
    }

    function getMapFocus() {
        try {
            const raw = localStorage.getItem(defaults.mapFocusStorageKey);
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            return null;
        }
    }

    function setMapFocus(focus) {
        try {
            localStorage.setItem(defaults.mapFocusStorageKey, JSON.stringify(focus));
        } catch (error) {
            // Ignore storage errors.
        }
    }

    function clearMapFocus() {
        try {
            localStorage.removeItem(defaults.mapFocusStorageKey);
        } catch (error) {
            // Ignore storage errors.
        }
    }

    async function request(path, options) {
        const base = cfg.getApiBaseUrl().replace(/\/$/, "");
        const response = await fetch(`${base}${path}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(options && options.headers ? options.headers : {})
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return response.json();
    }

    function nowTimeLabel() {
        return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    function demoState() {
        return {
            childName: "Emma Wilson",
            batteryPct: 85,
            batteryEta: "~3 days remaining",
            statusText: "Safe",
            statusType: "safe",
            distanceKm: 2.3,
            location: {
                lat: 37.7749,
                lng: -122.4194,
                address: "123 Main St",
                city: "Springfield, MA"
            },
            updatedAt: nowTimeLabel()
        };
    }

    function demoAlerts() {
        return [
            { id: "a1", title: "SOS Button Activated", message: "456 Park Avenue, Springfield", time: "10:45 AM", status: "active", type: "sos", lat: 37.779, lng: -122.41 },
            { id: "a2", title: "Left Safe Zone", message: "Moving towards downtown", time: "9:30 AM", status: "resolved", type: "geofence", lat: 37.77, lng: -122.43 },
            { id: "a3", title: "Device connected", message: "Band connected to gateway", time: "9:15 AM", status: "resolved", type: "device", lat: 37.7749, lng: -122.4194 }
        ];
    }

    function demoHistory() {
        return [
            { id: "h1", title: "Home", address: "123 Main Street, Springfield", timeLabel: "6:30 PM • Today • 3 hours", lat: 37.7749, lng: -122.4194 },
            { id: "h2", title: "School", address: "456 Education Ave, Springfield", timeLabel: "2:45 PM • Today • 6 hours", lat: 37.779, lng: -122.41 },
            { id: "h3", title: "Park", address: "789 Green Park, Springfield", timeLabel: "4:15 PM • Yesterday • 1.5 hours", lat: 37.768, lng: -122.427 }
        ];
    }

    function demoSettings() {
        let isDark = false;
        try {
            isDark = (localStorage.getItem("kidguard-theme") || "light") === "dark";
        } catch (error) {
            isDark = false;
        }

        return {
            childName: "Emma Wilson",
            deviceId: getDeviceId(),
            safeZoneLat: 37.7749,
            safeZoneLng: -122.4194,
            safeZoneRadius: 100,
            sosAlerts: true,
            geofencingAlerts: true,
            batteryAlerts: true,
            nightMode: isDark
        };
    }

    async function getDeviceState(deviceId) {
        try {
            return await request(`/devices/${encodeURIComponent(deviceId)}/state`);
        } catch (error) {
            if (defaults.useDemoOnError) return demoState();
            throw error;
        }
    }

    async function getAlerts(deviceId) {
        try {
            return await request(`/devices/${encodeURIComponent(deviceId)}/alerts`);
        } catch (error) {
            if (defaults.useDemoOnError) return demoAlerts();
            throw error;
        }
    }

    async function resolveAlert(deviceId, alertId) {
        try {
            return await request(`/devices/${encodeURIComponent(deviceId)}/alerts/${encodeURIComponent(alertId)}/resolve`, { method: "POST" });
        } catch (error) {
            return { ok: defaults.useDemoOnError };
        }
    }

    async function getHistory(deviceId, range) {
        const safeRange = encodeURIComponent(range || "Today");
        try {
            return await request(`/devices/${encodeURIComponent(deviceId)}/history?range=${safeRange}`);
        } catch (error) {
            if (defaults.useDemoOnError) return demoHistory();
            throw error;
        }
    }

    async function getSettings(deviceId) {
        try {
            return await request(`/devices/${encodeURIComponent(deviceId)}/settings`);
        } catch (error) {
            if (defaults.useDemoOnError) return demoSettings();
            throw error;
        }
    }

    async function saveSettings(deviceId, payload) {
        try {
            return await request(`/devices/${encodeURIComponent(deviceId)}/settings`, {
                method: "PUT",
                body: JSON.stringify(payload)
            });
        } catch (error) {
            if (defaults.useDemoOnError) return { ok: true, simulated: true };
            throw error;
        }
    }

    return {
        getDeviceId,
        setDeviceId,
        getMapFocus,
        setMapFocus,
        clearMapFocus,
        getDeviceState,
        getAlerts,
        resolveAlert,
        getHistory,
        getSettings,
        saveSettings
    };
})();
