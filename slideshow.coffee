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

isNaN = isNaN ? (obj) -> isNumber obj and obj isnt +obj

isNumber = (obj) -> Object::toString.call(obj) is '[object Number]'

isObject = (obj) -> (type = typeof obj) is 'object' or type is 'function'

extend = (target, objects...) ->
  return unless isObject target
  for object in objects
    for own prop of object
      target[prop] = object[prop]
  target

indexOf = (array, match) ->
  return unless array?
  return i for item, i in array when item is match
  -1

# end functions stolen from underscore

# bind(fn, context) binds context to fn

bind = (fn, context) -> -> fn.apply context, [].slice.call arguments

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
    prefixes[prop] = false

# end vendorPrefix

factory = (document) ->
  class Slideshow
    constructor: (element, opts) ->
      # test if element is a valid html element or maybe
      # a jQuery object or Backbone View
      unless element.nodeType is 1
        if element[0]? then element = element[0] #jQuery
        if element.el? then element = element.el #Backbone
      if element.nodeType isnt 1 then throw new Error 'No valid element provided'
      @opts = extend {}, defaults, opts
      @el = element
      # and go!
      init.call @

    # private API

    transformCSSProperty = prefix 'transform'

    defaults =
      touchEventsEnabled: true
      mouseEventsEnabled: true
      preventScroll: true # call event.preventDefault in the touch events
      animationDuration: 400 # duration of the animation
      onDidChange: ->
      onWillChange: ->
      animationDirection: 'x'
      conditions: [ # conditions array, see README.md
        progress: .1
        time: 250
        durationModifier: .5
      ,
        progress: .3
        time: 500
      ,
        progress: .5
      ]
      effect: # effect object, see README.md
        before: (slideState, slideElement) ->
          slideElement.style.display = 'block'
          ###
          slideState  is either -1, 0 or 1
          if slideState === 0 then this is the current slide and we want to show it, so set translateX(0)
          if slideState === -1 then this is the previous slide (to the left) so translateX(-100%)
          if slideState === 1 then this is the next slide (to the right) so translateX(100%)
          ###
          # transform = prefix 'transform'
          X = -slideState * 100
          if transformCSSProperty
            slideElement.style[transformCSSProperty] = "translateX(#{X}%)"
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
          X = 100 * progress * (1 - slideState / Math.abs progress)
          if transformCSSProperty
            slideElement.style[transformCSSProperty] = "translateX(#{X}%)"
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
      initEvents.call @

    initSlides = ->
      # we don't want the slides to be visible outside their container
      @el.style.position = 'relative'
      @el.style.overflow = 'hidden'
      beforeAnimate = @opts.effect.before
      afterAnimate = @opts.effect.after
      # el.children may behave weird in IE8
      @slides = @el.children ? @el.childNodes
      @current = 0
      for slide, i in @slides when i isnt @current
        # call the before and after functions once on all slides, so all slides
        # are positioned properly
        slide.style.position = 'absolute'
        if i is @current
          beforeAnimate?.call @, 0, @slides[@current]
          afterAnimate?.call @, 1, @slides[@current]
        else
          beforeAnimate?.call @, 1, slide
          afterAnimate?.call @, 0, slide

    initEvents = ->
      # check for TouchEvent support and if enabled in opts
      if TouchEvent? and @opts.touchEventsEnabled
        @el.addEventListener 'touchstart', bind eventStart, @
        @el.addEventListener 'touchmove', bind eventProgress, @
        @el.addEventListener 'touchend', bind eventEnd, @
      # check for MouseEvent support and if enabled in opts
      if MouseEvent? and @opts.mouseEventsEnabled
        @el.addEventListener 'mousedown', bind eventStart, @
        @el.addEventListener 'mousemove', bind eventProgress, @
        @el.addEventListener 'mouseup', bind eventEnd, @
        for slide in @slides
          slide.addEventListener 'mousedown', (event) -> event.preventDefault()
          slide.addEventListener 'mousemove', (event) -> event.preventDefault()
          slide.addEventListener 'mouseup', (event) -> event.preventDefault()

    setCurrentSlide = (slide) ->
      # set @current to slide's index in @slides
      @current = indexOf @slides, slide

    animateSlides = (currentSlide, targetSlide, {direction, progress, durationMod}, callback) ->
      # return if an animation is in progress
      return if @currentAnimation?
      # call onWillChange
      @opts.onWillChange.call @
      # progress and durationMod are only passed from a touch event
      progress ?= 0
      durationMod ?= 1
      # alter the duration of the animation after a touch event
      duration = Math.max 1, @opts.animationDuration * (1 - progress) * durationMod
      # slides shouldn't be prepared if this is called from a touch event
      # because this has already happened in touchStart
      unless @currentTouchEvent?
        beforeAnimate = @opts.effect.before
        beforeAnimate?.call @, 0, currentSlide
        beforeAnimate?.call @, (if direction < 0 then 1 else -1), targetSlide
      # cache the animation state
      @currentAnimation = {start: new Date().getTime(), currentSlide, targetSlide, direction, duration, progress, callback}
      # and finally start animating
      requestAnimationFrame bind nextFrame, @

    nextFrame = (timestamp) ->
      # immediately call the next requestAnimationFrame
      id = requestAnimationFrame bind nextFrame, @
      anim = @currentAnimation
      # calculate the actual progress (fraction of the animationDuration)
      progress = Math.min 1, anim.progress + (new Date().getTime() - anim.start) / anim.duration * (1 - anim.progress)
      # call the progress functions (this is where the magic happens)
      progressFn = @opts.effect.progress
      progressFn?.call @, 0, progress * anim.direction, anim.currentSlide
      progressFn?.call @, 1, progress * anim.direction, anim.targetSlide
      if progress >= 1
        # the animation has ended
        @currentAnimation = null
        cancelAnimationFrame id
        # call the after and callback functions
        afterAnimate = @opts.effect.after
        afterAnimate?.call @, 0, anim.currentSlide
        afterAnimate?.call @, 1, anim.targetSlide
        anim.callback?()
        @opts.onDidChange.call @
        # set the new currentSlide
        setCurrentSlide.call @, anim.targetSlide

    eventStart = (event) ->
      if @opts.preventDefaultEvents
        event.preventDefault()
      # do nothing if an animation or touch event is currently in progress
      return if @currentAnimation? or @currentEvent?
      # get the relevant slides
      currentSlide = @getCurrentSlide()
      prevSlide = @getPrevSlide()
      nextSlide = @getNextSlide()
      # prepare the slides to be animated
      beforeAnimate = @opts.effect.before
      beforeAnimate?.call @, 0, currentSlide
      beforeAnimate?.call @, -1, prevSlide
      beforeAnimate?.call @, 1, nextSlide
      # cache the touch event state
      {timeStamp, pageX, pageY} = event.touches?[0] ? event
      @currentEvent = {currentSlide, prevSlide, nextSlide, timeStamp, pageX, pageY}

    eventProgress = (event) ->
      if @opts.preventDefaultEvents
        event.preventDefault()
      # do nothing if an animation is in progress, or there's no touch event in progress yet (which souldn't happen)
      return if @currentAnimation or not @currentEvent?
      # calculate the progress based on the distance touched
      {pageX, pageY} = event.touches?[0] ? event
      progress = switch @opts.animationDirection
        when 'x' then (pageX - @currentEvent.pageX) / @el.clientWidth
        when 'y' then (pageY - @currentEvent.pageY) / @el.clientHeight
      # animate the slide
      targetSlide = if progress < 0 then @currentEvent.nextSlide else @currentEvent.prevSlide
      requestAnimationFrame =>
        progressFn = @opts.effect.progress
        progressFn.call @, 0, progress, @currentEvent.currentSlide
        progressFn.call @, 1, progress, targetSlide

    eventEnd = (event) ->
      if @opts.preventDefaultEvents
        event.preventDefault()
      # do nothing if an animation is in progress, or there's no touch event in progress yet (which souldn't happen)
      return if @currentAnimation or not @currentEvent?
      {pageX, pageY, timeStamp} = event.changedTouches?[0] ? event
      # calculate the final progress that has been made
      progress = switch @opts.animationDirection
        when 'x' then (pageX - @currentEvent.pageX) / @el.clientWidth
        when 'y' then (pageY - @currentEvent.pageY) / @el.clientHeight
      # calculate the time passed
      timePassed = timeStamp - @currentEvent.timeStamp
      progressAbs = Math.abs progress
      # check progress and timePassed against the conditions
      for cond in @opts.conditions
        if progressAbs > cond.progress and timePassed < (cond.time ? Infinity)
          # one condition passed so set durationMod from that condition
          durationMod = cond.durationModifier ? 1
          break
      # at this point, durationMod is only set if we matched a condition
      # so slide to the next slide
      if durationMod?
        # we matched a condition, so slide away the currentSlide and slide in
        # the targetSlide. if we slided to the left, the nextSlide will be the
        # targetSlide, else the prevSlide will be.
        currentSlide = @currentEvent.currentSlide
        direction = progress / progressAbs
        if direction is 1
          targetSlide = @currentEvent.prevSlide
        else
          targetSlide = @currentEvent.nextSlide
        progress = progressAbs
      else
        # we didn't match a condition, so slide the currentSlide back into
        # position and slide targetSlide (nextSlide or prevSlide, depending on
        # slide direction) away
        targetSlide = @currentEvent.currentSlide
        direction = -progress / progressAbs
        if direction is 1
          currentSlide = @currentEvent.nextSlide
        else
          currentSlide = @currentEvent.prevSlide
        progress = 1 - progressAbs
      # call the animateSlides function with the parameters
      animateSlides.call @, currentSlide, targetSlide, {direction, progress, durationMod}, =>
        @currentEvent = null

    # end private API

    # public API

    # get*Slide all return an HTMLElement

    # get the slide at index i
    # getSlide(-1) === getSlide(slides.length - 1)
    # and getSlide(slides.length) === getSlide(0)
    getSlide: (i) ->
      i = i % @slides.length
      if i < 0 then i += @slides.length
      @slides[i]

    # get the currently visible slide
    getCurrentSlide: -> @slides[@current]

    # get the slide after the currently visible one
    getNextSlide: -> @getSlide @current + 1

    # get the slide before the currently visible one
    getPrevSlide: -> @getSlide @current - 1

    # get the first slide
    getFirstSlide: -> @slides[0]

    # get the last slide
    getLastSlide: -> @slides[@slides.length - 1]

    # goTo* initiates an animation

    # go to the slide at index i
    goTo: (i, cb) ->
      return if i is @current
      currentSlide = @getCurrentSlide()
      targetSlide = @getSlide i
      # slide to left if i < @current, else slide to right
      direction = if i < @current then 1 else -1
      animateSlides.call @, currentSlide, targetSlide, {direction}, cb

    # go to the next slide
    goToNext: (cb) -> @goTo @current + 1, cb

    # go to the previous slide
    goToPrev: (cb) -> @goTo @current - 1, cb

    # go to first slide
    goToFirst: (cb) -> @goTo 0, cb

    # go to last slide
    goToLast: (cb) -> @goTo @slides.length - 1, cb

    # class methods

    @registerAsJQueryPlugin: (jQuery, methodName) ->
      jQuery.fn[methodName] = (opts) -> (new Slideshow container, opts for container in @)

# amd, commonjs and browser environment support
do (root = this, factory) ->
  Slideshow = factory root.document
  # amd
  if typeof define is 'function' and define.amd
    define [], -> Slideshow
  # commonjs
  else if typeof exports isnt 'undefined'
    module.exports = Slideshow
  # browser
  else
    root.Slideshow = Slideshow
