/**
 * @file 插件管理
 * @author treelite(c.xinle@gmail.com)
 */

define(function () {
    
    var exports = {};

    var plugins = {};

    /**
     * 启用插件
     *
     * @public
     * @param {string} name
     * @param {Scroll} scroll
     * @param {Object=} options
     */
    exports.enable = function (name, scroll, options) {
        var plugin = plugins[name];
        
        if (plugin) {
            plugin(scroll, options);
        }
    };

    /**
     * 注册插件
     *
     * @public
     * @param {string} name
     * @param {Function} plugin
     */
    exports.register = function (name, plugin) {
       plugins[name] = plugin; 
    };

    return exports;
});
