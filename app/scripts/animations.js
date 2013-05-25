angular.module('AppAnimations', [])
  .animation('list-out', ['$window',function($window) {
    return {
      start : function(element, done) {
        TweenMax.set(element, {position:'relative'});

        var duration = 1; 
        //we can use onComplete:done with TweenMax, but lets use
        //a delay value for testing purposes
        TweenMax.to(element, 1, {opacity:0, width:0});
        $window.setTimeout(done, duration * 1000);
      }
    }
  }])

  .animation('list-in', ['$window',function($window) {
    return {
      setup: function(element) {
        TweenMax.set(element, {opacity:0, width:0});
      },
      start : function(element, done) {
        var duration = 1; 
        //we can use onComplete:done with TweenMax, but lets use
        //a delay value for testing purposes
        TweenMax.to(element, duration, {opacity:1, width:210});
        $window.setTimeout(done, duration * 1000);
      }
    }
  }])

  .animation('list-move', ['$window',function($window) {
    return {
      start : function(element, done) {
        var duration = 1; 
        //we can use onComplete:done with TweenMax, but lets use
        //a delay value for testing purposes
        TweenMax.to(element, duration, {opacity:1, width:210});
        $window.setTimeout(done, duration * 1000);
      }
    }
  }])

  .animation('focus-leave', function() {
    return {
      setup : function(element, done) {
        var items = element.find('.ani');
        TweenMax.set(items, {position:'relative'});
        return items;
      },
      start : function(element, done, items) {
        TweenMax.staggerTo(items, 1, {left:-500, opacity:0}, 0.1, done);
      }
    }
  })

  .animation('focus-enter', ['$window', function($window) {
    return {
      setup : function(element, done) {
        var items = element.find('.ani');
        TweenMax.set(items, {position:'relative', left:500, opacity:0});
        return items;
      },
      start : function(element, done, items) {
        var parent = element.parent('.focus');
        var timeout = parent.children().length > 1 ? 300 : 1;
        $window.setTimeout(function() {
          TweenMax.staggerTo(items, 1, {left:0, opacity:1}, 0.1, done);
        }, timeout);
      }
    }
  }])

  .animation('focus-show', function() {
    return {
      start : function(element, done, items) {
        TweenMax.set(element, {height:0,display:'block'});
        TweenMax.to(element, 0.5, {height:300, onComplete:done});
      }
    }
  })

  .animation('focus-hide', function() {
    return {
      start : function(element, done, items) {
        TweenMax.to(element, 0.5, {
          height:0,
          onComplete:function() {
            done();
            element.remove();
          }
        });
      }
    }
  })
