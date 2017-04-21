## 使用

* ifvisible 支持跨平台，同时可以检查用户在当前页面上多长时间没有操作了，并且可以知道页面是否隐藏了，所谓隐藏，包括：
  - 切换到另一个 tab
  - 切换到另一个应用程序
  - 回到 home 屏幕（手机端）
  - 关机

* 如果只是要检查 page 是不是被 hidden 了，则完全不需要用 ifvisible，手动实现即可 [参考 PageVisibility](/libs/utils/PageVisibility.js)
