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
                lat: 10.938,
                lng: 76.7449,
                address: "Karunya Institute of Technology and Sciences, Karunya Nagar",
                city: "Coimbatore, Tamil Nadu"
            },
            updatedAt: nowTimeLabel()
        };
    }

    function demoAlerts() {
        return [
            { id: "a1", title: "SOS Button Activated", message: "Near Karunya Main Gate, Coimbatore", time: "10:45 AM", status: "active", type: "sos", lat: 10.9386, lng: 76.7456 },
            { id: "a2", title: "Left Safe Zone", message: "Moved outside Karunya Nagar safe zone", time: "9:30 AM", status: "resolved", type: "geofence", lat: 10.9368, lng: 76.7481 },
            { id: "a3", title: "Device connected", message: "Band connected from Karunya campus", time: "9:15 AM", status: "resolved", type: "device", lat: 10.938, lng: 76.7449 }
        ];
    }

    function demoHistory() {
        return [
            { id: "h1", title: "Karunya Campus", address: "Karunya Institute of Technology and Sciences, Karunya Nagar", timeLabel: "6:30 PM • Today • 3 hours", lat: 10.938, lng: 76.7449 },
            { id: "h2", title: "Academic Block", address: "Karunya Nagar, Coimbatore - 641114", timeLabel: "2:45 PM • Today • 6 hours", lat: 10.9393, lng: 76.7466 },
            { id: "h3", title: "Main Entrance", address: "Karunya Institute of Technology and Sciences, Coimbatore", timeLabel: "4:15 PM • Yesterday • 1.5 hours", lat: 10.9368, lng: 76.7481 }
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
            safeZoneLat: 10.938,
            safeZoneLng: 76.7449,
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
