/* 核心：状态、存储、通用组件 */
(function () {
  'use strict';

  var App = window.App = {};
  var KEY = 'anchor.personal.v1';

  /* ---------- 小工具 ---------- */

  App.uid = function (prefix) {
    return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  };

  App.el = function (tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') node.className = v;
        else if (k === 'text') node.textContent = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k === 'style') node.style.cssText = v;
        else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'dataset') Object.assign(node.dataset, v);
        else node.setAttribute(k, v === true ? '' : v);
      });
    }
    if (children !== null && children !== undefined) {
      (Array.isArray(children) ? children : [children]).forEach(function (c) {
        if (c === null || c === undefined || c === false) return;
        node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
      });
    }
    return node;
  };

  App.clear = function (node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  };

  App.pad = function (n) { return n < 10 ? '0' + n : String(n); };

  var WEEK = ['日', '一', '二', '三', '四', '五', '六'];

  /** 完整时间：10月18日 15:46 */
  App.fmtDate = function (iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + App.pad(d.getHours()) + ':' + App.pad(d.getMinutes());
  };

  /** 带星期：周六 15:46 */
  App.fmtWeek = function (iso) {
    var d = new Date(iso);
    return '周' + WEEK[d.getDay()] + ' ' + App.pad(d.getHours()) + ':' + App.pad(d.getMinutes());
  };

  /** 列表用：今天 / 昨天 / 10月16日 */
  App.fmtDay = function (iso) {
    var d = new Date(iso);
    var today = new Date();
    var sameDay = function (a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); };
    if (sameDay(d, today)) return '今天';
    var y = new Date(today.getTime() - 86400000);
    if (sameDay(d, y)) return '昨天';
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
  };

  App.nowLocalInput = function () {
    var d = new Date();
    return d.getFullYear() + '-' + App.pad(d.getMonth() + 1) + '-' + App.pad(d.getDate()) +
      'T' + App.pad(d.getHours()) + ':' + App.pad(d.getMinutes());
  };

  App.startOfDay = function (d) {
    var x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };

  /** 复制到剪贴板，失败时退化为选中文本 */
  App.copy = function (text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        App.toast('已复制');
      }, function () {
        App.toast('复制失败，请手动选择');
      });
    } else {
      App.toast('当前环境不支持自动复制');
    }
  };

  App.icon = function (name, cls) {
    var p = {
      plus: '<path d="M12 5v14M5 12h14"/>',
      edit: '<path d="M4 20h4l10-10-4-4L4 16z"/><path d="M13.5 5.5l4 4"/>',
      trash: '<path d="M4 7h16"/><path d="M9 7V4.5h6V7"/><path d="M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/>',
      close: '<path d="M6 6l12 12M18 6L6 18"/>',
      print: '<path d="M7 9V4h10v5"/><path d="M7 18H5a1 1 0 01-1-1v-6a1 1 0 011-1h14a1 1 0 011 1v6a1 1 0 01-1 1h-2"/><path d="M7 14h10v6H7z"/>',
      lock: '<rect x="4.5" y="10" width="15" height="10" rx="2"/><path d="M8 10V7.5a4 4 0 018 0V10"/>',
      left: '<path d="M14.5 5l-7 7 7 7"/>',
      right: '<path d="M9.5 5l7 7-7 7"/>'
    };
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' +
      (cls ? ' class="' + cls + '"' : '') + '>' + (p[name] || '') + '</svg>';
  };

  /* ---------- 状态 ---------- */

  function seedPlanb() {
    var out = {};
    window.AnchorData.planb.forEach(function (sc) {
      out[sc.key] = {
        sections: sc.sections.map(function (sec, si) {
          return {
            id: sc.key + '-s' + si,
            title: sec.title,
            items: sec.items.map(function (t, ii) {
              return { id: sc.key + '-s' + si + '-i' + ii, text: t, done: false };
            }),
            note: ''
          };
        })
      };
    });
    return out;
  }

  App.defaults = function () {
    return {
      app: 'anchor',
      version: 1,
      createdAt: new Date().toISOString(),
      constitution: { values: [], principles: [], boundaries: [] },
      attention: { entries: [] },
      estate: { accounts: [], files: [], letters: [], contacts: [] },
      planb: seedPlanb()
    };
  };

  function ensureShape(s) {
    var d = App.defaults();
    if (!s || typeof s !== 'object') return d;
    s.app = 'anchor';
    s.version = 1;
    s.createdAt = s.createdAt || d.createdAt;
    ['values', 'principles', 'boundaries'].forEach(function (k) {
      if (!Array.isArray(s.constitution && s.constitution[k])) {
        s.constitution = s.constitution || {};
        s.constitution[k] = [];
      }
    });
    if (!s.attention || !Array.isArray(s.attention.entries)) s.attention = { entries: [] };
    s.estate = s.estate || {};
    ['accounts', 'files', 'letters', 'contacts'].forEach(function (k) {
      if (!Array.isArray(s.estate[k])) s.estate[k] = [];
    });
    if (!s.planb || typeof s.planb !== 'object') s.planb = d.planb;
    // 补齐缺失的情景
    Object.keys(d.planb).forEach(function (k) {
      if (!s.planb[k] || !Array.isArray(s.planb[k].sections)) s.planb[k] = d.planb[k];
    });
    return s;
  }

  App.load = function () {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { raw = null; }
    if (!raw) return App.defaults();
    try { return ensureShape(JSON.parse(raw)); } catch (e) { return App.defaults(); }
  };

  var saveTimer = null;

  App.setSaveState = function (text, saving) {
    var box = document.getElementById('saveState');
    var label = document.getElementById('saveText');
    if (!box || !label) return;
    label.textContent = text;
    box.classList.toggle('is-saving', !!saving);
  };

  App.save = function (immediate) {
    App.setSaveState('保存中', true);
    var run = function () {
      try {
        localStorage.setItem(KEY, JSON.stringify(App.state));
        var d = new Date();
        App.setSaveState('已保存 · ' + App.pad(d.getHours()) + ':' + App.pad(d.getMinutes()), false);
      } catch (e) {
        App.setSaveState('保存失败：浏览器存储不可用', false);
      }
    };
    if (immediate) { clearTimeout(saveTimer); run(); return; }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(run, 320);
  };

  /* ---------- 提示与模态框 ---------- */

  App.toast = function (msg) {
    var root = document.getElementById('toastRoot');
    while (root.children.length >= 2) root.removeChild(root.firstChild);
    var t = App.el('div', { class: 'toast', text: msg });
    root.appendChild(t);
    setTimeout(function () {
      t.style.transition = 'opacity 200ms ease';
      t.style.opacity = '0';
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 220);
    }, 2100);
  };

  var modalState = { onClose: null };

  /** 模态框或全屏视图打开时锁住背景滚动 */
  function syncLock() {
    var m = document.getElementById('modalRoot');
    var o = document.getElementById('overlay');
    document.body.classList.toggle('is-locked', !m.hidden || !o.hidden);
  }

  App.closeModal = function () {
    var root = document.getElementById('modalRoot');
    if (root.hidden) return;
    root.hidden = true;
    App.clear(document.getElementById('modalBody'));
    App.clear(document.getElementById('modalFoot'));
    var cb = modalState.onClose;
    modalState.onClose = null;
    syncLock();
    if (cb) cb();
  };

  App.openModal = function (opts) {
    var root = document.getElementById('modalRoot');
    var body = document.getElementById('modalBody');
    var foot = document.getElementById('modalFoot');
    var title = document.getElementById('modalTitle');
    var box = root.querySelector('.modal');

    title.textContent = opts.title || '';
    box.classList.toggle('is-wide', !!opts.wide);
    App.clear(body);
    App.clear(foot);
    modalState.onClose = opts.onClose || null;

    if (opts.body) {
      if (typeof opts.body === 'string') body.innerHTML = opts.body;
      else body.appendChild(opts.body);
    }

    (opts.actions || []).forEach(function (a) {
      var btn = App.el('button', {
        class: 'btn ' + (a.variant === 'primary' ? 'btn-primary' : a.variant === 'ghost' ? 'btn-ghost' : '') + (a.spacer ? ' spacer' : ''),
        type: 'button',
        text: a.label,
        onclick: function () {
          if (a.onClick) {
            var keep = a.onClick(App.closeModal);
            if (keep === false) return;
          }
          App.closeModal();
        }
      });
      foot.appendChild(btn);
    });

    root.hidden = false;
    syncLock();
    var focusable = body.querySelector('input, textarea, select, button');
    if (focusable) setTimeout(function () { focusable.focus(); }, 40);
    else setTimeout(function () { document.getElementById('modalClose').focus(); }, 40);
  };

  App.confirm = function (opts) {
    return new Promise(function (resolve) {
      var body = App.el('div', null, [
        App.el('p', { text: opts.message || '' }),
        opts.detail ? App.el('p', { class: 'p-note', style: 'margin-top:8px;font-size:11.5px;color:var(--ink-3);line-height:1.8', text: opts.detail }) : null
      ]);
      App.openModal({
        title: opts.title || '确认一下',
        body: body,
        actions: [
          { label: '取消', variant: 'ghost', onClick: function () { resolve(false); } },
          { label: opts.confirmLabel || '确认', variant: 'primary', onClick: function () { resolve(true); } }
        ],
        onClose: function () { resolve(false); }
      });
    });
  };

  /**
   * 通用表单模态框
   * fields: [{key,label,type,placeholder,required,hint,rows,options:[{value,label}]}]
   */
  App.formModal = function (opts) {
    var values = Object.assign({}, opts.values || {});
    var form = App.el('form', { class: 'modal-form' });

    opts.fields.forEach(function (f) {
      var input;
      if (f.type === 'textarea') {
        input = App.el('textarea', {
          class: 'input textarea', rows: f.rows || 4, placeholder: f.placeholder || '',
          maxlength: f.maxlength || 2000
        });
        input.value = values[f.key] || '';
      } else if (f.type === 'select') {
        input = App.el('select', { class: 'input' });
        (f.options || []).forEach(function (o) {
          var op = App.el('option', { value: o.value, text: o.label });
          if (String(values[f.key] || '') === String(o.value)) op.selected = true;
          input.appendChild(op);
        });
      } else {
        input = App.el('input', {
          class: 'input', type: f.type || 'text', placeholder: f.placeholder || '',
          maxlength: f.maxlength || 200, value: values[f.key] || ''
        });
      }
      input.name = f.key;
      input.addEventListener('input', function () { input.classList.remove('is-error'); });
      form.appendChild(App.el('label', { class: 'field' }, [
        App.el('span', { class: 'field-label', text: f.label + (f.required ? ' · 必填' : '') }),
        input,
        f.hint ? App.el('span', { class: 'field-label', style: 'margin:6px 0 0;letter-spacing:0;line-height:1.6', text: f.hint }) : null
      ]));
    });

    var submit = function () {
      var out = {};
      var invalid = null;
      opts.fields.forEach(function (f) {
        var node = form.querySelector('[name="' + f.key + '"]');
        var v = node ? node.value.trim() : '';
        if (f.required && !v) {
          node.classList.add('is-error');
          if (!invalid) invalid = node;
        }
        out[f.key] = v;
      });
      if (invalid) {
        invalid.focus();
        App.toast('还有必填项没写');
        return false;
      }
      if (opts.onSubmit) opts.onSubmit(out);
      return true;
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (submit()) App.closeModal();
    });

    App.openModal({
      title: opts.title,
      wide: opts.wide,
      body: form,
      actions: [
        { label: '取消', variant: 'ghost' },
        { label: opts.submitLabel || '保存', variant: 'primary', onClick: function () { return submit(); } }
      ]
    });
  };

  /* ---------- 全屏视图 ---------- */

  App.openOverlay = function (builder) {
    var overlay = document.getElementById('overlay');
    var inner = document.getElementById('overlayInner');
    App.clear(inner);
    builder(inner);
    overlay.hidden = false;
    overlay.scrollTop = 0;
    syncLock();
  };

  App.closeOverlay = function () {
    var overlay = document.getElementById('overlay');
    overlay.hidden = true;
    overlay.classList.remove('is-top');
    App.clear(document.getElementById('overlayInner'));
    syncLock();
    var cb = App.onOverlayClose;
    App.onOverlayClose = null;
    if (cb) cb();
  };

  /* ---------- 打印 ---------- */

  App.printHTML = function (html) {
    var root = document.getElementById('printRoot');
    root.innerHTML = html;
    window.print();
  };

  App.printHead = function (title, sub) {
    var d = new Date();
    return '<h1>' + title + '</h1><p class="p-meta">' + (sub || '') +
      '　·　' + d.getFullYear() + ' 年 ' + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日 打印</p>';
  };

  App.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  };

  /* ---------- 加密与导入导出 ---------- */

  function b64(buf) {
    var bytes = new Uint8Array(buf);
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }

  function unb64(str) {
    var s = atob(str);
    var out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }

  function deriveKey(pass, salt) {
    var enc = new TextEncoder();
    return crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey'])
      .then(function (km) {
        return crypto.subtle.deriveKey(
          { name: 'PBKDF2', salt: salt, iterations: 180000, hash: 'SHA-256' },
          km, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
        );
      });
  }

  App.encrypt = function (obj, pass) {
    var enc = new TextEncoder();
    var salt = crypto.getRandomValues(new Uint8Array(16));
    var iv = crypto.getRandomValues(new Uint8Array(12));
    return deriveKey(pass, salt).then(function (key) {
      return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, enc.encode(JSON.stringify(obj)));
    }).then(function (ct) {
      return {
        app: 'anchor',
        encrypted: true,
        version: 1,
        alg: 'AES-GCM / PBKDF2-SHA256 / 180000',
        createdAt: new Date().toISOString(),
        salt: b64(salt),
        iv: b64(iv),
        payload: b64(ct)
      };
    });
  };

  App.decrypt = function (box, pass) {
    var salt = unb64(box.salt);
    var iv = unb64(box.iv);
    return deriveKey(pass, salt).then(function (key) {
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, unb64(box.payload));
    }).then(function (buf) {
      return JSON.parse(new TextDecoder().decode(buf));
    });
  };

  App.download = function (filename, obj) {
    var blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = App.el('a', { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
  };

  App.todayStamp = function () {
    var d = new Date();
    return d.getFullYear() + '-' + App.pad(d.getMonth() + 1) + '-' + App.pad(d.getDate());
  };

  App.promptPassphrase = function (title, note, callback) {
    var form = App.el('form', { class: 'modal-form' }, [
      App.el('p', { style: 'margin-bottom:14px', text: note }),
      App.el('label', { class: 'field' }, [
        App.el('span', { class: 'field-label', text: '口令' }),
        App.el('input', { class: 'input', type: 'password', id: 'passInput', autocomplete: 'new-password', placeholder: '至少 6 位，越长越好' })
      ]),
      App.el('label', { class: 'field' }, [
        App.el('span', { class: 'field-label', text: '再输一次（防手滑）' }),
        App.el('input', { class: 'input', type: 'password', id: 'passInput2', autocomplete: 'new-password' })
      ]),
      App.el('p', { class: 'p-note', style: 'font-size:11.5px;color:var(--ink-3);line-height:1.8', text: '这个口令不会被保存在任何地方。忘了就再也打不开那份文件。' })
    ]);

    var run = function () {
      var p1 = form.querySelector('#passInput').value;
      var p2 = form.querySelector('#passInput2').value;
      if (p1.length < 6) { App.toast('口令至少 6 位'); return false; }
      if (p1 !== p2) { App.toast('两次输入不一致'); return false; }
      callback(p1);
      return true;
    };
    form.addEventListener('submit', function (e) { e.preventDefault(); if (run()) App.closeModal(); });

    App.openModal({
      title: title,
      body: form,
      actions: [
        { label: '取消', variant: 'ghost' },
        { label: '生成文件', variant: 'primary', onClick: run }
      ]
    });
  };

  /* ---------- 数据与备份 ---------- */

  /**
   * 加密导出。
   * kind='estate' 只导出数字遗产清单；kind='full' 导出四个模块。
   */
  App.exportEncrypted = function (kind) {
    var estateOnly = kind === 'estate';
    var payload;
    if (estateOnly) {
      var n = App.state.estate.accounts.length + App.state.estate.files.length +
        App.state.estate.letters.length + App.state.estate.contacts.length;
      if (!n) { App.toast('清单还是空的，先写一条'); return; }
      payload = {
        app: 'anchor',
        kind: 'estate',
        exportedAt: new Date().toISOString(),
        estate: App.state.estate
      };
    } else {
      payload = Object.assign({}, App.state, { exportedAt: new Date().toISOString() });
    }

    if (!window.crypto || !window.crypto.subtle) {
      App.toast('当前浏览器不支持加密，请用 localhost 或 https 打开');
      return;
    }

    App.promptPassphrase(
      '生成加密文件',
      estateOnly
        ? '这份文件包含账号线索、信件与联系人。请设一个只有你和接手人知道的口令。'
        : '这份文件包含全部四个模块。请设一个只有你自己知道的口令。',
      function (pass) {
        App.encrypt(payload, pass).then(function (box) {
          App.download((estateOnly ? '锚点-交给亲人-' : '锚点-全部数据-') + App.todayStamp() + '.enc.json', box);
          App.toast('加密文件已生成');
        }).catch(function () {
          App.toast('加密失败，请换一个浏览器试试');
        });
      }
    );
  };

  App.openDataModal = function () {
    var counts = [
      ['宪法', App.state.constitution.values.length + App.state.constitution.principles.length + App.state.constitution.boundaries.length],
      ['分心记录', App.state.attention.entries.length],
      ['遗产条目', App.state.estate.accounts.length + App.state.estate.files.length + App.state.estate.letters.length + App.state.estate.contacts.length],
      ['应急条目', (function () {
        var n = 0;
        Object.keys(App.state.planb).forEach(function (k) {
          App.state.planb[k].sections.forEach(function (s) { n += s.items.length; });
        });
        return n;
      })()]
    ];

    var body = App.el('div', null, [
      App.el('p', { style: 'margin-bottom:14px', text: '这里的数据只存在这台电脑的浏览器里。清理浏览器数据、换电脑、换浏览器配置，都会让它消失。' }),
      App.el('div', { class: 'kv-list', style: 'margin-bottom:18px' }, counts.map(function (c) {
        return App.el('div', { class: 'kv' }, [
          App.el('span', { class: 'kv-k', text: c[0] }),
          App.el('span', { class: 'kv-v', text: c[1] + ' 条' })
        ]);
      })),
      App.el('div', { style: 'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:6px' }, [
        App.el('button', {
          class: 'btn btn-primary', type: 'button', text: '导出全部（明文 JSON）',
          onclick: function () {
            App.download('锚点-数据-' + App.todayStamp() + '.json', App.state);
            App.toast('已导出');
          }
        }),
        App.el('button', {
          class: 'btn', type: 'button', html: App.icon('lock') + '<span>加密导出</span>',
          onclick: function () { App.exportEncrypted('full'); }
        }),
        App.el('button', {
          class: 'btn', type: 'button', text: '从文件导入',
          onclick: function () { App.pickImport(); }
        })
      ]),
      App.el('p', { class: 'p-note', style: 'margin-top:8px;font-size:11px;color:var(--ink-3);line-height:1.8', text: '明文导出可读性最好，适合自己备份；涉及账号线索时请优先使用加密导出。' })
    ]);

    App.openModal({
      title: '数据与备份',
      body: body,
      actions: [
        {
          label: '清空全部数据', variant: 'ghost', spacer: true,
          onClick: function () { App.confirmWipe(); return false; }
        },
        { label: '关闭', variant: 'primary' }
      ]
    });
  };

  App.confirmWipe = function () {
    var body = App.el('div', null, [
      App.el('p', { text: '这会删掉四个模块里的所有内容，并且不能撤销。建议先导出一份备份。' }),
      App.el('label', { class: 'field', style: 'margin-top:14px' }, [
        App.el('span', { class: 'field-label', text: '输入「清空」以确认' }),
        App.el('input', { class: 'input', id: 'wipeInput', placeholder: '清空' })
      ])
    ]);
    App.openModal({
      title: '清空全部数据',
      body: body,
      actions: [
        { label: '取消', variant: 'ghost' },
        {
          label: '确认清空', variant: 'primary',
          onClick: function () {
            var v = document.getElementById('wipeInput');
            if (!v || v.value.trim() !== '清空') { App.toast('请输入「清空」'); return false; }
            App.state = App.defaults();
            App.save(true);
            App.renderAll();
            App.toast('已清空');
          }
        }
      ]
    });
  };

  App.pickImport = function () {
    var input = App.el('input', { type: 'file', accept: '.json,application/json', style: 'display:none' });
    document.body.appendChild(input);
    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      document.body.removeChild(input);
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        var data;
        try { data = JSON.parse(String(reader.result)); } catch (e) { App.toast('文件不是有效的 JSON'); return; }
        if (data && data.encrypted) {
          App.openDecryptModal(data);
          return;
        }
        App.applyImport(data);
      };
      reader.readAsText(file);
    });
    input.click();
  };

  App.openDecryptModal = function (box) {
    var body = App.el('div', null, [
      App.el('p', { text: '这份文件已加密。输入当时设置的口令。' }),
      App.el('label', { class: 'field', style: 'margin-top:14px' }, [
        App.el('span', { class: 'field-label', text: '口令' }),
        App.el('input', { class: 'input', type: 'password', id: 'decInput', autocomplete: 'current-password' })
      ]),
      App.el('p', { class: 'p-note', id: 'decMsg', style: 'font-size:11.5px;color:var(--ink-3);min-height:18px' })
    ]);
    var run = function () {
      var p = document.getElementById('decInput').value;
      if (!p) { App.toast('请输入口令'); return false; }
      App.decrypt(box, p).then(function (data) {
        App.closeModal();
        App.applyImport(data);
      }).catch(function () {
        document.getElementById('decMsg').textContent = '口令不对，或文件已损坏。';
      });
      return false;
    };
    App.openModal({
      title: '打开加密备份',
      body: body,
      actions: [
        { label: '取消', variant: 'ghost' },
        { label: '解密并导入', variant: 'primary', onClick: run }
      ]
    });
    var input = document.getElementById('decInput');
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); run(); } });
  };

  App.applyImport = function (data) {
    if (!data || data.app !== 'anchor') { App.toast('这不是锚点的备份文件'); return; }
    var estateOnly = data.kind === 'estate';
    App.confirm({
      title: estateOnly ? '导入数字遗产清单' : '导入会覆盖现在的内容',
      message: estateOnly
        ? '这个文件里只有数字遗产清单，导入后只替换这一部分，其他三个模块不动。'
        : '文件里的四个模块会替换掉这台电脑上现有的记录。',
      detail: '如果现在的内容还要，请先取消并导出一份。',
      confirmLabel: '导入'
    }).then(function (ok) {
      if (!ok) return;
      var incoming = ensureShape(data);
      if (estateOnly) App.state.estate = incoming.estate;
      else App.state = incoming;
      App.save(true);
      App.renderAll();
      App.toast('已导入');
    });
  };

  /* ---------- 模块切换 ---------- */

  App.currentView = 'constitution';

  App.go = function (view) {
    if (!view) view = 'constitution';
    App.currentView = view;
    document.querySelectorAll('.nav-item').forEach(function (b) {
      b.classList.toggle('is-active', b.dataset.view === view);
    });
    document.querySelectorAll('.view').forEach(function (v) {
      v.classList.toggle('is-active', v.id === 'view-' + view);
    });
    if (location.hash !== '#' + view) {
      try { history.replaceState(null, '', '#' + view); } catch (e) { /* file:// 下忽略 */ }
    }
    var main = document.getElementById('main');
    if (main) window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    if (App.render[view]) App.render[view]();
  };

  App.render = {};

  App.renderAll = function () {
    Object.keys(App.render).forEach(function (k) {
      if (k === App.currentView) App.render[k]();
    });
    if (App.currentView === 'attention' && App.renderAttentionStats) App.renderAttentionStats();
  };
})();
