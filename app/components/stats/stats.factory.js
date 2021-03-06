'use strict';

angular.module('trialsReportApp')
  .factory('statsFactory', function ($http, bungie, api, $q) {

    var getStats = function (player) {
      return bungie.getStats(
        player.membershipType,
        player.membershipId,
        player.characterInfo.characterId,
        '14'
      ).then(function (result) {
          var stats;
          if (angular.isDefined(result.data.Response)) {
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

    var getLighthouseCount = function (fireteam) {
      return api.lighthouseCount(
        _.pluck(fireteam, 'membershipId')
      ).then(function (result) {
          var dfd = $q.defer();
          _.each(fireteam, function (player) {
            var lighthouseVisits = {yearCount: 0};
            if (player && result && result.data) {
              if (result.data[player.membershipId]) {
                lighthouseVisits.years = {};
                _.each(result.data[player.membershipId].years, function (values, year) {
                  lighthouseVisits.yearCount++;
                  lighthouseVisits.years[year] = {year: year, accountCount: values.count};
                  if (values.characters) {
                    lighthouseVisits.years[year].characters = values.characters;
                  }
                });
              }

              if (player) {
                if (player.hasOwnProperty('lighthouse')) {
                  angular.extend(player.lighthouse, lighthouseVisits);
                } else {
                  player.lighthouse = lighthouseVisits;
                }
              }
            }
          });
          dfd.resolve(fireteam);
          return dfd.promise;
        });
    };

    var getTopWeapons = function (player) {
      var dfd = $q.defer();
      return api.topWeapons(
        player.characterInfo.characterId
      ).then(function (result) {
          if (result && result.data) {
            var topWeapons = [];
            _.each(result.data, function (weapon) {
              topWeapons.push({
                weaponId: weapon.weaponId,
                precision: +(100 * weapon.headshots / weapon.kills).toFixed(),
                kills: weapon.kills,
                headshots: weapon.headshots,
                win_percentage: +(1 * weapon.win_percentage).toFixed(),
                total_matches: weapon.total_matches
              });
            });
            player.topWeapons = topWeapons;
            dfd.resolve(player);
            return dfd.promise;
          }
        });
    };

    var weaponStats = function (player) {
      if (player && player.inventory) {
        var dfd = $q.defer();
        var pWeapons = player.inventory.weapons;
        var weaponArray = [pWeapons.primary.definition,pWeapons.special.definition,pWeapons.heavy.definition];
        var weaponIds = _.pluck(weaponArray, 'itemHash');
        return api.weaponStats(
          player.membershipId,
          weaponIds
        ).then(function (result) {
            if (result && result.data) {
              var topWeapons = {};
              _.each(result.data, function (weapon) {
                topWeapons[weapon.weaponId] = {
                  precision: +(100 * weapon.headshots / weapon.kills).toFixed(),
                  kills: weapon.kills,
                  headshots: weapon.headshots,
                  win_percentage: +(1 * weapon.win_percentage).toFixed()
                };
              });
              player.topWeapons = topWeapons;
              dfd.resolve(player);
              return dfd.promise;
            }
          });
      }
    };

    var mapStats = function (mapId) {
      return api.getMapInfo(mapId)
        .then(function (mapInfo) {
          if (mapInfo && mapInfo.data) {
            var kills, sum, typeKills, bucketSum, bucket;
            var mapData = mapInfo.data.map_info[0];
            var weaponTotals = {
              totalSum: 0,
              totalLifetime: 0
            };

            var mapHistory = _.sortBy(mapInfo.data.map_ref, 'first_instance');
            _.each(mapInfo.data.weapon_stats, function (weapon) {
              bucket = itemTypeNameToBucket[weapon.weapon_type];
              weapon.bucket = bucketHashToName[bucket];
            });

            var weaponsByBucket = _.groupBy(mapInfo.data.weapon_stats, 'bucket');
            _.each(['primary', 'special', 'heavy'], function (bucket) {
              kills = _.pluck(weaponsByBucket[bucket], 'kills');
              typeKills = _.pluck(weaponsByBucket[bucket], 'sum_kills');
              sum = _.reduce(kills, function(memo, num){ return memo + parseInt(num); }, 0);
              bucketSum = _.reduce(typeKills, function(memo, num){ return memo + parseInt(num); }, 0);
              weaponTotals.totalSum += parseInt(sum);
              weaponTotals.totalLifetime += parseInt(bucketSum);
              weaponTotals[bucket] = {
                sum: sum,
                bucketSum: bucketSum
              };
            });

            var weaponSummary = _.omit(weaponsByBucket, 'heavy');
            _.each(weaponSummary, function (weapons, key) {
              _.each(weapons, function (weapon) {
                var avgPercentage = +(100 * (weapon.sum_kills/weaponTotals[weapon.bucket].bucketSum)).toFixed(2);
                weapon.killPercentage = +(100 * (weapon.kills/weaponTotals[weapon.bucket].sum)).toFixed(2);
                weapon.diffPercentage = (weapon.killPercentage - avgPercentage).toFixed(2);
              });
            });

            return {
              weaponSummary: weaponSummary,
              weaponTotals:  weaponTotals,
              mapHistory:    mapHistory,
              mapInfo:       mapData
            };
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
          if (angular.isDefined(result.data)) {
            nonHazard = result.data;
          }
          player.nonHazard = nonHazard;
          return player;
        });
    };

    var getCurrentWeek = function (player) {
      return api.currentWeek(
        player.membershipId
      ).then(function (result) {
          if (result && result.data && result.data[0] && result.data[0].matches && result.data[0].losses) {
            player.currentWeek = {
              percent: +(100 * (result.data[0].matches - result.data[0].losses) / result.data[0].matches).toFixed(0),
              wins: (result.data[0].matches - result.data[0].losses),
              losses: result.data[0].losses
            };
            return player;
          }
        });
    };

    var getPlayerAds = function (fireteam) {
      return api.playerAds(
        _.pluck(fireteam, 'membershipId')
      ).then(function (result) {
          var foundMatch = false;
          if (result && result.data && result.data[0]) {
            _.each(fireteam, function (player) {
              var playerAd = _.find(result.data, function(ad){ return ad.membershipId == player.membershipId; });
              if (playerAd) {
                player.playerAd = playerAd;
                foundMatch = true;
              }
            });
          }
          return foundMatch
        });
    };

    return {
      getStats: getStats,
      getCurrentWeek: getCurrentWeek,
      getGrimoire: getGrimoire,
      checkSupporter: checkSupporter,
      getLighthouseCount: getLighthouseCount,
      getTopWeapons: getTopWeapons,
      getPreviousMatches: getPreviousMatches,
      weaponStats: weaponStats,
      mapStats: mapStats,
      getPlayerAds: getPlayerAds
    };
  });
