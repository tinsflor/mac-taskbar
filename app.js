// ── App Data ──────────────────────────────────────────────
const ALL_APPS = [
  { name: 'App Store',        icon: '🅰️' },
  { name: 'Automator',        icon: '🤖' },
  { name: 'Bartender Pro',    icon: '🍺' },
  { name: 'BitRecover',       icon: '💾' },
  { name: 'Bluetooth File Exchange', icon: '🔵' },
  { name: 'Books',            icon: '📚' },
  { name: 'BusyContacts',     icon: '👥' },
  { name: 'Calculator',       icon: '🧮' },
  { name: 'Calendar',         icon: '📅' },
  { name: 'Canva',            icon: '🎨' },
  { name: 'Chess',            icon: '♟️' },
  { name: 'Clock',            icon: '🕐' },
  { name: 'Contacts',         icon: '👤' },
  { name: 'FaceTime',         icon: '📹' },
  { name: 'Finder',           icon: '🗂️' },
  { name: 'Google Chrome',    icon: '🌐' },
  { name: 'Mail',             icon: '✉️' },
  { name: 'Maps',             icon: '🗺️' },
  { name: 'Messages',         icon: '💬' },
  { name: 'Microsoft Excel',  icon: '📊' },
  { name: 'Microsoft Word',   icon: '📝' },
  { name: 'Music',            icon: '🎵' },
  { name: 'Notes',            icon: '📒' },
  { name: 'Photos',           icon: '🖼️' },
  { name: 'Print Center',     icon: '🖨️' },
  { name: 'Reminders',        icon: '✅' },
  { name: 'Safari',           icon: '🧭' },
  { name: 'System Settings',  icon: '⚙️' },
  { name: 'Terminal',         icon: '🖥️' },
  { name: 'TextEdit',         icon: '✏️' },
  { name: 'Wispr Flow',       icon: '🎙️' },
];

const RECENT_APPS = [
  { name: 'Wispr Flow',       icon: '🎙️' },
  { name: 'Microsoft Excel',  icon: '📊' },
  { name: 'Print Center',     icon: '🖨️' },
  { name: 'Finder',           icon: '🗂️' },
  { name: 'Google Chrome',    icon: '🌐' },
  { name: 'System Settings',  icon: '⚙️' },
  { name: 'App Store',        icon: '🅰️' },
  { name: 'Calculator',       icon: '🧮' },
  { name: 'Messages',         icon: '💬' },
];

// ── Render All Apps (alphabetical with group headers) ─────
function renderAllApps(apps) {
  const panel = document.getElementById('allAppsPanel');
  const grouped = {};
  apps.forEach(app => {
    const letter = app.name[0].toUpperCase();
    if (!grouped[letter]) grouped[letter] = [];
    grouped[letter].push(app);
  });

  panel.innerHTML = Object.keys(grouped).sort().map(letter => `
    <div class="alpha-group">
      <div class="alpha-header">${letter}</div>
      ${grouped[letter].map(app => `
        <div class="app-row">
          <span class="app-row-icon">${app.icon}</span>
          <span class="app-row-name">${app.name}</span>
        </div>
      `).join('')}
    </div>
  `).join('');
}

// ── Render Recent Apps ────────────────────────────────────
function renderRecentApps(apps) {
  const list = document.getElementById('recentList');
  list.innerHTML = apps.map(app => `
    <div class="recent-row">
      <span class="recent-icon">${app.icon}</span>
      <span class="recent-name">${app.name}</span>
    </div>
  `).join('');
}

renderAllApps(ALL_APPS);
renderRecentApps(RECENT_APPS);

// ── Search filter ─────────────────────────────────────────
document.getElementById('launcherSearch').addEventListener('input', function () {
  const q = this.value.toLowerCase().trim();
  if (!q) {
    renderAllApps(ALL_APPS);
  } else {
    renderAllApps(ALL_APPS.filter(a => a.name.toLowerCase().includes(q)));
  }
});

// ── Launcher toggle ───────────────────────────────────────
const launcher = document.getElementById('launcher');

function openLauncher() {
  launcher.classList.add('open');
  setTimeout(() => document.getElementById('launcherSearch').focus(), 50);
}

function closeLauncher() {
  launcher.classList.remove('open');
  document.getElementById('launcherSearch').value = '';
  renderAllApps(ALL_APPS);
}

document.getElementById('launchpadBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  launcher.classList.contains('open') ? closeLauncher() : openLauncher();
});

document.getElementById('desktop').addEventListener('click', closeLauncher);
launcher.addEventListener('click', (e) => {
  if (e.target === launcher) closeLauncher();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLauncher();
});

// ── Dock magnification ────────────────────────────────────
const dock = document.getElementById('dock');
const dockItems = dock.querySelectorAll('.dock-item');

dock.addEventListener('mousemove', (e) => {
  const dockRect = dock.getBoundingClientRect();
  const mouseX = e.clientX;

  dockItems.forEach(item => {
    const icon = item.querySelector('.dock-icon');
    if (!icon || item.classList.contains('dock-divider')) return;
    const itemRect = item.getBoundingClientRect();
    const itemCenterX = itemRect.left + itemRect.width / 2;
    const dist = Math.abs(mouseX - itemCenterX);
    const maxDist = 120;
    const maxScale = 1.5;
    const maxLift = 14;

    if (dist < maxDist) {
      const factor = 1 - dist / maxDist;
      const scale = 1 + (maxScale - 1) * factor;
      const lift = maxLift * factor;
      icon.style.transform = `translateY(-${lift}px) scale(${scale})`;
    } else {
      icon.style.transform = '';
    }
  });
});

dock.addEventListener('mouseleave', () => {
  dockItems.forEach(item => {
    const icon = item.querySelector('.dock-icon');
    if (icon) icon.style.transform = '';
  });
});

// ── Dock item click bounce ────────────────────────────────
dockItems.forEach(item => {
  item.addEventListener('click', () => {
    const icon = item.querySelector('.dock-icon');
    if (!icon) return;
    icon.animate([
      { transform: 'translateY(0) scale(1)' },
      { transform: 'translateY(-20px) scale(1.1)' },
      { transform: 'translateY(0) scale(1)' },
    ], { duration: 400, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });

    const dot = item.querySelector('.dock-dot');
    if (dot) dot.classList.add('active');
  });
});
