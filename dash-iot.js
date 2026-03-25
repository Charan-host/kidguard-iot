(() => {
    const iot = window.KidGuardIoT;
    const config = window.KidGuardConfig;

    function setHeader(childName, batteryPct) {
        document.querySelectorAll('.user span').forEach((el) => {
            el.textContent = childName || 'Unknown Child';
        });

        document.querySelectorAll('.battery').forEach((el) => {
            el.textContent = `Battery ${batteryPct}%`;
        });
    }

    function setStatus(statusEl, statusType, text) {
        statusEl.classList.remove('green', 'status-warning', 'status-danger');
        if (statusType === 'danger') {
            statusEl.classList.add('status-danger');
        } else if (statusType === 'warning') {
            statusEl.classList.add('status-warning');
        } else {
            statusEl.classList.add('green');
        }
        statusEl.textContent = text || 'Unknown';
    }

    function mapSrc(lat, lng) {
        return `https://www.google.com/maps?q=${lat},${lng}&z=14&output=embed`;
    }

    function renderActivity(alerts) {
        const list = document.getElementById('recentActivityList');
        if (!list) return;

        if (!alerts || alerts.length === 0) {
            list.innerHTML = '<div class="activity-item"><span>No recent events</span><small>-</small></div>';
            return;
        }

        list.innerHTML = alerts.slice(0, 4).map((alert) => {
            return `<div class="activity-item"><span>${alert.title}</span><small>${alert.time || ''}</small></div>`;
        }).join('');
    }

    function applyMapFocus(defaultState) {
        const focus = iot.getMapFocus();
        const frame = document.getElementById('liveMapFrame');
        const label = document.getElementById('liveMapLabel');

        if (focus && frame) {
            frame.src = mapSrc(focus.lat, focus.lng);
            if (label) {
                label.textContent = `Live: ${focus.label || defaultState.childName || 'Child'}`;
            }
            iot.clearMapFocus();
            return true;
        }

        return false;
    }

    async function loadDashboard() {
        const deviceId = iot.getDeviceId();
        const [state, alerts] = await Promise.all([
            iot.getDeviceState(deviceId),
            iot.getAlerts(deviceId)
        ]);

        setHeader(state.childName, state.batteryPct);

        const locationTitle = document.getElementById('locationTitle');
        const locationSub = document.getElementById('locationSub');
        const distanceValue = document.getElementById('distanceValue');
        const distanceSub = document.getElementById('distanceSub');
        const statusValue = document.getElementById('statusValue');
        const statusSub = document.getElementById('statusSub');
        const batteryValue = document.getElementById('batteryValue');
        const batterySub = document.getElementById('batterySub');
        const mapFrame = document.getElementById('liveMapFrame');
        const mapLabel = document.getElementById('liveMapLabel');

        if (locationTitle) locationTitle.textContent = state.location?.address || 'Unknown';
        if (locationSub) locationSub.textContent = state.location?.city || '-';
        if (distanceValue) distanceValue.textContent = `${Number(state.distanceKm || 0).toFixed(1)} km`;
        if (distanceSub) distanceSub.textContent = 'From parent location';
        if (statusValue) setStatus(statusValue, state.statusType, state.statusText);
        if (statusSub) statusSub.textContent = `Updated ${state.updatedAt || ''}`;
        if (batteryValue) batteryValue.textContent = `${state.batteryPct || 0}%`;
        if (batterySub) batterySub.textContent = state.batteryEta || 'No estimate';

        const focused = applyMapFocus(state);
        if (!focused && mapFrame && state.location) {
            mapFrame.src = mapSrc(state.location.lat, state.location.lng);
            if (mapLabel) mapLabel.textContent = `Live: ${state.childName || 'Child'}`;
        }

        renderActivity(alerts);
    }

    document.addEventListener('DOMContentLoaded', async () => {
        try {
            await loadDashboard();
        } catch (error) {
            console.error('Dashboard load failed:', error);
        }

        setInterval(() => {
            loadDashboard().catch((error) => console.error('Dashboard refresh failed:', error));
        }, config.defaults.pollIntervalMs);
    });
})();


