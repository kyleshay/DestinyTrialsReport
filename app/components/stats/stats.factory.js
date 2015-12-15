'use strict';

angular.module('trialsReportApp')
  .factory('statsFactory', function ($http, bungie, api) {

    var getStats = function (player) {
      return bungie.getStats(
        player.membershipType,
        player.membershipId,
        player.characterInfo.characterId,
        '14'
      ).then(function (result) {
          var stats;
          if(angular.isDefined(result.data.Response)) {
            stats = result.data.Response.trialsOfOsiris.allTime;
            if (stats) {
              stats.activitiesWinPercentage = {
                'basic': {'value': +(100 * stats.activitiesWon.basic.value / stats.activitiesEntered.basic.value).toFixed()},
                'statId': 'activitiesWinPercentage'
              };
              stats.activitiesWinPercentage.basic.displayValue = stats.activitiesWinPercentage.basic.value + '%';
            }
          }
          player.stats = stats;
          return player;
        });
    };

    var getGrimoire = function (player) {
      return bungie.getGrimoire(
        player.membershipType,
        player.membershipId,
        '110012'
      ).then(function (result) {
          var lighthouse = false;
          if (angular.isDefined(result.data.Response)) {
            lighthouse = result.data.Response.data.cardCollection.length > 0;
          }
          if (player.hasOwnProperty('lighthouse')) {
            player.lighthouse.grimoire = lighthouse;
          } else {
            player.lighthouse = {grimoire: lighthouse};
          }
          return player;
        });
    };

    var getLighthouseCount = function (player) {
      return api.lighthouseCount(
        player.membershipId
      ).then(function (result) {
          if (result && result.data) {
            var lighthouseVisits = {};
            var lighthouseAccountCount = 0;
            var lighthouseCharacterCount = 0;

            var lighthouseByCharacter = _.groupBy(result.data, 'characterId');
            _.each(lighthouseByCharacter, function (lighthouseVisits, characterId) {
              var visits = {};

              _.each(lighthouseVisits, function (lighthouseVisit) {
                var now = moment.utc(lighthouseVisit.period);
                var begin = now.clone().day(5).hour(18).minute(0).second(0).millisecond(0);
                if (now.isBefore(begin)) begin.subtract(1, 'week');

                var dateBeginTrials = begin.format('YYYY-MM-DD');

                visits[dateBeginTrials] = visits[dateBeginTrials] + 1 || 1;
              });

              var visitsCount = _.size(visits);
              lighthouseVisits[characterId] = visits;
              lighthouseAccountCount += visitsCount;
              if (characterId == player.characterInfo.characterId) {
                lighthouseCharacterCount = visitsCount;
              }
            });

            if (player.hasOwnProperty('lighthouse')) {
              player.lighthouse.visits = lighthouseVisits;
              player.lighthouse.accountCount = lighthouseAccountCount;
              player.lighthouse.characterCount = lighthouseCharacterCount;
            } else {
              player.lighthouse = {
                visits: lighthouseVisits,
                accountCount: lighthouseAccountCount,
                characterCount: lighthouseCharacterCount
              };
            }
            return player;
          }
        });
    };

    var getTopWeapons = function (player) {
      return api.topWeapons(
        player.membershipId
      ).then(function (result) {
          if (result && result.data) {
            var topWeapons = {};
            _.each(result.data, function (weapon) {
              topWeapons[weapon.weaponId] = {percision: +(100 * weapon.headshots / weapon.kills).toFixed()};
            });
            player.topWeapons = topWeapons;
            return player;
          }
        });
    };

    var getPreviousMatches = function (player) {
      return api.previousMatches(
        player.membershipId
      ).then(function (result) {
          if (result && result.data) {
            return result.data;
          }
        });
    };

    var checkSupporter = function (player) {
      return api.checkSupporterStatus(
        player.membershipId
      ).then(function (result) {
          var nonHazard;
          if(angular.isDefined(result.data)) {
            nonHazard = result.data;
          }
          player.nonHazard = nonHazard;
          return player;
        });
    };

    return {
      getStats: getStats,
      getGrimoire: getGrimoire,
      checkSupporter: checkSupporter,
      getLighthouseCount: getLighthouseCount,
      getTopWeapons: getTopWeapons,
      getPreviousMatches: getPreviousMatches
    };
  });
