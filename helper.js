// ==UserScript==
// @name         SeenJeem Quick Create
// @version      2.1
// @description  Hidden create+login for SeenJeem
// @match        https://seenjeemkw.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  var API = 'https://api.seenjeemkw.com/api';
  var COUNTRY = '653c8fff18da2c44f651f323';
  var busy = false;
  var open = false;

  function rand(n) {
    var c = 'abcdefghijklmnopqrstuvwxyz0123456789', s = '';
    for (var i = 0; i < (n || 8); i++) s += c[Math.floor(Math.random() * c.length)];
    return s;
  }
  function phone() {
    return ['5', '6', '9'][Math.floor(Math.random() * 3)] +
      String(Math.floor(Math.random() * 1e7)).padStart(7, '0');
  }
  function dob() {
    var y = 1988 + Math.floor(Math.random() * 15);
    var m = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0');
    var d = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }
  function pass() { return 'P' + rand(8) + '1!'; }

  function persist(token, user) {
    try {
      localStorage.setItem('rememberMe', 'true');
      localStorage.setItem('auth', JSON.stringify({
        state: {
          Isdark: false, congratsMuted: false, feudSoundMuted: false,
          user: user || null, token: token || null,
          game: null, ramadanTab: null, currentQuestion: null,
          createGameData: null, gameOverData: null, timer: false
        },
        version: 0
      }));
    } catch (e) {}
  }

  function setStatus(t, ok) {
    var el = document.getElementById('sj-st');
    if (!el) return;
    el.textContent = t;
    el.style.color = ok === false ? '#ff6666' : ok === true ? '#00ff00' : '#ffff00';
  }

  async function run() {
    if (busy) return;
    busy = true;
    setStatus('Creating…');

    var email = 'sj_' + Date.now().toString(36) + '_' + rand(5) + '@gmail.com';
    var password = pass();
    var body = {
      email: email,
      password: password,
      confirm_password: password,
      firstName: 'User',
      lastName: 'Test',
      phoneNumber: phone(),
      phoneCode: '+965',
      deviceType: 'WEB',
      deviceToken: 'web_' + Date.now() + '_' + rand(10),
      dateOfBirth: dob(),
      countryId: COUNTRY
    };

    try {
      var reg = await fetch(API + '/user/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(body)
      }).then(function (r) { return r.json(); });

      if (!reg.status) {
        setStatus('Fail: ' + (reg.message || 'error'), false);
        busy = false;
        return;
      }

      setStatus('Logging in…');
      var token = reg.accessToken;
      var user = reg.data;

      try {
        var login = await fetch(API + '/user/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            email: email,
            password: password,
            deviceType: 'WEB',
            deviceToken: 'web_' + Date.now()
          })
        }).then(function (r) { return r.json(); });
        if (login.status) {
          token = login.accessToken || token;
          user = login.data || user;
        }
      } catch (e) {}

      persist(token, user);
      setStatus('OK', true);
      setTimeout(function () {
        location.href = 'https://seenjeemkw.com/new-home';
      }, 400);
    } catch (e) {
      setStatus('Error: ' + e.message, false);
      busy = false;
    }
  }

  function clampPanel(panel) {
    if (!panel || panel.style.display === 'none') return;
    var w = panel.offsetWidth;
    var h = panel.offsetHeight;
    if (!w || !h) return;
    var left = parseFloat(panel.style.left);
    var top = parseFloat(panel.style.top);
    if (!isFinite(left) || !isFinite(top)) {
      var rect = panel.getBoundingClientRect();
      left = rect.left;
      top = rect.top;
    }
    var maxLeft = Math.max(0, window.innerWidth - w - 4);
    var maxTop = Math.max(0, window.innerHeight - h - 4);
    panel.style.left = Math.min(Math.max(4, left), maxLeft) + 'px';
    panel.style.top = Math.min(Math.max(4, top), maxTop) + 'px';
    panel.style.right = 'auto';
  }

  function restorePos(panel) {
    try {
      var p = JSON.parse(localStorage.getItem('sj-pos') || 'null');
      if (p && isFinite(p.l) && isFinite(p.t)) {
        panel.style.left = p.l + 'px';
        panel.style.top = p.t + 'px';
        panel.style.right = 'auto';
      }
    } catch (e) {}
  }

  function savePos(panel) {
    try {
      localStorage.setItem('sj-pos', JSON.stringify({
        l: parseFloat(panel.style.left),
        t: parseFloat(panel.style.top)
      }));
    } catch (e) {}
  }

  function makeDraggable(panel, handle) {
    var dragging = false;
    var startX = 0, startY = 0, startLeft = 0, startTop = 0;

    function point(ev) {
      return ev.touches && ev.touches.length ? ev.touches[0] : ev;
    }

    function down(ev) {
      if (dragging) return;
      if (ev.button !== undefined && ev.button !== 0) return;
      var p = point(ev);
      var r = panel.getBoundingClientRect();
      startX = p.clientX;
      startY = p.clientY;
      startLeft = r.left;
      startTop = r.top;
      panel.style.left = r.left + 'px';
      panel.style.top = r.top + 'px';
      panel.style.right = 'auto';
      dragging = true;
      if (ev.pointerId !== undefined && handle.setPointerCapture) {
        try { handle.setPointerCapture(ev.pointerId); } catch (e) {}
      }
      ev.preventDefault();
    }

    function move(ev) {
      if (!dragging) return;
      var p = point(ev);
      var left = startLeft + p.clientX - startX;
      var top = startTop + p.clientY - startY;
      var maxLeft = Math.max(0, window.innerWidth - panel.offsetWidth - 4);
      var maxTop = Math.max(0, window.innerHeight - panel.offsetHeight - 4);
      panel.style.left = Math.min(Math.max(4, left), maxLeft) + 'px';
      panel.style.top = Math.min(Math.max(4, top), maxTop) + 'px';
      ev.preventDefault();
    }

    function up(ev) {
      if (!dragging) return;
      dragging = false;
      if (ev && ev.pointerId !== undefined && handle.releasePointerCapture) {
        try { handle.releasePointerCapture(ev.pointerId); } catch (e) {}
      }
      savePos(panel);
    }

    if (window.PointerEvent) {
      handle.addEventListener('pointerdown', down);
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
      handle.addEventListener('pointercancel', up);
    } else {
      handle.addEventListener('touchstart', down, { passive: false });
      handle.addEventListener('touchmove', move, { passive: false });
      handle.addEventListener('touchend', up);
      handle.addEventListener('touchcancel', up);
      handle.addEventListener('mousedown', down);
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    }

    window.addEventListener('resize', function () { clampPanel(panel); });
  }

  function toggle(show) {
    open = !!show;
    var panel = document.getElementById('sj-panel');
    var tab = document.getElementById('sj-tab');
    if (!panel || !tab) return;
    panel.style.display = open ? 'block' : 'none';
    tab.style.display = open ? 'none' : 'flex';
    if (open) {
      clampPanel(panel);
    } else {
      tab.style.opacity = '0.4';
    }
  }

  function ui() {
    if (document.getElementById('sj-root')) return;
    var host = document.body;
    if (!host) return;

    var root = document.createElement('div');
    root.id = 'sj-root';

    var tab = document.createElement('button');
    tab.id = 'sj-tab';
    tab.type = 'button';
    tab.textContent = '+';
    tab.title = 'SeenJeem';
    tab.setAttribute('aria-label', 'Open SeenJeem helper');
    tab.style.cssText = [
      'position:fixed',
      'right:0',
      'top:38%',
      'z-index:2147483647',
      'width:22px',
      'height:40px',
      'border:none',
      'border-radius:7px 0 0 7px',
      'background:#00c853',
      'color:#04120a',
      'font-weight:800',
      'font-size:16px',
      'cursor:pointer',
      'opacity:0.4',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'padding:0',
      'box-shadow:0 2px 8px rgba(0,0,0,.18)',
      'transition:opacity .2s',
      'touch-action:manipulation'
    ].join(';');
    tab.onmouseenter = function () { tab.style.opacity = '0.9'; };
    tab.onmouseleave = function () { if (!open) tab.style.opacity = '0.4'; };
    tab.onclick = function () { toggle(true); };

    var panel = document.createElement('div');
    panel.id = 'sj-panel';
    panel.style.cssText = [
      'position:fixed',
      'right:10px',
      'top:30%',
      'z-index:2147483647',
      'width:188px',
      'max-height:calc(100vh - 16px)',
      'overflow:auto',
      'background:rgba(15,20,35,.94)',
      'border:1px solid rgba(0,255,120,.35)',
      'border-radius:10px',
      'padding:8px 10px 10px',
      'font-family:system-ui,sans-serif',
      'box-shadow:0 6px 22px rgba(0,0,0,.35)',
      'display:none',
      'opacity:.92',
      'transition:opacity .2s',
      'box-sizing:border-box'
    ].join(';');
    panel.onmouseenter = function () { panel.style.opacity = '1'; };
    panel.onmouseleave = function () { panel.style.opacity = '0.92'; };
    panel.innerHTML =
      '<div id="sj-drag" title="Drag to move" aria-label="Drag to move" style="height:14px;margin:-2px 0 6px;display:flex;align-items:center;justify-content:center;cursor:move;user-select:none;-webkit-user-select:none;touch-action:none;"><span style="display:block;width:26px;height:3px;border-radius:2px;background:#4b5563;pointer-events:none;"></span></div>' +
      '<button id="sj-go" type="button" style="width:100%;padding:10px;background:#00d46a;color:#04120a;border:none;border-radius:7px;font-weight:700;font-size:13px;cursor:pointer;">Create + Login</button>' +
      '<div id="sj-wm" style="margin:4px 2px 0;font-size:9px;line-height:1.2;color:#6b7280;text-align:right;letter-spacing:.2px;user-select:none;-webkit-user-select:none;">@B4llawi</div>' +
      '<div id="sj-st" style="margin-top:6px;font-size:10px;color:#aaa;text-align:center;min-height:14px;">Ready</div>' +
      '<button id="sj-hide" type="button" style="width:100%;margin-top:6px;padding:7px;background:transparent;color:#6b7280;border:1px solid #2a3348;border-radius:6px;font-size:11px;cursor:pointer;">Hide</button>';

    root.appendChild(tab);
    root.appendChild(panel);
    host.appendChild(root);

    restorePos(panel);
    makeDraggable(panel, document.getElementById('sj-drag'));
    document.getElementById('sj-go').onclick = run;
    document.getElementById('sj-hide').onclick = function () { toggle(false); };
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') toggle(false);
    });
  }

  if (document.body) ui();
  else document.addEventListener('DOMContentLoaded', ui);
  setTimeout(ui, 600);
})();