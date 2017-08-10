import React, { Component } from 'react';
import IdyllComponent from 'idyll-component';

import { RemountOnResize } from './remount';

import p5 from 'p5';

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
    if (div) {
      let { sketch, sketchProps, webGL, noCanvas, ratio } = this.props;
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

      if (sketch) {
        sketch = 'return function (p5) {' + sketch + '}';
        const compiledSketch = new Function('width', 'height', 'devicePixelRatio', 'sketchProps', 'updates', sketch);

        const _sketch = (p5) => {
          compiledSketch(width, height, window.devicePixelRatio, sketchProps, this.updates)(p5);


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
    const { sketch } = this.state;
    if (sketch.receiveProps && nextProps.sketchProps) {
      sketch.receiveProps(nextProps.sketchProps);
    }
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
    if (ratio && width) {
      height = '100%';
    } else {
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
          sketch={props.sketch}
          sketchProps={props.sketchProps}
          webGL={props.webGL}
          noCanvas={props.noCanvas}
          width={props.width}
          height={props.height}
          ratio={props.ratio}
          style={props.style}
          className={props.className}
        />
      </RemountOnResize>
    );
  }
}

module.exports = Sketch;