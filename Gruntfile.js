module.exports = function(grunt) {

  grunt.loadNpmTasks('grunt-shell');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-connect');

  grunt.initConfig({
    shell: {
      install: {
        command: 'npm install; ./node_modules/bower/bin/bower install'
      },
      gumby_fonts: {
        command: 'cp -R components/gumby/fonts app/'
      },
    },
    connect: {
      development: {
        options: {
          port: 8100,
          hostname: '0.0.0.0',
          base: './app',
          keepalive: true
        }
      },
      test: {
        options: {
          port: 8200,
          hostname: '0.0.0.0',
          base: './app',
          keepalive: true
        }
      }
    },
    watch: {
      scripts: {
      files: ['app/scripts/*.js','app/styles/*.css'],
        tasks: ['concat'],
        options: {
          nospawn: true
        },
      },
    },
    concat: {
      app_js: {
        dest: './app/assets/app.js',
        src: [
          'bower_components/jquery/jquery.js',
          'app/lib/angular-1.2.0-bd26324/angular.js',
          'app/lib/angular-1.2.0-bd26324/angular-route.js',
          'app/lib/angular-1.2.0-bd26324/angular-animate.js',
          'bower_components/greensock-js/src/uncompressed/TweenMax.js',
          'node_modules/lunr/lunr.js',
          'bower_components/ngAnimate-animate.css/animate.js',
          'app/db/data.js',
          'app/scripts/animations.js',
          'app/scripts/search.js',
          'app/scripts/app.js'
        ]
      },
      app_css: {
        dest: './app/assets/app.css',
        src: [
          'bower_components/gumby/css/gumby.css',
          'bower_components/animate.css/animate.css',
          'app/styles/styles.css',
          'app/styles/animations.css'
        ]
      }
    }
  });

  //installation-related
  grunt.registerTask('install', ['shell:install']);
  grunt.registerTask('fonts', ['shell:gumby_fonts']);

  //default for development
  grunt.registerTask('default', ['fonts','concat','watch']);
  grunt.registerTask('serve', ['install','fonts','concat','connect:development']);

  //production
  grunt.registerTask('package', ['install','concat']);
};
