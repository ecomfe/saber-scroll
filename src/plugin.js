/**
 * @file 插件管理
 * @author treelite(c.xinle@gmail.com)
 */

define(function () {

    var exports = {};

    var pluginFactories = {};

    /**
     * 启用插件
     *
     * @public
     * @param {Scroll} scroll
     * @param {Object=} options
     */
    exports.enable = function (scroll, options) {
        var plugin;
        var pluginFactory;
        var enablePlugins = scroll.plugins || {};

        Object.keys(pluginFactories).forEach(function (name) {
            pluginFactory = pluginFactories[name];
            if (!enablePlugins[name]
                && (plugin = pluginFactory(scroll, options))
            ) {
                enablePlugins[name] = plugin;
            }
        });

        scroll.plugins = enablePlugins;
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

        var plugin;
        names.forEach(function (item) {
            plugin = scroll.plugins[item];
            if (plugin) {
                if (plugin.destroy) {
                    plugin.destroy();
                }
                delete scroll.plugins[item];
            }
        });
    };

    /**
     * 重置所有插件
     *
     * @public
     * @param {Scroll} scroll
     */
    exports.reset = function (scroll) {
        var enablePlugins = scroll.plugins || {};

        Object.keys(enablePlugins).forEach(function (name) {
            if (enablePlugins[name].reset) {
                enablePlugins[name].reset();
            }
        });
    };

    /**
     * 注册插件
     *
     * @public
     * @param {string} name
     * @param {Function} pluginFactory
     */
    exports.register = function (name, pluginFactory) {
        pluginFactories[name] = pluginFactory;
    };

    return exports;
});
