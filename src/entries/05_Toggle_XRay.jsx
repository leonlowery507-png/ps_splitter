#target photoshop
/**
 * @fileoverview SpineSplitter 快捷键入口 05：一键切换 / 还原选中图层 X-Ray 半透明透视参照
 * 建议在 Photoshop「动作 (Actions)」面板录制并绑定快捷键（如 F6）。
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
    var res = PSSplitter.Host.SplitJointOps.toggleXRay({});
    if (!res.ok && typeof alert === "function") {
      alert("SpineSplitter [X-Ray 切换] 提示：\n" + res.message);
    }
  } catch (e) {
    if (typeof alert === "function") {
      alert("SpineSplitter [X-Ray 切换] 异常：\n" + (e && e.message ? e.message : String(e)));
    } else {
      throw e;
    }
  }
})();
