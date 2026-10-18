/* 启动 */
(function () {
  'use strict';
  var App = window.App;
  var D = window.AnchorData;

  App.state = App.load();

  var VIEWS = ['constitution', 'attention', 'estate', 'planb'];

  document.addEventListener('DOMContentLoaded', function () {
    // 导航
    document.getElementById('nav').addEventListener('click', function (e) {
      var btn = e.target.closest('.nav-item');
      if (!btn) return;
      App.closeOverlay();
      App.go(btn.dataset.view);
    });

    // 数据与备份
    var dataBtn = document.getElementById('btnData');
    if (dataBtn) dataBtn.addEventListener('click', App.openDataModal);

    // 关闭按钮
    var closeBtn = document.getElementById('modalClose');
    if (closeBtn) closeBtn.addEventListener('click', App.closeModal);
    var overlayClose = document.getElementById('overlayClose');
    if (overlayClose) overlayClose.addEventListener('click', App.closeOverlay);

    var backdrop = document.getElementById('modalRoot');
    backdrop.addEventListener('mousedown', function (e) {
      if (e.target === backdrop) App.closeModal();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var overlay = document.getElementById('overlay');
      if (!overlay.hidden) { App.closeOverlay(); return; }
      var modal = document.getElementById('modalRoot');
      if (!modal.hidden) App.closeModal();
    });

    window.addEventListener('beforeunload', function () { App.save(true); });
    // 手机浏览器切换应用时常不触发 beforeunload，补一道保险
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') App.save(true);
    });

    var initial = (location.hash || '').replace('#', '');
    App.go(VIEWS.indexOf(initial) > -1 ? initial : 'constitution');

    App.setSaveState('已保存', false);

    // 首次使用：给一条温和的说明
    var used = false;
    try { used = localStorage.getItem('anchor.seen') === '1'; } catch (err) { used = true; }
    if (!used) {
      try { localStorage.setItem('anchor.seen', '1'); } catch (err) { /* 忽略 */ }
      var body = App.el('div', null, [
        App.el('p', { text: '四个模块，各写一件事就够开始了：一条原则、一次分心、一个账号、一个应急动作。' }),
        App.el('p', { style: 'margin-top:12px', text: '所有内容只保存在这台电脑的浏览器里，不上传，也不需要账号。唯一要记得的是：换电脑、清缓存之前，用右上角「数据与备份」导出一份。' }),
        App.el('p', { style: 'margin-top:12px;font-family:var(--font-serif);font-size:13px', text: '它不是待办清单，也不是自我提升计划。更像是给未来的自己留的几张字条。' })
      ]);
      App.openModal({
        title: '先说清楚它是什么',
        body: body,
        actions: [{ label: '开始写', variant: 'primary' }]
      });
    }
  });

  // 数据汇总（供打印全部时使用）
  App.summary = function () {
    return {
      constitution: D.sections.reduce(function (n, s) { return n + App.state.constitution[s.key].length; }, 0),
      entries: App.state.attention.entries.length,
      estate: App.state.estate.accounts.length + App.state.estate.files.length + App.state.estate.letters.length + App.state.estate.contacts.length
    };
  };
})();
