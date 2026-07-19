// ╔══════════════════════════════════════════════════════════╗
// ║  AUTHOR: Abdullah Al Mamun                             ║
// ║  GITHUB: @A2MBD3                                       ║
// ║  NEBULA DYNAMIC (USERDATA UPGRADE)                     ║
// ║  FILE: main.js                                         ║
// ║  CSS: fox.css (loaded dynamically)                     ║
// ╚══════════════════════════════════════════════════════════╝

(function () {
  "use strict";

  // ═══════════════════ CSS LOADER ═══════════════════
  function loadCSS(url) {
    if (document.getElementById('nb-fox-css')) return;
    const link = document.createElement('link');
    link.id = 'nb-fox-css';
    link.rel = 'stylesheet';
    link.href = url;
    link.onerror = () => {
      DBG.error('CSS', 'Failed to load fox.css, injecting inline styles...');
      injectStylesFallback();
    };
    document.head.appendChild(link);
    DBG.log('CSS', 'Loading from: ' + url);
  }

  function injectStylesFallback() {
    if (document.getElementById('nb-dynamic-styles')) return;
    const st = document.createElement("style");
    st.id = 'nb-dynamic-styles';
    st.textContent = `/* Fallback styles would go here */`;
    document.head.appendChild(st);
  }

  // ═══════════════════ APP INFO ═══════════════════
  const APP = { 
    NAME: "NEBULA", 
    VER: "24.2", 
    get FULL() { return `${this.NAME} v${this.VER}`; } 
  };

  // ═══════════════════ DOM HELPERS ═══════════════════
  const DOM = (id) => document.getElementById(id);
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const EL = (tag, cls = '', html = '') => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html) e.innerHTML = html;
    return e;
  };

  // ═══════════════════ DEBUG LOGGER ═══════════════════
  const DBG = {
    _logs: [],
    _add(tag, msg, data, isError = false) {
      const entry = {
        time: new Date().toISOString().split('T')[1].split('.')[0],
        tag, msg,
        data: data || null,
        error: isError
      };
      this._logs.push(entry);
      if (this._logs.length > 500) this._logs.shift();
      console[isError ? 'error' : 'log'](`[${entry.time}] [${tag}] ${msg}`, data || '');
    },
    log(tag, msg, data) { this._add(tag, msg, data, false); },
    error(tag, msg, data) { this._add(tag, msg, data, true); },
    getLogs(count) { return this._logs.slice(-(count || 50)); },
    dump() { console.table(this._logs); }
  };

  // ═══════════════════ CONSTANTS ═══════════════════
  const CREDITS = {
    AUTHOR: '@a2mbd3',
    SITE: 'a2mbd3.paged.dev',
    TEAM: '© Team CRX',
    TEAM_URL: 'https://crxx.netlify.app',
    get FOOTER() { return `${this.TEAM} | ${APP.FULL} | 📳 Shake to change track 🎵`; }
  };

  const DIRECT_TARGETS = {
    'aincrad': { target: 'aincrad', name: 'Aincrad', apiType: '2', module: 'standard' },
    'aincrad-proxy': { target: 'aincrad-proxy', name: 'AINCRAD PROXY', apiType: '1', module: 'standard' },
    'vipteam': { target: 'vipteam', name: 'VIPTEAM', apiType: 'vp', module: 'vipteam' },
    'powercheats': { target: 'powercheats', name: 'POWERCHEATS', apiType: 'vp', module: 'powercheats' },
    'universal-vplink': { target: 'universal-vplink', name: 'UNIVERSAL VPLINK.IN', apiType: 'vp', module: 'universal-vplink' }
  };

  // ═══════════════════ INITIAL STATE ═══════════════════
  let USER_ID = 0;
  let directTarget = null;

  if (typeof window.ABDULLAH_BOOKMARK_LOAD !== "undefined") {
    const raw = window.ABDULLAH_BOOKMARK_LOAD;
    if (typeof raw === 'string') {
      const targetKey = raw.trim().toLowerCase();
      if (DIRECT_TARGETS[targetKey]) {
        directTarget = DIRECT_TARGETS[targetKey];
        USER_ID = 0;
        DBG.log('INIT', `Direct target: ${targetKey}, USER_ID=0`);
      } else {
        const parts = raw.split('/');
        const parsed = parseInt(parts[parts.length - 1]);
        USER_ID = !isNaN(parsed) ? parsed : 0;
        DBG.log('INIT', `USER_ID from string: ${USER_ID}`);
      }
    } else if (typeof raw === 'number') {
      USER_ID = raw;
      DBG.log('INIT', `USER_ID from number: ${USER_ID}`);
    }
  }
  DBG.log('INIT', `Final USER_ID=${USER_ID}, directTarget=${directTarget?.name || 'none'}`);

  // ═══════════════════ CONFIGURATION ═══════════════════
  const CFG = {
    status: 1,
    musicListUrl: "https://raw.githubusercontent.com/A2MBD3/Aincrad/main/assets/music.txt",
    apiBaseUrl: "https://lol.a2mbd3.workers.dev",
    apiKey: "abdullah",
    totpSecret: "6ZQ4X3VPEK5XG2Q",
    userDataApiUrl: "https://nebula-bot-sa9k.onrender.com/",
    fallbackRedirectUrl: "https://htmlpreview.github.io/?https://raw.githubusercontent.com/A2MBD3/Aincrad/main/index.html",
    timings: {
      init: 10000,
      exploit: 20000,
      min: 25000,
      autoInit: 10000
    },
    corsProxy: "https://api.allorigins.win/raw?url=",
    // CSS file URL - can be changed to any hosting
    cssUrl: "https://raw.githubusercontent.com/DFox404/nb/main/fox.css"
  };

  // ═══════════════════ USER DATA ═══════════════════
  const DEFAULT_USER = {
    id: 0,
    name: "TEAM CRX OFFICIAL",
    password: "0",
    tgChannel: "t.me/HQcrx",
    banned: 0,
    creator: "@a2mbd3",
    chatId: "",
    createdAt: ""
  };
  let USER_DATA = { ...DEFAULT_USER };

  // ═══════════════════ RUNTIME STATE ═══════════════════
  let audioPlayer = null, musicList = [], currentTrackIndex = -1;
  let lastX = null, lastY = null, lastZ = null, shakeTimeout = null;
  let autoInitTimeout = null, banRedirectTimeout = null, isRedirecting = false;
  let exploitProgressRAF = null, logTimers = [], logInterval = null;
  let isLoggingActive = false, fillerLogsScheduled = false;
  let fetchCompleted = false, fetchResult = null, progressCompleted = false;
  let apiResponseCache = null, currentPinCache = '------';
  let fetchStartTime = 0, fetchEndTime = 0, actualProgressTime = 0;
  let selectedTarget = null, selectedTargetName = null, selectedModuleType = null;
  let isRealRedirectUrl = false, logQueue = [];
  let musicAutoPlay = true, musicUserEnabled = false;
  let updateTrackDisplay = function() {};

  // ═══════════════════ TOTP GENERATOR ═══════════════════
  class TOTPGenerator {
    constructor(secret = 'K4XG2ZRGM5TGM3Q') {
      this.secret = secret;
      this.timeStep = 30;
      this.digits = 6;
    }

    _sha1(msg) {
      function rotl(n, s) { return (n << s) | (n >>> (32 - s)); }
      let h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0;
      
      const bits = msg.length * 8;
      msg.push(0x80);
      while (msg.length % 64 !== 56) msg.push(0);
      msg.push(0, 0, 0, 0);
      for (let i = 3; i >= 0; i--) msg.push((bits >>> (i * 8)) & 0xff);
      
      for (let i = 0; i < msg.length; i += 64) {
        const w = [];
        for (let j = 0; j < 16; j++) {
          w[j] = (msg[i + j * 4] << 24) | (msg[i + j * 4 + 1] << 16) | 
                 (msg[i + j * 4 + 2] << 8) | msg[i + j * 4 + 3];
        }
        for (let j = 16; j < 80; j++) {
          w[j] = rotl(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
        }
        
        let a = h0, b = h1, c = h2, d = h3, e = h4;
        for (let j = 0; j < 80; j++) {
          let f, k;
          if (j < 20) { f = (b & c) | ((~b) & d); k = 0x5A827999; }
          else if (j < 40) { f = b ^ c ^ d; k = 0x6ED9EBA1; }
          else if (j < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8F1BBCDC; }
          else { f = b ^ c ^ d; k = 0xCA62C1D6; }
          const temp = (rotl(a, 5) + f + e + k + w[j]) >>> 0;
          e = d; d = c; c = rotl(b, 30); b = a; a = temp;
        }
        h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0;
        h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0;
      }
      
      const result = [];
      [h0, h1, h2, h3, h4].forEach(h => {
        for (let i = 3; i >= 0; i--) result.push((h >>> (i * 8)) & 0xff);
      });
      return result;
    }

    async hmacSha1(key, message) {
      const keyArr = Array.from(key);
      const msgArr = Array.from(new Uint8Array(message));
      const blockSize = 64;
      let k = keyArr.length > blockSize ? this._sha1([...keyArr]) : [...keyArr];
      while (k.length < blockSize) k.push(0);
      const iPad = k.map(b => b ^ 0x36);
      const oPad = k.map(b => b ^ 0x5c);
      const inner = this._sha1([...iPad, ...msgArr]);
      const outer = this._sha1([...oPad, ...inner]);
      return new Uint8Array(outer);
    }

    base32ToHex(base32) {
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
      let bits = '', hex = '';
      base32 = base32.toUpperCase().replace(/=+$/, '');
      for (let i = 0; i < base32.length; i++) {
        const val = alphabet.indexOf(base32.charAt(i));
        if (val === -1) throw new Error('Invalid base32 character');
        bits += val.toString(2).padStart(5, '0');
      }
      for (let i = 0; i + 4 <= bits.length; i += 4) {
        hex += parseInt(bits.substr(i, 4), 2).toString(16);
      }
      return hex;
    }

    async generate(offset = 0) {
      const genStart = performance.now();
      const key = this.base32ToHex(this.secret);
      const epoch = Math.floor(Date.now() / 1000);
      const time = Math.floor(epoch / this.timeStep) + offset;
      
      const msg = new ArrayBuffer(8);
      const view = new DataView(msg);
      view.setUint32(4, time, false);
      
      const hmacKey = new Uint8Array(key.match(/.{2}/g).map(byte => parseInt(byte, 16)));
      const hmacResult = await this.hmacSha1(hmacKey, msg);
      
      const offsetByte = hmacResult[hmacResult.length - 1] & 0xf;
      const binary = ((hmacResult[offsetByte] & 0x7f) << 24) |
                     ((hmacResult[offsetByte + 1] & 0xff) << 16) |
                     ((hmacResult[offsetByte + 2] & 0xff) << 8) |
                     (hmacResult[offsetByte + 3] & 0xff);
      
      const otp = binary % Math.pow(10, this.digits);
      const result = otp.toString().padStart(this.digits, '0');
      
      const genTime = (performance.now() - genStart).toFixed(2);
      DBG.log('TOTP', `PIN: ${result} (${genTime}ms)`);
      
      return result;
    }
  }

  const totp = new TOTPGenerator(CFG.totpSecret);

  // ═══════════════════ UTILITY FUNCTIONS ═══════════════════
  const isMetered = () => {
    if (!navigator.connection) return false;
    const conn = navigator.connection;
    return conn.type === 'cellular' || conn.saveData === true ||
           (conn.effectiveType && ['slow-2g', '2g', '3g'].includes(conn.effectiveType));
  };

  const shouldPlayMusic = () => musicAutoPlay || musicUserEnabled;

  const isValidRedirectUrl = (url) => {
    if (!url || url.includes('t.me/') || url.includes('telegram.me/') || 
        url.includes('telegram.org/') || url === CFG.fallbackRedirectUrl) return false;
    try {
      const p = new URL(url);
      return p.protocol === 'http:' || p.protocol === 'https:';
    } catch { return false; }
  };

  const isTelegramLink = (url) => url && (url.includes('t.me/') || url.includes('telegram.me/'));
  
  const getChannelUrl = () => {
    const c = USER_DATA.tgChannel;
    if (!c || c === "0") return null;
    return c.startsWith("http") ? c : "https://" + c;
  };

  const checkPassword = (input) => {
    if (USER_DATA.password === "0" || !USER_DATA.password) return true;
    return input.replace(/\s/g, '').toLowerCase() === USER_DATA.password.replace(/\s/g, '').toLowerCase();
  };

  const needPassword = () => USER_DATA.password !== "0" && USER_DATA.password !== 0 && USER_DATA.password !== "";
  const hasChannel = () => USER_DATA.tgChannel !== "0" && USER_DATA.tgChannel !== 0 && USER_DATA.tgChannel !== "";
  const isBannedUser = () => USER_DATA.banned === 1 || USER_DATA.banned === "1";
  const isSuspendedUser = () => USER_DATA.banned === 2 || USER_DATA.banned === "2";

  // ═══════════════════ AUDIO FUNCTIONS ═══════════════════
  function getRandomMusic() {
    if (!musicList.length) return null;
    let i;
    if (musicList.length === 1) i = 0;
    else {
      do { i = Math.floor(Math.random() * musicList.length); }
      while (i === currentTrackIndex && musicList.length > 1);
    }
    currentTrackIndex = i;
    return musicList[i];
  }

  function initAudio() {
    if (!shouldPlayMusic() || !musicList.length) {
      updateTrackDisplay();
      return;
    }
    const url = getRandomMusic();
    if (!url) return;
    
    if (audioPlayer) {
      try { audioPlayer.pause(); audioPlayer.onended = null; audioPlayer.onerror = null; }
      catch (e) {}
    }
    
    audioPlayer = new Audio(url);
    audioPlayer.loop = false;
    audioPlayer.volume = 0.35;
    audioPlayer.preload = "auto";
    audioPlayer.onended = () => nextTrackAuto();
    audioPlayer.onerror = () => {
      if (musicList[currentTrackIndex]) musicList.splice(currentTrackIndex, 1);
      setTimeout(() => { if (musicList.length && !isRedirecting) nextTrackAuto(); }, 500);
    };
    audioPlayer.play().catch(() => {});
    DBG.log('MUSIC', 'Playing: ' + url.substring(url.lastIndexOf('/') + 1));
    updateTrackDisplay();
  }

  function nextTrackAuto() {
    if (!shouldPlayMusic() || !musicList.length) return;
    const url = getRandomMusic();
    if (!url) return;
    if (audioPlayer) {
      try { audioPlayer.pause(); } catch (e) {}
    }
    audioPlayer.src = url;
    audioPlayer.load();
    audioPlayer.play().catch(() => {});
    updateTrackDisplay();
  }

  function nextTrackManual() {
    if (!shouldPlayMusic()) {
      showToast("📵 Music blocked on mobile data");
      return;
    }
    nextTrackAuto();
    showToast("📳 NEXT TRACK!");
  }

  // ═══════════════════ TOAST NOTIFICATION ═══════════════════
  function showToast(msg) {
    const t = EL('div');
    t.textContent = msg;
    t.style.cssText = `
      position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:2147483647;
      background:var(--bg-color);border:none;color:var(--text-color);padding:10px 24px;
      border-radius:14px;font-size:12px;font-weight:600;letter-spacing:1px;pointer-events:none;
      box-shadow:6px 6px 12px var(--emboss-shadow),-6px -6px 12px var(--emboss-light);
      animation:nb-toast-in 0.3s ease;font-family:'Segoe UI',Roboto,sans-serif;
    `;
    document.body.appendChild(t);
    setTimeout(() => {
      t.style.opacity = "0";
      t.style.transition = "opacity 0.3s";
      setTimeout(() => t.remove(), 300);
    }, 1500);
  }

  // ═══════════════════ MUSIC TOGGLE SETUP ═══════════════════
  function setupMusicToggle(btnId) {
    const btn = DOM(btnId);
    if (!btn) return;

    const updateBtn = () => {
      if (!shouldPlayMusic()) {
        btn.textContent = "✕";
        btn.style.boxShadow = "inset 3px 3px 6px var(--emboss-shadow),inset -3px -3px 6px var(--emboss-light)";
        btn.style.color = "var(--danger-color)";
        btn.classList.add('metered');
        btn.title = "Music blocked (mobile data) - Tap to enable";
        return;
      }
      btn.classList.remove('metered');
      btn.style.color = "var(--text-color)";
      if (!audioPlayer) {
        btn.textContent = "♪";
        btn.style.boxShadow = "3px 3px 6px var(--emboss-shadow),-3px -3px 6px var(--emboss-light)";
        btn.title = "Play music";
      } else if (audioPlayer.paused) {
        btn.textContent = "✕";
        btn.style.boxShadow = "inset 3px 3px 6px var(--emboss-shadow),inset -3px -3px 6px var(--emboss-light)";
        btn.title = "Music paused - Tap to play";
      } else {
        btn.textContent = "♪";
        btn.style.boxShadow = "3px 3px 6px var(--emboss-shadow),-3px -3px 6px var(--emboss-light)";
        btn.title = "Music playing - Tap to pause";
      }
    };

    updateBtn();
    btn.addEventListener("click", () => {
      if (!shouldPlayMusic()) {
        musicUserEnabled = true;
        DBG.log('MUSIC', 'User manually enabled on metered connection');
        showToast("🎵 Music enabled (mobile data)");
        initAudio();
        updateBtn();
        updateTrackDisplay();
        return;
      }
      if (!audioPlayer) { initAudio(); updateBtn(); return; }
      if (audioPlayer.paused) { audioPlayer.play().catch(() => {}); }
      else { audioPlayer.pause(); }
      updateBtn();
    });
  }

  // ═══════════════════ SHAKE DETECTION ═══════════════════
  function initShake() {
    if (!window.DeviceMotionEvent) return;
    if (typeof DeviceMotionEvent.requestPermission === "function") {
      DeviceMotionEvent.requestPermission()
        .then(p => { if (p === "granted") addShakeListener(); })
        .catch(() => {});
    } else {
      addShakeListener();
    }
  }

  function addShakeListener() {
    window.addEventListener("devicemotion", (e) => {
      const a = e.accelerationIncludingGravity;
      if (!a) return;
      if (lastX === null) { lastX = a.x; lastY = a.y; lastZ = a.z; return; }
      if (Math.abs(a.x - lastX) + Math.abs(a.y - lastY) + Math.abs(a.z - lastZ) > 15 && !shakeTimeout) {
        shakeTimeout = setTimeout(() => shakeTimeout = null, 1000);
        nextTrackManual();
      }
      lastX = a.x; lastY = a.y; lastZ = a.z;
    });
  }

  // ═══════════════════ CLEANUP ═══════════════════
  function cleanupAll() {
    if (autoInitTimeout) clearTimeout(autoInitTimeout);
    if (banRedirectTimeout) clearInterval(banRedirectTimeout);
    if (exploitProgressRAF) cancelAnimationFrame(exploitProgressRAF);
    logTimers.forEach(clearTimeout);
    logTimers = [];
    cancelFillerLogs();
    stopLogQueue();
  }

  // ═══════════════════ LOG QUEUE SYSTEM ═══════════════════
  function startLogQueue() {
    if (isLoggingActive) return;
    isLoggingActive = true;
    DBG.log('UI', 'Log queue started');
    logInterval = setInterval(() => {
      if (logQueue.length > 0) {
        displayLogEntry(logQueue.shift());
      }
    }, 150);
  }

  function stopLogQueue() {
    isLoggingActive = false;
    DBG.log('UI', 'Log queue stopped, remaining: ' + logQueue.length);
    if (logInterval) {
      clearInterval(logInterval);
      logInterval = null;
    }
    while (logQueue.length > 0) {
      displayLogEntry(logQueue.shift());
    }
  }

  function queueLog(icon, text, color, className = '') {
    logQueue.push({ icon, text, color, className });
    if (!isLoggingActive) startLogQueue();
  }

  function displayLogEntry(logEntry) {
    const lo = DOM("log-output");
    if (!lo) return;
    
    const entry = EL('div', `nb-log-entry ${logEntry.className}`);
    const iconSpan = EL('span', 'nb-log-icon');
    iconSpan.textContent = logEntry.icon;
    const textSpan = EL('span', 'nb-log-text');
    textSpan.style.color = logEntry.color;
    textSpan.textContent = logEntry.text;
    
    entry.appendChild(iconSpan);
    entry.appendChild(textSpan);
    lo.appendChild(entry);
    lo.scrollTop = lo.scrollHeight;
  }

  function scheduleFillerLogs(remainingTime) {
    DBG.log('FILLER', `Scheduling for ${remainingTime}ms`);
    fillerLogsScheduled = true;
    
    const batches = [
      [
        { icon: '🔍', text: 'SCANNING NETWORK INTERFACES...', color: '#4a5568' },
        { icon: '●', text: `INTERFACE eth0: 192.168.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`, color: '#718096' },
        { icon: '●', text: `INTERFACE wlan0: 10.0.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`, color: '#718096' },
        { icon: '🔒', text: 'ESTABLISHING SECURE TUNNEL...', color: '#00f2ff' },
        { icon: '●', text: 'SSL CIPHER: TLS_AES_256_GCM_SHA384', color: '#4a5568' },
      ],
      [
        { icon: '📊', text: 'ANALYZING RESPONSE HEADERS...', color: '#ffa500' },
        { icon: '●', text: 'CONTENT-TYPE: application/json', color: '#4a5568' },
        { icon: '●', text: 'CACHE-CONTROL: no-cache', color: '#4a5568' },
        { icon: '●', text: 'X-FRAME-OPTIONS: DENY', color: '#4a5568' },
        { icon: '🛡', text: 'VERIFYING CORS POLICY...', color: '#00f2ff' },
      ],
      [
        { icon: '🔐', text: 'VALIDATING TOTP SIGNATURE...', color: '#ffa500' },
        { icon: '●', text: 'ALGORITHM: SHA-1 HMAC', color: '#4a5568' },
        { icon: '●', text: 'DIGITS: 6 | TIME STEP: 30s', color: '#4a5568' },
        { icon: '📡', text: 'CHECKING ENDPOINT AVAILABILITY...', color: '#00f2ff' },
        { icon: '●', text: `PING: ${Math.floor(Math.random()*50+20)}ms`, color: '#2ecc71' },
      ],
    ];
    
    const batchInterval = remainingTime / (batches.length + 1);
    
    batches.forEach((batch, index) => {
      const timerId = setTimeout(() => {
        if (!isRedirecting && !progressCompleted && fillerLogsScheduled) {
          batch.forEach(log => queueLog(log.icon, log.text, log.color));
        }
      }, batchInterval * (index + 1));
      logTimers.push(timerId);
    });
    
    const finalTimerId = setTimeout(() => {
      if (!isRedirecting && !progressCompleted && fillerLogsScheduled) {
        queueLog('', '━'.repeat(35), '#cbd5e1', 'log-separator');
        queueLog('🛡', 'SECURITY VERIFICATION COMPLETE', '#00f2ff', 'log-highlight');
      }
    }, remainingTime - 500);
    logTimers.push(finalTimerId);
  }

  function cancelFillerLogs() {
    fillerLogsScheduled = false;
    logTimers.forEach(t => clearTimeout(t));
    logTimers = [];
    DBG.log('FILLER', 'All filler logs cancelled');
  }

  // ═══════════════════ PROGRESS BAR ═══════════════════
  function startProgressBar() {
    const bar = DOM("nb-progress-exploit");
    const pct = DOM("nb-progress-pct");
    if (!bar || !pct) return;
    
    const t0 = Date.now();
    const totalTime = actualProgressTime || CFG.timings.min;
    
    function tick() {
      if (!exploitProgressRAF) return;
      const elapsed = Date.now() - t0;
      const p = Math.min(elapsed / totalTime * 100, 100);
      
      bar.style.width = p + "%";
      pct.textContent = Math.floor(p) + "%";
      
      if (p >= 100) {
        completeProgressNow();
      } else {
        exploitProgressRAF = requestAnimationFrame(tick);
      }
    }
    
    exploitProgressRAF = requestAnimationFrame(tick);
  }

  function completeProgressNow() {
    DBG.log('PROGRESS', 'Completing now');
    progressCompleted = true;
    
    if (exploitProgressRAF) {
      cancelAnimationFrame(exploitProgressRAF);
      exploitProgressRAF = null;
    }
    
    cancelFillerLogs();
    
    const bar = DOM("nb-progress-exploit");
    const pct = DOM("nb-progress-pct");
    const statusEl = DOM("nb-live-status");
    
    if (bar) {
      bar.style.transition = "width 0.5s ease-out";
      bar.style.width = "100%";
      if (fetchResult && (fetchResult.isError || fetchResult.isFakeUrl)) {
        bar.classList.add('error-fill');
      } else if (['vipteam', 'powercheats', 'universal-vplink'].includes(selectedModuleType) && 
                 fetchResult && fetchResult.isReal) {
        bar.classList.add('vipteam-success');
      }
    }
    if (pct) pct.textContent = "100%";
    
    if (statusEl) {
      if (fetchResult && (fetchResult.isError || fetchResult.isFakeUrl)) {
        statusEl.textContent = '● REJECTED';
        statusEl.style.color = 'var(--danger-color)';
      } else if (['vipteam', 'powercheats', 'universal-vplink'].includes(selectedModuleType)) {
        statusEl.textContent = '● VERIFIED';
        statusEl.style.color = '#ff00ff';
      } else {
        statusEl.textContent = '● SUCCESS';
        statusEl.style.color = 'var(--success-color)';
      }
    }
    
    stopLogQueue();
    
    setTimeout(() => {
      if (fetchResult && !isRedirecting) {
        handleExploitComplete(fetchResult.url, DOM("nebula-exploit"), fetchResult.isReal);
      }
    }, 800);
  }

  // ═══════════════════ EXPLOIT COMPLETE HANDLER ═══════════════════
  function handleExploitComplete(url, overlayEl, isReal) {
    if (isRedirecting) return;
    isRedirecting = true;
    DBG.log('REDIRECT', `Redirecting to: ${url.substring(0, 60)}`);
    
    if (audioPlayer) {
      try { audioPlayer.pause(); } catch (e) {}
    }
    
    if (overlayEl) {
      overlayEl.style.transition = "opacity 0.4s";
      overlayEl.style.opacity = "0";
      setTimeout(() => overlayEl.remove(), 400);
    }
    
    setTimeout(() => {
      window.location.href = url;
    }, 500);
  }

  // ═══════════════════ GLOW MANAGEMENT ═══════════════════
  function createGlowLayers(wrapper) {
    const defaultGlow = EL('div', 'nb-glow-layer glow-default');
    const focusGlow1 = EL('div', 'nb-glow-layer glow-focus-1');
    const focusGlow2 = EL('div', 'nb-glow-layer glow-focus-2');
    wrapper.appendChild(defaultGlow);
    wrapper.appendChild(focusGlow1);
    wrapper.appendChild(focusGlow2);
    return { defaultGlow, focusGlow1, focusGlow2 };
  }

  function createWrapper(innerHTML, extraContainerStyle = '') {
    const wrapper = EL('div', 'nb-electric-wrapper');
    createGlowLayers(wrapper);
    const container = EL('div', `nb-container ${extraContainerStyle}`);
    container.innerHTML = innerHTML;
    wrapper.appendChild(container);
    return wrapper;
  }

  // ═══════════════════ CONFIG FETCH ═══════════════════
  async function fetchConfig() {
    DBG.log('CONFIG', 'Fetching remote config...');
    try {
      const r = await fetch("https://raw.githubusercontent.com/A2MBD3/Aincrad/main/assets/data.json?t=" + Date.now());
      if (!r.ok) { DBG.log('CONFIG', `Failed with status: ${r.status}`); return; }
      const j = await r.json();
      DBG.log('CONFIG', 'Remote config loaded');
      
      if (j.status !== undefined) CFG.status = j.status;
      if (j.musicListUrl) CFG.musicListUrl = j.musicListUrl;
      if (j.apiBaseUrl) CFG.apiBaseUrl = j.apiBaseUrl;
      if (j.apiKey) CFG.apiKey = j.apiKey;
      if (j.totpSecret) CFG.totpSecret = j.totpSecret;
      if (j.fallbackRedirectUrl) CFG.fallbackRedirectUrl = j.fallbackRedirectUrl;
      if (j.cssUrl) CFG.cssUrl = j.cssUrl;
      if (j.timing) {
        if (j.timing.initProgressTime) CFG.timings.init = j.timing.initProgressTime;
        if (j.timing.exploitProgressTime) CFG.timings.exploit = j.timing.exploitProgressTime;
        if (j.timing.minProgressTime) CFG.timings.min = j.timing.minProgressTime;
        if (j.timing.autoInitDelay) CFG.timings.autoInit = j.timing.autoInitDelay;
      }
    } catch (e) {
      DBG.error('CONFIG', e.message);
    }
  }

  async function fetchMusicList() {
    DBG.log('MUSIC', 'Fetching music list...');
    try {
      const r = await fetch(CFG.musicListUrl + "?t=" + Date.now());
      const t = await r.text();
      musicList = t.split('\n').map(l => l.trim()).filter(l => l.startsWith('http'));
      DBG.log('MUSIC', `Loaded ${musicList.length} tracks`);
      return musicList.length > 0;
    } catch (e) {
      DBG.error('MUSIC', e.message);
      return false;
    }
  }

  // ═══════════════════ USER DATA FETCH ═══════════════════
  async function fetchUserData() {
    DBG.log('USERS', `Fetching user data for ID: ${USER_ID}`);
    try {
      const url = `${CFG.userDataApiUrl}/?id=${USER_ID}&key=crx`;
      const response = await fetch(url);
      
      if (!response.ok) {
        DBG.error('USERS', `API failed with status: ${response.status}`);
        return false;
      }
      
      const data = await response.json();
      DBG.log('USERS', 'User data received:', JSON.stringify(data));
      
      if (data && data.id !== undefined && data.id !== null) {
        USER_DATA = {
          id: parseInt(data.id) || USER_ID,
          name: data.name || DEFAULT_USER.name,
          tgChannel: data.tgChannel || DEFAULT_USER.tgChannel,
          password: data.password ? String(data.password).trim().toLowerCase() : DEFAULT_USER.password,
          banned: parseInt(data.banned) || DEFAULT_USER.banned,
          creator: data.creator || "",
          chatId: data.chatId || "",
          createdAt: data.createdAt || ""
        };
        
        DBG.log('USERS', `User loaded: ${USER_DATA.name} (ID:${USER_DATA.id})`);
        DBG.log('USERS', `  Banned: ${USER_DATA.banned}, Password: ${USER_DATA.password !== "0" ? 'SET' : 'NONE'}`);
        
        return true;
      }
      return false;
    } catch (e) {
      DBG.error('USERS', `Fetch error: ${e.message}`);
      return false;
    }
  }

  // ═══════════════════ API INTEGRATION ═══════════════════
  async function fetchRedirectUrlFromAPI(type, attempt = 1) {
    const maxRetries = 3;
    DBG.log('API', `Fetching redirect URL: type=${type}, attempt=${attempt}/${maxRetries}`);
    
    try {
      const pin = await totp.generate();
      currentPinCache = pin;
      DBG.log('API', `PIN generated: ${pin}`);
      
      const apiUrl = `${CFG.apiBaseUrl}?file=crx.json&type=${type}&key=${CFG.apiKey}&pin=${pin}`;
      
      if (attempt > 1) {
        queueLog('🔄', `ATTEMPT ${attempt} OF ${maxRetries}`, '#ffa500', 'log-highlight');
      }
      
      queueLog('📡', `REQUESTING: ${CFG.apiBaseUrl}?file=crx.json&type=${type}&key=${CFG.apiKey}&pin=******`, '#4a5568');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(apiUrl, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache' }
      });
      
      clearTimeout(timeoutId);
      
      DBG.log('API', `Response: ${response.status}`);
      queueLog('📡', `RESPONSE: ${response.status} ${response.statusText}`, 
               response.ok ? '#2ecc71' : '#ff4757');
      
      if (!response.ok) {
        // Try previous TOTP window
        const prevPin = await totp.generate(-1);
        currentPinCache = prevPin;
        
        queueLog('🔐', 'CHECKING PREVIOUS TOTP WINDOW...', '#00f2ff');
        
        const retryUrl = `${CFG.apiBaseUrl}?file=crx.json&type=${type}&key=${CFG.apiKey}&pin=${prevPin}`;
        const retryResponse = await fetch(retryUrl, { headers: { 'Accept': 'application/json' } });
        
        queueLog('📡', `RETRY RESPONSE: ${retryResponse.status}`, 
                 retryResponse.ok ? '#2ecc71' : '#ff4757');
        
        if (!retryResponse.ok) {
          if (attempt < maxRetries) {
            DBG.log('API', `Retrying (${attempt + 1}/${maxRetries})...`);
            queueLog('⏳', `RETRYING (${attempt + 1}/${maxRetries})...`, '#ffa500');
            await new Promise(resolve => setTimeout(resolve, 2000));
            return fetchRedirectUrlFromAPI(type, attempt + 1);
          }
          throw new Error(`FAILED AFTER ${maxRetries} ATTEMPTS`);
        }
        
        const retryData = await retryResponse.json();
        apiResponseCache = retryData;
        return processApiResponse(retryData, prevPin, attempt);
      }
      
      const data = await response.json();
      DBG.log('API', 'Response data received successfully');
      apiResponseCache = data;
      return processApiResponse(data, pin, attempt);
      
    } catch (error) {
      DBG.error('API', `Error: ${error.message}`);
      queueLog('❌', `ERROR: ${error.message}`, '#ff4757', 'log-error');
      
      if (attempt < maxRetries) {
        DBG.log('API', `Retrying after error (${attempt + 1}/${maxRetries})...`);
        queueLog('⏳', `RETRYING (${attempt + 1}/${maxRetries})...`, '#ffa500');
        await new Promise(resolve => setTimeout(resolve, 2000));
        return fetchRedirectUrlFromAPI(type, attempt + 1);
      }
      
      DBG.error('API', `All ${maxRetries} attempts exhausted`);
      queueLog('❌', `ALL ${maxRetries} ATTEMPTS EXHAUSTED`, '#ff4757', 'log-error');
      return handleFetchFailure('❌ SERVER REJECTED AFTER MAX ATTEMPTS');
    }
  }

  function processApiResponse(data, pin, attempt) {
    const maxRetries = 3;
    const destinationUrl = data.destinationLink || CFG.fallbackRedirectUrl;
    
    DBG.log('API', `Processing response, destination: ${(destinationUrl || 'N/A').substring(0, 60)}`);
    
    queueLog('📋', 'PARSING SERVER RESPONSE...', '#00f2ff', 'log-highlight');
    queueLog('●', `TYPE: ${(data.type || 'N/A').toUpperCase()}`, '#4a5568');
    queueLog('●', `VERIFIED: ${data.verified ? '✅ YES' : '❌ NO'}`, 
             data.verified ? '#2ecc71' : '#ff4757');
    queueLog('●', `OWNER: ${data.owner || '@A2MBD3'}`, '#718096');
    
    if (data.destinationLink) {
      const truncated = data.destinationLink.length > 50 ? 
                        data.destinationLink.substring(0, 50) + '...' : data.destinationLink;
      queueLog('🔗', `DESTINATION: ${truncated}`, '#4a5568');
    }
    
    if (isTelegramLink(destinationUrl)) {
      DBG.log('API', 'Fake URL (Telegram link) detected');
      queueLog('⚠', `FAKE URL DETECTED (Attempt ${attempt}/${maxRetries})`, '#ffa500', 'log-highlight');
      
      if (attempt < maxRetries) {
        queueLog('🔄', `RETRYING... Attempt ${attempt + 1} of ${maxRetries}`, '#ffa500', 'log-highlight');
        return fetchRedirectUrlFromAPI(data.type || '2', attempt + 1);
      }
      
      queueLog('❌', `ALL ${maxRetries} ATTEMPTS FAILED — FAKE URLS`, '#ff4757', 'log-error');
      return handleFetchFailure('❌ SERVER REJECTED — FAKE URLS AFTER MAX ATTEMPTS');
    }
    
    if (isValidRedirectUrl(destinationUrl)) {
      DBG.log('API', 'Valid redirect URL found!');
      queueLog('✅', 'AUTHENTIC REDIRECT URL FOUND!', '#2ecc71', 'log-success');
      return handleFetchSuccess(destinationUrl, data, pin);
    }
    
    DBG.log('API', 'Invalid URL format');
    queueLog('⚠', `INVALID URL FORMAT (Attempt ${attempt}/${maxRetries})`, '#ffa500', 'log-highlight');
    
    if (attempt < maxRetries) {
      queueLog('🔄', `RETRYING... Attempt ${attempt + 1} of ${maxRetries}`, '#ffa500', 'log-highlight');
      return fetchRedirectUrlFromAPI(data.type || '2', attempt + 1);
    }
    
    queueLog('❌', `ALL ${maxRetries} ATTEMPTS FAILED — INVALID URLS`, '#ff4757', 'log-error');
    return handleFetchFailure('❌ SERVER REJECTED — INVALID URLS AFTER MAX ATTEMPTS');
  }

  function handleFetchSuccess(url, data, pin) {
    DBG.log('API', `SUCCESS! Redirect URL: ${url.substring(0, 60)}`);
    isRealRedirectUrl = true;
    fetchEndTime = Date.now();  // FIXED: Now using global fetchEndTime
    const elapsed = fetchEndTime - fetchStartTime;
    
    queueLog('✅', 'AUTHENTIC REDIRECT URL CONFIRMED', '#2ecc71', 'log-success');
    queueLog('🎯', 'TARGET ACQUIRED SUCCESSFULLY', '#2ecc71', 'log-success');
    
    fetchCompleted = true;
    fetchResult = {
      url: url,
      apiData: data,
      pin: pin,
      isReal: true,
      serverMessage: '✅ REAL REDIRECT CONFIRMED',
      isError: false,
      isFakeUrl: false
    };
    
    if (['vipteam', 'powercheats', 'universal-vplink'].includes(selectedModuleType)) {
      queueLog('⚡', 'LINK VERIFIED — SKIPPING FILLER LOGS', '#ff00ff', 'log-highlight');
      actualProgressTime = elapsed;
      completeProgressNow();
    } else {
      if (elapsed >= CFG.timings.min) {
        actualProgressTime = elapsed;
        completeProgressNow();
      } else {
        actualProgressTime = CFG.timings.min;
        scheduleFillerLogs(CFG.timings.min - elapsed);
      }
    }
    
    return fetchResult;
  }

  function handleFetchFailure(message) {
    DBG.error('API', `FAILURE: ${message}`);
    isRealRedirectUrl = false;
    fetchEndTime = Date.now();  // FIXED: Now using global fetchEndTime
    
    queueLog('❌', message, '#ff4757', 'log-error');
    queueLog('⚠', 'FALLBACK PROTOCOL ACTIVATED', '#ffa500', 'log-highlight');
    
    fetchCompleted = true;
    fetchResult = {
      url: CFG.fallbackRedirectUrl,
      apiData: apiResponseCache,
      pin: currentPinCache,
      isReal: false,
      serverMessage: message,
      isError: true,
      isFakeUrl: true
    };
    
    actualProgressTime = fetchEndTime - fetchStartTime;
    completeProgressNow();
    
    return fetchResult;
  }

  // ═══════════════════ VIPTEAM/POWERCHEATS FUNCTIONS ═══════════════════
  function extractVplinkFromPage() {
    try {
      DBG.log('VPLINK', 'Starting comprehensive vplink.in scan...');
      
      // Method 1: Check anchor tags
      const allLinks = $$('a');
      DBG.log('VPLINK', `Scanning ${allLinks.length} anchor tags...`);
      for (let link of allLinks) {
        const href = link.getAttribute('href');
        if (href && href.includes('vplink.in')) {
          const match = href.match(/https?:\/\/vplink\.in\/[^\s"'<>]+/);
          if (match) {
            const cleanUrl = match[0].replace(/[.,;:'")\]}]+$/, '');
            DBG.log('VPLINK', 'Found vplink URL in <a> tag: ' + cleanUrl);
            return cleanUrl;
          }
        }
      }
      
      // Method 2: Check element text content
      const elements = $$('p, div, span, td, li, pre, code, strong, em, b, i, h1, h2, h3, h4, h5, h6');
      for (let el of elements) {
        const text = el.textContent || '';
        const match = text.match(/https?:\/\/vplink\.in\/[^\s"'<>]+/);
        if (match) {
          const cleanUrl = match[0].replace(/[.,;:'")\]}]+$/, '');
          DBG.log('VPLINK', 'Found vplink URL in element text: ' + cleanUrl);
          return cleanUrl;
        }
      }
      
      // Method 3: Full body text scan
      const bodyMatch = document.body.innerText.match(/https?:\/\/vplink\.in\/[^\s"'<>]+/);
      if (bodyMatch) {
        const cleanUrl = bodyMatch[0].replace(/[.,;:'")\]}]+$/, '');
        DBG.log('VPLINK', 'Found vplink URL in body text: ' + cleanUrl);
        return cleanUrl;
      }
      
      DBG.log('VPLINK', 'No vplink.in URL found');
      return null;
    } catch (error) {
      DBG.error('VPLINK', 'Extraction error: ' + error.message);
      return null;
    }
  }

  function extractVpKey(vplinkUrl) {
    try {
      let cleanUrl = vplinkUrl.trim();
      cleanUrl = cleanUrl.split('?')[0].split('#')[0];
      
      const urlObj = new URL(cleanUrl);
      let path = urlObj.pathname;
      path = path.replace(/^\/+|\/+$/g, '');
      const key = path.split('/')[0];
      
      if (!key || key.length === 0) {
        DBG.error('VPLINK', 'Empty key extracted from URL: ' + vplinkUrl);
        return null;
      }
      
      DBG.log('VPLINK', 'Extracted VP key: ' + key);
      return key;
    } catch (error) {
      DBG.log('VPLINK', 'URL parsing failed, trying regex extraction');
      const match = vplinkUrl.match(/vplink\.in\/([^\/\s?#]+)/);
      if (match && match[1]) {
        DBG.log('VPLINK', 'Regex extracted VP key: ' + match[1]);
        return match[1];
      }
      return null;
    }
  }

  async function fetchVipteamRedirectUrl(type, vpKey, attempt = 1) {
    const maxRetries = 3;
    DBG.log('VPLINK', `fetchVipteamRedirectUrl: type=${type}, vpKey=${vpKey}, attempt=${attempt}`);
    
    try {
      const pin = await totp.generate();
      currentPinCache = pin;
      DBG.log('VPLINK', `PIN: ${pin}`);
      
      const apiUrl = `${CFG.apiBaseUrl}?file=crx.json&type=${type}&key=${CFG.apiKey}&pin=${pin}&vp=${vpKey}`;
      
      if (attempt > 1) {
        queueLog('🔄', `ATTEMPT ${attempt} OF ${maxRetries}`, '#ffa500', 'log-highlight');
      }
      
      queueLog('📡', `REQUESTING: ${CFG.apiBaseUrl}?file=crx.json&type=${type}&key=${CFG.apiKey}&pin=******&vp=${vpKey}`, '#4a5568');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(apiUrl, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache' }
      });
      
      clearTimeout(timeoutId);
      DBG.log('VPLINK', `Response: ${response.status}`);
      queueLog('📡', `RESPONSE: ${response.status} ${response.statusText}`, 
               response.ok ? '#2ecc71' : '#ff4757');
      
      if (!response.ok) {
        const prevPin = await totp.generate(-1);
        currentPinCache = prevPin;
        
        queueLog('🔐', 'CHECKING PREVIOUS TOTP WINDOW...', '#00f2ff');
        
        const retryUrl = `${CFG.apiBaseUrl}?file=crx.json&type=${type}&key=${CFG.apiKey}&pin=${prevPin}&vp=${vpKey}`;
        const retryResponse = await fetch(retryUrl, { headers: { 'Accept': 'application/json' } });
        
        queueLog('📡', `RETRY RESPONSE: ${retryResponse.status}`, 
                 retryResponse.ok ? '#2ecc71' : '#ff4757');
        
        if (!retryResponse.ok) {
          if (attempt < maxRetries) {
            DBG.log('VPLINK', `Retrying (${attempt + 1}/${maxRetries})...`);
            queueLog('⏳', `RETRYING (${attempt + 1}/${maxRetries})...`, '#ffa500');
            await new Promise(resolve => setTimeout(resolve, 2000));
            return fetchVipteamRedirectUrl(type, vpKey, attempt + 1);
          }
          throw new Error(`FAILED AFTER ${maxRetries} ATTEMPTS`);
        }
        
        const retryData = await retryResponse.json();
        apiResponseCache = retryData;
        return processVipteamResponse(retryData, prevPin, vpKey, attempt);
      }
      
      const data = await response.json();
      DBG.log('VPLINK', 'Response data received');
      apiResponseCache = data;
      return processVipteamResponse(data, pin, vpKey, attempt);
      
    } catch (error) {
      DBG.error('VPLINK', `Error: ${error.message}`);
      queueLog('❌', `ERROR: ${error.message}`, '#ff4757', 'log-error');
      
      if (attempt < maxRetries) {
        DBG.log('VPLINK', `Retrying after error (${attempt + 1}/${maxRetries})...`);
        queueLog('⏳', `RETRYING (${attempt + 1}/${maxRetries})...`, '#ffa500');
        await new Promise(resolve => setTimeout(resolve, 2000));
        return fetchVipteamRedirectUrl(type, vpKey, attempt + 1);
      }
      
      DBG.error('VPLINK', `All ${maxRetries} attempts exhausted`);
      queueLog('❌', `ALL ${maxRetries} ATTEMPTS EXHAUSTED`, '#ff4757', 'log-error');
      return handleVipteamFailure('❌ SERVER REJECTED AFTER MAX ATTEMPTS');
    }
  }

  function processVipteamResponse(data, pin, vpKey, attempt) {
    const maxRetries = 3;
    const destinationUrl = data.destinationLink || CFG.fallbackRedirectUrl;
    
    DBG.log('VPLINK', `Processing response, destination: ${(destinationUrl || 'N/A').substring(0, 60)}`);
    
    queueLog('📋', 'PARSING SERVER RESPONSE...', '#00f2ff', 'log-highlight');
    queueLog('●', `TYPE: ${(data.type || 'N/A').toUpperCase()}`, '#4a5568');
    queueLog('●', `VERIFIED: ${data.verified ? '✅ YES' : '❌ NO'}`, 
             data.verified ? '#2ecc71' : '#ff4757');
    queueLog('●', `OWNER: ${data.owner || '@A2MBD3'}`, '#718096');
    
    if (data.destinationLink) {
      const truncated = data.destinationLink.length > 50 ? 
                        data.destinationLink.substring(0, 50) + '...' : data.destinationLink;
      queueLog('🔗', `DESTINATION: ${truncated}`, '#4a5568');
    }
    
    if (isTelegramLink(destinationUrl)) {
      DBG.log('VPLINK', 'Fake URL (Telegram link) detected');
      queueLog('⚠', `FAKE URL DETECTED (Attempt ${attempt}/${maxRetries})`, '#ffa500', 'log-highlight');
      
      if (attempt < maxRetries) {
        queueLog('🔄', `RETRYING... Attempt ${attempt + 1} of ${maxRetries}`, '#ffa500', 'log-highlight');
        return fetchVipteamRedirectUrl(data.type || 'vp', vpKey, attempt + 1);
      }
      
      queueLog('❌', `ALL ${maxRetries} ATTEMPTS FAILED — FAKE URLS`, '#ff4757', 'log-error');
      return handleVipteamFailure('❌ SERVER REJECTED — FAKE URLS AFTER MAX ATTEMPTS');
    }
    
    if (isValidRedirectUrl(destinationUrl)) {
      DBG.log('VPLINK', 'Valid redirect URL found!');
      queueLog('✅', 'AUTHENTIC LINK FOUND!', '#2ecc71', 'log-success');
      return handleVipteamSuccess(destinationUrl, data, pin);
    }
    
    DBG.log('VPLINK', 'Invalid URL format');
    queueLog('⚠', `INVALID URL FORMAT (Attempt ${attempt}/${maxRetries})`, '#ffa500', 'log-highlight');
    
    if (attempt < maxRetries) {
      queueLog('🔄', `RETRYING... Attempt ${attempt + 1} of ${maxRetries}`, '#ffa500', 'log-highlight');
      return fetchVipteamRedirectUrl(data.type || 'vp', vpKey, attempt + 1);
    }
    
    queueLog('❌', `ALL ${maxRetries} ATTEMPTS FAILED — INVALID URLS`, '#ff4757', 'log-error');
    return handleVipteamFailure('❌ SERVER REJECTED — INVALID URLS AFTER MAX ATTEMPTS');
  }

  function handleVipteamSuccess(url, data, pin) {
    return handleFetchSuccess(url, data, pin);
  }

  function handleVipteamFailure(message) {
    return handleFetchFailure(message);
  }

  // ═══════════════════ STATUS PANELS ═══════════════════
  function showStatusPanel(icon, title, descLines, btnText, btnAction, countdown, isSuspended = false) {
    DBG.log('UI', `Showing panel: ${title}`);
    cleanupAll();
    document.querySelector(".nb-overlay")?.remove();
    
    const ov = EL('div', 'nb-overlay');
    const descHTML = Array.isArray(descLines) ? 
      descLines.map(l => `<p class="nb-status-user" style="margin:2px 0;">${l}</p>`).join('') : 
      `<p class="nb-subtitle">${descLines}</p>`;
    
    const iconClass = isSuspended ? "nb-suspended-icon" : "nb-status-icon";
    const btnClass = isSuspended ? "nb-emboss-btn nb-unban-btn" : "nb-emboss-btn";
    
    const wrapper = createWrapper(`
      <div class="${iconClass}">${icon}</div>
      <h3 class="nb-title">${title}</h3>
      ${descHTML}
      ${btnText ? `<button class="${btnClass}" id="nb-status-btn" style="margin-top:14px;">${btnText}</button>` : ''}
      ${countdown ? `<p style="color:var(--text-muted);font-size:10px;margin-top:12px;">Auto-redirect in <span id="nb-countdown" style="font-weight:700;">${countdown}</span>s</p>` : ''}
      <p class="nb-footer" style="margin-top:12px;"><a href="${CREDITS.TEAM_URL}" target="_blank">${CREDITS.TEAM}</a> | ${APP.FULL} | 📳 Shake to change track 🎵</p>
    `, "overflow-visible");
    
    ov.appendChild(wrapper);
    document.body.appendChild(ov);
    
    if (btnText && btnAction) {
      DOM("nb-status-btn")?.addEventListener("click", btnAction);
    }
    
    if (countdown && btnAction) {
      let cd = countdown;
      const cdEl = DOM("nb-countdown");
      banRedirectTimeout = setInterval(() => {
        cd--;
        if (cdEl) cdEl.textContent = cd;
        if (cd <= 0) {
          clearInterval(banRedirectTimeout);
          btnAction();
        }
      }, 1000);
    }
  }

  function showBanPanel() {
    isBanned = true;
    showStatusPanel(
      "🚫", "ACCESS BANNED",
      ["USER: " + USER_DATA.name, "ID: " + USER_DATA.id, "Contact developer for access"],
      "⚡ DEVELOPER CHANNEL",
      () => window.open("https://t.me/HQcrx", "_blank"),
      10
    );
  }

  function showSuspendedPanel() {
    isBanned = true;
    showStatusPanel(
      "⛔", "ACCOUNT SUSPENDED",
      ["USER: " + USER_DATA.name, "ID: " + USER_DATA.id, "Bypass creator didn't subscribe to required channel.", "Click below to Restore."],
      "🔓 Regain Access",
      () => window.open("https://t.me/yournebulabot/start", "_blank"),
      null, true
    );
  }

  function showOutdated() {
    showStatusPanel(
      "⚠", "NEBULA OUTDATED", "SIGNATURE MISMATCH",
      hasChannel() ? "⬇ DOWNLOAD LATEST" : null,
      hasChannel() ? () => window.open(getChannelUrl(), "_blank") : null
    );
  }

  function showMaintenance() {
    showStatusPanel(
      "🔧", "MAINTENANCE", "SYSTEM UPDATE IN PROGRESS",
      hasChannel() ? "⚡ JOIN CHANNEL" : null,
      hasChannel() ? () => window.open(getChannelUrl(), "_blank") : null
    );
  }

  // ═══════════════════ INIT PANEL ═══════════════════
  function renderInitPanel() {
    DBG.log('UI', 'Rendering INIT panel');
    document.getElementById("nebula-auth")?.remove();
    
    const ov = EL('div', 'nb-overlay');
    ov.id = "nebula-auth";
    
    const passHTML = needPassword() ? `
      <div style="margin-bottom:8px;">
        <input id="nb-pass-input" class="nb-emboss-input" type="text" autocomplete="off" placeholder="AUTH KEY">
      </div>
      <p id="nb-pass-error" class="nb-error-text">⛔ WRONG AUTH KEY</p>
    ` : '';
    
    const wrapper = createWrapper(`
      <button id="music-btn" class="nb-music-btn">♪</button>
      <div class="nb-uid">${APP.FULL} [UID:${USER_DATA.id}]</div>
      <h3 class="nb-title">${USER_DATA.name}</h3>
      <div class="nb-divider"></div>
      <p style="color:var(--text-color);font-size:10px;letter-spacing:3px;">◆ SYSTEM READY</p>
      <div id="nb-track-name" class="nb-track"></div>
      ${passHTML}
      <button id="init-btn" class="nb-emboss-btn">⬡ START BYPASS</button>
      ${hasChannel() ? '<button id="support-btn" class="nb-emboss-btn">⚡ TELEGRAM</button>' : ''}
      <div class="nb-footer"><a href="${CREDITS.TEAM_URL}" target="_blank">${CREDITS.TEAM}</a> | ${APP.FULL} | 📳 Shake to change track 🎵</div>
    `, "overflow-visible");
    
    ov.appendChild(wrapper);
    document.body.appendChild(ov);
    
    const passInput = DOM("nb-pass-input");
    const focusGlows = wrapper.querySelectorAll('.glow-focus-1, .glow-focus-2');
    const activateGlow = () => focusGlows.forEach(g => g.style.opacity = "1");
    const deactivateGlow = () => focusGlows.forEach(g => g.style.opacity = "0");
    
    if (passInput) {
      passInput.addEventListener("focus", activateGlow);
      passInput.addEventListener("blur", deactivateGlow);
    }
    
    updateTrackDisplay = () => {
      const el = DOM("nb-track-name");
      if (!el) return;
      if (!shouldPlayMusic()) {
        el.textContent = "♫ Music blocked (tap ♪ to enable)";
        el.className = "nb-track metered";
        return;
      }
      if (!musicList.length) {
        el.textContent = "";
        el.className = "nb-track";
        return;
      }
      try {
        const name = decodeURIComponent(musicList[currentTrackIndex].split('/').pop()
          .replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
        el.textContent = "♫ " + (name.length > 20 ? name.slice(0, 20) + '…' : name);
        el.className = "nb-track";
      } catch {
        el.textContent = "♫ Track " + (currentTrackIndex + 1);
        el.className = "nb-track";
      }
    };
    
    if (musicList.length && shouldPlayMusic()) {
      initAudio();
    } else {
      updateTrackDisplay();
    }
    
    initShake();
    setupMusicToggle("music-btn");
    
    const suppBtn = DOM("support-btn");
    if (suppBtn) suppBtn.addEventListener("click", () => window.open(getChannelUrl(), "_blank"));
    
    const initBtn = DOM("init-btn");
    const passError = DOM("nb-pass-error");
    
    function handleInitClick() {
      if (initBtn.disabled) return;
      
      if (needPassword()) {
        if (!passInput || !checkPassword(passInput.value)) {
          if (passError) passError.style.display = "block";
          if (passInput) {
            passInput.classList.add("error");
            setTimeout(() => passInput.classList.remove("error"), 400);
          }
          return;
        } else {
          if (passError) passError.style.display = "none";
          if (passInput) {
            passInput.classList.remove("error");
            passInput.classList.add("success");
          }
        }
      }
      
      initBtn.disabled = true;
      if (suppBtn) suppBtn.disabled = true;
      if (autoInitTimeout) clearTimeout(autoInitTimeout);
      deactivateGlow();
      
      if (directTarget) {
        selectedTarget = directTarget.target;
        selectedTargetName = directTarget.name;
        selectedModuleType = directTarget.module;
        
        ov.style.transition = "opacity 0.3s";
        ov.style.opacity = "0";
        setTimeout(() => {
          ov.remove();
          if (directTarget.module === "vipteam") {
            renderExploitPanelForModule('vipteam', directTarget.apiType);
          } else if (directTarget.module === "powercheats") {
            renderExploitPanelForModule('powercheats', directTarget.apiType);
          } else if (directTarget.module === "universal-vplink") {
            renderUniversalVplinkPanel(directTarget.apiType);
          } else {
            renderStandardExploitPanel(directTarget.apiType);
          }
        }, 300);
      } else {
        showTargetSelection(ov);
      }
    }
    
    initBtn.addEventListener("click", handleInitClick);
    if (passInput) {
      passInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); handleInitClick(); }
      });
      passInput.addEventListener("input", () => {
        if (passError && passError.style.display === "block") {
          passError.style.display = "none";
          passInput.classList.remove("error");
        }
      });
    }
    
    autoInitTimeout = setTimeout(() => {
      const b = DOM("init-btn");
      if (b && !b.disabled) handleInitClick();
    }, CFG.timings.autoInit);
  }

  // ═══════════════════ TARGET SELECTION ═══════════════════
  function showTargetSelection(authOverlay) {
    document.getElementById("target-selection")?.remove();
    
    const ov = EL('div', 'nb-overlay');
    ov.id = "target-selection";
    ov.style.zIndex = "2147483648";
    
    const targetBtns = Object.values(DIRECT_TARGETS).map(t => 
      `<button id="target-${t.target}" class="nb-emboss-btn">⬡ ${t.name}</button>`
    ).join('');
    
    const wrapper = createWrapper(`
      <button id="target-back-btn" class="nb-back-btn">←</button>
      <button id="target-music-btn" class="nb-music-btn">♪</button>
      <div class="nb-uid">SELECT TARGET</div>
      <h3 class="nb-title">SELECT TARGET</h3>
      <div class="nb-divider"></div>
      ${targetBtns}
      <div class="nb-footer"><a href="${CREDITS.TEAM_URL}" target="_blank">${CREDITS.TEAM}</a> | ${APP.FULL} | 📳 Shake to change track 🎵</div>
    `, "overflow-visible");
    
    ov.appendChild(wrapper);
    document.body.appendChild(ov);
    
    DOM("target-back-btn").addEventListener("click", function() {
      ov.style.transition = "opacity 0.3s";
      ov.style.opacity = "0";
      setTimeout(() => {
        ov.remove();
        renderInitPanel();
      }, 300);
    });
    
    setupMusicToggle("target-music-btn");
    
    Object.values(DIRECT_TARGETS).forEach(t => {
      DOM(`target-${t.target}`)?.addEventListener("click", async () => {
        selectedTarget = t.target;
        selectedTargetName = t.name;
        selectedModuleType = t.module;
        
        // Disable all target buttons
        Object.keys(DIRECT_TARGETS).forEach(k => {
          const btn = DOM(`target-${k}`);
          if (btn) btn.disabled = true;
        });
        
        ov.style.transition = "opacity 0.3s";
        ov.style.opacity = "0";
        if (authOverlay) {
          authOverlay.style.transition = "opacity 0.3s";
          authOverlay.style.opacity = "0";
        }
        
        setTimeout(() => {
          ov.remove();
          if (authOverlay) authOverlay.remove();
          
          if (t.module === "vipteam") {
            renderExploitPanelForModule('vipteam', t.apiType);
          } else if (t.module === "powercheats") {
            renderExploitPanelForModule('powercheats', t.apiType);
          } else if (t.module === "universal-vplink") {
            renderUniversalVplinkPanel(t.apiType);
          } else {
            renderStandardExploitPanel(t.apiType);
          }
        }, 300);
      });
    });
  }

  // ═══════════════════ STANDARD EXPLOIT PANEL ═══════════════════
  function renderStandardExploitPanel(apiType) {
    renderExploitPanelBase(apiType, 'STANDARD', '#00f2ff', () => {
      return fetchRedirectUrlFromAPI(apiType);
    });
  }

  // ═══════════════════ VIPTEAM/POWERCHEATS PANELS ═══════════════════
  function renderExploitPanelForModule(moduleType, apiType) {
    if (moduleType === 'vipteam') {
      renderExploitPanelBase(apiType, 'VIPTEAM EXTRACTOR', '#ff00ff', async () => {
        queueLog('🔍', 'EXTRACTING VPLINK.IN FROM PAGE...', '#ff00ff', 'log-highlight');
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const vplinkUrl = extractVplinkFromPage();
        
        if (!vplinkUrl) {
          queueLog('❌', 'NO VPLINK.IN URL FOUND ON PAGE', '#ff4757', 'log-error');
          return handleFetchFailure('❌ NO VPLINK.IN URL FOUND');
        }
        
        queueLog('✅', `FOUND: ${vplinkUrl.length > 50 ? vplinkUrl.substring(0, 50) + '...' : vplinkUrl}`, 
                 '#2ecc71', 'log-success');
        
        const vpKey = extractVpKey(vplinkUrl);
        
        if (!vpKey) {
          queueLog('❌', 'FAILED TO EXTRACT KEY FROM URL', '#ff4757', 'log-error');
          return handleFetchFailure('❌ KEY EXTRACTION FAILED');
        }
        
        queueLog('🔑', `VP KEY: ${vpKey.toUpperCase()}`, '#ff00ff', 'log-key-found');
        queueLog('', '━'.repeat(35), '#cbd5e1', 'log-separator');
        queueLog('📡', 'INITIALIZING VIPTEAM CONNECTION...', '#00f2ff', 'log-highlight');
        
        return fetchVipteamRedirectUrl(apiType, vpKey);
      });
    } else if (moduleType === 'powercheats') {
      renderExploitPanelBase(apiType, 'POWERCHEATS EXTRACTOR', '#ff00ff', async () => {
        queueLog('🔍', 'EXTRACTING VPLINK.IN USING POWERCHEATS METHODS...', '#ff00ff', 'log-highlight');
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // PowerCheats-specific extraction
        const currentURL = window.location.href;
        let vplinkUrl = null;
        
        if (currentURL.includes('vplink.in')) {
          vplinkUrl = currentURL;
        } else {
          // Check script tags
          const scripts = $$('script');
          for (let script of scripts) {
            const content = script.textContent || script.innerText || '';
            const match = content.match(/window\.location\.href\s*=\s*["']([^"']+)["']/);
            if (match && match[1] && match[1].includes('vplink.in')) {
              vplinkUrl = match[1].replace(/[.,;:'")\]}]+$/, '');
              break;
            }
          }
          
          // Full HTML scan as fallback
          if (!vplinkUrl) {
            const htmlMatch = document.documentElement.innerHTML.match(/https?:\/\/vplink\.in\/[^\s"'<>]+/);
            if (htmlMatch) vplinkUrl = htmlMatch[0].replace(/[.,;:'")\]}]+$/, '');
          }
        }
        
        if (!vplinkUrl) {
          queueLog('❌', 'NO VPLINK.IN URL FOUND ON PAGE', '#ff4757', 'log-error');
          return handleFetchFailure('❌ NO VPLINK.IN URL FOUND');
        }
        
        queueLog('✅', `FOUND: ${vplinkUrl.length > 50 ? vplinkUrl.substring(0, 50) + '...' : vplinkUrl}`, 
                 '#2ecc71', 'log-success');
        
        const vpKey = extractVpKey(vplinkUrl);
        
        if (!vpKey) {
          queueLog('❌', 'FAILED TO EXTRACT KEY FROM URL', '#ff4757', 'log-error');
          return handleFetchFailure('❌ KEY EXTRACTION FAILED');
        }
        
        queueLog('🔑', `VP KEY: ${vpKey.toUpperCase()}`, '#ff00ff', 'log-key-found');
        queueLog('', '━'.repeat(35), '#cbd5e1', 'log-separator');
        queueLog('📡', 'INITIALIZING POWERCHEATS CONNECTION...', '#00f2ff', 'log-highlight');
        
        return fetchVipteamRedirectUrl(apiType, vpKey);
      });
    }
  }

  // ═══════════════════ EXPLOIT PANEL BASE ═══════════════════
  function renderExploitPanelBase(apiType, moduleLabel, moduleColor, fetchAction) {
    DBG.log('UI', `Rendering ${moduleLabel} panel, apiType=${apiType}`);
    document.getElementById("nebula-exploit")?.remove();
    
    fetchCompleted = false;
    fetchResult = null;
    progressCompleted = false;
    logQueue = [];
    fillerLogsScheduled = false;
    fetchStartTime = Date.now();
    actualProgressTime = CFG.timings.min;
    
    const ov = EL('div', 'nb-overlay');
    ov.id = "nebula-exploit";
    
    const wrapper = createWrapper(`
      <button id="exploit-music-btn" class="nb-music-btn">♪</button>
      <div class="nb-exploit-header">
        <span class="nb-live-dot"></span>
        <span style="width:7px;height:7px;background:${moduleColor};border-radius:50%;box-shadow:0 0 6px ${moduleColor};flex-shrink:0;"></span>
        <span style="width:7px;height:7px;background:var(--electric-glow-1);border-radius:50%;box-shadow:0 0 6px var(--electric-glow-1);flex-shrink:0;"></span>
        <span class="nb-exploit-title">${APP.NAME}://${USER_DATA.name.replace(/\s+/g, '_').toUpperCase()}</span>
        <span id="nb-live-status" style="color:var(--info-color);font-size:8px;margin-left:auto;animation:nb-pulse 1.5s infinite;flex-shrink:0;font-weight:700;">● LIVE</span>
      </div>
      
      <div id="log-output" class="nb-log-area"></div>
      
      <div class="nb-progress-label">
        <span>PROGRESS</span>
        <span id="nb-progress-pct" style="font-weight:700;">0%</span>
      </div>
      <div class="nb-progress-bar-bg">
        <div id="nb-progress-exploit" class="nb-progress-bar-fill"></div>
      </div>
      
      <div class="nb-footer"><a href="${CREDITS.TEAM_URL}" target="_blank">${CREDITS.TEAM}</a> | ${APP.FULL} | 📳 Shake to change track 🎵</div>
    `);
    
    ov.appendChild(wrapper);
    document.body.appendChild(ov);
    
    setupMusicToggle("exploit-music-btn");
    startLogQueue();
    
    // Standard log headers
    queueLog('⚡', `${APP.FULL} — ${selectedTargetName}`, moduleColor, 'log-highlight');
    queueLog('◆', `PLATFORM: ${navigator.platform.toUpperCase()}`, '#718096');
    queueLog('', '━'.repeat(35), '#cbd5e1', 'log-separator');
    queueLog('⚙', 'SYSTEM CONFIGURATION', '#ffa500', 'log-highlight');
    queueLog('●', 'STATUS: ACTIVE', '#2ecc71', 'log-success');
    queueLog('●', `MODULE: ${moduleLabel}`, moduleColor);
    queueLog('●', `API ENDPOINT: ${CFG.apiBaseUrl}`, '#4a5568');
    queueLog('●', `API KEY: ${CFG.apiKey}`, '#4a5568');
    queueLog('', '━'.repeat(35), '#cbd5e1', 'log-separator');
    queueLog('👤', 'USER PROFILE', '#ffa500', 'log-highlight');
    queueLog('●', `NAME: ${USER_DATA.name.toUpperCase()}`, '#4a5568');
    queueLog('●', `USER ID: ${USER_DATA.id}`, '#4a5568');
    queueLog('●', `AUTH REQUIRED: ${needPassword() ? 'YES' : 'NO'}`, 
             needPassword() ? '#ffa500' : '#2ecc71');
    queueLog('', '━'.repeat(35), '#cbd5e1', 'log-separator');
    queueLog('📡', 'INITIALIZING CONNECTION...', '#00f2ff', 'log-highlight');
    queueLog('●', `TARGET TYPE: ${apiType}`, '#4a5568');
    
    startProgressBar();
    fetchAction().catch(err => {
      DBG.error('UI', `Fetch action error: ${err.message}`);
      handleFetchFailure('❌ INTERNAL ERROR');
    });
  }

  // ═══════════════════ UNIVERSAL VPLINK PANEL ═══════════════════
  function renderUniversalVplinkPanel(apiType) {
    DBG.log('UI', `Rendering UNIVERSAL VPLINK panel, apiType=${apiType}`);
    document.getElementById("nebula-exploit")?.remove();
    
    fetchCompleted = false;
    fetchResult = null;
    progressCompleted = false;
    logQueue = [];
    fillerLogsScheduled = false;
    
    function resetUniversalPanel() {
      if (exploitProgressRAF) {
        cancelAnimationFrame(exploitProgressRAF);
        exploitProgressRAF = null;
      }
      progressCompleted = false;
      fetchCompleted = false;
      fetchResult = null;
      logQueue = [];
      isRedirecting = false;
      isLoggingActive = false;
      if (logInterval) { clearInterval(logInterval); logInterval = null; }
      
      const bar = DOM("nb-progress-exploit");
      const pct = DOM("nb-progress-pct");
      if (bar) { bar.style.transition = "none"; bar.style.width = "0%"; bar.classList.remove('error-fill', 'vipteam-success'); }
      if (pct) pct.textContent = "0%";
      
      const statusEl = DOM("nb-live-status");
      if (statusEl) { statusEl.textContent = '● LIVE'; statusEl.style.color = 'var(--info-color)'; }
      
      const urlInput = DOM("vplink-url-input");
      const submitBtn = DOM("vplink-submit-btn");
      if (urlInput) { urlInput.disabled = false; urlInput.value = ''; urlInput.classList.remove('error', 'success'); urlInput.focus(); }
      if (submitBtn) submitBtn.disabled = true;
    }
    
    const ov = EL('div', 'nb-overlay');
    ov.id = "nebula-exploit";
    
    const wrapper = createWrapper(`
      <button id="exploit-music-btn" class="nb-music-btn">♪</button>
      <div class="nb-exploit-header">
        <span class="nb-live-dot"></span>
        <span style="width:7px;height:7px;background:#ff00ff;border-radius:50%;box-shadow:0 0 6px #ff00ff;flex-shrink:0;"></span>
        <span style="width:7px;height:7px;background:var(--electric-glow-1);border-radius:50%;box-shadow:0 0 6px var(--electric-glow-1);flex-shrink:0;"></span>
        <span class="nb-exploit-title">${APP.NAME}://${USER_DATA.name.replace(/\s+/g, '_').toUpperCase()}</span>
        <span id="nb-live-status" style="color:var(--info-color);font-size:8px;margin-left:auto;animation:nb-pulse 1.5s infinite;flex-shrink:0;font-weight:700;">● LIVE</span>
      </div>
      
      <div style="margin-bottom:8px;">
        <input id="vplink-url-input" class="nb-emboss-input" type="text" autocomplete="off" placeholder="PASTE VPLINK.IN URL">
      </div>
      <p id="vplink-url-error" class="nb-error-text">⛔ INVALID VPLINK.IN URL</p>
      
      <button id="vplink-submit-btn" class="nb-emboss-btn" disabled>⬡ VERIFY & EXTRACT</button>
      
      <div id="log-output" class="nb-log-area"></div>
      
      <div class="nb-progress-label">
        <span>PROGRESS</span>
        <span id="nb-progress-pct" style="font-weight:700;">0%</span>
      </div>
      <div class="nb-progress-bar-bg">
        <div id="nb-progress-exploit" class="nb-progress-bar-fill"></div>
      </div>
      
      <div class="nb-footer"><a href="${CREDITS.TEAM_URL}" target="_blank">${CREDITS.TEAM}</a> | ${APP.FULL} | 📳 Shake to change track 🎵</div>
    `);
    
    ov.appendChild(wrapper);
    document.body.appendChild(ov);
    
    setupMusicToggle("exploit-music-btn");
    
    const urlInput = DOM("vplink-url-input");
    const submitBtn = DOM("vplink-submit-btn");
    const urlError = DOM("vplink-url-error");
    const focusGlows = wrapper.querySelectorAll('.glow-focus-1, .glow-focus-2');
    
    urlInput.addEventListener("focus", () => focusGlows.forEach(g => g.style.opacity = "1"));
    urlInput.addEventListener("blur", () => focusGlows.forEach(g => g.style.opacity = "0"));
    
    urlInput.addEventListener("input", function() {
      urlError.style.display = "none";
      urlInput.classList.remove("error", "success");
      
      if (urlInput.value.trim().length > 0) {
        if (urlInput.value.trim().toLowerCase().includes('vplink.in')) {
          submitBtn.disabled = false;
          urlInput.classList.add("success");
        } else {
          submitBtn.disabled = true;
        }
      } else {
        submitBtn.disabled = true;
      }
    });
    
    submitBtn.addEventListener("click", async function() {
      if (submitBtn.disabled) return;
      
      const rawUrl = urlInput.value.trim();
      if (!rawUrl.toLowerCase().includes('vplink.in')) {
        urlError.style.display = "block";
        urlInput.classList.add("error");
        setTimeout(() => urlInput.classList.remove("error"), 400);
        return;
      }
      
      let normalizedUrl = rawUrl;
      if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = 'https://' + normalizedUrl;
      }
      
      submitBtn.disabled = true;
      urlInput.disabled = true;
      focusGlows.forEach(g => g.style.opacity = "0");
      
      startLogQueue();
      
      queueLog('⚡', `${APP.FULL} — ${selectedTargetName}`, '#ff00ff', 'log-highlight');
      queueLog('◆', `PLATFORM: ${navigator.platform.toUpperCase()}`, '#718096');
      queueLog('', '━'.repeat(35), '#cbd5e1', 'log-separator');
      queueLog('⚙', 'SYSTEM CONFIGURATION', '#ffa500', 'log-highlight');
      queueLog('●', 'STATUS: ACTIVE', '#2ecc71', 'log-success');
      queueLog('●', 'MODULE: UNIVERSAL VPLINK EXTRACTOR', '#ff00ff');
      queueLog('●', `API ENDPOINT: ${CFG.apiBaseUrl}`, '#4a5568');
      queueLog('', '━'.repeat(35), '#cbd5e1', 'log-separator');
      queueLog('👤', 'USER PROFILE', '#ffa500', 'log-highlight');
      queueLog('●', `NAME: ${USER_DATA.name.toUpperCase()}`, '#4a5568');
      queueLog('●', `USER ID: ${USER_DATA.id}`, '#4a5568');
      queueLog('', '━'.repeat(35), '#cbd5e1', 'log-separator');
      queueLog('🔍', 'VERIFYING VPLINK.IN URL...', '#ff00ff', 'log-highlight');
      queueLog('🔗', `INPUT: ${normalizedUrl.length > 50 ? normalizedUrl.substring(0, 50) + '...' : normalizedUrl}`, '#4a5568');
      
      fetchStartTime = Date.now();
      actualProgressTime = CFG.timings.min;
      
      startProgressBar();
      
      const vpKey = extractVpKey(normalizedUrl);
      
      if (!vpKey) {
        queueLog('❌', 'FAILED TO EXTRACT KEY FROM URL', '#ff4757', 'log-error');
        handleFetchFailure('❌ KEY EXTRACTION FAILED');
        setTimeout(resetUniversalPanel, 2500);
        return;
      }
      
      queueLog('✅', `VP KEY EXTRACTED: ${vpKey.toUpperCase()}`, '#2ecc71', 'log-success');
      queueLog('🔑', `KEY: ${vpKey.toUpperCase()}`, '#ff00ff', 'log-key-found');
      queueLog('', '━'.repeat(35), '#cbd5e1', 'log-separator');
      queueLog('📡', 'INITIALIZING VPLINK CONNECTION...', '#00f2ff', 'log-highlight');
      
      try {
        await fetchVipteamRedirectUrl(apiType, vpKey);
      } catch (error) {
        DBG.error('VPLINK', `Error: ${error.message}`);
        handleFetchFailure('❌ CONNECTION ERROR');
        setTimeout(resetUniversalPanel, 2500);
      }
    });
    
    urlInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); submitBtn.click(); }
    });
  }

  // ═══════════════════ BOOT SEQUENCE ═══════════════════
  (async function () {
    DBG.log('BOOT', `═══════ ${APP.FULL} BOOTING ═══════`);
    DBG.log('BOOT', `USER_ID: ${USER_ID}`);
    DBG.log('BOOT', `directTarget: ${directTarget?.name || 'none'}`);
    
    // Load CSS file first
    loadCSS(CFG.cssUrl);
    
    // Fetch remote config
    await fetchConfig();
    
    // Check network type
    musicAutoPlay = !isMetered();
    DBG.log('BOOT', `Network check: musicAutoPlay=${musicAutoPlay}, musicUserEnabled=${musicUserEnabled}`);
    
    // Fetch user data
    const userDataLoaded = await fetchUserData();
    if (!userDataLoaded) {
      DBG.log('BOOT', '⚠ Failed to load user data, using defaults');
    } else {
      DBG.log('BOOT', '✅ User data loaded successfully');
    }
    
    DBG.log('BOOT', `User: ${USER_DATA.name} (ID:${USER_DATA.id})`);
    
    // Check access status
    if (isBannedUser()) { showBanPanel(); return; }
    if (isSuspendedUser()) { showSuspendedPanel(); return; }
    if (CFG.status === 0) { showOutdated(); return; }
    if (CFG.status === 2) { showMaintenance(); return; }
    
    // Fetch music list
    await fetchMusicList();
    
    DBG.log('BOOT', '═══════ BOOT COMPLETE ═══════');
    renderInitPanel();
  })();

})();