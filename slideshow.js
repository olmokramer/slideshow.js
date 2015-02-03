(function() {
  'use strict';
  var bind, extend, factory, indexOf, isNaN, isNumber, isObject, prefix,
    __slice = [].slice,
    __hasProp = {}.hasOwnProperty;

  (function(root) {
    var i, lastTime, vendor, vendors, _ref;
    lastTime = 0;
    vendors = ['ms', 'moz', 'webkit', 'o'];
    i = 0;
    while (i < vendors.length && !root.requestAnimationFrame) {
      vendor = vendors[i++];
      root.requestAnimationFrame = root[vendor + "RequestAnimationFrame"];
      root.cancelAnimationFrame = (_ref = root[vendor + "CancelAnimationFrame"]) != null ? _ref : root[vendor + "CancelRequestAnimationFrame"];
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

  isNaN = isNaN != null ? isNaN : function(obj) {
    return isNumber(obj && obj !== +obj);
  };

  isNumber = function(obj) {
    return Object.prototype.toString.call(obj) === '[object Number]';
  };

  isObject = function(obj) {
    var type;
    return (type = typeof obj) === 'object' || type === 'function';
  };

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

  indexOf = function(array, match) {
    var i, item, _i, _len;
    if (array == null) {
      return;
    }
    for (i = _i = 0, _len = array.length; _i < _len; i = ++_i) {
      item = array[i];
      if (item === match) {
        return i;
      }
    }
    return -1;
  };

  bind = function(fn, context) {
    return function() {
      return fn.apply(context, [].slice.call(arguments));
    };
  };

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
      return prefixes[prop] = falsedistance;
    };
  })(typeof window !== "undefined" && window !== null ? window : this);

  factory = function(document) {
    var Slideshow;
    return Slideshow = (function() {
      var animateSlides, defaults, init, initSlides, initTouchEvents, nextFrame, setCurrentSlide, touchend, touchmove, touchstart;

      function Slideshow(element, opts) {
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
        this.opts = extend({}, defaults, opts);
        this.el = element;
        init.call(this);
      }

      defaults = {
        touchEnabled: true,
        preventScroll: true,
        animationDuration: 400,
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
            var X, transform;
            transform = prefix('transform');
            X = 100 * progress * (1 - slideState / Math.abs(progress));
            if (transform) {
              return slideElement.style[transform] = "translateX(" + X + "%)";
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
        }
      };

      init = function() {
        initSlides.call(this);
        return initTouchEvents.call(this);
      };

      initSlides = function() {
        var afterFn, beforeFn, i, slide, _i, _len, _ref, _ref1, _results;
        this.el.style.overflow = 'hidden';
        beforeFn = this.opts.effect.before;
        afterFn = this.opts.effect.after;
        this.slides = (_ref = this.el.children) != null ? _ref : this.el.childNodes;
        this.current = 0;
        _ref1 = this.slides;
        _results = [];
        for (i = _i = 0, _len = _ref1.length; _i < _len; i = ++_i) {
          slide = _ref1[i];
          if (!(i !== this.current)) {
            continue;
          }
          slide.style.position = 'absolute';
          if (i === this.current) {
            if (beforeFn != null) {
              beforeFn.call(this, 0, this.slides[this.current]);
            }
            _results.push(afterFn != null ? afterFn.call(this, 1, this.slides[this.current]) : void 0);
          } else {
            if (beforeFn != null) {
              beforeFn.call(this, 1, slide);
            }
            _results.push(afterFn != null ? afterFn.call(this, 0, slide) : void 0);
          }
        }
        return _results;
      };

      initTouchEvents = function() {
        if (!(this.touchEnabled = this.opts.touchEnabled && (typeof TouchEvent !== "undefined" && TouchEvent !== null))) {
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
        return this.current = indexOf(this.slides, slide);
      };

      animateSlides = function(currentSlide, targetSlide, _arg, callback) {
        var beforeFn, direction, duration, durationMod, progress;
        direction = _arg.direction, progress = _arg.progress, durationMod = _arg.durationMod;
        if (this.currentAnimation != null) {
          return;
        }
        if (progress == null) {
          progress = 0;
        }
        if (durationMod == null) {
          durationMod = 1;
        }
        duration = Math.max(1, this.opts.animationDuration * (1 - progress) * durationMod);
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
          start: new Date().getTime(),
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
        var afterFn, anim, id, progress, progressFn;
        id = requestAnimationFrame(bind(nextFrame, this));
        anim = this.currentAnimation;
        progress = Math.min(1, anim.progress + (new Date().getTime() - anim.start) / anim.duration * (1 - anim.progress));
        progressFn = this.opts.effect.progress;
        if (progressFn != null) {
          progressFn.call(this, 0, progress * anim.direction, anim.currentSlide);
        }
        if (progressFn != null) {
          progressFn.call(this, 1, progress * anim.direction, anim.targetSlide);
        }
        if (progress >= 1) {
          this.currentAnimation = null;
          cancelAnimationFrame(id);
          afterFn = this.opts.effect.after;
          if (afterFn != null) {
            afterFn.call(this, 0, anim.currentSlide);
          }
          if (afterFn != null) {
            afterFn.call(this, 1, anim.targetSlide);
          }
          if (typeof anim.callback === "function") {
            anim.callback();
          }
          return setCurrentSlide.call(this, anim.targetSlide);
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
        if (this.opts.preventDefaultEvents) {
          return event.preventDefault();
        }
      };

      touchmove = function(event) {
        var progress, touch;
        if (this.currentAnimation || (this.currentTouchEvent == null)) {
          return;
        }
        touch = this.currentTouchEvent;
        progress = {
          x: (event.touches[0].pageX - touch.touchX) / this.el.clientWidth,
          y: (event.touches[0].pageY - touch.touchY) / this.el.clientHeight
        };
        requestAnimationFrame((function(_this) {
          return function() {
            var progressFn;
            progressFn = _this.opts.effect.progress;
            progressFn.call(_this, 0, progress, touch.currentSlide);
            return progressFn.call(_this, 1, progress, progress < 0 ? touch.nextSlide : touch.prevSlide);
          };
        })(this));
        if (this.opts.preventDefaultEvents) {
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
          if (progressAbs > cond.progress && timePassed < ((_ref1 = cond.time) != null ? _ref1 : Infinity)) {
            durationMod = (_ref2 = cond.durationModifier) != null ? _ref2 : 1;
            break;
          }
        }
        if (durationMod != null) {
          currentSlide = touch.currentSlide;
          if (progress < 0) {
            direction = -1;
            targetSlide = touch.nextSlide;
          } else {
            direction = 1;
            targetSlide = touch.prevSlide;
          }
          progress = progressAbs;
        } else {
          targetSlide = touch.currentSlide;
          if (progress < 0) {
            direction = 1;
            currentSlide = touch.nextSlide;
          } else {
            direction = -1;
            currentSlide = touch.prevSlide;
          }
          progress = 1 - progressAbs;
        }
        animateSlides.call(this, currentSlide, targetSlide, {
          direction: direction,
          progress: progress,
          durationMod: durationMod
        }, (function(_this) {
          return function() {
            return _this.currentTouchEvent = null;
          };
        })(this));
        if (this.opts.preventDefaultEvents) {
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

      Slideshow.registerAsJQueryPlugin = function(jQuery, methodName) {
        return jQuery.fn[methodName] = function(opts) {
          var container, _i, _len, _results;
          _results = [];
          for (_i = 0, _len = this.length; _i < _len; _i++) {
            container = this[_i];
            _results.push(new Slideshow(container, opts));
          }
          return _results;
        };
      };

      return Slideshow;

    })();
  };

  (function(root, factory) {
    var Slideshow;
    Slideshow = factory(root.document);
    if (typeof define === 'function' && define.amd) {
      return define([], function() {
        return Slideshow;
      });
    } else if (typeof exports !== 'undefined') {
      return module.exports = Slideshow;
    } else {
      return root.Slideshow = Slideshow;
    }
  })(this, factory);

}).call(this);
