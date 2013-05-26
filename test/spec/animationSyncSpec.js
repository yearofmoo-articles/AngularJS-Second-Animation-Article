//you need to include angular-mocks.js into karma to make this work
describe('Testing Sync Animations', function() {

  beforeEach(module('AppAnimations'));

  var setTimeout;
  beforeEach(module(function($provide) {
    setTimeout = window.setTimeout;

    var fnQueue = [];
    window.setTimeout = function(fn, delay) {
      fnQueue.push({
        delay : delay,
        process : fn
      });
    };
    window.setTimeout.expect = function(delay) {
      var first = fnQueue.shift();
      expect(first.delay).to.equal(delay);
      return first;
    };
    $provide.value('$window', window);
  }));

  afterEach(function() {
    window.setTimeout = setTimeout;
  });

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
