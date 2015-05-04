//  this javascript function abstracts mouse, pointer, and touch events
//
//  invoke with:
//      target - the HTML element object which is the target of the drawing
//      startDraw - a function called with four parameters (target, pointerId, x, y) when the drawing begins. x and y are guaranteed to be within target's rectange
//      extendDraw - a function called with four parameters (target, pointerId, x, y) when the drawing is extended. x and y are guaranteed to be within target's rectange
//      endDraw - a function called with two parameters (target, pointerId) when the drawing is ended
//      logMessage - a function called with one parameter (string message) that can be logged as the caller desires. multiple line strings separated by \n may be sent
//
//  all parameters expect target are optional
//
//  target element cannot move within the document during drawing
//
function PointerDraw(target, startDraw, extendDraw, endDraw, logMessage) {

    //  an object to keep track of the last x/y positions of the mouse/pointer/touch point
    //  used to reject redundant moves and as a flag to determine if we're in the "down" state
    var lastXYById = {};

    //  an audit function to see if we're keeping lastXYById clean
    if (logMessage) {
        window.setInterval(function () {
            var logthis = false;
            var msg = "Current pointerId array contains:";

            for (var key in lastXYById) {
                logthis = true;
                msg += " " + key;
            }

            if (logthis) {
                logMessage(msg);
            }
        }, 1000);
    }

    //  Opera doesn't have Object.keys so we use this wrapper
    function NumberOfKeys(theObject) {
        if (Object.keys)
            return Object.keys(theObject).length;

        var n = 0;
        for (var key in theObject)
            ++n;

        return n;
    }

    //  IE10's implementation in the Windows Developer Preview requires doing all of this
    //  Not all of these methods remain in the Windows Consumer Preview, hence the tests for method existence.
    function PreventDefaultManipulationAndMouseEvent(evtObj) {
        if (evtObj.preventDefault)
            evtObj.preventDefault();

        if (evtObj.preventManipulation)
            evtObj.preventManipulation();

        if (evtObj.preventMouseEvent)
            evtObj.preventMouseEvent();
    }

    //  we send target-relative coordinates to the draw functions
    //  this calculates the delta needed to convert pageX/Y to offsetX/Y because offsetX/Y don't exist in the TouchEvent object or in Firefox's MouseEvent object
    function ComputeDocumentToElementDelta(theElement) {
        var elementLeft = 0;
        var elementTop = 0;

        for (var offsetElement = theElement; offsetElement != null; offsetElement = offsetElement.offsetParent) {
            //  the following is a major hack for versions of IE less than 8 to avoid an apparent problem on the IEBlog with double-counting the offsets
            //  this may not be a general solution to IE7's problem with offsetLeft/offsetParent
            if (navigator.userAgent.match(/\bMSIE\b/) && (!document.documentMode || document.documentMode < 8) && offsetElement.currentStyle.position == "relative" && offsetElement.offsetParent && offsetElement.offsetParent.currentStyle.position == "relative" && offsetElement.offsetLeft == offsetElement.offsetParent.offsetLeft) {
                // add only the top
                elementTop += offsetElement.offsetTop;
            }
            else {
                elementLeft += offsetElement.offsetLeft;
                elementTop += offsetElement.offsetTop;
            }
        }

        return { x: elementLeft, y: elementTop };
    }

    //  function needed because IE versions before 9 did not define pageX/Y in the MouseEvent object
    function EnsurePageXY(eventObj) {
        if (typeof eventObj.pageX == 'undefined') {
            //  initialize assuming our source element is our target
            eventObj.pageX = eventObj.offsetX + documentToTargetDelta.x;
            eventObj.pageY = eventObj.offsetY + documentToTargetDelta.y;

            if (eventObj.srcElement.offsetParent == target && document.documentMode && document.documentMode == 8 && eventObj.type == "mousedown") {
                //  source element is a child piece of VML, we're in IE8, and we've not called setCapture yet - add the origin of the source element
                eventObj.pageX += eventObj.srcElement.offsetLeft;
                eventObj.pageY += eventObj.srcElement.offsetTop;
            }
            else if (eventObj.srcElement != target && !document.documentMode || document.documentMode < 8) {
                //  source element isn't the target (most likely it's a child piece of VML) and we're in a version of IE before IE8 -
                //  the offsetX/Y values are unpredictable so use the clientX/Y values and adjust by the scroll offsets of its parents
                //  to get the document-relative coordinates (the same as pageX/Y)
                var sx = -2, sy = -2;   // adjust for old IE's 2-pixel border
                for (var scrollElement = eventObj.srcElement; scrollElement != null; scrollElement = scrollElement.parentNode) {
                    sx += scrollElement.scrollLeft ? scrollElement.scrollLeft : 0;
                    sy += scrollElement.scrollTop ? scrollElement.scrollTop : 0;
                }

                eventObj.pageX = eventObj.clientX + sx;
                eventObj.pageY = eventObj.clientY + sy;
            }
        }
    }

    //  cache the delta from the document to our event target (reinitialized each mousedown/MSPointerDown/touchstart)
    var documentToTargetDelta = ComputeDocumentToElementDelta(target);

    //  functions to convert document-relative coordinates to target-relative and constrain them to be within the target
    function targetRelativeX(px) { return Math.max(0, Math.min(px - documentToTargetDelta.x, target.offsetWidth)); };
    function targetRelativeY(py) { return Math.max(0, Math.min(py - documentToTargetDelta.y, target.offsetHeight)); };

    //  common event handler for the mouse/pointer/touch models and their down/start, move, up/end, and cancel events
    function DoEvent(theEvtObj) {

        //  optimize rejecting mouse moves when mouse is up
        if (theEvtObj.type == "mousemove" && NumberOfKeys(lastXYById) == 0)
            return;

        PreventDefaultManipulationAndMouseEvent(theEvtObj);

        var pointerList = theEvtObj.changedTouches ? theEvtObj.changedTouches : [theEvtObj];
        for (var i = 0; i < pointerList.length; ++i) {
            var pointerObj = pointerList[i];
            var pointerId = (typeof pointerObj.identifier != 'undefined') ? pointerObj.identifier : (typeof pointerObj.pointerId != 'undefined') ? pointerObj.pointerId : 1;

            //  use the pageX/Y coordinates to compute target-relative coordinates when we have them (in ie < 9, we need to do a little work to put them there)
            EnsurePageXY(pointerObj);
            var pageX = pointerObj.pageX;
            var pageY = pointerObj.pageY;

            if (theEvtObj.type.match(/(start|down)$/i)) {
                //  clause for processing MSPointerDown, touchstart, and mousedown

                //  refresh the document-to-target delta on start in case the target has moved relative to document
                documentToTargetDelta = ComputeDocumentToElementDelta(target);

                //  protect against failing to get an up or end on this pointerId
                if (lastXYById[pointerId]) {
                    if (endDraw)
                        endDraw(target, pointerId);
                    delete lastXYById[pointerId];
                    if (logMessage)
                        logMessage("Ended draw on pointer " + pointerId + " in " + theEvtObj.type);
                }

                if (startDraw)
                    startDraw(target, pointerId, targetRelativeX(pageX), targetRelativeY(pageY));

                //  init last page positions for this pointer
                lastXYById[pointerId] = { x: pageX, y: pageY };

                //  in the Microsoft pointer model, set the capture for this pointer
                //  in the mouse model, set the capture or add a document-level event handlers if this is our first down point
                //  nothing is required for the iOS touch model because capture is implied on touchstart
                if (target.msSetPointerCapture)
                    target.msSetPointerCapture(pointerId);
                else if (theEvtObj.type == "mousedown" && NumberOfKeys(lastXYById) == 1) {
                    if (useSetReleaseCapture)
                        target.setCapture(true);
                    else {
                        document.addEventListener("mousemove", DoEvent, false);
                        document.addEventListener("mouseup", DoEvent, false);
                    }
                }
            }
            else if (theEvtObj.type.match(/move$/i)) {
                //  clause handles mousemove, MSPointerMove, and touchmove

                if (lastXYById[pointerId] && !(lastXYById[pointerId].x == pageX && lastXYById[pointerId].y == pageY)) {
                    //  only extend if the pointer is down and it's not the same as the last point

                    if (extendDraw)
                        extendDraw(target, pointerId, targetRelativeX(pageX), targetRelativeY(pageY));

                    //  update last page positions for this pointer
                    lastXYById[pointerId].x = pageX;
                    lastXYById[pointerId].y = pageY;
                }
            }
            else if (lastXYById[pointerId] && theEvtObj.type.match(/(up|end|cancel)$/i)) {
                //  clause handles up/end/cancel

                if (endDraw)
                    endDraw(target, pointerId);

                //  delete last page positions for this pointer
                delete lastXYById[pointerId];

                //  in the Microsoft pointer model, release the capture for this pointer
                //  in the mouse model, release the capture or remove document-level event handlers if there are no down points
                //  nothing is required for the iOS touch model because capture is implied on touchstart
                if (target.msReleasePointerCapture)
                    target.msReleasePointerCapture(pointerId);
                else if (theEvtObj.type == "mouseup" && NumberOfKeys(lastXYById) == 0) {
                    if (useSetReleaseCapture)
                        target.releaseCapture();
                    else {
                        document.removeEventListener("mousemove", DoEvent, false);
                        document.removeEventListener("mouseup", DoEvent, false);
                    }
                }
            }
        }
    }

    var useSetReleaseCapture = false;

    if (window.navigator.msPointerEnabled) {
        //  Microsoft pointer model
        target.addEventListener("MSPointerDown", DoEvent, false);
        target.addEventListener("MSPointerMove", DoEvent, false);
        target.addEventListener("MSPointerUp", DoEvent, false);
        target.addEventListener("MSPointerCancel", DoEvent, false);

        //  css way to prevent panning in our target area
        if (typeof target.style.msContentZooming != 'undefined')
            target.style.msContentZooming = "none";

        //  new in Windows Consumer Preview: css way to prevent all built-in touch actions on our target
        //  without this, you cannot touch draw on the element because IE will intercept the touch events
        if (typeof target.style.msTouchAction != 'undefined')
            target.style.msTouchAction = "none";

        if (logMessage)
            logMessage("Using Microsoft pointer model");
    }
    else if (target.addEventListener) {
        //  iOS touch model
        target.addEventListener("touchstart", DoEvent, false);
        target.addEventListener("touchmove", DoEvent, false);
        target.addEventListener("touchend", DoEvent, false);
        target.addEventListener("touchcancel", DoEvent, false);

        //  mouse model
        target.addEventListener("mousedown", DoEvent, false);

        //  mouse model with capture
        //  rejecting gecko because, unlike ie, firefox does not send events to target when the mouse is outside target
        if (target.setCapture && !window.navigator.userAgent.match(/\bGecko\b/)) {
            useSetReleaseCapture = true;

            target.addEventListener("mousemove", DoEvent, false);
            target.addEventListener("mouseup", DoEvent, false);

            if (logMessage)
                logMessage("Using mouse model with capture");
        }
    }
    else if (target.attachEvent && target.setCapture) {
        //  legacy IE mode - mouse with capture
        useSetReleaseCapture = true;
        target.attachEvent("onmousedown", function () { DoEvent(window.event); window.event.returnValue = false; return false; });
        target.attachEvent("onmousemove", function () { DoEvent(window.event); window.event.returnValue = false; return false; });
        target.attachEvent("onmouseup", function () { DoEvent(window.event); window.event.returnValue = false; return false; });

        if (logMessage)
            logMessage("Using legacy IE mode - mouse model with capture");
    }
    else {
        if (logMessage)
            logMessage("Unexpected combination of supported features");
    }

}
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
angular.module("angular-ranger").run(["$templateCache", function($templateCache) {$templateCache.put("angular-ranger.html","<div class=\"ranger\">\r\n	<div class=\"ranger-scale\">\r\n		<div class=\"ranger-marker\" tabindex=\"0\" marker-value=\"0\"></div>\r\n		<div class=\"ranger-fill\"></div>\r\n		<div class=\"ranger-marker\" tabindex=\"0\" marker-value=\"100\"></div>\r\n	</div>\r\n</div>");}]);