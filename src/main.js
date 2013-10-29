/**
 * @file saber-scroll
 * @author treelite(c.xinle@gmail.com)
 */

define(function (require) {

    var Scroll = require('./Scroll');

    return function (ele, options) {
        return new Scroll(ele, options);
    };

});
