import React, { PureComponent } from 'react';
import IdyllComponent from 'idyll-component';

import { RemountOnResize } from './remount';

import p5 from 'p5';

// Wraps retina logic.
// To determine size/layout, we can use CSS on the div
// containing the sketch (we can use this with flexbox,
// for example), or pass a `width` and `height` prop.
// Expects a "sketch" function that generates an *actual*
// p5-sketch function, to be passed to p5. (see example)
export class Sketch extends IdyllComponent {

   constructor(props) {
      super(props);
      this.mountedContainer = this.mountedContainer.bind(this);
      this.state = {};
   }

   mountedContainer(div) {
      // Scaling lets us adjust the painter function for
      // high density displays and zoomed browsers.
      // Painter functions decide how to use scaling
      // on a case-by-case basis.
      if (div) {
         const ratio = window.devicePixelRatio || 1;
         const width = (div.clientWidth * ratio) | 0;
         const height = (div.clientHeight * ratio) | 0;
         let newState = { div, width, height, ratio };
         let { sketch, props } = this.props;
         if (sketch) {
            sketch = new Function('width', 'height', 'props', 'updateProps', sketch)(width, height, this.props, this.updateProps);
            const _sketch = (p5) => {
               p5.unmount = () => {
                  p5.remove();
               }
               sketch(p5);
               const _setup = p5.setup ? p5.setup : () => { };
               p5.setup = noCanvas ? () => {
                  p5.noCanvas();
                  _setup();
               } : () => {
                  p5.createCanvas(width, height);
                  _setup();
               };
            }
            newState.sketch = new p5(_sketch, div);
         }
         this.setState(newState);
      }
   }

   componentWillReceiveProps(nextProps) {
      const { sketch } = this.state;
      if (sketch.receiveProps) {
         sketch.receiveProps(nextProps);
      }
   }

   componentWillUnmount() {
      if (this.state.sketch) {
         this.state.sketch.unmount();
      }
   }

   render() {
      // If not given a width or height prop, make these fill their parent div
      // This will implicitly set the size of the sketch component, which
      // will then call the passed paint function with the right dimensions.
      const { props } = this;
      let style = Object.assign({}, props.style);
      let { width, height } = props;
      switch (typeof height) {
         case 'number':
            width = width | 0;
            style['minWidth'] = width;
            style['maxWidth'] = width;
            break;
         case 'string':
            style.width = width;
            break;
         case 'undefined':
            style.width = style.width ? style.width : '100%';
         default:
      }
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

      style.margin = style.margin ? style.margin : '0 auto';

      return (
         <RemountOnResize
            /* Since canvas interferes with CSS layouting,
            we unmount and remount it on resize events */
            watchedVal={props.watchedVal}
         >
            <div
               // The way canvas interacts with CSS layouting is a bit buggy
               // and inconsistent across browsers. To make it dependent on
               // the layout of the parent container, we only render it after
               // mounting div, that is: after CSS layouting is done.

               ref={this.mountedContainer}
               className={props.className}
               style={style}
            />
         </RemountOnResize>
      );
   }
}
