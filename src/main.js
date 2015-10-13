/**
 * @file saber-scroll
 * @author treelite(c.xinle@gmail.com)
 */

define(function (require) {

    var Scroller = require('./Scroller');

    /**
     * 初始化滚动
     *
     * @public
     * @param {HTMLElement|string} ele 需要滚动内容的元素或对应的id
     * @param {Object=} options 配置项
     * @return {Scroller}
     */
    return function (ele, options) {
        options = options || {};
        if (Object.prototype.toString.call(ele) === '[object String]') {
            ele = document.getElementById(ele);
        }
        return new Scroller(ele, options);
    };

});
