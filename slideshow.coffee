# out: slideshow.js
'use strict'
# requestAnimationFrame polyfill
# http://paulirish.com/2011/requestanimationframe-for-smart-animating/
# http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating

# requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel

# MIT license

do (root = window ? this) ->
  lastTime = 0
  vendors = ['ms', 'moz', 'webkit', 'o']
  i = 0
  while i < vendors.length and not root.requestAnimationFrame
    vendor = vendors[i++]
    root.requestAnimationFrame = root["#{vendor}RequestAnimationFrame"]
    root.cancelAnimationFrame = root["#{vendor}CancelAnimationFrame"] ? root["#{vendor}CancelRequestAnimationFrame"]

  unless root.requestAnimationFrame?
    root.requestAnimationFrame = (callback) ->
      currTime = new Date().getTime()
      timeToCall = Math.max 0, 16 - (currTime - lastTime)
      id = root.setTimeout (-> callback currTime + timeToCall), timeToCall
      lastTime = currTime + timeToCall
      id

  unless root.cancelAnimationFrame?
    root.cancelAnimationFrame = (id) ->
      clearTimeout id

# end requestAnimationFrame polyfill

# functions stolen from underscore and translated to coffee-script
# Underscore.js 1.7.0
# http://underscorejs.org
# (c) 2009-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
# Underscore may be freely distributed under the MIT license.

isArray = do (root = window ? this) -> root.Array.isArray ? (obj) -> Object::toString.call(obj) is '[object Array]'

isNaN = do (root = window ? this) -> root.isNaN ? (obj) -> isNumber obj and obj isnt +obj

isNumber = (obj) -> Object::toString.call(obj) is '[object Number]'

isObject = (obj) -> (type = typeof obj) is 'object' or type is 'function'

extend = (target, objects...) ->
  return unless isObject target
  for object in objects
    for own prop of object
      target[prop] = object[prop]
  target

# end functions stolen from underscore

# Function::bind polyfill (simplified, without partial filling)

Function::bind ?= (context) -> => @apply context, [].slice.call arguments

# end bind

# vendorPrefix returns vendor prefixed css property (e.g. prefix('transform') -> 'webkitTransform')

prefix = do (root = window ? this) ->
  prefixes = {}

  (prop) ->
    return prefixes[prop] if prop of prefixes
    style = root.document.createElement('div').style
    return prefixes[prop] = prop if prop of style
    prop = prop.charAt(0).toUpperCase() + prop[1..]
    for vendor in ['moz', 'webkit', 'khtml', 'o', 'ms']
      prefixed = "#{vendor}#{prop}"
      return prefixes[prop] = prefixed if prefixed of style
    false

# end vendorPrefix

factory = (document) ->
  class Slideshow
    constructor: (element, opts) ->
      if isArray element then return (new Slideshow el, opts for el in element)
      unless element instanceof HTMLElement
        if element[0] then element = element[0] #jQuery
      unless element instanceof HTMLElement then throw new Error 'No slideshow element provided'
      @opts = extend {}, defaults, opts
      @el = element
      init.call @

    # private methods and variables

    defaults =
      touchEnabled: true
      preventScroll: true
      animationDuration: 400
      conditions: [
        distance: .1
        time: 250
        durationMod: .5
      ,
        distance: .3
        time: 500
      ,
        distance: .5
      ]
      effect:
        before: (slideState, slideElement) ->
          slideElement.style.display = 'block'
          ###
          slideState  is either -1, 0 or 1
          if slideState === 0 then this is the current slide and we want to show it, so set translateX(0)
          if slideState === -1 then this is the previous slide (to the left) so translateX(-100%)
          if slideState === 1 then this is the next slide (to the right) so translateX(100%)
          ###
          transform = prefix 'transform'
          X = -slideState * 100
          if transform
            slideElement.style[transform] = "translateX(#{X}%)"
          else
            slideElement.style.left = "#{X}%"
        progress: (slideState, progress, slideElement) ->
          ###
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
          ###
          transform = prefix 'transform'
          X = 100 * progress * (1 - slideState / Math.abs progress)
          if transform
            slideElement.style[transform] = "translateX(#{X}%)"
          else
            slideElement.style.left = "#{X}%"
        after: (slideState, slideElement) ->
          ###
          slideState is either 0 or 1
          if slideState === 0 then this is the previously visible slide and it must be hidden
          if slideState === 1 then this is the currently visible slide and it must be visible
          ###
          slideElement.style.display = if slideState > 0 then 'block' else 'none'

    init = ->
      initSlides.call @
      initTouchEvents.call @

    initSlides = ->
      @el.className += ' slideshow-container'
      @el.style.overflow = 'hidden'
      beforeFn = @opts.effect.before
      afterFn = @opts.effect.after
      for slide in @el.children
        beforeFn?.call @, 1, slide
        afterFn?.call @, 0, slide
      @slides = @el.children
      @current = 0
      beforeFn?.call @, 0, @slides[@current]
      afterFn?.call @, 1, @slides[@current]

    initTouchEvents = ->
      # return unless TouchEvent is supported and it is not explicitly disabled
      return unless @touchEnabled = @opts.touchEnabled and TouchEvent?
      @el.addEventListener 'touchstart', (e) => touchstart.call @, e
      @el.addEventListener 'touchmove', (e) => touchmove.call @, e
      @el.addEventListener 'touchend', (e) => touchend.call @, e

    setCurrentSlide = (slide) ->
      @current = [].indexOf.call @slides, slide

    animateSlides = (currentSlide, targetSlide, {direction, progress, durationMod}, callback) ->
      return if @currentAnimation?
      progress ?= 0
      durationMod ?= 1
      duration = Math.max 1, @opts.animationDuration * (1 - progress) * durationMod
      unless @currentTouchEvent?
        beforeFn = @opts.effect.before
        beforeFn?.call @, 0, currentSlide
        beforeFn?.call @, (if direction < 0 then 1 else -1), targetSlide
      @currentAnimation = {animationStart: new Date().getTime(), currentSlide, targetSlide, direction, duration, progress, callback}
      requestAnimationFrame nextFrame.bind @

    nextFrame = (timestamp) ->
      id = requestAnimationFrame nextFrame.bind @
      anim = @currentAnimation
      progress = Math.min 1, anim.progress + (new Date().getTime() - anim.animationStart) / anim.duration * (1 - anim.progress)
      progressFn = @opts.effect.progress
      progressFn?.call @, 0, progress * anim.direction, anim.currentSlide
      progressFn?.call @, 1, progress * anim.direction, anim.targetSlide
      if progress is 1
        @currentAnimation = null
        cancelAnimationFrame id
        afterFn = @opts.effect.after
        afterFn?.call @, 0, anim.currentSlide
        afterFn?.call @, 1, anim.targetSlide
        anim.callback?()
        setCurrentSlide.call @, anim.targetSlide

    touchstart = (event) ->
      return if @currentAnimation? or @currentTouchEvent?
      currentSlide = @getCurrentSlide()
      prevSlide = @getPrevSlide()
      nextSlide = @getNextSlide()
      beforeFn = @opts.effect.before
      beforeFn?.call @, 0, currentSlide
      beforeFn?.call @, -1, prevSlide
      beforeFn?.call @, 1, nextSlide
      @currentTouchEvent = {currentSlide, prevSlide, nextSlide, touchStart: event.timeStamp, touchX: event.touches[0].pageX, touchY: event.touches[0].pageY}
      event.preventDefault() if @opts.preventScroll

    touchmove = (event) ->
      return if @currentAnimation or not @currentTouchEvent?
      touch = @currentTouchEvent
      progress = (event.touches[0].pageX - touch.touchX) / @el.clientWidth
      requestAnimationFrame =>
        progressFn = @opts.effect.progress
        progressFn.call @, 0, progress, touch.currentSlide
        progressFn.call @, 1, progress, if progress < 0 then touch.nextSlide else touch.prevSlide
      event.preventDefault() if @opts.preventScroll

    touchend = (event) ->
      return if @currentAnimation or not @currentTouchEvent?
      touch = @currentTouchEvent
      @currentTouchEvent = null
      progress = (event.changedTouches[0].pageX - touch.touchX) / @el.clientWidth
      timePassed = event.timeStamp - touch.touchStart
      progressAbs = Math.abs progress
      for cond in @opts.conditions
        if progressAbs > cond.distance and timePassed < (cond.time ? Infinity)
          durationMod = cond.durationMod ? 1
          break
      # at this point, durationMod is only set if we matched a condition
      if durationMod?
        # we matched a condition, so slide away the currentSlide and slide in
        # the targetSlide. if we slided to the left, the nextSlide will be the
        # targetSlide, else the prevSlide will be.
        currentSlide = touch.currentSlide
        if progress < 0
          direction = -1
          targetSlide = touch.nextSlide
        else
          direction = 1
          targetSlide = touch.prevSlide
        progress = progressAbs
      else
        # we didn't match a condition, so slide the currentSlide back into
        # position and slide targetSlide (nextSlide or prevSlide, depending on
        # slide direction) away
        targetSlide = touch.currentSlide
        if progress < 0
          direction = 1
          currentSlide = touch.nextSlide
        else
          direction = -1
          currentSlide = touch.prevSlide
        progress = 1 - progressAbs
      animateSlides.call @, currentSlide, targetSlide, {direction, progress, durationMod}
      event.preventDefault() if @opts.preventScroll

    # end private methods

    # public methods

    getSlide: (i) ->
      i = i % @slides.length
      if i < 0 then i += @slides.length
      @slides[i]

    getCurrentSlide: ->
      @slides[@current]

    getNextSlide: ->
      target = (@current + 1) % @slides.length
      @slides[target]

    getPrevSlide: ->
      target = @current - 1
      if target < 0 then target = @slides.length - 1
      @slides[target]

    getFirstSlide: ->
      @slides[0]

    getLastSlide: ->
      @slides[@slides.length - 1]

    slideTo: (i, cb) ->
      return if i is @current
      currentSlide = @getCurrentSlide()
      targetSlide = @getSlide i
      direction = if i < @current then 1 else -1
      animateSlides.call @, currentSlide, targetSlide, {direction}, cb

    nextSlide: (cb) ->
      currentSlide = @getCurrentSlide()
      nextSlide = @getNextSlide()
      direction = -1
      animateSlides.call @, currentSlide, nextSlide, {direction}, cb

    prevSlide: (cb) ->
      currentSlide = @getCurrentSlide()
      prevSlide = @getPrevSlide()
      direction = 1
      animateSlides.call @, currentSlide, prevSlide, {direction}, cb

do (root = this, factory) ->
  Slideshow = factory root.document
  if typeof define is 'function' and define.amd
    define [], -> Slideshow
  else if typeof exports isnt 'undefined'
    module.exports = Slideshow
  else
    root.Slideshow = Slideshow