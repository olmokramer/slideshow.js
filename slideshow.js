(function() {
  'use strict';
  var Slideshow, bind, clone, extend, indexOf, now, _ref,
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

  indexOf = function(array, match) {
    var i, item, _i, _len;
    if (array == null) {
      return;
    }
    if (Array.prototype.indexOf != null) {
      return Array.prototype.indexOf.call(Array.prototype.slice.call(array), match);
    }
    for (i = _i = 0, _len = array.length; _i < _len; i = ++_i) {
      item = array[i];
      if (item === match) {
        return i;
      }
    }
    return -1;
  };

  extend = function() {
    var object, objects, prop, target, _i, _len;
    target = arguments[0], objects = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    if (typeof target !== 'object') {
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

  clone = function(object) {
    return extend({}, object);
  };

  bind = function(fn, context) {
    return function() {
      return fn.apply(context, [].slice.call(arguments));
    };
  };

  now = (_ref = Date.now) != null ? _ref : function() {
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
      var _base;
      this.options = extend({}, defaults, options);
      if (typeof this.options.effect === 'string' && (effects[this.options.effect] != null)) {
        this.options.effect = clone(effects[this.options.effect]);
        return (_base = this.options.effect).conditions != null ? _base.conditions : _base.conditions = effects["default"].conditions.concat();
      }
    };

    defaults = {
      touchEventsEnabled: true,
      mouseEventsEnabled: true,
      preventDefaultEvents: true,
      animationDuration: 400,
      animationDirection: 'x',
      effect: 'default'
    };

    effects = {
      "default": (function() {
        var transformCSSProperty;
        transformCSSProperty = (function() {
          var prefixed, style, vendor, _i, _len, _ref1;
          style = document.createElement('div').style;
          if (style['transform'] != null) {
            return 'transform';
          }
          _ref1 = ['moz', 'webkit', 'khtml', 'o', 'ms'];
          for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
            vendor = _ref1[_i];
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
      var effectAfter, effectBefore, i, slide, _i, _len, _ref1, _ref2, _ref3, _ref4, _results;
      effectBefore = (_ref1 = this.options.effect.before) != null ? _ref1 : Function.prototype;
      effectAfter = (_ref2 = this.options.effect.after) != null ? _ref2 : Function.prototype;
      this.slides = (_ref3 = this.el.children) != null ? _ref3 : this.el.childNodes;
      this.current = 0;
      _ref4 = this.slides;
      _results = [];
      for (i = _i = 0, _len = _ref4.length; _i < _len; i = ++_i) {
        slide = _ref4[i];
        if (i !== this.current) {
          if (i === this.current) {
            effectBefore.call(this, 0, this.slides[this.current]);
            _results.push(effectAfter.call(this, 1, this.slides[this.current]));
          } else {
            effectBefore.call(this, 1, slide);
            _results.push(effectAfter.call(this, 0, slide));
          }
        }
      }
      return _results;
    };

    initEvents = function() {
      var slide, _i, _len, _ref1, _results;
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
        _ref1 = this.slides;
        _results = [];
        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
          slide = _ref1[_i];
          slide.addEventListener('mousedown', preventDefault);
          slide.addEventListener('mousemove', preventDefault);
          _results.push(slide.addEventListener('mouseup', preventDefault));
        }
        return _results;
      }
    };

    setCurrentSlide = function(slide) {
      return this.current = indexOf(this.slides, slide);
    };

    animateSlides = function(currentSlide, targetSlide, _arg, callback) {
      var direction, duration, durationMod, effectBefore, initialProgress, progress, _ref1, _ref2;
      direction = _arg.direction, initialProgress = _arg.initialProgress, durationMod = _arg.durationMod;
      if (this.currentAnimation != null) {
        return;
      }
      if (!((this.currentEvent != null) && this.currentEvent.cancelOnWillChange)) {
        if ((_ref1 = this.options.onWillChange) != null) {
          _ref1.call(this, currentSlide, targetSlide, (this.current + 1) % this.slides.length);
        }
      }
      progress = initialProgress != null ? initialProgress : 0;
      if (durationMod == null) {
        durationMod = 1;
      }
      duration = Math.max(1, this.options.animationDuration * (1 - progress) * durationMod);
      if (this.currentEvent == null) {
        effectBefore = (_ref2 = this.options.effect.before) != null ? _ref2 : Function.prototype;
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
      var anim, callback, currentSlide, direction, duration, effectAfter, effectProgress, id, progress, start, targetSlide, _ref1, _ref2, _ref3, _ref4;
      id = requestAnimationFrame(bind(nextFrame, this));
      anim = this.currentAnimation;
      _ref1 = this.currentAnimation, start = _ref1.start, progress = _ref1.progress, duration = _ref1.duration, direction = _ref1.direction, currentSlide = _ref1.currentSlide, targetSlide = _ref1.targetSlide, callback = _ref1.callback;
      progress = progress + (now() - start) / duration * (1 - progress);
      if (progress >= 1) {
        progress = 1;
        this.currentAnimation = null;
        cancelAnimationFrame(id);
        effectAfter = (_ref2 = this.options.effect.after) != null ? _ref2 : Function.prototype;
        effectAfter.call(this, 0, currentSlide);
        effectAfter.call(this, 1, targetSlide);
        setCurrentSlide.call(this, targetSlide);
        if (callback != null) {
          callback.call(this, currentSlide, targetSlide, this.current);
        }
        if ((_ref3 = this.options.onDidChange) != null) {
          _ref3.call(this, currentSlide, targetSlide, this.current);
        }
        setCurrentSlide.call(this, targetSlide);
      }
      effectProgress = (_ref4 = this.options.effect.progress) != null ? _ref4 : Function.prototype;
      effectProgress.call(this, 0, progress * direction, currentSlide);
      return effectProgress.call(this, 1, progress * direction, targetSlide);
    };

    eventStart = function(event) {
      var currentSlide, effectBefore, nextSlide, prevSlide, startX, startY, timeStamp, _ref1, _ref2, _ref3, _ref4;
      if (this.options.preventDefaultEvents) {
        event.preventDefault();
      }
      if ((this.currentAnimation != null) || (this.currentEvent != null)) {
        return;
      }
      currentSlide = this.getCurrentSlide();
      prevSlide = this.getPrevSlide();
      nextSlide = this.getNextSlide();
      effectBefore = (_ref1 = this.options.effect.before) != null ? _ref1 : Function.prototype;
      effectBefore.call(this, 0, currentSlide);
      effectBefore.call(this, -1, prevSlide);
      effectBefore.call(this, 1, nextSlide);
      timeStamp = event.timeStamp;
      _ref4 = (_ref2 = (_ref3 = event.touches) != null ? _ref3[0] : void 0) != null ? _ref2 : event, startX = _ref4.pageX, startY = _ref4.pageY;
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
      var nextIndex, pageX, pageY, progress, targetSlide, _ref1, _ref2, _ref3, _ref4;
      if (this.options.preventDefaultEvents) {
        event.preventDefault();
      }
      if (this.currentAnimation || (this.currentEvent == null)) {
        return;
      }
      _ref3 = (_ref1 = (_ref2 = event.touches) != null ? _ref2[0] : void 0) != null ? _ref1 : event, pageX = _ref3.pageX, pageY = _ref3.pageY;
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
        this.currentEvent.targetslide = targetSlide;
      }
      if (!(this.currentEvent.cancelOnWillChange && progress !== 0)) {
        this.currentEvent.cancelOnWillChange = true;
        nextIndex = (this.current - progress / Math.abs(progress)) % this.slides.length;
        if ((_ref4 = this.options.onWillChange) != null) {
          _ref4.call(this, this.currentEvent.currentSlide, targetSlide, (this.current - progress / Math.abs(progress)) % this.slides.length);
        }
      }
      this.currentEvent.targetSlide = targetSlide;
      return requestAnimationFrame((function(_this) {
        return function() {
          var effectProgress, _ref5;
          effectProgress = (_ref5 = _this.options.effect.progress) != null ? _ref5 : Function.prototype;
          effectProgress.call(_this, 0, progress, _this.currentEvent.currentSlide);
          return effectProgress.call(_this, 1, progress, targetSlide);
        };
      })(this));
    };

    eventEnd = function(event) {
      var condition, currentSlide, direction, durationMod, initialProgress, pageX, pageY, progress, progressAbs, targetSlide, timePassed, timeStamp, _i, _len, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6;
      if (this.options.preventDefaultEvents) {
        event.preventDefault();
      }
      if (this.currentAnimation || (this.currentEvent == null)) {
        return;
      }
      timeStamp = event.timeStamp;
      _ref3 = (_ref1 = (_ref2 = event.changedTouches) != null ? _ref2[0] : void 0) != null ? _ref1 : event, pageX = _ref3.pageX, pageY = _ref3.pageY;
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
        animateSlides.call(this, currentslide, this.currentEvent.currentSlide, {
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
      _ref4 = this.options.effect.conditions;
      for (_i = 0, _len = _ref4.length; _i < _len; _i++) {
        condition = _ref4[_i];
        if (progressAbs > condition.progress && timePassed < ((_ref5 = condition.time) != null ? _ref5 : Infinity)) {
          durationMod = (_ref6 = condition.durationModifier) != null ? _ref6 : 1;
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
      i = i % this.slides.length;
      if (i < 0) {
        i += this.slides.length;
      }
      return this.slides[i];
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
      var slide, _i, _len, _ref1, _ref2;
      this.el.removeEventListener('touchstart', this.eventStart);
      this.el.removeEventListener('touchmove', this.eventProgress);
      this.el.removeEventListener('touchend', this.eventEnd);
      this.el.removeEventListener('mousedown', this.eventStart);
      this.el.removeEventListener('mousemove', this.eventProgress);
      this.el.removeEventListener('mouseup', this.eventEnd);
      this.el.removeEventListener('mouseleave', this.eventEnd);
      _ref1 = this.slides;
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        slide = _ref1[_i];
        slide.removeEventListener('mousedown', preventDefault);
        slide.removeEventListener('mousemove', preventDefault);
        slide.removeEventListener('mouseup', preventDefault);
      }
      return _ref2 = {}, this.el = _ref2.el, this.slides = _ref2.slides, this.eventStart = _ref2.eventStart, this.eventProgress = _ref2.eventProgress, this.eventEnd = _ref2.eventEnd, this.options = _ref2.options, _ref2;
    };

    Slideshow.registerAsJQueryPlugin = function(jQuery, methodName) {
      if (methodName == null) {
        methodName = 'Slideshow';
      }
      return jQuery.fn[methodName] = function(options) {
        var container, _i, _len, _results;
        _results = [];
        for (_i = 0, _len = this.length; _i < _len; _i++) {
          container = this[_i];
          _results.push(new Slideshow(container, options));
        }
        return _results;
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