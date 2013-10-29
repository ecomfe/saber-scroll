# saber-scroll

提供元素内容垂直、水平滚动

__注：__开发中，相关依赖暂时请手动安装

## Usage

    var scroll = require('saber-scroll');
    var scroller = scroll(document.getElementById('wrapper'));
    scroller.on('change', function (e) {
        console.log(e.left, e.top);
    });

__只滚动区域的第一个子元素__，如果想让区域中的所有元素都能滚动请添加包裹元素，比如这样：

    <div class="wrapper">
        <div class="content">
            ...
        </div>
    </div>

## API

### scroll(ele, options)

使元素可滚动
