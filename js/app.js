'use strict';


// TODO: Do not polute the global namespace, use a service !!!

/**
 * Convert the article from a JSON object to HTML. 
 */
function ConvertJSONToHTML(content){
	
	if (typeof content === 'string') {
	    return content;
	}
	
	if (content instanceof Array) {
		var result = '';
		angular.forEach(content, function(value){
		     result += ConvertJSONToHTML(value);
		});
	    return result;
	}
	
	if (content instanceof Object) {
		// Opening tag ...
		var result = ' <' + content.tag;
		if(content.cls){
			result += ' class="' + content.cls + '"'; 
		}
		if(content.href){
			result += ' href="' + content.href + '" target="blank"'; 
		}
		result += '>';
		
		// Recursively populate
		result += ConvertJSONToHTML(content.content);
		
		// Closing tag
		result += '</' + content.tag + '> ';
	    return result;
	}
	
	//console.log('EMPTY', content);
	return "";
}


//=============================================================================

var myApp = angular.module('myApp', ['ngSanitize', 'ngRoute']);

myApp.run(function ($rootScope) {
    $rootScope.CONTACT_EMAIL = 'hi@greeio.com';
 });

myApp.config(function($routeProvider) {
	
	$routeProvider
	
		.when('/song/:songId', {
			templateUrl : 'templates/song.html'
		})
		.when('/info', {
			templateUrl : 'templates/info.html',
			controller : function(){
				document.title = 'Greeio';
			}
		})
		.when('/faq', {
			templateUrl : 'templates/faq.html',
			controller : function(){
				document.title = 'Greeio - FAQ';
			}
		})
		
		.when('/', {
			templateUrl : 'templates/home.html',
			controller : function($scope, $http){
				document.title = 'Greeio';
				
				$scope.libraryLoaded = function(){
					return angular.isDefined($scope.library);
				};
				
				$http.get('data/library.json'
				).success(function(data, status, headers, config) {
					//console.log('Loaded library data ...', data);
					$scope.library = data;
				}).error(function(data, status, headers, config) {
					console.log('Cannot get library data.', data, status, headers);
					$scope.library = null;
				});
			}
		})
		.otherwise({
			redirectTo: '/'
		});
	
});


/* 
 * A temporary hack, since we're not using a backend
 */
myApp.DB = {
	"1" : 	"data/impi.json",
	"2" : 	"data/bells.json",
	"3" : 	"data/weeping.json"
}; 


myApp.controller('SongCtrl', function($scope, $sce, $http, $routeParams, $location) {
	
	var songId = $routeParams.songId ? (myApp.DB[$routeParams.songId] ? $routeParams.songId : "1") : "1";
	var dataFile = myApp.DB[songId];
	
	$http.get(dataFile
	).success(function(data, status, headers, config) {
		$scope.song = data;
		document.title = $scope.song.metadata.title + ' - ' + $scope.song.metadata.artist;
	}).error(function(data, status, headers, config) {
		console.log(data, status, headers);
		// TODO: Get rid of this !!!
		alert('Cannot get JSON data!');
	});
	
	
	
	$scope.nextSongLoaded = function(){
		return angular.isDefined($scope.nextSong);
	};
	
	// TODO: The id of the next song should come from the server
	var nextSongId = (Number(songId) + 1) + "";
	if(! myApp.DB[nextSongId]){
		nextSongId = "1";
	}
	dataFile = myApp.DB[nextSongId];
	
	$http.get(dataFile
	).success(function(data, status, headers, config) {
		$scope.nextSong = {
			id : nextSongId,
			thumbnail : data.artwork['imageUrl-xs'],
			title : data.artwork['title'],
			subTitle : data.artwork['subTitle'],
			country : data.metadata.countryCode
		};
	}).error(function(data, status, headers, config) {
		console.log('Cannot get next song data (nextSongId is ' + nextSongId + ").", data, status, headers);
	});
	
	
});



myApp.directive('nextSongBottomBox', function($location) {
	return {
		replace: true,
		templateUrl : 'templates/next-song-bottom-box.html',
		restrict: 'EA',
		link : function(scope, element, attrs) {
			element.on('click', function(){
				scope.$apply(function(){$location.path('/song/' + scope.nextSong.id);});
			});
		}
	};
});


myApp.directive('artworkSection', function($rootScope) {
	return {
		replace: true,
		templateUrl : 'templates/artwork-section.html',
		restrict: 'EA',
		link : function(scope, element, attrs) {
			// Set the height to be the full height of the screen
			$(element).height($(window).height());
			window.addEventListener('resize', function(event){
				$(element).height($(window).height());
			});
			
			// Set the background image, as soon as we have its URL ...
			scope.$watch('song', function(oldVal, newVal) {
				if(! scope.song){
					return;
				}
				
				
				/* TODO: This is a little bit of a hack, needs some cleaning up */
				$('.background-img').fadeOut();  // Fade out all background images 
				
				var f = function(size, delay){
					//console.log('imageUrl-' + size + ' is', scope.song.artwork['imageUrl-' + size]);
					if(scope.song.artwork['imageUrl-' + size]){
						 var imgObj = new Image();
						 imgObj.addEventListener('load', function(evt){
							 setTimeout(function(){
								 //console.log('Need to load ' + size + ' image');
								 var bgElem = $(element).find('.background-img-' + size).css('background-image', "url('" + scope.song.artwork['imageUrl-' + size] + "')");
								 if(size == 'xs'){
									 bgElem.show();
								 } else {
									 bgElem.fadeIn();
								 }
								 
							 }, delay);	
						 });
						 imgObj.src = scope.song.artwork['imageUrl-' + size];
					}
				};
				
				f('xs', 0);
				f('sm', 0);
				if($(window).width() > 768){
					f('md', 0);
				}
				if($(window).width() > 1200){
					f('lg', 0);
				}
				
					
				
			});
			
			
			// Set smooth scrolling behaviour
			var scrollTo = attrs.scrollDownTo || '#artwork-section .text-wrapper';
			
			element.on('click', function(t){
		        t.preventDefault();
		        
		        if($rootScope.sideMenuVisible){
		        	$rootScope.$apply(function () {
	        			$rootScope.sideMenuVisible = false;
	                });
		        	
		        } else {
		        	var dest = 0;
			        var e = $(scrollTo);
			        /*
			        console.log('e.offset().top is', e.offset().top);
			        if (e.offset().top > $(document).height() - $(window).height()) {
			        	console.log('dest gets ', $(document).height() , ' - ', $(window).height(), 'which is ', $(document).height() - $(window).height());
			            dest = $(document).height() - $(window).height();
			        } else {
			        	console.log('dest gets ', e.offset().top);
			            dest = e.offset().top;
			        }
			        */
			        dest = e.offset().top;
			        
			        //$("html,body").animate({scrollTop: dest}, 600);
			        $(".full-screen").animate({scrollTop: dest}, 600);
		        }
		        
		    });
		}
	};
});



myApp.directive('contentSection', function() {
	return {
		replace: true,
		templateUrl : 'templates/content-section.html',
		restrict: 'EA'
	};
});


myApp.directive('youtube', function($sce, $compile) {
  return {
    restrict: 'EA',
    replace: true,
    template: '<iframe width="240" src="{{url}}" frameborder="0" allowfullscreen></iframe>',
    link: function (scope, elem, attrs) {
    	scope.$watch('song', function(oldVal, newVal) {
    		if(! scope.song){
    			return;
    		}
        	scope.url = $sce.trustAsResourceUrl("//www.youtube.com/embed/" + attrs.youtubeId + '?autoplay=1');
    	});
    }
  };
});


myApp.directive('songArticle', function(){
	return {
		restrict: 'EA',
		replace: true,
        link: function (scope, elem, attrs) {
        	//console.log("SongArticle.link() ...");
        	scope.$watch('song', function(oldVal, newVal) {
        		if(! scope.song){
        			return;
        		}
        		elem.html(ConvertJSONToHTML(scope.song.article.content));
        		
        		$('.side-note')
        			.prepend($('<span class="glyphicon glyphicon-pushpin side-note-toggle"></span>'))
        			.addClass('minimized')
        			.click(function(event){
        				$(this).toggleClass('minimized');
        			}
        		);
        		
        	});
        },
	};
});

myApp.directive('songCredits', function(){
	return {
		restrict: 'EA',
		replace: true,
        link: function (scope, elem, attrs) {
        	//console.log("songCredits.link() ...");
        	scope.$watch('song', function(oldVal, newVal) {
        		if(! scope.song){
        			return;
        		}
        		elem.html(ConvertJSONToHTML(scope.song.metadata.credits));
        	});
        },
	};
});


myApp.directive('sideMenuToggle', function($rootScope){
	return {
		restrict: 'A',
		link : function (scope, elem, attrs) {
			//console.log('Adding a click handler to ', elem);
			elem.bind('click', function(event){
				//console.log('Menu trigger clicked!');
        		event.stopPropagation();
        		$rootScope.$broadcast('sideMenuToggle');
			});
		}
	};
});


myApp.directive('sideMenu', function($rootScope, $location){
	return {
		restrict: 'EA',
		templateUrl: 'templates/side-menu.html',
        link: function (scope, elem, attrs) {
        	
        	$rootScope.$on('sideMenuToggle', function(event){
        		$rootScope.$apply(function () {
        			$rootScope.sideMenuVisible = ! $rootScope.sideMenuVisible;
                });
        	});
        	
        	
        	$rootScope.$watch('sideMenuVisible', function(showMenu) {
        		
        		var options = {
        			duration : 250, 
        			distance: $(elem).width(), 
        			complete : function(){
        				if($rootScope.sideMenuRedirect){
	            			$rootScope.$apply(function() { $location.path($rootScope.sideMenuRedirect); });
	            			$rootScope.sideMenuRedirect = null;
	            		}
        			}
        		};
        		
        		$(elem).toggleClass('push-left', ! showMenu, options);
        		$(attrs.contentDivSelector || elem.next()).toggleClass('push-right', showMenu, options);
        		
        		
        		if(showMenu){
        			
        			$('.full-screen').css({'overflow-y' : 'hidden'}).on('mousewheel.greeio', function(event){
        				//console.log('Scroll!', event);
                		event.preventDefault();
                	});
        			
        			
        			// FIXME: What if the attribute wasn't provided?
        			
                	$('body').on('click.greeio', attrs.contentDivSelector,function(){
                		//console.log('body clicked', $(this));
            			$rootScope.$apply(function () {
                			$rootScope.sideMenuVisible = false;
                        });
                	});
                	
                	$(attrs.contentDivSelector || elem.next()).append('<div class="dark-overlay"></div>');
                	
                	
                	$(document).on('keyup.greeio', function(event) {
                		//console.log('keyup', event.keyCode, event.namespace, event);
                	    if (event.keyCode == 27) { // Escape 
                	    	$rootScope.$apply(function () {
                    			$rootScope.sideMenuVisible = false;
                            });
                	    }
                	});
                	
        		} else {
        			$('.full-screen').css({'overflow-y' : 'visible'}).off('mousewheel.greeio');
        			$('body').off('click.greeio');
        			$(document).off('keyup.greeio');
        			$(attrs.contentDivSelector || elem.next()).find('.dark-overlay').detach();
        		}
        		
        	});
        	
        },
	};
});


myApp.directive('menuLink', function($rootScope){
	return {
		restrict: 'EA',
		replace : true,
		template : '<div class="menu-link"><span class="link-icon"></span>{{displayText}}</div>',
		scope: {
			displayText: '@displayText'
        },
		link : function (scope, elem, attrs) {
			$(elem).find('.link-icon').addClass(attrs.iconClass);
			elem.bind('click', function(event){
				event.preventDefault();
        		$rootScope.$apply(function () {
        			$rootScope.sideMenuVisible = false;
        			$rootScope.sideMenuRedirect = attrs.linkUrl;
                });
				
			});
		}
	};
});


// TODO: We should probably watch scope.library for changes !!!
myApp.directive('libraryContainer', function(){
	return {
		restrict: 'A',
		replace : false,
		template : '<div class="center-block text-center loading-message" ng-hide="libraryLoaded()">Loading library ...</div>' +
			'<div data-library-item ng-repeat="item in library"></div>'
	};
});


myApp.directive('libraryItem', function($location){
	return {
		restrict: 'A',
		replace : true,
		templateUrl: 'templates/library-item.html',
		link : function (scope, elem, attrs) {
			elem.on('click', function(){
				console.log('Redirect to song/' + attrs.songId);
				scope.$apply(function(){
					$location.path('song/' + attrs.songId);
				});
			});
		}
	};
});



myApp.filter('newlines', function () {
    return function(text) {
        return text ? text.replace(/\n/g, '<br/>') : '';
    };
});

