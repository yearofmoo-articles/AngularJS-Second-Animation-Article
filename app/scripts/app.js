angular.module('AngularPortfolio', ['AppSearch','AppAnimations'])
  .config(['$routeProvider', function($routeProvider) {
    var shared = {
      controller: 'ListCtrl',
      templateUrl: './templates/list.html'
    };
    $routeProvider
      .when('/', shared)
      .otherwise({
        redirectTo : '/'
      });
  }])

  .controller('AppCtrl', ['$scope', '$rootScope', '$location', '$http', 'appSearch', function($scope, $rootScope, $location, $http, appSearch) {
    $scope.show_config = true;
    var defaultLibrary = $scope.library = 'greensock';
    $scope.limit = $scope.defaultLimit = 12;

    $scope.$watch('library', function() {
      if(defaultLibrary != $scope.library) {
        $scope.search();
      }
    });

    $scope.more = function() {
      $scope.limit += 6;
      $rootScope.$broadcast('results');
      $rootScope.$broadcast('more');
    };

    $scope.search = function(q) {
      $scope.results = appSearch.search(q);
      $scope.totalResults = $scope.results.length;
      $scope.limit = $scope.defaultLimit;
      $rootScope.$broadcast('results');
    };

    $scope.getFocusAnimation = function() {
      if($scope.library != '') {
        return {enter:'focus-enter',leave:'focus-leave',show:'focus-show',hide:'focus-hide'};
      }
    };

    $scope.getListAnimation = function() {
      if($scope.library == 'greensock') {
        return {leave:'list-out', enter:'list-in', move:'list-move'}
      }
      else if($scope.library == 'animatecss') {
        return {leave:'animated bounceOut', enter:'animated bounceIn', move:'animated bounceIn'}
      }
      else if($scope.library == 'custom') {
        return {leave:'custom-out', enter:'custom-in', move:'custom-in'}
      }
    };
  }])

  .controller('ListCtrl', ['$scope', '$rootScope', '$location', '$http', 'appSearch', function($scope, $rootScope, $location, $http, appSearch) {
    var q, s = $location.search().q;
    if(s == 'only-google') {
      q = 'google';
    }
    if(s == 'open-source') {
      q = 'open source';
    }
    else if(s == 'games') {
      q = 'games';
    }
    
    $scope.search(q);

    $scope.fetchResults = function(limit) {
      return $scope.results.slice(0,limit);
    };
  }])


  .directive('appScroll', function() {
    return function($scope, element) {
      $scope.$on('more', function() {
        $("html, body").animate({ scrollTop: $(document).height() }, "slow");
      });
    };
  })

  .directive('appFocus', ['appSearch','$rootScope','$compile','$animator',function(appSearch, $rootScope, $compile, $animator) {
    var former, formerContainer, formerID, formerIndex = -1;
    $rootScope.$on('results', function() {
      if(former) {
        formerContainer.remove();
        formerID = formerContainer = former = formerIndex = null;
      }
    });
    return function($scope, element, attrs) {
      element.bind('click', function() {
        if(formerID == element.attr('id')) return;
        var animator = $animator($scope, {
          ngAnimate: attrs.appFocus
        });

        var cursor = element, parent = cursor.parent();
        while(cursor && cursor.position().left > 100) {
          cursor = cursor.prev();
        }

        ngAnimate: attrs.appFocus
        var row = [], pos;
        do {
          row.push(cursor);
          cursor = cursor.next();
          pos = cursor ? cursor.position().left : 0;
        }
        while(pos > 100);

        var rowIndex = getRowIndex(element, row.length);

        if(former) {
          if(rowIndex != formerIndex) {
            animator.hide(formerContainer);
            formerContainer = former = null;
          }
          else {
            animator.leave(former);
          }
        }
        formerIndex = rowIndex;
        formerID = element.attr('id');

        var isNew = !formerContainer;
        if(!formerContainer) {
          formerContainer = angular.element('<div class="focus"></div>');
          row[0].before(formerContainer);
          formerContainer.hide();
        }

        former = angular.element('<div ng-include="\'focus\'" class="focus-slide"></div>');
        $compile(former)($scope);
        $scope.$apply();

        animator.enter(former, formerContainer);
        if(isNew) {
          animator.show(formerContainer);
        }
      });

      function getRowIndex(element, perRow) {
        var index = 0;
        var parent = element.parent('.results');
        var children = parent.children('.result');
        var elementID = element.attr('id');
        for(var i=0;i<children.length;i++) {
          var id = children[i].id;
          if(i && i % perRow == 0) {
            index++;
          }
          if(id == elementID) {
            break;
          }
        }
        return index;
      };
    }
  }]);
