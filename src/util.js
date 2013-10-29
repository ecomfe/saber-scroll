/**
 * @file util
 * @author treelite(c.xinle@gmail.com)
 */

define(function (require) {

    var bind = require('saber-lang/bind');

    var exports = {};

    // TODO 
    // 事件绑定抽离 
    // 兼容各终端的touch事件差异 --> saber-touch

    /**
     * 注册DOM事件
     *
     * @public
     * @param {HTMLElement} ele
     * @param {string} eventName
     * @param {Function} callback
     */
    exports.addEvent = function (ele, eventName, callback) {
        ele.addEventListener(eventName, callback, false);
    };

    /**
     * 卸载DOM事件
     *
     * @public
     * @param {HTMLElement} ele
     * @param {string} eventName
     */
    exports.removeEvent = function (ele, eventName, callback) {
        ele.removeEventListener(eventName, callback);
    };

    // TODO
    // 变化、转化包?
    // 支持transform 与 transition
    // saber-magic ?
    var rAF = window.requestAnimationFrame
        || window.webkitRequestAnimationFrame
        || window.mozRequestAnimationFrame
        || window.oRequestAnimationFrame
        || window.msRequestAnimationFrame
        || function (callback) {return setTimeout(callback, 1000 / 60);};

    /**
     * 添加动画帧
     *
     * @public
     * @param {Function} callback 动画函数
     * @return {string} 动画帧Id 用于取消已添加的动画帧
     */
    exports.requestAnimationFrame = bind(rAF, window);

    var cRAF = window.cancelAnimationFrame
        || window.webkitCancelAnimationFrame                    
        || window.mozCancelAnimationFrame                    
        || window.oCancelAnimationFrame                    
        || window.msCancelAnimationFrame                    
        || function (idenity) {clearTimeout(idenity);};

    /**
     * 取消已添加的动画帧
     *
     * @public
     * @param {string} idenity 动画帧Id
     */
    exports.cancelAnimationFrame = bind(cRAF, window);

    /**
     * 获取当前的时间戳
     * 单位毫秒
     *
     * @public
     * @return {number}
     */
    exports.now = function () {
        return Date.now 
                ? Date.now()
                : new Date().getTime();
    };

    return exports;
});
