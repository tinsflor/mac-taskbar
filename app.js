// ── Clock & Date ─────────────────────────────────────────
function updateClock() {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  const s = now.getSeconds().toString().padStart(2, '0');

  const timeStr = `${h}:${m}`;
  const dateStr = now.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  const dateFullStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  document.getElementById('trayTime').textContent = timeStr;
  document.getElementById('trayDate').textContent = dateStr;
  document.getElementById('clockLarge').textContent = `${h}:${m}:${s}`;
  document.getElementById('dateLarge').textContent = dateFullStr;
}
updateClock();
setInterval(updateClock, 1000);

// ── Mini Calendar ─────────────────────────────────────────
let calYear, calMonth;

function renderCalendar(year, month) {
  const container = document.getElementById('miniCalendar');
  const today = new Date();
  calYear = year;
  calMonth = month;

  const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInPrev = new Date(year, month, 0).getDate();

  let html = `
    <div class="cal-header">
      <button class="cal-nav" id="calPrev">&#8249;</button>
      <span>${monthName}</span>
      <button class="cal-nav" id="calNext">&#8250;</button>
    </div>
    <div class="cal-grid">
      <div class="cal-dow">Su</div>
      <div class="cal-dow">Mo</div>
      <div class="cal-dow">Tu</div>
      <div class="cal-dow">We</div>
      <div class="cal-dow">Th</div>
      <div class="cal-dow">Fr</div>
      <div class="cal-dow">Sa</div>
  `;

  for (let i = 0; i < firstDay; i++) {
    html += `<div class="cal-day other-month">${daysInPrev - firstDay + 1 + i}</div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    html += `<div class="cal-day${isToday ? ' today' : ''}">${d}</div>`;
  }

  const remaining = 42 - firstDay - daysInMonth;
  for (let d = 1; d <= remaining; d++) {
    html += `<div class="cal-day other-month">${d}</div>`;
  }

  html += '</div>';
  container.innerHTML = html;

  document.getElementById('calPrev').addEventListener('click', (e) => {
    e.stopPropagation();
    let m = calMonth - 1, y = calYear;
    if (m < 0) { m = 11; y--; }
    renderCalendar(y, m);
  });
  document.getElementById('calNext').addEventListener('click', (e) => {
    e.stopPropagation();
    let m = calMonth + 1, y = calYear;
    if (m > 11) { m = 0; y++; }
    renderCalendar(y, m);
  });
}

const now = new Date();
renderCalendar(now.getFullYear(), now.getMonth());

// ── Panel State ───────────────────────────────────────────
const panels = {
  start: document.getElementById('startMenu'),
  notif: document.getElementById('notifPanel'),
  calendar: document.getElementById('calendarPanel'),
};

function closeAll(except) {
  Object.entries(panels).forEach(([key, el]) => {
    if (key !== except) el.classList.remove('open');
  });
}

function togglePanel(name) {
  const panel = panels[name];
  const wasOpen = panel.classList.contains('open');
  closeAll();
  if (!wasOpen) panel.classList.add('open');
}

// ── Button Wiring ─────────────────────────────────────────
document.getElementById('startBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  togglePanel('start');
});

document.getElementById('searchBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  const wasOpen = panels.start.classList.contains('open');
  closeAll();
  if (!wasOpen) {
    panels.start.classList.add('open');
    setTimeout(() => panels.start.querySelector('.search-bar').focus(), 50);
  }
});

document.getElementById('notifBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  togglePanel('notif');
});

document.getElementById('clockBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  togglePanel('calendar');
});

document.getElementById('showHiddenBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  togglePanel('notif');
});

// close panels when clicking desktop
document.addEventListener('click', () => closeAll());

// prevent clicks inside panels from closing them
Object.values(panels).forEach(p => p.addEventListener('click', e => e.stopPropagation()));

// ── Taskbar App Clicks ────────────────────────────────────
document.querySelectorAll('.taskbar-app').forEach(app => {
  app.addEventListener('click', () => {
    const wasActive = app.classList.contains('active');
    document.querySelectorAll('.taskbar-app').forEach(a => {
      a.classList.remove('active');
    });
    if (!wasActive) {
      app.classList.add('active', 'running');
    }
  });
});

// mark all as running initially (simulated)
document.querySelectorAll('.taskbar-app').forEach((app, i) => {
  if (i < 3) app.classList.add('running');
});
document.querySelector('.taskbar-app[data-app="edge"]').classList.add('active');

// ── Volume / Brightness sliders live style ────────────────
document.querySelectorAll('.slider').forEach(slider => {
  function update() {
    const val = slider.value + '%';
    slider.style.setProperty('--val', val);
    slider.style.background = `linear-gradient(to right, #60cdff ${val}, rgba(255,255,255,0.2) ${val})`;
  }
  slider.addEventListener('input', update);
  update();
});

// ── Clear Notifications ───────────────────────────────────
document.querySelector('.clear-all').addEventListener('click', (e) => {
  e.stopPropagation();
  document.querySelector('.notif-list').innerHTML =
    '<div style="text-align:center;color:rgba(255,255,255,0.4);font-size:12px;padding:16px">No new notifications</div>';
  document.querySelector('.notif-dot').style.display = 'none';
});

// ── Quick Settings toggles ────────────────────────────────
document.querySelectorAll('.qs-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    btn.classList.toggle('active');
  });
});
