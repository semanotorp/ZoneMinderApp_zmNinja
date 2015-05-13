/* jshint -W041 */
/* jslint browser: true*/
/* global cordova,StatusBar,angular,console */


// core app start stuff
angular.module('zmApp', [
                            'ionic',
                            'zmApp.controllers'

                        ])




// this directive will be load any time an image completes loading 
// via img tags where this directive is added (I am using this in
// events and mionitor view to show a loader while the image is
// downloading from ZM

.directive('imageonload', function () {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            element.bind('load', function () {
                //call the function that was passed
                scope.$apply(attrs.imageonload);
            });
        }


    };
})

// In Android, HTTP requests seem to get stuck once in a while
// It may be a crosswalk issue.
// To tackle this gracefully, I've set up a global interceptor
// If the HTTP request does not complete in 15 seconds, it cancels
// That way the user can try again, and won't get stuck
// Also remember you need to add it to .config

.factory('timeoutHttpIntercept', function ($rootScope, $q) {
    //console.log("*** HTTP INTERCEPTOR CALLED ***");
    return {
        'request': function (config) {
            if ( !(config.url.indexOf("stop.json") > -1 ||
                config.url.indexOf("start.json") > -1 ||
                config.url.indexOf("restart.json") > -1 ))
            {
               config.timeout = 15000;
            }
            else
            {
                console.log ("HTTP INTERCEPT:Skipping HTTP timeout for "+config.url);
            }
            //console.log("*** HTTP URL INTERCEPTOR CALLED with "+config.url+" ***");
            return config;
        }


    };
})

/* For future use - does not work with img src intercepts
.factory ('httpAuthIntercept', function ($rootScope, $q)
{
    return {
    requestError: function (response) {
      console.log ("**** REJECT REQUEST: "+JSON.stringify(response));
      return $q.reject(response);
    },

    responseError: function (response) {
      console.log ("**** REJECT RESPONSE: "+JSON.stringify(response));
      return $q.reject(response);
    },
    response: function (response)
        {
            console.log("*******RESPONSE with status: "+response.status+"****************");
            if (response.status == 500)
            {
             console.log ("**** RESPONSE: "+JSON.stringify(response));
            }
                return (response);
        }
  };
})
*/


.run(function ($ionicPlatform, $ionicPopup, $rootScope, $state, ZMDataModel, $cordovaSplashscreen) {

    ZMDataModel.init();
    var loginData = ZMDataModel.getLogin();

    if (ZMDataModel.isLoggedIn()) {
        console.log("VALID CREDENTIALS. Grabbing Monitors");
        ZMDataModel.getMonitors(0);

    }


    // this works reliably on both Android and iOS. The "onorientation" seems to reverse w/h in Android. Go figure.
    // http://stackoverflow.com/questions/1649086/detect-rotation-of-android-phone-in-the-browser-with-javascript

    var checkOrientation = function () {
        var pixelRatio = window.devicePixelRatio || 1;
        $rootScope.devWidth = ((window.innerWidth > 0) ? window.innerWidth : screen.width);
        $rootScope.devHeight = ((window.innerHeight > 0) ? window.innerHeight : screen.height);
        console.log("********NEW Computed Dev Width & Height as" + $rootScope.devWidth + "*" + $rootScope.devHeight);
    };

    window.addEventListener("resize", checkOrientation, false);

    $rootScope.$on('$stateChangeStart', function (event, toState, toParams) {
        var requireLogin = toState.data.requireLogin;

        if (ZMDataModel.isLoggedIn() || ZMDataModel.isSimulated()) {
            console.log("State transition is authorized");
            return;
        }

        if (requireLogin) {

            console.log("**** STATE from " + "**** STATE TO " + toState.name);

            $ionicPopup.alert({
                title: "Credentials Required",
                template: "Please provide your ZoneMinder credentials or switch to simulation mode"
            });
            // for whatever reason, .go was resulting in digest loops.
            // if you don't prevent, states will stack
            event.preventDefault();
            $state.transitionTo('login');
        }

    });


    $ionicPlatform.ready(function () {

        // generates and error in desktops but works fine
        console.log("**** DEVICE READY ***");


        setTimeout(function () {
            $cordovaSplashscreen.hide();
            }, 1500);

        var pixelRatio = window.devicePixelRatio || 1;
        $rootScope.devWidth = ((window.innerWidth > 0) ? window.innerWidth : screen.width);
        $rootScope.devHeight = ((window.innerHeight > 0) ? window.innerHeight : screen.height);

        console.log("********Computed Dev Width & Height as" + $rootScope.devWidth + "*" + $rootScope.devHeight);

        // What I noticed is when I moved the app to the device
        // the montage screens were not redrawn after resuming from background mode
        // Everything was fine if I switched back to the montage screen
        // so as a global hack I'm just reloading the current state if you switch
        // from foreground to background and back
        document.addEventListener("resume", function () {
            console.log("****The application is resuming from the background");
            $rootScope.rand = Math.floor((Math.random() * 100000) + 1);
            console.log("** generated Random of " + $rootScope.rand);
            $state.go($state.current, {}, {
                reload: true
            });
        }, false);


        if (window.cordova && window.cordova.plugins.Keyboard) {
            cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
        }
        if (window.StatusBar) {
            // org.apache.cordova.statusbar required
            StatusBar.styleDefault();
        }


    });
})

// My route map connecting menu options to their respective templates and controllers
.config(function ($stateProvider, $urlRouterProvider, $httpProvider) {

    $httpProvider.interceptors.push('timeoutHttpIntercept');
    //$httpProvider.interceptors.push('httpAuthIntercept');


    $stateProvider
        .state('login', {
            data: {
                requireLogin: false
            },
            url: "/login",
            templateUrl: "templates/login.html",
            controller: 'zmApp.LoginCtrl',


        });

    $stateProvider
        .state('help', {
            data: {
                requireLogin: false
            },
            url: "/help",
            templateUrl: "templates/help.html",
            controller: 'zmApp.HelpCtrl',


        })

    .state('monitors', {
        data: {
            requireLogin: true
        },
        resolve: {
            message: function (ZMDataModel) {
                console.log("Inside app.montage resolve");
                return ZMDataModel.getMonitors(0);
            }
        },
        url: "/monitors",
        templateUrl: "templates/monitors.html",
        controller: 'zmApp.MonitorCtrl',

    })


    .state('events', {
        data: {
            requireLogin: true
        },
        resolve: {
            message: function (ZMDataModel) {
                console.log("Inside app.events resolve");
                return ZMDataModel.getMonitors(0);
            }
        },
        url: "/events/:id",
        templateUrl: "templates/events.html",
        controller: 'zmApp.EventCtrl',

    })

    //n
    .state('events-graphs', {
        data: {
            requireLogin: true
        },
        url: "/events-graphs",
        templateUrl: "templates/events-graphs.html",
        controller: 'zmApp.EventsGraphsCtrl',
    })

    .state('state', {
        data: {
            requireLogin: true
        },
        url: "/state",
        templateUrl: "templates/state.html",
        controller: 'zmApp.StateCtrl',
    })

    .state('montage', {
        data: {
            requireLogin: true
        },
        resolve: {
            message: function (ZMDataModel) {
                console.log("Inside app.montage resolve");
                return ZMDataModel.getMonitors(0);
            }
        },
        url: "/montage",
        templateUrl: "templates/montage.html",
        controller: 'zmApp.MontageCtrl',

    });



    // if none of the above states are matched, use this as the fallback
    var defaultState = "/monitors";
    //var defaultState = "/login";
    // as it turns out I can't really inject a factory in config the normal way
    // FIXME: In future, read up http://stackoverflow.com/questions/15937267/inject-service-in-app-config
    //var defaultState = (ZMDataModel.isLoggedIn())?  "/monitors":"/login";

    //$urlRouterProvider.otherwise(defaultState);

    // https://github.com/angular-ui/ui-router/issues/600
    // If I start using the urlRouterProvider above and the
    // first state is monitors it goes into a digest loop.

    $urlRouterProvider.otherwise(function ($injector, $location) {
        var $state = $injector.get("$state");
        $state.go("monitors");
    });

});
