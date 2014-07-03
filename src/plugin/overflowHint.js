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

    function OverflowHint(scroll, options) {
        this.scroll = scroll;
        this.clsNamePrefix = options.className || CLS_NAME_PREFIX;
        this.clsNameReg = new RegExp(
            this.clsNamePrefix + '-[^- ]+(\\s+|$)', 'g'
        );
        var handlers = this.eventHandlers = {
            render: bind(this.render, this)
        };

        Object.keys(handlers).forEach(function (name) {
            scroll.on(':' + name, handlers[name]);
        });

        this.render({left: scroll.info.left, top: scroll.info.top});
    }

    /**
     * 滚动事件处理
     * 根据滚动的位置来添加提示样式
     *
     * @public
     */
    OverflowHint.prototype.render = function (e) {
        var scroll = this.scroll;
        var container = scroll.main.parentNode;
        var className = container.className;

        className = className.replace(this.clsNameReg, '').trim();

        var x = e.left;
        className = addClassName(
            className,
            this.clsNamePrefix,
            x >= 0 
                ? 'right' 
                : x <= scroll.minX
                    ? 'left' 
                    : ''
        );

        var y = e.top;
        className = addClassName(
            className, 
            this.clsNamePrefix,
            y >= 0 
                ? 'bottom' 
                : y <= scroll.minY
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
        var scroll = this.scroll;
        var handlers = this.eventHandlers;
        
        Object.keys(handlers).forEach(function (name) {
            scroll.off(':' + name, handlers[name]);
        });

        this.scroll = null;
    };

    // 注册插件
    require('../plugin').register(
        'overflowHint', 
        function (scroll, options) {
            var res = false;

            if (options.overflowHint) {
                res = new OverflowHint(scroll, options.overflowHint);
            }

            return res;
        }
    );
});
