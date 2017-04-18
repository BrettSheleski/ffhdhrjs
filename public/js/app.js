var app = angular.module('ffhdhr', []);
app.controller('main', function($scope, $http) {
    $scope.appName= "ffHdHr JS";

    $scope.channels = [];
    $scope.isChannelsExpanded = true;
    $scope.toggleChannels = function(){
        $scope.isChannelsExpanded = !$scope.isChannelsExpanded;
    };

    $scope.selectChannel = function(channel){
        $scope.currentChannel = channel;
    };

    $scope.currentChannel = null;

    $http.get("lineup.json").then(function(response){
        for(var i = 0; i < response.data.length; ++i){
            $scope.channels.push(response.data[i]);
        }
    });


});
