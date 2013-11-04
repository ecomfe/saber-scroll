/**
 * @file util
 * @author treelite(c.xinle@gmail.com)
 */

define(function (require) {

    var exports = {};

    // TODO 
    // win Phone支持

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

    return exports;
});
