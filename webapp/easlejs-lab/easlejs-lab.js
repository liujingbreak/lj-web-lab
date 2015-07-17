angular.module('easlejsLab', []).
controller('main', ['$scope', function($scope){
	$scope.hellowBitch = '你好';
	var tl;
		
	$scope.stopAnim = function(banner){
		tl.pause();
	};
	
	$scope.animateBanner = function (banner){
		if(!tl){
		
			tl = new TimelineLite({delay: 0.2, paused: true});
			//tl.timeScale(0.2);
			tl.to(banner, 1, {callback:function(ratio){
					banner.zoomin( ratio );
			}, ease: Power1.easeOut, onComplete:function(){ banner.easleScaleEnd(); }
			});
			tl.to(banner, 1.5, {callback:function(ratio){
					banner.moveLeft(ratio);
				},
				ease: Power1.easeOut,
				onComplete:function(){
					banner.moveLeftEnd();
				}
			});
			tl.to(banner, 2, {callback:function(ratio){
					banner.moveRight(ratio);
				},
				ease: Power1.easeOut,
				onComplete:function(){
					//banner.moveLeftEnd();
				}
			});
			tl.to(banner, 1,{callback:function(ratio){
					banner.zoomout( ratio );
			}, ease: Power1.easeOut, onComplete:function(){
				
				setTimeout(function(){
				banner.switchNext(); }, 4000);
			}
			});
		}
		
		//tl.restart();
	};
}]).
directive('dmBannerCanvas', ['$q', 'dmImgBlur',

	function($q, dmImgBlur){
		
	return {
		require: '?^oleDemoOpenAnim',
		transclude: true,
		
		template: '<canvas ng-repeat="bannerCanvas in imageList" class="banner-canvas" ng-class="canvasClassName($index)"></canvas>'+
			'<canvas class="layer-canvas"></canvas>'+
			'<div class="banner-layer">{{showingImageIndex}}'+
			'<div class="layer-content" ng-transclude></div>'+
			'<div class="banner-buttons">'+
			'<i ng-repeat="bannerCanvas in imageList" ng-class="{selected: $index == showingImageIndex }" ng-click="clickSwitch($index)"></li>'+
			'</div></div>',
		
		link:function(scope, el, attrs, oleDemoOpenAnim){
			var layerCanvas = el.children()[el.children().length - 2];
			var currImage, imgData;
			var canvas, canvases, layer = el.find('div')[0];
			var offLayerCanvas = document.createElement('canvas');
			var blurRadius;
			var scaleMatrix = new createjs.Matrix2D();
			var scaleAnimMatrix = new createjs.Matrix2D();
			var moveAnimMatrix = new createjs.Matrix2D();
			
			var stage, eImage;
			scope.showingImageIndex = 0;
			scope.canvasClassName = function(idx){
				return 'canvas-'+idx;
			};
			
			var layerBlurRadius = parseInt(attrs.layerBlurRadius, 10);
			var self = {
				el: el,
				layerBlurRadius: layerBlurRadius,
				imageDatas:[],
				showingImageIndex: 0,
				canvas: canvas,
				layer: layer,
				blur: function(radius, targetCanvas){
					if(!targetCanvas){
						targetCanvas = canvas;
					}
					radius = Math.round(radius);
					blurRadius = radius;
					if(targetCanvas && blurRadius > 0){
						
						var context = targetCanvas.getContext('2d');
						context.clearRect( 0, 0, targetCanvas.width, targetCanvas.height );
						
					
						dmImgBlur.stackBlurCanvasRGB(targetCanvas, 0,0, targetCanvas.width,
							targetCanvas.height, blurRadius);
					}
				},
				blurLayer: function(radius){
					radius = Math.round(radius);
					if(radius <= 0){
						return;
					}
					var context = layerCanvas.getContext('2d');
					context.clearRect( 0, 0, layerCanvas.width, layerCanvas.height );
					context.drawImage(offLayerCanvas, 0,0);
					dmImgBlur.stackBlurCanvasRGB(layerCanvas,
						 0,0, layerCanvas.width, layerCanvas.height, radius);
					self.layerBlurRadius = radius;
				},
				
				zoomin:function(ratio){
					scaleAnimMatrix.identity();
					var sc = 1+ ratio * 0.2;
					scaleAnimMatrix.scale(sc, sc);
					resize();
					
				},
				
				easleScaleEnd:function(){
					self.bounds = eImage.getTransformedBounds();
					self.toMoveLeft = Math.abs(self.bounds.x);
					console.log(self.toMoveLeft);
				},
				
				moveLeft:function(ratio){
					moveAnimMatrix.identity();
					moveAnimMatrix.translate(self.toMoveLeft * ratio, 0);
					resize();
				},
				moveLeftEnd:function(){
					self.bounds = eImage.getTransformedBounds();
					self.toMoveRight = Math.abs(self.bounds.x + self.bounds.width - canvas.width);
					
				},
				moveRight:function(ratio){
					moveAnimMatrix.identity();
					moveAnimMatrix.translate(self.toMoveLeft - self.toMoveRight * ratio, 0);
					resize();
				},
				zoomout:function(ratio){
					scaleAnimMatrix.identity();
					var sc = 1.2 - ratio * 0.2;
					scaleAnimMatrix.scale(sc, sc);
					
					moveAnimMatrix.identity();
					moveAnimMatrix.translate(self.toMoveLeft - self.toMoveRight + (self.toMoveRight - self.toMoveLeft)  * ratio, 0);
					resize();
				},
				switchNext:function(nextIdx){
					if(nextIdx === undefined && scope.showingImageIndex >= scope.imageList.length -1){
						return;
					}
					var prevCanvas = canvas;
					var fadeOutDef = $q.defer();
					var loadNextDef = $q.defer();
					var tl = new TimelineLite({
						onComplete:function(){
							blurRadius = 0;
							
							prevCanvas.style.zIndex = 0;
							canvas.style.zIndex = 2;
							prevCanvas.style.opacity = 1;
							fadeOutDef.resolve();
						}
					});
					tl.to(layerCanvas, 0.5, {opacity: 0});
					
					tl.to(prevCanvas, 0.5, {opacity: 0, ease: Power2.easeOut}, '+=0.3');
					if(nextIdx !== undefined){
						scope.showingImageIndex = nextIdx;
					}
					else{
						scope.showingImageIndex++;
					}
					qs[scope.showingImageIndex].then(function(img){
						scaleMatrix.identity();
						scaleAnimMatrix.identity();
						moveAnimMatrix.identity();
						blurRadius = 0;
						console.log('start load next');
						loadNext(img);
						
						loadNextDef.resolve();
						
					});
					$q.all([fadeOutDef.promise, loadNextDef.promise]).then(
						function(){
							layerCanvas.style.opacity = 1;
							repaintLayer();
							TweenMax.to(self, 0.7, { callback:function(ratio){
									self.blurLayer(ratio * layerBlurRadius);
							}, ease: Linear.easeNone});
							if(attrs.ready){
								console.log('loadnext ready');
								scope.$eval(attrs.ready, {api: self});
							}
						});
				}
			};
			scope.clickSwitch = function clickSwitch(idx){
				scope.$eval(attrs.onUserSwitch, {api:self});
				self.switchNext(idx);
			};
			
			function onLoadFirst(img){
				//console.log(idx);
				canvas = canvases[scope.showingImageIndex];
				stage = new createjs.Stage(canvas);
				eImage = new createjs.Bitmap(img);
				stage.addChild(eImage);
				
				currImage = img;
				self.showingImageIndex = scope.showingImageIndex = 0;
				//resize();
				repaintMainCanvas();
				//repaintLayer();
				copyArea(layer.offsetLeft <<1, layer.offsetTop<<1,
					layer.clientWidth <<1, layer.clientHeight<<1);
				
				TweenMax.to(layerCanvas, 0.7, {callback:function(ratio){
					self.blurLayer(50 * ratio);
				} });
				TweenMax.fromTo(canvas, 1, {opacity: 0}, {opacity: 1, ease: Power2.easeOut,
						onComplete:function(){
							if(attrs.ready){
								scope.$eval(attrs.ready, {api: self});
							}
						}
				});
			}
			
			function loadNext(img){
				//console.log(idx);
				canvas = canvases[scope.showingImageIndex];
				console.log('loadNext() showingImageIndex='+ scope.showingImageIndex);
				
				stage = new createjs.Stage(canvas);
				stage.clear();
				eImage = new createjs.Bitmap(img);
				stage.addChild(eImage);
				//TweenMax.fromTo(layerCanvas, 0.5, {opacity: 0}, {opacity: 1});
				self.blurLayer(0);
				
				currImage = img;
				//self.showingImageIndex = scope.showingImageIndex = 0;
				
				repaintMainCanvas();
			}
			
			if(oleDemoOpenAnim){
				//register self to parent direcitve
				oleDemoOpenAnim.dmBannerCanvas(self);
			}
			
			var images, qs = [], scaleRatio, moveLeft, moveTop;
			
			
			attrs.$observe('imageList', function imageListChanged(value){
				scope.imageList = [];
				images = scope.$eval(value);
				
				images.forEach(function(url, idx){
					var def = $q.defer();
					qs.push(def.promise);
					var img = angular.element('<img>');
					scope.imageList.push(img);
					img.prop('src', url).on('load', function(){
						def.resolve(this);
					});
					self.imageDatas.push(null);
					
				});
				setTimeout(function(){
					canvases = el.find('canvas');
					qs[0].then(onLoadFirst);
				}, 50);
			});
			
			
			function resize(){
				repaintMainCanvas();
				repaintLayer();
			}
			
			function repaintMainCanvas(){
				canvas.width = el.prop('clientWidth') <<1;
				canvas.height = el.prop('clientHeight')<<1;
				
				var w = currImage.naturalWidth, h = currImage.naturalHeight;
				var canvasWidth = canvas.width, canvasHeight = canvas.height;
				var scaleX = w/ canvasWidth; // 2/1 , 2
				var scaleY = h/ canvasHeight; // 1/1, 1
				var scaleToCover = Math.min(scaleX, scaleY);
				var cutWidth = w - canvasWidth * scaleToCover;
				var cutHeight = h - canvasHeight * scaleToCover;
				scaleMatrix.identity();
				scaleMatrix.scale(1/scaleToCover, 1/scaleToCover);
				
				eImage.transformMatrix = new createjs.Matrix2D().
					appendMatrix(moveAnimMatrix).
					translate(canvas.width>>1, canvas.height >> 1).
					appendMatrix(scaleMatrix).
					appendMatrix(scaleAnimMatrix).
					appendTransform(- (w >> 1), - (h >> 1), 1,1);
				
					
				stage.update();
				
				self.blur(blurRadius===undefined? attrs.blurRadius: blurRadius);
			}
			
			function repaintLayer(){
				copyArea(layer.offsetLeft <<1, layer.offsetTop<<1,
					layer.clientWidth <<1, layer.clientHeight<<1);
				dmImgBlur.stackBlurCanvasRGB(layerCanvas,
					0,0, layerCanvas.width, layerCanvas.height, self.layerBlurRadius);
			}
			
			function copyArea(left,top, width, height){
				dmImgBlur.drawPartialCanvas(canvas, layerCanvas,
					width, height, left, top);
				offLayerCanvas.width = width;
				offLayerCanvas.height = height;
				var ctx = offLayerCanvas.getContext('2d');
				ctx.clearRect(0,0,offLayerCanvas.width, offLayerCanvas.height);
				ctx.drawImage(layerCanvas, 0,0);
			}
			
			var handleResizing = _.throttle(resize, 750);
			angular.element(window).on('resize', handleResizing);
			
			el.on('$destroy', function(){
					angular.element(window).off('resize', handleResizing);
			});
		}
	};
}]);
