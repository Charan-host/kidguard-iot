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

    function statusClass(status) {
        return status === 'active' ? 'active' : 'resolved';
    }

    function itemClass(status) {
        return status === 'active' ? 'alert-item is-active' : 'alert-item';
    }

    function hasLocation(alert) {
        const lat = Number(alert?.lat);
        const lng = Number(alert?.lng);
        return !Number.isNaN(lat) && !Number.isNaN(lng);
    }

    function summary(alerts) {
        const active = alerts.filter((a) => a.status === 'active').length;
        const total = alerts.length;
        const resolved = total - active;
        document.getElementById('activeAlertCount').textContent = String(active);
        document.getElementById('totalAlertCount').textContent = String(total);
        document.getElementById('resolvedAlertCount').textContent = String(resolved);
    }

    function renderAlerts(deviceId, alerts) {
        const container = document.getElementById('alertList');
        if (!container) return;

        if (!alerts || alerts.length === 0) {
            container.innerHTML = '<div class="alert-item"><div><div class="alert-title">No alerts</div><div class="alert-info">All clear</div></div><div class="alert-status resolved">Resolved</div></div>';
            return;
        }

        container.innerHTML = alerts.map((alert) => {
            const canResolve = alert.status === 'active';
            const infoParts = [alert.message, alert.time || ''].filter(Boolean);
            const canViewLocation = hasLocation(alert);
            return `
            <div class="${itemClass(alert.status)}">
                <div>
                    <div class="alert-title">${alert.title}</div>
                    <div class="alert-info">${infoParts.join(' - ') || 'No details available'}</div>
                    <div class="alert-actions">
                        ${canViewLocation ? `<button class="alert-btn primary" data-lat="${alert.lat}" data-lng="${alert.lng}" data-title="${alert.title}">View Location</button>` : ''}
                        ${canResolve ? `<button class="alert-btn" data-resolve="${alert.id}">Mark as Resolved</button>` : ''}
                    </div>
                </div>
                <div class="alert-status ${statusClass(alert.status)}">${alert.status === 'active' ? 'Active' : 'Resolved'}</div>
            </div>`;
        }).join('');

        container.querySelectorAll('button[data-resolve]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const alertId = btn.getAttribute('data-resolve');
                await iot.resolveAlert(deviceId, alertId);
                await loadAlerts();
            });
        });

        container.querySelectorAll('button[data-lat]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const lat = Number(btn.getAttribute('data-lat'));
                const lng = Number(btn.getAttribute('data-lng'));
                const title = btn.getAttribute('data-title');
                if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
                    iot.setMapFocus({ lat, lng, label: title });
                }
                window.location.href = 'dash.html#live-location';
            });
        });
    }

    async function loadAlerts() {
        const deviceId = iot.getDeviceId();
        const [state, alerts] = await Promise.all([
            iot.getDeviceState(deviceId),
            iot.getAlerts(deviceId)
        ]);

        setHeader(state.childName, state.batteryPct);
        summary(alerts);
        renderAlerts(deviceId, alerts);
    }

    document.addEventListener('DOMContentLoaded', () => {
        loadAlerts().catch((error) => console.error('Alert load failed:', error));
        setInterval(() => {
            loadAlerts().catch((error) => console.error('Alert refresh failed:', error));
        }, config.defaults.pollIntervalMs);
    });
})();


