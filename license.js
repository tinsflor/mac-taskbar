// License + free-trial logic (main process).
//
// Uses Lemon Squeezy's license API — your app validates keys directly against
// their servers, so you don't need to run any backend. When you set up your
// product in Lemon Squeezy, turn on "License keys", then put your product's
// checkout URL in BUY_URL below.

const fs = require('fs');
const path = require('path');
const os = require('os');
const { app, shell } = require('electron');

// ─── CONFIG — edit these two when your Lemon Squeezy product is ready ───
const TRIAL_DAYS = 14;
const BUY_URL = 'https://YOUR-STORE.lemonsqueezy.com/'; // TODO: your checkout link
// ───────────────────────────────────────────────────────────────────────

function stateFile() {
  return path.join(app.getPath('userData'), 'license.json');
}

function loadState() {
  try { return JSON.parse(fs.readFileSync(stateFile(), 'utf8')); }
  catch (e) { return {}; }
}

function saveState(s) {
  try { fs.writeFileSync(stateFile(), JSON.stringify(s)); } catch (e) {}
}

function ensureTrialStarted() {
  const s = loadState();
  if (!s.trialStart) { s.trialStart = Date.now(); saveState(s); }
  return s;
}

function getStatus() {
  const s = ensureTrialStarted();
  if (s.licensed && s.licenseKey) {
    return { state: 'licensed', key: s.licenseKey };
  }
  const elapsedDays = (Date.now() - s.trialStart) / (1000 * 60 * 60 * 24);
  const daysLeft = Math.max(0, Math.ceil(TRIAL_DAYS - elapsedDays));
  if (daysLeft > 0) return { state: 'trial', daysLeft, trialDays: TRIAL_DAYS };
  return { state: 'expired', daysLeft: 0 };
}

async function activate(rawKey) {
  const key = (rawKey || '').trim();
  if (!key) return { ok: false, error: 'Please enter a license key.' };
  try {
    const res = await fetch('https://api.lemonsqueezy.com/v1/licenses/activate', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ license_key: key, instance_name: os.hostname() }).toString(),
    });
    const data = await res.json().catch(() => ({}));
    if (data && data.activated) {
      const s = loadState();
      s.licensed = true;
      s.licenseKey = key;
      s.instanceId = data.instance && data.instance.id;
      saveState(s);
      return { ok: true };
    }
    return { ok: false, error: (data && data.error) || 'That license key is not valid.' };
  } catch (e) {
    return { ok: false, error: 'Could not reach the license server. Check your internet connection.' };
  }
}

function deactivate() {
  const s = loadState();
  delete s.licensed;
  delete s.licenseKey;
  delete s.instanceId;
  saveState(s);
}

function openBuyPage() {
  shell.openExternal(BUY_URL);
}

module.exports = { getStatus, activate, deactivate, openBuyPage, BUY_URL, TRIAL_DAYS };
