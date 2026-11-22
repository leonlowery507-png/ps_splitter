#target photoshop
/**
 * @fileoverview SpineSplitter 入口 00：打开 3-Tab 整合拆图辅助主控台
 */

//@include "../core/polyfill_es3.js"
//@include "../core/spine_tags.js"
//@include "../core/naming_engine.js"
//@include "../core/skeleton_templates.js"
//@include "../core/skin_mapper.js"
//@include "../core/clip_chain_resolver.js"
//@include "../host/ps_am.js"
//@include "../host/ps_safety.js"
//@include "../host/ps_split_joint_ops.js"
//@include "../host/ps_naming_hierarchy_ops.js"
//@include "../ui/main_panel.js"

(function () {
  try {
    if (typeof app !== "undefined" && typeof app.bringToFront === "function") {
      app.bringToFront();
    }
    PSSplitter.UI.MainPanel.show();
  } catch (e) {
    if (typeof alert === "function") {
      alert("SpineSplitter 主面板启动提示：\n" + (e && e.message ? e.message : String(e)));
    } else {
      throw e;
    }
  }
})();
