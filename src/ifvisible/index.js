require('./index.scss')
import ifvisible from 'ifvisible.js'

!(function(video) {
  let inited = false
  if (loaded()) return process()

  video.addEventListener('loadedmetadata', handler)
  video.addEventListener('loadeddata', handler)

  function loaded() {
    return video.readyState === 4
  }

  function handler() {
    if (inited || !loaded()) return
    inited = true
    video.removeEventListener('loadedmetadata', handler)
    video.removeEventListener('loadeddata', handler)
    return process()
  }

  function process() {
    video.volume = 0.1

    let statusEl = document.getElementById('status')
    ifvisible.setIdleDuration(30)
    ifvisible.on('statusChanged', e => (statusEl.innerHTML = statusEl.innerHTML + `<div>${e.status}</div>`))

    // FIXME: ifvisible.now('active') 在初始化情况下永远都是 true（没有考虑打开时就是 hidden 的情况）
    // FIXME: 浏览器在其它应用程序窗口下面，也会使视频播放
    if (!isHidden() && ifvisible.now('active')) video.play()

    ifvisible.blur(() => video.pause())
    ifvisible.focus(() => video.play())
  }
})(document.querySelector('video'))

function isHidden() {
  // visibilitychange webkitvisibilitychange mozvisibilitychange msvisibilitychange
  let hidden = ['hidden', 'webkitHidden', 'mozHidden', 'msHidden']
    .find(hidden => typeof document[hidden] !== 'undefined')
  return hidden ? document[hidden] : false
}
