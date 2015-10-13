'use strict';
/**/ void function() {

// The internal Hooks class (return an array)
var Hooks = function() {
  var hooks = [];
  // To compare matcher and target, RegExp may be used
  var compare = function(matcher, target) {
    if(matcher.test) return matcher.test(target);
    return matcher === target;
  };
  // Solve hooks
  hooks.solve = function(type, method, url, req, res, done, fail) {
    // A recursive function
    var walker = function(i) {
      // Call the 'done' function, if all hooks solved
      var hook = hooks[i];
      if(!hook) return done();
      var next = function(e) {
        switch(e) {
          // Ignore subsequent hooks, if true
          case true: return walker(-1);
          // Call the 'fail' function, if false
          case false: return fail();
          // Recur
          default: walker(i + 1);
        };
      }
      // Check hook match
      if(typeof hook[type] !== 'function') return next();
      if(!compare(hook.method, req.method)) return next();
      if(!compare(hook.url, req.url)) return next();
      // Call the hook handler function
      var result = hook[type].call(null, req, res);
      // Consider promise object
      if(result && typeof result.then === 'function') {
        result.then(next);
      } else {
        next(result);
      }
    };
    walker(0);
  };
  return hooks;
};

angular.module('httphook', ['httphook.provider'], ['$httpBackendProvider', 'httphookProvider', function($httpBackendProvider, httphookProvider) {
  // Intercept the $httpBackend
  var $OriginalHttpBackend = $httpBackendProvider.$get.splice(-1, 1, function () {
    // Call the original $httpBackend, that return an internal http interface of angular
    var $delegate = $OriginalHttpBackend.apply(this, arguments);
    // Intercept the internal http interface of angular
    return function(method, url, data, callback, headers, timeout, withCredentials) {
      httphookProvider.trigger({ method: method, url: url, data: data, callback: callback, headers: headers, timeout: timeout, withCredentials: withCredentials }, $delegate);
    };
  })[0];
}]);

// Create an angular module to define the 'httphook' provider
angular.module('httphook.provider', []).provider('httphook', function() {
  var hooks = new Hooks();
  // Set a 'trigger' method for httphookProvider
  this.trigger = function(request, $delegate) {
    // Initialize 'req' and 'res'
    var req = {};
    // MUST be shallow copy, because `request.data` may be a native object such as FormData
    for(var i in request) req[i] = request[i];
    var res = { status: 204, data: null, headers: '', statusText: 'OK' };
    delete req.callback;
    // Execute this function on request complete whatever launch
    var complete = function(status, data, headers, statusText) {
      // Save parameters to 'res'
      res.status = status;
      res.data = data;
      res.headers = headers;
      res.statusText = statusText;
      // Solve response handlers of hooks
      hooks.solve('resHandler', request.method, request.url, req, res, function() {
        // Last, call the callback function to finish the whole hook
        request.callback(res.status, res.data, res.headers, res.statusText);
      }, angular.noop);
    };
    // Solve request handlers of hooks
    hooks.solve('reqHandler', request.method, request.url, req, res, function() {
      // Launch and receive by 'complete' function
      $delegate(req.method, req.url, req.data, complete, req.headers, req.timeout, req.withCredentials);
    }, function() {
      // Call the 'complete' function directly
      complete(res.status, res.data, res.headers, res.statusText);
    });
  };
  // Set the 'hooks' as hooks storage
  this.$get = [function() {
    // Initialize the hooks storage
    // Initialize the 'interface' function
    var instance = function(method, url, reqHandler, resHandler) {
      hooks.push({ method: method, url: url, reqHandler: reqHandler, resHandler: resHandler });
      return instance;
    };
    // Initialize some shortcuts
    instance.get = angular.bind(null, instance, 'GET');
    instance.post = angular.bind(null, instance, 'POST');
    instance.put = angular.bind(null, instance, 'PUT');
    instance.patch = angular.bind(null, instance, 'PATCH');
    instance['delete'] = angular.bind(null, instance, 'DELETE');
    return instance;
  }];
});

/**/ }();
