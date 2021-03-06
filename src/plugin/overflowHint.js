/**
 * @file 超出滚动区域提示
 * @author c.xinle@gmail.com
 */

define(function (require) {

    var bind = require('saber-lang/bind');

    // 默认样式前缀
    var CLS_NAME_PREFIX = 'scroll-overflow';

    /**
     * 添加样式
     *
     * @inner
     */
    function addClassName(clsName, prefix, name) {
        var res = clsName;
        if (name) {
            res += ' ' + prefix + '-' + name;
        }

        return res;
    }

    function OverflowHint(scroller, options) {
        this.scroller = scroller;
        this.clsNamePrefix = options.className || CLS_NAME_PREFIX;
        this.clsNameReg = new RegExp(
            this.clsNamePrefix + '-[^- ]+(\\s+|$)', 'g'
        );
        var handlers = this.eventHandlers = {
            render: bind(this.render, this)
        };

        Object.keys(handlers).forEach(function (name) {
            scroller.on(':' + name, handlers[name]);
        });

        this.render({left: scroller.info.left, top: scroller.info.top});
    }

    /**
     * 滚动事件处理
     * 根据滚动的位置来添加提示样式
     *
     * @public
     */
    OverflowHint.prototype.render = function (e) {
        var scroller = this.scroller;
        var container = scroller.main.parentNode;
        var className = container.className;

        className = className.replace(this.clsNameReg, '').trim();

        var x = e.left;
        className = addClassName(
            className,
            this.clsNamePrefix,
            x >= 0
                ? 'right'
                : x <= scroller.minX
                    ? 'left'
                    : ''
        );

        var y = e.top;
        className = addClassName(
            className,
            this.clsNamePrefix,
            y >= 0
                ? 'bottom'
                : y <= scroller.minY
                    ? 'top'
                    : ''
        );

        container.className = className;
    };

    /**
     * 插件销毁
     *
     * @public
     */
    OverflowHint.prototype.destroy = function () {
        var scroller = this.scroller;
        var handlers = this.eventHandlers;

        Object.keys(handlers).forEach(function (name) {
            scroller.off(':' + name, handlers[name]);
        });

        this.scroller = null;
    };

    // 注册插件
    require('../plugin').register(
        'overflowHint',
        function (scroller, options) {
            var res = false;

            if (options.overflowHint) {
                res = new OverflowHint(scroller, options.overflowHint);
            }

            return res;
        }
    );
});
