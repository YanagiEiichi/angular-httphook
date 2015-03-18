## angular-httphook

###### A lightweight http hook for angular.

#### Usage

````
<html ng-app="test">
<script src="bower_components/angular/angular.js"></script>
<script src="../angular-httphook.js"></script>
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

