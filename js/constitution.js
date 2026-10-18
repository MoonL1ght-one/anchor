/* 模块一：个人宪法 */
(function () {
  'use strict';
  var App = window.App;
  var D = window.AnchorData;

  function list(sectionKey) {
    return App.state.constitution[sectionKey];
  }

  function render() {
    var grid = document.getElementById('constGrid');
    if (!grid) return;
    App.clear(grid);
    D.sections.forEach(function (sec) { grid.appendChild(card(sec)); });
  }

  function card(sec) {
    var items = list(sec.key);
    var wrap = App.el('article', { class: 'card const-card', dataset: { section: sec.key } });

    wrap.appendChild(App.el('div', { class: 'card-head' }, [
      App.el('h2', { text: sec.title }),
      App.el('span', { class: 'card-count', text: items.length ? items.length + ' 条' : '空' })
    ]));
    wrap.appendChild(App.el('p', { class: 'const-hint', text: sec.hint }));

    var ul = App.el('ul', { class: 'const-list' });

    if (!items.length) {
      ul.appendChild(App.el('li', { class: 'empty-hint', text: '还没有写。先摘一条下面现成的，改成你自己的话。' }));
    }

    items.forEach(function (item) {
      var li = App.el('li', { class: 'const-item' });
      li.appendChild(App.el('p', { class: 'const-text', text: item.text }));
      if (item.why) li.appendChild(App.el('p', { class: 'const-why', text: item.why }));

      li.appendChild(App.el('div', { class: 'row-actions' }, [
        App.el('button', {
          class: 'icon-btn', title: '编辑', html: App.icon('edit'), 'aria-label': '编辑这一条',
          onclick: function () { editItem(sec.key, item); }
        }),
        App.el('button', {
          class: 'icon-btn', title: '删除', html: App.icon('trash'), 'aria-label': '删除这一条',
          onclick: function () { removeItem(sec.key, item); }
        })
      ]));
      ul.appendChild(li);
    });

    wrap.appendChild(ul);
    wrap.appendChild(addLine(sec));
    wrap.appendChild(templateBlock(sec, items.length === 0));

    return wrap;
  }

  function templateBlock(sec, open) {
    var block = App.el('div', { class: 'tpl-block' }, [
      App.el('p', { class: 'tpl-title', text: '从这里开始，点一下就加进来' }),
      App.el('div', { class: 'tpl-chips' }, sec.templates.map(function (t) {
        return App.el('button', {
          class: 'tpl-chip', type: 'button', text: t,
          onclick: function () {
            list(sec.key).push({ id: App.uid('c'), text: t, why: '', createdAt: new Date().toISOString() });
            App.save();
            render();
            App.toast('加进来了，点它改成你自己的话');
          }
        });
      }))
    ]);
    block.hidden = !open;

    var toggle = App.el('button', {
      class: 'link-btn', type: 'button',
      style: 'margin-top:14px;font-size:11.5px',
      text: open ? '收起参考' : '参考几条现成的写法'
    });
    toggle.addEventListener('click', function () {
      block.hidden = !block.hidden;
      toggle.textContent = block.hidden ? '参考几条现成的写法' : '收起参考';
    });

    return App.el('div', { class: 'tpl-wrap' }, [toggle, block]);
  }

  function addLine(sec) {
    var line = App.el('button', {
      class: 'add-line', type: 'button',
      html: App.icon('plus') + '<span>添加一条</span>'
    });

    line.addEventListener('click', function () {
      var cardEl = line.closest('.const-card');
      var composer = App.el('div', { class: 'composer' });
      var ta = App.el('textarea', {
        class: 'input textarea', rows: 2,
        placeholder: '写成一句你会对自己重复的话',
        maxlength: 200
      });
      var why = App.el('input', {
        class: 'input', placeholder: '为什么是这条（可选，但很值得写）', maxlength: 200
      });

      var commit = function () {
        var text = ta.value.trim();
        if (!text) { ta.classList.add('is-error'); ta.focus(); return; }
        list(sec.key).push({ id: App.uid('c'), text: text, why: why.value.trim(), createdAt: new Date().toISOString() });
        App.save();
        render();
        App.toast('已加进' + sec.title);
      };

      ta.addEventListener('keydown', function (e) {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); commit(); }
      });

      composer.appendChild(ta);
      composer.appendChild(why);
      composer.appendChild(App.el('div', { class: 'composer-foot' }, [
        App.el('button', { class: 'btn btn-sm btn-primary', type: 'button', text: '加进来', onclick: commit }),
        App.el('button', { class: 'btn btn-sm btn-ghost', type: 'button', text: '取消', onclick: render })
      ]));

      line.parentNode.replaceChild(composer, line);
      ta.focus();
    });

    return line;
  }

  function editItem(sectionKey, item) {
    App.formModal({
      title: '改这一条',
      fields: [
        { key: 'text', label: '内容', type: 'textarea', rows: 3, required: true },
        { key: 'why', label: '为什么是这条', type: 'textarea', rows: 3, placeholder: '它从哪来？在哪次选择里救过你？' }
      ],
      values: { text: item.text, why: item.why },
      submitLabel: '保存',
      onSubmit: function (v) {
        item.text = v.text;
        item.why = v.why;
        App.save();
        render();
        App.toast('改好了');
      }
    });
  }

  function removeItem(sectionKey, item) {
    App.confirm({
      title: '删掉这一条',
      message: '「' + (item.text.length > 24 ? item.text.slice(0, 24) + '…' : item.text) + '」会从宪法里移除。',
      confirmLabel: '删除'
    }).then(function (ok) {
      if (!ok) return;
      var arr = list(sectionKey);
      var i = arr.indexOf(item);
      if (i > -1) arr.splice(i, 1);
      App.save();
      render();
      App.toast('已移除');
    });
  }

  function allItems() {
    var out = [];
    D.sections.forEach(function (sec) {
      list(sec.key).forEach(function (it) {
        out.push({ section: sec.title, text: it.text, why: it.why });
      });
    });
    return out;
  }

  function openReader() {
    var items = allItems();
    if (!items.length) { App.toast('先写一条，再来通读'); return; }
    var index = 0;

    var draw = function (inner) {
      App.clear(inner);
      var it = items[index];

      inner.appendChild(App.el('p', { class: 'read-section', text: it.section }));
      inner.appendChild(App.el('p', { class: 'read-text', text: it.text }));
      if (it.why) inner.appendChild(App.el('p', { class: 'read-why', text: it.why }));

      var prev = App.el('button', { class: 'btn btn-ghost', type: 'button', html: App.icon('left') + '<span>上一条</span>' });
      var next = App.el('button', { class: 'btn btn-primary', type: 'button', html: '<span>下一条</span>' + App.icon('right') });

      var step = function (delta) {
        index = (index + delta + items.length) % items.length;
        draw(inner);
      };
      prev.addEventListener('click', function () { step(-1); });
      next.addEventListener('click', function () { step(1); });

      inner.appendChild(App.el('div', { class: 'read-foot' }, [
        App.el('span', { class: 'read-progress', text: App.pad(index + 1) + ' / ' + App.pad(items.length) }),
        App.el('div', { class: 'read-nav' }, [prev, next])
      ]));
    };

    var innerEl = document.getElementById('overlayInner');
    var step = function (delta) {
      index = (index + delta + items.length) % items.length;
      draw(innerEl);
    };

    App.openOverlay(draw);

    var onKey = function (e) {
      if (e.key === 'Escape') { off(); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    };
    var off = function () { document.removeEventListener('keydown', onKey); };
    document.addEventListener('keydown', onKey);
    App.onOverlayClose = off;
  }

  function print() {
    var items = allItems();
    var html = App.printHead('个人宪法', '原则 · 边界 · 价值观');
    if (!items.length) {
      html += '<p class="p-note">还没有写任何一条。</p>';
    } else {
      D.sections.forEach(function (sec) {
        var arr = list(sec.key);
        if (!arr.length) return;
        html += '<section><h2>' + sec.title + '</h2>';
        arr.forEach(function (it, i) {
          html += '<div class="p-row"><div class="p-key">' + (i + 1) + '</div><div class="p-val">' +
            App.esc(it.text) + (it.why ? '\n<span class="p-note">' + App.esc(it.why) + '</span>' : '') +
            '</div></div>';
        });
        html += '</section>';
      });
    }
    App.printHTML(html);
  }

  App.render.constitution = render;

  document.addEventListener('DOMContentLoaded', function () {
    var b = document.getElementById('btnRead');
    if (b) b.addEventListener('click', openReader);
    var p = document.getElementById('btnConstPrint');
    if (p) p.addEventListener('click', print);
  });
})();
