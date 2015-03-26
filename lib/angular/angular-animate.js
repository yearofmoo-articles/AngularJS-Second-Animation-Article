/**
 * @license AngularJS v1.4.0-local+sha.590ec31
 * (c) 2010-2015 Google, Inc. http://angularjs.org
 * License: MIT
 */
(function(window, angular, undefined) {'use strict';

/* jshint ignore:start */
var noop        = angular.noop;
var extend      = angular.extend;
var jqLite      = angular.element;
var forEach     = angular.forEach;
var isArray     = angular.isArray;
var isString    = angular.isString;
var isObject    = angular.isObject;
var isUndefined = angular.isUndefined;
var isDefined   = angular.isDefined;
var isFunction  = angular.isFunction;
var isElement   = angular.isElement;

var ELEMENT_NODE = 1;
var COMMENT_NODE = 8;

var NG_ANIMATE_CHILDREN_DATA = '$$ngAnimateChildren';

var isPromiseLike = function(p) {
  return p && p.then ? true : false;
}

function mergeClasses(a,b) {
  if (!a && !b) return '';
  if (!a) return b;
  if (!b) return a;
  if (isArray(a)) a = a.join(' ');
  if (isArray(b)) b = b.join(' ');
  return a + ' ' + b;
}

function packageStyles(options) {
  var styles = {};
  if (options && (options.to || options.from)) {
    styles.to = options.to;
    styles.from = options.from;
  }
  return styles;
}

function pendClasses(classes, fix, isPrefix) {
  var className = '';
  classes = isArray(classes)
      ? classes
      : classes && isString(classes) && classes.length
          ? classes.split(/\s+/)
          : [];
  forEach(classes, function(klass, i) {
    if (klass && klass.length > 0) {
      className += (i > 0) ? ' ' : '';
      className += isPrefix ? fix + klass
                            : klass + fix;
    }
  });
  return className;
}

function normalizeCssProp(name) {
  var prefix = '';
  if (name.substring(1,6) == 'ebkit') { // matches [wW]ebkit
    prefix = '-';
  }
  return prefix + name.replace(/[A-Z]/g, function(letter, pos) {
    return (pos ? '-' : '') + letter.toLowerCase();
  });
}

function removeFromArray(arr, val) {
  var index = arr.indexOf(val);
  if (val >= 0) {
    arr.splice(index, 1);
  }
}

function stripCommentsFromElement(element) {
  if (element.nodeType === ELEMENT_NODE) {
    return jqLite(element);
  }
  if (element.length === 0) return [];

  // there is no point of stripping anything if the element
  // is the only element within the jqLite wrapper.
  // (it's important that we retain the element instance.)
  if (element.length === 1) {
    return element[0].nodeType === ELEMENT_NODE && element;
  } else {
    return jqLite(extractElementNode(element));
  }
}

function extractElementNode(element) {
  for (var i = 0; i < element.length; i++) {
    var elm = element[i];
    if (elm.nodeType == ELEMENT_NODE) {
      return elm;
    }
  }
}

function $$addClass($$jqLite, element, className) {
  forEach(element, function(elm) {
    $$jqLite.addClass(elm, className);
  });
}

function $$removeClass($$jqLite, element, className) {
  forEach(element, function(elm) {
    $$jqLite.removeClass(elm, className);
  });
}
/* jshint ignore:end */

var $$AnimateChildrenDirective = [function() {
  return function(scope, element, attrs) {
    var val = attrs.ngAnimateChildren;
    if (angular.isString(val) && val.length === 0) { //empty attribute
      element.data(NG_ANIMATE_CHILDREN_DATA, true);
    } else {
      attrs.$observe('ngAnimateChildren', function(value) {
        value = value === 'on' || value === 'true';
        element.data(NG_ANIMATE_CHILDREN_DATA, value);
      });
    }
  };
}];

// Detect proper transitionend/animationend event names.
var CSS_PREFIX = '', TRANSITION_PROP, TRANSITIONEND_EVENT, ANIMATION_PROP, ANIMATIONEND_EVENT;

// If unprefixed events are not supported but webkit-prefixed are, use the latter.
// Otherwise, just use W3C names, browsers not supporting them at all will just ignore them.
// Note: Chrome implements `window.onwebkitanimationend` and doesn't implement `window.onanimationend`
// but at the same time dispatches the `animationend` event and not `webkitAnimationEnd`.
// Register both events in case `window.onanimationend` is not supported because of that,
// do the same for `transitionend` as Safari is likely to exhibit similar behavior.
// Also, the only modern browser that uses vendor prefixes for transitions/keyframes is webkit
// therefore there is no reason to test anymore for other vendor prefixes:
// http://caniuse.com/#search=transition
if (window.ontransitionend === undefined && window.onwebkittransitionend !== undefined) {
  CSS_PREFIX = '-webkit-';
  TRANSITION_PROP = 'WebkitTransition';
  TRANSITIONEND_EVENT = 'webkitTransitionEnd transitionend';
} else {
  TRANSITION_PROP = 'transition';
  TRANSITIONEND_EVENT = 'transitionend';
}

if (window.onanimationend === undefined && window.onwebkitanimationend !== undefined) {
  CSS_PREFIX = '-webkit-';
  ANIMATION_PROP = 'WebkitAnimation';
  ANIMATIONEND_EVENT = 'webkitAnimationEnd animationend';
} else {
  ANIMATION_PROP = 'animation';
  ANIMATIONEND_EVENT = 'animationend';
}

var DURATION_KEY = 'Duration';
var PROPERTY_KEY = 'Property';
var DELAY_KEY = 'Delay';
var TIMING_KEY = 'TimingFunction';
var ANIMATION_ITERATION_COUNT_KEY = 'IterationCount';
var ANIMATION_PLAYSTATE_KEY = 'PlayState';
var ELAPSED_TIME_MAX_DECIMAL_PLACES = 3;
var CLOSING_TIME_BUFFER = 1.5;
var ONE_SECOND = 1000;
var BASE_TEN = 10;

function computeCSSStyles($window, element, properties) {
  var styles = Object.create(null);
  var detectedStyles = $window.getComputedStyle(element) || {};
  forEach(properties, function(style, prop) {
    var val = detectedStyles[style];
    // only numerical-based values have a digit as the first value
    if (val) {
      if (val.charAt(0) >= 0) {
        val = parseMaxTime(val);
      }
      styles[prop] = val;
    }
  });

  return styles;
}

function parseMaxTime(str) {
  var maxValue = 0;
  var values = str.split(/\s*,\s*/);
  forEach(values, function(value) {
    maxValue = Math.max(parseFloat(value) || 0, maxValue);
  });
  return maxValue;
}

function getCssTransitionDurationStyle(duration, applyOnlyDuration) {
  var style = TRANSITION_PROP;
  var value = duration + 's';
  if (applyOnlyDuration) {
    style += DURATION_KEY;
  } else {
    value += ' linear all';
  }
  return [style, value];
}

function getCssKeyframeDurationStyle(duration) {
  return [ANIMATION_PROP + DURATION_KEY, duration + 's'];
}

function getCssDelayStyle(delay, isKeyframeAnimation) {
  var prop = (isKeyframeAnimation ? ANIMATION_PROP : TRANSITION_PROP) + DELAY_KEY;
  return [prop, delay + 's'];
}

function blockTransitions(node, applyBlock) {
  var value = applyBlock ? 'none' : '';
  var key = TRANSITION_PROP + PROPERTY_KEY;
  applyInlineStyle(node, [key, value]);
  return [key, value];
}

function blockAnimations(node, applyBlock) {
  var value = applyBlock ? 'paused' : '';
  var key = ANIMATION_PROP + ANIMATION_PLAYSTATE_KEY;
  applyInlineStyle(node, [key, value]);
  return [key, value];
}

function applyInlineStyle(node, key) {
  var value = key[1];
  key = key[0];
  node.style[key] = value;
}

function createLocalCacheLookup() {
  var cache = Object.create(null);
  return {
    flush: function() {
      cache = {};
    },

    count: function(key) {
      var entry = cache[key];
      return entry ? entry.total : 0;
    },

    get: function(key) {
      var entry = cache[key];
      return entry && entry.value;
    },

    put: function(key, value) {
      if (!cache[key]) {
        cache[key] = { total: 1, value: value };
      } else {
        cache[key].total++;
      }
    }
  };
}

var $AnimateCssProvider = ['$animateProvider', function($animateProvider) {
  var gcsLookup = createLocalCacheLookup();
  var gcsStaggerLookup = createLocalCacheLookup();

  this.$get = ['$window', '$$jqLite', '$$AnimateRunner', '$timeout',
                '$document', '$$animateOptions', '$sniffer', '$$rAF',
       function($window,   $$jqLite,   $$AnimateRunner,   $timeout,
                 $document,   $$animateOptions,   $sniffer,   $$rAF) {

    var parentCounter = 0;
    function gcsHashFn(node, extraClasses) {
      var KEY = "$$ngAnimateParentKey";
      var parentNode = node.parentNode;
      var parentID = parentNode[KEY] || (parentNode[KEY] = ++parentCounter);
      return parentID + '-' + node.getAttribute('class') + '-' + extraClasses;
    }

    function computeCachedCSSStyles(node, className, cacheKey, properties) {
      var timings = gcsLookup.get(cacheKey);

      if (!timings) {
        timings = computeCSSStyles($window, node, properties);
        if (timings.animationIterationCount === 'infinite') {
          timings.animationIterationCount = 1;
        }
      }

      // we keep putting this in multiple times even though the value and the cacheKey are the same
      // because we're keeping an interal tally of how many duplicate animations are detected.
      gcsLookup.put(cacheKey, timings);
      return timings;
    }

    function computeCachedCSSStaggerStyles(node, className, cacheKey, properties) {
      var stagger;

      // if we have one or more existing matches of matching elements
      // containing the same parent + CSS styles (which is how cacheKey works)
      // then staggering is possible
      if (gcsLookup.count(cacheKey) > 0) {
        stagger = gcsStaggerLookup.get(cacheKey);

        if (!stagger) {
          var staggerClassName = pendClasses(className, '-stagger');

          $$jqLite.addClass(node, staggerClassName);

          stagger = computeCSSStyles($window, node, properties);

          $$jqLite.removeClass(node, staggerClassName);

          gcsStaggerLookup.put(cacheKey, stagger);
        }
      }

      return stagger || {};
    }

    var bod = $document[0].body;
    var cancelLastRAFRequest;
    var rafWaitQueue = [];
    function waitUntilQuiet(callback) {
      if (cancelLastRAFRequest) {
        cancelLastRAFRequest(); //cancels the request
      }
      rafWaitQueue.push(callback);
      cancelLastRAFRequest = $$rAF(function() {
        cancelLastRAFRequest = null;
        gcsLookup.flush();
        gcsStaggerLookup.flush();

        //the line below will force the browser to perform a repaint so
        //that all the animated elements within the animation frame will
        //be properly updated and drawn on screen. This is required to
        //ensure that the the preparation animation is properly flushed so that
        //the active state picks up from there. DO NOT REMOVE THIS LINE.
        var a = bod.offsetWidth + 1;
        forEach(rafWaitQueue, function(cb) {
          cb();
        });
        rafWaitQueue.length = 0;
      });
    }

    return init;

    function computeTimings(node, className, cacheKey) {
      var timings = computeCachedCSSStyles(node, className, cacheKey, {
        transitionDuration:      TRANSITION_PROP + DURATION_KEY,
        transitionDelay:         TRANSITION_PROP + DELAY_KEY,
        transitionProperty:      TRANSITION_PROP + PROPERTY_KEY,
        animationDuration:       ANIMATION_PROP  + DURATION_KEY,
        animationDelay:          ANIMATION_PROP  + DELAY_KEY,
        animationIterationCount: ANIMATION_PROP  + ANIMATION_ITERATION_COUNT_KEY
      });

      timings.maxDelay = Math.max(timings.animationDelay, timings.transitionDelay);
      timings.maxDuration = Math.max(
          timings.animationDuration * timings.animationIterationCount,
          timings.transitionDuration);

      return timings;
    }

    function init(element, options) {
      var node = element[0];
      options = $$animateOptions(element, options);

      var temporaryStyles = [];
      var classes = element.attr('class');
      var styles = packageStyles(options);
      var animationClosed;
      var animationPaused;
      var animationCompleted;
      var runner;
      var runnerHost;

      if (options.duration === 0 || (!$sniffer.animations && !$sniffer.transitions)) {
        close();
        return;
      }

      var method = options.event && isArray(options.event)
            ? options.event.join(' ')
            : options.event;

      // despite any of these methods being a valid event, we special case pure
      // class-based animations so that we can avoid applying CSS blocking on
      // the element to allow for normal transitions to work (this is how enter,
      // leave and move can perform the `ng-EVENT` methods without causing an
      // unexpected transition animation to occur).
      var structural = method &&
                        [' setClass ', ' addClass ',' removeClass '].indexOf(' ' + method + ' ') == -1;

      var structuralClassName = '';
      var addRemoveClassName = '';

      if (structural) {
        structuralClassName = pendClasses(method, 'ng-', true);
      }

      if (options.addClass) {
        addRemoveClassName += pendClasses(options.addClass, '-add');
      }

      if (options.removeClass) {
        if (addRemoveClassName.length) {
          addRemoveClassName += ' ';
        }
        addRemoveClassName += pendClasses(options.removeClass, '-remove');
      }

      var setupClasses = [structuralClassName, addRemoveClassName].join(' ').trim();
      var fullClassName =  classes + ' ' + setupClasses;
      var activeClasses = pendClasses(setupClasses, '-active');
      var hasToStyles = styles.to && Object.keys(styles.to).length > 0;

      // there is no way we can trigger an animation since no styles and
      // no classes are being applied which would then trigger a transition
      if (!hasToStyles && !setupClasses) {
        close();
        return false;
      }

      var cacheKey, stagger;
      if (options.stagger > 0) {
        var staggerVal = parseFloat(options.stagger);
        stagger = {
          transitionDelay: staggerVal,
          animationDelay: staggerVal,
          transitionDuration: 0,
          animationDuration: 0
        };
      } else {
        cacheKey = gcsHashFn(node, fullClassName);
        stagger = computeCachedCSSStaggerStyles(node, setupClasses, cacheKey, {
          transitionDelay:    TRANSITION_PROP + DELAY_KEY,
          transitionDuration: TRANSITION_PROP + DURATION_KEY,
          animationDelay:     ANIMATION_PROP  + DELAY_KEY,
          animationDuration:  ANIMATION_PROP  + DURATION_KEY
        });
      }

      $$jqLite.addClass(element, setupClasses);

      var applyOnlyDuration;

      if (options.transitionStyle) {
        var transitionStyle = [TRANSITION_PROP, options.transitionStyle];
        applyInlineStyle(node, transitionStyle);
        temporaryStyles.push(transitionStyle);
      }

      if (options.duration >= 0) {
        applyOnlyDuration = node.style[TRANSITION_PROP].length > 0;
        var durationStyle = getCssTransitionDurationStyle(options.duration, applyOnlyDuration);

        // we set the duration so that it will be picked up by getComputedStyle later
        applyInlineStyle(node, durationStyle);
        temporaryStyles.push(durationStyle);
      }

      if (options.keyframeStyle) {
        var keyframeStyle = [ANIMATION_PROP, options.keyframeStyle];
        applyInlineStyle(node, keyframeStyle);
        temporaryStyles.push(keyframeStyle);
      }

      var timings = computeTimings(node, fullClassName, cacheKey);
      var maxDelay = timings.maxDelay;
      var maxDuration = timings.maxDuration;

      var flags = {};
      flags.hasTransitions          = timings.transitionDuration > 0;
      flags.hasAnimations           = timings.animationDuration > 0;
      flags.hasTransitionAll        = flags.hasTransitions && timings.transitionProperty == 'all';
      flags.applyTransitionDuration = hasToStyles && (
                                        (flags.hasTransitions && !flags.hasTransitionAll)
                                         || (flags.hasAnimations && !flags.hasTransitions));
      flags.applyAnimationDuration   = options.duration && flags.hasAnimations;
      flags.applyTransitionDelay     = options.delay >= 0 && (flags.applyTransitionDuration || flags.hasTransitions);
      flags.applyAnimationDelay      = options.delay >= 0 && flags.hasAnimations;
      flags.recalculateTimingStyles  = addRemoveClassName.length > 0;

      if (flags.applyTransitionDuration || flags.applyAnimationDuration) {
        maxDuration = options.duration ? parseFloat(options.duration) : maxDuration;

        if (flags.applyTransitionDuration) {
          flags.hasTransitions = true;
          timings.transitionDuration = maxDuration;
          applyOnlyDuration = node.style[TRANSITION_PROP].length > 0;
          temporaryStyles.push(getCssTransitionDurationStyle(maxDuration, applyOnlyDuration));
        }

        if (flags.applyAnimationDuration) {
          flags.hasAnimations = true;
          timings.animationDuration = maxDuration;
          temporaryStyles.push(getCssKeyframeDurationStyle(maxDuration));
        }
      }

      if (flags.applyTransitionDelay || flags.applyAnimationDelay) {
        maxDelay = typeof options.delay !== "boolean" && options.delay >= 0 ? parseFloat(options.delay) : maxDelay;

        if (flags.applyTransitionDelay) {
          timings.transitionDelay = maxDelay;
          temporaryStyles.push(getCssDelayStyle(maxDelay));
        }

        if (flags.applyAnimationDelay) {
          timings.animationDelay = maxDelay;
          temporaryStyles.push(getCssDelayStyle(maxDelay, true));
        }
      }

      flags.transitionClassBlock = timings.transitionProperty === 'none' &&
                                   timings.transitionDuration === 0;

      // there may be a situation where a structural animation is combined together
      // with CSS classes that need to resolve before the animation is computed.
      // However this means that there is no explicit CSS code to block the animation
      // from happening (by setting 0s none in the class name). If this is the case
      // we need to apply the classes before the first rAF so we know to continue if
      // there actually is a detected transition or keyframe animation
      var $applyClassesEarly = maxDuration === 0
                               && structural
                               && addRemoveClassName.length > 0
                               && !flags.transitionClassBlock;

      if ($applyClassesEarly) {
        options.$applyClasses();

        // no need to calculate this anymore
        flags.recalculateTimingStyles = false;

        fullClassName = node.className + ' ' + setupClasses;
        cacheKey = gcsHashFn(node, fullClassName);

        timings = computeTimings(node, fullClassName, cacheKey);
        maxDelay = timings.maxDelay;
        maxDuration = timings.maxDuration;
      }

      if (maxDuration === 0 && !flags.recalculateTimingStyles) {
        close();
        return false;
      }

      var maxDelayTime = maxDelay * ONE_SECOND;
      var maxDurationTime = maxDuration * ONE_SECOND;

      var itemIndex = stagger
          ? options.staggerIndex >= 0
              ? options.staggerIndex
              : gcsLookup.count(cacheKey) - 1
          : 0;
      if (!options.skipBlocking) {
        flags.blockTransition = hasToStyles || (structural && timings.transitionDuration > 0);
        flags.blockAnimation = timings.animationDuration > 0 &&
                               stagger.animationDelay > 0 &&
                               stagger.animationDuration === 0;
      }

      if (flags.blockTransition) {
        options.$applyStyles(true, false);
      }
      applyBlocking(true);

      return {
        start: function() {
          if (animationClosed) return;

          runnerHost = {
            end: endFn,
            cancel: cancelFn
          };

          runner = new $$AnimateRunner(runnerHost);

          waitUntilQuiet(function() {
            start();
          });

          // we don't have access to pause/resume the animation
          // since it hasn't run yet. AnimateRunner will therefore
          // set noop functions for resume and pause and they will
          // later be overridden once the animation is triggered
          return runner;
        },
        end: endFn,
        cancel: cancelFn,
        duration: maxDuration,
        delay: maxDelay,
        transitions: timings.transitionDuration > 0,
        keyframes: timings.animationDuration > 0
      };

      function endFn() {
        close();
      }

      function cancelFn() {
        close(true);
      }

      function close(rejected) { // jshint ignore:line
        // if the promise has been called already then we shouldn't close
        // the animation again
        if (animationClosed || (animationCompleted && animationPaused)) return;
        animationClosed = true;
        animationPaused = false;

        $$jqLite.removeClass(element, setupClasses);
        $$jqLite.removeClass(element, activeClasses);

        forEach(temporaryStyles, function(entry) {
          // There is only one way to remove inline style properties entirely from elements.
          // By using `removeProperty` this works, but we need to convert camel-cased CSS
          // styles down to hyphenated values.
          node.style.removeProperty(normalizeCssProp(entry[0]));
        });

        options.$applyClasses();
        options.$applyStyles(true, true);

        // the reason why we have this option is to allow a synchronous closing callback
        // that is fired as SOON as the animation ends (when the CSS is removed) or if
        // the animation never takes off at all. A good example is a leave animation since
        // the element must be removed just after the animation is over or else the element
        // will appear on screen for one animation frame causing an overbearing flicker.
        if (options.onDone) {
          options.onDone();
        }

        // if the preparation function fails then the promise is not setup
        if (runner) {
          runner.complete(!rejected);
        }
      }

      function applyBlocking(on) {
        if (flags.blockTransition) {
          blockTransitions(node, on);
        }

        if (flags.blockAnimation) {
          blockAnimations(node, on);
        }
      }

      function start() {
        if (animationClosed) return;

        var startTime, events = [];
        var playPause = function(playAnimation) {
          if (!animationCompleted) {
            animationPaused = !playAnimation;
            if (timings.animationDuration) {
              var value = blockAnimations(node, animationPaused);
              animationPaused
                  ? temporaryStyles.push(value)
                  : removeFromArray(temporaryStyles, value);
            }
          } else if (animationPaused && playAnimation) {
            animationPaused = false;
            close();
          }
        };

        // checking the stagger duration prevents an accidently cascade of the CSS delay style
        // being inherited from the parent. If the transition duration is zero then we can safely
        // rely that the delay value is an intential stagger delay style.
        var maxStagger = itemIndex > 0
                         && ((timings.transitionDuration && stagger.transitionDuration === 0) ||
                            (timings.animationDuration && stagger.animationDuration === 0))
                         && Math.max(stagger.animationDelay, stagger.transitionDelay);
        if (maxStagger) {
          $timeout(triggerAnimationStart,
                   Math.floor(maxStagger * itemIndex * ONE_SECOND),
                   false);
        } else {
          triggerAnimationStart();
        }

        // this will decorate the existing promise runner with pause/resume methods
        runnerHost.resume = function() {
          playPause(true);
        };

        runnerHost.pause = function() {
          playPause(false);
        };

        function triggerAnimationStart() {
          // just incase a stagger animation kicks in when the animation
          // itself was cancelled entirely
          if (animationClosed) return;

          applyBlocking(false);

          forEach(temporaryStyles, function(entry) {
            var key = entry[0];
            var value = entry[1];
            node.style[key] = value;
          });

          options.$applyClasses();
          $$jqLite.addClass(element, activeClasses);

          if (flags.recalculateTimingStyles) {
            fullClassName = node.className + ' ' + setupClasses;
            cacheKey = gcsHashFn(node, fullClassName);

            timings = computeTimings(node, fullClassName, cacheKey);
            maxDelay = timings.maxDelay;
            maxDuration = timings.maxDuration;
            maxDelayTime = maxDelay * ONE_SECOND;
            maxDurationTime = maxDuration * ONE_SECOND;

            if (maxDuration === 0) {
              close();
              return;
            }

            flags.hasTransitions = timings.transitionDuration > 0;
            flags.hasAnimations = timings.animationDuration > 0;
          }

          if (options.easing) {
            var easeProp, easeVal = options.easing;
            if (flags.hasTransitions) {
              easeProp = TRANSITION_PROP + TIMING_KEY;
              temporaryStyles.push([easeProp, easeVal]);
              node.style[easeProp] = easeVal;
            }
            if (flags.hasAnimations) {
              easeProp = ANIMATION_PROP + TIMING_KEY;
              temporaryStyles.push([easeProp, easeVal]);
              node.style[easeProp] = easeVal;
            }
          }

          if (timings.transitionDuration) {
            events.push(TRANSITIONEND_EVENT);
          }

          if (timings.animationDuration) {
            events.push(ANIMATIONEND_EVENT);
          }

          startTime = Date.now();
          element.on(events.join(' '), onAnimationProgress);
          $timeout(onAnimationExpired, maxDelayTime + CLOSING_TIME_BUFFER * maxDurationTime);

          options.$applyStyles(false, true);
        }

        function onAnimationExpired() {
          // although an expired animation is a failed animation, getting to
          // this outcome is very easy if the CSS code screws up. Therefore we
          // should still continue normally as if the animation completed correctly
          close();
        }

        function onAnimationProgress(event) {
          event.stopPropagation();
          var ev = event.originalEvent || event;
          var timeStamp = ev.$manualTimeStamp || ev.timeStamp || Date.now();

          /* Firefox (or possibly just Gecko) likes to not round values up
           * when a ms measurement is used for the animation */
          var elapsedTime = parseFloat(ev.elapsedTime.toFixed(ELAPSED_TIME_MAX_DECIMAL_PLACES));

          /* $manualTimeStamp is a mocked timeStamp value which is set
           * within browserTrigger(). This is only here so that tests can
           * mock animations properly. Real events fallback to event.timeStamp,
           * or, if they don't, then a timeStamp is automatically created for them.
           * We're checking to see if the timeStamp surpasses the expected delay,
           * but we're using elapsedTime instead of the timeStamp on the 2nd
           * pre-condition since animations sometimes close off early */
          if (Math.max(timeStamp - startTime, 0) >= maxDelayTime && elapsedTime >= maxDuration) {
            // we set this flag to ensure that if the transition is paused then, when resumed,
            // the animation will automatically close itself since transitions cannot be paused.
            animationCompleted = true;
            close();
          }
        }
      }
    }
  }];
}];

var $$AnimateCssDriverProvider = ['$$animationProvider', function($$animationProvider) {
  $$animationProvider.drivers.push('$$animateCssDriver');

  var NG_ANIMATE_SHIM_CLASS_NAME = 'ng-animate-shim';
  var NG_ANIMATE_ANCHOR_CLASS_NAME = 'ng-animate-anchor';
  var NG_ANIMATE_ANCHOR_SUFFIX = '-anchor';

  this.$get = ['$animateCss', '$rootScope', '$$AnimateRunner', '$rootElement', '$document',
       function($animateCss,   $rootScope,   $$AnimateRunner,   $rootElement,   $document) {

    var bodyNode = $document[0].body;
    var rootNode = $rootElement[0];

    var rootBodyElement = jqLite(bodyNode.parentNode === rootNode ? bodyNode : rootNode);

    return function(details) {
      return details.from && details.to
          ? prepareTransitionAnimation(details.from, details.to, details.classes, details.anchors)
          : prepareRegularAnimation(details);
    };

    function filterCssClasses(classes) {
      //remove all the `ng-` stuff
      return classes.replace(/\bng-\S+\b/g, '');
    }

    function getUniqueValues(a, b) {
      if (isString(a)) a = a.split(' ');
      if (isString(b)) b = b.split(' ');
      return a.filter(function(val) {
        return b.indexOf(val) === -1;
      }).join(' ');
    }

    function prepareAnchoredAnimation(classes, outAnchor, inAnchor) {
      var clone = jqLite(outAnchor[0].cloneNode(true));
      var startingClasses = filterCssClasses(clone.attr('class') || '');
      var anchorClasses = pendClasses(classes, NG_ANIMATE_ANCHOR_SUFFIX);

      outAnchor.addClass(NG_ANIMATE_SHIM_CLASS_NAME);
      inAnchor.addClass(NG_ANIMATE_SHIM_CLASS_NAME);

      clone.addClass(NG_ANIMATE_ANCHOR_CLASS_NAME);
      clone.addClass(anchorClasses);

      rootBodyElement.append(clone);

      var animatorOut = prepareOutAnimation();
      if (!animatorOut) return end();

      return {
        start: function() {
          var runner;

          var currentAnimation = animatorOut.start();
          currentAnimation.done(function() {
            currentAnimation = null;
            var animatorIn = prepareInAnimation();
            if (animatorIn) {
              currentAnimation = animatorIn.start();
              currentAnimation.done(function() {
                currentAnimation = null;
                end();
                runner.complete();
              });
              return currentAnimation;
            }
            // in the event that there is no `in` animation
            end();
            runner.complete();
          });

          runner = new $$AnimateRunner({
            end: endFn,
            cancel: endFn
          });

          return runner;

          function endFn() {
            if (currentAnimation) {
              currentAnimation.end();
            }
          }
        }
      };

      function calculateAnchorStyles(anchor) {
        var styles = {};
        forEach(anchor[0].getBoundingClientRect(), function(value, key) {
          switch (key) {
            case 'right':
            case 'bottom':
              return;

            case 'top':
              value += bodyNode.scrollTop;
              break;
            case 'left':
              value += bodyNode.scrollLeft;
              break;
          }
          styles[key] = Math.floor(value) + 'px';
        });
        return styles;
      }

      function prepareOutAnimation() {
        return $animateCss(clone, {
          addClass: 'out',
          delay: true,
          from: calculateAnchorStyles(outAnchor)
        });
      }

      function prepareInAnimation() {
        var endingClasses = filterCssClasses(inAnchor.attr('class'));
        var classes = getUniqueValues(endingClasses, startingClasses);
        return $animateCss(clone, {
          to: calculateAnchorStyles(inAnchor),
          addClass: 'in ' + classes,
          removeClass: 'out ' + startingClasses,
          delay: true
        });
      }

      function end() {
        clone.remove();
        outAnchor.removeClass(NG_ANIMATE_SHIM_CLASS_NAME);
        inAnchor.removeClass(NG_ANIMATE_SHIM_CLASS_NAME);
      }
    }

    function prepareTransitionAnimation(from, to, classes, anchors) {
      var fromAnimation = prepareRegularAnimation(from);
      var toAnimation = prepareRegularAnimation(to);

      var anchorAnimations = [];
      forEach(anchors, function(anchor) {
        var outElement = anchor['out'];
        var inElement = anchor['in'];
        var animator = prepareAnchoredAnimation(classes, outElement, inElement);
        if (animator) {
          anchorAnimations.push(animator);
        }
      });

      // no point in doing anything when there are no elements to animate
      if (!fromAnimation && !toAnimation && anchorAnimations.length === 0) return;

      return {
        start: function() {
          var animations = [];

          if (fromAnimation) {
            animations.push(fromAnimation.start());
          }

          if (toAnimation) {
            animations.push(toAnimation.start());
          }

          forEach(anchorAnimations, function(animation) {
            animations.push(animation.start());
          });

          var runner = new $$AnimateRunner({
            end: endFn,
            cancel: endFn // CSS-driven animations cannot be cancelled, only ended
          });

          $$AnimateRunner.all(animations, function(status) {
            runner.complete(status);
          });

          return runner;

          function endFn() {
            forEach(animations, function(animation) {
              animation.end();
            });
          }
        }
      };
    }

    function prepareRegularAnimation(details) {
      var element = details.element;
      var options = details.options || {};

      // we special case the leave animation since we want to ensure that
      // the element is removed as soon as the animation is over. Otherwise
      // a flicker might appear or the element may not be removed at all
      options.event = details.event;
      if (options.event === 'leave' && details.domOperation) {
        options.onDone = details.domOperation;
      }

      return $animateCss(element, options);
    }
  }];
}];

var $$AnimateJsProvider = ['$animateProvider', function($animateProvider) {
  this.$get = ['$injector', '$$AnimateRunner', '$$animateOptions', '$$rAFMutex',
       function($injector,   $$AnimateRunner,   $$animateOptions,   $$rAFMutex) {

    return function(element, event, classes, options) {
      // the `classes` argument is optional and if it is not used
      // then the classes will be resolved from the element's className
      // property as well as options.addClass/options.removeClass.
      if (arguments.length === 3 && isObject(classes)) {
        options = classes;
        classes = null;
      }

      options = $$animateOptions(element, options);
      if (!classes) {
        classes = element.attr('class') || '';
        if (options.addClass) {
          classes += ' ' + options.addClass;
        }
        if (options.removeClass) {
          classes += ' ' + options.removeClass;
        }
      }

      // the lookupAnimations function returns a series of animation objects that are
      // matched up with one or more of the CSS classes. These animation objects are
      // defined via the module.animation factory function. If nothing is detected then
      // we don't return anything which then makes $animation query the next driver.
      var animations = lookupAnimations(classes);
      var before, after;
      if (animations.length) {
        var afterFn, beforeFn;
        if (event == 'leave') {
          beforeFn = 'leave';
          afterFn = 'afterLeave';
        } else {
          beforeFn = 'before' + event.charAt(0).toUpperCase() + event.substr(1);
          afterFn = event;
        }

        if (event !== 'enter' && event !== 'move') {
          before = packageAnimations(element, event, options, animations, beforeFn);
        }
        after  = packageAnimations(element, event, options, animations, afterFn);
      }

      // no matching animations
      if (!before && !after) return;

      function applyOptions() {
        options.$domOperation();
        options.$applyClasses();
      }

      return {
        start: function() {
          var closeActiveAnimations;
          var chain = [];

          if (before) {
            chain.push(function(fn) {
              closeActiveAnimations = before(fn);
            });
          }

          if (chain.length) {
            chain.push(function(fn) {
              applyOptions();
              fn(true);
            });
          } else {
            applyOptions();
          }

          if (after) {
            chain.push(function(fn) {
              closeActiveAnimations = after(fn);
            });
          }

          var animationClosed = false;
          var runner = new $$AnimateRunner({
            end: function() {
              endAnimations();
            },
            cancel: function() {
              endAnimations(true);
            }
          });

          $$AnimateRunner.chain(chain, onComplete);
          return runner;

          function onComplete(success) {
            animationClosed = true;
            applyOptions();
            options.$applyStyles();
            runner.complete(success);
          }

          function endAnimations(cancelled) {
            if (!animationClosed) {
              (closeActiveAnimations || noop)(cancelled);
              onComplete(cancelled);
            }
          }
        }
      };
    };

    function executeAnimationFn(fn, element, event, options, onDone) {
      var classesToAdd = options.addClass;
      var classesToRemove = options.removeClass;

      var args;
      switch (event) {
        case 'animate':
          args = [element, options.from, options.to, onDone];
          break;

        case 'setClass':
          args = [element, classesToAdd, classesToRemove, onDone];
          break;

        case 'addClass':
          args = [element, classesToAdd, onDone];
          break;

        case 'removeClass':
          args = [element, classesToRemove, onDone];
          break;

        default:
          args = onDone ? [element, onDone] : [element];
          break;
      }

      args.push(options);

      var value = fn.apply(fn, args);

      // optional onEnd / onCancel callback
      return isFunction(value) ? value : noop;
    }

    function groupEventedAnimations(element, event, options, animations, fnName) {
      var operations = [];
      forEach(animations, function(ani) {
        var animation = ani[fnName];
        if (!animation) return;

        // note that all of these animations will run in parallel
        operations.push(function() {
          var runner;
          var endProgressCb;

          var resolved = false;
          var onAnimationComplete = function(rejected) {
            if (!resolved) {
              resolved = true;
              (endProgressCb || noop)(rejected);
              runner.complete(!rejected);
            }
          };

          runner = new $$AnimateRunner({
            end: function() {
              onAnimationComplete();
            },
            cancel: function() {
              onAnimationComplete(true);
            }
          });

          endProgressCb = executeAnimationFn(animation, element, event, options, function(result) {
            var cancelled = result === false;
            onAnimationComplete(cancelled);
          });

          return runner;
        });
      });

      return operations;
    }

    function packageAnimations(element, event, options, animations, fnName) {
      var operations = groupEventedAnimations(element, event, options, animations, fnName);
      if (operations.length === 0) {
        var a,b;
        if (fnName === 'beforeSetClass') {
          a = groupEventedAnimations(element, 'removeClass', options, animations, 'beforeRemoveClass');
          b = groupEventedAnimations(element, 'addClass', options, animations, 'beforeAddClass');
        } else if (fnName === 'setClass') {
          a = groupEventedAnimations(element, 'removeClass', options, animations, 'removeClass');
          b = groupEventedAnimations(element, 'addClass', options, animations, 'addClass');
        }

        if (a) {
          operations = operations.concat(a);
        }
        if (b) {
          operations = operations.concat(b);
        }
      }

      if (operations.length === 0) return;

      return function(callback) {
        var runners = [];
        if (operations.length) {
          forEach(operations, function(animateFn) {
            runners.push(animateFn());
          });
        }

        runners.length ? $$AnimateRunner.all(runners, callback) : callback();

        return function endFn(reject) {
          forEach(runners, function(runner) {
            reject ? runner.cancel() : runner.end();
          });
        };
      };
    }

    function lookupAnimations(classes) {
      classes = isArray(classes) ? classes : classes.split(' ');
      var matches = [], flagMap = {};
      for (var i=0; i < classes.length; i++) {
        var klass = classes[i],
            animationFactory = $animateProvider.$$registeredAnimations[klass];
        if (animationFactory && !flagMap[klass]) {
          matches.push($injector.get(animationFactory));
          flagMap[klass] = true;
        }
      }
      return matches;
    }
  }];
}];

var $$AnimateJsDriverProvider = ['$$animationProvider', function($$animationProvider) {
  $$animationProvider.drivers.push('$$animateJsDriver');
  this.$get = ['$$animateJs', function($$animateJs) {
    return function(details) {
      var element = details.element;
      var event = details.event;
      var options = details.options;
      var classes = details.classes;
      return $$animateJs(element, event, classes, options);
    };
  }];
}];

var $$AnimateOptionsFactory = ['$$jqLite', '$$animateClassResolver',
                       function($$jqLite,   $$animateClassResolver) {

  var KEY = '$$animate';
  return function(element, options) {
    options = options || {};
    if (options.$$element === element) return options;

    return extend({
      $$element: element,

      $merge: function(newOptions) {
        mergeOptions(element, this, newOptions);
        return this;
      },

      $domOperation: function() {
        var domOperation = this.$use('domOperation');
        (domOperation || noop)();
      },

      $applyClasses: function() {
        var addClass = this.$use('addClass');
        if (addClass) {
          $$jqLite.addClass(element, addClass);
        }

        var removeClass = this.$use('removeClass');
        if (removeClass) {
          $$jqLite.removeClass(element, removeClass);
        }
      },

      $applyStyles: function(from, to) {
        from = isDefined(from) ? from : true;
        if (from) {
          var fromStyles = this.$use('from');
          if (fromStyles) {
            element.css(fromStyles);
          }
        }

        to = isDefined(to) ? to : true;
        if (to) {
          var toStyles = this.$use('to');
          if (toStyles) {
            element.css(toStyles);
          }
        }
      },

      $use: function(key) {
        var usedKey = '$' + key + 'Used';
        if (!this[usedKey]) {
          this[usedKey] = true;
          return this[key];
        }
      },

      $used: function(key) {
        return this['$' + key + 'Used'];
      }
    }, options);
  };


  function mergeOptions(element, target, newOptions) {
    newOptions = newOptions || {};

    var toAdd = (target.addClass || '') + ' ' + (newOptions.addClass || '');
    var toRemove = (target.removeClass || '') + ' ' + (newOptions.removeClass || '');
    var classes = $$animateClassResolver(element.attr('class'), toAdd, toRemove);

    forEach(newOptions, function(value, name) {
      if (name.charAt(0) !== '$') {
        target[name] = value;
      }
    });

    if (classes.addClass) {
      target.addClass = classes.addClass;
    } else {
      delete target.addClass;
    }

    if (classes.removeClass) {
      target.removeClass = classes.removeClass;
    } else {
      delete target.removeClass;
    }
  }
}];

var NG_ANIMATE_ATTR_NAME = 'data-ng-animate';
var $$AnimateQueueProvider = ['$animateProvider', function($animateProvider) {
  var PRE_DIGEST_STATE = 1;
  var RUNNING_STATE = 2;

  var rules = this.rules = {
    skip: [],
    cancel: [],
    join: []
  };

  function isAllowed(ruleType, element, currentAnimation, previousAnimation) {
    return rules[ruleType].some(function(fn) {
      return fn(element, currentAnimation, previousAnimation);
    });
  }

  function hasAnimationClasses(options, and) {
    options = options || {};
    var a = (options.addClass || '').length > 0;
    var b = (options.removeClass || '').length > 0;
    return and ? a && b : a || b;
  }

  rules.join.push(function(element, newAnimation, currentAnimation) {
    // if the new animation is class-based then we can just tack that on
    return !newAnimation.structural && hasAnimationClasses(newAnimation);
  });

  rules.skip.push(function(element, newAnimation, currentAnimation) {
    // there is no need to animate anything if no classes are being added and
    // there is no structural animation that will be triggered
    return !newAnimation.structural && !hasAnimationClasses(newAnimation);
  });

  rules.skip.push(function(element, newAnimation, currentAnimation) {
    // why should we trigger a new structural animation if the element will
    // be removed from the DOM anyway?
    return currentAnimation.event == 'leave' && newAnimation.structural;
  });

  rules.skip.push(function(element, newAnimation, currentAnimation) {
    // if there is a current animation then skip the class-based animation
    return currentAnimation.structural && !newAnimation.structural;
  });

  rules.cancel.push(function(element, newAnimation, currentAnimation) {
    // there can never be two structural animations running at the same time
    return currentAnimation.structural && newAnimation.structural;
  });

  rules.cancel.push(function(element, newAnimation, currentAnimation) {
    // if the previous animation is already running, but the new animation will
    // be triggered, but the new animation is structural
    return currentAnimation.state === RUNNING_STATE && newAnimation.structural;
  });

  this.$get = ['$$rAF', '$rootScope', '$rootElement', '$document', '$$HashMap',
               '$$animation', '$$AnimateRunner', '$templateRequest', '$$animateOptions',
       function($$rAF,   $rootScope,   $rootElement,   $document,   $$HashMap,
                $$animation,   $$AnimateRunner,   $templateRequest,   $$animateOptions) {

    var activeAnimationsLookup = new $$HashMap();
    var disabledElementsLookup = new $$HashMap();

    var animationsEnabled = null;

    // Wait until all directive and route-related templates are downloaded and
    // compiled. The $templateRequest.totalPendingRequests variable keeps track of
    // all of the remote templates being currently downloaded. If there are no
    // templates currently downloading then the watcher will still fire anyway.
    var deregisterWatch = $rootScope.$watch(
      function() { return $templateRequest.totalPendingRequests; },
      function(val, oldVal) {
        if (val !== 0) return;
        deregisterWatch();

        // Now that all templates have been downloaded, $animate will wait until
        // the post digest queue is empty before enabling animations. By having two
        // calls to $postDigest calls we can ensure that the flag is enabled at the
        // very end of the post digest queue. Since all of the animations in $animate
        // use $postDigest, it's important that the code below executes at the end.
        // This basically means that the page is fully downloaded and compiled before
        // any animations are triggered.
        $rootScope.$$postDigest(function() {
          $rootScope.$$postDigest(function() {
            // we check for null directly in the event that the application already called
            // .enabled() with whatever arguments that it provided it with
            if (animationsEnabled === null) {
              animationsEnabled = true;
            }
          });
        });
      }
    );

    var callbackRegistry = {};
    var callbackCounter = 0;

    // remember that the classNameFilter is set during the provider/config
    // stage therefore we can optimize here and setup a helper function
    var classNameFilter = $animateProvider.classNameFilter();
    var isAnimatableClassName = !classNameFilter
              ? function() { return true; }
              : function(className) {
                return classNameFilter.test(className);
              };

    function nextCallbackID() {
      return '__animateID__' + (callbackCounter++);
    }

    function findCallbacks(element, event) {
      var isGeneratedID = false;
      var id = element.attr('id');
      if (!element.attr('id')) {
        isGeneratedID = true;
        id = nextCallbackID();
        element.attr('id', id);
      }

      var matches = [];
      var entries = callbackRegistry[event];
      if (entries) {
        forEach(entries, function(entry) {
          var node = entry.node;
          if (node.getAttribute('id') === id || node.querySelector('#' + id)) {
            matches.push(entry.callback);
          }
        });
      }

      if (isGeneratedID) {
        element.removeAttr('id');
      }

      return matches;
    }

    function triggerCallback(event, element, phase, data) {
      $$rAF(function() {
        forEach(findCallbacks(element, event), function(callback) {
          callback(element, phase, data);
        });
      });
    }

    return {
      on: function(event, container, callback) {
        var node = extractElementNode(container);
        callbackRegistry[event] = callbackRegistry[event] || [];
        callbackRegistry[event].push({
          node: node,
          callback: callback
        });
      },

      off: function(event, container, callback) {
        var entries = callbackRegistry[event];
        if (!entries) return;

        switch (arguments.length) {
          case 1:
            delete callbackRegistry[event];
            break;

          case 2:
            callbackRegistry[event] = filterFromRegistry(entries, container);
            break;

          case 3:
            callbackRegistry[event] = filterFromRegistry(entries, container, callback);
            break;
        }

        function filterFromRegistry(list, matchContainer, matchCallback) {
          var containerNode = matchContainer[0];
          return list.filter(function(entry) {
            var isMatch = entry.node === containerNode &&
                            (!matchCallback || entry.callback === matchCallback);
            return !isMatch;
          });
        }
      },

      push: function(element, event, options, domOperation) {
        element = stripCommentsFromElement(element);
        options = options || {};
        options.domOperation = domOperation;
        return queueAnimation(element, event, options);
      },

      enabled: function(bool) {
        var argCount = arguments.length;
        if (isElement(bool)) {
          var element = bool;
          var node = element.length ? element[0] : element;
          var recordExists = disabledElementsLookup.get(node);

          // if nothing is set then the animation is enabled
          bool = !recordExists;

          if (argCount > 1) {
            bool = !!arguments[1];
            if (!bool) {
              disabledElementsLookup.put(node, true);
            } else if (recordExists) {
              disabledElementsLookup.remove(node);
            }
          }
        } else if (argCount === 1) {
          bool = animationsEnabled = !!bool;
        } else {
          bool = animationsEnabled;
        }

        return bool === true;
      }
    };

    function queueAnimation(element, event, options) {
      options = $$animateOptions(element, options);
      var node = element[0];
      var parent = element.parent();

      // we create a fake runner with a working promise.
      // These methods will become available after the digest has passed
      var runner = new $$AnimateRunner();

      // there are situations where a directive issues an animation for
      // a jqLite wrapper that contains only comment nodes... If this
      // happens then there is no way we can perform an animation
      if (!node) {
        runner.end();
        return runner;
      }

      if (isArray(options.addClass)) {
        options.addClass = options.addClass.join(' ');
      }

      if (isArray(options.removeClass)) {
        options.removeClass = options.removeClass.join(' ');
      }

      var className = [node.className, options.addClass, options.removeClass].join(' ');
      if (!isAnimatableClassName(className)) {
        runner.end();
        return runner;
      }

      var isStructural = ['enter', 'move', 'leave'].indexOf(event) >= 0;
      var existingAnimation = activeAnimationsLookup.get(node) || {};
      var existingAnimationExists = !!existingAnimation.state;

      // this is a hard disable of all animations for the application or on
      // the element itself, therefore  there is no need to continue further
      // past this point if not enabled
      var skipAnimations = !animationsEnabled || disabledElementsLookup.get(node);

      // there is no point in traversing the same collection of parent ancestors if a followup
      // animation will be run on the same element that already did all that checking work
      if (!skipAnimations && (!existingAnimationExists || existingAnimation.state != PRE_DIGEST_STATE)) {
        skipAnimations = !areAnimationsAllowed(element, parent, event);
      }

      if (skipAnimations) {
        close();
        return runner;
      }

      if (isStructural) {
        closeChildAnimations(element);
      }

      var newAnimation = {
        structural: isStructural,
        element: element,
        event: event,
        options: options,
        runner: runner
      };

      if (existingAnimationExists) {
        var skipAnimationFlag = isAllowed('skip', element, newAnimation, existingAnimation);
        if (skipAnimationFlag) {
          if (existingAnimation.state === RUNNING_STATE) {
            close();
            return runner;
          } else {
            existingAnimation.options.$merge(options);
            return existingAnimation.runner;
          }
        }

        var cancelAnimationFlag = isAllowed('cancel', element, newAnimation, existingAnimation);
        if (cancelAnimationFlag) {
          if (existingAnimation.state === RUNNING_STATE) {
            existingAnimation.runner.end();
          } else {
            newAnimation.options.$merge(existingAnimation.options);
          }
        } else {
          // a joined animation means that this animation will take over the existing one
          // so an example would involve a leave animation taking over an enter. Then when
          // the postDigest kicks in the enter will be ignored.
          var joinAnimationFlag = isAllowed('join', element, newAnimation, existingAnimation);
          if (joinAnimationFlag) {
            event = newAnimation.event = existingAnimation.event;
            options = newAnimation.options.$merge(options);
          }
        }
      } else {
        // a call to merge just normalizes the CSS classes on the options object
        // normalization in this case means that it removes redundant CSS classes that
        // already exist (addClass) or do not exist (removeClass) on the element
        options.$merge({});
      }

      closeParentClassBasedAnimations(parent);

      // the counter keeps track of cancelled animations
      var counter = (existingAnimation.counter || 0) + 1;
      newAnimation.counter = counter;

      markElementAnimationState(element, PRE_DIGEST_STATE, newAnimation);

      $rootScope.$$postDigest(function() {
        var details = activeAnimationsLookup.get(node);
        var animationCancelled = !details;
        details = details || {};

        // if addClass/removeClass is called before something like enter then the
        // registered parent element may not be present. The code below will ensure
        // that a final value for parent element is obtained
        var parentElement = element.parent() || [];

        // animate/structural/class-based animations all have requirements. Otherwise there
        // is no point in performing an animation. The parent node must also be set.
        var isValidAnimation = parentElement.length > 0
                                && (details.event === 'animate'
                                    || details.structural
                                    || hasAnimationClasses(details.options));

        // this means that the previous animation was cancelled
        // even if the follow-up animation is the same event
        if (animationCancelled || details.counter !== counter || !isValidAnimation) {
          // if another animation did not take over then we need
          // to make sure that the domOperation and options are
          // handled accordingly
          if (animationCancelled) {
            options.$applyClasses();
            options.$applyStyles();
          }

          // if the event changed from something like enter to leave then we do
          // it, otherwise if it's the same then the end result will be the same too
          if (animationCancelled || (isStructural && details.event !== event)) {
            options.$domOperation();
          }

          return;
        }

        // this combined multiple class to addClass / removeClass into a setClass event
        // so long as a structural event did not take over the animation
        event = !details.structural && hasAnimationClasses(details.options, true)
            ? 'setClass'
            : details.event;

        closeParentClassBasedAnimations(parentElement);

        markElementAnimationState(element, RUNNING_STATE);
        var realRunner = $$animation(element, event, details.options);
        realRunner.done(function(status) {
          close(!status);
          var details = activeAnimationsLookup.get(node);
          if (details && details.counter === counter) {
            clearElementAnimationState(element);
          }
          notifyProgress(runner, event, 'close', {});
        });

        // this will update the runner's flow-control events based on
        // the `realRunner` object.
        runner.setHost(realRunner);
        notifyProgress(runner, event, 'start', {});
      });

      return runner;

      function notifyProgress(runner, event, phase, data) {
        triggerCallback(event, element, phase, data);
        runner.progress(event, phase, data);
      }

      function close(reject) { // jshint ignore:line
        options.$applyClasses();
        options.$applyStyles();
        options.$domOperation();
        runner.complete(!reject);
      }
    }

    function closeChildAnimations(element) {
      var node = element[0];
      var children = node.querySelectorAll('[' + NG_ANIMATE_ATTR_NAME + ']');
      forEach(children, function(child) {
        var state = parseInt(child.getAttribute(NG_ANIMATE_ATTR_NAME));
        var details = activeAnimationsLookup.get(child);
        switch (state) {
          case RUNNING_STATE:
            details.runner.end();
            /* falls through */
          case PRE_DIGEST_STATE:
            if (details) {
              activeAnimationsLookup.remove(child);
            }
            break;
        }
      });
    }

    function clearElementAnimationState(element) {
      element = element.length ? element[0] : element;
      element.removeAttribute(NG_ANIMATE_ATTR_NAME);
      activeAnimationsLookup.remove(element);
    }

    function isMatchingElement(a,b) {
      a = a.length ? a[0] : a;
      b = b.length ? b[0] : b;
      return a === b;
    }

    function closeParentClassBasedAnimations(startingElement) {
      var parentNode = startingElement[0];
      do {
        if (!parentNode || parentNode.nodeType !== ELEMENT_NODE) break;

        var details = activeAnimationsLookup.get(parentNode);
        if (details) {
          examineParentAnimation(parentNode, details);
        }

        parentNode = parentNode.parentNode;
      } while (true);

      // since animations are detected from CSS classes, we need to flush all parent
      // class-based animations so that the parent classes are all present for child
      // animations to properly function (otherwise any CSS selectors may not work)
      function examineParentAnimation(node, animationDetails) {
        // enter/leave/move always have priority
        if (animationDetails.structural) return;

        if (animationDetails.state === RUNNING_STATE) {
          animationDetails.runner.end();
        }
        clearElementAnimationState(node);
      }
    }

    function areAnimationsAllowed(element, parent, event) {
      var bodyElement = jqLite($document[0].body);
      var bodyElementDetected = false;
      var rootElementDetected = false;
      var parentAnimationDetected = false;
      var animateChildren;

      while (parent && parent.length) {
        var parentNode = parent[0];
        if (parentNode.nodeType !== ELEMENT_NODE) {
          // no point in inspecting the #document element
          break;
        }

        var details = activeAnimationsLookup.get(parentNode) || {};
        // either an enter, leave or move animation will commence
        // therefore we can't allow any animations to take place
        // but if a parent animation is class-based then that's ok
        if (!parentAnimationDetected) {
          parentAnimationDetected = details.structural || disabledElementsLookup.get(parentNode);
        }

        if (isUndefined(animateChildren) || animateChildren === true) {
          var value = parent.data(NG_ANIMATE_CHILDREN_DATA);
          if (isDefined(value)) {
            animateChildren = value;
          }
        }

        if (!rootElementDetected) {
          // angular doesn't want to attempt to animate elements outside of the application
          // therefore we need to ensure that the rootElement is an ancestor of the current element
          rootElementDetected = isMatchingElement(parent, $rootElement);
        }

        if (!bodyElementDetected) {
          // we also need to ensure that the element is or will be apart of the body element
          // otherwise it is pointless to even issue an animation to be rendered
          bodyElementDetected = isMatchingElement(parent, bodyElement);
        }

        parent = parent.parent();
      }

      var allowAnimation = !parentAnimationDetected || animateChildren;
      return allowAnimation && rootElementDetected && bodyElementDetected;
    }

    function markElementAnimationState(element, state, details) {
      details = details || {};
      details.state = state;

      element = element.length ? element[0] : element;
      element.setAttribute(NG_ANIMATE_ATTR_NAME, state);

      var oldValue = activeAnimationsLookup.get(element);
      var newValue = oldValue
          ? extend(oldValue, details)
          : details;
      activeAnimationsLookup.put(element, newValue);
    }
  }];
}];

var $$rAFMutexFactory = ['$$rAF', function($$rAF) {
  return function() {
    var passed = false;
    $$rAF(function() {
      passed = true;
    });
    return function(fn) {
      passed ? fn() : $$rAF(fn);
    };
  };
}];

var $$AnimateRunnerFactory = ['$q', '$$rAFMutex', function($q, $$rAFMutex) {
  var DONE_PENDING_STATE = 1;
  var DONE_COMPLETE_STATE = 2;

  AnimateRunner.chain = function(chain, callback) {
    var index = 0;

    next();
    function next() {
      if (index === chain.length) {
        callback(true);
        return;
      }

      chain[index](function(response) {
        if (response === false) {
          callback(false);
          return;
        }
        index++;
        next();
      });
    }
  };

  AnimateRunner.all = function(runners, callback) {
    var count = 0;
    var status = true;
    forEach(runners, function(runner) {
      runner.done(onProgress);
    });

    function onProgress(response) {
      status = status && response;
      if (++count === runners.length) {
        callback(status);
      }
    }
  };

  function AnimateRunner(host) {
    this.setHost(host);

    this._doneCallbacks = [];
    this._runInAnimationFrame = $$rAFMutex();
    this._state = 0;
  }

  AnimateRunner.prototype = {
    setHost: function(host) {
      this.host = host || {};
    },

    done: function(fn) {
      if (this.state === DONE_COMPLETE_STATE) {
        fn();
      } else {
        this._doneCallbacks.push(fn);
      }
    },

    progress: noop,

    getPromise: function() {
      if (!this.promise) {
        var self = this;
        this.promise = $q(function(resolve, reject) {
          self.done(function(status) {
            status === false ? reject() : resolve();
          });
        });
      }
      return this.promise;
    },

    then: function(resolveHandler, rejectHandler) {
      return this.getPromise().then(resolveHandler, rejectHandler);
    },

    pause: function() {
      this.host.pause && this.host.pause();
    },

    resume: function() {
      this.host.resume && this.host.resume();
    },

    end: function() {
      this.host.end && this.host.end();
      this._resolve(true);
    },

    cancel: function() {
      this.host.cancel && this.host.cancel();
      this._resolve(false);
    },

    complete: function(response) {
      var self = this;
      if (self._state === 0) {
        self._state = DONE_PENDING_STATE;
        self._runInAnimationFrame(function() {
          self._resolve(response);
        });
      }
    },

    _resolve: function(response) {
      if (this._state !== DONE_COMPLETE_STATE) {
        angular.forEach(this._doneCallbacks, function(fn) {
          fn(response);
        });
        this._doneCallbacks.length = 0;
        this._state = DONE_COMPLETE_STATE;
      }
    }
  };

  return AnimateRunner;
}];

var $$AnimationProvider = ['$animateProvider', function($animateProvider) {
  var NG_ANIMATE_CLASSNAME = 'ng-animate';
  var NG_ANIMATE_REF_ATTR = 'ng-animate-ref';

  var drivers = this.drivers = [];

  var RUNNER_STORAGE_KEY = '$$animationRunner';

  function setRunner(element, runner) {
    element.data(RUNNER_STORAGE_KEY, runner);
  }

  function removeRunner(element) {
    element.removeData(RUNNER_STORAGE_KEY);
  }

  function getRunner(element) {
    return element.data(RUNNER_STORAGE_KEY);
  }

  this.$get = ['$$jqLite', '$rootScope', '$injector', '$$AnimateRunner', '$$animateOptions',
       function($$jqLite,   $rootScope,   $injector,   $$AnimateRunner,   $$animateOptions) {

    var animationQueue = [];

    return function(element, event, options) {
      options = $$animateOptions(element, options);

      // there is no animation at the current moment, however
      // these runner methods will get later updated with the
      // methods leading into the driver's end/cancel methods
      // for now they just stop the animation from starting
      var runner = new $$AnimateRunner({
        end: function() { close(); },
        cancel: function() { close(true); }
      });

      if (!drivers.length) {
        close();
        return runner;
      }

      setRunner(element, runner);

      var classes = mergeClasses(element.attr('class'), mergeClasses(options.addClass, options.removeClass));
      var tempClasses = options.$use('tempClasses');
      if (tempClasses) {
        classes += ' ' + tempClasses;
      }

      animationQueue.push({
        // this data is used by the postDigest code and passed into
        // the driver step function
        element: element,
        classes: classes,
        event: event,
        options: options,
        start: start,
        close: close
      });

      element.on('$destroy', handleDestroyedElement);

      // we only want there to be one function called within the post digest
      // block. This way we can group animations for all the animations that
      // were apart of the same postDigest flush call.
      if (animationQueue.length > 1) return runner;

      $rootScope.$$postDigest(function() {
        var animations = [];
        forEach(animationQueue, function(entry) {
          // the element was destroyed early on which removed the runner
          // form its storage. This means we can't animate this element
          // at all and it already has been closed due to destruction.
          if (getRunner(entry.element)) {
            animations.push(entry);
          }
        });

        // now any future animations will be in another postDigest
        animationQueue.length = 0;

        forEach(groupAnimations(animations), function(animationEntry) {
          var startFn = animationEntry.start;
          var closeFn = animationEntry.close;
          var operation = invokeFirstDriver(animationEntry);
          var startAnimation = operation && (isFunction(operation) ? operation : operation.start);
          if (!startAnimation) {
            closeFn();
          } else {
            startFn();
            var animationRunner = startAnimation();
            animationRunner.then(function() {
              closeFn();
            }, function() {
              closeFn(true);
            });

            updateAnimationRunners(animationEntry, animationRunner);
          }
        });
      });

      return runner;

      function getAnchorNodes(node) {
        var SELECTOR = '[' + NG_ANIMATE_REF_ATTR + ']';
        var items = node.hasAttribute(NG_ANIMATE_REF_ATTR)
              ? [node]
              : node.querySelectorAll(SELECTOR);
        var anchors = [];
        forEach(items, function(node) {
          var attr = node.getAttribute(NG_ANIMATE_REF_ATTR);
          if (attr && attr.length) {
            anchors.push(node);
          }
        });
        return anchors;
      }

      function groupAnimations(animations) {
        var preparedAnimations = [];
        var refLookup = {};
        forEach(animations, function(animation, index) {
          var element = animation.element;
          var node = element[0];
          var event = animation.event;
          var enterOrMove = ['enter', 'move'].indexOf(event) >= 0;
          var structural = enterOrMove || event === 'leave';
          var anchorNodes = structural ? getAnchorNodes(node) : [];

          if (anchorNodes.length) {
            var direction = enterOrMove ? 'to' : 'from';

            forEach(anchorNodes, function(anchor) {
              var key = anchor.getAttribute(NG_ANIMATE_REF_ATTR);
              refLookup[key] = refLookup[key] || {};
              refLookup[key][direction] = {
                animationID: index,
                element: jqLite(anchor)
              };
            });
          } else {
            preparedAnimations.push(animation);
          }
        });

        var usedIndicesLookup = {};
        var anchorGroups = {};
        forEach(refLookup, function(operations, key) {
          var from = operations.from;
          var to = operations.to;

          if (!from || !to) {
            // only one of these is set therefore we can't have an
            // anchor animation since all three pieces are required
            var index = from ? from.animationID : to.animationID;
            var indexKey = index.toString();
            if (!usedIndicesLookup[indexKey]) {
              usedIndicesLookup[indexKey] = true;
              preparedAnimations.push(animations[index]);
            }
            return;
          }

          var fromAnimation = animations[from.animationID];
          var toAnimation = animations[to.animationID];
          var lookupKey = from.animationID.toString();
          if (!anchorGroups[lookupKey]) {
            var group = anchorGroups[lookupKey] = {
              start: function() {
                fromAnimation.start();
                toAnimation.start();
              },
              close: function() {
                fromAnimation.close();
                toAnimation.close();
              },
              classes: cssClassesIntersection(fromAnimation.classes, toAnimation.classes),
              from: fromAnimation,
              to: toAnimation,
              anchors: []
            };

            // the anchor animations require that the from and to elements both have atleast
            // one shared CSS class which effictively marries the two elements together to use
            // the same animation driver and to properly sequence the anchor animation.
            if (group.classes.length) {
              preparedAnimations.push(group);
            } else {
              preparedAnimations.push(fromAnimation);
              preparedAnimations.push(toAnimation);
            }
          }

          anchorGroups[lookupKey].anchors.push({
            'out': from.element, 'in': to.element
          });
        });

        return preparedAnimations;
      }

      function cssClassesIntersection(a,b) {
        a = a.split(' ');
        b = b.split(' ');
        var matches = [];

        for (var i = 0; i < a.length; i++) {
          for (var j = 0; j < b.length; j++) {
            var aa = a[i];
            if (aa.substring(0,3) !== 'ng-' && aa === b[j]) {
              matches.push(aa);
            }
          }
        }

        return matches.join(' ');
      }

      function invokeFirstDriver(details) {
        // we loop in reverse order since the more general drivers (like CSS and JS)
        // may attempt more elements, but custom drivers are more particular
        for (var i = drivers.length - 1; i >= 0; i--) {
          var driverName = drivers[i];
          if (!$injector.has(driverName)) continue;

          var factory = $injector.get(driverName);
          var driver = factory(details);
          if (driver) {
            return driver;
          }
        }
      }

      function start() {
        element.addClass(NG_ANIMATE_CLASSNAME);
        if (tempClasses) {
          $$jqLite.addClass(element, tempClasses);
        }
      }

      function updateAnimationRunners(animation, newRunner) {
        if (animation.from && animation.to) {
          update(animation.from.element);
          update(animation.to.element);
        } else {
          update(animation.element);
        }

        function update(element) {
          getRunner(element).setHost(newRunner);
        }
      }

      function handleDestroyedElement() {
        var runner = getRunner(element);
        if (runner && (event !== 'leave' || !options.$used('domOperation'))) {
          runner.end();
        }
      }

      function close(rejected) { // jshint ignore:line
        element.off('$destroy', handleDestroyedElement);
        removeRunner(element);

        options.$applyStyles();
        options.$applyClasses();
        options.$domOperation();

        if (tempClasses) {
          $$jqLite.removeClass(element, tempClasses);
        }

        element.removeClass(NG_ANIMATE_CLASSNAME);
        runner.complete(!rejected);
      }
    };
  }];
}];

/* global angularAnimateModule: true,

   $$rAFMutexFactory,
   $$AnimateChildrenDirective,
   $$AnimateRunnerFactory,
   $$AnimateOptionsFactory,
   $$AnimateQueueProvider,
   $$AnimationProvider,
   $AnimateCssProvider,
   $$AnimateCssDriverProvider,
   $$AnimateJsProvider,
   $$AnimateJsDriverProvider,
*/
angular.module('ngAnimate', [])
  .directive('ngAnimateChildren', $$AnimateChildrenDirective)

  .factory('$$rAFMutex', $$rAFMutexFactory)

  .factory('$$AnimateRunner', $$AnimateRunnerFactory)
  .factory('$$animateOptions', $$AnimateOptionsFactory)

  .provider('$$animateQueue', $$AnimateQueueProvider)
  .provider('$$animation', $$AnimationProvider)

  .provider('$animateCss', $AnimateCssProvider)
  .provider('$$animateCssDriver', $$AnimateCssDriverProvider)

  .provider('$$animateJs', $$AnimateJsProvider)
  .provider('$$animateJsDriver', $$AnimateJsDriverProvider);


})(window, window.angular);
