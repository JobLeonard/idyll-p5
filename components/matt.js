const React = require('react');
const IdyllComponent = require('idyll-component');

class Matt extends IdyllComponent {
  render() {
    return (
      <span style={{ color: 'red', fontStyle: 'italic'}}>
        [mathisonian note]: {this.props.children}
      </span>
    );
  }
}

module.exports = Matt;
