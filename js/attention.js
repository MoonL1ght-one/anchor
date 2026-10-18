/* 模块二：注意力账本 */
(function () {
  'use strict';
  var App = window.App;
  var D = window.AnchorData;

  var picked = { trigger: null, body: null, env: null };
  var range = 'all';
  var showAll = false;

  function entries() { return App.state.attention.entries; }
  function findLabel(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i].label;
    return '';
  }

  /* ---------- 选项片 ---------- */

  function buildChips(container, options, key) {
    App.clear(container);
    options.forEach(function (o) {
      var b = App.el('button', {
        class: 'chip' + (picked[key] === o.id ? ' is-on' : ''),
        type: 'button',
        text: o.label,
        'aria-pressed': picked[key] === o.id ? 'true' : 'false'
      });
      b.addEventListener('click', function () {
        picked[key] = picked[key] === o.id ? null : o.id;
        buildChips(container, options, key);
      });
      container.appendChild(b);
    });
  }

  function refreshChips() {
    buildChips(document.getElementById('attnTrigger'), D.triggers, 'trigger');
    buildChips(document.getElementById('attnBody'), D.bodyStates, 'body');
    buildChips(document.getElementById('attnEnv'), D.envs, 'env');
  }

  /* ---------- 记录 ---------- */

  function bindForm() {
    var form = document.getElementById('attnForm');
    if (!form) return;
    document.getElementById('attnWhen').value = App.nowLocalInput();

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var doing = document.getElementById('attnDoing');
      var why = document.getElementById('attnWhy');

      if (!doing.value.trim()) {
        doing.classList.add('is-error');
        doing.focus();
        App.toast('先写一下当时在做什么');
        return;
      }
      if (!picked.trigger) {
        App.toast('选一下是什么把你带走的');
        return;
      }

      var whenVal = document.getElementById('attnWhen').value;
      var ts = whenVal ? new Date(whenVal) : new Date();
      if (isNaN(ts.getTime())) ts = new Date();

      var hadWhy = why.value.trim();

      entries().push({
        id: App.uid('e'),
        ts: ts.toISOString(),
        doing: doing.value.trim(),
        trigger: picked.trigger,
        where: document.getElementById('attnWhere').value.trim(),
        why: hadWhy,
        body: picked.body || '',
        env: picked.env || '',
        createdAt: new Date().toISOString()
      });

      App.save();

      doing.value = '';
      document.getElementById('attnWhere').value = '';
      why.value = '';
      picked.trigger = null;
      buildChips(document.getElementById('attnTrigger'), D.triggers, 'trigger');
      document.getElementById('attnWhen').value = App.nowLocalInput();
      doing.focus();

      render();
      App.toast(hadWhy ? '记下了' : '记下了。下次试着写一句原因');
    });

    ['attnDoing', 'attnWhy'].forEach(function (id) {
      var n = document.getElementById(id);
      n.addEventListener('input', function () { n.classList.remove('is-error'); });
    });
  }

  /* ---------- 时间过滤 ---------- */

  function filtered() {
    var all = entries().slice().sort(function (a, b) { return new Date(b.ts) - new Date(a.ts); });
    if (range === 'all') return all;
    var days = parseInt(range, 10);
    var from = Date.now() - days * 86400000;
    return all.filter(function (e) { return new Date(e.ts).getTime() >= from; });
  }

  /* ---------- 地形图 ---------- */

  function countMatrix(list) {
    var rows = D.triggers.map(function (t) {
      var cells = D.blocks.map(function (b) {
        return list.filter(function (e) {
          if (e.trigger !== t.id) return false;
          var h = new Date(e.ts).getHours();
          return h >= b.from && h < b.to;
        }).length;
      });
      return { id: t.id, label: t.label, cells: cells, total: cells.reduce(function (a, b) { return a + b; }, 0) };
    });
    rows.sort(function (a, b) { return b.total - a.total; });
    return rows;
  }

  function terrainSVG(list) {
    var rows = countMatrix(list);
    var max = 1;
    rows.forEach(function (r) { r.cells.forEach(function (c) { if (c > max) max = c; }); });

    var W = 620, LABEL = 118, RIGHT = 8, TOP = 28, ROW_H = 42, BOTTOM = 16;
    var cellW = (W - LABEL - RIGHT) / D.blocks.length;
    var H = TOP + rows.length * ROW_H + BOTTOM;
    var out = ['<svg class="terrain-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="分心地形图：时段与触发类型的分布">'];

    D.blocks.forEach(function (b, ci) {
      out.push('<text class="t-axis" x="' + (LABEL + ci * cellW + cellW / 2) + '" y="13" text-anchor="middle">' + b.label + '</text>');
    });

    rows.forEach(function (r, ri) {
      var y = TOP + ri * ROW_H;
      out.push('<text class="t-label" x="' + (LABEL - 10) + '" y="' + (y + ROW_H / 2 + 4) + '" text-anchor="end">' + App.esc(r.label) + '</text>');
      r.cells.forEach(function (v, ci) {
        var x = LABEL + ci * cellW + 1.5;
        var op = v ? 0.14 + 0.72 * (v / max) : 0;
        var fill = v ? 'rgba(46,91,78,' + op.toFixed(2) + ')' : '#F3EFE4';
        var title = r.label + ' · ' + D.blocks[ci].label + ' · ' + (v || 0) + ' 次';
        out.push('<rect class="cell" x="' + x + '" y="' + (y + 5) + '" width="' + (cellW - 3) + '" height="' + (ROW_H - 10) +
          '" rx="3" fill="' + fill + '"><title>' + App.esc(title) + '</title></rect>');
        if (v) {
          var dark = op > 0.42;
          out.push('<text class="t-count" x="' + (x + (cellW - 3) / 2) + '" y="' + (y + ROW_H / 2 + 4) +
            '" text-anchor="middle" fill="' + (dark ? '#FBF8F0' : '#6C6659') + '">' + v + '</text>');
        }
      });
    });

    out.push('</svg>');
    return out.join('');
  }

  function renderTerrain() {
    var wrap = document.getElementById('terrainWrap');
    var legend = document.getElementById('terrainLegend');
    var list = filtered();
    App.clear(wrap);

    if (!list.length) {
      legend.hidden = true;
      wrap.appendChild(App.el('div', { class: 'terrain-empty' }, [
        App.el('p', { text: entries().length ? '这个时间范围内还没有记录。' : '地形图需要一点材料：记满五条，形状就开始出现。' }),
        entries().length
          ? null
          : App.el('button', {
              class: 'btn btn-sm', type: 'button', text: '先填入一组示例数据看看',
              onclick: function () { loadDemo(); }
            })
      ]));
      return;
    }

    legend.hidden = false;
    var scroll = App.el('div', { class: 'terrain-scroll' });
    scroll.innerHTML = terrainSVG(list);
    wrap.appendChild(scroll);
    wrap.appendChild(App.el('p', { class: 'terrain-swipe', text: '左右滑动查看完整地形' }));
    App.clear(legend);
    legend.appendChild(App.el('span', { text: '少' }));
    for (var i = 0; i < 5; i++) {
      legend.appendChild(App.el('span', {
        class: 'legend-swatch',
        style: 'opacity:' + (0.14 + i * 0.18).toFixed(2)
      }));
    }
    legend.appendChild(App.el('span', { text: '多' }));
    legend.appendChild(App.el('span', { style: 'margin-left:10px', text: '数字 = 那个时段发生的次数' }));
  }

  /* ---------- 读地形 ---------- */

  function ratio(list, fn) {
    if (!list.length) return 0;
    return list.filter(fn).length / list.length;
  }

  function topOf(list, field) {
    var m = {};
    list.forEach(function (e) { if (e[field]) m[e[field]] = (m[e[field]] || 0) + 1; });
    var best = null, n = 0;
    Object.keys(m).forEach(function (k) { if (m[k] > n) { n = m[k]; best = k; } });
    return { id: best, count: n };
  }

  function suggestionFor(triggerId) {
    return ({
      notify: '把手机放到另一个房间。不是靠克制，是靠距离。',
      self: '手边放一张纸，想到别的事就写下来，不立刻去做。',
      avoid: '把任务切到「小到不需要下决心」的第一步，只做五分钟。',
      people: '设一个明确可被打断的时段，其余时间戴上耳机。',
      bored: '给这件事设 20 分钟计时，允许自己之后无聊一会儿。',
      body: '先睡、先吃。分心有时是身体在替你记账。',
      emotion: '分心在替你止痛。先处理那件事，再谈专注。',
      env: '换一个位置，比忍着便宜得多。'
    })[triggerId] || '';
  }

  function renderInsights() {
    var box = document.getElementById('insightBody');
    if (!box) return;
    App.clear(box);
    var list = filtered();

    if (!list.length) {
      box.appendChild(App.el('p', { class: 'empty-hint', text: '还没有足够的数据。这里不评价你，只描述模式。' }));
      return;
    }

    if (list.length < 3) {
      box.appendChild(App.el('p', { class: 'insight-big', text: '样本还太少，先攒到三条以上。' }));
      box.appendChild(App.el('p', {
        style: 'font-size:12.5px;line-height:1.9;color:var(--ink-2)',
        text: '现在这 ' + list.length + ' 条只说明这一次发生了什么，还不能说明模式。多记几次，地形才会浮出来。'
      }));
      return;
    }

    var topT = topOf(list, 'trigger');
    var topB = topOf(list, 'body');
    var topE = topOf(list, 'env');
    var topW = topOf(list, 'where');

    var matrix = countMatrix(list);
    var blockTotals = D.blocks.map(function (b, i) {
      return { label: b.label, n: matrix.reduce(function (a, r) { return a + r.cells[i]; }, 0) };
    }).sort(function (a, b) { return b.n - a.n; });

    var inner = ratio(list, function (e) { return ['avoid', 'bored', 'self', 'emotion'].indexOf(e.trigger) > -1; });
    var outer = ratio(list, function (e) { return ['notify', 'people', 'env'].indexOf(e.trigger) > -1; });

    var big;
    if (inner >= 0.55) big = '多数分心不是被打断，是你主动离开的。';
    else if (outer >= 0.55) big = '你的注意力更多是被外面拽走的，先改环境比改意志力有效。';
    else big = '内与外各占一半：这说明环境还行，剩下的问题在任务本身。';

    box.appendChild(App.el('p', { class: 'insight-big', text: big }));

    var pctT = Math.round((topT.count / list.length) * 100);
    var kv = App.el('div', { class: 'kv-list' });
    var addKV = function (k, v) {
      kv.appendChild(App.el('div', { class: 'kv' }, [
        App.el('span', { class: 'kv-k', text: k }),
        App.el('span', { class: 'kv-v', text: v })
      ]));
    };
    if (topT.id) addKV('最常走的路', findLabel(D.triggers, topT.id) + ' · ' + pctT + '%');
    if (topW.id) addKV('最常去的地方', topW.id);
    if (blockTotals[0] && blockTotals[0].n) addKV('最危险的时段', blockTotals[0].label);
    if (topB.id) addKV('最常见的身体状态', findLabel(D.bodyStates, topB.id));
    if (topE.id) addKV('出事时的环境', findLabel(D.envs, topE.id));
    addKV('内部 / 外部', Math.round(inner * 100) + '% / ' + Math.round(outer * 100) + '%');
    box.appendChild(kv);

    // 落点排行
    var whereMap = {};
    list.forEach(function (e) { if (e.where) whereMap[e.where] = (whereMap[e.where] || 0) + 1; });
    var whereArr = Object.keys(whereMap).map(function (k) { return { label: k, n: whereMap[k] }; })
      .sort(function (a, b) { return b.n - a.n; }).slice(0, 5);
    if (whereArr.length) box.appendChild(barBlock('分心之后去了哪', whereArr));

    var bodyArr = D.bodyStates.map(function (s) {
      return { label: s.label, n: list.filter(function (e) { return e.body === s.id; }).length };
    }).filter(function (x) { return x.n; }).sort(function (a, b) { return b.n - a.n; });
    if (bodyArr.length) box.appendChild(barBlock('身体状态分布', bodyArr));

    if (topT.id) {
      box.appendChild(App.el('div', { style: 'margin-top:20px;padding-top:16px;border-top:1px solid var(--line-soft)' }, [
        App.el('p', { class: 'bar-block-title', text: '可以试的一件事' }),
        App.el('p', { style: 'font-size:12.5px;line-height:1.85;color:var(--ink-2)', text: suggestionFor(topT.id) })
      ]));
    }
  }

  function barBlock(title, arr) {
    var max = arr[0].n || 1;
    var box = App.el('div', { class: 'bar-block' }, [App.el('p', { class: 'bar-block-title', text: title })]);
    arr.forEach(function (x) {
      box.appendChild(App.el('div', { class: 'bar-row' }, [
        App.el('span', { class: 'bar-label', text: x.label, title: x.label }),
        App.el('div', { class: 'bar-track' }, [
          App.el('div', { class: 'bar-fill', style: 'width:' + Math.max(6, (x.n / max) * 100) + '%' })
        ]),
        App.el('span', { class: 'bar-num', text: x.n })
      ]));
    });
    return box;
  }

  /* ---------- 记录列表 ---------- */

  function renderEntries() {
    var box = document.getElementById('entryList');
    var countEl = document.getElementById('entryCount');
    if (!box) return;
    App.clear(box);
    var list = filtered();

    if (countEl) countEl.textContent = list.length + ' 条记录';

    if (!list.length) {
      box.appendChild(App.el('div', { class: 'empty-hint', text: '这一栏会是空的，直到你愿意对自己诚实一次。' }));
      return;
    }

    var show = showAll ? list : list.slice(0, 12);
    show.forEach(function (e) {
      var meta = App.el('div', { class: 'entry-meta' }, [
        App.el('span', { class: 'tag', text: findLabel(D.triggers, e.trigger) || '未分类' }),
        e.body ? App.el('span', { class: 'tag tag-plain', text: findLabel(D.bodyStates, e.body) }) : null,
        e.env ? App.el('span', { class: 'tag tag-plain', text: findLabel(D.envs, e.env) }) : null,
        e.where ? App.el('span', { class: 'entry-where', text: '去了：' + e.where }) : null
      ]);

      var main = App.el('div', null, [
        App.el('p', { class: 'entry-doing', text: e.doing }),
        meta,
        e.why ? App.el('p', { class: 'entry-why', text: e.why }) : null
      ]);

      box.appendChild(App.el('div', { class: 'entry' }, [
        App.el('span', { class: 'entry-time', text: App.fmtDay(e.ts) + ' ' + App.pad(new Date(e.ts).getHours()) + ':' + App.pad(new Date(e.ts).getMinutes()) }),
        main,
        App.el('button', {
          class: 'icon-btn', title: '删除这条记录', html: App.icon('trash'), 'aria-label': '删除这条记录',
          onclick: function () { removeEntry(e); }
        })
      ]));
    });

    if (list.length > 12 && !showAll) {
      box.appendChild(App.el('button', {
        class: 'link-btn', type: 'button', style: 'margin-top:14px;align-self:flex-start',
        text: '显示全部 ' + list.length + ' 条',
        onclick: function () { showAll = true; renderEntries(); }
      }));
    }
  }

  function removeEntry(e) {
    App.confirm({
      title: '删掉这条记录',
      message: '「' + e.doing + '」这条会被移除，地形图也会跟着变。',
      confirmLabel: '删除'
    }).then(function (ok) {
      if (!ok) return;
      var arr = entries();
      var i = arr.findIndex(function (x) { return x.id === e.id; });
      if (i > -1) arr.splice(i, 1);
      App.save();
      render();
      App.toast('已删除');
    });
  }

  function renderToday() {
    var el = document.getElementById('attnTodayCount');
    if (!el) return;
    var today = App.startOfDay(new Date()).getTime();
    var n = entries().filter(function (e) { return new Date(e.ts).getTime() >= today; }).length;
    el.textContent = '今天 ' + n + ' 次';
  }

  /* ---------- 示例 ---------- */

  function loadDemo() {
    if (entries().length) {
      App.confirm({
        title: '文件里已经有记录',
        message: '示例数据会追加到现有记录后面，之后可以逐条删除。',
        confirmLabel: '仍然追加'
      }).then(function (ok) { if (ok) pushDemo(); });
    } else {
      pushDemo();
    }
  }

  function pushDemo() {
    var now = new Date();
    D.demoEntries.forEach(function (row, i) {
      var d = new Date(now.getTime() - row[6] * 86400000);
      var hour = [10, 15, 21, 23, 16, 11, 14, 19, 9, 20][i % 10];
      if (row[6] === 0 && hour >= now.getHours()) hour = Math.max(1, now.getHours() - 1);
      d.setHours(hour, (i * 7) % 60, 0, 0);
      entries().push({
        id: App.uid('e'),
        ts: d.toISOString(),
        doing: row[0],
        trigger: row[1],
        where: row[2],
        why: row[3],
        body: row[4],
        env: row[5],
        createdAt: new Date().toISOString()
      });
    });
    App.save();
    render();
    App.toast('已填入 ' + D.demoEntries.length + ' 条示例，随时可以删');
  }

  /* ---------- 打印 ---------- */

  function print() {
    var list = filtered().slice().sort(function (a, b) { return new Date(b.ts) - new Date(a.ts); });
    var html = App.printHead('注意力地形图', '只记原因，不记时长');
    if (!list.length) {
      html += '<p class="p-note">还没有记录。</p>';
      App.printHTML(html);
      return;
    }
    var matrix = countMatrix(list);
    var topT = topOf(list, 'trigger');
    html += '<section><h2>摘要</h2>';
    html += '<div class="p-row"><div class="p-key">记录条数</div><div class="p-val">' + list.length + ' 条</div></div>';
    if (topT.id) html += '<div class="p-row"><div class="p-key">最常见触发</div><div class="p-val">' + App.esc(findLabel(D.triggers, topT.id)) + '（' + topT.count + ' 次）</div></div>';
    var blockTotals = D.blocks.map(function (b, i) {
      return { label: b.label, n: matrix.reduce(function (a, r) { return a + r.cells[i]; }, 0) };
    }).sort(function (a, b) { return b.n - a.n; });
    if (blockTotals[0].n) html += '<div class="p-row"><div class="p-key">最危险时段</div><div class="p-val">' + blockTotals[0].label + '（' + blockTotals[0].n + ' 次）</div></div>';
    html += '</section>';

    html += '<section><h2>分区统计（触发 × 时段）</h2>';
    html += '<table style="width:100%;border-collapse:collapse;font-size:9pt">';
    html += '<tr><th style="text-align:left;padding:3pt 0">触发</th>';
    D.blocks.forEach(function (b) { html += '<th style="text-align:center">' + b.label + '</th>'; });
    html += '<th style="text-align:right">合计</th></tr>';
    matrix.forEach(function (r) {
      html += '<tr><td style="padding:2.5pt 0;border-bottom:0.4pt solid #ddd">' + App.esc(r.label) + '</td>';
      r.cells.forEach(function (v) { html += '<td style="text-align:center;border-bottom:0.4pt solid #ddd">' + (v || '') + '</td>'; });
      html += '<td style="text-align:right;border-bottom:0.4pt solid #ddd">' + r.total + '</td></tr>';
    });
    html += '</table></section>';

    html += '<section><h2>逐条记录</h2>';
    list.forEach(function (e) {
      html += '<div class="p-row"><div class="p-key">' + App.esc(App.fmtDate(e.ts)) + '</div><div class="p-val">' +
        App.esc(e.doing) + '　→　' + App.esc(findLabel(D.triggers, e.trigger) || '未分类') +
        (e.where ? '　→　' + App.esc(e.where) : '') +
        (e.why ? '\n<span class="p-note">' + App.esc(e.why) + '</span>' : '') +
        '</div></div>';
    });
    html += '</section>';
    App.printHTML(html);
  }

  /* ---------- 渲染 ---------- */

  function render() {
    renderTerrain();
    renderInsights();
    renderEntries();
    renderToday();
  }

  App.render.attention = render;

  document.addEventListener('DOMContentLoaded', function () {
    refreshChips();
    bindForm();

    var tabs = document.getElementById('rangeTabs');
    if (tabs) {
      tabs.addEventListener('click', function (e) {
        var b = e.target.closest('.range-tab');
        if (!b) return;
        range = b.dataset.range;
        tabs.querySelectorAll('.range-tab').forEach(function (x) { x.classList.toggle('is-on', x === b); });
        render();
      });
    }

    var p = document.getElementById('btnAttnPrint');
    if (p) p.addEventListener('click', print);
  });

  App.attentionDemo = loadDemo;
})();
