'use strict';

angular.module('angular-ranger',[])
.directive('angularRanger', ['$window', function($window){
	return {
		restrict: 'E',
		replace: true,
		templateUrl: 'angular-ranger.html',
		scope:{
			min: '@',
			max: '@',
			step: '@',
			minValue: '=',
			maxValue: '='
		},
		link: function(scope, el, attrs){
			// Private Variables
			//================================
			var scale = el[0].querySelector('.ranger-scale'),
				markers = {
					min: angular.element(scale.children[0]),
					max: angular.element(scale.children[2])
				},
				fill = angular.element(scale.children[1]),
				range = Math.abs(scope.min - scope.max),
				maxPx = scale.clientWidth,
				step = parseFloat(scope.step) || 1;
				currentX = {min: 0, max: scale.clientWidth},
				moveX = null,
				moveTarget = null,
				disabled = false,
				rAFIndex = null;

			// Public Variables
			//================================

			// Private Methods
			//================================
			function getClosestMarker(x){
				var fromMin = Math.abs(x-currentX.min);
				var fromMax = Math.abs(x-currentX.max);
				if(fromMin == fromMax) return x<currentX.min ? 'min' : 'max';
				return fromMin<fromMax ? 'min' : 'max';
			}
			function updateRange(newValue, oldValue){
				range = Math.abs(scope.min - scope.max);
				updateLimits();
				updatePositionWithValue();
			}
			function updateStep(newValue, oldValue){
				step = parseFloat(newValue || 1);
			}
			function updateDisabled(newValue, oldValue){
				disabled = newValue !== false || newValue !== 'false';
			}
			function getNearestStep(){
				var percentage = moveX / maxPx;
				var value = (percentage * range) + parseFloat(scope.min);
				return Math.round(value/step) * step;
			}
			function snapToNearestStep(){
				var value = getNearestStep();
				scope[moveTarget+'Value'] = value;
				currentX[moveTarget] = (Math.abs(scope.min - value)/range) * scale.clientWidth;
				scope.$apply();
			}
			function setValidPosition(){
				if(moveTarget == 'min' && moveX > currentX.max) moveX = currentX.max;
				if(moveTarget == 'min' && moveX < 0) moveX = 0;
				if(moveTarget == 'max' && moveX < currentX.min) moveX = currentX.min;
				if(moveTarget == 'max' && moveX > maxPx) moveX = maxPx;
			}
			function updatePositionWithX() {
				if (!moveX) return;
				setValidPosition();

				currentX[moveTarget] = moveX;
				markers[moveTarget].attr('marker-value', getNearestStep());
				updatePosition();
			}
			function updatePosition(){
				markers.min.css('left', currentX.min+'px');
				markers.max.css('left', currentX.max+'px');
				fill.css({
					'left': currentX.min+'px',
					'right': (maxPx - currentX.max)+'px'
				});
			}
			function updatePositionWithValue() {
				updateLimits();
				updatePosition();
			}
			function updateLimits(){
				maxPx = scale.clientWidth;
				var minValue = scope.minValue || scope.min || 0;
				var maxValue = scope.maxValue || scope.max || 0;
				currentX.min = (Math.abs(scope.min - minValue)/range) * scale.clientWidth;
				currentX.max = (Math.abs(scope.min - maxValue)/range) * scale.clientWidth;
			}

			// Watchers
			//================================
			angular.element($window).bind('resize', function () {
				updateLimits();
				updatePosition();
				scope.$apply();
			});
			scope.$watch('min', updateRange);
			scope.$watch('max', updateRange);
			scope.$watch('minValue', updatePositionWithValue);
			scope.$watch('maxValue', updatePositionWithValue);
			scope.$watch('step', updateStep);
			attrs.$observe('disabled', updateDisabled)

			// Click/Drag Bindings
			//================================
			PointerDraw(
				scale,
				function (target, pointerId, x, y, e) { // mousedown
					if(disabled) return;
					if (maxPx < 1) maxPx = scale.clientWidth; //Crazy IE Bug
					moveTarget = getClosestMarker(x);
					markers[moveTarget][0].focus();
					moveX = x;
					updatePositionWithX();
				},
				function (target, pointerId, x, y, e) { // mousemove
					if(disabled) return;
					moveX = x;
					cancelAnimationFrame(rAFIndex);
					rAFIndex = requestAnimationFrame(updatePositionWithX);
				},
				function (target, pointerId, e) { // mouseup
					if(disabled) return;
					markers[moveTarget][0].blur();
					setValidPosition();
					snapToNearestStep();
					cancelAnimationFrame(rAFIndex);
				}
			);
		}
	};
}]);