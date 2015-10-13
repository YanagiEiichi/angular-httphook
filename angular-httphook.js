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


var createHeapClass = function(def) {
  var HeapClass = function(raw) {
    raw = raw || {};
    var index = 0;
    for(var key in def) this[key] = raw[index++] || def[key];
  };
  HeapClass.prototype.toArray = function() {
    var raw = [];
    for(var key in def) raw.push(this[key]);
    return raw;
  };
  return HeapClass;
};

var Request = createHeapClass({
  method: 'GET',
  url: '/',
  data: null,
  callback: null,
  headers: null,
  timeout: null,
  withCredentials: null,
  xRequestWith: null
});

var Response = createHeapClass({
  status: 200,
  data: '',
  headers: '',
  statusText: 'OK'
});


// The internal "hooks" abstract class (an array)
var hooks = [];

hooks.solve = function(type, req, res, done, fail) {
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

hooks.trigger = function(req, $delegate) {
  // Hijack response handler
  var callback = req.callback;
  req.callback = function() {
    var res = new Response(arguments);
    // Solve response handlers of hooks
    hooks.solve('resHandler', req, res, function() {
      // Call the callback function to finish the whole hook
      callback.apply(req, res.toArray());
    }, angular.noop);
  };
  // Solve req handlers of hooks
  var res = new Response();
  hooks.solve('reqHandler', req, res, function() {
    // Request Actually
    $delegate.apply(null, req.toArray());
  }, function() {
    // Call the 'complete' function directly
    req.callback.apply(null, res.toArray());
  });
};


var httpBackendDecorator = function($OriginalHttpBackend) {
  return function() {
    // Call the original $httpBackend, that return an internal http interface of angular
    var $delegate = $OriginalHttpBackend.apply(this, arguments);
    // Intercept the internal http interface of angular
    return function() {
      hooks.trigger(new Request(arguments), $delegate);
    }
  };
};


// Angular interface
angular.module('httphook', [], ['$httpBackendProvider', function($httpBackendProvider) {
  // Intercept the $httpBackend
  var httpBackend = $httpBackendProvider.$get;
  var lastIndex = httpBackend.length - 1;
  httpBackend[lastIndex] = httpBackendDecorator(httpBackend[lastIndex]);
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
