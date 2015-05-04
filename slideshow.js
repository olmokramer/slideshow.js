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
      effectBefore = (_ref1 = this.options.effect.before) != null ? _ref1 : function() {};
      effectAfter = (_ref2 = this.options.effect.after) != null ? _ref2 : function() {};
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
      if ((_ref1 = this.options.onWillChange) != null) {
        _ref1.call(this, currentSlide, targetSlide, (this.current + 1) % this.children.length);
      }
      progress = initialProgress != null ? initialProgress : 0;
      if (durationMod == null) {
        durationMod = 1;
      }
      duration = Math.max(1, this.options.animationDuration * (1 - progress) * durationMod);
      if (this.currentEvent == null) {
        effectBefore = (_ref2 = this.options.effect.before) != null ? _ref2 : function() {};
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
        effectAfter = (_ref2 = this.options.effect.after) != null ? _ref2 : function() {};
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
      effectProgress = (_ref4 = this.options.effect.progress) != null ? _ref4 : function() {};
      effectProgress.call(this, 0, progress * direction, currentSlide);
      return effectProgress.call(this, 1, progress * direction, targetSlide);
    };

    eventStart = function(event) {
      var currentSlide, effectBefore, nextSlide, pageX, pageY, prevSlide, timeStamp, _ref1, _ref2, _ref3, _ref4;
      if (this.options.preventDefaultEvents) {
        event.preventDefault();
      }
      if ((this.currentAnimation != null) || (this.currentEvent != null)) {
        return;
      }
      currentSlide = this.getCurrentSlide();
      prevSlide = this.getPrevSlide();
      nextSlide = this.getNextSlide();
      effectBefore = (_ref1 = this.options.effect.before) != null ? _ref1 : function() {};
      effectBefore.call(this, 0, currentSlide);
      effectBefore.call(this, -1, prevSlide);
      effectBefore.call(this, 1, nextSlide);
      timeStamp = event.timeStamp;
      _ref4 = (_ref2 = (_ref3 = event.touches) != null ? _ref3[0] : void 0) != null ? _ref2 : event, pageX = _ref4.pageX, pageY = _ref4.pageY;
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
      var pageX, pageY, progress, targetSlide, _ref1, _ref2, _ref3;
      if (this.options.preventDefaultEvents) {
        event.preventDefault();
      }
      if (this.currentAnimation || (this.currentEvent == null)) {
        return;
      }
      _ref3 = (_ref1 = (_ref2 = event.touches) != null ? _ref2[0] : void 0) != null ? _ref1 : event, pageX = _ref3.pageX, pageY = _ref3.pageY;
      progress = (function() {
        switch (this.options.animationDirection) {
          case 'x':
            return (pageX - this.currentEvent.pageX) / this.el.clientWidth;
          case 'y':
            return (pageY - this.currentEvent.pageY) / this.el.clientHeight;
        }
      }).call(this);
      targetSlide = progress < 0 ? this.currentEvent.nextSlide : this.currentEvent.prevSlide;
      return requestAnimationFrame((function(_this) {
        return function() {
          var effectProgress, _ref4;
          effectProgress = (_ref4 = _this.options.effect.progress) != null ? _ref4 : function() {};
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
            return (pageX - this.currentEvent.pageX) / this.el.clientWidth;
          case 'y':
            return (pageY - this.currentEvent.pageY) / this.el.clientHeight;
        }
      }).call(this);
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

//# sourceMappingURL=data:application/json;base64,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QUFRLENBQUEsSUFBQSxJQUFSLE9BQVEsQ0FBQSxJQUFBLElBQVMsT0FGRjtJQUFBLENBbFdqQixDQUFBOztxQkFBQTs7TUEvREQsQ0FBQTs7QUFBQSxFQXNhRSxDQUFBLFNBQUMsSUFBRCxHQUFBO0FBRUQsSUFBQSxJQUFHLE1BQUEsQ0FBQSxNQUFBLEtBQWtCLFVBQWxCLElBQWdDLE1BQU0sQ0FBQyxHQUExQzthQUNFLE1BQUEsQ0FBTyxFQUFQLEVBQVcsU0FBQSxHQUFBO2VBQUcsVUFBSDtNQUFBLENBQVgsRUFERjtLQUFBLE1BR0ssSUFBRyxNQUFBLENBQUEsT0FBQSxLQUFxQixXQUF4QjthQUNILE1BQU0sQ0FBQyxPQUFQLEdBQWlCLFVBRGQ7S0FBQSxNQUFBO2FBSUgsSUFBSSxDQUFDLFNBQUwsR0FBaUIsVUFKZDtLQUxKO0VBQUEsQ0FBQSxDQUFILENBQVcsSUFBWCxDQXRhQyxDQUFBO0FBQUEiLCJmaWxlIjoic2xpZGVzaG93LmpzIiwic291cmNlUm9vdCI6Ii9zb3VyY2UvIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnXG4jIHJlcXVlc3RBbmltYXRpb25GcmFtZSBwb2x5ZmlsbFxuIyBodHRwOi8vcGF1bGlyaXNoLmNvbS8yMDExL3JlcXVlc3RhbmltYXRpb25mcmFtZS1mb3Itc21hcnQtYW5pbWF0aW5nL1xuIyBodHRwOi8vbXkub3BlcmEuY29tL2Vtb2xsZXIvYmxvZy8yMDExLzEyLzIwL3JlcXVlc3RhbmltYXRpb25mcmFtZS1mb3Itc21hcnQtZXItYW5pbWF0aW5nXG5cbiMgcmVxdWVzdEFuaW1hdGlvbkZyYW1lIHBvbHlmaWxsIGJ5IEVyaWsgTcO2bGxlci4gZml4ZXMgZnJvbSBQYXVsIElyaXNoIGFuZCBUaW5vIFppamRlbFxuXG4jIE1JVCBsaWNlbnNlXG5cbmRvIChyb290ID0gd2luZG93ID8gdGhpcykgLT5cbiAgbGFzdFRpbWUgPSAwXG4gIHZlbmRvcnMgPSBbJ21zJywgJ21veicsICd3ZWJraXQnLCAnbyddXG4gIGkgPSAwXG4gIHdoaWxlIGkgPCB2ZW5kb3JzLmxlbmd0aCBhbmQgbm90IHJvb3QucmVxdWVzdEFuaW1hdGlvbkZyYW1lXG4gICAgdmVuZG9yID0gdmVuZG9yc1tpKytdXG4gICAgcm9vdC5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSByb290W1wiI3t2ZW5kb3J9UmVxdWVzdEFuaW1hdGlvbkZyYW1lXCJdXG4gICAgcm9vdC5jYW5jZWxBbmltYXRpb25GcmFtZSA9IHJvb3RbXCIje3ZlbmRvcn1DYW5jZWxBbmltYXRpb25GcmFtZVwiXSA/IHJvb3RbXCIje3ZlbmRvcn1DYW5jZWxSZXF1ZXN0QW5pbWF0aW9uRnJhbWVcIl1cblxuXG4gIHVubGVzcyByb290LnJlcXVlc3RBbmltYXRpb25GcmFtZT9cbiAgICByb290LnJlcXVlc3RBbmltYXRpb25GcmFtZSA9IChjYWxsYmFjaykgLT5cbiAgICAgIGN1cnJUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKClcbiAgICAgIHRpbWVUb0NhbGwgPSBNYXRoLm1heCAwLCAxNiAtIChjdXJyVGltZSAtIGxhc3RUaW1lKVxuICAgICAgaWQgPSByb290LnNldFRpbWVvdXQgKC0+IGNhbGxiYWNrIGN1cnJUaW1lICsgdGltZVRvQ2FsbCksIHRpbWVUb0NhbGxcbiAgICAgIGxhc3RUaW1lID0gY3VyclRpbWUgKyB0aW1lVG9DYWxsXG4gICAgICBpZFxuXG4gIHVubGVzcyByb290LmNhbmNlbEFuaW1hdGlvbkZyYW1lP1xuICAgIHJvb3QuY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSAoaWQpIC0+XG4gICAgICBjbGVhclRpbWVvdXQgaWRcblxuIyBlbmQgcmVxdWVzdEFuaW1hdGlvbkZyYW1lIHBvbHlmaWxsXG5cbiMgaW5kZXhPZihhcnJheSwgbWF0Y2gpIGlzIGVxdWl2YWxlbnQgdG8gYXJyYXkuaW5kZXhPZihtYXRjaClcblxuaW5kZXhPZiA9IChhcnJheSwgbWF0Y2gpIC0+XG4gIHJldHVybiB1bmxlc3MgYXJyYXk/XG4gIGlmIEFycmF5OjppbmRleE9mP1xuICAgIHJldHVybiBBcnJheTo6aW5kZXhPZi5jYWxsIEFycmF5OjpzbGljZS5jYWxsKGFycmF5KSwgbWF0Y2hcbiAgZm9yIGl0ZW0sIGkgaW4gYXJyYXkgd2hlbiBpdGVtIGlzIG1hdGNoXG4gICAgcmV0dXJuIGlcbiAgLTFcblxuIyBleHRlbmQgdGFyZ2V0IHdpdGggcHJvcGVydGllcyBmcm9tIG9iamVjdCBpbiBvYmplY3RzXG5cbmV4dGVuZCA9ICh0YXJnZXQsIG9iamVjdHMuLi4pIC0+XG4gIHJldHVybiB1bmxlc3MgdHlwZW9mIHRhcmdldCBpcyAnb2JqZWN0J1xuICBmb3Igb2JqZWN0IGluIG9iamVjdHNcbiAgICBmb3Igb3duIHByb3Agb2Ygb2JqZWN0XG4gICAgICB0YXJnZXRbcHJvcF0gPSBvYmplY3RbcHJvcF1cbiAgdGFyZ2V0XG5cbiMgc2hhbGxvdyBjbG9uZSBvYmplY3RcblxuY2xvbmUgPSAob2JqZWN0KSAtPiBleHRlbmQge30sIG9iamVjdFxuXG4jIGJpbmQoZm4sIGNvbnRleHQpIGJpbmRzIGNvbnRleHQgdG8gZm5cblxuYmluZCA9IChmbiwgY29udGV4dCkgLT4gLT4gZm4uYXBwbHkgY29udGV4dCwgW10uc2xpY2UuY2FsbCBhcmd1bWVudHNcblxubm93ID0gRGF0ZS5ub3cgPyAtPiBuZXcgRGF0ZSgpLmdldFRpbWUoKVxuXG5jbGFzcyBTbGlkZXNob3dcbiAgY29uc3RydWN0b3I6IChlbGVtZW50LCBvcHRpb25zID0ge30pIC0+XG4gICAgIyB0ZXN0IGlmIGVsZW1lbnQgaXMgYSB2YWxpZCBodG1sIGVsZW1lbnQgb3IgbWF5YmVcbiAgICAjIGEgalF1ZXJ5IG9iamVjdCBvciBCYWNrYm9uZSBWaWV3XG4gICAgdW5sZXNzIGVsZW1lbnQubm9kZVR5cGUgaXMgMVxuICAgICAgaWYgZWxlbWVudFswXT8gdGhlbiBlbGVtZW50ID0gZWxlbWVudFswXSAjIGpRdWVyeVxuICAgICAgaWYgZWxlbWVudC5lbD8gdGhlbiBlbGVtZW50ID0gZWxlbWVudC5lbCAjIEJhY2tib25lXG4gICAgaWYgZWxlbWVudC5ub2RlVHlwZSBpc250IDFcbiAgICAgIHRocm93IG5ldyBFcnJvciAnTm8gdmFsaWQgZWxlbWVudCBwcm92aWRlZCdcbiAgICBAY29uZmlndXJlIG9wdGlvbnNcbiAgICBAZWwgPSBlbGVtZW50XG4gICAgIyBhbmQgZ28hXG4gICAgaW5pdC5jYWxsIEBcblxuICBjb25maWd1cmU6IChvcHRpb25zKSAtPlxuICAgIEBvcHRpb25zID0gZXh0ZW5kIHt9LCBkZWZhdWx0cywgb3B0aW9uc1xuICAgIGlmIHR5cGVvZiBAb3B0aW9ucy5lZmZlY3QgaXMgJ3N0cmluZycgYW5kIGVmZmVjdHNbQG9wdGlvbnMuZWZmZWN0XT9cbiAgICAgIEBvcHRpb25zLmVmZmVjdCA9IGNsb25lIGVmZmVjdHNbQG9wdGlvbnMuZWZmZWN0XVxuICAgICAgQG9wdGlvbnMuZWZmZWN0LmNvbmRpdGlvbnMgPz0gZWZmZWN0cy5kZWZhdWx0LmNvbmRpdGlvbnMuY29uY2F0KClcblxuICAjIHByaXZhdGUgQVBJXG5cbiAgZGVmYXVsdHMgPVxuICAgIHRvdWNoRXZlbnRzRW5hYmxlZDogdHJ1ZVxuICAgIG1vdXNlRXZlbnRzRW5hYmxlZDogdHJ1ZVxuICAgIHByZXZlbnREZWZhdWx0RXZlbnRzOiB0cnVlXG4gICAgYW5pbWF0aW9uRHVyYXRpb246IDQwMFxuICAgIGFuaW1hdGlvbkRpcmVjdGlvbjogJ3gnXG4gICAgZWZmZWN0OiAnZGVmYXVsdCdcblxuICBlZmZlY3RzID1cbiAgICBkZWZhdWx0OiBkbyAtPlxuXG4gICAgICB0cmFuc2Zvcm1DU1NQcm9wZXJ0eSA9IGRvIC0+XG4gICAgICAgIHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jykuc3R5bGVcbiAgICAgICAgcmV0dXJuICd0cmFuc2Zvcm0nIGlmIHN0eWxlWyd0cmFuc2Zvcm0nXT9cbiAgICAgICAgZm9yIHZlbmRvciBpbiBbJ21veicsICd3ZWJraXQnLCAna2h0bWwnLCAnbycsICdtcyddXG4gICAgICAgICAgcHJlZml4ZWQgPSBcIiN7dmVuZG9yfVRyYW5zZm9ybVwiXG4gICAgICAgICAgcmV0dXJuIHByZWZpeGVkIGlmIHN0eWxlW3ByZWZpeGVkXT9cbiAgICAgICAgZmFsc2VcblxuICAgICAgY29uZGl0aW9uczogW1xuICAgICAgICBwcm9ncmVzczogLjFcbiAgICAgICAgdGltZTogMjUwXG4gICAgICAgIGR1cmF0aW9uTW9kaWZpZXI6IC41XG4gICAgICAsXG4gICAgICAgIHByb2dyZXNzOiAuM1xuICAgICAgICB0aW1lOiA1MDBcbiAgICAgICxcbiAgICAgICAgcHJvZ3Jlc3M6IC41XG4gICAgICBdXG4gICAgICBiZWZvcmU6IChzbGlkZVN0YXRlLCBzbGlkZUVsZW1lbnQpIC0+XG4gICAgICAgIHNsaWRlRWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJ1xuICAgICAgICAjIyNcbiAgICAgICAgc2xpZGVTdGF0ZSAgaXMgZWl0aGVyIC0xLCAwIG9yIDFcbiAgICAgICAgaWYgc2xpZGVTdGF0ZSA9PT0gMCB0aGVuIHRoaXMgaXMgdGhlIGN1cnJlbnQgc2xpZGUgYW5kIHdlIHdhbnQgdG8gc2hvdyBpdCwgc28gc2V0IHRyYW5zbGF0ZVgoMClcbiAgICAgICAgaWYgc2xpZGVTdGF0ZSA9PT0gLTEgdGhlbiB0aGlzIGlzIHRoZSBwcmV2aW91cyBzbGlkZSAodG8gdGhlIGxlZnQpIHNvIHRyYW5zbGF0ZVgoLTEwMCUpXG4gICAgICAgIGlmIHNsaWRlU3RhdGUgPT09IDEgdGhlbiB0aGlzIGlzIHRoZSBuZXh0IHNsaWRlICh0byB0aGUgcmlnaHQpIHNvIHRyYW5zbGF0ZVgoMTAwJSlcbiAgICAgICAgIyMjXG4gICAgICAgIFggPSAtc2xpZGVTdGF0ZSAqIDEwMFxuICAgICAgICBpZiB0cmFuc2Zvcm1DU1NQcm9wZXJ0eVxuICAgICAgICAgIHNsaWRlRWxlbWVudC5zdHlsZVt0cmFuc2Zvcm1DU1NQcm9wZXJ0eV0gPSBcInRyYW5zbGF0ZVgoI3tYfSUpXCJcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHNsaWRlRWxlbWVudC5zdHlsZS5sZWZ0ID0gXCIje1h9JVwiXG4gICAgICBwcm9ncmVzczogKHNsaWRlU3RhdGUsIHByb2dyZXNzLCBzbGlkZUVsZW1lbnQpIC0+XG4gICAgICAgICMjI1xuICAgICAgICBzbGlkZVN0YXRlID0gZWl0aGVyIDAgb3IgMVxuICAgICAgICAwIDw9IE1hdGguYWJzKHByb2dyZXNzKSA8PSAxLCBidXQgcHJvZ3Jlc3MgY2FuIGFsc28gYmUgbmVnYXRpdmUuXG4gICAgICAgIHByb2dyZXNzIDwgMCBpbmRpY2F0ZXMgbW92ZW1lbnQgdG8gdGhlIGxlZnRcbiAgICAgICAgcHJvZ3Jlc3MgPiAwIGluZGljYXRlcyBtb3ZlbWVudCB0byB0aGUgcmlnaHRcblxuICAgICAgICBpZiBzbGlkZVN0YXRlID09PSAwIHRoZW4gdGhpcyBpcyB0aGUgY3VycmVudCBzbGlkZSBhbmQgd2Ugd2FudCBpdCB0byBtb3ZlIGF3YXkgYXMgcHJvZ3Jlc3MgaW5jcmVhc2VzOlxuICAgICAgICBYMSA9IDEwMCAqIHAgd2hlcmUgcCA9IHByb2dyZXNzXG4gICAgICAgIGlmIHNsaWRlU3RhdGUgPT09IDEgdGhlbiB0aGlzIGlzIHRoZSB0YXJnZXQgc2xpZGUgYW5kIHdlIHdhbnQgaXQgdG8gbW92ZSBpbiBmcm9tIHRoZSBsZWZ0L3JpZ2h0IGFzIHByb2dyZXNzIGluY3JlYXNlczpcbiAgICAgICAgWDIgPSAxMDAgKiAoLXAgLyB8cHwpICogKHxwfCAtIDEpIHdoZXJlIHxwfCA9IE1hdGguYWJzKHByb2dyZXNzKVxuXG4gICAgICAgIFggPSAoMSAtIFMpICogWDEgKyBTICogWDIgd2hlcmUgUyA9IHNsaWRlU3RhdGVcbiAgICAgICAgWCBpcyB0aGUgdHJhbnNsYXRlWCB2YWx1ZSB0aGF0IHNob3VsZCBiZSBzZXQgb24gdGhpcyBzbGlkZVxuXG4gICAgICAgIFggPSAoMSAtIFMpICogMTAwICogcCArIFMgKiAxMDAgKiAoLXAgLyB8cHwpICogKDEgLSB8cHwpXG4gICAgICAgIFggPSAxMDAgKiBwICogKCAoMSAtIFMpIC0gUyAqICgxIC8gfHB8KSAqICgxIC0gfHB8KSApXG4gICAgICAgIFggPSAxMDAgKiBwICogKCAxIC0gUyAtIFMgKiAoICgxIC8gfHB8KSAtIDEgKSApXG4gICAgICAgIFggPSAxMDAgKiBwICogKCAxIC0gUyArIFMgKiAoMSAtICgxIC8gfHB8KSApIClcbiAgICAgICAgWCA9IDEwMCAqIHAgKiAoIDEgLSBTICsgUyAtIChTIC8gfHB8KSApXG4gICAgICAgIFggPSAxMDAgKiBwICogKCAxIC0gKFMgLyB8cHwpIClcbiAgICAgICAgIyMjXG4gICAgICAgIFggPSAxMDAgKiBwcm9ncmVzcyAqICgxIC0gc2xpZGVTdGF0ZSAvIE1hdGguYWJzIHByb2dyZXNzKVxuICAgICAgICBpZiB0cmFuc2Zvcm1DU1NQcm9wZXJ0eVxuICAgICAgICAgIHNsaWRlRWxlbWVudC5zdHlsZVt0cmFuc2Zvcm1DU1NQcm9wZXJ0eV0gPSBcInRyYW5zbGF0ZVgoI3tYfSUpXCJcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHNsaWRlRWxlbWVudC5zdHlsZS5sZWZ0ID0gXCIje1h9JVwiXG4gICAgICBhZnRlcjogKHNsaWRlU3RhdGUsIHNsaWRlRWxlbWVudCkgLT5cbiAgICAgICAgIyMjXG4gICAgICAgIHNsaWRlU3RhdGUgaXMgZWl0aGVyIDAgb3IgMVxuICAgICAgICBpZiBzbGlkZVN0YXRlID09PSAwIHRoZW4gdGhpcyBpcyB0aGUgcHJldmlvdXNseSB2aXNpYmxlIHNsaWRlIGFuZCBpdCBtdXN0IGJlIGhpZGRlblxuICAgICAgICBpZiBzbGlkZVN0YXRlID09PSAxIHRoZW4gdGhpcyBpcyB0aGUgY3VycmVudGx5IHZpc2libGUgc2xpZGUgYW5kIGl0IG11c3QgYmUgdmlzaWJsZVxuICAgICAgICAjIyNcbiAgICAgICAgc2xpZGVFbGVtZW50LnN0eWxlLmRpc3BsYXkgPSBpZiBzbGlkZVN0YXRlID4gMCB0aGVuICdibG9jaycgZWxzZSAnbm9uZSdcblxuICBpbml0ID0gLT5cbiAgICBpbml0U2xpZGVzLmNhbGwgQFxuICAgIGluaXRFdmVudHMuY2FsbCBAXG5cbiAgaW5pdFNsaWRlcyA9IC0+XG4gICAgIyB3ZSBkb24ndCB3YW50IHRoZSBzbGlkZXMgdG8gYmUgdmlzaWJsZSBvdXRzaWRlIHRoZWlyIGNvbnRhaW5lclxuICAgIGVmZmVjdEJlZm9yZSA9IEBvcHRpb25zLmVmZmVjdC5iZWZvcmUgPyAtPlxuICAgIGVmZmVjdEFmdGVyID0gQG9wdGlvbnMuZWZmZWN0LmFmdGVyID8gLT5cbiAgICAjIGVsLmNoaWxkcmVuIG1heSBiZWhhdmUgd2VpcmQgaW4gSUU4XG4gICAgQHNsaWRlcyA9IEBlbC5jaGlsZHJlbiA/IEBlbC5jaGlsZE5vZGVzXG4gICAgQGN1cnJlbnQgPSAwXG4gICAgZm9yIHNsaWRlLCBpIGluIEBzbGlkZXMgd2hlbiBpIGlzbnQgQGN1cnJlbnRcbiAgICAgICMgY2FsbCB0aGUgYmVmb3JlIGFuZCBhZnRlciBmdW5jdGlvbnMgb25jZSBvbiBhbGwgc2xpZGVzLCBzbyBhbGwgc2xpZGVzXG4gICAgICAjIGFyZSBwb3NpdGlvbmVkIHByb3Blcmx5XG4gICAgICBpZiBpIGlzIEBjdXJyZW50XG4gICAgICAgIGVmZmVjdEJlZm9yZS5jYWxsIEAsIDAsIEBzbGlkZXNbQGN1cnJlbnRdXG4gICAgICAgIGVmZmVjdEFmdGVyLmNhbGwgQCwgMSwgQHNsaWRlc1tAY3VycmVudF1cbiAgICAgIGVsc2VcbiAgICAgICAgZWZmZWN0QmVmb3JlLmNhbGwgQCwgMSwgc2xpZGVcbiAgICAgICAgZWZmZWN0QWZ0ZXIuY2FsbCBALCAwLCBzbGlkZVxuXG4gIGluaXRFdmVudHMgPSAtPlxuICAgIEBldmVudFN0YXJ0ID0gYmluZCBldmVudFN0YXJ0LCBAXG4gICAgQGV2ZW50UHJvZ3Jlc3MgPSBiaW5kIGV2ZW50UHJvZ3Jlc3MsIEBcbiAgICBAZXZlbnRFbmQgPSBiaW5kIGV2ZW50RW5kLCBAXG4gICAgIyBjaGVjayBmb3IgVG91Y2hFdmVudCBzdXBwb3J0IGFuZCBpZiBlbmFibGVkIGluIG9wdGlvbnNcbiAgICBpZiBUb3VjaEV2ZW50PyBhbmQgQG9wdGlvbnMudG91Y2hFdmVudHNFbmFibGVkXG4gICAgICBAZWwuYWRkRXZlbnRMaXN0ZW5lciAndG91Y2hzdGFydCcsIEBldmVudFN0YXJ0XG4gICAgICBAZWwuYWRkRXZlbnRMaXN0ZW5lciAndG91Y2htb3ZlJywgQGV2ZW50UHJvZ3Jlc3NcbiAgICAgIEBlbC5hZGRFdmVudExpc3RlbmVyICd0b3VjaGVuZCcsIEBldmVudEVuZFxuICAgICMgY2hlY2sgZm9yIE1vdXNlRXZlbnQgc3VwcG9ydCBhbmQgaWYgZW5hYmxlZCBpbiBvcHRpb25zXG4gICAgaWYgTW91c2VFdmVudD8gYW5kIEBvcHRpb25zLm1vdXNlRXZlbnRzRW5hYmxlZFxuICAgICAgQGVsLmFkZEV2ZW50TGlzdGVuZXIgJ21vdXNlZG93bicsIEBldmVudFN0YXJ0XG4gICAgICBAZWwuYWRkRXZlbnRMaXN0ZW5lciAnbW91c2Vtb3ZlJywgQGV2ZW50UHJvZ3Jlc3NcbiAgICAgIEBlbC5hZGRFdmVudExpc3RlbmVyICdtb3VzZXVwJywgQGV2ZW50RW5kXG4gICAgICBAZWwuYWRkRXZlbnRMaXN0ZW5lciAnbW91c2VsZWF2ZScsIEBldmVudEVuZFxuICAgICAgZm9yIHNsaWRlIGluIEBzbGlkZXNcbiAgICAgICAgc2xpZGUuYWRkRXZlbnRMaXN0ZW5lciAnbW91c2Vkb3duJywgcHJldmVudERlZmF1bHRcbiAgICAgICAgc2xpZGUuYWRkRXZlbnRMaXN0ZW5lciAnbW91c2Vtb3ZlJywgcHJldmVudERlZmF1bHRcbiAgICAgICAgc2xpZGUuYWRkRXZlbnRMaXN0ZW5lciAnbW91c2V1cCcsIHByZXZlbnREZWZhdWx0XG5cbiAgc2V0Q3VycmVudFNsaWRlID0gKHNsaWRlKSAtPlxuICAgICMgc2V0IEBjdXJyZW50IHRvIHNsaWRlJ3MgaW5kZXggaW4gQHNsaWRlc1xuICAgIEBjdXJyZW50ID0gaW5kZXhPZiBAc2xpZGVzLCBzbGlkZVxuXG4gIGFuaW1hdGVTbGlkZXMgPSAoY3VycmVudFNsaWRlLCB0YXJnZXRTbGlkZSwge2RpcmVjdGlvbiwgaW5pdGlhbFByb2dyZXNzLCBkdXJhdGlvbk1vZH0sIGNhbGxiYWNrKSAtPlxuICAgICMgcmV0dXJuIGlmIGFuIGFuaW1hdGlvbiBpcyBpbiBwcm9ncmVzc1xuICAgIHJldHVybiBpZiBAY3VycmVudEFuaW1hdGlvbj9cbiAgICAjIGNhbGwgb25XaWxsQ2hhbmdlXG4gICAgQG9wdGlvbnMub25XaWxsQ2hhbmdlPy5jYWxsIEAsIGN1cnJlbnRTbGlkZSwgdGFyZ2V0U2xpZGUsIChAY3VycmVudCArIDEpICUgQGNoaWxkcmVuLmxlbmd0aFxuICAgICMgcHJvZ3Jlc3MgYW5kIGR1cmF0aW9uTW9kIGFyZSBvbmx5IHBhc3NlZCBmcm9tIGEgdG91Y2ggZXZlbnRcbiAgICBwcm9ncmVzcyA9IGluaXRpYWxQcm9ncmVzcyA/IDBcbiAgICBkdXJhdGlvbk1vZCA/PSAxXG4gICAgIyBhbHRlciB0aGUgZHVyYXRpb24gb2YgdGhlIGFuaW1hdGlvbiBhZnRlciBhIHRvdWNoIGV2ZW50XG4gICAgZHVyYXRpb24gPSBNYXRoLm1heCAxLCBAb3B0aW9ucy5hbmltYXRpb25EdXJhdGlvbiAqICgxIC0gcHJvZ3Jlc3MpICogZHVyYXRpb25Nb2RcbiAgICAjIHNsaWRlcyBzaG91bGRuJ3QgYmUgcHJlcGFyZWQgaWYgdGhpcyBpcyBjYWxsZWQgZnJvbSBhIHRvdWNoIGV2ZW50XG4gICAgIyBiZWNhdXNlIHRoaXMgaGFzIGFscmVhZHkgaGFwcGVuZWQgaW4gdG91Y2hTdGFydFxuICAgIHVubGVzcyBAY3VycmVudEV2ZW50P1xuICAgICAgZWZmZWN0QmVmb3JlID0gQG9wdGlvbnMuZWZmZWN0LmJlZm9yZSA/IC0+XG4gICAgICBlZmZlY3RCZWZvcmUuY2FsbCBALCAwLCBjdXJyZW50U2xpZGVcbiAgICAgIGVmZmVjdEJlZm9yZS5jYWxsIEAsIChpZiBkaXJlY3Rpb24gPCAwIHRoZW4gMSBlbHNlIC0xKSwgdGFyZ2V0U2xpZGVcbiAgICAjIGNhY2hlIHRoZSBhbmltYXRpb24gc3RhdGVcbiAgICBAY3VycmVudEFuaW1hdGlvbiA9IHtzdGFydDogbm93KCksIGN1cnJlbnRTbGlkZSwgdGFyZ2V0U2xpZGUsIGRpcmVjdGlvbiwgZHVyYXRpb24sIHByb2dyZXNzLCBjYWxsYmFja31cbiAgICAjIGFuZCBmaW5hbGx5IHN0YXJ0IGFuaW1hdGluZ1xuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSBiaW5kIG5leHRGcmFtZSwgQFxuXG4gIG5leHRGcmFtZSA9ICh0aW1lc3RhbXApIC0+XG4gICAgIyBpbW1lZGlhdGVseSBjYWxsIHRoZSBuZXh0IHJlcXVlc3RBbmltYXRpb25GcmFtZVxuICAgIGlkID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lIGJpbmQgbmV4dEZyYW1lLCBAXG4gICAgYW5pbSA9IEBjdXJyZW50QW5pbWF0aW9uXG4gICAge3N0YXJ0LCBwcm9ncmVzcywgZHVyYXRpb24sIGRpcmVjdGlvbiwgY3VycmVudFNsaWRlLCB0YXJnZXRTbGlkZSwgY2FsbGJhY2t9ID0gQGN1cnJlbnRBbmltYXRpb25cbiAgICAjIGNhbGN1bGF0ZSB0aGUgYWN0dWFsIHByb2dyZXNzIChmcmFjdGlvbiBvZiB0aGUgYW5pbWF0aW9uRHVyYXRpb24pXG4gICAgcHJvZ3Jlc3MgPSBwcm9ncmVzcyArIChub3coKSAtIHN0YXJ0KSAvIGR1cmF0aW9uICogKDEgLSBwcm9ncmVzcylcbiAgICBpZiBwcm9ncmVzcyA+PSAxXG4gICAgICBwcm9ncmVzcyA9IDFcbiAgICAgICMgdGhlIGFuaW1hdGlvbiBoYXMgZW5kZWRcbiAgICAgIEBjdXJyZW50QW5pbWF0aW9uID0gbnVsbFxuICAgICAgY2FuY2VsQW5pbWF0aW9uRnJhbWUgaWRcbiAgICAgICMgY2FsbCB0aGUgYWZ0ZXIgYW5kIGNhbGxiYWNrIGZ1bmN0aW9uc1xuICAgICAgZWZmZWN0QWZ0ZXIgPSBAb3B0aW9ucy5lZmZlY3QuYWZ0ZXIgPyAtPlxuICAgICAgZWZmZWN0QWZ0ZXIuY2FsbCBALCAwLCBjdXJyZW50U2xpZGVcbiAgICAgIGVmZmVjdEFmdGVyLmNhbGwgQCwgMSwgdGFyZ2V0U2xpZGVcbiAgICAgICMgc2V0IHRoZSBuZXcgY3VycmVudFNsaWRlXG4gICAgICBzZXRDdXJyZW50U2xpZGUuY2FsbCBALCB0YXJnZXRTbGlkZVxuICAgICAgY2FsbGJhY2s/LmNhbGwgQCwgY3VycmVudFNsaWRlLCB0YXJnZXRTbGlkZSwgQGN1cnJlbnRcbiAgICAgIEBvcHRpb25zLm9uRGlkQ2hhbmdlPy5jYWxsIEAsIGN1cnJlbnRTbGlkZSwgdGFyZ2V0U2xpZGUsIEBjdXJyZW50XG4gICAgICBzZXRDdXJyZW50U2xpZGUuY2FsbCBALCB0YXJnZXRTbGlkZVxuICAgICMgY2FsbCB0aGUgcHJvZ3Jlc3MgZnVuY3Rpb25zXG4gICAgZWZmZWN0UHJvZ3Jlc3MgPSBAb3B0aW9ucy5lZmZlY3QucHJvZ3Jlc3MgPyAtPlxuICAgIGVmZmVjdFByb2dyZXNzLmNhbGwgQCwgMCwgcHJvZ3Jlc3MgKiBkaXJlY3Rpb24sIGN1cnJlbnRTbGlkZVxuICAgIGVmZmVjdFByb2dyZXNzLmNhbGwgQCwgMSwgcHJvZ3Jlc3MgKiBkaXJlY3Rpb24sIHRhcmdldFNsaWRlXG5cbiAgZXZlbnRTdGFydCA9IChldmVudCkgLT5cbiAgICBpZiBAb3B0aW9ucy5wcmV2ZW50RGVmYXVsdEV2ZW50c1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKVxuICAgICMgZG8gbm90aGluZyBpZiBhbiBhbmltYXRpb24gb3IgdG91Y2ggZXZlbnQgaXMgY3VycmVudGx5IGluIHByb2dyZXNzXG4gICAgcmV0dXJuIGlmIEBjdXJyZW50QW5pbWF0aW9uPyBvciBAY3VycmVudEV2ZW50P1xuICAgICMgZ2V0IHRoZSByZWxldmFudCBzbGlkZXNcbiAgICBjdXJyZW50U2xpZGUgPSBAZ2V0Q3VycmVudFNsaWRlKClcbiAgICBwcmV2U2xpZGUgPSBAZ2V0UHJldlNsaWRlKClcbiAgICBuZXh0U2xpZGUgPSBAZ2V0TmV4dFNsaWRlKClcbiAgICAjIHByZXBhcmUgdGhlIHNsaWRlcyB0byBiZSBhbmltYXRlZFxuICAgIGVmZmVjdEJlZm9yZSA9IEBvcHRpb25zLmVmZmVjdC5iZWZvcmUgPyAtPlxuICAgIGVmZmVjdEJlZm9yZS5jYWxsIEAsIDAsIGN1cnJlbnRTbGlkZVxuICAgIGVmZmVjdEJlZm9yZS5jYWxsIEAsIC0xLCBwcmV2U2xpZGVcbiAgICBlZmZlY3RCZWZvcmUuY2FsbCBALCAxLCBuZXh0U2xpZGVcbiAgICAjIGNhY2hlIHRoZSB0b3VjaCBldmVudCBzdGF0ZVxuICAgIHt0aW1lU3RhbXB9ID0gZXZlbnRcbiAgICB7cGFnZVgsIHBhZ2VZfSA9IGV2ZW50LnRvdWNoZXM/WzBdID8gZXZlbnRcbiAgICBAY3VycmVudEV2ZW50ID0ge2N1cnJlbnRTbGlkZSwgcHJldlNsaWRlLCBuZXh0U2xpZGUsIHRpbWVTdGFtcCwgcGFnZVgsIHBhZ2VZfVxuXG4gIGV2ZW50UHJvZ3Jlc3MgPSAoZXZlbnQpIC0+XG4gICAgaWYgQG9wdGlvbnMucHJldmVudERlZmF1bHRFdmVudHNcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KClcbiAgICAjIGRvIG5vdGhpbmcgaWYgYW4gYW5pbWF0aW9uIGlzIGluIHByb2dyZXNzLCBvciB0aGVyZSdzIG5vIHRvdWNoIGV2ZW50IGluIHByb2dyZXNzIHlldCAod2hpY2ggc291bGRuJ3QgaGFwcGVuKVxuICAgIHJldHVybiBpZiBAY3VycmVudEFuaW1hdGlvbiBvciBub3QgQGN1cnJlbnRFdmVudD9cbiAgICAjIGNhbGN1bGF0ZSB0aGUgcHJvZ3Jlc3MgYmFzZWQgb24gdGhlIGRpc3RhbmNlIHRvdWNoZWRcbiAgICB7cGFnZVgsIHBhZ2VZfSA9IGV2ZW50LnRvdWNoZXM/WzBdID8gZXZlbnRcbiAgICBwcm9ncmVzcyA9IHN3aXRjaCBAb3B0aW9ucy5hbmltYXRpb25EaXJlY3Rpb25cbiAgICAgIHdoZW4gJ3gnIHRoZW4gKHBhZ2VYIC0gQGN1cnJlbnRFdmVudC5wYWdlWCkgLyBAZWwuY2xpZW50V2lkdGhcbiAgICAgIHdoZW4gJ3knIHRoZW4gKHBhZ2VZIC0gQGN1cnJlbnRFdmVudC5wYWdlWSkgLyBAZWwuY2xpZW50SGVpZ2h0XG4gICAgIyBhbmltYXRlIHRoZSBzbGlkZVxuICAgIHRhcmdldFNsaWRlID0gaWYgcHJvZ3Jlc3MgPCAwIHRoZW4gQGN1cnJlbnRFdmVudC5uZXh0U2xpZGUgZWxzZSBAY3VycmVudEV2ZW50LnByZXZTbGlkZVxuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSA9PlxuICAgICAgZWZmZWN0UHJvZ3Jlc3MgPSBAb3B0aW9ucy5lZmZlY3QucHJvZ3Jlc3MgPyAtPlxuICAgICAgZWZmZWN0UHJvZ3Jlc3MuY2FsbCBALCAwLCBwcm9ncmVzcywgQGN1cnJlbnRFdmVudC5jdXJyZW50U2xpZGVcbiAgICAgIGVmZmVjdFByb2dyZXNzLmNhbGwgQCwgMSwgcHJvZ3Jlc3MsIHRhcmdldFNsaWRlXG5cbiAgZXZlbnRFbmQgPSAoZXZlbnQpIC0+XG4gICAgaWYgQG9wdGlvbnMucHJldmVudERlZmF1bHRFdmVudHNcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KClcbiAgICAjIGRvIG5vdGhpbmcgaWYgYW4gYW5pbWF0aW9uIGlzIGluIHByb2dyZXNzLCBvciB0aGVyZSdzIG5vIHRvdWNoIGV2ZW50IGluIHByb2dyZXNzIHlldCAod2hpY2ggc291bGRuJ3QgaGFwcGVuKVxuICAgIHJldHVybiBpZiBAY3VycmVudEFuaW1hdGlvbiBvciBub3QgQGN1cnJlbnRFdmVudD9cbiAgICB7dGltZVN0YW1wfSA9IGV2ZW50XG4gICAge3BhZ2VYLCBwYWdlWX0gPSBldmVudC5jaGFuZ2VkVG91Y2hlcz9bMF0gPyBldmVudFxuICAgICMgY2FsY3VsYXRlIHRoZSBmaW5hbCBwcm9ncmVzcyB0aGF0IGhhcyBiZWVuIG1hZGVcbiAgICBwcm9ncmVzcyA9IHN3aXRjaCBAb3B0aW9ucy5hbmltYXRpb25EaXJlY3Rpb25cbiAgICAgIHdoZW4gJ3gnIHRoZW4gKHBhZ2VYIC0gQGN1cnJlbnRFdmVudC5wYWdlWCkgLyBAZWwuY2xpZW50V2lkdGhcbiAgICAgIHdoZW4gJ3knIHRoZW4gKHBhZ2VZIC0gQGN1cnJlbnRFdmVudC5wYWdlWSkgLyBAZWwuY2xpZW50SGVpZ2h0XG4gICAgaWYgcHJvZ3Jlc3MgaXMgMFxuICAgICAgQGN1cnJlbnRFdmVudCA9IG51bGxcbiAgICAgIHJldHVyblxuICAgICMgY2FsY3VsYXRlIHRoZSB0aW1lIHBhc3NlZFxuICAgIHRpbWVQYXNzZWQgPSB0aW1lU3RhbXAgLSBAY3VycmVudEV2ZW50LnRpbWVTdGFtcFxuICAgIHByb2dyZXNzQWJzID0gTWF0aC5hYnMgcHJvZ3Jlc3NcbiAgICAjIGNoZWNrIHByb2dyZXNzIGFuZCB0aW1lUGFzc2VkIGFnYWluc3QgdGhlIGNvbmRpdGlvbnNcbiAgICBmb3IgY29uZGl0aW9uIGluIEBvcHRpb25zLmVmZmVjdC5jb25kaXRpb25zXG4gICAgICBpZiBwcm9ncmVzc0FicyA+IGNvbmRpdGlvbi5wcm9ncmVzcyBhbmQgdGltZVBhc3NlZCA8IChjb25kaXRpb24udGltZSA/IEluZmluaXR5KVxuICAgICAgICAjIG9uZSBjb25kaXRpb24gcGFzc2VkIHNvIHNldCBkdXJhdGlvbk1vZCBmcm9tIHRoYXQgY29uZGl0aW9uXG4gICAgICAgIGR1cmF0aW9uTW9kID0gY29uZGl0aW9uLmR1cmF0aW9uTW9kaWZpZXIgPyAxXG4gICAgICAgIGJyZWFrXG4gICAgIyBhdCB0aGlzIHBvaW50LCBkdXJhdGlvbk1vZCBpcyBvbmx5IHNldCBpZiB3ZSBtYXRjaGVkIGEgY29uZGl0aW9uXG4gICAgIyBzbyBzbGlkZSB0byB0aGUgbmV4dCBzbGlkZVxuICAgIGlmIGR1cmF0aW9uTW9kP1xuICAgICAgIyB3ZSBtYXRjaGVkIGEgY29uZGl0aW9uLCBzbyBzbGlkZSBhd2F5IHRoZSBjdXJyZW50U2xpZGUgYW5kIHNsaWRlIGluXG4gICAgICAjIHRoZSB0YXJnZXRTbGlkZS4gaWYgd2Ugc2xpZGVkIHRvIHRoZSBsZWZ0LCB0aGUgbmV4dFNsaWRlIHdpbGwgYmUgdGhlXG4gICAgICAjIHRhcmdldFNsaWRlLCBlbHNlIHRoZSBwcmV2U2xpZGUgd2lsbCBiZS5cbiAgICAgIGN1cnJlbnRTbGlkZSA9IEBjdXJyZW50RXZlbnQuY3VycmVudFNsaWRlXG4gICAgICBkaXJlY3Rpb24gPSBwcm9ncmVzcyAvIHByb2dyZXNzQWJzXG4gICAgICBpZiBkaXJlY3Rpb24gaXMgMVxuICAgICAgICB0YXJnZXRTbGlkZSA9IEBjdXJyZW50RXZlbnQucHJldlNsaWRlXG4gICAgICBlbHNlXG4gICAgICAgIHRhcmdldFNsaWRlID0gQGN1cnJlbnRFdmVudC5uZXh0U2xpZGVcbiAgICAgIGluaXRpYWxQcm9ncmVzcyA9IHByb2dyZXNzQWJzXG4gICAgZWxzZVxuICAgICAgIyB3ZSBkaWRuJ3QgbWF0Y2ggYSBjb25kaXRpb24sIHNvIHNsaWRlIHRoZSBjdXJyZW50U2xpZGUgYmFjayBpbnRvXG4gICAgICAjIHBvc2l0aW9uIGFuZCBzbGlkZSB0YXJnZXRTbGlkZSAobmV4dFNsaWRlIG9yIHByZXZTbGlkZSwgZGVwZW5kaW5nIG9uXG4gICAgICAjIHNsaWRlIGRpcmVjdGlvbikgYXdheVxuICAgICAgdGFyZ2V0U2xpZGUgPSBAY3VycmVudEV2ZW50LmN1cnJlbnRTbGlkZVxuICAgICAgZGlyZWN0aW9uID0gLXByb2dyZXNzIC8gcHJvZ3Jlc3NBYnNcbiAgICAgIGlmIGRpcmVjdGlvbiBpcyAxXG4gICAgICAgIGN1cnJlbnRTbGlkZSA9IEBjdXJyZW50RXZlbnQubmV4dFNsaWRlXG4gICAgICBlbHNlXG4gICAgICAgIGN1cnJlbnRTbGlkZSA9IEBjdXJyZW50RXZlbnQucHJldlNsaWRlXG4gICAgICBpbml0aWFsUHJvZ3Jlc3MgPSAxIC0gcHJvZ3Jlc3NBYnNcbiAgICAjIGNhbGwgdGhlIGFuaW1hdGVTbGlkZXMgZnVuY3Rpb24gd2l0aCB0aGUgcGFyYW1ldGVyc1xuICAgIGFuaW1hdGVTbGlkZXMuY2FsbCBALCBjdXJyZW50U2xpZGUsIHRhcmdldFNsaWRlLCB7ZGlyZWN0aW9uLCBpbml0aWFsUHJvZ3Jlc3MsIGR1cmF0aW9uTW9kfSwgPT5cbiAgICAgIEBjdXJyZW50RXZlbnQgPSBudWxsXG5cbiAgcHJldmVudERlZmF1bHQgPSAoZXZlbnQpIC0+XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKVxuXG4gICMgZW5kIHByaXZhdGUgQVBJXG5cbiAgIyBwdWJsaWMgQVBJXG5cbiAgIyBnZXQqU2xpZGUgYWxsIHJldHVybiBhbiBIVE1MRWxlbWVudFxuXG4gICMgZ2V0IHRoZSBzbGlkZSBhdCBpbmRleCBpXG4gICMgZ2V0U2xpZGUoLTEpID09PSBnZXRTbGlkZShzbGlkZXMubGVuZ3RoIC0gMSlcbiAgIyBhbmQgZ2V0U2xpZGUoc2xpZGVzLmxlbmd0aCkgPT09IGdldFNsaWRlKDApXG4gIGdldFNsaWRlOiAoaSkgLT5cbiAgICBpID0gaSAlIEBzbGlkZXMubGVuZ3RoXG4gICAgaWYgaSA8IDAgdGhlbiBpICs9IEBzbGlkZXMubGVuZ3RoXG4gICAgQHNsaWRlc1tpXVxuXG4gICMgZ2V0IHRoZSBjdXJyZW50bHkgdmlzaWJsZSBzbGlkZVxuICBnZXRDdXJyZW50U2xpZGU6IC0+IEBzbGlkZXNbQGN1cnJlbnRdXG5cbiAgZ2V0Q3VycmVudEluZGV4OiAtPiBAY3VycmVudFxuXG4gICMgZ2V0IHRoZSBzbGlkZSBhZnRlciB0aGUgY3VycmVudGx5IHZpc2libGUgb25lXG4gIGdldE5leHRTbGlkZTogLT4gQGdldFNsaWRlIEBjdXJyZW50ICsgMVxuXG4gICMgZ2V0IHRoZSBzbGlkZSBiZWZvcmUgdGhlIGN1cnJlbnRseSB2aXNpYmxlIG9uZVxuICBnZXRQcmV2U2xpZGU6IC0+IEBnZXRTbGlkZSBAY3VycmVudCAtIDFcblxuICAjIGdldCB0aGUgZmlyc3Qgc2xpZGVcbiAgZ2V0Rmlyc3RTbGlkZTogLT4gQHNsaWRlc1swXVxuXG4gICMgZ2V0IHRoZSBsYXN0IHNsaWRlXG4gIGdldExhc3RTbGlkZTogLT4gQHNsaWRlc1tAc2xpZGVzLmxlbmd0aCAtIDFdXG5cbiAgIyBnb1RvKiBpbml0aWF0ZXMgYW4gYW5pbWF0aW9uXG5cbiAgIyBnbyB0byB0aGUgc2xpZGUgYXQgaW5kZXggaVxuICBnb1RvOiAoaSwgY2IpIC0+XG4gICAgcmV0dXJuIGlmIGkgaXMgQGN1cnJlbnRcbiAgICBjdXJyZW50U2xpZGUgPSBAZ2V0Q3VycmVudFNsaWRlKClcbiAgICB0YXJnZXRTbGlkZSA9IEBnZXRTbGlkZSBpXG4gICAgIyBzbGlkZSB0byBsZWZ0IGlmIGkgPCBAY3VycmVudCwgZWxzZSBzbGlkZSB0byByaWdodFxuICAgIGRpcmVjdGlvbiA9IGlmIGkgPCBAY3VycmVudCB0aGVuIDEgZWxzZSAtMVxuICAgIGFuaW1hdGVTbGlkZXMuY2FsbCBALCBjdXJyZW50U2xpZGUsIHRhcmdldFNsaWRlLCB7ZGlyZWN0aW9ufSwgY2JcblxuICAjIGdvIHRvIHRoZSBuZXh0IHNsaWRlXG4gIGdvVG9OZXh0OiAoY2IpIC0+IEBnb1RvIEBjdXJyZW50ICsgMSwgY2JcblxuICAjIGdvIHRvIHRoZSBwcmV2aW91cyBzbGlkZVxuICBnb1RvUHJldjogKGNiKSAtPiBAZ29UbyBAY3VycmVudCAtIDEsIGNiXG5cbiAgIyBnbyB0byBmaXJzdCBzbGlkZVxuICBnb1RvRmlyc3Q6IChjYikgLT4gQGdvVG8gMCwgY2JcblxuICAjIGdvIHRvIGxhc3Qgc2xpZGVcbiAgZ29Ub0xhc3Q6IChjYikgLT4gQGdvVG8gQHNsaWRlcy5sZW5ndGggLSAxLCBjYlxuXG4gICMgZGVzdHJveSB0aGlzIGluc3RhbmNlXG4gIGRlc3Ryb3k6IC0+XG4gICAgQGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIgJ3RvdWNoc3RhcnQnLCBAZXZlbnRTdGFydFxuICAgIEBlbC5yZW1vdmVFdmVudExpc3RlbmVyICd0b3VjaG1vdmUnLCBAZXZlbnRQcm9ncmVzc1xuICAgIEBlbC5yZW1vdmVFdmVudExpc3RlbmVyICd0b3VjaGVuZCcsIEBldmVudEVuZFxuICAgIEBlbC5yZW1vdmVFdmVudExpc3RlbmVyICdtb3VzZWRvd24nLCBAZXZlbnRTdGFydFxuICAgIEBlbC5yZW1vdmVFdmVudExpc3RlbmVyICdtb3VzZW1vdmUnLCBAZXZlbnRQcm9ncmVzc1xuICAgIEBlbC5yZW1vdmVFdmVudExpc3RlbmVyICdtb3VzZXVwJywgQGV2ZW50RW5kXG4gICAgQGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIgJ21vdXNlbGVhdmUnLCBAZXZlbnRFbmRcbiAgICBmb3Igc2xpZGUgaW4gQHNsaWRlc1xuICAgICAgc2xpZGUucmVtb3ZlRXZlbnRMaXN0ZW5lciAnbW91c2Vkb3duJywgcHJldmVudERlZmF1bHRcbiAgICAgIHNsaWRlLnJlbW92ZUV2ZW50TGlzdGVuZXIgJ21vdXNlbW92ZScsIHByZXZlbnREZWZhdWx0XG4gICAgICBzbGlkZS5yZW1vdmVFdmVudExpc3RlbmVyICdtb3VzZXVwJywgcHJldmVudERlZmF1bHRcbiAgICB7QGVsLCBAc2xpZGVzLCBAZXZlbnRTdGFydCwgQGV2ZW50UHJvZ3Jlc3MsIEBldmVudEVuZCwgQG9wdGlvbnN9ID0ge31cblxuICAjIGNsYXNzIG1ldGhvZHNcblxuICBAcmVnaXN0ZXJBc0pRdWVyeVBsdWdpbjogKGpRdWVyeSwgbWV0aG9kTmFtZSA9ICdTbGlkZXNob3cnKSAtPlxuICAgIGpRdWVyeS5mblttZXRob2ROYW1lXSA9IChvcHRpb25zKSAtPiAobmV3IFNsaWRlc2hvdyBjb250YWluZXIsIG9wdGlvbnMgZm9yIGNvbnRhaW5lciBpbiBAKVxuXG4gIEByZWdpc3RlckVmZmVjdDogKG5hbWUsIGVmZmVjdCkgLT5cbiAgICBlZmZlY3QuY29uZGl0aW9ucyA/PSBlZmZlY3RzLmRlZmF1bHQuY29uZGl0aW9ucy5jb25jYXQoKVxuICAgIGVmZmVjdHNbbmFtZV0gPz0gZWZmZWN0XG5cbiMgYW1kLCBjb21tb25qcyBhbmQgYnJvd3NlciBlbnZpcm9ubWVudCBzdXBwb3J0XG5kbyAocm9vdCA9IHRoaXMpIC0+XG4gICMgYW1kXG4gIGlmIHR5cGVvZiBkZWZpbmUgaXMgJ2Z1bmN0aW9uJyBhbmQgZGVmaW5lLmFtZFxuICAgIGRlZmluZSBbXSwgLT4gU2xpZGVzaG93XG4gICMgY29tbW9uanNcbiAgZWxzZSBpZiB0eXBlb2YgZXhwb3J0cyBpc250ICd1bmRlZmluZWQnXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBTbGlkZXNob3dcbiAgIyBicm93c2VyXG4gIGVsc2VcbiAgICByb290LlNsaWRlc2hvdyA9IFNsaWRlc2hvd1xuIl19