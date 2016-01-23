(function() {
  'use strict';
  var Slideshow, bind, clone, extend, indexOf, now, ref,
    slice = [].slice,
    hasProp = {}.hasOwnProperty,
    modulo = function(a, b) { return (+a % (b = +b) + b) % b; };

  (function(root) {
    var i, lastTime, ref, vendor, vendors;
    lastTime = 0;
    vendors = ['ms', 'moz', 'webkit', 'o'];
    i = 0;
    while (i < vendors.length && !root.requestAnimationFrame) {
      vendor = vendors[i++];
      root.requestAnimationFrame = root[vendor + "RequestAnimationFrame"];
      root.cancelAnimationFrame = (ref = root[vendor + "CancelAnimationFrame"]) != null ? ref : root[vendor + "CancelRequestAnimationFrame"];
    }
    if (root.requestAnimationFrame == null) {
      root.requestAnimationFrame = function(callback) {
        var currTime, id, timeToCall;
        currTime = new Date().getTime();
        timeToCall = Math.max(0, 16 - (currTime - lastTime));
        id = root.setTimeout((function() {
          return callback(currTime + timeToCall);
        }), timeToCall);
        lastTime = currTime + timeToCall;
        return id;
      };
    }
    if (root.cancelAnimationFrame == null) {
      return root.cancelAnimationFrame = function(id) {
        return clearTimeout(id);
      };
    }
  })(typeof window !== "undefined" && window !== null ? window : this);

  indexOf = function(array, match) {
    var i, item, j, len;
    if (array == null) {
      return;
    }
    if (Array.prototype.indexOf != null) {
      return Array.prototype.indexOf.call(Array.prototype.slice.call(array), match);
    }
    for (i = j = 0, len = array.length; j < len; i = ++j) {
      item = array[i];
      if (item === match) {
        return i;
      }
    }
    return -1;
  };

  extend = function() {
    var j, len, object, objects, prop, target;
    target = arguments[0], objects = 2 <= arguments.length ? slice.call(arguments, 1) : [];
    if (typeof target !== 'object') {
      return;
    }
    for (j = 0, len = objects.length; j < len; j++) {
      object = objects[j];
      for (prop in object) {
        if (!hasProp.call(object, prop)) continue;
        target[prop] = object[prop];
      }
    }
    return target;
  };

  clone = function(object) {
    return extend({}, object);
  };

  bind = function(fn, context) {
    return function() {
      return fn.apply(context, [].slice.call(arguments));
    };
  };

  now = (ref = Date.now) != null ? ref : function() {
    return new Date().getTime();
  };

  Slideshow = (function() {
    var animateSlides, defaults, effects, eventEnd, eventProgress, eventStart, init, initEvents, initSlides, nextFrame, preventDefault, setCurrentSlide;

    function Slideshow(element, options) {
      if (options == null) {
        options = {};
      }
      if (element.nodeType !== 1) {
        if (element[0] != null) {
          element = element[0];
        }
        if (element.el != null) {
          element = element.el;
        }
      }
      if (element.nodeType !== 1) {
        throw new Error('No valid element provided');
      }
      this.configure(options);
      this.el = element;
      init.call(this);
    }

    Slideshow.prototype.configure = function(options) {
      var base;
      this.options = extend({}, defaults, options);
      if (typeof this.options.effect === 'string' && (effects[this.options.effect] != null)) {
        this.options.effect = clone(effects[this.options.effect]);
        return (base = this.options.effect).conditions != null ? base.conditions : base.conditions = effects["default"].conditions.concat();
      }
    };

    defaults = {
      touchEventsEnabled: true,
      mouseEventsEnabled: true,
      swipeThreshold: 0,
      animationDuration: 400,
      animationDirection: 'x',
      effect: 'default'
    };

    effects = {
      "default": (function() {
        var transformCSSProperty;
        transformCSSProperty = (function() {
          var j, len, prefixed, ref1, style, vendor;
          style = document.createElement('div').style;
          if (style['transform'] != null) {
            return 'transform';
          }
          ref1 = ['moz', 'webkit', 'khtml', 'o', 'ms'];
          for (j = 0, len = ref1.length; j < len; j++) {
            vendor = ref1[j];
            prefixed = vendor + "Transform";
            if (style[prefixed] != null) {
              return prefixed;
            }
          }
          return false;
        })();
        return {
          conditions: [
            {
              progress: .1,
              time: 250,
              durationModifier: .5
            }, {
              progress: .3,
              time: 500
            }, {
              progress: .5
            }
          ],
          before: function(slideState, slideElement) {
            var X;
            slideElement.style.display = 'block';

            /*
            slideState  is either -1, 0 or 1
            if slideState === 0 then this is the current slide and we want to show it, so set translateX(0)
            if slideState === -1 then this is the previous slide (to the left) so translateX(-100%)
            if slideState === 1 then this is the next slide (to the right) so translateX(100%)
             */
            X = -slideState * 100;
            if (transformCSSProperty) {
              return slideElement.style[transformCSSProperty] = "translateX(" + X + "%)";
            } else {
              return slideElement.style.left = X + "%";
            }
          },
          progress: function(slideState, progress, slideElement) {

            /*
            slideState = either 0 or 1
            0 <= Math.abs(progress) <= 1, but progress can also be negative.
            progress < 0 indicates movement to the left
            progress > 0 indicates movement to the right
            
            if slideState === 0 then this is the current slide and we want it to move away as progress increases:
            X1 = 100 * p where p = progress
            if slideState === 1 then this is the target slide and we want it to move in from the left/right as progress increases:
            X2 = 100 * (-p / |p|) * (|p| - 1) where |p| = Math.abs(progress)
            
            X = (1 - S) * X1 + S * X2 where S = slideState
            X is the translateX value that should be set on this slide
            
            X = (1 - S) * 100 * p + S * 100 * (-p / |p|) * (1 - |p|)
            X = 100 * p * ( (1 - S) - S * (1 / |p|) * (1 - |p|) )
            X = 100 * p * ( 1 - S - S * ( (1 / |p|) - 1 ) )
            X = 100 * p * ( 1 - S + S * (1 - (1 / |p|) ) )
            X = 100 * p * ( 1 - S + S - (S / |p|) )
            X = 100 * p * ( 1 - (S / |p|) )
             */
            var X;
            X = 100 * progress * (1 - slideState / Math.abs(progress));
            if (transformCSSProperty) {
              return slideElement.style[transformCSSProperty] = "translateX(" + X + "%)";
            } else {
              return slideElement.style.left = X + "%";
            }
          },
          after: function(slideState, slideElement) {

            /*
            slideState is either 0 or 1
            if slideState === 0 then this is the previously visible slide and it must be hidden
            if slideState === 1 then this is the currently visible slide and it must be visible
             */
            return slideElement.style.display = slideState > 0 ? 'block' : 'none';
          }
        };
      })()
    };

    init = function() {
      initSlides.call(this);
      return initEvents.call(this);
    };

    initSlides = function() {
      var effectAfter, effectBefore, i, j, len, ref1, ref2, ref3, ref4, results, slide;
      effectBefore = (ref1 = this.options.effect.before) != null ? ref1 : Function.prototype;
      effectAfter = (ref2 = this.options.effect.after) != null ? ref2 : Function.prototype;
      this.slides = (ref3 = this.el.children) != null ? ref3 : this.el.childNodes;
      this.current = 0;
      ref4 = this.slides;
      results = [];
      for (i = j = 0, len = ref4.length; j < len; i = ++j) {
        slide = ref4[i];
        if (i !== this.current) {
          if (i === this.current) {
            effectBefore.call(this, 0, this.slides[this.current]);
            results.push(effectAfter.call(this, 1, this.slides[this.current]));
          } else {
            effectBefore.call(this, 1, slide);
            results.push(effectAfter.call(this, 0, slide));
          }
        }
      }
      return results;
    };

    initEvents = function() {
      var j, len, ref1, results, slide;
      this.eventStart = bind(eventStart, this);
      this.eventProgress = bind(eventProgress, this);
      this.eventEnd = bind(eventEnd, this);
      if ((typeof TouchEvent !== "undefined" && TouchEvent !== null) && this.options.touchEventsEnabled) {
        this.el.addEventListener('touchstart', this.eventStart);
        this.el.addEventListener('touchmove', this.eventProgress);
        this.el.addEventListener('touchend', this.eventEnd);
      }
      if ((typeof MouseEvent !== "undefined" && MouseEvent !== null) && this.options.mouseEventsEnabled) {
        this.el.addEventListener('mousedown', this.eventStart);
        this.el.addEventListener('mousemove', this.eventProgress);
        this.el.addEventListener('mouseup', this.eventEnd);
        this.el.addEventListener('mouseleave', this.eventEnd);
        ref1 = this.slides;
        results = [];
        for (j = 0, len = ref1.length; j < len; j++) {
          slide = ref1[j];
          slide.addEventListener('mousedown', preventDefault);
          slide.addEventListener('mousemove', preventDefault);
          results.push(slide.addEventListener('mouseup', preventDefault));
        }
        return results;
      }
    };

    setCurrentSlide = function(slide) {
      return this.current = indexOf(this.slides, slide);
    };

    animateSlides = function(currentSlide, targetSlide, arg, callback) {
      var direction, duration, durationMod, effectBefore, initialProgress, progress, ref1, ref2;
      direction = arg.direction, initialProgress = arg.initialProgress, durationMod = arg.durationMod;
      if (this.currentAnimation != null) {
        return;
      }
      if (!((this.currentEvent != null) && this.currentEvent.cancelOnWillChange)) {
        if ((ref1 = this.options.onWillChange) != null) {
          ref1.call(this, currentSlide, targetSlide, modulo(this.current - direction / Math.abs(direction), this.slides.length));
        }
      }
      progress = initialProgress != null ? initialProgress : 0;
      if (durationMod == null) {
        durationMod = 1;
      }
      duration = Math.max(1, this.options.animationDuration * (1 - progress) * durationMod);
      if (this.currentEvent == null) {
        effectBefore = (ref2 = this.options.effect.before) != null ? ref2 : Function.prototype;
        effectBefore.call(this, 0, currentSlide);
        effectBefore.call(this, (direction < 0 ? 1 : -1), targetSlide);
      }
      this.currentAnimation = {
        start: now(),
        currentSlide: currentSlide,
        targetSlide: targetSlide,
        direction: direction,
        duration: duration,
        progress: progress,
        callback: callback
      };
      return requestAnimationFrame(bind(nextFrame, this));
    };

    nextFrame = function(timestamp) {
      var anim, callback, currentSlide, direction, duration, effectAfter, effectProgress, id, progress, ref1, ref2, ref3, ref4, start, targetSlide;
      id = requestAnimationFrame(bind(nextFrame, this));
      anim = this.currentAnimation;
      ref1 = this.currentAnimation, start = ref1.start, progress = ref1.progress, duration = ref1.duration, direction = ref1.direction, currentSlide = ref1.currentSlide, targetSlide = ref1.targetSlide, callback = ref1.callback;
      progress = progress + (now() - start) / duration * (1 - progress);
      if (progress >= 1) {
        progress = 1;
        this.currentAnimation = null;
        cancelAnimationFrame(id);
        effectAfter = (ref2 = this.options.effect.after) != null ? ref2 : Function.prototype;
        effectAfter.call(this, 0, currentSlide);
        effectAfter.call(this, 1, targetSlide);
        setCurrentSlide.call(this, targetSlide);
        if (typeof callback === 'function') {
          callback.call(this, currentSlide, targetSlide, this.current);
        }
        if ((ref3 = this.options.onDidChange) != null) {
          ref3.call(this, currentSlide, targetSlide, this.current);
        }
        setCurrentSlide.call(this, targetSlide);
      }
      effectProgress = (ref4 = this.options.effect.progress) != null ? ref4 : Function.prototype;
      effectProgress.call(this, 0, progress * direction, currentSlide);
      return effectProgress.call(this, 1, progress * direction, targetSlide);
    };

    eventStart = function(event) {
      var currentSlide, effectBefore, nextSlide, prevSlide, ref1, ref2, ref3, ref4, startX, startY, timeStamp;
      if ((this.currentAnimation != null) || (this.currentEvent != null)) {
        return;
      }
      currentSlide = this.getCurrentSlide();
      prevSlide = this.getPrevSlide();
      nextSlide = this.getNextSlide();
      effectBefore = (ref1 = this.options.effect.before) != null ? ref1 : Function.prototype;
      effectBefore.call(this, 0, currentSlide);
      effectBefore.call(this, -1, prevSlide);
      effectBefore.call(this, 1, nextSlide);
      timeStamp = event.timeStamp;
      ref4 = (ref2 = (ref3 = event.touches) != null ? ref3[0] : void 0) != null ? ref2 : event, startX = ref4.pageX, startY = ref4.pageY;
      return this.currentEvent = {
        currentSlide: currentSlide,
        prevSlide: prevSlide,
        nextSlide: nextSlide,
        timeStamp: timeStamp,
        startX: startX,
        startY: startY
      };
    };

    eventProgress = function(event) {
      var nextIndex, pageX, pageY, progress, ref1, ref2, ref3, ref4, targetSlide;
      if (this.currentAnimation || (this.currentEvent == null)) {
        return;
      }
      ref3 = (ref1 = (ref2 = event.touches) != null ? ref2[0] : void 0) != null ? ref1 : event, pageX = ref3.pageX, pageY = ref3.pageY;
      progress = {
        x: (pageX - this.currentEvent.startX) / this.el.clientWidth,
        y: (pageY - this.currentEvent.startY) / this.el.clientHeight
      };
      progress = (function() {
        switch (this.options.animationDirection) {
          case 'x':
            if (Math.abs(progress.x) > Math.abs(progress.y)) {
              return progress.x;
            }
            break;
          case 'y':
            if (Math.abs(progress.y) > Math.abs(progress.x)) {
              return progress.y;
            }
        }
      }).call(this);
      this.currentEvent.shouldCancel = !progress;
      if (progress == null) {
        return;
      }
      targetSlide = progress < 0 ? this.currentEvent.nextSlide : this.currentEvent.prevSlide;
      if (targetSlide !== this.currentEvent.targetSlide) {
        this.currentEvent.cancelOnWillChange = false;
        this.currentEvent.targetSlide = targetSlide;
      }
      if (!(this.currentEvent.cancelOnWillChange && progress !== 0)) {
        this.currentEvent.cancelOnWillChange = true;
        nextIndex = modulo(this.current - progress / Math.abs(progress), this.slides.length);
        if ((ref4 = this.options.onWillChange) != null) {
          ref4.call(this, this.currentEvent.currentSlide, targetSlide, nextIndex);
        }
      }
      this.currentEvent.targetSlide = targetSlide;
      return requestAnimationFrame((function(_this) {
        return function() {
          var effectProgress, ref5;
          effectProgress = (ref5 = _this.options.effect.progress) != null ? ref5 : Function.prototype;
          effectProgress.call(_this, 0, progress, _this.currentEvent.currentSlide);
          return effectProgress.call(_this, 1, progress, targetSlide);
        };
      })(this));
    };

    eventEnd = function(event) {
      var condition, currentSlide, direction, durationMod, initialProgress, j, len, pageX, pageY, progress, progressAbs, ref1, ref2, ref3, ref4, ref5, ref6, targetSlide, timePassed, timeStamp;
      if (this.currentAnimation || (this.currentEvent == null)) {
        return;
      }
      timeStamp = event.timeStamp;
      ref3 = (ref1 = (ref2 = event.changedTouches) != null ? ref2[0] : void 0) != null ? ref1 : event, pageX = ref3.pageX, pageY = ref3.pageY;
      progress = (function() {
        switch (this.options.animationDirection) {
          case 'x':
            return (pageX - this.currentEvent.startX) / this.el.clientWidth;
          case 'y':
            return (pageY - this.currentEvent.startY) / this.el.clientHeight;
        }
      }).call(this);
      if (this.currentEvent.shouldCancel) {
        currentSlide = progress > 0 ? this.currentEvent.nextSlide : this.currentEvent.prevSlide;
        direction = progress / Math.abs(progress);
        initialProgress = 1 - Math.abs(progress);
        animateSlides.call(this, currentSlide, this.currentEvent.currentSlide, {
          direction: direction,
          initialProgress: initialProgress
        });
        this.currentEvent = null;
        return;
      }
      if (progress === 0) {
        this.currentEvent = null;
        return;
      }
      timePassed = timeStamp - this.currentEvent.timeStamp;
      progressAbs = Math.abs(progress);
      ref4 = this.options.effect.conditions;
      for (j = 0, len = ref4.length; j < len; j++) {
        condition = ref4[j];
        if (progressAbs > condition.progress && timePassed < ((ref5 = condition.time) != null ? ref5 : Infinity)) {
          durationMod = (ref6 = condition.durationModifier) != null ? ref6 : 1;
          break;
        }
      }
      if (durationMod != null) {
        currentSlide = this.currentEvent.currentSlide;
        direction = progress / progressAbs;
        if (direction === 1) {
          targetSlide = this.currentEvent.prevSlide;
        } else {
          targetSlide = this.currentEvent.nextSlide;
        }
        initialProgress = progressAbs;
      } else {
        targetSlide = this.currentEvent.currentSlide;
        direction = -progress / progressAbs;
        if (direction === 1) {
          currentSlide = this.currentEvent.nextSlide;
        } else {
          currentSlide = this.currentEvent.prevSlide;
        }
        initialProgress = 1 - progressAbs;
      }
      return animateSlides.call(this, currentSlide, targetSlide, {
        direction: direction,
        initialProgress: initialProgress,
        durationMod: durationMod
      }, (function(_this) {
        return function() {
          return _this.currentEvent = null;
        };
      })(this));
    };

    preventDefault = function(event) {
      return event.preventDefault();
    };

    Slideshow.prototype.getSlide = function(i) {
      return this.slides[modulo(i, this.slides.length)];
    };

    Slideshow.prototype.getCurrentSlide = function() {
      return this.slides[this.current];
    };

    Slideshow.prototype.getCurrentIndex = function() {
      return this.current;
    };

    Slideshow.prototype.getNextSlide = function() {
      return this.getSlide(this.current + 1);
    };

    Slideshow.prototype.getPrevSlide = function() {
      return this.getSlide(this.current - 1);
    };

    Slideshow.prototype.getFirstSlide = function() {
      return this.slides[0];
    };

    Slideshow.prototype.getLastSlide = function() {
      return this.slides[this.slides.length - 1];
    };

    Slideshow.prototype.goTo = function(i, cb) {
      var currentSlide, direction, targetSlide;
      if (i === this.current) {
        return;
      }
      currentSlide = this.getCurrentSlide();
      targetSlide = this.getSlide(i);
      direction = i < this.current ? 1 : -1;
      return animateSlides.call(this, currentSlide, targetSlide, {
        direction: direction
      }, cb);
    };

    Slideshow.prototype.goToNext = function(cb) {
      return this.goTo(this.current + 1, cb);
    };

    Slideshow.prototype.goToPrev = function(cb) {
      return this.goTo(this.current - 1, cb);
    };

    Slideshow.prototype.goToFirst = function(cb) {
      return this.goTo(0, cb);
    };

    Slideshow.prototype.goToLast = function(cb) {
      return this.goTo(this.slides.length - 1, cb);
    };

    Slideshow.prototype.destroy = function() {
      var j, len, ref1, ref2, slide;
      this.el.removeEventListener('touchstart', this.eventStart);
      this.el.removeEventListener('touchmove', this.eventProgress);
      this.el.removeEventListener('touchend', this.eventEnd);
      this.el.removeEventListener('mousedown', this.eventStart);
      this.el.removeEventListener('mousemove', this.eventProgress);
      this.el.removeEventListener('mouseup', this.eventEnd);
      this.el.removeEventListener('mouseleave', this.eventEnd);
      ref1 = this.slides;
      for (j = 0, len = ref1.length; j < len; j++) {
        slide = ref1[j];
        slide.removeEventListener('mousedown', preventDefault);
        slide.removeEventListener('mousemove', preventDefault);
        slide.removeEventListener('mouseup', preventDefault);
      }
      return ref2 = {}, this.el = ref2.el, this.slides = ref2.slides, this.eventStart = ref2.eventStart, this.eventProgress = ref2.eventProgress, this.eventEnd = ref2.eventEnd, this.options = ref2.options, ref2;
    };

    Slideshow.registerAsJQueryPlugin = function(jQuery, methodName) {
      if (methodName == null) {
        methodName = 'Slideshow';
      }
      return jQuery.fn[methodName] = function(options) {
        var container, j, len, results;
        results = [];
        for (j = 0, len = this.length; j < len; j++) {
          container = this[j];
          results.push(new Slideshow(container, options));
        }
        return results;
      };
    };

    Slideshow.registerEffect = function(name, effect) {
      if (effect.conditions == null) {
        effect.conditions = effects["default"].conditions.concat();
      }
      return effects[name] != null ? effects[name] : effects[name] = effect;
    };

    return Slideshow;

  })();

  (function(root) {
    if (typeof define === 'function' && define.amd) {
      return define([], function() {
        return Slideshow;
      });
    } else if (typeof exports !== 'undefined') {
      return module.exports = Slideshow;
    } else {
      return root.Slideshow = Slideshow;
    }
  })(this);

}).call(this);

//# sourceMappingURL=slideshow.js.map
