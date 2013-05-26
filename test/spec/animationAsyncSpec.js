//you need to include angular-mocks.js into karma to make this work
describe('Testing Async Animations', function() {

  beforeEach(module('AppAnimations'));

  var $animator, $document, $window, $rootScope;
  beforeEach(inject(function(_$animator_, _$document_, _$window_, _$rootScope_) {
    $animator = _$animator_;
    $document = _$document_;
    $window   = _$window_;
    $rootScope = _$rootScope_;
  }));

  it("should asynchronously test the animation", function(done) {
    var body = angular.element($document[0].body);
    var element = angular.element('<div>hello</div>');

    var animator = $animator($rootScope, {
      ngAnimate: '{enter:\'list-in\', leave:\'list-out\'}'
    });

    element.css('opacity', 0);
    animator.enter(element, body);

    //lets add 100ms just to be safe
    var timeout = 1100;
    $window.setTimeout(function() {
      expect(element.css('opacity')).to.equal("1");
      done();
    }, timeout);
  });

});
