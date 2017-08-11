import React, { Component } from 'react';
import IdyllComponent from 'idyll-component';
import { RemountOnResize } from './remount';


// A helper component, wrapping retina and zoom logic and
// auto-resizing the sketch to fill its parent container.
// To determine size/layout, we just use CSS on the div containing
// the Sketch component (we might use this with flexbox, for example).
class SketchComponent extends IdyllComponent {

  constructor(props) {
    super(props);
    this.mountedContainer = this.mountedContainer.bind(this);
    this.state = {};
  }

  // The way canvas interacts with CSS layouting is a bit buggy
  // and inconsistent across browsers. To make it dependent on
  // the layout of the parent container, we only render it after
  // mounting view, that is: after CSS layouting is done.
  mountedContainer(div) {
    const p5 = require('p5');
    if (div) {
      this.div = div;
      let { setup, draw, sketchProps, webGL, noCanvas, ratio, updateProps } = this.props;
      let width = div.clientWidth | 0;
      let height = div.clientHeight | 0;
      if (ratio) {
        if (this.props.width || !this.props.height) {
          height = (div.clientWidth / ratio) | 0;
        } else {
          width = (div.clientHeight * ratio) | 0;
        }
      } else if (!this.props.width && !this.props.height){
        // default to 2:1 ratio
        height = (div.clientWidth * 0.5) | 0;
      }
      let newState = { div, width, height, ratio };
      if (setup || draw) {
        const _sketch = (p5) => {
          this.p5 = p5;
          if (setup) {
            p5.setup = setup(p5, { width, height, devicePixelRatio: window.devicePixelRatio, updates: updateProps});
          }
          if (draw) {
            console.log(draw);
            p5.draw = draw(p5, { width, height, devicePixelRatio: window.devicePixelRatio, updates: updateProps});
            console.log(p5.draw);
          }

          // handle creation of canvas
          const _setup = p5.setup || (() => { });
          if (noCanvas) {
            p5.setup = () => {
              p5.noCanvas();
              _setup();
            };
          } else {
            p5.setup = () => {
              p5.createCanvas(width, height, webGL? p5.WEBGL : p5.P2D);
            };
          }

          // handle removing the sketch if the component unmounts
          const _unmount = p5.unmount;
          p5.unmount = () => {
            if (_unmount) {
              _unmount();
            }
            p5.remove();
          }
        }
        newState.sketch = new p5(_sketch, div);
      }
      this.setState(newState);
    }
  }

  componentWillReceiveProps(nextProps) {
    // pass relevant props to sketch
    const { sketch, width, height } = this.state;
    // if (sketch.receiveProps && nextProps.sketchProps) {
    //   sketch.receiveProps(nextProps.sketchProps);
    // }
    let { sketchProps, draw, setup, webGL, noCanvas, ratio, updateProps } = nextProps;

    if (draw) {
      sketch.draw = draw(sketch, { width, height, devicePixelRatio: window.devicePixelRatio, updates: updateProps});
    }
    // this.setState({
    //   sketch: new this.p5(_sketch, this.div)
    // })
  }

  componentWillUnmount() {
    if (this.state.sketch) {
      this.state.sketch.unmount();
    }
  }

  render() {
    const { props } = this;
    let style = Object.assign({}, props.style);
    let { width, height, ratio } = props;
    switch (typeof width) {
      case 'number':
        width = width | 0;
        style['minWidth'] = width;
        style['maxWidth'] = width;
        break;
      case 'string':
        style.width = width;
        break;
      case 'undefined':
        style.width = style.width ? style.width :
          ratio && (typeof height) === 'number' ? height / ratio : '100%';
      default:
    }
    if (!(ratio && width)) {
      switch (typeof height) {
        case 'number':
          height = height | 0;
          style['minHeight'] = height;
          style['maxHeight'] = height;
          break;
        case 'string':
          style.height = height;
          break;
        case 'undefined':
          style.height = style.height ? style.height : '100%';
          break;
        default:
      }
    }

    style.margin = style.margin ? style.margin : '1em auto';

    return (
      <div
        // The way canvas interacts with CSS layouting is a bit buggy
        // and inconsistent across browsers. To make it dependent on
        // the layout of the parent container, we only render it after
        // mounting div, that is: after CSS layouting is done.
        ref={this.mountedContainer}
        className={props.className}
        style={style}
      />
    );
  }
}


class Sketch extends Component {
  render() {
    const { props } = this;
    return (
      <RemountOnResize
        /* Since canvas interferes with CSS layouting,
        we unmount and remount it on resize events */
        watchedVal={props.watchedVal}
      >
        <SketchComponent
          {...props}
          updateProps={this.updateProps}
        />
      </RemountOnResize>
    );
  }
}


module.exports = Sketch;