const React = require('react');
const IdyllComponent = require('idyll-component');

class Job extends IdyllComponent {
  render() {
    return (
      <span style={{ color: 'green', fontStyle: 'italic'}}>
        [jobleonard note]: {this.props.children}
      </span>
    );
  }
}

module.exports = Job;
