basePath = '../';

files = [
  MOCHA,
  MOCHA_ADAPTER,
  './app/lib/angular.js',
  './app/lib/greensock-tweenmax.js',
  './app/lib/lunr.js',
  './node_modules/chai/chai.js',
  './test/chai-config.js',
  './app/scripts/search.js',
  './app/scripts/animations.js',
  './app/scripts/app.js',
  './test/lib/angular-mocks.js',
  './test/spec/**/*.js'
];

port = 9201;
runnerPort = 9301;
captureTimeout = 5000;

growl     = true;
colors    = true;
singleRun = false;
autoWatch = true;
browsers  = ['Chrome'];
reporters = ['progress'];
