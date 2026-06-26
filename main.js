const { app, BrowserWindow, screen, ipcMain, Menu } = require('electron');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const license = require('./license');

let licenseWin = null;
function openLicenseWindow() {
  if (licenseWin && !licenseWin.isDestroyed()) { licenseWin.focus(); return; }
  licenseWin = new BrowserWindow({
    width: 440,
    height: 460,
    resizable: false,
    title: 'Taskbar — License',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  licenseWin.loadFile('license.html');
  licenseWin.on('closed', () => { licenseWin = null; });
}

let win;
const BAR_HEIGHT = 37;

function getRunningApps() {
  try {
    const result = execSync(
      `osascript -e 'tell application "System Events" to get name of every process whose background only is false'`,
      { timeout: 3000 }
    ).toString().trim();
    if (result) return result.split(', ').filter(n => n && n !== 'Taskbar' && n !== 'Electron');
  } catch (e) {}

  try {
    const result = execSync('lsappinfo list 2>/dev/null', { timeout: 3000 }).toString();
    const lines = result.split('\n');
    const names = [];
    let current = null;
    for (const line of lines) {
      const nameMatch = line.match(/^\s*\d+\)\s+"([^"]+)"/);
      if (nameMatch) { current = nameMatch[1]; continue; }
      const typeMatch = line.match(/type="([^"]+)"/);
      if (typeMatch && current) {
        if (typeMatch[1] === 'Foreground') names.push(current);
        current = null;
      }
    }
    return [...new Set(names)].filter(n => !['Taskbar', 'Electron'].includes(n));
  } catch (e) {}

  return [];
}

function activateApp(name) {
  // `open -a` brings an app to the front and needs NO Automation permission,
  // so it works on any Mac without the user granting anything.
  try {
    execSync(`open -a "${name.replace(/"/g, '\\"')}"`, { timeout: 3000 });
    return;
  } catch (e) {}
  // Fallback (needs Automation permission)
  try {
    execSync(`osascript -e 'tell application "${name.replace(/"/g, '\\"')}" to activate'`, { timeout: 2000 });
  } catch (e) {}
}

function quitApp(name) {
  try {
    execSync(`osascript -e 'tell application "${name.replace(/"/g, '\\"')}" to quit'`, { timeout: 3000 });
  } catch (e) {}
}

function openApp(name) {
  try {
    execSync(`open -a "${name.replace(/"/g, '\\"')}"`, { timeout: 3000 });
  } catch (e) {}
}

function relaunchApp(name) {
  quitApp(name);
  setTimeout(() => openApp(name), 1500);
}

// Nudge the renderer to re-poll running apps shortly after an action
function nudge() {
  setTimeout(() => { if (win && !win.isDestroyed()) win.webContents.send('refresh'); }, 900);
}

function showAppMenu(info) {
  const { name, isPinned, isRunning } = info;
  const template = [];

  if (isRunning) {
    template.push({ label: `Bring "${name}" to Front`, click: () => activateApp(name) });
    template.push({ label: 'Relaunch', click: () => { relaunchApp(name); nudge(); } });
    template.push({ label: 'Quit', click: () => { quitApp(name); nudge(); } });
  } else {
    template.push({ label: `Open "${name}"`, click: () => { openApp(name); nudge(); } });
  }

  template.push({ type: 'separator' });
  if (isPinned) {
    template.push({ label: 'Unpin from Taskbar', click: () => win.webContents.send('menu-unpin', name) });
  } else {
    template.push({ label: 'Pin to Taskbar', click: () => win.webContents.send('menu-pin', name) });
  }

  Menu.buildFromTemplate(template).popup({ window: win });
}

// Cache of name -> data URL (or null if unavailable)
const iconCache = {};

function appPathFor(name) {
  try {
    const p = execSync(
      `osascript -e 'POSIX path of (path to application "${name.replace(/"/g, '\\"')}")'`,
      { timeout: 3000 }
    ).toString().trim();
    return p || null;
  } catch (e) { return null; }
}

// Find the app's .icns icon file inside its bundle.
function findIcns(appPath) {
  const resDir = path.join(appPath, 'Contents', 'Resources');
  // Prefer the icon named in Info.plist (CFBundleIconFile)
  try {
    let iconFile = execSync(
      `defaults read "${path.join(appPath, 'Contents', 'Info')}" CFBundleIconFile 2>/dev/null`,
      { timeout: 2000 }
    ).toString().trim();
    if (iconFile) {
      if (!iconFile.toLowerCase().endsWith('.icns')) iconFile += '.icns';
      const p = path.join(resDir, iconFile);
      if (fs.existsSync(p)) return p;
    }
  } catch (e) {}
  // Fall back to the first .icns in Resources
  try {
    if (fs.existsSync(resDir)) {
      const f = fs.readdirSync(resDir).find(x => x.toLowerCase().endsWith('.icns'));
      if (f) return path.join(resDir, f);
    }
  } catch (e) {}
  return null;
}

// A small JavaScript-for-Automation script that asks macOS (NSWorkspace) for an
// app's rendered icon and writes it as a 64px PNG. Works for every app, including
// ones that store their icon in an asset catalog (Spotify, TV, Music, etc.).
const JXA_ICON_SCRIPT = `
ObjC.import('Cocoa');
function run(argv) {
  var appPath = argv[0], outPath = argv[1];
  var icon = $.NSWorkspace.sharedWorkspace.iconForFile(appPath);
  if (!icon) return;
  var size = $.NSMakeSize(64, 64);
  var out = $.NSImage.alloc.initWithSize(size);
  out.lockFocus;
  icon.drawInRectFromRectOperationFraction($.NSMakeRect(0, 0, 64, 64), $.NSZeroRect, 2, 1.0);
  out.unlockFocus;
  var tiff = out.TIFFRepresentation;
  var rep = $.NSBitmapImageRep.imageRepWithData(tiff);
  var png = rep.representationUsingTypeProperties(4, $());
  png.writeToFileAtomically(outPath, true);
}
`;

let jxaScriptPath = null;
function ensureJxaScript() {
  if (jxaScriptPath && fs.existsSync(jxaScriptPath)) return jxaScriptPath;
  jxaScriptPath = path.join(os.tmpdir(), 'taskbar_icon.jxa.js');
  fs.writeFileSync(jxaScriptPath, JXA_ICON_SCRIPT);
  return jxaScriptPath;
}

function readPngAsDataUrl(file) {
  if (fs.existsSync(file)) {
    const buf = fs.readFileSync(file);
    try { fs.unlinkSync(file); } catch (e) {}
    if (buf.length > 0) return 'data:image/png;base64,' + buf.toString('base64');
  }
  return null;
}

// Get an app's real icon as a PNG data URL. Tries NSWorkspace first (universal),
// then falls back to extracting a .icns with sips. Caches per name.
function getAppIcon(name) {
  if (Object.prototype.hasOwnProperty.call(iconCache, name)) return iconCache[name];

  let result = null;
  const appPath = appPathFor(name);
  if (appPath) {
    const safePath = appPath.replace(/"/g, '\\"');

    // 1) NSWorkspace via JXA — works for asset-catalog icons too
    try {
      const out = path.join(os.tmpdir(), `tbicon_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
      execSync(
        `osascript -l JavaScript "${ensureJxaScript()}" "${safePath}" "${out}"`,
        { timeout: 6000, stdio: 'ignore' }
      );
      result = readPngAsDataUrl(out);
    } catch (e) {}

    // 2) Fallback: extract a .icns and convert with sips
    if (!result) {
      try {
        const icns = findIcns(appPath);
        if (icns) {
          const out = path.join(os.tmpdir(), `tbicon_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
          execSync(
            `sips -s format png "${icns.replace(/"/g, '\\"')}" --out "${out}" -Z 64`,
            { timeout: 5000, stdio: 'ignore' }
          );
          result = readPngAsDataUrl(out);
        }
      } catch (e) {}
    }
  }

  iconCache[name] = result;
  return result;
}

function barBounds() {
  // Use workArea so the bar sits in the usable screen region (above the Dock),
  // where it is guaranteed to be visible.
  const wa = screen.getPrimaryDisplay().workArea;
  return {
    x: wa.x,
    y: wa.y + wa.height - BAR_HEIGHT,
    width: wa.width,
    height: BAR_HEIGHT,
  };
}

app.whenReady().then(() => {
  win = new BrowserWindow({
    ...barBounds(),
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    backgroundColor: '#d2d2d2',
    alwaysOnTop: true,            // default 'floating' level — renders reliably
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadFile('index.html');

  function reposition() { win.setBounds(barBounds()); }
  screen.on('display-metrics-changed', reposition);
  screen.on('display-added', reposition);
  screen.on('display-removed', reposition);

  ipcMain.handle('get-apps', () => getRunningApps());
  ipcMain.handle('get-icon', (_, name) => getAppIcon(name));
  ipcMain.on('activate-app', (_, name) => activateApp(name));
  ipcMain.on('quit-app', (_, name) => quitApp(name));
  ipcMain.on('show-app-menu', (_, info) => showAppMenu(info));
  ipcMain.handle('license:status', () => license.getStatus());
  ipcMain.handle('license:activate', (_, key) => license.activate(key));
  ipcMain.on('license:buy', () => license.openBuyPage());
  ipcMain.on('license:open', () => openLicenseWindow());

  // If the trial has already expired on launch, prompt for a license
  if (license.getStatus().state === 'expired') openLicenseWindow();
  ipcMain.on('mouse-enter', () => {});
  ipcMain.on('mouse-leave', () => {});
});

app.on('window-all-closed', () => app.quit());
