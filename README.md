# Slideshow.js 1.0.5

Slideshow.js is a javascript slideshow, with touch/swipe support. [Demo here](https://olmokramer.github.io/slideshow.js)

# Usage

Create some slides in a container:

```
<div class="slides-container">
  <div class="slide"></div>
  <div class="slide"></div>
  <div class="slide"></div>
  <div class="slide"></div>
</div>
```

Then create a new slideshow from the container element:

```
var container = document.querySelector('.slides-container')
var slideshow = new Slideshow(container, options);
```

Support for touch events will be automatically detected, but it can be explicitly disabled.

## Options

Everything optional, but for the effect all 3 functions must be provided.
- `supportTouch`: (boolean) enable/disable touch events (default: true (enabled))
- `preventScroll`: (boolean) enable/disable event.preventDefault() on the touch events (default: true (disabled))
- `first`: (int) the index of the first slide to show (default: 0)
- `animationDuration`: (int) duration of the sliding animation (default: 400)
- [`effect`](README.md#effect): (object) define the animation functions (default: slide left to right and back)
- [`conditions`](README.md#conditions): (array) conditions to determine if a slide should occur after a touch event

## <a name="conditions"></a>Conditions

The conditions array is used to determine if after a touch event, it should slide to the next image, or slide the current image back. The array should consist of objects, each of which can have up to three keys:

- distance: (float, required) the minimum percentage of the slideshow (in the x direction, y direction will also be supported) the touch must have traveled. values should be between 0 and 1
- time: (int) the maximum duration of the touch event (default: Infinity)
- durationMod: (float) modifier for the animation duration, if this condition is met (default: 1)

When a touch event ends, the total distance and duration of the touch event will be measured. The distance is divided by the width of the slides' parent, to get the distance.

Each condition in the array is compared to the touch event according to `touchEvent.distance > condition.distance && touchEvent.duration < condition.time`. When this evaluates to true, the slideshow will proceed to animate to the next slide, when false the slideshow will return to its previous state, the current slide.

#### Example

We have the following conditions set:

```
[{
  distance: .5
}, {
  distance: .3,
  time: 500,
  durationMod: .5
}, {
  distance: .1,
  time: 250,
  durationMod: .5
}]
```

The user swiped the slideshow over 40% of its width, so `distance = 0.4`. He did this in `duration = 300ms`.

The first condition is checked. No time is specified, so only the distance is taken into account. The touch event's distance is 0.4, which is smaller than the 0.5 from the condition, so the condition fails.

Next condition: the distance (0.4) is larger than the conditions distance (0.3). Also, the touch duration (300ms) is smaller than the time condition (500ms). The condition passes, so the slideshow slides to the next image. The condition has a durationMod of 0.5 so the animation will be twice as fast.

## <a name="effect"></a>Effect

The effect option is an object with three functions:

- `before`: (function) executed right before the slide is animated
- `progress`: (function) the actual animation function
- `after`: (function) executed right after the animation

Be sure to prepare the slides with css, so if you're going to animate opacity, make the slides transparent with a css rule.

#### effect.before

Arguments:
1. slideState: (int) -1, 0 or 1 where:
  - -1 indicates this is the slide before the currently visible slide
  - 0 indicates this is the currently visible slide
  - 1 indicates this is the slide after the currently visible slide
2. slideElement: (HTMLElement) this slide's DOM object

The before function is called just before animating the slides. Depending of the type of action that activates the animation (programmatically or by touch) it is called with different elements.
When programmatically sliding to a new slide, it is called on the currently visible slide, and on the targeted slide.
When touching to slide, it is called on the currently visible slide, and its immediate neighbours.

This function is mostly used to put the slide elements in place before animating them.

#### effect.after

Arguments:
1. slideState: (int) 0 or 1 where:
  - 0 indicates this is the slide that was just moved away
  - 1 indicates this is the slide that was just moved in
2. slideElement: (HTMLElement) this slide's DOM object

The after function is called just after animating the slides. It is used to clean up some stuff if necessary.

#### effect.progress

Arguments:
1. slideState: (int) 0 or 1 where:
  - 0 indicates this is the slide that is currently moving away
  - 1 indicates this is the slide that is currently moving in
2. progress: (float) can be any value between -1 and 1. A negative value indicates movement to the right (or to a previous slide) where a positive value indicates the opposite.
3. slideElement: (HTMLElement) this slide's DOM object

The progress function is where the animating happens. Use it to modify properties of the slideElement, according to the progress. Lightweight progress functions increase animation performance.

#### Example

Instead of a slide left to right, we want a fade. You can check this out in the demo (the second gallery). It could be accomplished like this:

```
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
  }
}
```

## Methods

The slideshow created with `new Slideshow(element, options)` has the following methods:

- getSlide(index): get slide at &lt;index&gt;
- getCurrentSlide: get the currently visible slide
- getNextSlide: get the slide after the currently visible slide
- getPrevSlide: get the slide before the currently visible slide
- getFirstSlide: get the first slide in the slideshow
- getLastSlide: get the last slide in the slideshow
- slideTo(index, direction): slide to slide at &lt;index&gt;, animating slides to the &lt;direction&gt; ('left' or 'right')
- nextSlide(direction): slide to the next slide, animating slides to the &lt;direction&gt; ('left' or 'right')
- prevSlide(direction): slide to the previous slide, animating slides to the &lt;direction&gt; ('left' or 'right')
