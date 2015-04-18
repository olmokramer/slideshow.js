# Slideshow.js ([demo](https://olmokramer.github.io/slideshow.js))

Slideshow.js is a javascript slideshow with support for touch & mouse swipe.



# Usage

Create some slides in a container:

```html
<div class="slides-container">
  <div class="slide"></div>
  <div class="slide"></div>
  <div class="slide"></div>
  <div class="slide"></div>
</div>
```

Then create a new slideshow from the container element:

```js
var container = document.querySelector('.slides-container')
var slideshow = new Slideshow(container, options);
```

Support for touch and mouse events will be automatically detected, but it can be explicitly disabled.



## Options

| option               | required | type     | default   | description |
| ---                  | ---      | ---      | ---       | --- |
| touchEventsEnabled   | no       | boolean  | true      | Enable or disable swipe for sliding through the slideshow. |
| mouseEventsEnabled   | no       | boolean  | true      | Enable or disable mouse events for sliding through the slideshow. |
| preventDefaultEvents | no       | boolean  | true      | Prevent default events on the slideshow element (prevent scroll while swiping on mobile devices). |
| animationDuration    | no       | number   | 400       | The duration of the animation. |
| animationDirection   | no       | string   | 'x'       | 'x': animate horizontally, 'y': animate vertically. The default effect does not support 'y', but that will change. |
| onWillChange         | no       | function | no-op     | Fired when the animation is about to start, in the case of a touch event, this fires right after the `touchEnd` event. `this` refers to the slideshow instance. Receives the same parameters as the callbacks of the `goTo*` methods. |
| onDidChange          | no       | function | no-op     | Fired when the animation is finished. `this` refers to the slideshow instance. Receives the same parameters as the callbacks of the `goTo*` methods. |
| effect               | no       | 'string' | 'default' | Name of a registered effect, or an effect object. Effects can be registered with [Slideshow.registerEffect](#slideshow.registereffect-effectname-effect-). See [Effect](#effect) for more information on effects. |



## Effect

The effect option is an object with three functions and a conditions array:

| name     | description |
| ---      | --- |
| before   | Executed right before the animation starts.|
| progress | The actual animation function. |
| after    | Executed right after the animation finishes. |
| conditions | Array with conditions |

#### effect.before(slideState, slideElement)

Executed right before the animation starts. You can put the slide elements that are going to be animated in the right place in this function.

| param        | type        | description |
| ---          | ---         | --- |
| slideState   | int         | `-1`, `0` or `1`, where `-1` means `slideElement` is the previous slide, `0` means `slideElement` is the current slide and `1` means `slideElement` is the next slide. |
| slideElement | HTMLElement | The slide's DOM element. |

The values of slideState and their corresponding slides in the before function:

![different values for slideState in the before function](img/before.png)

#### effect.progress(slideState, progress, slideElement)

The actual animation function. This function is called in a `requestAnimationFrame` loop. The plugin provides it's own fallback for `requestAnimationFrame`.

| param         | type       | description |
| ---           | ---        | --- |
| slideState    | int        | `0` or `1`, where 0 means `slideElement` is the slide that is going away and 1 means `slideElement` is the slide that is coming into view. |
| progress      | number     | The progress of the animation, anywhere between `-1` and `1`. `0` means nothing has happened yet and both `-1` and `1` mean that the animation has finished. A negative number indicates going to the previous slide, a positive number indicates going to the next slide. |
| slideElement | HTMLElement | The slide's DOM element. |

Arguments:

The values of slideState and their corresponding slides in the progress function (the slides are moving to the right in this image):

![different values for slideState in the before function](img/progress.png)

The progress function is where the animating happens. Use it to modify properties of the `slideElement.style`, according to the progress. Lightweight progress functions increase animation performance.

#### effect.after(slideState, slideElement)

Executed right after the animation finishes. You can clean up here, for example hide the previous slide.

| param        | type        | description |
| ---          | ---         | --- |
| slideState   | int         | `0` or `1`, where `0` means `slideElement` is the slide that moved away and `1` means `slideElement` is the slide that moved in. |
| slideElement | HTMLElement | The slide's DOM element. |

The values of slideState and their corresponding slides in the after function (a slide to the left has just occurred in this image):

![different values for slideState in the before function](img/after.png)

#### effect.conditions

The conditions array is used to determine if, after a touch/mouse event, the current slide or the next slide should slide into view. The array consists of objects, each of which has up to three keys:

| key              | required | type  | default          | description |
| ---              | ---      | ---   | ---              | --- |
| progress         | yes      | float | no default value | The minimum percentage of the slideshow element's width (height will also be supported) that the user must have touched the slideshow. Between 0 and 1. |
| time             | no       | int   | Infinity         | The maximum duration of the touch event. |
| durationModifier | no       | float | 1                | Modifier for the animation duration, if this condition passes. |

When a touch event ends, the total distance and duration of the touch event will be measured. The distance is divided by the width of the slides' parent, to get the `progress`.

Each condition in the array is compared to the touch event according to `touchEventProgress > condition.progress && touchEventDuration < condition.time`. When this evaluates to true, the slideshow will proceed to animate to the next slide, when false the slideshow will return to the current slide.

#### Example

This example effect fades the slides in/out instead of sliding left/right

```js
effect: {
  before: function(slideState, slideElement) {
    if (slideState === 0) {
      // this is the currently visible slide. we want it to
      // be totally opaque before animating it to totally transparent.
      slideElement.style.opacity = 1;
    } else {
      // this is the slide that will become opaque, but first
      // it should be transparent.
      slideElement.style.opacity = 0;
    }
  },
  progress: function(slideState, progress, slideElement) {
    // get the absolute value of the property, because we are
    // not interested in left/right
    progress = Math.abs(progress);
    // the slide that was visible at first should become
    // more and more transparent as we progress further.
    // the other element should get more opaque.
    if (slideState === 0) {
      slideElement.style.opacity = 1 - progress;
    } else {
      slideElement.style.opacity = progress;
    }
  },
  after: function(slideState, slideElement) {
    // the new slide should be on top for save image (etc.) to work
    if (slideState === 0) {
      // this is the previous slide, so send down
      slideElement.style.zIndex = 0
    } else {
      // this is the next slide so send to top
      slideElement.style.zIndex = 1
    }
  },
  conditions: [{
    // if user swipes over 10% of the slideshow width
    // in less than 250ms, the slideshow will go to the
    // next slide, playing the animation twice as fast
    progress: .1,
    time: 250,
    durationModifier: .5
  }, {
    // else if user swipes over 30% of the slideshow width
    // in less than 500ms, the slideshow will go to the
    // next slide, playing the animation at normal speed
    progress: .3,
    time: 500
  }, {
    // else if the user swipes over half otf the slideshow
    // the slideshow will go to the next slide
    progress: .5
  }]
  // else the current slide sill slide back into place
}
```



## Methods

Instances of `Slideshow` have the following methods.

#### getSlide(index)

Gets the element of the slide at given index. Applies modulo to the index.

| param | description |
| --- | --- |
| index | The index of the slide to return. Starts at 0 |

#### getCurrentSlide()

Gets the element of the currently visible slide

#### getNextSlide()

Gets the slide after the currently visible one

#### getPrevSlide()

Gets the slide before the currently visible one

#### getFirstSlide()

Gets the first slide. Equivalent to `getSlide(0)`

#### getLastSlide()

Gets the last slide. Equivalent to `getSlide(slides.length - 1)`

#### goTo(index, callback)

Go to the slide at given index. Calls callback when the animation is finished.

| param    | description |
| ---      | --- |
| index    | index of the target slide |
| callback | callback function, called when the animation is finished |

#### goToNext(callback)

Go to the next slide. Continues with first slide if currently on last slide.

| param    | description |
| ---      | --- |
| callback | callback function, called when the animation is finished |

#### goToPrev(callback)

Go to the previous slide. Continues with last slide if currently on first slide.

| param    | description |
| ---      | --- |
| callback | callback function, called when the animation is finished |

#### goToFirst

Go to the first slide.

| param    | description |
| ---      | --- |
| callback | callback function, called when the animation is finished |

#### goToLast

Go to the last slide.

| param    | description |
| ---      | --- |
| callback | callback function, called when the animation is finished |

#### callback(previousSlide, currentSlide, currentSlideIndex)

The callback function in the `goTo*` functions receives the following parameters:

| param             | description |
| ---               | --- |
| previousSlide     | The slide that was visible before the `goTo` function was called. |
| currentSlide      | The slide that is visible after the `goTo` function was called. |
| currentSlideIndex | Index of the slide that is visible after the `goTo` function was called. |


## Class methods

The `Slideshow` class has the following methods.

#### Slideshow.registerAsJQueryPlugin(jQuery, methodName)

Registers slideshow.js as a jQuery plugin, to be called with `jQuery[methodName](options)`

| param      | description |
| ---        | --- |
| jQuery     | The jQuery object to extend. |
| methodName | The name of the plugin method. The method returns an array of `Slideshow` instances. |

#### Example

```js
Slideshow.registerAsJQueryPlugin(window.jQuery, 'Slideshow');

$('.slideshow-container').Slideshow(slideshowOptions);
```

#### Slideshow.registerEffect(effectName, effect)

Register a new effect.

| param      | description |
| ---        | --- |
| effectName | The name of the effect. |
| effect     | An [effect](#effect) object. |

#### Example

```js
Slideshow.registerEffect('my-effect', effect);

new Slideshow(document.querySelector('.slideshow'), {
  effect: 'my-effect'
});
```



## Acknowledgement

A lot of credits go to [slides.js](http://slidesjs.com/), which has been a huge inspiration for this project. I thought it wasn't customisable enough and I wanted to get rid of the jQuery requirement, so I created slideshow.js.



## License

This project is licensed under the [MIT license](LICENSE).<br>
&copy; 2015, Olmo Kramer
