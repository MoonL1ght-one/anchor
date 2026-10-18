/* 模块三：数字遗产清单 */
(function () {
  'use strict';
  var App = window.App;
  var D = window.AnchorData;

  var tab = 'accounts';

  function est() { return App.state.estate; }

  function intentLabel(id) {
    for (var i = 0; i < D.intents.length; i++) if (D.intents[i].id === id) return D.intents[i].label;
    return '未定';
  }

  function intentOptions() {
    return D.intents.map(function (i) { return { value: i.id, label: i.label }; });
  }

  /* ---------- 统计 ---------- */

  function renderStats() {
    var box = document.getElementById('estateStats');
    if (!box) return;
    App.clear(box);
    var accounts = est().accounts;
    var decided = accounts.filter(function (a) { return !!a.intent; }).length;
    var decidedPct = accounts.length ? Math.round((decided / accounts.length) * 100) + '%' : '—';
    var stats = [
      [accounts.length, '个账号', '有线索的账号'],
      [decidedPct, '', '账号已写明处置'],
      [est().letters.length, '封信', '留给具体的人'],
      [est().contacts.length, '位联系人', '出事时该打给谁']
    ];
    stats.forEach(function (s) {
      box.appendChild(App.el('div', { class: 'stat' }, [
        App.el('p', { class: 'stat-num', html: String(s[0]) + (s[1] ? '<span>' + s[1] + '</span>' : '') }),
        App.el('p', { class: 'stat-label', text: s[2] })
      ]));
    });
    document.getElementById('tabCountAccounts').textContent = accounts.length;
    document.getElementById('tabCountFiles').textContent = est().files.length;
    document.getElementById('tabCountLetters').textContent = est().letters.length;
    document.getElementById('tabCountContacts').textContent = est().contacts.length;
  }

  /* ---------- 面板 ---------- */

  function renderPanel() {
    var box = document.getElementById('estatePanels');
    if (!box) return;
    App.clear(box);
    box.appendChild(({ accounts: panelAccounts, files: panelFiles, letters: panelLetters, contacts: panelContacts })[tab]());
  }

  function panelHead(hint, addLabel, onAdd) {
    return App.el('div', { class: 'panel-head' }, [
      App.el('p', { class: 'panel-hint', text: hint }),
      App.el('button', { class: 'btn btn-sm', type: 'button', html: App.icon('plus') + '<span>' + addLabel + '</span>', onclick: onAdd })
    ]);
  }

  function emptyBox(title, sub, label, onAdd) {
    return App.el('div', { class: 'empty-state' }, [
      App.el('p', { class: 'empty-title', text: title }),
      App.el('p', { class: 'empty-sub', text: sub }),
      App.el('button', { class: 'btn btn-sm', type: 'button', text: label, onclick: onAdd })
    ]);
  }

  /* ---------- 账号 ---------- */

  function panelAccounts() {
    var wrap = App.el('div', null, [
      panelHead('只写密码提示，不写密码本身：比如「常用名 + 出生年」或「写在蓝色笔记本第 12 页」。这样文件泄露也不会直接变成损失。', '添加账号', function () { accountForm(); })
    ]);
    var list = est().accounts;

    if (!list.length) {
      wrap.appendChild(emptyBox('还没有账号线索', '从最要紧的开始：邮箱、网银、微信、云盘。', '添加第一个账号', function () { accountForm(); }));
      return wrap;
    }

    var box = App.el('div', { class: 'estate-list' });
    list.forEach(function (a) {
      box.appendChild(App.el('div', { class: 'estate-row' }, [
        App.el('div', null, [
          App.el('p', { class: 'er-title' }, [
            App.el('span', { text: a.platform || '未命名账号' }),
            App.el('span', { class: 'badge ' + (a.intent ? 'badge-accent' : 'badge-muted'), text: intentLabel(a.intent) })
          ]),
          a.login ? App.el('p', { class: 'er-sub' }, [
            App.el('span', { style: 'color:var(--ink-3)', text: '登录名 ' }),
            App.el('code', { text: a.login })
          ]) : null,
          a.hint ? App.el('p', { class: 'er-sub', style: 'margin-top:2px', text: '密码提示：' + a.hint }) : null,
          a.note ? App.el('p', { class: 'er-note', text: a.note }) : null
        ]),
        App.el('div', { class: 'er-actions' }, [
          App.el('button', { class: 'icon-btn', title: '编辑', html: App.icon('edit'), 'aria-label': '编辑账号', onclick: function () { accountForm(a); } }),
          App.el('button', { class: 'icon-btn', title: '删除', html: App.icon('trash'), 'aria-label': '删除账号', onclick: function () { removeItem('accounts', a, a.platform); } })
        ])
      ]));
    });
    wrap.appendChild(box);
    wrap.appendChild(App.el('p', { class: 'foot-note', text: '名字里带钱、带身份、带回忆的，优先级最高：邮箱（可找回其他账号）、网银、支付、云盘、社交账号。' }));
    return wrap;
  }

  function accountForm(item) {
    var isNew = !item;
    item = item || {};
    App.formModal({
      title: isNew ? '添加账号' : '编辑账号',
      fields: [
        { key: 'platform', label: '平台 / 服务', required: true, placeholder: '例：网易邮箱、招商银行、微信、iCloud' },
        { key: 'login', label: '登录名', placeholder: '手机号 / 邮箱 / 用户名' },
        { key: 'hint', label: '密码提示', placeholder: '只写线索，不要写密码本身', hint: '例：「常用名 + 出生年」「记在蓝色笔记本第 12 页」' },
        { key: 'intent', label: '希望怎么处理', type: 'select', options: [{ value: '', label: '还没想好' }].concat(intentOptions()) },
        { key: 'note', label: '备注', type: 'textarea', rows: 3, placeholder: '这个账号里有什么、谁能处理、要注意什么' }
      ],
      values: item,
      submitLabel: '保存',
      onSubmit: function (v) {
        if (isNew) {
          v.id = App.uid('a');
          est().accounts.push(v);
        } else {
          Object.assign(item, v);
        }
        App.save();
        renderStats();
        renderPanel();
        App.toast('已保存');
      }
    });
  }

  /* ---------- 文件与设备 ---------- */

  function panelFiles() {
    var wrap = App.el('div', null, [
      panelHead('写清楚「在哪」比写「有什么」重要：哪个抽屉、哪台电脑、哪个网盘文件夹。设备要写解锁方式和密码提示。', '添加文件或设备', function () { fileForm(); })
    ]);
    var list = est().files;
    if (!list.length) {
      wrap.appendChild(emptyBox('还没有文件和设备的线索', '证件扫描件、家庭照片、代码仓库、保单、纸质文件存放处。', '添加一项', function () { fileForm(); }));
      return wrap;
    }
    var box = App.el('div', { class: 'estate-list' });
    list.forEach(function (f) {
      box.appendChild(App.el('div', { class: 'estate-row' }, [
        App.el('div', null, [
          App.el('p', { class: 'er-title' }, [
            App.el('span', { text: f.name || '未命名' }),
            f.kind ? App.el('span', { class: 'badge', text: f.kind }) : null
          ]),
          f.location ? App.el('p', { class: 'er-sub', text: '位置：' + f.location }) : null,
          f.note ? App.el('p', { class: 'er-note', text: f.note }) : null
        ]),
        App.el('div', { class: 'er-actions' }, [
          App.el('button', { class: 'icon-btn', title: '编辑', html: App.icon('edit'), 'aria-label': '编辑', onclick: function () { fileForm(f); } }),
          App.el('button', { class: 'icon-btn', title: '删除', html: App.icon('trash'), 'aria-label': '删除', onclick: function () { removeItem('files', f, f.name); } })
        ])
      ]));
    });
    wrap.appendChild(box);
    return wrap;
  }

  function fileForm(item) {
    var isNew = !item;
    item = item || {};
    App.formModal({
      title: isNew ? '添加文件或设备' : '编辑文件或设备',
      fields: [
        { key: 'name', label: '名称', required: true, placeholder: '例：房产证扫描件、家里那台笔记本' },
        { key: 'kind', label: '类型', type: 'select', options: ['证件', '财务', '照片', '代码与作品', '设备', '纸质文件', '其他'].map(function (k) { return { value: k, label: k }; }) },
        { key: 'location', label: '在哪', placeholder: '网盘路径 / 抽屉 / 哪台设备的哪个文件夹' },
        { key: 'note', label: '说明', type: 'textarea', rows: 3, placeholder: '解锁方式、密码提示、需要特别交代的事' }
      ],
      values: item,
      submitLabel: '保存',
      onSubmit: function (v) {
        if (isNew) { v.id = App.uid('f'); est().files.push(v); }
        else Object.assign(item, v);
        App.save();
        renderStats();
        renderPanel();
        App.toast('已保存');
      }
    });
  }

  /* ---------- 信 ---------- */

  function panelLetters() {
    var wrap = App.el('div', null, [
      panelHead('写给具体的人，而不是「给家人」。可以写多封：一封给伴侣，一封给孩子，一封给二十年后才看的人。', '写一封信', function () { letterForm(); })
    ]);
    var list = est().letters;
    if (!list.length) {
      wrap.appendChild(emptyBox('还没有写下的信', '不必等它完美。先写三段：我记得什么、我希望你做什么、我不希望你为我做什么。', '写第一封', function () { letterForm(); }));
      return wrap;
    }
    var grid = App.el('div', { class: 'letter-grid' });
    list.forEach(function (l) {
      var open = function () { letterForm(l); };
      var cardEl = App.el('div', {
        class: 'letter-card', role: 'button', tabindex: '0', 'aria-label': '编辑信件：' + (l.title || '无标题'),
        onclick: open,
        onkeydown: function (ev) {
          if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); open(); }
        }
      }, [
        App.el('div', { class: 'letter-head' }, [
          App.el('span', { class: 'letter-to', text: '给 ' + (l.to || '未署名') + (l.relation ? ' · ' + l.relation : '') }),
          l.trigger ? App.el('span', { class: 'badge badge-accent', text: l.trigger }) : null
        ]),
        App.el('p', { class: 'letter-title', text: l.title || '无标题' }),
        App.el('p', { class: 'letter-excerpt', text: l.body || '（还没有正文）' })
      ]);
      grid.appendChild(cardEl);
    });
    wrap.appendChild(grid);
    return wrap;
  }

  function letterForm(item) {
    var isNew = !item;
    item = item || {};
    App.formModal({
      title: isNew ? '写一封信' : '编辑这封信',
      wide: true,
      fields: [
        { key: 'to', label: '给谁', required: true, placeholder: '名字或称呼' },
        { key: 'relation', label: '关系', placeholder: '例：伴侣、女儿、老友' },
        { key: 'trigger', label: '什么时候可以打开', type: 'select', options: ['我离开后', '我失能时', '生日或纪念日', '现在就可以读'].map(function (k) { return { value: k, label: k }; }) },
        { key: 'title', label: '标题', placeholder: '例：关于那件我一直没说完的事' },
        { key: 'body', label: '正文', type: 'textarea', rows: 10, placeholder: '我知道你可能会……\n我想让你知道……\n我不希望你为我……' }
      ],
      values: item,
      submitLabel: '保存',
      onSubmit: function (v) {
        if (isNew) { v.id = App.uid('l'); est().letters.push(v); }
        else Object.assign(item, v);
        App.save();
        renderStats();
        renderPanel();
        App.toast('已保存');
      }
    });
  }

  /* ---------- 联系人 ---------- */

  function panelContacts() {
    var wrap = App.el('div', null, [
      panelHead('出事时该打给谁：写清「他负责什么」，比只写电话有用得多。第一顺位最好写两个，防止打不通。', '添加联系人', function () { contactForm(); })
    ]);
    var list = est().contacts;
    if (!list.length) {
      wrap.appendChild(emptyBox('还没有关键联系人', '家人、律师、会计师、保险经纪、最可靠的朋友。', '添加联系人', function () { contactForm(); }));
      return wrap;
    }
    var box = App.el('div', { class: 'estate-list' });
    list.forEach(function (c) {
      box.appendChild(App.el('div', { class: 'estate-row' }, [
        App.el('div', null, [
          App.el('p', { class: 'er-title' }, [
            App.el('span', { text: c.name || '未命名' }),
            c.relation ? App.el('span', { class: 'badge', text: c.relation }) : null
          ]),
          c.phone ? App.el('p', { class: 'er-sub' }, [
            App.el('code', { text: c.phone }),
            App.el('button', {
              class: 'link-btn', type: 'button', style: 'margin-left:10px;font-size:11px',
              text: '复制', onclick: function (ev) { ev.stopPropagation(); App.copy(c.phone); }
            })
          ]) : null,
          c.note ? App.el('p', { class: 'er-note', text: c.note }) : null
        ]),
        App.el('div', { class: 'er-actions' }, [
          App.el('button', { class: 'icon-btn', title: '编辑', html: App.icon('edit'), 'aria-label': '编辑', onclick: function () { contactForm(c); } }),
          App.el('button', { class: 'icon-btn', title: '删除', html: App.icon('trash'), 'aria-label': '删除', onclick: function () { removeItem('contacts', c, c.name); } })
        ])
      ]));
    });
    wrap.appendChild(box);
    return wrap;
  }

  function contactForm(item) {
    var isNew = !item;
    item = item || {};
    App.formModal({
      title: isNew ? '添加联系人' : '编辑联系人',
      fields: [
        { key: 'name', label: '姓名', required: true },
        { key: 'relation', label: '关系 / 身份', placeholder: '例：姐姐、家庭律师、保险经纪' },
        { key: 'phone', label: '电话', type: 'tel', placeholder: '含区号更好' },
        { key: 'note', label: '他负责什么', type: 'textarea', rows: 3, placeholder: '例：第一时间通知他；他知道保单放在哪；不要让他处理钱的事' }
      ],
      values: item,
      submitLabel: '保存',
      onSubmit: function (v) {
        if (isNew) { v.id = App.uid('p'); est().contacts.push(v); }
        else Object.assign(item, v);
        App.save();
        renderStats();
        renderPanel();
        App.toast('已保存');
      }
    });
  }

  /* ---------- 删除 ---------- */

  function removeItem(key, item, name) {
    App.confirm({
      title: '删除这一项',
      message: '「' + (name || '这一项') + '」会从清单里移除。',
      confirmLabel: '删除'
    }).then(function (ok) {
      if (!ok) return;
      var arr = est()[key];
      var i = arr.indexOf(item);
      if (i > -1) arr.splice(i, 1);
      App.save();
      renderStats();
      renderPanel();
      App.toast('已删除');
    });
  }

  /* ---------- 加密导出 ---------- */

  function exportEncrypted() {
    App.exportEncrypted('estate');
  }

  /* ---------- 打印 ---------- */

  function printEstate() {
    var html = App.printHead('数字遗产清单', '账号线索 · 文件位置 · 信件 · 联系人');
    html += '<p class="p-note">说明：这份清单只写密码提示，没有写密码本身。找不到的东西，先问清单里的关键联系人。</p>';

    html += '<section><h2>账号与处置意愿</h2>';
    if (!est().accounts.length) html += '<p class="p-note">（空）</p>';
    est().accounts.forEach(function (a) {
      html += '<div class="p-row"><div class="p-key">' + App.esc(a.platform) + '</div><div class="p-val">' +
        '登录名：' + App.esc(a.login || '—') +
        '\n密码提示：' + App.esc(a.hint || '—') +
        '\n处置：' + intentLabel(a.intent) +
        (a.note ? '\n' + App.esc(a.note) : '') +
        '</div></div>';
    });
    html += '</section>';

    html += '<section><h2>文件与设备</h2>';
    if (!est().files.length) html += '<p class="p-note">（空）</p>';
    est().files.forEach(function (f) {
      html += '<div class="p-row"><div class="p-key">' + App.esc(f.kind || '其他') + '</div><div class="p-val">' +
        App.esc(f.name) + '\n位置：' + App.esc(f.location || '—') +
        (f.note ? '\n' + App.esc(f.note) : '') + '</div></div>';
    });
    html += '</section>';

    html += '<section><h2>关键联系人</h2>';
    if (!est().contacts.length) html += '<p class="p-note">（空）</p>';
    est().contacts.forEach(function (c) {
      html += '<div class="p-row"><div class="p-key">' + App.esc(c.relation || '联系人') + '</div><div class="p-val">' +
        App.esc(c.name) + '　' + App.esc(c.phone || '') +
        (c.note ? '\n' + App.esc(c.note) : '') + '</div></div>';
    });
    html += '</section>';

    if (est().letters.length) {
      html += '<section><h2>信件</h2>';
      est().letters.forEach(function (l) {
        html += '<h3>给 ' + App.esc(l.to) + (l.relation ? '（' + App.esc(l.relation) + '）' : '') +
          (l.trigger ? '　·　' + App.esc(l.trigger) + ' 打开' : '') + '</h3>';
        if (l.title) html += '<p class="p-item"><b>' + App.esc(l.title) + '</b></p>';
        html += '<p class="p-letter">' + App.esc(l.body || '') + '</p>';
      });
      html += '</section>';
    }

    App.printHTML(html);
  }

  /* ---------- 渲染 ---------- */

  function render() {
    renderStats();
    renderPanel();
  }

  App.render.estate = render;
  App.openEstateExport = exportEncrypted;

  document.addEventListener('DOMContentLoaded', function () {
    var tabs = document.getElementById('estateTabs');
    if (tabs) {
      tabs.addEventListener('click', function (e) {
        var b = e.target.closest('.tab');
        if (!b) return;
        tab = b.dataset.tab;
        tabs.querySelectorAll('.tab').forEach(function (x) { x.classList.toggle('is-on', x === b); });
        renderPanel();
      });
    }
    ['btnEstateExport', 'btnEstateExport2'].forEach(function (id) {
      var b = document.getElementById(id);
      if (b) b.addEventListener('click', exportEncrypted);
    });
    ['btnEstatePrint', 'btnEstatePrint2'].forEach(function (id) {
      var b = document.getElementById(id);
      if (b) b.addEventListener('click', printEstate);
    });
  });
})();
