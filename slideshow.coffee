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

# indexOf(array, match) is equivalent to array.indexOf(match)

indexOf = (array, match) ->
  return unless array?
  if Array::indexOf?
    return Array::indexOf.call Array::slice.call(array), match
  for item, i in array when item is match
    return i
  -1

# extend target with properties from object in objects

extend = (target, objects...) ->
  return unless typeof target is 'object'
  for object in objects
    for own prop of object
      target[prop] = object[prop]
  target

# shallow clone object

clone = (object) -> extend {}, object

# bind(fn, context) binds context to fn

bind = (fn, context) -> -> fn.apply context, [].slice.call arguments

now = Date.now ? -> new Date().getTime()

class Slideshow
  constructor: (element, options = {}) ->
    # test if element is a valid html element or maybe
    # a jQuery object or Backbone View
    unless element.nodeType is 1
      if element[0]? then element = element[0] # jQuery
      if element.el? then element = element.el # Backbone
    if element.nodeType isnt 1
      throw new Error 'No valid element provided'
    @configure options
    @el = element
    # and go!
    init.call @

  configure: (options) ->
    @options = extend {}, defaults, options
    if typeof @options.effect is 'string' and effects[@options.effect]?
      @options.effect = clone effects[@options.effect]
      @options.effect.conditions ?= effects.default.conditions.concat()

  # private API

  defaults =
    touchEventsEnabled: true
    mouseEventsEnabled: true
    swipeThreshold: 0
    animationDuration: 400
    animationDirection: 'x'
    effect: 'default'

  effects =
    default: do ->

      transformCSSProperty = do ->
        style = document.createElement('div').style
        return 'transform' if style['transform']?
        for vendor in ['moz', 'webkit', 'khtml', 'o', 'ms']
          prefixed = "#{vendor}Transform"
          return prefixed if style[prefixed]?
        false

      conditions: [
        progress: .1
        time: 250
        durationModifier: .5
      ,
        progress: .3
        time: 500
      ,
        progress: .5
      ]
      before: (slideState, slideElement) ->
        slideElement.style.display = 'block'
        ###
        slideState  is either -1, 0 or 1
        if slideState === 0 then this is the current slide and we want to show it, so set translateX(0)
        if slideState === -1 then this is the previous slide (to the left) so translateX(-100%)
        if slideState === 1 then this is the next slide (to the right) so translateX(100%)
        ###
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
    effectBefore = @options.effect.before ? Function.prototype
    effectAfter = @options.effect.after ? Function.prototype
    # el.children may behave weird in IE8
    @slides = @el.children ? @el.childNodes
    @current = 0
    for slide, i in @slides when i isnt @current
      # call the before and after functions once on all slides, so all slides
      # are positioned properly
      if i is @current
        effectBefore.call @, 0, @slides[@current]
        effectAfter.call @, 1, @slides[@current]
      else
        effectBefore.call @, 1, slide
        effectAfter.call @, 0, slide

  initEvents = ->
    @eventStart = bind eventStart, @
    @eventProgress = bind eventProgress, @
    @eventEnd = bind eventEnd, @
    # check for TouchEvent support and if enabled in options
    if TouchEvent? and @options.touchEventsEnabled
      @el.addEventListener 'touchstart', @eventStart
      @el.addEventListener 'touchmove', @eventProgress
      @el.addEventListener 'touchend', @eventEnd
    # check for MouseEvent support and if enabled in options
    if MouseEvent? and @options.mouseEventsEnabled
      @el.addEventListener 'mousedown', @eventStart
      @el.addEventListener 'mousemove', @eventProgress
      @el.addEventListener 'mouseup', @eventEnd
      @el.addEventListener 'mouseleave', @eventEnd
      for slide in @slides
        slide.addEventListener 'mousedown', preventDefault
        slide.addEventListener 'mousemove', preventDefault
        slide.addEventListener 'mouseup', preventDefault

  setCurrentSlide = (slide) ->
    # set @current to slide's index in @slides
    @current = indexOf @slides, slide

  animateSlides = (currentSlide, targetSlide, {direction, initialProgress, durationMod}, callback) ->
    # return if an animation is in progress
    return if @currentAnimation?
    # call onWillChange
    unless @currentEvent? and @currentEvent.cancelOnWillChange
      @options.onWillChange?.call @, currentSlide, targetSlide, (@current - direction / Math.abs(direction)) %% @slides.length
    # progress and durationMod are only passed from a touch event
    progress = initialProgress ? 0
    durationMod ?= 1
    # alter the duration of the animation after a touch event
    duration = Math.max 1, @options.animationDuration * (1 - progress) * durationMod
    # slides shouldn't be prepared if this is called from a touch event
    # because this has already happened in touchStart
    unless @currentEvent?
      effectBefore = @options.effect.before ? Function.prototype
      effectBefore.call @, 0, currentSlide
      effectBefore.call @, (if direction < 0 then 1 else -1), targetSlide
    # cache the animation state
    @currentAnimation = {start: now(), currentSlide, targetSlide, direction, duration, progress, callback}
    # and finally start animating
    requestAnimationFrame bind nextFrame, @

  nextFrame = (timestamp) ->
    # immediately call the next requestAnimationFrame
    id = requestAnimationFrame bind nextFrame, @
    anim = @currentAnimation
    {start, progress, duration, direction, currentSlide, targetSlide, callback} = @currentAnimation
    # calculate the actual progress (fraction of the animationDuration)
    progress = progress + (now() - start) / duration * (1 - progress)
    if progress >= 1
      progress = 1
      # the animation has ended
      @currentAnimation = null
      cancelAnimationFrame id
      # call the after and callback functions
      effectAfter = @options.effect.after ? Function.prototype
      effectAfter.call @, 0, currentSlide
      effectAfter.call @, 1, targetSlide
      # set the new currentSlide
      setCurrentSlide.call @, targetSlide
      if typeof callback == 'function'
        callback.call @, currentSlide, targetSlide, @current
      @options.onDidChange?.call @, currentSlide, targetSlide, @current
      setCurrentSlide.call @, targetSlide
    # call the progress functions
    effectProgress = @options.effect.progress ? Function.prototype
    effectProgress.call @, 0, progress * direction, currentSlide
    effectProgress.call @, 1, progress * direction, targetSlide

  eventStart = (event) ->
    # do nothing if an animation or touch event is currently in progress
    return if @currentAnimation? or @currentEvent?
    # get the relevant slides
    currentSlide = @getCurrentSlide()
    prevSlide = @getPrevSlide()
    nextSlide = @getNextSlide()
    # prepare the slides to be animated
    effectBefore = @options.effect.before ? Function.prototype
    effectBefore.call @, 0, currentSlide
    effectBefore.call @, -1, prevSlide
    effectBefore.call @, 1, nextSlide
    # cache the touch event state
    {timeStamp} = event
    {pageX: startX, pageY: startY} = event.touches?[0] ? event
    @currentEvent = {currentSlide, prevSlide, nextSlide, timeStamp, startX, startY}

  eventProgress = (event) ->
    # do nothing if an animation is in progress, or there's no touch event in progress yet (which souldn't happen)
    return if @currentAnimation or not @currentEvent?
    {pageX, pageY} = event.touches?[0] ? event
    # calculate the progress based on the distance touched
    # progress = switch @options.animationDirection
    #   when 'x' then (pageX - @currentEvent.startX) / @el.clientWidth
    #   when 'y' then (pageY - @currentEvent.startY) / @el.clientHeight
    progress =
      x: (pageX - @currentEvent.startX) / @el.clientWidth
      y: (pageY - @currentEvent.startY) / @el.clientHeight
    progress = switch @options.animationDirection
      when 'x'
        if Math.abs(progress.x) > Math.abs(progress.y) then progress.x
      when 'y'
        if Math.abs(progress.y) > Math.abs(progress.x) then progress.y
    @currentEvent.shouldCancel = !progress
    return unless progress?
    # get the target slide
    targetSlide = if progress < 0 then @currentEvent.nextSlide else @currentEvent.prevSlide
    if targetSlide isnt @currentEvent.targetSlide
      @currentEvent.cancelOnWillChange = false
      @currentEvent.targetSlide = targetSlide
    # trigger onWillChange event
    unless @currentEvent.cancelOnWillChange and progress isnt 0
      @currentEvent.cancelOnWillChange = true
      nextIndex = (@current - progress / Math.abs progress) %% @slides.length
      @options.onWillChange?.call @, @currentEvent.currentSlide, targetSlide, nextIndex
    @currentEvent.targetSlide = targetSlide
    # animate the slide
    requestAnimationFrame =>
      effectProgress = @options.effect.progress ? Function.prototype
      effectProgress.call @, 0, progress, @currentEvent.currentSlide
      effectProgress.call @, 1, progress, targetSlide

  eventEnd = (event) ->
    # do nothing if an animation is in progress, or there's no touch event in progress yet (which souldn't happen)
    return if @currentAnimation or not @currentEvent?
    {timeStamp} = event
    {pageX, pageY} = event.changedTouches?[0] ? event
    # calculate the final progress that has been made
    progress = switch @options.animationDirection
      when 'x' then (pageX - @currentEvent.startX) / @el.clientWidth
      when 'y' then (pageY - @currentEvent.startY) / @el.clientHeight
    if @currentEvent.shouldCancel
      currentSlide = if progress > 0 then @currentEvent.nextSlide else @currentEvent.prevSlide
      direction = progress / Math.abs progress
      initialProgress = 1 - Math.abs progress
      animateSlides.call @, currentSlide, @currentEvent.currentSlide, {direction, initialProgress}
      @currentEvent = null
      return
    if progress is 0
      @currentEvent = null
      return
    # calculate the time passed
    timePassed = timeStamp - @currentEvent.timeStamp
    progressAbs = Math.abs progress
    # check progress and timePassed against the conditions
    for condition in @options.effect.conditions
      if progressAbs > condition.progress and timePassed < (condition.time ? Infinity)
        # one condition passed so set durationMod from that condition
        durationMod = condition.durationModifier ? 1
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
      initialProgress = progressAbs
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
      initialProgress = 1 - progressAbs
    # call the animateSlides function with the parameters
    animateSlides.call @, currentSlide, targetSlide, {direction, initialProgress, durationMod}, =>
      @currentEvent = null

  preventDefault = (event) ->
    event.preventDefault()

  # end private API

  # public API

  # get*Slide all return an HTMLElement

  # get the slide at index i
  # getSlide(-1) === getSlide(slides.length - 1)
  # and getSlide(slides.length) === getSlide(0)
  getSlide: (i) ->
    @slides[i %% @slides.length]

  # get the currently visible slide
  getCurrentSlide: -> @slides[@current]

  getCurrentIndex: -> @current

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

  # destroy this instance
  destroy: ->
    @el.removeEventListener 'touchstart', @eventStart
    @el.removeEventListener 'touchmove', @eventProgress
    @el.removeEventListener 'touchend', @eventEnd
    @el.removeEventListener 'mousedown', @eventStart
    @el.removeEventListener 'mousemove', @eventProgress
    @el.removeEventListener 'mouseup', @eventEnd
    @el.removeEventListener 'mouseleave', @eventEnd
    for slide in @slides
      slide.removeEventListener 'mousedown', preventDefault
      slide.removeEventListener 'mousemove', preventDefault
      slide.removeEventListener 'mouseup', preventDefault
    {@el, @slides, @eventStart, @eventProgress, @eventEnd, @options} = {}

  # class methods

  @registerAsJQueryPlugin: (jQuery, methodName = 'Slideshow') ->
    jQuery.fn[methodName] = (options) -> (new Slideshow container, options for container in @)

  @registerEffect: (name, effect) ->
    effect.conditions ?= effects.default.conditions.concat()
    effects[name] ?= effect

# amd, commonjs and browser environment support
do (root = this) ->
  # amd
  if typeof define is 'function' and define.amd
    define [], -> Slideshow
  # commonjs
  else if typeof exports isnt 'undefined'
    module.exports = Slideshow
  # browser
  else
    root.Slideshow = Slideshow
