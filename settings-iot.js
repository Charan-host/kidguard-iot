(() => {
    const iot = window.KidGuardIoT;
    const cfg = window.KidGuardConfig;

    function setHeader(childName, batteryPct) {
        document.querySelectorAll('.user span').forEach((el) => {
            el.textContent = childName || 'Unknown Child';
        });
        document.querySelectorAll('.battery').forEach((el) => {
            el.textContent = `Battery ${batteryPct}%`;
        });
    }

    function setThemeFromSettings(isNightMode) {
        const toggle = document.getElementById('nightModeToggle');
        if (!toggle) return;
        toggle.checked = Boolean(isNightMode);
        toggle.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function readForm() {
        return {
            childName: document.getElementById('childNameInput').value.trim(),
            deviceId: document.getElementById('deviceIdInput').value.trim(),
            apiBaseUrl: document.getElementById('apiBaseUrlInput').value.trim(),
            safeZoneRadius: Number(document.getElementById('safeZoneRadiusInput').value),
            sosAlerts: document.getElementById('sosAlertsInput').checked,
            geofencingAlerts: document.getElementById('geofencingAlertsInput').checked,
            batteryAlerts: document.getElementById('batteryAlertsInput').checked,
            nightMode: document.getElementById('nightModeToggle').checked
        };
    }

    function writeForm(settings) {
        document.getElementById('childNameInput').value = settings.childName || '';
        document.getElementById('deviceIdInput').value = settings.deviceId || '';
        document.getElementById('apiBaseUrlInput').value = cfg.getApiBaseUrl();
        document.getElementById('safeZoneRadiusInput').value = settings.safeZoneRadius || 100;
        document.getElementById('sosAlertsInput').checked = Boolean(settings.sosAlerts);
        document.getElementById('geofencingAlertsInput').checked = Boolean(settings.geofencingAlerts);
        document.getElementById('batteryAlertsInput').checked = Boolean(settings.batteryAlerts);
        setThemeFromSettings(settings.nightMode);
    }

    function setStatus(message, isError) {
        const target = document.getElementById('settingsStatus');
        if (!target) return;
        target.textContent = message;
        target.style.color = isError ? '#dc2626' : '#16a34a';
    }

    async function loadSettings() {
        const deviceId = iot.getDeviceId();
        const [state, settings] = await Promise.all([
            iot.getDeviceState(deviceId),
            iot.getSettings(deviceId)
        ]);

        setHeader(state.childName, state.batteryPct);
        writeForm(settings);
    }

    async function saveCurrentSettings() {
        const currentDeviceId = iot.getDeviceId();
        const payload = readForm();

        if (!payload.deviceId) {
            setStatus('Device ID is required.', true);
            return;
        }

        if (payload.apiBaseUrl) {
            cfg.setApiBaseUrl(payload.apiBaseUrl);
        }

        await iot.saveSettings(currentDeviceId, payload);
        iot.setDeviceId(payload.deviceId);
        setStatus('Settings synced with IoT device.', false);
    }

    function resetDefaults() {
        writeForm({
            childName: 'Emma Wilson',
            deviceId: iot.getDeviceId(),
            safeZoneRadius: 100,
            sosAlerts: true,
            geofencingAlerts: true,
            batteryAlerts: true,
            nightMode: false
        });
        document.getElementById('apiBaseUrlInput').value = cfg.defaults.apiBaseUrl;
        setStatus('Defaults loaded. Click Save Settings to sync.', false);
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('saveSettingsBtn').addEventListener('click', () => {
            saveCurrentSettings().catch((error) => {
                console.error('Save failed:', error);
                setStatus('Failed to sync settings. Check API URL/device status.', true);
            });
        });

        document.getElementById('resetSettingsBtn').addEventListener('click', resetDefaults);

        loadSettings().catch((error) => {
            console.error('Settings load failed:', error);
            setStatus('Could not load settings from API. Demo mode may be active.', true);
        });
    });
})();
