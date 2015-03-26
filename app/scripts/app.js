angular.module('AngularPortfolio',
  ['ngRoute',
   'ngAnimate',

   'AppSearch',
   'AppAnimations'])

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

    $scope.getListAnimation = function() {
      if($scope.library == 'greensock') {
        return 'list';
      }
      else if($scope.library == 'animatecss') {
        return 'dn-bounce';
      }
      else if($scope.library == 'custom') {
        return 'custom';
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

  .directive('appFocus', ['appSearch','$rootScope','$compile','$animate','$templateCache',
    function(appSearch, $rootScope, $compile, $animate, $templateCache) {

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

        var cursor = element, parent = cursor.parent();
        while(cursor && cursor.position().left > 100) {
          cursor = cursor.prev();
        }

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
            $animate.addClass(formerContainer, 'ng-hide');
            formerContainer = former = null;
          }
          else {
            $animate.leave(former);
          }
        }
        formerIndex = rowIndex;
        formerID = element.attr('id');

        var isNew = !formerContainer;
        if(!formerContainer) {
          formerContainer = angular.element('<div class="focus"></div>');
          row[0].before(formerContainer);
          formerContainer.addClass('ng-hide');
        }

        var html = $templateCache.get('focus');
        former = angular.element('<div class="focus-slide">' + html + '</div>');
        $compile(former)($scope);
        if(isNew) {
          $animate.removeClass(formerContainer, 'ng-hide');
        }

        $scope.$apply(function() {
          $animate.enter(former, formerContainer);
        });
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
