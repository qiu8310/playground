let s = require('./styles/Home.scss')
import Ruler from '../widgets/Ruler'

export default class Home extends React.PureComponent {
  render() {
    return <div className={s.root}>
      <Ruler>
        <div className={s.target} />
      </Ruler>
    </div>
  }
}
