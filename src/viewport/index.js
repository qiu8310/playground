import render from './helpers/render'
import Home from './pages/Home'

const r = () => render(Home)

r()
if (module.hot) module.hot.accept(r)
