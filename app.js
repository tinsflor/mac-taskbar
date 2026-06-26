// App icons for known apps
const APP_ICONS = {
  'Finder': '🗂️', 'Safari': '🧭', 'Google Chrome': '🌐', 'Firefox': '🦊',
  'Mail': '✉️', 'Messages': '💬', 'Calendar': '📅', 'Notes': '📒',
  'Photos': '🖼️', 'Music': '🎵', 'Podcasts': '🎙️', 'TV': '📺',
  'Terminal': '🖥️', 'Xcode': '⚒️', 'TextEdit': '✏️', 'Preview': '🔍',
  'System Preferences': '⚙️', 'System Settings': '⚙️', 'App Store': '🛍️',
  'Microsoft Word': '📝', 'Microsoft Excel': '📊', 'Microsoft PowerPoint': '📊',
  'Slack': '💬', 'Zoom': '📹', 'Spotify': '🎵', 'Discord': '🎮',
  'VS Code': '💻', 'Visual Studio Code': '💻', 'Figma': '🎨',
  'Claude': '🤖', 'Bartender': '🍺', 'FaceTime': '📹',
};

function iconFor(name) {
  return APP_ICONS[name] || '🖥️';
}

// ── Clock ─────────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  document.getElementById('trayTime').textContent =
    `${h}:${m}  ${now.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}`;
}
updateClock();
setInterval(updateClock, 10000);

// ── Mouse pass-through ────────────────────────────────────
const taskbar = document.getElementById('taskbar');
taskbar.addEventListener('mouseenter', () => window.electron.mouseEnter());
taskbar.addEventListener('mouseleave', () => window.electron.mouseLeave());

// ── Running apps ──────────────────────────────────────────
let activeApp = null;

async function refreshApps() {
  const apps = await window.electron.getApps();
  const container = document.getElementById('tbApps');
  container.innerHTML = '';

  apps.forEach(name => {
    const el = document.createElement('div');
    el.className = 'tb-app' + (name === activeApp ? ' active' : '');
    el.innerHTML = `<span class="tb-app-icon">${iconFor(name)}</span><span class="tb-app-name">${name}</span>`;
    el.addEventListener('click', () => {
      activeApp = name;
      window.electron.activateApp(name);
      document.querySelectorAll('.tb-app').forEach(a => a.classList.remove('active'));
      el.classList.add('active');
    });
    container.appendChild(el);
  });
}

refreshApps();
setInterval(refreshApps, 3000);
