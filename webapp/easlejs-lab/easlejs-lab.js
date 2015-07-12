angular.module('easlejsLab', []).
controller('main', ['$scope', function($scope){
	$scope.hellowBitch = '你好';
	$scope.animateBanner = function (banner){
		console.log('anm');
		var tl = new TimelineLite();
		tl.to(banner, 5, {callback:function(ratio){
				banner.easleScale( ratio );
		}, ease: Power1.easeOut});
		
	};
}]).
directive('dmBannerCanvas', ['$q', 'dmImgBlur',
/**
<div dm-banner-canvas layer-blur-radius="50" blur-radius="50" class="background-image-container"
  image-list="['demos/ole/images/pop01.jpg', 'demos/ole/images/pop02.jpg', 
  'demos/ole/images/pop03.jpg']">
  ...layer content... please setup layer element's position style in your style sheet file.
  
  </div>
*/
	function($q, dmImgBlur){
		
	return {
		require: '?^oleDemoOpenAnim',
		transclude: true,
		template: '<canvas class="banner-canvas"></canvas>'+
			'<canvas class="layer-canvas"></canvas>'+
			'<div class="banner-layer" ng-transclude></div>',
		
		link:function(scope, el, attrs, oleDemoOpenAnim){
			var layerCanvas = el.children()[1];
			
			var currImage, imgData;
			var canvas = el.children()[0], layer = el.children()[2];
			var offLayerCanvas = document.createElement('canvas');
			var blurRadius;
			var scaleMatrix = new createjs.Matrix2D();
			var scaleAnimMatrix = new createjs.Matrix2D();
			
			var stage = new createjs.Stage(canvas), eImage;
			
			
			var self = {
				el: el,
				layerBlurRadius: parseInt(attrs.layerBlurRadius, 10),
				imageDatas:[],
				showingImageIndex: 0,
				canvas: canvas,
				layer: layer,
				blur: function(radius){
					radius = Math.round(radius);
					blurRadius = radius;
					if(canvas && blurRadius > 0){
						dmImgBlur.stackBlurCanvasRGB(canvas, 0,0, canvas.width, canvas.height, blurRadius);
					}
				},
				blurLayer: function(radius){
					radius = Math.round(radius);
					var context = layerCanvas.getContext('2d');
					context.clearRect( 0, 0, layerCanvas.width, layerCanvas.height );
					context.drawImage(offLayerCanvas, 0,0);
					dmImgBlur.stackBlurCanvasRGB(layerCanvas,
						 0,0, layerCanvas.width, layerCanvas.height, radius);
					
				},
				
				easleScale:function(ratio){
					console.log('oh');
					scaleAnimMatrix.identity();
					var sc = 1+ ratio * 0.2;
					scaleAnimMatrix.scale(sc, sc);
					resize();
					
				},
				
				scale:function(ratio){
					var ctx = canvas.getContext('2d');
					ctx.save();
					ctx.clearRect(0,0, canvas.width, canvas.height);
					var img = currImage;
					var w = img.naturalWidth, h = img.naturalHeight;
					var canvasWidth = canvas.width, canvasHeight = canvas.height;
					var scaleX = w/ canvasWidth; // 2/1 , 2
					var scaleY = h/ canvasHeight; // 1/1, 1
					
					var scaleToCover = Math.min(scaleX, scaleY);
					
					var cutWidth = w - canvasWidth * scaleToCover;
					var cutHeight = h - canvasHeight * scaleToCover;
					var scaleRatio = 1 + 0.2 * ratio;
					ctx.translate((canvas.width >>1), (canvas.height >>1));
					ctx.scale(scaleRatio, scaleRatio);
					ctx.drawImage( img, cutWidth >> 1, cutHeight >> 1, Math.round(canvasWidth * scaleToCover),
						Math.round(canvasHeight * scaleToCover),
					 	-(canvas.width >>1), -(canvas.height >>1), canvasWidth, canvasHeight);
					ctx.restore();
					
					clipArea(layer.offsetLeft <<1, layer.offsetTop<<1,
					layer.clientWidth <<1, layer.clientHeight<<1);
					dmImgBlur.stackBlurCanvasRGB(layerCanvas,
						0,0, layerCanvas.width, layerCanvas.height, self.layerBlurRadius);
				},
				move:function(){
					
				},
			};
			
			
			if(oleDemoOpenAnim){
				//register self to parent direcitve
				oleDemoOpenAnim.dmBannerCanvas(self);
			}
			
			var images, qs = [], scaleRatio, moveLeft, moveTop;
			
			
			attrs.$observe('imageList', function(value){
					
				images = scope.$eval(value);
				
				images.forEach(function(url){
					var def = $q.defer();
					qs.push(def.promise);
					var img = angular.element('<img>');
					img.prop('src', url).on('load', function(){
						def.resolve(this);
					});
					self.imageDatas.push(null);
				});
				
				qs[0].then(function onLoad(img){
						eImage = new createjs.Bitmap(img);
						//eImage.scaleX = 1.5;
						//eImage.scaleY = 1.5;
						stage.addChild(eImage);
						
						currImage = img;
						self.showingImageIndex = 0;
						resize();
						self.imageDatas[0] = imgData;
						dmImgBlur.drawPartialCanvas(canvas, offLayerCanvas,
							layerCanvas.width, layerCanvas.height, 
							layer.offsetLeft <<1, layer.offsetTop<<1);
						TweenMax.fromTo(canvas, 1.5, {opacity: 0}, {opacity: 1, ease: Power2.easeOut,
								onComplete:function(){
									if(attrs.ready){
										scope.$eval(attrs.ready, {api: self});
									}
								}
						});
						if(scope.openAnim){
							scope.openAnim.ready();
						}
						
						
					
						
				});
			});
			
			
			function resize(){
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
				
				eImage.transformMatrix = new createjs.Matrix2D().translate(
					canvas.width>>1, canvas.height >> 1).appendMatrix(scaleMatrix).
					appendMatrix(scaleAnimMatrix).
					appendTransform(- (w >> 1), - (h >> 1), 1,1);
				
					
				stage.update();
				
				self.blur(blurRadius===undefined? attrs.blurRadius: blurRadius);
				clipArea(layer.offsetLeft <<1, layer.offsetTop<<1,
					layer.clientWidth <<1, layer.clientHeight<<1);
				dmImgBlur.stackBlurCanvasRGB(layerCanvas,
					0,0, layerCanvas.width, layerCanvas.height, self.layerBlurRadius);
			}
			
			function clipArea(left,top, width, height){
				dmImgBlur.drawPartialCanvas(canvas, layerCanvas,
					width, height, left, top);
			}
			
			var handleResizing = _.throttle(resize, 750);
			angular.element(window).on('resize', handleResizing);
			
			el.on('$destroy', function(){
					angular.element(window).off('resize', handleResizing);
			});
		}
	};
}]);
