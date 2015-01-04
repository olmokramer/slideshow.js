(function() {
  'use strict';
  var extend, factory, isNaN, isNumber, isObject, prefix, _base,
    __slice = [].slice,
    __hasProp = {}.hasOwnProperty;

  (function(root) {
    var i, lastTime, vendor, vendors, _ref;
    lastTime = 0;
    vendors = ['ms', 'moz', 'webkit', 'o'];
    i = 0;
    while (i < vendors.length && !root.requestAnimationFrame) {
      vendor = vendors[i++];
      root.requestAnimationFrame = root["" + vendor + "RequestAnimationFrame"];
      root.cancelAnimationFrame = (_ref = root["" + vendor + "CancelAnimationFrame"]) != null ? _ref : root["" + vendor + "CancelRequestAnimationFrame"];
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
  })(this);

  isObject = function(obj) {
    var type;
    type = typeof obj;
    return type === 'object' || type === 'function';
  };

  isNumber = function(obj) {
    return Object.prototype.toString.call(obj) === '[object Number]';
  };

  isNaN = (function(root) {
    var _ref;
    return (_ref = root.isNaN) != null ? _ref : function(obj) {
      return isNumber(obj && obj !== +obj);
    };
  })(this);

  extend = function() {
    var object, objects, prop, target, _i, _len;
    target = arguments[0], objects = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    if (!isObject(target)) {
      return;
    }
    for (_i = 0, _len = objects.length; _i < _len; _i++) {
      object = objects[_i];
      for (prop in object) {
        if (!__hasProp.call(object, prop)) continue;
        target[prop] = object[prop];
      }
    }
    return target;
  };

  if ((_base = Function.prototype).bind == null) {
    _base.bind = function(context) {
      return (function(_this) {
        return function() {
          return _this.apply(context, [].slice.call(arguments));
        };
      })(this);
    };
  }

  prefix = (function(root) {
    var prefixes;
    prefixes = {};
    return function(prop) {
      var prefixed, style, vendor, _i, _len, _ref;
      if (prop in prefixes) {
        return prefixes[prop];
      }
      style = root.document.createElement('div').style;
      if (prop in style) {
        return prefixes[prop] = prop;
      }
      prop = prop.charAt(0).toUpperCase() + prop.slice(1);
      _ref = ['moz', 'webkit', 'khtml', 'o', 'ms'];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        vendor = _ref[_i];
        prefixed = "" + vendor + prop;
        if (prefixed in style) {
          return prefixes[prop] = prefixed;
        }
      }
      return false;
    };
  })(this);

  factory = function(document) {
    var Slideshow;
    return Slideshow = (function() {
      var animateSlides, defaults, init, initSlides, initTouchEvents, nextFrame, setCurrentSlide, touchend, touchmove, touchstart;

      function Slideshow(element, opts) {
        this.opts = extend({}, defaults, opts);
        this.el = element;
        init.call(this);
      }

      defaults = {
        supportTouch: true,
        preventScroll: true,
        first: 0,
        animationDuration: 400,
        conditions: [
          {
            distance: .1,
            time: 250,
            durationMod: .5
          }, {
            distance: .3,
            time: 500
          }, {
            distance: .5
          }
        ],
        effect: {
          before: function(slideState, slideElement) {
            var X, transform;
            slideElement.style.display = 'block';

            /*
            slideState  is either -1, 0 or 1
            if slideState === 0 then this is the current slide and we want to show it, so set translateX(0)
            if slideState === -1 then this is the previous slide (to the left) so translateX(-100%)
            if slideState === 1 then this is the next slide (to the right) so translateX(100%)
             */
            transform = prefix('transform');
            X = -slideState * 100;
            if (transform) {
              return slideElement.style[transform] = "translateX(" + X + "%)";
            } else {
              return slideElement.style.left = "" + X + "%";
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
            var X, transform;
            transform = prefix('transform');
            X = 100 * progress * (1 - slideState / Math.abs(progress));
            if (transform) {
              return slideElement.style[transform] = "translateX(" + X + "%)";
            } else {
              return slideElement.style.left = "" + X + "%";
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
        }
      };

      init = function() {
        initSlides.call(this);
        return initTouchEvents.call(this);
      };

      initSlides = function() {
        var afterFn, beforeFn, slide, _i, _len, _ref;
        this.el.className += ' slideshow-container';
        this.el.style.overflow = 'hidden';
        beforeFn = this.opts.effect.before;
        afterFn = this.opts.effect.after;
        _ref = this.el.children;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          slide = _ref[_i];
          if (beforeFn != null) {
            beforeFn.call(this, 1, slide);
          }
          if (afterFn != null) {
            afterFn.call(this, 0, slide);
          }
        }
        this.slides = this.el.children;
        setCurrentSlide.call(this, this.opts.first);
        if (beforeFn != null) {
          beforeFn.call(this, 0, this.slides[this.current]);
        }
        return afterFn != null ? afterFn.call(this, 1, this.slides[this.current]) : void 0;
      };

      initTouchEvents = function() {
        if (!(this.supportTouch = this.opts.supportTouch && (typeof TouchEvent !== "undefined" && TouchEvent !== null))) {
          return;
        }
        this.el.addEventListener('touchstart', (function(_this) {
          return function(e) {
            return touchstart.call(_this, e);
          };
        })(this));
        this.el.addEventListener('touchmove', (function(_this) {
          return function(e) {
            return touchmove.call(_this, e);
          };
        })(this));
        return this.el.addEventListener('touchend', (function(_this) {
          return function(e) {
            return touchend.call(_this, e);
          };
        })(this));
      };

      setCurrentSlide = function(slide) {
        var i;
        if (isNumber(slide)) {
          i = slide;
          slide = this.slides[i];
        } else {
          i = [].indexOf.call(this.slides, slide);
        }
        return this.current = i;
      };

      animateSlides = function(currentSlide, targetSlide, _arg) {
        var beforeFn, direction, duration, durationMod, progress;
        direction = _arg.direction, progress = _arg.progress, durationMod = _arg.durationMod;
        if (this.currentAnimation != null) {
          return;
        }
        direction = (function() {
          switch (direction) {
            case 'left':
              return -1;
            case 'right':
              return 1;
            default:
              return Math.abs(parseInt(direction)) / parseInt(direction);
          }
        })();
        if (isNaN(direction)) {
          throw new Error('Could not determine direction of slide');
        }
        if (progress == null) {
          progress = 0;
        }
        if (durationMod == null) {
          durationMod = 1;
        }
        duration = this.opts.animationDuration * (1 - progress) * durationMod;
        if (this.currentTouchEvent == null) {
          beforeFn = this.opts.effect.before;
          if (beforeFn != null) {
            beforeFn.call(this, 0, currentSlide);
          }
          if (beforeFn != null) {
            beforeFn.call(this, (direction < 0 ? 1 : -1), targetSlide);
          }
        }
        this.currentAnimation = {
          animationStart: new Date().getTime(),
          currentSlide: currentSlide,
          targetSlide: targetSlide,
          direction: direction,
          duration: duration,
          progress: progress
        };
        return requestAnimationFrame(nextFrame.bind(this));
      };

      nextFrame = function(timestamp) {
        var afterFn, anim, id, progress, progressFn;
        id = requestAnimationFrame(nextFrame.bind(this));
        anim = this.currentAnimation;
        progress = Math.min(1, anim.progress + (new Date().getTime() - anim.animationStart) / anim.duration * (1 - anim.progress));
        progressFn = this.opts.effect.progress;
        if (progressFn != null) {
          progressFn.call(this, 0, progress * anim.direction, anim.currentSlide);
        }
        if (progressFn != null) {
          progressFn.call(this, 1, progress * anim.direction, anim.targetSlide);
        }
        if (progress === 1) {
          cancelAnimationFrame(id);
          setCurrentSlide.call(this, anim.targetSlide);
          afterFn = this.opts.effect.after;
          if (afterFn != null) {
            afterFn.call(this, 0, anim.currentSlide);
          }
          if (afterFn != null) {
            afterFn.call(this, 1, anim.targetSlide);
          }
          return this.currentAnimation = null;
        }
      };

      touchstart = function(event) {
        var beforeFn, currentSlide, nextSlide, prevSlide;
        if ((this.currentAnimation != null) || (this.currentTouchEvent != null)) {
          return;
        }
        currentSlide = this.getCurrentSlide();
        prevSlide = this.getPrevSlide();
        nextSlide = this.getNextSlide();
        beforeFn = this.opts.effect.before;
        if (beforeFn != null) {
          beforeFn.call(this, 0, currentSlide);
        }
        if (beforeFn != null) {
          beforeFn.call(this, -1, prevSlide);
        }
        if (beforeFn != null) {
          beforeFn.call(this, 1, nextSlide);
        }
        this.currentTouchEvent = {
          currentSlide: currentSlide,
          prevSlide: prevSlide,
          nextSlide: nextSlide,
          touchStart: event.timeStamp,
          touchX: event.touches[0].pageX,
          touchY: event.touches[0].pageY
        };
        return event.preventDefault();
      };

      touchmove = function(event) {
        var progress, touch;
        if (this.currentAnimation || (this.currentTouchEvent == null)) {
          return;
        }
        touch = this.currentTouchEvent;
        progress = (event.touches[0].pageX - touch.touchX) / this.el.clientWidth;
        requestAnimationFrame((function(_this) {
          return function() {
            var progressFn;
            progressFn = _this.opts.effect.progress;
            progressFn.call(_this, 0, progress, touch.currentSlide);
            return progressFn.call(_this, 1, progress, progress < 0 ? touch.nextSlide : touch.prevSlide);
          };
        })(this));
        if (this.opts.preventScroll) {
          return event.preventDefault();
        }
      };

      touchend = function(event) {
        var cond, currentSlide, direction, durationMod, progress, progressAbs, targetSlide, timePassed, touch, _i, _len, _ref, _ref1, _ref2;
        if (this.currentAnimation || (this.currentTouchEvent == null)) {
          return;
        }
        touch = this.currentTouchEvent;
        progress = (event.changedTouches[0].pageX - touch.touchX) / this.el.clientWidth;
        timePassed = event.timeStamp - touch.touchStart;
        progressAbs = Math.abs(progress);
        _ref = this.opts.conditions;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          cond = _ref[_i];
          if (progressAbs > cond.distance && timePassed < ((_ref1 = cond.time) != null ? _ref1 : Infinity)) {
            durationMod = (_ref2 = cond.durationMod) != null ? _ref2 : 1;
            break;
          }
        }
        if (durationMod != null) {
          currentSlide = touch.currentSlide;
          if (progress < 0) {
            direction = 'left';
            targetSlide = touch.nextSlide;
          } else {
            direction = 'right';
            targetSlide = touch.prevSlide;
          }
          progress = progressAbs;
        } else {
          targetSlide = touch.currentSlide;
          if (progress < 0) {
            direction = 'right';
            currentSlide = touch.nextSlide;
          } else {
            direction = 'left';
            currentSlide = touch.prevSlide;
          }
          progress = 1 - progressAbs;
        }
        animateSlides.call(this, currentSlide, targetSlide, {
          direction: direction,
          progress: progress,
          durationMod: durationMod
        });
        this.currentTouchEvent = null;
        if (this.opts.preventScroll) {
          return event.preventDefault();
        }
      };

      Slideshow.prototype.getSlide = function(i) {
        i = i % this.slides.length;
        if (i < 0) {
          i += this.slides.length;
        }
        return this.slides[i];
      };

      Slideshow.prototype.getCurrentSlide = function() {
        return this.slides[this.current];
      };

      Slideshow.prototype.getNextSlide = function() {
        var target;
        target = (this.current + 1) % this.slides.length;
        return this.slides[target];
      };

      Slideshow.prototype.getPrevSlide = function() {
        var target;
        target = this.current - 1;
        if (target < 0) {
          target = this.slides.length - 1;
        }
        return this.slides[target];
      };

      Slideshow.prototype.getFirstSlide = function() {
        return this.slides[0];
      };

      Slideshow.prototype.getLastSlide = function() {
        return this.slides[this.slides.length - 1];
      };

      Slideshow.prototype.slideTo = function(i, direction) {
        var currentSlide, targetSlide;
        if (i === this.current) {
          return;
        }
        currentSlide = this.getCurrentSlide();
        targetSlide = this.getSlide(i);
        if (direction == null) {
          direction = i < this.current ? 'right' : 'left';
        }
        return animateSlides.call(this, currentSlide, targetSlide, {
          direction: direction
        }, (function(_this) {
          return function() {
            return setCurrentSlide.call(_this, i);
          };
        })(this));
      };

      Slideshow.prototype.nextSlide = function(direction) {
        var currentSlide, nextSlide;
        currentSlide = this.getCurrentSlide();
        nextSlide = this.getNextSlide();
        if (direction == null) {
          direction = 'left';
        }
        return animateSlides.call(this, currentSlide, nextSlide, {
          direction: direction
        }, (function(_this) {
          return function() {
            return setCurrentSlide.call(_this, _this.current + 1);
          };
        })(this));
      };

      Slideshow.prototype.prevSlide = function(direction) {
        var currentSlide, prevSlide;
        currentSlide = this.getCurrentSlide();
        prevSlide = this.getPrevSlide();
        if (direction == null) {
          direction = 'right';
        }
        return animateSlides.call(this, currentSlide, prevSlide, {
          direction: direction
        }, (function(_this) {
          return function() {
            return setCurrentSlide.call(_this, _this.current - 1);
          };
        })(this));
      };

      return Slideshow;

    })();
  };

  (function(root, factory) {
    var Slideshow;
    Slideshow = factory(root.document);
    if (typeof define === 'function' && define.amd) {
      return define([], function() {
        return Slides;
      });
    } else if (typeof exports !== 'undefined') {
      return module.exports = Slides;
    } else {
      return window.Slideshow = Slideshow;
    }
  })(this, factory);

}).call(this);
