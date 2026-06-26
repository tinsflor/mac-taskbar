// ── App icon map ──────────────────────────────────────────
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
  'Clock': '🕐', 'Home': '🏠', 'Shortcuts': '⚡',
};

function iconFor(name) {
  return ICONS[name] || '🖥️';
}

// ── Persisted pinned apps ─────────────────────────────────
const DEFAULT_PINNED = ['Finder', 'Safari', 'Mail', 'Messages', 'Calendar'];
let pinnedApps = JSON.parse(localStorage.getItem('pinnedApps') || 'null') || DEFAULT_PINNED;

function savePinned() {
  localStorage.setItem('pinnedApps', JSON.stringify(pinnedApps));
}

// ── Known apps list (for picker) ──────────────────────────
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

// ── Render taskbar ────────────────────────────────────────
function render() {
  // Pinned section
  const pinnedEl = document.getElementById('pinnedSection');
  pinnedEl.innerHTML = '';
  pinnedApps.forEach(name => {
    const isRunning = runningApps.includes(name);
    const btn = document.createElement('button');
    btn.className = 'app-btn pinned-btn' + (isRunning ? ' running' : '') + (name === activeApp ? ' active' : '');
    btn.title = name;
    btn.innerHTML = `<span class="app-btn-icon">${iconFor(name)}</span>`;
    btn.addEventListener('click', () => {
      if (isRunning) {
        activeApp = name;
        if (window.electron) window.electron.activateApp(name);
        render();
      }
    });
    pinnedEl.appendChild(btn);
  });

  // Running section — only apps not already pinned
  const runningEl = document.getElementById('runningSection');
  runningEl.innerHTML = '';
  const unpinnedRunning = runningApps.filter(n => !pinnedApps.includes(n));
  unpinnedRunning.forEach(name => {
    const btn = document.createElement('button');
    btn.className = 'app-btn' + (name === activeApp ? ' active' : '');
    btn.title = name;
    btn.innerHTML = `<span class="app-btn-icon">${iconFor(name)}</span><span class="app-btn-name">${name}</span>`;
    btn.addEventListener('click', () => {
      activeApp = name;
      if (window.electron) window.electron.activateApp(name);
      render();
    });
    runningEl.appendChild(btn);
  });

  // Hide divider if no unpinned running apps
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

// ── Fetch running apps ────────────────────────────────────
async function refreshApps() {
  try {
    if (window.electron && window.electron.getApps) {
      const apps = await window.electron.getApps();
      runningApps = Array.isArray(apps) ? apps : [];
    }
  } catch (e) {
    runningApps = [];
  }
  render();
}

// Render pinned apps immediately so the bar is never empty
render();
refreshApps();
setInterval(refreshApps, 3000);

// ── Mouse pass-through ────────────────────────────────────
const taskbar = document.getElementById('taskbar');
const picker = document.getElementById('pinPicker');

const mouseEnter = () => { if (window.electron) window.electron.mouseEnter(); };
const mouseLeave = () => { if (window.electron) window.electron.mouseLeave(); };

taskbar.addEventListener('mouseenter', mouseEnter);
picker.addEventListener('mouseenter', mouseEnter);
taskbar.addEventListener('mouseleave', () => {
  if (!picker.classList.contains('open')) mouseLeave();
});
picker.addEventListener('mouseleave', mouseLeave);

// ── Pin picker ────────────────────────────────────────────
function renderPicker(knownApps) {
  const list = document.getElementById('pinPickerList');
  // Combine known apps + any running apps not in the list
  const allApps = [...new Set([...knownApps, ...runningApps])].sort();
  list.innerHTML = '';
  allApps.forEach(name => {
    const isPinned = pinnedApps.includes(name);
    const item = document.createElement('div');
    item.className = 'picker-item' + (isPinned ? ' pinned' : '');
    item.innerHTML = `
      <span class="picker-icon">${iconFor(name)}</span>
      <span class="picker-name">${name}</span>
      ${isPinned ? '<span class="picker-check">✓</span>' : ''}
    `;
    item.addEventListener('click', () => {
      if (isPinned) {
        pinnedApps = pinnedApps.filter(n => n !== name);
      } else {
        pinnedApps.push(name);
      }
      savePinned();
      render();
      renderPicker(knownApps);
    });
    list.appendChild(item);
  });
}

document.getElementById('addPinBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  picker.classList.toggle('open');
  if (picker.classList.contains('open')) renderPicker(ALL_KNOWN_APPS);
});

document.getElementById('pinPickerClose').addEventListener('click', (e) => {
  e.stopPropagation();
  picker.classList.remove('open');
});

document.addEventListener('click', () => picker.classList.remove('open'));
picker.addEventListener('click', e => e.stopPropagation());
