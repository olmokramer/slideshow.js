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
      return prefixes[prop] = false;
    };
  })(typeof window !== "undefined" && window !== null ? window : this);

  factory = function(document) {
    var Slideshow;
    return Slideshow = (function() {
      var animateSlides, defaults, eventEnd, eventProgress, eventStart, init, initEvents, initSlides, nextFrame, setCurrentSlide, transformCSSProperty;

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

      transformCSSProperty = prefix('transform');

      defaults = {
        touchEventsEnabled: true,
        mouseEventsEnabled: true,
        preventScroll: true,
        animationDuration: 400,
        onDidChange: function() {},
        onWillChange: function() {},
        animationDirection: 'x',
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
        }
      };

      init = function() {
        initSlides.call(this);
        return initEvents.call(this);
      };

      initSlides = function() {
        var afterAnimate, beforeAnimate, i, slide, _i, _len, _ref, _ref1, _results;
        this.el.style.position = 'relative';
        this.el.style.overflow = 'hidden';
        beforeAnimate = this.opts.effect.before;
        afterAnimate = this.opts.effect.after;
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
            if (beforeAnimate != null) {
              beforeAnimate.call(this, 0, this.slides[this.current]);
            }
            _results.push(afterAnimate != null ? afterAnimate.call(this, 1, this.slides[this.current]) : void 0);
          } else {
            if (beforeAnimate != null) {
              beforeAnimate.call(this, 1, slide);
            }
            _results.push(afterAnimate != null ? afterAnimate.call(this, 0, slide) : void 0);
          }
        }
        return _results;
      };

      initEvents = function() {
        var slide, _i, _len, _ref, _results;
        if ((typeof TouchEvent !== "undefined" && TouchEvent !== null) && this.opts.touchEventsEnabled) {
          this.el.addEventListener('touchstart', bind(eventStart, this));
          this.el.addEventListener('touchmove', bind(eventProgress, this));
          this.el.addEventListener('touchend', bind(eventEnd, this));
        }
        if ((typeof MouseEvent !== "undefined" && MouseEvent !== null) && this.opts.mouseEventsEnabled) {
          this.el.addEventListener('mousedown', bind(eventStart, this));
          this.el.addEventListener('mousemove', bind(eventProgress, this));
          this.el.addEventListener('mouseup', bind(eventEnd, this));
          _ref = this.slides;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            slide = _ref[_i];
            slide.addEventListener('mousedown', function(event) {
              return event.preventDefault();
            });
            slide.addEventListener('mousemove', function(event) {
              return event.preventDefault();
            });
            _results.push(slide.addEventListener('mouseup', function(event) {
              return event.preventDefault();
            }));
          }
          return _results;
        }
      };

      setCurrentSlide = function(slide) {
        return this.current = indexOf(this.slides, slide);
      };

      animateSlides = function(currentSlide, targetSlide, _arg, callback) {
        var beforeAnimate, direction, duration, durationMod, progress;
        direction = _arg.direction, progress = _arg.progress, durationMod = _arg.durationMod;
        if (this.currentAnimation != null) {
          return;
        }
        this.opts.onWillChange.call(this);
        if (progress == null) {
          progress = 0;
        }
        if (durationMod == null) {
          durationMod = 1;
        }
        duration = Math.max(1, this.opts.animationDuration * (1 - progress) * durationMod);
        if (this.currentTouchEvent == null) {
          beforeAnimate = this.opts.effect.before;
          if (beforeAnimate != null) {
            beforeAnimate.call(this, 0, currentSlide);
          }
          if (beforeAnimate != null) {
            beforeAnimate.call(this, (direction < 0 ? 1 : -1), targetSlide);
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
        var afterAnimate, anim, id, progress, progressFn;
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
          afterAnimate = this.opts.effect.after;
          if (afterAnimate != null) {
            afterAnimate.call(this, 0, anim.currentSlide);
          }
          if (afterAnimate != null) {
            afterAnimate.call(this, 1, anim.targetSlide);
          }
          if (typeof anim.callback === "function") {
            anim.callback();
          }
          this.opts.onDidChange.call(this);
          return setCurrentSlide.call(this, anim.targetSlide);
        }
      };

      eventStart = function(event) {
        var beforeAnimate, currentSlide, nextSlide, pageX, pageY, prevSlide, timeStamp, _ref, _ref1, _ref2;
        if (this.opts.preventDefaultEvents) {
          event.preventDefault();
        }
        if ((this.currentAnimation != null) || (this.currentEvent != null)) {
          return;
        }
        currentSlide = this.getCurrentSlide();
        prevSlide = this.getPrevSlide();
        nextSlide = this.getNextSlide();
        beforeAnimate = this.opts.effect.before;
        if (beforeAnimate != null) {
          beforeAnimate.call(this, 0, currentSlide);
        }
        if (beforeAnimate != null) {
          beforeAnimate.call(this, -1, prevSlide);
        }
        if (beforeAnimate != null) {
          beforeAnimate.call(this, 1, nextSlide);
        }
        _ref2 = (_ref = (_ref1 = event.touches) != null ? _ref1[0] : void 0) != null ? _ref : event, timeStamp = _ref2.timeStamp, pageX = _ref2.pageX, pageY = _ref2.pageY;
        return this.currentEvent = {
          currentSlide: currentSlide,
          prevSlide: prevSlide,
          nextSlide: nextSlide,
          timeStamp: timeStamp,
          pageX: pageX,
          pageY: pageY
        };
      };

      eventProgress = function(event) {
        var pageX, pageY, progress, targetSlide, _ref, _ref1, _ref2;
        if (this.opts.preventDefaultEvents) {
          event.preventDefault();
        }
        if (this.currentAnimation || (this.currentEvent == null)) {
          return;
        }
        _ref2 = (_ref = (_ref1 = event.touches) != null ? _ref1[0] : void 0) != null ? _ref : event, pageX = _ref2.pageX, pageY = _ref2.pageY;
        progress = (function() {
          switch (this.opts.animationDirection) {
            case 'x':
              return (pageX - this.currentEvent.pageX) / this.el.clientWidth;
            case 'y':
              return (pageY - this.currentEvent.pageY) / this.el.clientHeight;
          }
        }).call(this);
        targetSlide = progress < 0 ? this.currentEvent.nextSlide : this.currentEvent.prevSlide;
        return requestAnimationFrame((function(_this) {
          return function() {
            var progressFn;
            progressFn = _this.opts.effect.progress;
            progressFn.call(_this, 0, progress, _this.currentEvent.currentSlide);
            return progressFn.call(_this, 1, progress, targetSlide);
          };
        })(this));
      };

      eventEnd = function(event) {
        var cond, currentSlide, direction, durationMod, pageX, pageY, progress, progressAbs, targetSlide, timePassed, timeStamp, _i, _len, _ref, _ref1, _ref2, _ref3, _ref4, _ref5;
        if (this.opts.preventDefaultEvents) {
          event.preventDefault();
        }
        if (this.currentAnimation || (this.currentEvent == null)) {
          return;
        }
        _ref2 = (_ref = (_ref1 = event.changedTouches) != null ? _ref1[0] : void 0) != null ? _ref : event, pageX = _ref2.pageX, pageY = _ref2.pageY, timeStamp = _ref2.timeStamp;
        progress = (function() {
          switch (this.opts.animationDirection) {
            case 'x':
              return (pageX - this.currentEvent.pageX) / this.el.clientWidth;
            case 'y':
              return (pageY - this.currentEvent.pageY) / this.el.clientHeight;
          }
        }).call(this);
        timePassed = timeStamp - this.currentEvent.timeStamp;
        progressAbs = Math.abs(progress);
        _ref3 = this.opts.conditions;
        for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
          cond = _ref3[_i];
          if (progressAbs > cond.progress && timePassed < ((_ref4 = cond.time) != null ? _ref4 : Infinity)) {
            durationMod = (_ref5 = cond.durationModifier) != null ? _ref5 : 1;
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
          progress = progressAbs;
        } else {
          targetSlide = this.currentEvent.currentSlide;
          direction = -progress / progressAbs;
          if (direction === 1) {
            currentSlide = this.currentEvent.nextSlide;
          } else {
            currentSlide = this.currentEvent.prevSlide;
          }
          progress = 1 - progressAbs;
        }
        return animateSlides.call(this, currentSlide, targetSlide, {
          direction: direction,
          progress: progress,
          durationMod: durationMod
        }, (function(_this) {
          return function() {
            return _this.currentEvent = null;
          };
        })(this));
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
