#target photoshop
/**
 * @fileoverview SpineSplitter 快捷键入口 03：复合剪贴蒙版链联动拆出（保留完整剪贴链结构）
 * 建议在 Photoshop「动作 (Actions)」面板录制并绑定快捷键（如 F4）。
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
    var res = PSSplitter.Host.SplitJointOps.splitClipChain("preserve", {});
    if (!res.ok && typeof alert === "function") {
      alert("SpineSplitter [剪贴蒙版链拆出] 提示：\n" + res.message);
    }
  } catch (e) {
    if (typeof alert === "function") {
      alert("SpineSplitter [剪贴蒙版链拆出] 异常：\n" + (e && e.message ? e.message : String(e)));
    } else {
      throw e;
    }
  }
})();
