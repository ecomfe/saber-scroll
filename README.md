# saber-scroll

为移动端页面开发提供区域滚动功能

提供元素内容垂直、水平滚动

## Usage

```javascript
var scroll = require('saber-scroll');
var scroller = scroll(document.getElementById('wrapper'));
scroller.on('change', function (e) {
    console.log(e.left, e.top);
});
```

__只滚动区域的第一个子元素__，如果想让区域中的所有元素都能滚动请添加包裹元素，比如这样：

```html
<div class="content">
    <div class="wrapper">
        ...
    </div>
</div>
```

## API

### scroll(ele, options)

使元素可滚动

#### Scroller

`scroll()`创建的滚动对象

##### .on

为滚动对象事件，目前支持以下事件

* `change`：滚动事件，事件参数包含`top`、`left`属性，表示滚动的位移

===

[![Saber](https://f.cloud.github.com/assets/157338/1485433/aeb5c72a-4714-11e3-87ae-7ef8ae66e605.png)](http://ecomfe.github.io/saber/)
