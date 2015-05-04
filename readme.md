angular-ranger
=====================

A mobile friendly, *super-fast*, range slider. No jQuery necessary...

[**Check out a demo**](http://justmaier.github.io/angular-ranger/#demo)

##Installation

####Bower
`bower install angular-ranger`

####Nuget
`install-package AngularJs.Ranger`

####Manually
```html
<link rel="stylesheet" href="js/angular-ranger.css">
<script type="text/javascript" src="js/angular-ranger.js"></script>
```

##Usage

0. Install `angular-ranger` using one of the methods above.
1. Add `angular-ranger` as a module dependency to your app
2. Drop a ranger into your html

####Javascript
```javascript
angular.module('app', ['angular-ranger'])
.run(function($rootScope){
	$rootScope.value = {
		min: 5,
		max: 18
	};
});
```

####Html
```html
<angular-ranger min="0" max="20" step="1" min-value="value.min" max-value="value.max"></angular-ranger>
```

##Notes

- Angular-Ranger uses Sass to make the design highly customizable. Check the sass file for all of the available options.
- Angular-Ranger includes a simple gulpfile so that you can make your own adjustments and build/re-minify using `gulp build`. Keep in mind you will need to install the dev dependencies first using `npm install`.
- This has been tested on Windows, Windows Phone, and iOS. Let me know if you run into any bugs.
- Pull requests are always welcome