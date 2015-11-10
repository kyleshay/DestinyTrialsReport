'use strict';

angular.module('trialsReportApp')
  .controller('controlsController', function ($scope, $location, homeFactory, statsFactory, inventoryService, locationChanger, $routeParams, $modal, guardianggFactory, $q) {

    // titles in modals need styling or could be removed
    if ('heatmapImage' in $scope.currentMap) {
      var heatmapModal = $modal({
        scope: $scope,
        title: 'Heatmap',
        contentTemplate: 'shared/modals/heatmap.modal.html',
        show: false
      });
      $scope.showHeatmap = function () {
        heatmapModal.$promise.then(heatmapModal.show);
      };
    }

    var faqModal = $modal({
      scope: $scope,
      title: 'FAQ',
      contentTemplate: 'shared/modals/faq.modal.html',
      show: false
    });
    $scope.showFAQ = function () {
      faqModal.$promise.then(faqModal.show);
    };

    if ($routeParams.playerName) {
      $scope.searchedPlayer = $routeParams.playerName;
    }

    $scope.searchMainPlayerbyName = function (name) {
      if (angular.isDefined(name)) {
        $location.path(($scope.platformValue ? '/ps/' : '/xbox/') + name);
      } else {
        if (angular.isDefined($scope.searchedPlayer)) {
          $location.path(($scope.platformValue ? '/ps/' : '/xbox/') + $scope.searchedPlayer);
        }
      }
    };

    function updateUrl($scope, locationChanger) {
      if ($scope.fireteam[0] && $scope.fireteam[1] && $scope.fireteam[2]) {
        if ($scope.fireteam[2].membershipId) {
          var platformUrl = $scope.platformValue ? '/ps/' : '/xbox/';
          locationChanger.skipReload()
            .withoutRefresh(platformUrl + $scope.fireteam[0].name + '/' +
            $scope.fireteam[1].name + '/' + $scope.fireteam[2].name, true);
        }
      }
    }

    $scope.searchPlayerbyName = function (name, platform, index) {
      if (angular.isUndefined(name)) {
        return;
      }
      return homeFactory.getAccount(($scope.platformValue ? 2 : 1), name)
        .then(function (account) {
          if (account) {
            if (angular.isDefined($scope.fireteam[1].name) || angular.isDefined($scope.fireteam[2].name)) {
              $scope.switchFocus();
              document.activeElement.blur();
            }
            var methods = [
              inventoryService.getInventory(account.membershipType, account),
              statsFactory.getstats(account),
              homeFactory.getActivities(account, '25'),
              guardianggFactory.getElo(account)
            ];

            $q.all(methods).then(function (results) {
              var teammate = results[0];
              $scope.$evalAsync( $scope.fireteam[index] = teammate );
              $scope.$parent.focusOnPlayer = index + 1;
              if (!$scope.fireteam[0].activities) {
                $scope.fireteam[0].activities = {lastThree: {}, lastMatches: {}};
              }
              updateUrl($scope, locationChanger);
            });
          }
        });
    };
  });
