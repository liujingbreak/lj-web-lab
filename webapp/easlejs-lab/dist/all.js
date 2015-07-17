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

angular.module('easlejsLab').factory('dmImageLoader', ['$q', function($q){
			
	return function load(url){
		var def = $q.defer();
		$('<img>').prop('src', url).load(function(){
			def.resolve();
		});
		return def.promise;
	};
}]).
factory('dmImgBlur', [function(){

var mul_table = [
        512,512,456,512,328,456,335,512,405,328,271,456,388,335,292,512,
        454,405,364,328,298,271,496,456,420,388,360,335,312,292,273,512,
        482,454,428,405,383,364,345,328,312,298,284,271,259,496,475,456,
        437,420,404,388,374,360,347,335,323,312,302,292,282,273,265,512,
        497,482,468,454,441,428,417,405,394,383,373,364,354,345,337,328,
        320,312,305,298,291,284,278,271,265,259,507,496,485,475,465,456,
        446,437,428,420,412,404,396,388,381,374,367,360,354,347,341,335,
        329,323,318,312,307,302,297,292,287,282,278,273,269,265,261,512,
        505,497,489,482,475,468,461,454,447,441,435,428,422,417,411,405,
        399,394,389,383,378,373,368,364,359,354,350,345,341,337,332,328,
        324,320,316,312,309,305,301,298,294,291,287,284,281,278,274,271,
        268,265,262,259,257,507,501,496,491,485,480,475,470,465,460,456,
        451,446,442,437,433,428,424,420,416,412,408,404,400,396,392,388,
        385,381,377,374,370,367,363,360,357,354,350,347,344,341,338,335,
        332,329,326,323,320,318,315,312,310,307,304,302,299,297,294,292,
        289,287,285,282,280,278,275,273,271,269,267,265,263,261,259];
        
   
var shg_table = [
	     9, 11, 12, 13, 13, 14, 14, 15, 15, 15, 15, 16, 16, 16, 16, 17, 
		17, 17, 17, 17, 17, 17, 18, 18, 18, 18, 18, 18, 18, 18, 18, 19, 
		19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 20, 20, 20,
		20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 21,
		21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21,
		21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 22, 22, 22, 22, 22, 
		22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22,
		22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 23, 
		23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
		23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
		23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 
		23, 23, 23, 23, 23, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 
		24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
		24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
		24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
		24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24 ];


function stackBlurImage( imageID, canvasID, radius, blurAlphaChannel )
{
			
 	var img = document.getElementById( imageID );
	var w = img.naturalWidth;
    var h = img.naturalHeight;
       
	var canvas = document.getElementById( canvasID );
      
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width = w;
    canvas.height = h;
    
    var context = canvas.getContext('2d');
    context.clearRect( 0, 0, w, h );
    context.drawImage( img, 0, 0 );

	if ( isNaN(radius) || radius < 1 ) return;
	
	if ( blurAlphaChannel )
		stackBlurCanvasRGBA( canvasID, 0, 0, w, h, radius );
	else 
		stackBlurCanvasRGB( canvasID, 0, 0, w, h, radius );
}


function stackBlurCanvasRGBA( id, top_x, top_y, width, height, radius )
{
	if ( isNaN(radius) || radius < 1 ) return;
	radius |= 0;
	
	var canvas  = document.getElementById( id );
	var context = canvas.getContext('2d');
	var imageData;
	
	try {
	  try {
		imageData = context.getImageData( top_x, top_y, width, height );
	  } catch(e) {
	  
		// NOTE: this part is supposedly only needed if you want to work with local files
		// so it might be okay to remove the whole try/catch block and just use
		// imageData = context.getImageData( top_x, top_y, width, height );
		try {
			netscape.security.PrivilegeManager.enablePrivilege('UniversalBrowserRead');
			imageData = context.getImageData( top_x, top_y, width, height );
		} catch(ex) {
			alert('Cannot access local image');
			throw new Error('unable to access local image data: ' + ex);
		}
	  }
	} catch(e) {
	  alert('Cannot access image');
	  throw new Error('unable to access image data: ' + e);
	}
			
	var pixels = imageData.data;
			
	var x, y, i, p, yp, yi, yw, r_sum, g_sum, b_sum, a_sum, 
	r_out_sum, g_out_sum, b_out_sum, a_out_sum,
	r_in_sum, g_in_sum, b_in_sum, a_in_sum, 
	pr, pg, pb, pa, rbs;
			
	var div = radius + radius + 1;
	var w4 = width << 2;
	var widthMinus1  = width - 1;
	var heightMinus1 = height - 1;
	var radiusPlus1  = radius + 1;
	var sumFactor = radiusPlus1 * ( radiusPlus1 + 1 ) / 2;
	
	var stackStart = new BlurStack();
	var stack = stackStart;
	var stackEnd;
	for ( i = 1; i < div; i++ )
	{
		stack = stack.next = new BlurStack();
		if ( i == radiusPlus1 ) stackEnd = stack;
	}
	stack.next = stackStart;
	var stackIn = null;
	var stackOut = null;
	
	yw = yi = 0;
	
	var mul_sum = mul_table[radius];
	var shg_sum = shg_table[radius];
	
	for ( y = 0; y < height; y++ )
	{
		r_in_sum = g_in_sum = b_in_sum = a_in_sum = r_sum = g_sum = b_sum = a_sum = 0;
		
		r_out_sum = radiusPlus1 * ( pr = pixels[yi] );
		g_out_sum = radiusPlus1 * ( pg = pixels[yi+1] );
		b_out_sum = radiusPlus1 * ( pb = pixels[yi+2] );
		a_out_sum = radiusPlus1 * ( pa = pixels[yi+3] );
		
		r_sum += sumFactor * pr;
		g_sum += sumFactor * pg;
		b_sum += sumFactor * pb;
		a_sum += sumFactor * pa;
		
		stack = stackStart;
		
		for( i = 0; i < radiusPlus1; i++ )
		{
			stack.r = pr;
			stack.g = pg;
			stack.b = pb;
			stack.a = pa;
			stack = stack.next;
		}
		
		for( i = 1; i < radiusPlus1; i++ )
		{
			p = yi + (( widthMinus1 < i ? widthMinus1 : i ) << 2 );
			r_sum += ( stack.r = ( pr = pixels[p])) * ( rbs = radiusPlus1 - i );
			g_sum += ( stack.g = ( pg = pixels[p+1])) * rbs;
			b_sum += ( stack.b = ( pb = pixels[p+2])) * rbs;
			a_sum += ( stack.a = ( pa = pixels[p+3])) * rbs;
			
			r_in_sum += pr;
			g_in_sum += pg;
			b_in_sum += pb;
			a_in_sum += pa;
			
			stack = stack.next;
		}
		
		
		stackIn = stackStart;
		stackOut = stackEnd;
		for ( x = 0; x < width; x++ )
		{
			pixels[yi+3] = pa = (a_sum * mul_sum) >> shg_sum;
			if ( pa !== 0 )
			{
				pa = 255 / pa;
				pixels[yi]   = ((r_sum * mul_sum) >> shg_sum) * pa;
				pixels[yi+1] = ((g_sum * mul_sum) >> shg_sum) * pa;
				pixels[yi+2] = ((b_sum * mul_sum) >> shg_sum) * pa;
			} else {
				pixels[yi] = pixels[yi+1] = pixels[yi+2] = 0;
			}
			
			r_sum -= r_out_sum;
			g_sum -= g_out_sum;
			b_sum -= b_out_sum;
			a_sum -= a_out_sum;
			
			r_out_sum -= stackIn.r;
			g_out_sum -= stackIn.g;
			b_out_sum -= stackIn.b;
			a_out_sum -= stackIn.a;
			
			p =  ( yw + ( ( p = x + radius + 1 ) < widthMinus1 ? p : widthMinus1 ) ) << 2;
			
			r_in_sum += ( stackIn.r = pixels[p]);
			g_in_sum += ( stackIn.g = pixels[p+1]);
			b_in_sum += ( stackIn.b = pixels[p+2]);
			a_in_sum += ( stackIn.a = pixels[p+3]);
			
			r_sum += r_in_sum;
			g_sum += g_in_sum;
			b_sum += b_in_sum;
			a_sum += a_in_sum;
			
			stackIn = stackIn.next;
			
			r_out_sum += ( pr = stackOut.r );
			g_out_sum += ( pg = stackOut.g );
			b_out_sum += ( pb = stackOut.b );
			a_out_sum += ( pa = stackOut.a );
			
			r_in_sum -= pr;
			g_in_sum -= pg;
			b_in_sum -= pb;
			a_in_sum -= pa;
			
			stackOut = stackOut.next;

			yi += 4;
		}
		yw += width;
	}

	
	for ( x = 0; x < width; x++ )
	{
		g_in_sum = b_in_sum = a_in_sum = r_in_sum = g_sum = b_sum = a_sum = r_sum = 0;
		
		yi = x << 2;
		r_out_sum = radiusPlus1 * ( pr = pixels[yi]);
		g_out_sum = radiusPlus1 * ( pg = pixels[yi+1]);
		b_out_sum = radiusPlus1 * ( pb = pixels[yi+2]);
		a_out_sum = radiusPlus1 * ( pa = pixels[yi+3]);
		
		r_sum += sumFactor * pr;
		g_sum += sumFactor * pg;
		b_sum += sumFactor * pb;
		a_sum += sumFactor * pa;
		
		stack = stackStart;
		
		for( i = 0; i < radiusPlus1; i++ )
		{
			stack.r = pr;
			stack.g = pg;
			stack.b = pb;
			stack.a = pa;
			stack = stack.next;
		}
		
		yp = width;
		
		for( i = 1; i <= radius; i++ )
		{
			yi = ( yp + x ) << 2;
			
			r_sum += ( stack.r = ( pr = pixels[yi])) * ( rbs = radiusPlus1 - i );
			g_sum += ( stack.g = ( pg = pixels[yi+1])) * rbs;
			b_sum += ( stack.b = ( pb = pixels[yi+2])) * rbs;
			a_sum += ( stack.a = ( pa = pixels[yi+3])) * rbs;
		   
			r_in_sum += pr;
			g_in_sum += pg;
			b_in_sum += pb;
			a_in_sum += pa;
			
			stack = stack.next;
		
			if( i < heightMinus1 )
			{
				yp += width;
			}
		}
		
		yi = x;
		stackIn = stackStart;
		stackOut = stackEnd;
		for ( y = 0; y < height; y++ )
		{
			p = yi << 2;
			pixels[p+3] = pa = (a_sum * mul_sum) >> shg_sum;
			if ( pa > 0 )
			{
				pa = 255 / pa;
				pixels[p]   = ((r_sum * mul_sum) >> shg_sum ) * pa;
				pixels[p+1] = ((g_sum * mul_sum) >> shg_sum ) * pa;
				pixels[p+2] = ((b_sum * mul_sum) >> shg_sum ) * pa;
			} else {
				pixels[p] = pixels[p+1] = pixels[p+2] = 0;
			}
			
			r_sum -= r_out_sum;
			g_sum -= g_out_sum;
			b_sum -= b_out_sum;
			a_sum -= a_out_sum;
		   
			r_out_sum -= stackIn.r;
			g_out_sum -= stackIn.g;
			b_out_sum -= stackIn.b;
			a_out_sum -= stackIn.a;
			
			p = ( x + (( ( p = y + radiusPlus1) < heightMinus1 ? p : heightMinus1 ) * width )) << 2;
			
			r_sum += ( r_in_sum += ( stackIn.r = pixels[p]));
			g_sum += ( g_in_sum += ( stackIn.g = pixels[p+1]));
			b_sum += ( b_in_sum += ( stackIn.b = pixels[p+2]));
			a_sum += ( a_in_sum += ( stackIn.a = pixels[p+3]));
		   
			stackIn = stackIn.next;
			
			r_out_sum += ( pr = stackOut.r );
			g_out_sum += ( pg = stackOut.g );
			b_out_sum += ( pb = stackOut.b );
			a_out_sum += ( pa = stackOut.a );
			
			r_in_sum -= pr;
			g_in_sum -= pg;
			b_in_sum -= pb;
			a_in_sum -= pa;
			
			stackOut = stackOut.next;
			
			yi += width;
		}
	}
	
	context.putImageData( imageData, top_x, top_y );
	
}

function stackBlurCanvasRGB( canvas, top_x, top_y, width, height, radius ){
	var context = canvas.getContext('2d');
	var imageData;
	try {
	  try {
		imageData = context.getImageData( top_x, top_y, width, height );
	  } catch(e) {
	  	console.log(e);
		// NOTE: this part is supposedly only needed if you want to work with local files
		// so it might be okay to remove the whole try/catch block and just use
		// imageData = context.getImageData( top_x, top_y, width, height );
		try {
			netscape.security.PrivilegeManager.enablePrivilege('UniversalBrowserRead');
			imageData = context.getImageData( top_x, top_y, width, height );
		} catch(ex) {
			console.error(ex);
			throw new Error('unable to access local image data: ' + ex);
		}
	  }
	} catch(e) {
	  console.error(e);
	  throw new Error('unable to access image data: ' + e);
	}
	stackBlurRGB(context, imageData, canvas, top_x, top_y, width, height, radius);
}

function imageDataFromCanvas(canvas){
	var context = canvas.getContext('2d');
	var imageData;
	try {
	  try {
		imageData = context.getImageData( 0, 0, canvas.width, canvas.height );
	  } catch(e) {
	  	console.error(e);
		// NOTE: this part is supposedly only needed if you want to work with local files
		// so it might be okay to remove the whole try/catch block and just use
		// imageData = context.getImageData( top_x, top_y, width, height );
		try {
			netscape.security.PrivilegeManager.enablePrivilege('UniversalBrowserRead');
			imageData = context.getImageData( top_x, top_y, width, height );
		} catch(ex) {
			alert('Cannot access local image');
			throw new Error('unable to access local image data: ' + ex);
		}
	  }
	} catch(e) {
	  alert('Cannot access image');
	  throw new Error('unable to access image data: ' + e);
	}
	return imageData;
}

/**
@param canvasWidth optional
@param canvasHeight optional
@return imageData
*/
function drawImage(img, canvas, canvasWidth, canvasHeight, context){
	if(_.isNumber(arguments[0])){
		return _drawImage.apply(this, arguments);
	}else
		_drawImage(0,0, img, canvas, canvasWidth, canvasHeight, context);
}

function _drawImage(x, y, img, canvas, canvasWidth, canvasHeight, context){
	
	var w = img.naturalWidth, h = img.naturalHeight;
	canvas.width = canvasWidth === undefined ? w: canvasWidth;
	canvas.height = canvasHeight === undefined ? h: canvasHeight;
	if(!context){
		context = canvas.getContext('2d');
		context.clearRect( x, y, canvas.width, canvas.height );
	}
	
	
	var scaleX = w/ canvasWidth; // 2/1 , 2
	var scaleY = h/ canvasHeight; // 1/1, 1
	
	//var scaleToFit = Math.max(scaleX, scaleY);
	var scaleToCover = Math.min(scaleX, scaleY);
	//var scaledWidth = Math.round(w/scaleToCover);
	//var scaledHeight = Math.round(h/scaleToCover);
	
	var cutWidth = w - canvasWidth * scaleToCover;
	var cutHeight = h - canvasHeight * scaleToCover;
	
	//console.log('cut '+ cutWidth+','+cutHeight);
	//console.log('scaled '+ scaledWidth +','+scaledHeight);
	
	context.drawImage( img, cutWidth >> 1, cutHeight >> 1, 
		Math.round(canvasWidth * scaleToCover), Math.round(canvasHeight * scaleToCover),
		x, y, canvasWidth, canvasHeight);
	//return imageDataFromCanvas(canvas);
}


function drawPartialCanvas(srcCanvas, canvas, width, height, sx, sy)
{
	canvas.width = width;
	canvas.height = height;
	var context = canvas.getContext('2d');
	context.clearRect( 0, 0, canvas.width, canvas.height );
	context.drawImage(srcCanvas, sx, sy, width, height, 0,0, width, height);
	//stackBlurCanvasRGB(canvas, 0, 0, canvas.width, canvas.height, blurRadius);
	//return context.getImageData(0,0, canvas.width, canvas.height);
	//return canvas.toDataURL('image/jpeg', 1);
}

function stackBlurRGB(context, imageData, canvas, top_x, top_y, width, height, radius ){
	
	
	
	if ( isNaN(radius) || radius < 1 ){
		//context.putImageData( srcImageData, top_x, top_y );
		return;
	}
	radius |= 0;
	//var imageData = new ImageData(new Uint8ClampedArray(srcImageData.data), srcImageData.width, srcImageData.height);	
	var pixels = imageData.data;
			
	var x, y, i, p, yp, yi, yw, r_sum, g_sum, b_sum,
	r_out_sum, g_out_sum, b_out_sum,
	r_in_sum, g_in_sum, b_in_sum,
	pr, pg, pb, rbs;
			
	var div = radius + radius + 1;
	var w4 = width << 2;
	var widthMinus1  = width - 1;
	var heightMinus1 = height - 1;
	var radiusPlus1  = radius + 1;
	var sumFactor = radiusPlus1 * ( radiusPlus1 + 1 ) / 2;
	
	var stackStart = new BlurStack();
	var stack = stackStart, stackEnd;
	for ( i = 1; i < div; i++ )
	{
		stack = stack.next = new BlurStack();
		if ( i == radiusPlus1 ) stackEnd = stack;
	}
	stack.next = stackStart;
	var stackIn = null;
	var stackOut = null;
	
	yw = yi = 0;
	
	var mul_sum = mul_table[radius];
	var shg_sum = shg_table[radius];
	
	for ( y = 0; y < height; y++ )
	{
		r_in_sum = g_in_sum = b_in_sum = r_sum = g_sum = b_sum = 0;
		
		r_out_sum = radiusPlus1 * ( pr = pixels[yi] );
		g_out_sum = radiusPlus1 * ( pg = pixels[yi+1] );
		b_out_sum = radiusPlus1 * ( pb = pixels[yi+2] );
		
		r_sum += sumFactor * pr;
		g_sum += sumFactor * pg;
		b_sum += sumFactor * pb;
		
		stack = stackStart;
		
		for( i = 0; i < radiusPlus1; i++ )
		{
			stack.r = pr;
			stack.g = pg;
			stack.b = pb;
			stack = stack.next;
		}
		
		for( i = 1; i < radiusPlus1; i++ )
		{
			p = yi + (( widthMinus1 < i ? widthMinus1 : i ) << 2 );
			r_sum += ( stack.r = ( pr = pixels[p])) * ( rbs = radiusPlus1 - i );
			g_sum += ( stack.g = ( pg = pixels[p+1])) * rbs;
			b_sum += ( stack.b = ( pb = pixels[p+2])) * rbs;
			
			r_in_sum += pr;
			g_in_sum += pg;
			b_in_sum += pb;
			
			stack = stack.next;
		}
		
		
		stackIn = stackStart;
		stackOut = stackEnd;
		for ( x = 0; x < width; x++ )
		{
			pixels[yi]   = (r_sum * mul_sum) >> shg_sum;
			pixels[yi+1] = (g_sum * mul_sum) >> shg_sum;
			pixels[yi+2] = (b_sum * mul_sum) >> shg_sum;
			
			r_sum -= r_out_sum;
			g_sum -= g_out_sum;
			b_sum -= b_out_sum;
			
			r_out_sum -= stackIn.r;
			g_out_sum -= stackIn.g;
			b_out_sum -= stackIn.b;
			
			p =  ( yw + ( ( p = x + radius + 1 ) < widthMinus1 ? p : widthMinus1 ) ) << 2;
			
			r_in_sum += ( stackIn.r = pixels[p]);
			g_in_sum += ( stackIn.g = pixels[p+1]);
			b_in_sum += ( stackIn.b = pixels[p+2]);
			
			r_sum += r_in_sum;
			g_sum += g_in_sum;
			b_sum += b_in_sum;
			
			stackIn = stackIn.next;
			
			r_out_sum += ( pr = stackOut.r );
			g_out_sum += ( pg = stackOut.g );
			b_out_sum += ( pb = stackOut.b );
			
			r_in_sum -= pr;
			g_in_sum -= pg;
			b_in_sum -= pb;
			
			stackOut = stackOut.next;

			yi += 4;
		}
		yw += width;
	}

	
	for ( x = 0; x < width; x++ )
	{
		g_in_sum = b_in_sum = r_in_sum = g_sum = b_sum = r_sum = 0;
		
		yi = x << 2;
		r_out_sum = radiusPlus1 * ( pr = pixels[yi]);
		g_out_sum = radiusPlus1 * ( pg = pixels[yi+1]);
		b_out_sum = radiusPlus1 * ( pb = pixels[yi+2]);
		
		r_sum += sumFactor * pr;
		g_sum += sumFactor * pg;
		b_sum += sumFactor * pb;
		
		stack = stackStart;
		
		for( i = 0; i < radiusPlus1; i++ )
		{
			stack.r = pr;
			stack.g = pg;
			stack.b = pb;
			stack = stack.next;
		}
		
		yp = width;
		
		for( i = 1; i <= radius; i++ )
		{
			yi = ( yp + x ) << 2;
			
			r_sum += ( stack.r = ( pr = pixels[yi])) * ( rbs = radiusPlus1 - i );
			g_sum += ( stack.g = ( pg = pixels[yi+1])) * rbs;
			b_sum += ( stack.b = ( pb = pixels[yi+2])) * rbs;
			
			r_in_sum += pr;
			g_in_sum += pg;
			b_in_sum += pb;
			
			stack = stack.next;
		
			if( i < heightMinus1 )
			{
				yp += width;
			}
		}
		
		yi = x;
		stackIn = stackStart;
		stackOut = stackEnd;
		for ( y = 0; y < height; y++ )
		{
			p = yi << 2;
			pixels[p]   = (r_sum * mul_sum) >> shg_sum;
			pixels[p+1] = (g_sum * mul_sum) >> shg_sum;
			pixels[p+2] = (b_sum * mul_sum) >> shg_sum;
			
			r_sum -= r_out_sum;
			g_sum -= g_out_sum;
			b_sum -= b_out_sum;
			
			r_out_sum -= stackIn.r;
			g_out_sum -= stackIn.g;
			b_out_sum -= stackIn.b;
			
			p = ( x + (( ( p = y + radiusPlus1) < heightMinus1 ? p : heightMinus1 ) * width )) << 2;
			
			r_sum += ( r_in_sum += ( stackIn.r = pixels[p]));
			g_sum += ( g_in_sum += ( stackIn.g = pixels[p+1]));
			b_sum += ( b_in_sum += ( stackIn.b = pixels[p+2]));
			
			stackIn = stackIn.next;
			
			r_out_sum += ( pr = stackOut.r );
			g_out_sum += ( pg = stackOut.g );
			b_out_sum += ( pb = stackOut.b );
			
			r_in_sum -= pr;
			g_in_sum -= pg;
			b_in_sum -= pb;
			
			stackOut = stackOut.next;
			
			yi += width;
		}
	}
	
	context.putImageData( imageData, top_x, top_y );
	
}

function BlurStack()
{
	this.r = 0;
	this.g = 0;
	this.b = 0;
	this.a = 0;
	this.next = null;
}

function offscreen(w, h){
	var canvas = document.createElement('canvas');
	canvas.width = w;
	canvas.height = h;
	return canvas.getContext('2d');
}

function scaleStageToCover(el, width, height){
	var scaleX = width/ el.clientWidth;
	var scaleY = height/ el.clientHeight;
	
	//var scaleToFit = Math.min(scaleX, scaleY);
	var scaleToCover = Math.max(scaleX, scaleY);
	
	el.style.transformOrigin = '50% 50%';
	el.style.transform = 'scale(' + scaleToCover + ')';
	return scaleToCover;
}

	return {
		stackBlurCanvasRGB: stackBlurCanvasRGB,
		drawImage: drawImage,
		imageDataFromCanvas: imageDataFromCanvas,
		scaleStageToCover: scaleStageToCover,
		//drawPartialImageBlur:drawPartialImageBlur,
		drawPartialCanvas: drawPartialCanvas
	};
}]);
