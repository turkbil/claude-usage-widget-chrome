import { defaultPrefs, getPrefs, setPrefs } from './prefs.js';

const i18n = (k) => chrome.i18n.getMessage(k) || k;

// Only the weekly-% metric actually drives the toolbar icon (see icon-draw.js,
// which reads just weeklyPctMode + weeklyPctColor). The other three metric rows
// wrote prefs that nothing ever read — clicking them did nothing visible — so
// they were removed.
const METRICS = [
  { key: 'weeklyPctMode',    label: 'metric_weekly_pct',  colorKey: 'weeklyPctColor'    },
];
const PALETTE = ['#d68c45','#5dc97f','#d4c25a','#d6645a','#a87fd6','#7fb8b8','#f4eee3','#8a8378'];
const PRESET_EMOJIS = ['🤖','🧠','⚡','✨','◉','●','▲','◐'];
const REFRESH_OPTS = [
  { sec: 30,  key: 'refresh_30s'  },
  { sec: 60,  key: 'refresh_1m'   },
  { sec: 300, key: 'refresh_5m'   },
  { sec: 600, key: 'refresh_10m'  },
];

document.addEventListener('DOMContentLoaded', async () => {
  // Localize static text
  document.title = i18n('settings_title');
  document.getElementById('title').textContent = i18n('settings_title');
  document.getElementById('titleContentLabel').textContent = i18n('menu_title_content');
  document.getElementById('iconLabel').textContent = i18n('menu_icon');
  document.getElementById('iconCustomLabel').textContent = i18n('icon_custom');
  document.getElementById('iconDonutLabel').textContent  = i18n('icon_donut');
  document.getElementById('iconNoneLabel').textContent   = i18n('icon_none');
  document.getElementById('refreshLabel').textContent    = i18n('menu_refresh_interval');
  document.getElementById('notificationsLabel').textContent = i18n('menu_notifications');
  document.getElementById('notifEnableLabel').textContent = i18n('notifications_enable');
  document.getElementById('warnLabel').textContent       = i18n('notifications_warn');
  document.getElementById('alertLabel').textContent      = i18n('notifications_alert');
  document.getElementById('criticalLabel').textContent   = i18n('notifications_critical');

  const prefs = await getPrefs();
  renderTitleRows(prefs);
  renderIconSection(prefs);
  renderRefreshSection(prefs);
  renderNotificationsSection(prefs);
});

function renderTitleRows(prefs) {
  const container = document.getElementById('titleRows');
  container.innerHTML = '';
  for (const m of METRICS) {
    const row = document.createElement('div');
    row.className = 'title-row';
    row.innerHTML = `
      <div class="title-row-top">
        <span class="title-row-name">${i18n(m.label)}</span>
        <div class="title-row-modes" data-key="${m.key}">
          <button data-mode="hidden">${i18n('mode_hidden')}</button>
          <button data-mode="text">${i18n('mode_text')}</button>
          <button data-mode="donut">${i18n('mode_donut')}</button>
        </div>
      </div>
      <div class="title-row-colors" data-color-key="${m.colorKey}"></div>
    `;
    container.appendChild(row);

    // Wire mode buttons
    const modes = row.querySelectorAll('.title-row-modes button');
    modes.forEach(btn => {
      if (btn.dataset.mode === prefs[m.key]) btn.classList.add('active');
      btn.addEventListener('click', async () => {
        modes.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        await commit({ [m.key]: btn.dataset.mode });
        // Show/hide colors based on new mode
        const colors = row.querySelector('.title-row-colors');
        colors.style.display = btn.dataset.mode === 'donut' ? '' : 'none';
      });
    });

    // Wire color swatches
    const colorsEl = row.querySelector('.title-row-colors');
    for (const hex of PALETTE) {
      const sw = document.createElement('div');
      sw.className = 'swatch';
      sw.style.background = hex;
      if (prefs[m.colorKey] === hex) sw.classList.add('selected');
      sw.addEventListener('click', async () => {
        colorsEl.querySelectorAll('.swatch').forEach(s => s.classList.remove('selected'));
        sw.classList.add('selected');
        await commit({ [m.colorKey]: hex });
      });
      colorsEl.appendChild(sw);
    }
    colorsEl.style.display = prefs[m.key] === 'donut' ? '' : 'none';
  }
}

function renderIconSection(prefs) {
  const grid = document.getElementById('emojiGrid');
  grid.innerHTML = '';
  for (const e of PRESET_EMOJIS) {
    const btn = document.createElement('button');
    btn.textContent = e;
    if (prefs.iconType === 'emoji' && prefs.iconValue === e) btn.classList.add('selected');
    btn.addEventListener('click', async () => {
      grid.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      // Picking an emoji clears the other (radio-based) icon choices.
      document.querySelectorAll('input[name="iconType"]').forEach(r => r.checked = false);
      await commit({ iconType: 'emoji', iconValue: e });
    });
    grid.appendChild(btn);
  }

  // Custom emoji input
  const customField = document.getElementById('customEmoji');
  customField.value = prefs.iconType === 'custom' ? prefs.iconValue : '';
  customField.addEventListener('input', async () => {
    const v = customField.value.trim();
    if (v) await commit({ iconType: 'custom', iconValue: v });
  });
  customField.addEventListener('focus', () => {
    document.querySelector('input[name="iconType"][value="custom"]').checked = true;
  });

  // Radio buttons for non-emoji types
  document.querySelector('input[name="iconType"][value="custom"]').checked = prefs.iconType === 'custom';
  document.querySelector('input[name="iconType"][value="donut"]').checked  = prefs.iconType === 'donut';
  document.querySelector('input[name="iconType"][value="none"]').checked   = prefs.iconType === 'none';

  document.querySelectorAll('input[name="iconType"]').forEach(r => {
    r.addEventListener('change', async () => {
      // Choosing a radio option clears any highlighted preset emoji.
      grid.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
      if (r.value === 'donut') await commit({ iconType: 'donut', iconValue: '' });
      else if (r.value === 'none') await commit({ iconType: 'none', iconValue: '' });
      else if (r.value === 'custom') await commit({ iconType: 'custom', iconValue: customField.value.trim() || '🪐' });
    });
  });
}

function renderRefreshSection(prefs) {
  const container = document.getElementById('refreshRadios');
  container.innerHTML = '';
  for (const o of REFRESH_OPTS) {
    const lbl = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio'; input.name = 'refresh'; input.value = String(o.sec);
    input.checked = prefs.pollIntervalSec === o.sec;
    input.addEventListener('change', async () => {
      if (input.checked) await commit({ pollIntervalSec: o.sec });
    });
    const span = document.createElement('span');
    span.textContent = ' ' + i18n(o.key);
    lbl.append(input, span);
    container.appendChild(lbl);
  }
}

function renderNotificationsSection(prefs) {
  document.getElementById('notifEnabled').checked = prefs.notificationsEnabled;
  document.getElementById('notifEnabled').addEventListener('change', async (e) => {
    await commit({ notificationsEnabled: e.target.checked });
  });

  bindSlider('warn', prefs.warnThreshold);
  bindSlider('alert', prefs.alertThreshold);
  bindSlider('critical', prefs.criticalThreshold);
}

function bindSlider(name, value) {
  const slider = document.getElementById(`${name}Slider`);
  const label  = document.getElementById(`${name}Value`);
  slider.value = value;
  label.textContent = `%${value}`;
  slider.addEventListener('input', () => {
    label.textContent = `%${slider.value}`;
  });
  slider.addEventListener('change', async () => {
    const key = name === 'warn' ? 'warnThreshold'
              : name === 'alert' ? 'alertThreshold'
              : 'criticalThreshold';
    await commit({ [key]: parseInt(slider.value, 10) });
  });
}

async function commit(patch) {
  await setPrefs(patch);
  try { chrome.runtime.sendMessage({ type: 'prefs-changed' }); } catch {}
}
