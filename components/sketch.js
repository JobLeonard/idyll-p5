import React from 'react';
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
    this.p5 = p5;
    if (div) {
      this.div = div;
      let {
        sketch,
        sketchProps,
        noCanvas,
        webGL,
        alwaysListen,
        ratio,
        updateProps,
      } = this.props;
      let width = div.clientWidth | 0;
      let height = div.clientHeight | 0;
      if (ratio) {
        if (this.props.width || !this.props.height) {
          height = (div.clientWidth / ratio) | 0;
        } else {
          width = (div.clientHeight * ratio) | 0;
        }
      } else if (!this.props.width && !this.props.height) {
        // default to 2:1 ratio
        height = (div.clientWidth * 0.5) | 0;
      }
      let newState = { div, width, height, ratio, noCanvas, webGL };
      if (sketch) {
        const _sketch = this.wrapSketch(sketch, width, height, updateProps, noCanvas, webGL, alwaysListen);
        newState.sketch = new p5(_sketch, div);
      }
      this.setState(newState);
    }
  }

  // We need to handle a number of things:
  // - canvas size is handled by the component, so
  //   we have to wrap setup()
  // - clearing the sketch when unmounting, and allowing
  //   for custom handlers for that
  // - ensuring that mouse, keyboard and touch events
  //   only trigger when the sketch has "focus" (this is
  //   not actual DOM focus, we need to use our own logic)
  wrapSketch(sketch, width, height, updateProps, noCanvas, webGL, alwaysListen) {
    return (p5) => {
      sketch(p5, { width, height, devicePixelRatio: window.devicePixelRatio, updateProps: updateProps });

      const noop = (() => { });
      // handle creation of canvas
      const _setup = p5.setup || noop;
      p5.setup = () => {
        noCanvas ? p5.noCanvas() :
          p5.createCanvas(width, height, webGL ? p5.WEBGL : p5.P2D);
        _setup();
      };

      // handle removing the sketch if the component unmounts
      const _unmount = p5.unmount || noop;
      p5.unmount = () => {
        _unmount();
        p5.remove();
      }

      // Handle focus of mouse events
      const isInCanvas = () => (
        alwaysListen ||
        p5.mouseX < width && p5.mouseX >= 0 &&
        p5.mouseY < height && p5.mouseY >= 0
      );

      if (noCanvas) {
        ['mouseClicked', 'mousePressed', 'mouseReleased',
          'mouseMoved', 'mouseDragged', 'mouseWheel'].map((eventName) => {
            p5[eventName] = noop;
          })
      } else {
        let hasFocus = alwaysListen, pseudoFocus = alwaysListen;
        const _mouseClicked = p5.mouseClicked;
        p5.mouseClicked = (event) => {
          if (pseudoFocus || alwaysListen) {
            hasFocus = isInCanvas();
            if (hasFocus && _mouseClicked) {
              return _mouseClicked(event);
            }
          };
        }

        const _mousePressed = p5.mousePressed;
        p5.mousePressed = (event) => {
          pseudoFocus = isInCanvas();
          if (pseudoFocus && _mousePressed) {
            return _mousePressed(event);
          }
        }

        const _mouseDragged = p5.mouseDragged;
        if (_mouseDragged) {
          p5.mouseDragged = (event) => {
            if (hasFocus || pseudoFocus) {
              return _mouseDragged(event);
            }
          }
        }

        const _mouseReleased = p5.mouseReleased;
        p5.mouseReleased = (event) => {
          if (hasFocus || pseudoFocus) {
            hasFocus = isInCanvas();
            pseudoFocus = hasFocus;
            if (_mouseReleased) {
              return _mouseReleased(event);
            }
          }
        }

        ['mouseMoved', 'mouseWheel'].map((eventName) => {
          const eventHandler = p5[eventName];
          if (eventHandler) {
            p5[eventName] = (event) => {
              if (isInCanvas()) {
                return eventHandler(event);
              }
            }
          }
        });

        const _touchStarted = p5.touchStarted;
        p5.touchStarted = _touchStarted ? (() => {
          pseudoFocus = isInCanvas();
          if (pseudoFocus && _touchStarted) {
            return _touchStarted();
          }
        }) : null;

        const _touchMoved = p5.touchMoved;
        p5.touchMoved = _touchMoved ? (() => {
          if (hasFocus || pseudoFocus) {
            return _touchMoved();
          }

        }) : null;

        const _touchEnded = p5.touchEnded;
        p5.touchEnded = _touchEnded ? (() => {
          if (hasFocus || pseudoFocus) {
            hasFocus = isInCanvas();
            pseudoFocus = hasFocus;
            if (_mouseReleased) {
              return _touchEnded();
            }
          }
        }) : null;

        ['keyPressed', 'keyReleased', 'keyTyped'].map((eventName) => {
          const eventHandler = p5[eventName];
          if (eventHandler) {
            p5[eventName] = (event) => {
              if (hasFocus || alwaysListen) {
                return eventHandler(event);
              }
            }
          }
        });
      }
    }
  }

  componentWillReceiveProps(nextProps) {
    // pass relevant props to sketch
    const { sketch, width, height } = this.state;
    let { webGL, noCanvas, ratio, updateProps } = nextProps;
    this.wrapSketch(nextProps.sketch, width, height, updateProps, noCanvas, webGL)(sketch);
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


class Sketch extends IdyllComponent {
  constructor(props) {
    super(props);
    this.state = { watchedVal: 0 };
  }

  componentWillReceiveProps(nextProps) {
    // we should also remount if the width, height or ratio
    // props changes, so we add those to watchedVal
    if (this.props.watchedVal !== nextProps.watchedVal ||
      this.props.width !== nextProps.width ||
      this.props.height !== nextProps.height ||
      this.props.ratio !== nextProps.ratio) {
      this.setState({ watchedVal: (this.state.watchedVal + 1) & 0xFFFFFFFF })
    }
  }
  render() {
    const { props } = this;
    return (
      <RemountOnResize
        /* Since canvas interferes with CSS layouting,
        we unmount and remount it on resize events */
        watchedVal={this.state.watchedVal}
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