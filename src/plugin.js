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
     * @param {Scroller} scroller 滚动对象
     * @param {Object=} options 配置参数
     */
    exports.enable = function (scroller, options) {
        var plugin;
        var pluginFactory;
        var enablePlugins = scroller.plugins || {};

        Object.keys(pluginFactories).forEach(function (name) {
            pluginFactory = pluginFactories[name];
            if (!enablePlugins[name]
                && (plugin = pluginFactory(scroller, options))
            ) {
                enablePlugins[name] = plugin;
            }
        });

        scroller.plugins = enablePlugins;
    };

    /**
     * 禁用插件
     *
     * @public
     * @param {Scroller} scroller 滚动对象
     * @param {string=} name 插件名称
     */
    exports.disable = function (scroller, name) {
        var names;

        if (name) {
            names = [name];
        }
        else {
            names = Object.keys(scroller.plugins || {});
        }

        var plugin;
        names.forEach(function (item) {
            plugin = scroller.plugins[item];
            if (plugin) {
                if (plugin.destroy) {
                    plugin.destroy();
                }
                delete scroller.plugins[item];
            }
        });
    };

    /**
     * 重置所有插件
     *
     * @public
     * @param {Scroller} scroller 滚动对象
     */
    exports.reset = function (scroller) {
        var enablePlugins = scroller.plugins || {};

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
     * @param {string} name 插件名称
     * @param {Function} pluginFactory 插件构造函数
     */
    exports.register = function (name, pluginFactory) {
        pluginFactories[name] = pluginFactory;
    };

    return exports;
});
