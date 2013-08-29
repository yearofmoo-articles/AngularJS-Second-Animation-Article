angular.module('AppAnimations', [])
  .animation('.list', ['$window',function($window) {
    return {
      leave : function(element, done) {
        TweenMax.set(element, {position:'relative'});

        var duration = 1; 
        //we can use onComplete:done with TweenMax, but lets use
        //a delay value for testing purposes
        TweenMax.to(element, 1, {opacity:0, width:0});
        $window.setTimeout(done, duration * 1000);
      },

      enter : function(element, done) {
        TweenMax.set(element, {opacity:0, width:0});
        var duration = 1; 
        //we can use onComplete:done with TweenMax, but lets use
        //a delay value for testing purposes
        TweenMax.to(element, duration, {opacity:1, width:210});
        $window.setTimeout(done, duration * 1000);
      },

      move : function(element, done) {
        var duration = 1; 
        //we can use onComplete:done with TweenMax, but lets use
        //a delay value for testing purposes
        TweenMax.to(element, duration, {opacity:1, width:210});
        $window.setTimeout(done, duration * 1000);
      }
    }
  }])

  .animation('.focus-slide', ['$window', function($window) {
    return {
      leave : function(element, done) {
        var items = element.find('.ani');
        TweenMax.set(items, {position:'relative'});
        TweenMax.staggerTo(items, 1, {left:-500, opacity:0}, 0.1, done);
      },

      enter : function(element, done) {
        var items = element.find('.ani');
        TweenMax.set(items, {position:'relative', left:500, opacity:0});
        var parent = element.parent('.focus');
        var timeout = parent.children().length > 1 ? 300 : 1;
        $window.setTimeout(function() {
          TweenMax.staggerTo(items, 1, {left:0, opacity:1}, 0.1, done);
        }, timeout);
      }
    };
  }])

  .animation('.focus', ['$window', function($window) {
    return {
      removeClass : function(element, className, done) {
        if(className == 'ng-hide') {
          element.removeClass('ng-hide');
          TweenMax.set(element, {height:0,display:'block'});
          TweenMax.to(element, 0.5, {height:300, onComplete:done});
        }
        else {
          done();
        }
      },

      addClass : function(element, className, done) {
        if(className == 'ng-hide') {
          TweenMax.to(element, 0.5, {
            height:0,
            onComplete:function() {
              done();
              element.remove();
            }
          });
        }
        else {
          done();
        }
      }
    };
  }]);
