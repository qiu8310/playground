import ReactDOM from 'react-dom'
import { AppContainer } from 'react-hot-loader'

export default function render(Component) {
  ReactDOM.render(
    <AppContainer>
      <Component />
    </AppContainer>,
    document.getElementById('root')
  )
}
