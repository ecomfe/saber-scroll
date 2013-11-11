/**
 * @file Scroll
 * @author treelite(c.xinle@gmail.com)
 */

define(function (require) {

    var dom = require('saber-dom');
    var extend = require('saber-lang/extend');
    var curry = require('saber-lang/curry');
    var Emitter = require('saber-emitter');
    var runner = require('saber-run');
    var util = require('./util');
    var plugin = require('./plugin');


    /**
     * 状态值枚举
     * @type {Object}
     */
    var STATUS = {
            IDLE: 0, // 空闲状态
            PREPARE: 1, // 准备状态
            SCROLLING: 2, // 滚动中
        };

    /**
     * 设置位置
     *
     * @inner
     * @param {Scroll} scroll
     * @param {Object} pos
     * @param {number=} pos.top
     * @param {number=} pos.left
     * @param {number=} pos.duration
     * @return {Promise}
     */
    function render(scroll, pos) {
        var x = pos.left || 0;
        var y = pos.top || 0;
        var dt = pos.duration || 0;

        scroll.emit(
            ':render', 
            {
                left: x,
                top: y,
                duration: dt
            }
        );

        var info = scroll.info || {};
        info.top = y;
        info.left = x;
        scroll.info = info;

        return runner.transition(
                scroll.main,
                { transform: 'translate3d(' + x + 'px, ' + y + 'px, 0)' },
                {
                    duration: dt,
                    timing: 'ease-out'
                }
            );
    }

    /**
     * 判读是否超出滚动范围
     *
     * @inner
     */
    function isScrollOut(scroll) {
        var info  = scroll.info;

        return info.left > 0 
            || info.top > 0
            || info.left < scroll.minX 
            || info.top < scroll.minY;
    }

    /**
     * 重置滚动
     * 用于滚动超出范围的处理
     *
     * @inner
     */
    function resetScroll(scroll) {
        var info = scroll.info;

        var pos = {
                top: Math.max(Math.min(0, info.top), scroll.minY),
                left: Math.max(Math.min(0, info.left), scroll.minX),
                duration: 0.5
            };

        render(scroll, pos).then(function () {
            info.status = STATUS.IDLE;
            scroll.emit(':end');
        });
    }

    /**
     * 完成滚动
     * 进行缓动处理
     * 加速度固定的简单二次变化
     *
     * @inner
     */
    function finishScroll(scroll) {
        var info = scroll.info;

        // 缓动过程中认为是空闲状态
        // 可以被取消（比如再次touch）
        info.status = STATUS.IDLE;

        // 初速度
        var speed = {
                x: info.dx / info.dt,
                y: info.dy / info.dt
            };

        // this's a magic
        var acceleration = 0.0006;
        var acce = {
                x: speed.x ? (speed.x > 0 ? -1 : 1) * acceleration : 0,
                y: speed.y ? (speed.y > 0 ? -1 : 1) * acceleration : 0
            };

        var time = runner.now();

        function step() {

            if (info.status) {
                return;
            }

            var now = runner.now();
            var dt = now - time;

            // 当前速度
            var vy = speed.y + acce.y * dt;
            var vx = speed.x + acce.x * dt;
            // 当前位移
            // (v0 + v1) / 2 * t
            var dy = (speed.y + vy) * dt / 2;
            var dx = (speed.x + vx) * dt / 2;

            render(
                scroll, 
                {
                    top: info.top + dy, 
                    left: info.left + dx
                }
            );

            // 如果速度与加速度方向相同 
            // 表示已经完成减速
            speed.x = vx * acce.x < 0 ? vx : 0;
            speed.y = vy * acce.y < 0 ? vy : 0;
            time = now;

            // 如果未完成减速时已超出滚动
            // 成倍增加加速度
            if (speed.x 
                && (info.left > 0 || info.left < scroll.minX)
            ) {
                acce.x *= 5;
            }
            
            if (speed.y
                && (info.top > 0 || info.top < scroll.minY)
            ) {
                acce.y *= 5;
            }
            
            // 任意方向还存在速度
            // 则继续缓动
            if (speed.x + speed.y) {
                info.frame = runner.requestAnimationFrame(step);
            }
            else {
                // 缓动完成 检查是否在滚动范围内
                if (isScrollOut(scroll)) {
                    info.status = STATUS.SCROLLING;
                    resetScroll(scroll);
                }
                else {
                    scroll.emit(':end');
                }
            }
        }

        info.frame = runner.requestAnimationFrame(step);
    }

    /**
     * touchstart事件处理
     *
     * @inner
     */
    function scrollStartHandler(scroll, e) {
        var info = scroll.info;

        if (info.status == STATUS.SCROLLING) {
            return;
        }

        // 如果有动画
        // 先取消
        if (info.frame) {
            runner.cancelAnimationFrame(info.frame);
            info.frame = null;
        }

        var touch = e.touches ? e.touches[0] : e;
        info.pointX = touch.clientX || touch.pageX;
        info.pointY = touch.clientY || touch.pageY;
        info.time = runner.now();
        info.dx = info.dy = 0;
        info.dt = 0;

        info.status = STATUS.PREPARE;
        scroll.info = info;
    }

    /**
     * touchmove事件处理
     *
     * @inner
     */
    function scrollMoveHandler(scroll, e) {
        var info = scroll.info;

        if (!info.status) {
            return;
        }

        var touch = e.touches ? e.touches[0] : e;
        var dx = scroll.horizontal 
                    ? (touch.clientX || touch.pageX) - info.pointX 
                    : 0;
        var dy = scroll.vertical 
                    ? (touch.clientY || touch.pageY) - info.pointY
                    : 0;

        // 忽略过短的移动
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
            return;
        }

        if (info.status == STATUS.PREPARE) {
            // 进入滚动状态
            info.status = STATUS.SCROLLING;
            scroll.emit(':start');
        }

        e.preventDefault();

        info.pointX += dx;
        info.pointY += dy;
        info.dx = dx;
        info.dy = dy;

        var pos = {
                top: info.top,
                left: info.left
            };

        // 如果滚动超出范围
        // 减少滚动位移
        pos.top += info.top > 0 || info.top < scroll.minY ? dy / 3 : dy;
        pos.left += info.left > 0 || info.left < scroll.minX ? dx / 3 : dx;

        render(scroll, pos);
        scroll.emit('scroll', {left: -1 * pos.left, top: -1 * pos.top});

        var now = runner.now();
        info.dt = now - info.time;
        info.time = now;
    }

    /**
     * touchend事件处理
     *
     * @inner
     */
    function scrollEndHandler(scroll) {
        var info = scroll.info;

        if (info.status !== STATUS.SCROLLING) {
            info.status = STATUS.IDLE;
            return;
        }

        if (!info.dt) {
            info.status = STATUS.IDLE;
        } else if (isScrollOut(scroll)) {
            resetScroll(scroll);
        }
        else {
            finishScroll(scroll);
        }
    }
    
    /**
     * 计算可滚动范围
     *
     * @inner
     * @param {Scroll} scroll
     */
    function calculate(scroll) {
        var wrapper = scroll.main.parentNode;

        scroll.minX = wrapper.clientWidth - wrapper.scrollWidth;
        scroll.minY = wrapper.clientHeight - wrapper.scrollHeight;

        scroll.scrollHeight = wrapper.scrollHeight;
        scroll.scrollWidth = wrapper.scrollWidth;
        scroll.clientHeight = wrapper.clientHeight;
        scroll.clientWidth = wrapper.clientWidth;
        
        scroll.vertical = scroll.vertical !== false && scroll.minY < 0;
        scroll.horizontal = scroll.horizontal !== false && scroll.minX < 0;
    }

    /**
     * 初始化
     *
     * @inner
     */
    function initScroll(scroll) {
        Emitter.mixin(scroll);

        var ele = scroll.main;

        // 滚动信息
        scroll.info = {
            top: 0, 
            left: 0,
            status: STATUS.IDLE
        };

        calculate(scroll);

        var events = scroll.eventHanlder = {
            touchstart: curry(scrollStartHandler, scroll),
            touchmove: curry(scrollMoveHandler, scroll),
            touchcanel: curry(scrollEndHandler, scroll),
            touchend: curry(scrollEndHandler, scroll)
        };

        Object.keys(events).forEach(function (eventName) {
            util.addEvent(ele, eventName, events[eventName]);
        });

        if (scroll.scrollbar) {
            plugin.enable(scroll, 'scrollbar');
        }
    }

    /**
     * 滚动到确定位置
     *
     * @inner
     */
    function scrollTo(scroll, top, left, duration) {
        var pos = {
                top: top,
                left: left,
                duration: duration || 0
            };
        
        // 修正滚动范围
        pos.top = Math.min(0, Math.max(scroll.minY, pos.top));
        pos.left = Math.min(0, Math.max(scroll.minX, pos.left));

        render(scroll, pos);
    }

    /**
     * 默认配置项
     *
     * @type {Object}
     */
    var DEFAUTL_PROPERTYS = {
            // 是否显示滚动条
            scrollbar: false,
            // 可垂直滚动
            vertical: true,
            // 可水平滚动
            horizontal : true
        };

    /**
     * Scroll
     *
     * @constructor
     */
    function Scroll(ele, options) {
        ele = dom.children(ele)[0];

        if (!ele) {
            throw new Error('empty element can not scroll');
        }

        this.main = ele;
        var propertys = extend({}, DEFAUTL_PROPERTYS, options);
        var me = this;
        Object.keys(propertys).forEach(function (key) {
            me[key] = propertys[key];
        });

        initScroll(this);
    }

    /**
     * 重绘滚动
     * 在滚动内容修改后使用
     *
     * @public
     */
    Scroll.prototype.repaint = function () {
        calculate(this);
        plugin.reset(this);
        scrollTo(this, this.info.top, this.info.left);
    };

    /**
     * 销毁滚动
     *
     * @public
     */
    Scroll.prototype.destroy = function () {
        var ele = this.main;
        var events = this.eventHanlder;

        Object.keys(events).forEach(function (eventName) {
            util.removeEvent(ele, eventName, events[eventName]);
        });

        plugin.disable(this);
        this.main = null;
    };

    /**
     * 滚动到确定位置
     *
     * @public
     * @param {...number} 滚动位置
     * @param {number=} duration 缓动时间
     */
    Scroll.prototype.scrollTo = function () {
        var args = Array.prototype.slice.call(arguments);
        var top = this.info.top;
        var left = this.info.left;

        if (this.vertical) {
            top = args.shift() || 0;
        }

        if (this.horizontal) {
            left = args.shift() || 0;
        }

        scrollTo(this, -1 * top, -1 * left, args[0] || 0);
    };

    /**
     * 获取水平滚动位移
     *
     * @public
     * @return {number}
     */
    Scroll.prototype.getScrollLeft = function () {
        return -1 * this.info.left;
    };

    /**
     * 获取垂直滚动位移
     *
     * @public
     * @return {number}
     */
    Scroll.prototype.getScrollTop = function () {
        return -1 * this.info.top;
    };

    return Scroll;
});
