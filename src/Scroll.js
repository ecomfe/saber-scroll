/**
 * @file Scroll
 * @author treelite(c.xinle@gmail.com)
 */

define(function (require) {

    var dom = require('saber-dom');
    var extend = require('saber-lang/extend');
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
     * 判断某一方向上是否超出可滚动区域
     *
     * @inner
     */
    function isOutDir(scroll, value, dir) {
        var min = scroll['min' + (dir == 'x' ? 'X' : 'Y')];

        return value > 0 || value < min;
    }

    /**
     * 判读是否超出滚动范围
     *
     * @inner
     */
    function isScrollOut(scroll, pos) {
        var info  = pos || scroll.info;

        return isOutDir(scroll, info.left, 'x')
            || isOutDir(scroll, info.top, 'y');
    }

    /**
     * 使目标位置在滚动条可滚动区域内
     *
     * @inner
     */
    function normalizePos(scroll, pos) {
        return {
            top: Math.max(Math.min(0, pos.top), scroll.minY),
            left: Math.max(Math.min(0, pos.left), scroll.minX),
        };
    }

    /**
     * 重置滚动
     * 用于滚动超出范围的处理
     *
     * @inner
     */
    function resetScroll(scroll) {
        var info = scroll.info;

        var pos = normalizePos(scroll, info);
        pos.duration = 0.5;

        render(scroll, pos).then(function () {
            info.status = STATUS.IDLE;
            scroll.emit(':end');
        });
    }

    /**
     * 停止缓动动画
     *
     * @inner
     */
    function stopAnimate(scroll) {
        var info = scroll.info;
        if (info.frame) {
            runner.cancelAnimationFrame(info.frame);
            info.frame = null;
        }
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

            // 如果速度与加速度方向相同 
            // 表示已经完成减速
            speed.x = vx * acce.x < 0 ? vx : 0;
            speed.y = vy * acce.y < 0 ? vy : 0;
            time = now;

            var scrollToPos = {
                    top: info.top + dy,
                    left: info.left + dx
                };

            // 如果不允许滚动超出范围则进行修正
            if (!scroll.overflow && isScrollOut(scroll, scrollToPos)) {
                if (isOutDir(scroll, scrollToPos.left, 'x')) {
                    speed.x = 0;
                }
                if (isOutDir(scroll, scrollToPos.top, 'y')) {
                    speed.y = 0;
                }
                scrollToPos = normalizePos(scroll, scrollToPos);
            }

            render(scroll, scrollToPos);

            // 如果未完成减速时已超出滚动
            // 成倍增加加速度
            if (speed.x && isOutDir(scroll, info.left, 'x')) {
                acce.x *= 5;
            }
            
            if (speed.y && isOutDir(scroll, info.top, 'y')) {
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
        stopAnimate(scroll);

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
        pos.top += isOutDir(scroll, info.top, 'y') ? dy / 3 : dy;
        pos.left += isOutDir(scroll, info.left, 'x') ? dx / 3 : dx;

        // 进行超出滚动判断
        if (!scroll.overflow && isScrollOut(scroll, pos)) {
            pos = normalizePos(scroll, pos);
        }

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

        // 是否还在滚动中
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
        
        scroll.vertical = scroll.initialOptions.vertical !== false 
                            && scroll.minY < 0;

        scroll.horizontal = scroll.initialOptions.horizontal !== false 
                            && scroll.minX < 0;
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

        scroll.disabled = false;

        calculate(scroll);

        function wrapHandler(handler, scroll) {
            return function (e) {
                if (scroll.disabled) {
                    return;
                }

                handler(scroll, e);
            };
        }

        var events = scroll.eventHanlder = {
            touchstart: wrapHandler(scrollStartHandler, scroll),
            touchmove: wrapHandler(scrollMoveHandler, scroll),
            touchcanel: wrapHandler(scrollEndHandler, scroll),
            touchend: wrapHandler(scrollEndHandler, scroll)
        };

        Object.keys(events).forEach(function (eventName) {
            util.addEvent(ele.parentNode, eventName, events[eventName]);
        });

        dom.setStyle(ele, 'text-size-adjust', '100%');
    }

    /**
     * 滚动到确定位置
     *
     * @inner
     */
    function scrollTo(scroll, top, left, duration) {
        var pos = normalizePos(scroll, {top: top, left: left});
        pos.duration = duration || 0;

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
            horizontal : true,
            // 可超出可滚动区域
            overflow: true
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
        // 保存初始化参数
        // 用于后续的重新计算
        var propertys = this.initialOptions 
                        = extend({}, DEFAUTL_PROPERTYS, options);
        var me = this;
        Object.keys(propertys).forEach(function (key) {
            me[key] = propertys[key];
        });

        initScroll(this);

        // 初始化插件
        plugin.enable(this, options);
    }

    /**
     * 重绘滚动
     * 在滚动内容修改后使用
     *
     * @public
     */
    Scroll.prototype.repaint = function () {
        if (this.disabled) {
            return;
        }

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
        if (this.disabled) {
            return;
        }

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
     * 滚动到元素位置
     *
     * @public
     * @param {HTMLElement} ele DOM元素
     * @param {number} time 缓动时间
     */
    Scroll.prototype.scrollToElement = function (ele, time) {
        if (this.disabled) {
            return;
        }

        var pos = dom.position(ele, this.main);

        scrollTo(this, -1 * pos.top, -1 * pos.left, time);
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

    /**
     * 禁止滚动区域滚动
     *
     * @public
     */
    Scroll.prototype.disable = function () {
        if (this.disabled) {
            return;
        }

        this.disabled = true;
        if (this.info.status == STATUS.SCROLLING) {
            scrollEndHandler(this);
            stopAnimate(this);
        }
    };

    /**
     * 启动滚动区域滚动
     *
     * @public
     */
    Scroll.prototype.enable = function () {
        this.disabled = false;
    };

    return Scroll;
});
