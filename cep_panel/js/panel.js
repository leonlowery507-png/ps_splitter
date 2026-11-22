/**
 * @fileoverview Photoshop CEP 拆补助手前端控制与精密动效引擎
 * 兼容 Photoshop 2022 CEP (Chromium 74+) 保守 ES5 规范，零外部依赖。
 *
 * 模块划分：
 * 1. CoreUtils            - DOM/Class/计时器/减弱动态检测等基础兼容工具
 * 2. SpotlightEngine      - 60fps rAF + Lerp 物理阻尼追光引擎（含 160px 邻近泛光与静止休眠）
 * 3. MotionFX             - 光学微光涟漪、执行态流光锁、成功/报错脉冲、状态岛与仪器特化状态
 * 4. Controls             - 分段页签双向过渡与 Stagger、精密刻度滑块、5 向空间罗盘
 * 5. OfflinePreviewBridge - 非 CEP 浏览器环境隔离预览模拟层（真实 PS 环境永不触发）
 * 6. HostBridge           - 纯正 Photoshop ExtendScript 桥接与统一动作编排
 * 7. EventDelegation/API  - 统一事件委托与向后兼容 window.* 全局函数导出
 */

(function () {
  "use strict";

  /* ==========================================================================
   * 1. 基础兼容工具 (CoreUtils · ES5 / Chromium 74+)
   * ========================================================================== */

  var prefersReducedMotion = false;
  var reducedMotionQuery = null;

  var elStateKeys = [];
  var elStateVals = [];

  function byId(id) {
    return document.getElementById(id);
  }

  function toArray(nodeList) {
    var result = [];
    if (!nodeList || !nodeList.length) return result;
    for (var i = 0; i < nodeList.length; i++) {
      result.push(nodeList[i]);
    }
    return result;
  }

  function hasClass(el, cls) {
    if (!el || !cls) return false;
    if (el.classList) {
      return el.classList.contains(cls);
    }
    if (typeof el.className === "string") {
      return (" " + el.className + " ").indexOf(" " + cls + " ") !== -1;
    }
    return false;
  }

  function addClass(el, cls) {
    if (!el || !cls) return;
    if (el.classList) {
      el.classList.add(cls);
      return;
    }
    if (typeof el.className === "string" && !hasClass(el, cls)) {
      el.className = el.className ? (el.className + " " + cls) : cls;
    }
  }

  function removeClass(el, cls) {
    if (!el || !cls) return;
    if (el.classList) {
      el.classList.remove(cls);
      return;
    }
    if (typeof el.className === "string") {
      el.className = (" " + el.className + " ")
        .replace(" " + cls + " ", " ")
        .replace(/^\s+|\s+$/g, "");
    }
  }

  function toggleClass(el, cls, force) {
    if (!el || !cls) return;
    if (force) {
      addClass(el, cls);
    } else {
      removeClass(el, cls);
    }
  }

  /**
   * 向上查找拥有指定属性（且可选匹配属性值）的最近祖先元素（兼容 SVG/Text 节点）
   */
  function findClosestAttr(el, attr, expectedVal) {
    var cur = el;
    while (cur && cur !== document) {
      if (cur.nodeType === 1 && typeof cur.getAttribute === "function") {
        var val = cur.getAttribute(attr);
        if (val !== null) {
          if (typeof expectedVal === "undefined" || val === expectedVal) {
            return cur;
          }
        }
      }
      cur = cur.parentNode;
    }
    return null;
  }

  /**
   * 向上查找包含指定 class 的最近祖先元素
   */
  function findClosestClass(el, cls) {
    var cur = el;
    while (cur && cur !== document) {
      if (cur.nodeType === 1 && hasClass(cur, cls)) {
        return cur;
      }
      cur = cur.parentNode;
    }
    return null;
  }

  /**
   * 为 DOM 元素维护独立的动效定时器与防重入状态（纯 ES5，避免依赖 WeakMap）
   */
  function getElState(el) {
    for (var i = 0; i < elStateKeys.length; i++) {
      if (elStateKeys[i] === el) {
        return elStateVals[i];
      }
    }
    var state = {
      busy: false,
      flashTimer: 0,
      sheenTimer: 0,
      spinTimer: 0,
      popTimer: 0
    };
    elStateKeys.push(el);
    elStateVals.push(state);
    return state;
  }

  function clearTimer(timerId) {
    if (timerId) {
      clearTimeout(timerId);
    }
    return 0;
  }

  function forceReflow(el) {
    if (el) {
      /* 读取 offsetWidth 以强制重置同类名 CSS 关键帧动画 */
      void el.offsetWidth;
    }
  }

  function initReducedMotion() {
    if (typeof window.matchMedia !== "function") {
      prefersReducedMotion = false;
      return;
    }
    try {
      reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      prefersReducedMotion = !!(reducedMotionQuery && reducedMotionQuery.matches);
      var onChange = function (ev) {
        prefersReducedMotion = !!(ev && ev.matches);
        if (prefersReducedMotion) {
          SpotlightEngine.resetAll();
        }
      };
      if (reducedMotionQuery) {
        if (typeof reducedMotionQuery.addEventListener === "function") {
          reducedMotionQuery.addEventListener("change", onChange);
        } else if (typeof reducedMotionQuery.addListener === "function") {
          reducedMotionQuery.addListener(onChange);
        }
      }
    } catch (e) {
      prefersReducedMotion = false;
    }
  }

  /* ==========================================================================
   * 2. 60fps 物理阻尼追光引擎 (SpotlightEngine)
   * ========================================================================== */

  var SpotlightEngine = (function () {
    var POS_LERP = 0.22;
    var OPACITY_LERP = 0.16;
    var PROXIMITY_RADIUS = 160;
    var POS_EPSILON = 0.25;
    var OPACITY_EPSILON = 0.004;

    var cards = [];
    var rectsDirty = true;
    var pointerInside = false;
    var pointerX = -9999;
    var pointerY = -9999;
    var rafId = 0;
    var tabSettleTimer = 0;
    var initialized = false;

    function isCardVisible(item) {
      if (item.pane && !hasClass(item.pane, "is-active")) {
        return false;
      }
      return item.rect.width > 0 && item.rect.height > 0;
    }

    function collectCards() {
      var nodes = toArray(document.querySelectorAll('[data-spotlight="true"]'));
      cards = [];
      for (var i = 0; i < nodes.length; i++) {
        cards.push({
          el: nodes[i],
          pane: findClosestClass(nodes[i], "view-pane"),
          rect: { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 },
          visible: false,
          mx: -200,
          my: -200,
          targetMx: -200,
          targetMy: -200,
          opacity: 0,
          targetOpacity: 0,
          lastMxStr: "",
          lastMyStr: "",
          lastOpStr: ""
        });
      }
      rectsDirty = true;
    }

    function refreshRects() {
      for (var i = 0; i < cards.length; i++) {
        var item = cards[i];
        var r = item.el.getBoundingClientRect();
        item.rect.left = r.left;
        item.rect.top = r.top;
        item.rect.right = r.right;
        item.rect.bottom = r.bottom;
        item.rect.width = r.width;
        item.rect.height = r.height;
        item.visible = isCardVisible(item);
      }
      rectsDirty = false;
    }

    function writeCardVars(item) {
      var opVal = item.opacity <= OPACITY_EPSILON ? 0 : item.opacity;
      var opStr = opVal === 0 ? "0" : opVal.toFixed(3);
      if (opStr !== item.lastOpStr) {
        item.el.style.setProperty("--spot-opacity", opStr);
        item.lastOpStr = opStr;
      }
      if (opVal > 0) {
        var mxStr = item.mx.toFixed(1) + "px";
        var myStr = item.my.toFixed(1) + "px";
        if (mxStr !== item.lastMxStr) {
          item.el.style.setProperty("--mx", mxStr);
          item.lastMxStr = mxStr;
        }
        if (myStr !== item.lastMyStr) {
          item.el.style.setProperty("--my", myStr);
          item.lastMyStr = myStr;
        }
      }
    }

    function updateTargets() {
      if (rectsDirty) {
        refreshRects();
      }
      for (var i = 0; i < cards.length; i++) {
        var item = cards[i];
        if (!item.visible || !pointerInside) {
          item.targetOpacity = 0;
          continue;
        }
        var r = item.rect;
        var dx = 0;
        if (pointerX < r.left) {
          dx = r.left - pointerX;
        } else if (pointerX > r.right) {
          dx = pointerX - r.right;
        }
        var dy = 0;
        if (pointerY < r.top) {
          dy = r.top - pointerY;
        } else if (pointerY > r.bottom) {
          dy = pointerY - r.bottom;
        }
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist >= PROXIMITY_RADIUS) {
          item.targetOpacity = 0;
        } else {
          var ratio = 1 - (dist / PROXIMITY_RADIUS);
          /* 平滑二次衰减：卡片内部为 1.0，160px 邻近卡片边框获得连续柔和泛光 */
          item.targetOpacity = ratio * ratio;
          var localX = pointerX - r.left;
          var localY = pointerY - r.top;
          /* 首次点亮瞬间贴合指针坐标，避免从初始默认坐标拖尾飞入 */
          if (item.opacity <= OPACITY_EPSILON) {
            item.mx = localX;
            item.my = localY;
          }
          item.targetMx = localX;
          item.targetMy = localY;
        }
      }
    }

    function tick() {
      rafId = 0;
      if (prefersReducedMotion) {
        resetAll();
        return;
      }

      updateTargets();

      var needsNextFrame = false;
      for (var i = 0; i < cards.length; i++) {
        var item = cards[i];
        if (item.opacity <= OPACITY_EPSILON && item.targetOpacity <= OPACITY_EPSILON) {
          if (item.opacity !== 0) {
            item.opacity = 0;
            writeCardVars(item);
          }
          continue;
        }

        var dOp = item.targetOpacity - item.opacity;
        if (Math.abs(dOp) <= OPACITY_EPSILON) {
          item.opacity = item.targetOpacity;
        } else {
          item.opacity += dOp * OPACITY_LERP;
          needsNextFrame = true;
        }

        if (item.opacity > OPACITY_EPSILON || item.targetOpacity > OPACITY_EPSILON) {
          var dX = item.targetMx - item.mx;
          var dY = item.targetMy - item.my;
          if (Math.abs(dX) <= POS_EPSILON) {
            item.mx = item.targetMx;
          } else {
            item.mx += dX * POS_LERP;
            needsNextFrame = true;
          }
          if (Math.abs(dY) <= POS_EPSILON) {
            item.my = item.targetMy;
          } else {
            item.my += dY * POS_LERP;
            needsNextFrame = true;
          }
        }

        writeCardVars(item);
      }

      if (needsNextFrame) {
        scheduleTick();
      }
    }

    function scheduleTick() {
      if (rafId || prefersReducedMotion) return;
      if (typeof window.requestAnimationFrame === "function") {
        rafId = window.requestAnimationFrame(tick);
      }
    }

    function onMouseMove(ev) {
      if (prefersReducedMotion || !cards.length) return;
      pointerInside = true;
      pointerX = ev.clientX;
      pointerY = ev.clientY;
      scheduleTick();
    }

    function onPointerLeave() {
      if (!pointerInside) return;
      pointerInside = false;
      if (!prefersReducedMotion && cards.length) {
        scheduleTick();
      }
    }

    function onMouseOut(ev) {
      var related = ev.relatedTarget || ev.toElement;
      if (!related) {
        onPointerLeave();
      }
    }

    function onVisibilityChange() {
      if (document.hidden) {
        onPointerLeave();
      }
    }

    function markRectsDirty() {
      rectsDirty = true;
      if (pointerInside && !prefersReducedMotion) {
        scheduleTick();
      }
    }

    function resetAll() {
      if (rafId && typeof window.cancelAnimationFrame === "function") {
        window.cancelAnimationFrame(rafId);
      }
      rafId = 0;
      pointerInside = false;
      for (var i = 0; i < cards.length; i++) {
        var item = cards[i];
        item.opacity = 0;
        item.targetOpacity = 0;
        item.lastOpStr = "0";
        item.el.style.setProperty("--spot-opacity", "0");
      }
    }

    function onTabSwitch() {
      /* 隐藏页签内的卡片立即清零，避免切回时残留旧聚光点 */
      for (var i = 0; i < cards.length; i++) {
        var item = cards[i];
        if (item.pane && !hasClass(item.pane, "is-active")) {
          item.opacity = 0;
          item.targetOpacity = 0;
          item.visible = false;
          item.lastOpStr = "0";
          item.el.style.setProperty("--spot-opacity", "0");
        }
      }
      rectsDirty = true;
      tabSettleTimer = clearTimer(tabSettleTimer);
      tabSettleTimer = setTimeout(function () {
        tabSettleTimer = 0;
        rectsDirty = true;
        if (pointerInside && !prefersReducedMotion) {
          scheduleTick();
        }
      }, 320);
    }

    function init() {
      if (initialized) return;
      initialized = true;
      collectCards();

      document.addEventListener("mousemove", onMouseMove, false);
      document.addEventListener("mouseleave", onPointerLeave, false);
      if (document.documentElement) {
        document.documentElement.addEventListener("mouseleave", onPointerLeave, false);
      }
      document.addEventListener("mouseout", onMouseOut, false);
      window.addEventListener("blur", onPointerLeave, false);
      document.addEventListener("visibilitychange", onVisibilityChange, false);

      /* 仅在布局可能变化时标记脏状态，严禁在 mousemove/scroll 中同步读写布局 */
      window.addEventListener("resize", markRectsDirty, false);
      document.addEventListener("scroll", markRectsDirty, true);
    }

    return {
      init: init,
      invalidateRects: markRectsDirty,
      onTabSwitch: onTabSwitch,
      resetAll: resetAll
    };
  })();

  /* ==========================================================================
   * 3. 动效编排与状态反馈层 (MotionFX)
   * ========================================================================== */

  var MotionFX = (function () {
    var logUpdateTimer = 0;
    var lastHasBackup = null;
    var arcGuideActive = false;

    /**
     * 在点击坐标触发光学微光涟漪（420ms 后自动销毁）
     */
    function spawnRipple(targetEl, clientX, clientY) {
      if (prefersReducedMotion || !targetEl) return;
      if (hasClass(targetEl, "is-busy") || targetEl.disabled) return;

      var host = targetEl.querySelector(".inst-card-inner") || targetEl;
      if (!host) return;

      var rect = host.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      var x = clientX - rect.left;
      var y = clientY - rect.top;
      var maxDim = Math.max(rect.width, rect.height);
      var size = Math.max(22, Math.min(Math.round(maxDim * 0.56), 108));
      var half = Math.round(size / 2);

      var ripple = document.createElement("span");
      ripple.className = "tap-ripple";
      ripple.setAttribute("aria-hidden", "true");
      ripple.style.width = size + "px";
      ripple.style.height = size + "px";
      ripple.style.marginLeft = (-half) + "px";
      ripple.style.marginTop = (-half) + "px";
      ripple.style.left = Math.round(x) + "px";
      ripple.style.top = Math.round(y) + "px";

      host.appendChild(ripple);

      setTimeout(function () {
        if (ripple && ripple.parentNode) {
          ripple.parentNode.removeChild(ripple);
        }
      }, 420);
    }

    function isBusy(el) {
      if (!el) return false;
      return getElState(el).busy || hasClass(el, "is-busy");
    }

    function setBusy(el, busy) {
      if (!el) return;
      var st = getElState(el);
      st.busy = !!busy;
      toggleClass(el, "is-busy", st.busy);
      el.setAttribute("aria-busy", st.busy ? "true" : "false");
    }

    /**
     * 执行结果脉冲反馈：成功 .flash-ok (520ms) / 失败 .flash-err (460ms)
     */
    function flashResult(el, ok) {
      if (!el) return;
      var st = getElState(el);
      st.flashTimer = clearTimer(st.flashTimer);
      removeClass(el, "flash-ok");
      removeClass(el, "flash-err");

      var cls = ok ? "flash-ok" : "flash-err";
      var duration = ok ? 520 : 460;
      forceReflow(el);
      addClass(el, cls);

      st.flashTimer = setTimeout(function () {
        st.flashTimer = 0;
        removeClass(el, cls);
      }, duration);
    }

    /**
     * 原稿护盾首次激活高光斜扫 (.flash-sheen · 650ms)
     */
    function triggerBackupSheen(btn) {
      if (!btn || prefersReducedMotion) return;
      var st = getElState(btn);
      st.sheenTimer = clearTimer(st.sheenTimer);
      removeClass(btn, "flash-sheen");
      forceReflow(btn);
      addClass(btn, "flash-sheen");
      st.sheenTimer = setTimeout(function () {
        st.sheenTimer = 0;
        removeClass(btn, "flash-sheen");
      }, 650);
    }

    /**
     * 顶部刷新按钮旋转微动效 (.is-spinning · 420ms)
     */
    function spinRefreshButton(btn) {
      if (!btn) return;
      var st = getElState(btn);
      st.spinTimer = clearTimer(st.spinTimer);
      removeClass(btn, "is-spinning");
      forceReflow(btn);
      addClass(btn, "is-spinning");
      st.spinTimer = setTimeout(function () {
        st.spinTimer = 0;
        removeClass(btn, "is-spinning");
      }, 420);
    }

    /**
     * 底部状态岛消息与状态类更新（保留元素原有基础类，仅切换契约状态类）
     * @param {string} msg - 展示文案
     * @param {string|boolean} state - "idle" | "busy" | "ok" | "err"（兼容布尔值 isError）
     */
    function setLog(msg, state) {
      var box = byId("logBox");
      var txt = byId("logText");
      if (!box || !txt) return;

      var mode = state;
      if (typeof state === "boolean") {
        mode = state ? "err" : "idle";
      }

      var textVal = msg === undefined || msg === null ? "" : String(msg);
      txt.textContent = textVal;
      txt.title = textVal;

      removeClass(box, "is-busy");
      removeClass(box, "is-ok");
      removeClass(box, "is-err");

      if (mode === "busy") {
        addClass(box, "is-busy");
      } else if (mode === "ok") {
        addClass(box, "is-ok");
      } else if (mode === "err") {
        addClass(box, "is-err");
        if (!prefersReducedMotion) {
          var boxSt = getElState(box);
          boxSt.flashTimer = clearTimer(boxSt.flashTimer);
          removeClass(box, "flash-err");
          forceReflow(box);
          addClass(box, "flash-err");
          boxSt.flashTimer = setTimeout(function () {
            boxSt.flashTimer = 0;
            removeClass(box, "flash-err");
          }, 460);
        }
      }

      if (!prefersReducedMotion) {
        logUpdateTimer = clearTimer(logUpdateTimer);
        removeClass(txt, "is-updating");
        forceReflow(txt);
        addClass(txt, "is-updating");
        logUpdateTimer = setTimeout(function () {
          logUpdateTimer = 0;
          removeClass(txt, "is-updating");
        }, 220);
      }
    }

    /**
     * 同步原稿备份护盾状态（false -> true 首次激活时触发 .flash-sheen）
     */
    function syncBackupState(hasBackup, forceSheenIfCreated) {
      var nextVal = !!hasBackup;
      var btn = byId("btnBackup");
      var txt = byId("txtBackupState");

      if (txt) {
        txt.textContent = nextVal ? "原稿已备份" : "备份原稿";
      }
      if (btn) {
        toggleClass(btn, "is-backed-up", nextVal);
        if (nextVal && (lastHasBackup === false || forceSheenIfCreated)) {
          triggerBackupSheen(btn);
        }
      }
      lastHasBackup = nextVal;
    }

    /**
     * 同步漏拆雷达巡检状态 (#btnRadarScan.is-radar-active)
     */
    function setRadarActive(active) {
      var btn = byId("btnRadarScan");
      if (btn) {
        toggleClass(btn, "is-radar-active", !!active);
      }
    }

    /**
     * 根据宿主返回数据或文案准确同步旋转参考环激活态 (#btnArcGuide.is-active)
     */
    function syncArcGuideState(res) {
      var btn = byId("btnArcGuide");
      if (!btn || !res || !res.ok) return;

      if (typeof res.active === "boolean") {
        arcGuideActive = res.active;
      } else {
        var msg = String(res.message || "");
        if (
          msg.indexOf("已隐藏") !== -1 ||
          msg.indexOf("已移除") !== -1 ||
          msg.indexOf("已清除") !== -1 ||
          msg.indexOf("已关闭") !== -1
        ) {
          arcGuideActive = false;
        } else if (
          msg.indexOf("已开启") !== -1 ||
          msg.indexOf("已生成") !== -1 ||
          msg.indexOf("生成半径") !== -1 ||
          msg.indexOf("已显示") !== -1
        ) {
          arcGuideActive = true;
        } else {
          arcGuideActive = !arcGuideActive;
        }
      }

      toggleClass(btn, "is-active", arcGuideActive);
      btn.setAttribute("aria-pressed", arcGuideActive ? "true" : "false");
    }

    return {
      spawnRipple: spawnRipple,
      isBusy: isBusy,
      setBusy: setBusy,
      flashResult: flashResult,
      triggerBackupSheen: triggerBackupSheen,
      spinRefreshButton: spinRefreshButton,
      setLog: setLog,
      syncBackupState: syncBackupState,
      setRadarActive: setRadarActive,
      syncArcGuideState: syncArcGuideState
    };
  })();

  /* ==========================================================================
   * 4. 丝滑交互编排层 (Controls: 分段页签 / 精密标尺滑块 / 5 向空间罗盘)
   * ========================================================================== */

  var Controls = (function () {
    var currentTabIdx = 0;
    var currentCompassDir = "up";
    var staggerTimer = 0;

    var DIR_LABELS = {
      up: "向上 ↑",
      down: "向下 ↓",
      left: "向左 ←",
      right: "向右 →",
      all: "全向 ✥"
    };

    function getCurrentDir() {
      return currentCompassDir;
    }

    /**
     * 页签切换：更新滑块位移、双向舞台方向、pane 激活与 Stagger 错峰入场
     */
    function switchMode(idx, silentInit) {
      var nextIdx = parseInt(idx, 10) === 1 ? 1 : 0;
      var isChanging = nextIdx !== currentTabIdx;
      var dir = nextIdx >= currentTabIdx ? "forward" : "backward";

      var track = byId("modeTrack");
      var glider = byId("modeGlider");
      var stage = byId("viewsStage");
      var tabs = toArray(document.querySelectorAll(".nav-item"));
      var pane0 = byId("pane0");
      var pane1 = byId("pane1");
      var panes = [pane0, pane1];

      if (track) {
        track.setAttribute("data-active-tab", String(nextIdx));
      }
      if (glider) {
        glider.style.transform = "translate3d(" + (nextIdx * 100) + "%, 0, 0)";
      }
      if (stage) {
        stage.setAttribute("data-dir", dir);
      }

      for (var i = 0; i < tabs.length; i++) {
        var tAttr = tabs[i].getAttribute("data-tab-target");
        var tIdx = tAttr !== null ? parseInt(tAttr, 10) : i;
        var isTarget = tIdx === nextIdx;
        toggleClass(tabs[i], "is-active", isTarget);
        tabs[i].setAttribute("aria-selected", isTarget ? "true" : "false");
      }

      staggerTimer = clearTimer(staggerTimer);

      for (var p = 0; p < panes.length; p++) {
        if (!panes[p]) continue;
        var isPaneActive = p === nextIdx;
        removeClass(panes[p], "is-entering");
        toggleClass(panes[p], "is-active", isPaneActive);
        panes[p].setAttribute("aria-hidden", isPaneActive ? "false" : "true");
      }

      var activePane = panes[nextIdx];
      if (!silentInit && isChanging && activePane && !prefersReducedMotion) {
        forceReflow(activePane);
        addClass(activePane, "is-entering");
        staggerTimer = setTimeout(function () {
          staggerTimer = 0;
          removeClass(activePane, "is-entering");
        }, 380);
      }

      currentTabIdx = nextIdx;
      SpotlightEngine.onTabSwitch();
    }

    /**
     * 精密标尺滑块同步：--slider-ratio (0~1)、数值胶囊文本、最近刻度点亮
     */
    function syncSlider(inputId, wrapId, labelId, explicitVal) {
      var input = byId(inputId);
      var wrap = byId(wrapId);
      var label = byId(labelId);
      if (!input) return;

      var min = parseFloat(input.min);
      var max = parseFloat(input.max);
      if (isNaN(min)) min = 0;
      if (isNaN(max)) max = 100;

      if (explicitVal !== undefined && explicitVal !== null && explicitVal !== "") {
        var parsedExplicit = parseFloat(explicitVal);
        if (!isNaN(parsedExplicit)) {
          if (parsedExplicit < min) parsedExplicit = min;
          if (parsedExplicit > max) parsedExplicit = max;
          input.value = String(parsedExplicit);
        }
      }

      var val = parseFloat(input.value);
      if (isNaN(val)) val = min;
      if (val < min) val = min;
      if (val > max) val = max;

      var ratio = max > min ? (val - min) / (max - min) : 0;
      if (ratio < 0) ratio = 0;
      if (ratio > 1) ratio = 1;

      if (wrap) {
        wrap.style.setProperty("--slider-ratio", ratio.toFixed(4));
        var ticks = toArray(wrap.querySelectorAll(".ruler-tick"));
        var closestTick = null;
        var closestDist = Infinity;
        for (var i = 0; i < ticks.length; i++) {
          var tickVal = parseFloat(ticks[i].getAttribute("data-tick"));
          if (isNaN(tickVal)) continue;
          var dist = Math.abs(tickVal - val);
          if (dist < closestDist) {
            closestDist = dist;
            closestTick = ticks[i];
          }
        }
        for (var j = 0; j < ticks.length; j++) {
          toggleClass(ticks[j], "is-current", ticks[j] === closestTick);
        }
      }

      if (label) {
        label.textContent = String(val) + " px";
      }
    }

    function syncShaveSlider(val) {
      syncSlider("rngShavePx", "sliderShaveWrap", "lblShavePx", val);
    }

    function syncJointSlider(val) {
      syncSlider("rngJointPx", "sliderJointWrap", "lblJointPx", val);
    }

    function setSliderDragging(wrap, isDragging) {
      if (!wrap) return;
      toggleClass(wrap, "is-dragging", !!isDragging);
    }

    function clearAllSliderDragging() {
      var wraps = toArray(document.querySelectorAll(".ruler-slider.is-dragging"));
      for (var i = 0; i < wraps.length; i++) {
        removeClass(wraps[i], "is-dragging");
      }
    }

    /**
     * 5 向空间罗盘选择：同步 #compassDial[data-dir]、.dir-chip、#badgeDir 弹跳
     */
    function pickCompassDir(el, dirCode, dirLabel, silentInit) {
      var rawCode = dirCode || (el && el.getAttribute("data-dir")) || "all";
      var code = DIR_LABELS.hasOwnProperty(rawCode) ? rawCode : "all";
      var label = dirLabel || (el && el.getAttribute("data-dir-label")) || DIR_LABELS[code];

      var changed = code !== currentCompassDir;
      currentCompassDir = code;

      var dial = byId("compassDial");
      if (dial) {
        dial.setAttribute("data-dir", code);
      }

      var chips = toArray(document.querySelectorAll(".dir-chip"));
      for (var i = 0; i < chips.length; i++) {
        var isActive = chips[i].getAttribute("data-dir") === code;
        toggleClass(chips[i], "is-active", isActive);
        chips[i].setAttribute("aria-pressed", isActive ? "true" : "false");
      }

      var badge = byId("badgeDir");
      if (badge) {
        badge.textContent = label;
        if (!silentInit && changed && !prefersReducedMotion) {
          var st = getElState(badge);
          st.popTimer = clearTimer(st.popTimer);
          removeClass(badge, "is-pop");
          forceReflow(badge);
          addClass(badge, "is-pop");
          st.popTimer = setTimeout(function () {
            st.popTimer = 0;
            removeClass(badge, "is-pop");
          }, 200);
        }
      }
    }

    function init() {
      var track = byId("modeTrack");
      var initTab = track ? parseInt(track.getAttribute("data-active-tab") || "0", 10) : 0;
      currentTabIdx = initTab === 1 ? 1 : 0;
      switchMode(currentTabIdx, true);

      syncShaveSlider();
      syncJointSlider();

      var dial = byId("compassDial");
      var initDir = (dial && dial.getAttribute("data-dir")) || "up";
      pickCompassDir(null, initDir, null, true);
    }

    return {
      init: init,
      switchMode: switchMode,
      syncShaveSlider: syncShaveSlider,
      syncJointSlider: syncJointSlider,
      setSliderDragging: setSliderDragging,
      clearAllSliderDragging: clearAllSliderDragging,
      pickCompassDir: pickCompassDir,
      getCurrentDir: getCurrentDir,
      getCurrentTab: function () { return currentTabIdx; }
    };
  })();

  /* ==========================================================================
   * 5. 浏览器离线预览模拟层 (OfflinePreviewBridge · 仅无 __adobe_cep__ 时启用)
   * ========================================================================== */

  var OfflinePreviewBridge = (function () {
    var DIR_CN = {
      up: "向上",
      down: "向下",
      left: "向左",
      right: "向右",
      all: "全向"
    };

    var mockState = {
      hasDoc: true,
      docName: "Hero_Char.psd",
      activeLayerName: "arm_upper_L",
      hasSelection: true,
      hasBackup: false,
      workArtLayers: 14,
      groupCount: 3,
      radarActive: false,
      arcGuideActive: false,
      splitSeq: 1
    };

    function buildContextSnapshot() {
      return {
        ok: true,
        hasDoc: mockState.hasDoc,
        docName: mockState.docName,
        activeLayerName: mockState.activeLayerName,
        hasSelection: mockState.hasSelection,
        overview: {
          hasBackup: mockState.hasBackup,
          workArtLayers: mockState.workArtLayers,
          groupCount: mockState.groupCount
        }
      };
    }

    function computeResult(action, a1, a2) {
      if (action === "getContext") {
        return buildContextSnapshot();
      }

      if (action === "initWorkspace") {
        if (!mockState.hasBackup) {
          mockState.hasBackup = true;
          return {
            ok: true,
            backupCreated: true,
            message: "已锁定原稿基准快照（_原稿备份_），可随时拆图或找回像素。"
          };
        }
        return {
          ok: true,
          backupCreated: false,
          message: "原稿基准快照已存在，已重新校验保护锁。"
        };
      }

      if (action === "runUnsplitRadar") {
        mockState.radarActive = true;
        mockState.hasSelection = true;
        return {
          ok: true,
          hasUnsplit: true,
          splitCount: mockState.workArtLayers,
          message: "检测到遗漏像素区域（约 46x32 px），已在顶层生成雷达高亮层并保留选区。"
        };
      }

      if (action === "clearUnsplitRadar") {
        var wasActive = mockState.radarActive;
        mockState.radarActive = false;
        return {
          ok: true,
          removed: wasActive ? 1 : 0,
          message: wasActive ? "已清除漏拆高亮雷达检查层。" : "当前没有开启中的漏拆雷达检查层。"
        };
      }

      if (action === "splitAndPreparePatch") {
        var partName = "part_split_" + String(mockState.splitSeq++);
        mockState.workArtLayers += 1;
        mockState.hasSelection = true;
        return {
          ok: true,
          message: "已拆出「" + partName + "」，并在底层留好外扩 " + (a1 || "2") + "px 待补咬合选区。"
        };
      }

      if (action === "splitMultiLayers") {
        mockState.workArtLayers += 1;
        return {
          ok: true,
          message: "已将选定多图层合并同拆为独立部件（模式: " + (a1 || "merge") + "）。"
        };
      }

      if (action === "splitClipChain") {
        mockState.workArtLayers += 2;
        return {
          ok: true,
          message: "已按剪贴蒙版链完整结构同步拆出基底与光影附属层。"
        };
      }

      if (action === "shaveLayerEdge") {
        return {
          ok: true,
          message: "已执行轮廓内缩 " + (a1 || "1") + "px（羽化 " + (a2 || "0.5") + "px）精准削毛边。"
        };
      }

      if (action === "cleanEmptyLayers") {
        return {
          ok: true,
          removedLayers: 2,
          removedGroups: 1,
          message: "已清理 2 个全透明空图层与 1 个空组。"
        };
      }

      if (action === "patchOcclusionHole") {
        if (a2 === "bleed") {
          return {
            ok: true,
            message: "已执行周边像素坍缩无缝封口（外扩咬合 " + (a1 || "2") + "px）。"
          };
        }
        return {
          ok: true,
          message: "已完成缺口智能实色封口补底（内容识别 + " + (a1 || "2") + "px 咬合）。"
        };
      }

      if (action === "createPatchLayer") {
        mockState.workArtLayers += 1;
        if (a1 === "clipped") {
          mockState.activeLayerName = "patch_clipped";
          return {
            ok: true,
            message: "已在上方新建剪贴修补层「patch_clipped」，可直接手绘精修。"
          };
        }
        mockState.activeLayerName = "patch_under";
        return {
          ok: true,
          message: "已在底层垫入关节补画层「patch_under」，可直接手绘补全。"
        };
      }

      if (action === "extendJointDirectional") {
        var dirLabel = DIR_CN[a2] || "全向";
        return {
          ok: true,
          message: "已沿【" + dirLabel + "】延展补出 " + (a1 || "12") + "px 关节实色基底。"
        };
      }

      if (action === "toggleJointArcGuide") {
        mockState.arcGuideActive = !mockState.arcGuideActive;
        if (mockState.arcGuideActive) {
          return {
            ok: true,
            active: true,
            message: "已在关节中心生成半径 64px 的旋转包络参考圆环（再次点击即可清除）。"
          };
        }
        return {
          ok: true,
          active: false,
          message: "已隐藏并清除关节旋转参考圆环。"
        };
      }

      if (action === "restoreFromBackup") {
        mockState.workArtLayers += 1;
        return {
          ok: true,
          message: "已从原稿基准快照找回框选区域像素，生成图层「" + (a1 || "原稿找回") + "」。"
        };
      }

      return {
        ok: false,
        message: "未知的面板指令: " + String(action)
      };
    }

    function invoke(action, a1, a2, a3, a4, a5, cb, opts) {
      var isSilent = !!(opts && opts.silent);
      var delay;
      if (action === "getContext") {
        /* 静默首屏初始化极速同步渲染状态栏，避免出现未水合闪烁；手动刷新保留轻快反馈节奏 */
        delay = isSilent ? 16 : 180;
      } else {
        /* 260~380ms 逼真异步延迟，完整展现 .is-busy 流光与反馈脉冲编排 */
        delay = 270 + ((action.length * 19) % 105);
      }

      setTimeout(function () {
        var res = computeResult(action, a1, a2);
        if (cb) cb(res);
      }, delay);
    }

    return {
      invoke: invoke
    };
  })();

  /* ==========================================================================
   * 6. 宿主桥接与动作编排 (HostBridge)
   * ========================================================================== */

  var PENDING_LABELS = {
    initWorkspace: "正在锁定原稿基准快照…",
    runUnsplitRadar: "正在扫描漏拆像素区域…",
    clearUnsplitRadar: "正在清除雷达高亮层…",
    splitAndPreparePatch: "正在拆出部件并留待补选区…",
    splitMultiLayers: "正在跨多层合并同拆…",
    splitClipChain: "正在按剪贴链结构同拆…",
    shaveLayerEdge: "正在执行轮廓内缩削毛边…",
    cleanEmptyLayers: "正在扫描清理空图层与空组…",
    patchOcclusionHole: "正在执行缺口无缝封口补底…",
    createPatchLayer: "正在创建手绘补画层…",
    extendJointDirectional: "正在延展关节断口像素…",
    toggleJointArcGuide: "正在切换关节旋转参考环…",
    restoreFromBackup: "正在从原稿找回选区像素…"
  };

  var pendingActionCount = 0;

  function isCepHost() {
    return typeof window.__adobe_cep__ !== "undefined" &&
      window.__adobe_cep__ !== null &&
      typeof window.__adobe_cep__.evalScript === "function";
  }

  function escJsStr(val) {
    return String(val === undefined || val === null ? "" : val)
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\r/g, "\\r")
      .replace(/\n/g, "\\n");
  }

  function callHost(action, a1, a2, a3, a4, a5, cb, opts) {
    if (isCepHost()) {
      var script = 'PSSplitter_CEP_Call("' +
        escJsStr(action) + '","' +
        escJsStr(a1) + '","' +
        escJsStr(a2) + '","' +
        escJsStr(a3) + '","' +
        escJsStr(a4) + '","' +
        escJsStr(a5) + '")';

      window.__adobe_cep__.evalScript(script, function (rawRes) {
        var parsed = null;
        try {
          parsed = JSON.parse(rawRes);
        } catch (e) {
          parsed = {
            ok: false,
            message: "响应异常: " + String(rawRes)
          };
        }
        if (cb) cb(parsed);
      });
      return;
    }

    OfflinePreviewBridge.invoke(action, a1, a2, a3, a4, a5, cb, opts);
  }

  /**
   * 将 getContext 响应水合至顶部状态栏与原稿护盾
   */
  function applyContextResponse(res, silent) {
    if (!res) return;

    var hasDoc = !!res.hasDoc;
    var hasSel = !!res.hasSelection;
    var docName = res.docName ? String(res.docName) : "未打开文档";
    var layerName = hasDoc ? (res.activeLayerName ? String(res.activeLayerName) : "-") : "未打开文档";
    var overview = res.overview || {};
    var workLayers = typeof overview.workArtLayers === "number" ? overview.workArtLayers : 0;

    var dotEl = byId("selDot");
    var lyrEl = byId("lblActiveLayer");
    var cntEl = byId("lblLayerCount");
    var chipEl = byId("ctxChip");

    if (dotEl) {
      toggleClass(dotEl, "is-on", hasSel);
    }
    if (lyrEl) {
      lyrEl.textContent = layerName;
    }
    if (cntEl) {
      if (hasDoc && workLayers > 0) {
        cntEl.textContent = String(workLayers) + "L";
        removeClass(cntEl, "is-hidden");
      } else {
        cntEl.textContent = "";
        addClass(cntEl, "is-hidden");
      }
    }
    if (chipEl) {
      chipEl.title = hasDoc
        ? ("文档: " + docName + " | 图层: " + layerName + " | 选区: " + (hasSel ? "有" : "无"))
        : "文档: 未打开文档 | 图层: - | 选区: 无";
    }

    if (res.overview) {
      MotionFX.syncBackupState(!!overview.hasBackup, false);
    }

    /* 静默刷新严禁覆写底部默认就绪文案或刚完成的动作结果 */
    if (!silent) {
      if (res.ok === false) {
        MotionFX.setLog(res.message || "状态同步失败", "err");
      } else if (hasDoc) {
        MotionFX.setLog("已同步当前图层与选区状态", "ok");
      } else {
        MotionFX.setLog("当前未打开 Photoshop 文档", "idle");
      }
    }
  }

  function resolveTriggerByAction(action, arg) {
    if (action === "refreshContext") return byId("btnRefreshTop");
    if (action === "initWorkspace") return byId("btnBackup");
    if (action === "runUnsplitRadar") return byId("btnRadarScan");
    if (action === "clearUnsplitRadar") return byId("btnClearRadar");
    if (action === "splitAndPreparePatch") return byId("btnSplitPatch");
    if (action === "splitMultiLayers") return byId("btnMultiSplit");
    if (action === "splitClipChain") return byId("btnClipSplit");
    if (action === "shaveLayerEdge") return byId("btnShaveEdge");
    if (action === "cleanEmptyLayers") return byId("btnCleanEmpty");
    if (action === "patchOcclusionHole") {
      return arg === "bleed" ? byId("btnPatchBleed") : byId("btnPatchSolid");
    }
    if (action === "createPatchLayer") {
      return arg === "clipped" ? byId("btnLayerClipped") : byId("btnLayerUnder");
    }
    if (action === "extendJointDirectional") return byId("btnJointExtend");
    if (action === "toggleJointArcGuide") return byId("btnArcGuide");
    if (action === "restoreFromBackup") return byId("btnRescue");
    return null;
  }

  function applySpecializedPostState(action, res) {
    if (!res || !res.ok) return;

    if (action === "initWorkspace" && res.backupCreated) {
      MotionFX.syncBackupState(true, true);
    } else if (action === "runUnsplitRadar") {
      /* 仅当未明确声明 hasUnsplit === false 时激活巡检扫描动画 */
      MotionFX.setRadarActive(res.hasUnsplit !== false);
    } else if (action === "clearUnsplitRadar") {
      MotionFX.setRadarActive(false);
    } else if (action === "toggleJointArcGuide") {
      MotionFX.syncArcGuideState(res);
    }
  }

  /**
   * 统一执行宿主动作：防重入锁 -> .is-busy 流光 -> 回执脉冲 -> 特化仪器状态 -> 静默同步上下文
   */
  function executeHostAction(action, a1, a2, a3, a4, a5, triggerEl) {
    var el = triggerEl || resolveTriggerByAction(action, a2 || a1);
    if (el && MotionFX.isBusy(el)) {
      return;
    }

    if (el) {
      MotionFX.setBusy(el, true);
    }

    pendingActionCount += 1;
    MotionFX.setLog(PENDING_LABELS[action] || ("正在执行: " + action + "…"), "busy");

    callHost(action, a1, a2, a3, a4, a5, function (res) {
      pendingActionCount = pendingActionCount > 0 ? (pendingActionCount - 1) : 0;

      if (el) {
        MotionFX.setBusy(el, false);
      }

      var ok = !!(res && res.ok);
      var msg = (res && res.message)
        ? String(res.message)
        : (ok ? "执行完成" : "未完成操作");

      if (el) {
        MotionFX.flashResult(el, ok);
      }

      applySpecializedPostState(action, res);
      MotionFX.setLog(msg, ok ? "ok" : "err");
      window.refreshContext(true);
    }, { silent: false });
  }

  /**
   * 根据声明式 data-ui-action 与 data-arg 分发至对应宿主指令
   */
  function dispatchUiAction(uiAction, arg, triggerEl) {
    if (uiAction === "refreshContext") {
      window.refreshContext(false);
      return;
    }
    if (uiAction === "initWorkspace") {
      executeHostAction("initWorkspace", "", "", "", "", "", triggerEl);
      return;
    }
    if (uiAction === "runUnsplitRadar") {
      executeHostAction("runUnsplitRadar", arg || "1", "", "", "", "", triggerEl);
      return;
    }
    if (uiAction === "clearUnsplitRadar") {
      executeHostAction("clearUnsplitRadar", "", "", "", "", "", triggerEl);
      return;
    }
    if (uiAction === "splitAndPreparePatch") {
      executeHostAction("splitAndPreparePatch", arg || "2", "", "", "", "", triggerEl);
      return;
    }
    if (uiAction === "splitMultiLayers") {
      executeHostAction("splitMultiLayers", arg || "merge", "", "", "", "", triggerEl);
      return;
    }
    if (uiAction === "splitClipChain") {
      executeHostAction("splitClipChain", arg || "preserve", "", "", "", "", triggerEl);
      return;
    }
    if (uiAction === "shaveLayerEdge") {
      var shaveInput = byId("rngShavePx");
      var shavePx = (shaveInput && shaveInput.value) ? String(shaveInput.value) : "1";
      executeHostAction("shaveLayerEdge", shavePx, "0.5", "", "", "", triggerEl);
      return;
    }
    if (uiAction === "cleanEmptyLayers") {
      executeHostAction("cleanEmptyLayers", "", "", "", "", "", triggerEl);
      return;
    }
    if (uiAction === "patchOcclusionHole") {
      executeHostAction("patchOcclusionHole", "2", arg || "caf_solid", "", "", "", triggerEl);
      return;
    }
    if (uiAction === "createPatchLayer") {
      executeHostAction("createPatchLayer", arg || "under", "", "", "", "", triggerEl);
      return;
    }
    if (uiAction === "extendJointDirectional") {
      var jointInput = byId("rngJointPx");
      var jointPx = (jointInput && jointInput.value) ? String(jointInput.value) : "12";
      executeHostAction(
        "extendJointDirectional",
        jointPx,
        Controls.getCurrentDir(),
        "bleed",
        "",
        "",
        triggerEl
      );
      return;
    }
    if (uiAction === "toggleJointArcGuide") {
      executeHostAction("toggleJointArcGuide", arg || "0", "", "", "", "", triggerEl);
      return;
    }
    if (uiAction === "restoreFromBackup") {
      executeHostAction("restoreFromBackup", arg || "原稿找回", "", "", "", "", triggerEl);
    }
  }

  /* ==========================================================================
   * 7. 向后兼容全局 API 导出 (100% 契合契约 #5 4.2.3)
   * ========================================================================== */

  window.switchMode = function (idx) {
    Controls.switchMode(idx, false);
  };

  window.onShaveSlide = function (val) {
    Controls.syncShaveSlider(val);
  };

  window.onJointSlide = function (val) {
    Controls.syncJointSlider(val);
  };

  window.pickCompassDir = function (el, dirCode, dirLabel) {
    Controls.pickCompassDir(el, dirCode, dirLabel, false);
  };

  window.refreshContext = function (silent) {
    var isSilent = !!silent;
    var btn = byId("btnRefreshTop");

    if (!isSilent && btn) {
      if (MotionFX.isBusy(btn)) return;
      MotionFX.setBusy(btn, true);
      MotionFX.spinRefreshButton(btn);
      MotionFX.setLog("正在同步文档与选区状态…", "busy");
    }

    callHost("getContext", "", "", "", "", "", function (res) {
      if (!isSilent && btn) {
        MotionFX.setBusy(btn, false);
        if (res && res.ok === false) {
          MotionFX.flashResult(btn, false);
        }
      }
      applyContextResponse(res, isSilent);
    }, { silent: isSilent });
  };

  window.runLockOriginal = function () {
    dispatchUiAction("initWorkspace", "", byId("btnBackup"));
  };

  window.runUnsplitRadarScan = function () {
    dispatchUiAction("runUnsplitRadar", "1", byId("btnRadarScan"));
  };

  window.runClearRadar = function () {
    dispatchUiAction("clearUnsplitRadar", "", byId("btnClearRadar"));
  };

  window.runSplitAndPreparePatch = function () {
    dispatchUiAction("splitAndPreparePatch", "2", byId("btnSplitPatch"));
  };

  window.runMultiLayerSplit = function (mode) {
    dispatchUiAction("splitMultiLayers", mode || "merge", byId("btnMultiSplit"));
  };

  window.runClipChainSplit = function (mode) {
    dispatchUiAction("splitClipChain", mode || "preserve", byId("btnClipSplit"));
  };

  window.runTrueEdgeShave = function () {
    dispatchUiAction("shaveLayerEdge", "", byId("btnShaveEdge"));
  };

  window.runCleanEmpty = function () {
    dispatchUiAction("cleanEmptyLayers", "", byId("btnCleanEmpty"));
  };

  window.runPatchHole = function (method) {
    var m = method || "caf_solid";
    dispatchUiAction("patchOcclusionHole", m, resolveTriggerByAction("patchOcclusionHole", m));
  };

  window.runCreatePatchLayer = function (mode) {
    var m = mode || "under";
    dispatchUiAction("createPatchLayer", m, resolveTriggerByAction("createPatchLayer", m));
  };

  window.runDirectionalJointExtend = function () {
    dispatchUiAction("extendJointDirectional", "", byId("btnJointExtend"));
  };

  window.runToggleArcGuide = function () {
    dispatchUiAction("toggleJointArcGuide", "0", byId("btnArcGuide"));
  };

  window.runRescueSelection = function () {
    dispatchUiAction("restoreFromBackup", "原稿找回", byId("btnRescue"));
  };

  /* ==========================================================================
   * 8. 统一事件委托与初始化启动 (EventDelegation & Bootstrap)
   * ========================================================================== */

  function bindEventDelegation() {
    /* 1. mousedown：触觉涟漪 + 滑块拖拽激活 */
    document.addEventListener("mousedown", function (ev) {
      if (ev.button !== 0) return;

      var rippleTarget = findClosestAttr(ev.target, "data-ripple", "true");
      if (rippleTarget) {
        MotionFX.spawnRipple(rippleTarget, ev.clientX, ev.clientY);
      }

      if (ev.target && (ev.target.id === "rngShavePx" || ev.target.id === "rngJointPx")) {
        var sliderWrap = findClosestClass(ev.target, "ruler-slider");
        Controls.setSliderDragging(sliderWrap, true);
      }
    }, false);

    /* 2. touchstart：触摸/数位笔滑块拖拽激活 */
    document.addEventListener("touchstart", function (ev) {
      if (ev.target && (ev.target.id === "rngShavePx" || ev.target.id === "rngJointPx")) {
        var sliderWrap = findClosestClass(ev.target, "ruler-slider");
        Controls.setSliderDragging(sliderWrap, true);
      }
    }, false);

    /* 3. 全局释放与失焦：确保滑块 .is-dragging 绝不残留 */
    document.addEventListener("mouseup", Controls.clearAllSliderDragging, false);
    document.addEventListener("touchend", Controls.clearAllSliderDragging, false);
    document.addEventListener("touchcancel", Controls.clearAllSliderDragging, false);
    window.addEventListener("blur", Controls.clearAllSliderDragging, false);
    document.addEventListener("blur", function (ev) {
      if (ev.target && (ev.target.id === "rngShavePx" || ev.target.id === "rngJointPx")) {
        var sliderWrap = findClosestClass(ev.target, "ruler-slider");
        Controls.setSliderDragging(sliderWrap, false);
      }
    }, true);

    /* 4. 滑块实时 input / change 委托 */
    function handleSliderEvent(ev) {
      var target = ev.target;
      if (!target) return;
      if (target.id === "rngShavePx") {
        Controls.syncShaveSlider(target.value);
      } else if (target.id === "rngJointPx") {
        Controls.syncJointSlider(target.value);
      }
    }
    document.addEventListener("input", handleSliderEvent, false);
    document.addEventListener("change", handleSliderEvent, false);

    /* 5. click 统一委托：页签 / 5 向罗盘 / 标尺刻度快选 / 全部 16 个宿主动作 */
    document.addEventListener("click", function (ev) {
      /* 5.1 页签切换 [data-tab-target] */
      var tabEl = findClosestAttr(ev.target, "data-tab-target");
      if (tabEl) {
        var tabIdx = parseInt(tabEl.getAttribute("data-tab-target"), 10);
        if (!isNaN(tabIdx)) {
          Controls.switchMode(tabIdx, false);
        }
        return;
      }

      /* 5.2 5 向空间罗盘 [data-dir]（限定 .dir-chip 避免误触容器 #compassDial） */
      var dirChip = findClosestClass(ev.target, "dir-chip");
      if (dirChip) {
        var dirCode = dirChip.getAttribute("data-dir");
        var dirLabel = dirChip.getAttribute("data-dir-label");
        Controls.pickCompassDir(dirChip, dirCode, dirLabel, false);
        return;
      }

      /* 5.3 精密标尺刻度点击快选 [data-tick] */
      var tickEl = findClosestAttr(ev.target, "data-tick");
      if (tickEl && hasClass(tickEl, "ruler-tick")) {
        var tickVal = tickEl.getAttribute("data-tick");
        var wrap = findClosestClass(tickEl, "ruler-slider");
        if (wrap && tickVal !== null) {
          if (wrap.id === "sliderShaveWrap") {
            Controls.syncShaveSlider(tickVal);
          } else if (wrap.id === "sliderJointWrap") {
            Controls.syncJointSlider(tickVal);
          }
        }
        return;
      }

      /* 5.4 宿主操作按钮 [data-ui-action] */
      var actionEl = findClosestAttr(ev.target, "data-ui-action");
      if (actionEl) {
        var uiAction = actionEl.getAttribute("data-ui-action");
        var arg = actionEl.getAttribute("data-arg") || "";
        dispatchUiAction(uiAction, arg, actionEl);
      }
    }, false);

    /* 6. 页签键盘左右方向键快捷切换（无障碍增强） */
    document.addEventListener("keydown", function (ev) {
      var tabEl = findClosestAttr(ev.target, "data-tab-target");
      if (!tabEl) return;
      var key = ev.key || "";
      var code = ev.keyCode || 0;
      if (key === "ArrowRight" || key === "ArrowLeft" || code === 39 || code === 37) {
        ev.preventDefault();
        var nextTab = Controls.getCurrentTab() === 0 ? 1 : 0;
        Controls.switchMode(nextTab, false);
        var nextBtn = document.querySelector('.nav-item[data-tab-target="' + String(nextTab) + '"]');
        if (nextBtn && typeof nextBtn.focus === "function") {
          nextBtn.focus();
        }
      }
    }, false);
  }

  function bootstrap() {
    initReducedMotion();
    Controls.init();
    SpotlightEngine.init();
    bindEventDelegation();
    window.refreshContext(true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap, false);
  } else {
    bootstrap();
  }
})();
