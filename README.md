## angular-httphook

###### A lightweight http hook for angular

#### IDL

```
void httphook(
  RegExp method,
  RegExp uri,
  optional function requestHandler,
  optional function responseHandler
);
```

* `method` is a matcher with RegExp, hooking only request method is matched.
* `uri` is a matcher with RegExp, hooking only request uri is matched.
* `requestHandler` is callback function that used to process hooked requests.
* `responseHandler` is callback function that used to process hooked response.

`requestHandler` and `responseHandler` are optional.

#### Demo

````html
<html ng-app="test">
<script src="bower_components/angular/angular.js"></script>
<script src="bower_components/angular-httphook/angular-httphook.js"></script>
<script>
angular.module('test', ['httphook']).run(['$http', 'httphook', function($http, httphook) {

  httphook.get(/^\/api/, function(req, res) {
    // Set a 200 response
    res.status = 200;
    res.statusText = 'OK';
    res.data = 'Hello World';
    // Do not launch
    return false;
  });

  $http.get('/api').then(function(e) {
    // Hello World
    console.log(e.data);
  });

}]);
</script>
````

#### Install

```bash
bower install angular-httphook
```

#### Reference

[https://github.com/YanagiEiichi/xceptor](https://github.com/YanagiEiichi/xceptor)

