angular.module('AppSearch', [])
  .factory('appSearch', ['$rootScope', '$q', function($rootScope, $q) {
    var engine = lunr(function () {
      this.ref('id');
      this.field('title', {boost: 50});
      this.field('tags', { boost : 20 });
      this.field('desc');
    });

    var wrapper =  {
      search : function(q) {
        q = q || '';
        if(q.length > 1)  {
          var self = this, results = [], data = engine.search(q);
          angular.forEach(data, function(item) {
            var index = parseInt(item.ref);
            results.push(self.data[index]);
          });
          return results;
        }
        return this.data;
      },
      item : function(index) {
        return this.data[index];
      },
      load : function() {
        this.data = [];
        var self = this;
        angular.forEach(RESULTS.projects, function(item, index) {
          item.id = index;
          self.data.push(item);

          engine.add({
            id: index,
            title: item.name,
            tags: item.tags.join(' '),
            desc : item.desc
          })
        });
      }
    }

    wrapper.load();

    return wrapper;
  }]);
