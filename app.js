// ── Mouse pass-through (Electron only) ───────────────────
const isElectron = typeof window.electron !== 'undefined';

function captureMouseFor(el) {
  if (!isElectron) return;
  el.addEventListener('mouseenter', () => window.electron.mouseEnter());
  el.addEventListener('mouseleave', () => window.electron.mouseLeave());
}

// capture mouse over taskbar and popups
['taskbar', 'startMenu', 'notifPanel', 'calPanel'].forEach(id => {
  const el = document.getElementById(id);
  if (el) captureMouseFor(el);
});

// ── Clock ─────────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const h = pad(now.getHours()), m = pad(now.getMinutes()), s = pad(now.getSeconds());
  document.getElementById('trayTime').textContent = `${h}:${m}`;
  document.getElementById('trayDate').textContent = now.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  document.getElementById('calClock').textContent = `${h}:${m}:${s}`;
  document.getElementById('calDate').textContent = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
updateClock();
setInterval(updateClock, 1000);

// ── Mini calendar ─────────────────────────────────────────
let calYear, calMonth;

function renderCal(y, m) {
  calYear = y; calMonth = m;
  const today = new Date();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const firstDay = new Date(y, m, 1).getDay();
  const daysInPrev = new Date(y, m, 0).getDate();
  const monthName = new Date(y, m).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  let html = `<div class="cal-header">
    <button class="cal-nav" id="calPrev">&#8249;</button>
    <span>${monthName}</span>
    <button class="cal-nav" id="calNext">&#8250;</button>
  </div><div class="cal-grid">
    ${['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => `<div class="cal-dow">${d}</div>`).join('')}`;

  for (let i = 0; i < firstDay; i++)
    html += `<div class="cal-day other">${daysInPrev - firstDay + 1 + i}</div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === today.getDate() && m === today.getMonth() && y === today.getFullYear();
    html += `<div class="cal-day${isToday ? ' today' : ''}">${d}</div>`;
  }
  const rem = 42 - firstDay - daysInMonth;
  for (let d = 1; d <= rem; d++) html += `<div class="cal-day other">${d}</div>`;
  html += '</div>';

  document.getElementById('miniCal').innerHTML = html;
  document.getElementById('calPrev').onclick = e => { e.stopPropagation(); let nm = calMonth-1, ny = calYear; if(nm<0){nm=11;ny--;} renderCal(ny,nm); };
  document.getElementById('calNext').onclick = e => { e.stopPropagation(); let nm = calMonth+1, ny = calYear; if(nm>11){nm=0;ny++;} renderCal(ny,nm); };
}

const now = new Date();
renderCal(now.getFullYear(), now.getMonth());

// ── Panel management ──────────────────────────────────────
const panels = {
  start: document.getElementById('startMenu'),
  notif: document.getElementById('notifPanel'),
  cal: document.getElementById('calPanel'),
};

function closeAll(except) {
  Object.entries(panels).forEach(([k, el]) => { if (k !== except) el.classList.remove('open'); });
}

function toggle(name) {
  const wasOpen = panels[name].classList.contains('open');
  closeAll();
  if (!wasOpen) panels[name].classList.add('open');
}

document.getElementById('startBtn').addEventListener('click', e => { e.stopPropagation(); toggle('start'); });
document.getElementById('searchBtn').addEventListener('click', e => {
  e.stopPropagation();
  const wasOpen = panels.start.classList.contains('open');
  closeAll();
  if (!wasOpen) { panels.start.classList.add('open'); setTimeout(() => panels.start.querySelector('.start-search').focus(), 50); }
});
document.getElementById('notifBtn').addEventListener('click', e => { e.stopPropagation(); toggle('notif'); });
document.getElementById('clockBtn').addEventListener('click', e => { e.stopPropagation(); toggle('cal'); });

document.addEventListener('click', () => closeAll());
Object.values(panels).forEach(p => p.addEventListener('click', e => e.stopPropagation()));
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(); });

// ── App clicks ────────────────────────────────────────────
document.querySelectorAll('.tb-app').forEach(app => {
  app.addEventListener('click', () => {
    const wasActive = app.classList.contains('active');
    document.querySelectorAll('.tb-app').forEach(a => a.classList.remove('active'));
    if (!wasActive) app.classList.add('active', 'running');
  });
});

// ── Quick settings toggles ────────────────────────────────
document.querySelectorAll('.qs-btn').forEach(btn => {
  btn.addEventListener('click', e => { e.stopPropagation(); btn.classList.toggle('active'); });
});

// ── Clear notifications ───────────────────────────────────
document.getElementById('clearBtn').addEventListener('click', e => {
  e.stopPropagation();
  document.getElementById('notifList').innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.35);font-size:12px;padding:12px">No new notifications</div>';
  document.querySelector('.notif-dot').style.display = 'none';
});

// ── Sliders ───────────────────────────────────────────────
document.querySelectorAll('.slider').forEach(s => {
  const update = () => s.style.background = `linear-gradient(to right,#60cdff ${s.value}%,rgba(255,255,255,0.15) ${s.value}%)`;
  s.addEventListener('input', update);
  update();
});
