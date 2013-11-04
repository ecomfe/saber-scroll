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

    /**
     * 状态值枚举
     * @type {Object}
     */
    var STATUS = {
            IDLE: 0, // 空闲状态
            SCROLLING: 1, // 滚动中
        };

    /**
     * 设置位置
     *
     * @inner
     * @param {Object} scroll
     * @param {number} dt 动画时间
     * @return {Promise}
     */
    function render(scroll, dt) {
        var x = scroll.info.left;
        var y = scroll.info.top;
        dt = dt || 0;

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

        info.left = Math.max(Math.min(0, info.left), scroll.minX);
        info.top = Math.max(Math.min(0, info.top), scroll.minY);

        render(scroll, 0.5).then(function () {
            info.status = STATUS.IDLE;
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

            info.top += dy;
            info.left += dx;
            render(scroll);

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
        var info = scroll.info || {left: 0, top: 0};

        if (info.status) {
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

        info.status = STATUS.SCROLLING;
        scroll.info = info;
    }

    /**
     * touchmove事件处理
     *
     * @inner
     */
    function scrollMoveHandler(scroll, e) {
        var info = scroll.info;

        if (!info || !info.status) {
            return;
        }

        e.preventDefault();

        var touch = e.touches ? e.touches[0] : e;
        var dx = scroll.horizontal 
                    ? (touch.clientX || touch.pageX) - info.pointX 
                    : 0;
        var dy = scroll.vertical 
                    ? (touch.clientY || touch.pageY) - info.pointY
                    : 0;

        info.pointX += dx;
        info.pointY += dy;
        info.dx = dx;
        info.dy = dy;

        // 如果滚动超出范围
        // 减少滚动位移
        info.left += info.left > 0 || info.left < scroll.minX ? dx / 3 : dx;
        info.top += info.top > 0 || info.top < scroll.minY ? dy / 3 : dy;

        render(scroll);
        scroll.emit('scroll', {left: info.left, top: info.top});

        var now = runner.now();
        info.dt = now - info.time;
        info.time = now;
    }

    /**
     * touchend事件处理
     *
     * @inner
     */
    function scrollEndHandler(scroll, e) {
        var info = scroll.info;

        if (!info || info.status !== STATUS.SCROLLING) {
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
     * 初始化
     *
     * @inner
     */
    function initScroll(scroll) {
        Emitter.mixin(scroll);

        var ele = scroll.main;
        var wrapper = ele.parentNode;

        // FIXME
        // 考虑padding情况
        scroll.minX = Math.min(wrapper.clientWidth - ele.offsetWidth, 0);
        scroll.minY = Math.min(wrapper.clientHeight - ele.offsetHeight, 0);

        scroll.vertical = scroll.vertical !== false && scroll.minY < 0;
        scroll.horizontal = scroll.horizontal !== false && scroll.minX < 0;

        util.addEvent(ele, 'touchstart', curry(scrollStartHandler, scroll));
        util.addEvent(ele, 'touchmove', curry(scrollMoveHandler, scroll));
        util.addEvent(ele, 'touchcanel', curry(scrollEndHandler, scroll));
        util.addEvent(ele, 'touchend', curry(scrollEndHandler, scroll));
    }

    var DEFAUTL_PROPERTYS = {};

    function Scroll(ele, options) {
        ele = dom.children(ele)[0];

        if (!ele) {
            throw new Error('empty element can not scroll');
        }

        this.main = ele;
        var propertys = extend({}, DEFAUTL_PROPERTYS, options);
        Object.keys(propertys).forEach(function (key) {
            this[key] = propertys[key];
        });

        initScroll(this);
    }

    return Scroll;
});
