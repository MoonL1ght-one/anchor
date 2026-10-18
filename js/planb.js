/* 模块四：人生 B 计划 */
(function () {
  'use strict';
  var App = window.App;
  var D = window.AnchorData;

  var current = D.planb[0].key;

  function scenario(key) {
    var meta = D.planb.filter(function (s) { return s.key === key; })[0];
    return { meta: meta, data: App.state.planb[key] };
  }

  function stats(key) {
    var secs = App.state.planb[key].sections;
    var total = 0, done = 0;
    secs.forEach(function (s) {
      s.items.forEach(function (i) { total++; if (i.done) done++; });
    });
    return { total: total, done: done };
  }

  function flat(key) {
    var out = [];
    App.state.planb[key].sections.forEach(function (s) {
      s.items.forEach(function (i) { out.push({ section: s.title, item: i }); });
    });
    return out;
  }

  function nextItems(key, n) {
    return flat(key).filter(function (x) { return !x.item.done; }).slice(0, n);
  }

  /* ---------- 情景选择 ---------- */

  function renderTabs() {
    var box = document.getElementById('planbTabs');
    if (!box) return;
    App.clear(box);
    D.planb.forEach(function (sc) {
      var st = stats(sc.key);
      var on = sc.key === current;
      box.appendChild(App.el('button', {
        class: 'scenario-card' + (on ? ' is-on' : ''), type: 'button', role: 'tab',
        'aria-selected': on ? 'true' : 'false',
        onclick: function () { current = sc.key; renderTabs(); renderPanel(); }
      }, [
        App.el('span', { class: 'scenario-name', text: sc.name }),
        App.el('span', { class: 'scenario-meta', text: st.done + ' / ' + st.total + ' 已做' }),
        App.el('div', { class: 'progress' }, [
          App.el('div', { class: 'progress-bar', style: 'width:' + (st.total ? (st.done / st.total) * 100 : 0) + '%' })
        ])
      ]));
    });
  }

  /* ---------- 主体 ---------- */

  function renderPanel() {
    var box = document.getElementById('planbPanel');
    if (!box) return;
    App.clear(box);

    var sc = scenario(current);
    var st = stats(current);
    var next = nextItems(current, 1)[0];

    var hero = App.el('div', { class: 'next-card' }, [
      App.el('div', null, [
        App.el('p', { class: 'next-eyebrow', text: '现在只需要做这一件' }),
        App.el('p', { class: 'next-text', text: next ? next.item.text : '这一页已经走完了。剩下的，是把它放下。' }),
        App.el('p', { class: 'next-sub', text: next ? next.section + '　·　' + st.done + ' / ' + st.total + ' 已完成' : sc.meta.intro }),
        App.el('div', { class: 'next-progress progress' }, [
          App.el('div', { class: 'progress-bar', style: 'width:' + (st.total ? (st.done / st.total) * 100 : 0) + '%' })
        ])
      ]),
      App.el('div', { class: 'next-actions' }, [
        next ? App.el('button', {
          class: 'btn btn-primary', type: 'button', text: '这一件做完了',
          onclick: function () {
            next.item.done = true;
            App.save();
            renderTabs();
            renderPanel();
            App.toast('好。下一件在这儿');
          }
        }) : null,
        App.el('button', { class: 'btn btn-ghost', type: 'button', text: '打开应急卡', onclick: openEmergency })
      ])
    ]);
    box.appendChild(hero);

    var list = App.el('div', { class: 'checklist' });
    sc.data.sections.forEach(function (sec) {
      list.appendChild(sectionNode(sec));
    });
    box.appendChild(list);
  }

  function sectionNode(sec) {
    var done = sec.items.filter(function (i) { return i.done; }).length;
    var wrap = App.el('section', { class: 'check-section' });

    wrap.appendChild(App.el('div', { class: 'check-head' }, [
      App.el('div', { style: 'display:flex;align-items:baseline;gap:12px;flex-wrap:wrap' }, [
        App.el('h3', { class: 'check-title', text: sec.title }),
        App.el('span', { class: 'check-meta', text: done + ' / ' + sec.items.length })
      ]),
      App.el('button', {
        class: 'link-btn', type: 'button', text: sec.note ? '看备注' : '写备注',
        onclick: function () { noteForm(sec); }
      })
    ]));

    var items = App.el('div', { class: 'check-items' });

    sec.items.forEach(function (item) {
      var row = App.el('div', {
        class: 'check-item' + (item.done ? ' is-done' : ''),
        role: 'checkbox', tabindex: '0', 'aria-checked': item.done ? 'true' : 'false'
      }, [
        App.el('span', { class: 'check-box' }),
        App.el('span', { class: 'check-text', text: item.text }),
        App.el('div', { class: 'row-actions' }, [
          App.el('button', {
            class: 'icon-btn', title: '改文字', html: App.icon('edit'), 'aria-label': '改文字',
            onclick: function (ev) { ev.stopPropagation(); editItem(sec, item); }
          }),
          App.el('button', {
            class: 'icon-btn', title: '删除', html: App.icon('trash'), 'aria-label': '删除',
            onclick: function (ev) { ev.stopPropagation(); removeItem(sec, item); }
          })
        ])
      ]);

      var toggle = function () {
        item.done = !item.done;
        App.save();
        renderTabs();
        renderPanel();
      };
      row.addEventListener('click', toggle);
      row.addEventListener('keydown', function (e) {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); }
      });

      items.appendChild(row);
    });

    items.appendChild(App.el('button', {
      class: 'add-line', type: 'button', html: App.icon('plus') + '<span>加一条自己的</span>',
      onclick: function () { addItem(sec, items); }
    }));

    wrap.appendChild(items);

    if (sec.note) wrap.appendChild(App.el('div', { class: 'check-note', text: sec.note }));

    return wrap;
  }

  function addItem(sec, itemsBox) {
    var wrap = App.el('div', { class: 'composer', style: 'padding:8px 0 12px' });
    var input = App.el('input', { class: 'input', placeholder: '写一件具体能做的事', maxlength: 160 });
    var commit = function () {
      var t = input.value.trim();
      if (!t) { input.classList.add('is-error'); input.focus(); return; }
      sec.items.push({ id: App.uid('i'), text: t, done: false });
      App.save();
      renderTabs();
      renderPanel();
      App.toast('加进去了');
    };
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); commit(); } });
    wrap.appendChild(input);
    wrap.appendChild(App.el('div', { class: 'composer-foot' }, [
      App.el('button', { class: 'btn btn-sm btn-primary', type: 'button', text: '加上', onclick: commit }),
      App.el('button', { class: 'btn btn-sm btn-ghost', type: 'button', text: '取消', onclick: function () { renderPanel(); } })
    ]));
    var line = itemsBox.querySelector('.add-line');
    itemsBox.replaceChild(wrap, line);
    input.focus();
  }

  function editItem(sec, item) {
    App.formModal({
      title: '改这一条',
      fields: [{ key: 'text', label: '内容', type: 'textarea', rows: 3, required: true }],
      values: { text: item.text },
      submitLabel: '保存',
      onSubmit: function (v) {
        item.text = v.text;
        App.save();
        renderPanel();
        App.toast('改好了');
      }
    });
  }

  function removeItem(sec, item) {
    App.confirm({
      title: '删掉这一条',
      message: '「' + (item.text.length > 26 ? item.text.slice(0, 26) + '…' : item.text) + '」会从手册里移除。',
      confirmLabel: '删除'
    }).then(function (ok) {
      if (!ok) return;
      var i = sec.items.indexOf(item);
      if (i > -1) sec.items.splice(i, 1);
      App.save();
      renderTabs();
      renderPanel();
      App.toast('已删除');
    });
  }

  function noteForm(sec) {
    App.formModal({
      title: sec.title + ' · 备注',
      fields: [{
        key: 'note', label: '只有你自己需要看的补充', type: 'textarea', rows: 6,
        placeholder: '例：保单号、具体地址、某个人的电话、当时做的决定'
      }],
      values: { note: sec.note || '' },
      submitLabel: '保存',
      onSubmit: function (v) {
        sec.note = v.note;
        App.save();
        renderPanel();
        App.toast('已保存');
      }
    });
  }

  /* ---------- 应急卡 ---------- */

  function openEmergency() {
    var sc = scenario(current);
    var items = nextItems(current, 3);
    var contacts = App.state.estate.contacts.slice(0, 4);

    App.openOverlay(function (inner) {
      inner.appendChild(App.el('p', { class: 'read-section', text: '应急卡 · ' + sc.meta.name }));
      inner.appendChild(App.el('h2', { class: 'emergency-title', text: '先做这三件，别的之后再说。' }));
      inner.appendChild(App.el('p', { class: 'emergency-sub', text: sc.meta.intro }));

      if (!items.length) {
        inner.appendChild(App.el('p', { class: 'emergency-sub', text: '这个情景下的条目都已完成。如果仍然难受，去找一个人待着，不要一个人待着。' }));
      } else {
        var list = App.el('div', { class: 'emergency-list' });
        items.forEach(function (x, i) {
          list.appendChild(App.el('div', { class: 'emergency-item' }, [
            App.el('span', { class: 'emergency-num', text: App.pad(i + 1) }),
            App.el('span', { class: 'emergency-text', text: x.item.text })
          ]));
        });
        inner.appendChild(list);
      }

      var foot = App.el('div', { class: 'emergency-foot' });

      if (contacts.length) {
        var row = App.el('div', { class: 'emergency-contacts' });
        contacts.forEach(function (c) {
          row.appendChild(App.el('span', { class: 'emergency-contact' }, [
            App.el('b', { text: c.name }),
            App.el('span', {
              style: 'margin-left:10px;font-family:var(--font-mono);font-size:11.5px;color:var(--ink-3)',
              text: c.phone || ''
            })
          ]));
        });
        foot.appendChild(row);
      } else {
        foot.appendChild(App.el('p', {
          class: 'emergency-note', style: 'margin-bottom:12px',
          text: '还没有写关键联系人。可以到「数字遗产」里补上：出事时该先打给谁。'
        }));
      }

      foot.appendChild(App.el('p', {
        class: 'emergency-note',
        text: '一次只做一件。做完划掉，再回来看下一件。如果连一件都做不动，就先喝水、坐下、给一个人打电话。按 Esc 退出。'
      }));
      inner.appendChild(foot);
    });

    document.getElementById('overlay').classList.add('is-top');

    var onKey = function (e) {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', onKey);
        App.onOverlayClose = null;
        App.closeOverlay();
      }
    };
    document.addEventListener('keydown', onKey);
    App.onOverlayClose = function () { document.removeEventListener('keydown', onKey); };
  }

  /* ---------- 打印 ---------- */

  function printPlanb() {
    var sc = scenario(current);
    var html = App.printHead('人生 B 计划 · ' + sc.meta.name, '应急手册');
    html += '<p class="p-note">' + App.esc(sc.meta.intro) + '</p>';
    sc.data.sections.forEach(function (sec) {
      html += '<section><h2>' + App.esc(sec.title) + '</h2>';
      sec.items.forEach(function (it) {
        html += '<p class="p-item">' + (it.done ? '[x] ' : '[ ] ') + App.esc(it.text) + '</p>';
      });
      if (sec.note) html += '<p class="p-note">备注：' + App.esc(sec.note) + '</p>';
      html += '</section>';
    });
    App.printHTML(html);
  }

  /* ---------- 渲染 ---------- */

  function render() {
    renderTabs();
    renderPanel();
  }

  App.render.planb = render;

  document.addEventListener('DOMContentLoaded', function () {
    var p = document.getElementById('btnPlanbPrint');
    if (p) p.addEventListener('click', printPlanb);
    var e = document.getElementById('btnEmergency');
    if (e) e.addEventListener('click', openEmergency);
  });
})();
