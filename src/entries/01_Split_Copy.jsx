#target photoshop
/**
 * @fileoverview SpineSplitter 快捷键入口 01：选区复制拆出并自动归组 (Copy & Route)
 * 建议在 Photoshop「动作 (Actions)」面板录制并绑定快捷键（如 F2）。
 */

//@include "../core/polyfill_es3.js"
//@include "../core/spine_tags.js"
//@include "../core/naming_engine.js"
//@include "../core/clip_chain_resolver.js"
//@include "../host/ps_am.js"
//@include "../host/ps_safety.js"
//@include "../host/ps_split_joint_ops.js"

(function () {
  try {
    var res = PSSplitter.Host.SplitJointOps.splitSelection("copy", {});
    if (!res.ok && typeof alert === "function") {
      alert("SpineSplitter [复制拆出] 提示：\n" + res.message);
    }
  } catch (e) {
    if (typeof alert === "function") {
      alert("SpineSplitter [复制拆出] 异常：\n" + (e && e.message ? e.message : String(e)));
    } else {
      throw e;
    }
  }
})();
