(() => {
    const iot = window.KidGuardIoT;

    function setHeader(childName, batteryPct) {
        document.querySelectorAll('.user span').forEach((el) => {
            el.textContent = childName || 'Unknown Child';
        });
        document.querySelectorAll('.battery').forEach((el) => {
            el.textContent = `Battery ${batteryPct}%`;
        });
    }

    function renderHistory(items) {
        const container = document.getElementById('historyTimeline');
        if (!container) return;

        if (!items || items.length === 0) {
            container.innerHTML = '<div class="history-item"><div class="history-card"><div><div class="history-title">No history</div><div class="history-address">No location records available</div></div></div></div>';
            return;
        }

        container.innerHTML = items.map((item) => {
            return `
            <div class="history-item">
                <div class="history-card">
                    <div>
                        <div class="history-title">${item.title}</div>
                        <div class="history-address">${item.address}</div>
                        <div class="history-time">${item.timeLabel || ''}</div>
                    </div>
                    <a class="history-link" href="dash.html#live-location" data-lat="${item.lat || ''}" data-lng="${item.lng || ''}" data-title="${item.title}">View on Map</a>
                </div>
            </div>`;
        }).join('');

        container.querySelectorAll('a[data-lat]').forEach((link) => {
            link.addEventListener('click', () => {
                const lat = Number(link.getAttribute('data-lat'));
                const lng = Number(link.getAttribute('data-lng'));
                const title = link.getAttribute('data-title');
                if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
                    iot.setMapFocus({ lat, lng, label: title });
                }
            });
        });
    }

    async function loadHistory() {
        const deviceId = iot.getDeviceId();
        const range = document.getElementById('historyRange').value;
        const [state, history] = await Promise.all([
            iot.getDeviceState(deviceId),
            iot.getHistory(deviceId, range)
        ]);

        setHeader(state.childName, state.batteryPct);
        renderHistory(history);
    }

    document.addEventListener('DOMContentLoaded', () => {
        const range = document.getElementById('historyRange');
        if (range) {
            range.addEventListener('change', () => {
                loadHistory().catch((error) => console.error('History change load failed:', error));
            });
        }

        loadHistory().catch((error) => console.error('History load failed:', error));
    });
})();


