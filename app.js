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

// Renderer-side cache of real icon data URLs
const realIconCache = {};

// Build an icon element: shows real app logo if available, else emoji.
function makeIconEl(name, pinned) {
  const span = document.createElement('span');
  span.className = 'app-btn-icon';

  if (realIconCache[name]) {
    span.appendChild(makeImg(realIconCache[name]));
  } else {
    span.textContent = emojiFor(name);
    if (window.electron && window.electron.getIcon && realIconCache[name] !== null) {
      window.electron.getIcon(name).then(dataUrl => {
        realIconCache[name] = dataUrl || null;
        if (dataUrl) {
          // update any currently-rendered icons for this app
          document.querySelectorAll(`[data-icon-for="${cssEscape(name)}"]`).forEach(el => {
            el.textContent = '';
            el.appendChild(makeImg(dataUrl));
          });
        }
      }).catch(() => {});
    }
  }
  span.setAttribute('data-icon-for', name);
  return span;
}

function makeImg(dataUrl) {
  const img = document.createElement('img');
  img.className = 'app-logo';
  img.src = dataUrl;
  img.draggable = false;
  return img;
}

function cssEscape(s) { return s.replace(/"/g, '\\"'); }

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
let dragName = null;

function activate(name) {
  activeApp = name;
  if (window.electron) window.electron.activateApp(name);
  render();
}

// ── Render ────────────────────────────────────────────────
function render() {
  // Pinned section (icon only, draggable, right-click to remove)
  const pinnedEl = document.getElementById('pinnedSection');
  pinnedEl.innerHTML = '';
  pinnedApps.forEach(name => {
    const isRunning = runningApps.includes(name);
    const btn = document.createElement('button');
    btn.className = 'app-btn pinned-btn' + (isRunning ? ' running' : '') + (name === activeApp ? ' active' : '');
    btn.title = name + '  (drag to reorder · right-click to remove)';
    btn.draggable = true;
    btn.appendChild(makeIconEl(name, true));

    btn.addEventListener('click', () => { if (isRunning) activate(name); });

    // Right-click to unpin
    btn.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      pinnedApps = pinnedApps.filter(n => n !== name);
      savePinned();
      render();
    });

    // Drag to reorder
    btn.addEventListener('dragstart', (e) => {
      dragName = name;
      btn.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    btn.addEventListener('dragend', () => { dragName = null; btn.classList.remove('dragging'); });
    btn.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
    btn.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!dragName || dragName === name) return;
      const from = pinnedApps.indexOf(dragName);
      const to = pinnedApps.indexOf(name);
      if (from === -1 || to === -1) return;
      pinnedApps.splice(from, 1);
      pinnedApps.splice(to, 0, dragName);
      savePinned();
      render();
    });

    pinnedEl.appendChild(btn);
  });

  // Running section — only apps not already pinned (icon + name)
  const runningEl = document.getElementById('runningSection');
  runningEl.innerHTML = '';
  const unpinnedRunning = runningApps.filter(n => !pinnedApps.includes(n));
  unpinnedRunning.forEach(name => {
    const btn = document.createElement('button');
    btn.className = 'app-btn' + (name === activeApp ? ' active' : '');
    btn.title = name + '  (right-click to pin)';
    btn.appendChild(makeIconEl(name, false));
    const label = document.createElement('span');
    label.className = 'app-btn-name';
    label.textContent = name;
    btn.appendChild(label);

    btn.addEventListener('click', () => activate(name));

    // Right-click a running app to pin it
    btn.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (!pinnedApps.includes(name)) { pinnedApps.push(name); savePinned(); render(); }
    });

    runningEl.appendChild(btn);
  });

  document.getElementById('divider').style.display = unpinnedRunning.length ? '' : 'none';
}

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

// ── Running apps polling ──────────────────────────────────
async function refreshApps() {
  try {
    if (window.electron && window.electron.getApps) {
      const apps = await window.electron.getApps();
      runningApps = Array.isArray(apps) ? apps : [];
    }
  } catch (e) { runningApps = []; }
  render();
}
render();
refreshApps();
setInterval(refreshApps, 3000);

// ── Mouse pass-through (no-op for thin bar, kept for safety) ──
const taskbar = document.getElementById('taskbar');
const picker = document.getElementById('pinPicker');
const mEnter = () => { if (window.electron) window.electron.mouseEnter(); };
const mLeave = () => { if (window.electron) window.electron.mouseLeave(); };
taskbar.addEventListener('mouseenter', mEnter);
picker.addEventListener('mouseenter', mEnter);
taskbar.addEventListener('mouseleave', () => { if (!picker.classList.contains('open')) mLeave(); });
picker.addEventListener('mouseleave', mLeave);

// ── Pin picker (the + button) ─────────────────────────────
function renderPicker() {
  const list = document.getElementById('pinPickerList');
  const allApps = [...new Set([...ALL_KNOWN_APPS, ...runningApps])].sort();
  list.innerHTML = '';
  allApps.forEach(name => {
    const isPinned = pinnedApps.includes(name);
    const item = document.createElement('div');
    item.className = 'picker-item' + (isPinned ? ' pinned' : '');
    const icon = makeIconEl(name, false);
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
      render();
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
