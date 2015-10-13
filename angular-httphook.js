'use strict';
/**/ void function() {

var Hook = function(raw) {
  this.method = raw[0] || /^/;
  this.url = raw[1] || /^/;
  this.reqHandler = raw[2];
  this.resHandler = raw[3];
};

Hook.prototype.test = function(req) {
  return req.method.match(this.method) && req.url.match(this.url);
};

var Request = function(raw) {
  raw = raw || {};
  this.method = raw[0];
  this.url = raw[1];
  this.data = raw[2];
  this.callback = raw[3];
  this.headers = raw[4];
  this.timeout = raw[5];
  this.withCredentials = raw[6];
};

var Response = function(raw) {
  raw = raw || {};
  this.status = raw[0] || 200;
  this.data = raw[1] || '';
  this.headers = raw[2] || '';
  this.statusText = raw[3] || 'OK';
};


// The internal "hooks" abstract class (an array)
var hooks = [];

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
    if(!hook.test(req)) return next();
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

// Set a 'trigger' method to hooks
hooks.trigger = function(request, $delegate) {
  // Initialize 'res'
  var res = new Response();
  // Execute this function on request complete whatever launch
  var complete = function(status, data, headers, statusText) {
    // Save parameters to 'res'
    res.status = status;
    res.data = data;
    res.headers = headers;
    res.statusText = statusText;
    // Solve response handlers of hooks
    hooks.solve('resHandler', request.method, request.url, request, res, function() {
      // Last, call the callback function to finish the whole hook
      request.callback(res.status, res.data, res.headers, res.statusText);
    }, angular.noop);
  };
  // Solve request handlers of hooks
  hooks.solve('reqHandler', request.method, request.url, request, res, function() {
    // Launch and receive by 'complete' function
    $delegate(request.method, request.url, request.data, complete, request.headers, request.timeout, request.withCredentials);
  }, function() {
    // Call the 'complete' function directly
    complete(res.status, res.data, res.headers, res.statusText);
  });
};


// Angular interface
angular.module('httphook', [], ['$httpBackendProvider', function($httpBackendProvider) {
  // Intercept the $httpBackend
  var $OriginalHttpBackend = $httpBackendProvider.$get.splice(-1, 1, function () {
    // Call the original $httpBackend, that return an internal http interface of angular
    var $delegate = $OriginalHttpBackend.apply(this, arguments);
    // Intercept the internal http interface of angular
    return function() {
      hooks.trigger(new Request(arguments), $delegate);
    };
  })[0];
}]).factory('httphook', function() { 
  // Initialize the 'interface' function
  var instance = function() {
    hooks.push(new Hook(arguments));
  };
  // Initialize some shortcuts
  instance.get = angular.bind(null, instance, 'GET');
  instance.post = angular.bind(null, instance, 'POST');
  instance.put = angular.bind(null, instance, 'PUT');
  instance.patch = angular.bind(null, instance, 'PATCH');
  instance['delete'] = angular.bind(null, instance, 'DELETE');
  return instance;
});

/**/ }();
