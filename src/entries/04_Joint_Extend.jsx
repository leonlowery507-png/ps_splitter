#target photoshop
/**
 * @fileoverview SpineSplitter 快捷键入口 04：关节末端外延扩边与智能补全（防动画旋转穿帮）
 * 建议在 Photoshop「动作 (Actions)」面板录制并绑定快捷键（如 F5）。
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
    var res = PSSplitter.Host.SplitJointOps.extendJoint({});
    if (!res.ok && typeof alert === "function") {
      alert("SpineSplitter [关节扩边补全] 提示：\n" + res.message);
    }
  } catch (e) {
    if (typeof alert === "function") {
      alert("SpineSplitter [关节扩边补全] 异常：\n" + (e && e.message ? e.message : String(e)));
    } else {
      throw e;
    }
  }
})();
