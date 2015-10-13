/**
 * @file scrollbar
 * @author treelite(c.xinle@gmail.com)
 */

define(function (require) {

    var bind = require('saber-lang/bind');
    var curry = require('saber-lang/curry');
    var runner = require('saber-run');

    var OPACITY = '0.5';

    /**
     * 创建滚动条
     *
     * @inner
     * @param {string} type 滚动条类型
     * @param {number} rate 长度比列
     * @return {HTMLElement}
     */
    function createBar(type, rate) {
        var ele = document.createElement('div');
        ele.className = 'saber-scroll-bar saber-scroll-bar-' + type;

        var css = 'position: absolute'
                + ';background:#000'
                + ';opacity:0'
                + ';-webkit-border-radius: 3px'
                + ';-ms-border-radius: 3px'
                + ';-o-border-radius: 3px'
                + ';border-radius: 3px';

        rate = Math.max(rate * 100, 5);
        if (type === 'horizontal') {
            css += ';bottom:1px'
                    + ';left:0'
                    + ';height:5px'
                    + ';width:' + rate + '%';
        }
        else {
            css += ';top:0'
                    + ';right:1px'
                    + ';width:5px'
                    + ';height:' + rate + '%';
        }

        ele.style.cssText += ';' + css;

        return ele;
    }

    /**
     * 计算滚动条的高宽，位移
     *
     * @inner
     * @param {Scroller} scroller 滚动对象
     * @param {Object} info 滚动信息
     * @return {Object}
     */
    function calculate(scroller, info) {
        var value;
        var res = {};

        var clientHeight = scroller.clientHeight;
        var clientWidth = scroller.clientWidth;
        var scrollHeight = scroller.scrollHeight;
        var scrollWidth = scroller.scrollWidth;

        // 计算垂直滚动条高度
        if (info.top > 0 || info.top < scroller.minY) {
            value = Math.max(info.top, scroller.minY - info.top);
            value = value / scrollHeight;
            res.height = Math.max(
                5,
                (clientHeight / scrollHeight - value) * 100
            ) + '%';
        }
        else {
            res.height = clientHeight / scrollHeight * 100 + '%';
        }

        // 计算水平滚动条宽度
        if (info.left > 0 || info.left < scroller.minX) {
            value = Math.max(info.left, scroller.minX - info.left);
            value = value / scrollWidth;
            res.width = Math.max(
                5,
                (clientWidth / scrollWidth - value) * 100
            ) + '%';
        }
        else {
            res.width = clientWidth / scrollWidth * 100 + '%';
        }

        // 计算垂直滚动条移动距离
        value = -1 * info.top / scrollHeight;
        value *= clientHeight;
        res.top = Math.max(0, Math.min(value, clientHeight * 0.95));

        // 计算水平滚动条移动距离
        value = -1 * info.left / scrollWidth;
        value *= clientWidth;
        res.left = Math.max(0, Math.min(value, clientWidth * 0.95));

        return res;
    }

    /**
     * 隐藏bar
     *
     * @inner
     * @param {HTMLElement} ele 滚动条元素
     */
    function hideBar(ele) {
        runner.transition(
            ele,
            {opacity: '0'},
            {duration: 0.3}
        );
    }

    /**
     * Scrollbar
     *
     * @constructor
     * @param {Scroller} scroller 滚动对象
     */
    function Scrollbar(scroller) {
        this.scroller = scroller;

        this.reset();

        this.timer = {};

        var events = this.eventHandler = {
            render: bind(this.render, this),
            start: bind(this.show, this),
            end: bind(this.hide, this, 800)
        };

        Object.keys(events).forEach(function (eventName) {
            scroller.on(':' + eventName, events[eventName]);
        });
    }

    /**
     * 重置滚动条
     *
     * @public
     */
    Scrollbar.prototype.reset = function () {
        var scroller = this.scroller;

        var ele;
        var wrapper = scroller.main.parentNode;

        if (scroller.vertical) {
            if (this.verticalBar) {
                this.verticalBar.style.display = '';
            }
            else {
                ele = this.verticalBar = createBar(
                    'vertical',
                    wrapper.clientHeight / wrapper.scrollHeight
                );
                wrapper.appendChild(ele);
            }
        }
        else if (this.verticalBar) {
            this.verticalBar.style.display = 'none';
        }

        if (scroller.horizontal) {
            if (this.horizontalBar) {
                this.horizontalBar.style.display = '';
            }
            else {
                ele = this.horizontalBar = createBar(
                    'horizontal',
                    wrapper.clientWidth / wrapper.scrollWidth
                );
                wrapper.appendChild(ele);
            }
        }
        else if (this.horizontalBar) {
            this.horizontalBar.style.display = 'none';
        }
    };

    /**
     * 显示滚动条
     *
     * @public
     */
    Scrollbar.prototype.show = function () {
        var bars = [this.verticalBar, this.horizontalBar];
        var timers = [this.timer.vertical, this.timer.horizontal];

        var timer;
        bars.forEach(function (item, index) {
            if (!item) {
                return;
            }

            if (timer = timers[index]) {
                clearTimeout(timer);
            }

            item.style.opacity = OPACITY;
        });
    };

    /**
     * 隐藏滚动条
     *
     * @public
     * @param {number=} delay 延迟隐藏时间 单位ms
     */
    Scrollbar.prototype.hide = function (delay) {
        var bars = [this.verticalBar, this.horizontalBar];
        var timer = this.timer;
        var keys = ['vertical', 'horizontal'];

        bars.forEach(function (ele, index) {
            if (!ele) {
                return;
            }

            if (delay) {
                timer[keys[index]] = setTimeout(
                    curry(hideBar, ele),
                    delay
                );
            }
            else {
                hideBar(ele);
            }
        });
    };

    /**
     * 根据滚动信息渲染滚动条
     *
     * @public
     * @param {Object} info 滚动信息
     */
    Scrollbar.prototype.render = function (info) {
        var ele;
        var styles;
        var scroller = this.scroller;
        var data = calculate(scroller, info);

        // 渲染垂直滚动条
        if (ele = this.verticalBar) {
            styles = {
                transform: 'translate3d(0, ' + data.top + 'px, 0)',
                height: data.height
            };

            runner.transition(
                ele,
                styles,
                {
                    duration: info.duration,
                    timing: 'ease-out'
                }
            );
        }

        // 渲染水平滚动条
        if (ele = this.horizontalBar) {
            styles = {
                transform: 'translate3d(' + data.left + 'px, 0, 0)',
                width: data.width
            };

            runner.transition(
                ele,
                styles,
                {
                    duration: info.duration,
                    timing: 'ease-out'
                }
            );
        }
    };

    /**
     * 销毁滚动条
     *
     * @public
     */
    Scrollbar.prototype.destroy = function () {
        var scroller = this.scroller;
        var events = this.eventHandler;

        Object.keys(events).forEach(function (eventName) {
            scroller.off(':' + eventName, events[eventName]);
        });

        var ele;
        if (ele = this.horizontalBar) {
            ele.parentNode.removeChild(ele);
            this.horizontalBar = null;
        }

        if (ele = this.verticalBar) {
            ele.parentNode.removeChild(ele);
            this.verticalBar = null;
        }

        this.scroller = null;
    };

    // 注册插件
    require('../plugin').register(
        'scrollbar',
        function (scroller, options) {
            var res = false;

            if (options.scrollbar) {
                res = new Scrollbar(scroller, options);
            }

            return res;
        }
    );
});
