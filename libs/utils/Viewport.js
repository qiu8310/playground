export default class Viewport {
  constructor(element, config = {}) {
    this.element = element
    this.config = config
  }
  emitChange() {} // 供外界操作
  onChange() {} // scroll 或 resize 都会触发 onChange (还有就是 dom 操作也会触发)
  onEnter() {}
  onLeave() {}
  onOver() {}
  onOut() {}
}
