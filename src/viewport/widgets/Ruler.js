import styled from 'styled-components'

export default class Ruler extends React.PureComponent {
  static propTypes = {
    direction: PropTypes.oneOf(['top', 'right', 'bottom', 'left']).isRequired
  }
  static defaultProps = {
    direction: 'left'
  }

  render() {
    return <Wrapper>
      {this.props.children}
    </Wrapper>
  }
}

const Wrapper = styled.div`
  display: inline-block;
  background: ${__DEV__ ? 'red' : 'transparent'};
`
