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
     * @param {Scroll} scroll
     * @param {string} name
     * @param {Object=} options
     */
    exports.enable = function (scroll, name, options) {
        var plugin = plugins[name];
        var enablePlugins = scroll.plugins || {};
        
        if (plugin && !enablePlugins[name]) {
            enablePlugins[name] = plugin(scroll, options);
            scroll.plugins = enablePlugins;
        }
    };

    /**
     * 禁用插件
     *
     * @public
     * @param {Scroll} scroll
     * @param {string=} name
     */
    exports.disable = function (scroll, name) {
        var names;

        if (name) {
            names = [name];
        }
        else {
            names = Object.keys(scroll.plugins || {});
        }

        names.forEach(function (item) {
            if (scroll.plugins[item]) {
                scroll.plugins[item].destroy && scroll.plugins[item].destroy();
                delete scroll.plugins[item];
            }
        });
    };

    /**
     * 重置所有插件
     *
     * @public
     * @param {Scroll}
     */
    exports.reset = function (scroll) {
        var enablePlugins = scroll.plugins || {};

        Object.keys(enablePlugins).forEach(function (name) {
            enablePlugins[name].reset && enablePlugins[name].reset();
        });
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
