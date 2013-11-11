/**
 * @file saber-scroll
 * @author treelite(c.xinle@gmail.com)
 */

define(function (require) {

    var Scroll = require('./Scroll');

    /**
     * 初始化滚动
     *
     * @public
     * @param {HTMLElement|string} ele 需要滚动内容的元素或对应的id
     * @param {Object} options 配置项
     * @return {Scroll}
     */
    return function (ele, options) {
        if (Object.prototype.toString.call(ele) === '[object String]') {
            ele = document.getElementById(ele);
        }
        return new Scroll(ele, options);
    };

});
