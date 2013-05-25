//you need to include angular-mocks.js into karma to make this work
describe('Testing Sync Animations', function() {

  beforeEach(module('AppAnimations'));

  var w;
  beforeEach(module(function($provide) {
    w = window;
    var setTimeout = window.setTimeout,
        fnQueue = [];
    w.setTimeout = function(fn, delay) {
      fnQueue.push({
        delay : delay,
        process : fn
      });
    };
    w.setTimeout.expect = function(delay) {
      var first = fnQueue.shift();
      expect(first.delay).to.equal(delay);
      return first;
    };
    $provide.value('$window', w);
  }));

  it("should synchronously test the animation",
    inject(function($animator, $document, $rootScope) {

    var body = angular.element($document[0].body);
    var element = angular.element('<div>hello</div>');

    var animator = $animator($rootScope, {
      ngAnimate: '{enter:\'list-in\', leave:\'list-out\'}'
    });

    animator.enter(element, body);

    expect(element.hasClass('list-in')).to.equal(true);
    window.setTimeout.expect(1).process(); //the setup function
    expect(element.hasClass('list-in-active')).to.equal(true);
    window.setTimeout.expect(1000).process(); //the start function

    //now that the animation is over (timeout is gone)
    expect(element.hasClass('list-in')).to.equal(false);
    expect(element.hasClass('list-in-active')).to.equal(false);
  }));

});
