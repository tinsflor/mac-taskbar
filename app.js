// ── Emoji fallback icons (used only if the real app icon can't be read) ──
const ICONS = {
  'Finder': '🗂️', 'Safari': '🧭', 'Google Chrome': '🌐', 'Firefox': '🦊',
  'Mail': '✉️', 'Messages': '💬', 'Calendar': '📅', 'Notes': '📒',
  'Photos': '🖼️', 'Music': '🎵', 'Podcasts': '🎙️', 'TV': '📺',
  'Terminal': '🖥️', 'TextEdit': '✏️', 'Preview': '👁️', 'Contacts': '👤',
  'System Preferences': '⚙️', 'System Settings': '⚙️', 'App Store': '🛍️',
  'Microsoft Word': '📝', 'Microsoft Excel': '📊', 'Microsoft PowerPoint': '📑',
  'Slack': '💬', 'Zoom': '📹', 'Spotify': '🎵', 'Discord': '🎮',
  'Visual Studio Code': '💻', 'VS Code': '💻', 'Figma': '🎨',
  'Claude': '🤖', 'FaceTime': '📹', 'Maps': '🗺️', 'Reminders': '✅',
  'Pages': '📄', 'Numbers': '📊', 'Keynote': '🎥', 'Books': '📚',
  'News': '📰', 'Stocks': '📈', 'Weather': '⛅', 'Calculator': '🧮',
  'Clock': '🕐', 'Home': '🏠', 'Shortcuts': '⚡', 'Jump Desktop': '🖥️',
  'Wispr Flow': '🎙️',
};
function emojiFor(name) { return ICONS[name] || '🖥️'; }

// Renderer-side cache of real icon data URLs (undefined = not tried, null = none)
const realIconCache = {};

function makeImg(dataUrl) {
  const img = document.createElement('img');
  img.className = 'app-logo';
  img.src = dataUrl;
  img.draggable = false;
  return img;
}

function makeIconEl(name) {
  const span = document.createElement('span');
  span.className = 'app-btn-icon';
  span.setAttribute('data-icon-for', name);

  if (realIconCache[name]) {
    span.appendChild(makeImg(realIconCache[name]));
  } else {
    span.textContent = emojiFor(name);
    if (realIconCache[name] === undefined && window.electron && window.electron.getIcon) {
      window.electron.getIcon(name).then(dataUrl => {
        realIconCache[name] = dataUrl || null;
        if (dataUrl) {
          document.querySelectorAll('.app-btn-icon').forEach(el => {
            if (el.getAttribute('data-icon-for') === name) {
              el.textContent = '';
              el.appendChild(makeImg(dataUrl));
            }
          });
        }
      }).catch(() => { realIconCache[name] = null; });
    }
  }
  return span;
}

// ── Persisted pinned apps ─────────────────────────────────
const DEFAULT_PINNED = ['Finder', 'Safari', 'Mail', 'Messages', 'Calendar'];
let pinnedApps = JSON.parse(localStorage.getItem('pinnedApps') || 'null') || DEFAULT_PINNED;
function savePinned() { localStorage.setItem('pinnedApps', JSON.stringify(pinnedApps)); }

const ALL_KNOWN_APPS = [
  'App Store', 'Books', 'Calculator', 'Calendar', 'Clock', 'Contacts',
  'Discord', 'FaceTime', 'Figma', 'Finder', 'Firefox', 'Google Chrome',
  'Home', 'Keynote', 'Mail', 'Maps', 'Messages', 'Microsoft Excel',
  'Microsoft PowerPoint', 'Microsoft Word', 'Music', 'News', 'Notes',
  'Numbers', 'Pages', 'Photos', 'Podcasts', 'Preview', 'Reminders',
  'Safari', 'Shortcuts', 'Slack', 'Spotify', 'Stocks', 'System Settings',
  'Terminal', 'TextEdit', 'TV', 'Visual Studio Code', 'Weather', 'Zoom',
];

// ── State ─────────────────────────────────────────────────
let runningApps = [];
let activeApp = null;

function activate(name) {
  activeApp = name;
  if (window.electron) window.electron.activateApp(name);
  updatePinnedState();
  renderRunning();
}

function removePin(name) {
  pinnedApps = pinnedApps.filter(n => n !== name);
  savePinned();
  renderPinned();
}

function addPin(name) {
  if (!pinnedApps.includes(name)) { pinnedApps.push(name); savePinned(); renderPinned(); renderRunning(); }
}

// Ask the main process to show a native right-click menu for this app
function openAppMenu(name, isPinned) {
  if (window.electron && window.electron.showAppMenu) {
    window.electron.showAppMenu({ name, isPinned, isRunning: runningApps.includes(name) });
  }
}

// Menu actions handled in the main process come back as events
if (window.electron) {
  if (window.electron.onMenuUnpin) window.electron.onMenuUnpin((name) => removePin(name));
  if (window.electron.onMenuPin) window.electron.onMenuPin((name) => addPin(name));
  if (window.electron.onRefresh) window.electron.onRefresh(() => refreshApps());
}

// ── Drag-to-reorder (manual, mouse-based) ─────────────────
let drag = null;
let suppressClick = false;

function pinnedContainer() { return document.getElementById('pinnedSection'); }

function computeDropIndex(clientX, draggedName) {
  const order = pinnedApps.filter(n => n !== draggedName);
  const btns = [...pinnedContainer().querySelectorAll('.pinned-btn')].filter(b => b.dataset.name !== draggedName);
  for (let i = 0; i < btns.length; i++) {
    const r = btns[i].getBoundingClientRect();
    if (clientX < r.left + r.width / 2) {
      return order.indexOf(btns[i].dataset.name);
    }
  }
  return order.length;
}

document.addEventListener('mousemove', (e) => {
  if (!drag) return;
  if (!drag.moved && Math.abs(e.clientX - drag.startX) > 5) {
    drag.moved = true;
    const b = [...pinnedContainer().querySelectorAll('.pinned-btn')].find(x => x.dataset.name === drag.name);
    if (b) b.classList.add('dragging');
  }
});

document.addEventListener('mouseup', (e) => {
  if (!drag) return;
  const d = drag;
  drag = null;
  if (d.moved) {
    const idx = computeDropIndex(e.clientX, d.name);
    const without = pinnedApps.filter(n => n !== d.name);
    without.splice(idx, 0, d.name);
    pinnedApps = without;
    savePinned();
    renderPinned();
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 80);
  }
});

// ── Render pinned section ─────────────────────────────────
function renderPinned() {
  const el = pinnedContainer();
  el.innerHTML = '';
  pinnedApps.forEach(name => {
    const isRunning = runningApps.includes(name);
    const btn = document.createElement('button');
    btn.className = 'app-btn pinned-btn' + (isRunning ? ' running' : '') + (name === activeApp ? ' active' : '');
    btn.dataset.name = name;
    btn.title = name + '  (drag to reorder · right-click to remove)';
    btn.appendChild(makeIconEl(name));

    btn.addEventListener('mousedown', (e) => {
      if (e.button === 2) {            // right-click → context menu
        e.preventDefault();
        openAppMenu(name, true);
      } else if (e.button === 0) {     // left button → maybe drag
        drag = { name, startX: e.clientX, moved: false };
        e.preventDefault();
      }
    });
    btn.addEventListener('contextmenu', (e) => { e.preventDefault(); openAppMenu(name, true); });
    btn.addEventListener('click', () => {
      if (suppressClick) return;
      if (runningApps.includes(name)) activate(name);
    });

    el.appendChild(btn);
  });
}

// Update running/active classes on existing pinned buttons without rebuilding
function updatePinnedState() {
  pinnedContainer().querySelectorAll('.pinned-btn').forEach(btn => {
    const name = btn.dataset.name;
    btn.classList.toggle('running', runningApps.includes(name));
    btn.classList.toggle('active', name === activeApp);
  });
}

// ── Render running section ────────────────────────────────
function renderRunning() {
  const el = document.getElementById('runningSection');
  el.innerHTML = '';
  const unpinned = runningApps.filter(n => !pinnedApps.includes(n));
  unpinned.forEach(name => {
    const btn = document.createElement('button');
    btn.className = 'app-btn' + (name === activeApp ? ' active' : '');
    btn.dataset.name = name;
    btn.title = name + '  (right-click to quit)';
    btn.appendChild(makeIconEl(name));
    const label = document.createElement('span');
    label.className = 'app-btn-name';
    label.textContent = name;
    btn.appendChild(label);

    btn.addEventListener('click', () => activate(name));
    btn.addEventListener('contextmenu', (e) => { e.preventDefault(); openAppMenu(name, false); });
    btn.addEventListener('mousedown', (e) => { if (e.button === 2) { e.preventDefault(); openAppMenu(name, false); } });

    el.appendChild(btn);
  });
  document.getElementById('divider').style.display = unpinned.length ? '' : 'none';
}

// ── License / trial status pill ───────────────────────────
async function refreshLicensePill() {
  const pill = document.getElementById('licensePill');
  if (!pill || !window.electron || !window.electron.licenseStatus) return;
  let s;
  try { s = await window.electron.licenseStatus(); } catch (e) { return; }

  pill.style.display = '';
  pill.className = 'license-pill ' + s.state;
  if (s.state === 'licensed') {
    pill.style.display = 'none';            // hide once paid
  } else if (s.state === 'trial') {
    pill.textContent = `Trial: ${s.daysLeft}d`;
    pill.title = `${s.daysLeft} days left in your free trial — click to enter a license`;
  } else {
    pill.textContent = 'Activate';
    pill.title = 'Trial ended — click to enter a license key';
  }
}

document.getElementById('licensePill').addEventListener('click', (e) => {
  e.stopPropagation();
  if (window.electron && window.electron.licenseOpen) window.electron.licenseOpen();
});

refreshLicensePill();
setInterval(refreshLicensePill, 60000);

// ── Clock ─────────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const date = now.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  document.getElementById('trayTime').textContent = `${h}:${m}   ${date}`;
}
updateClock();
setInterval(updateClock, 10000);

// ── Running apps polling (does NOT rebuild pinned) ────────
async function refreshApps() {
  try {
    if (window.electron && window.electron.getApps) {
      const apps = await window.electron.getApps();
      runningApps = Array.isArray(apps) ? apps : [];
    }
  } catch (e) { runningApps = []; }
  if (!drag) {                 // don't rebuild while the user is dragging
    updatePinnedState();
    renderRunning();
  }
}

renderPinned();
renderRunning();
refreshApps();
setInterval(refreshApps, 3000);

// ── Pin picker (the + button) ─────────────────────────────
const picker = document.getElementById('pinPicker');

function renderPicker() {
  const list = document.getElementById('pinPickerList');
  const allApps = [...new Set([...ALL_KNOWN_APPS, ...runningApps])].sort();
  list.innerHTML = '';
  allApps.forEach(name => {
    const isPinned = pinnedApps.includes(name);
    const item = document.createElement('div');
    item.className = 'picker-item' + (isPinned ? ' pinned' : '');
    const icon = makeIconEl(name);
    icon.classList.add('picker-icon');
    item.appendChild(icon);
    const nm = document.createElement('span');
    nm.className = 'picker-name';
    nm.textContent = name;
    item.appendChild(nm);
    if (isPinned) {
      const chk = document.createElement('span');
      chk.className = 'picker-check';
      chk.textContent = '✓';
      item.appendChild(chk);
    }
    item.addEventListener('click', () => {
      if (isPinned) pinnedApps = pinnedApps.filter(n => n !== name);
      else pinnedApps.push(name);
      savePinned();
      renderPinned();
      renderRunning();
      renderPicker();
    });
    list.appendChild(item);
  });
}

document.getElementById('addPinBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  picker.classList.toggle('open');
  if (picker.classList.contains('open')) renderPicker();
});
document.getElementById('pinPickerClose').addEventListener('click', (e) => {
  e.stopPropagation();
  picker.classList.remove('open');
});
document.addEventListener('click', () => picker.classList.remove('open'));
picker.addEventListener('click', (e) => e.stopPropagation());
