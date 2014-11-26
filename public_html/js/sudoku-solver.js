/* 
 * Copyright (c) 2011 Paweł Motofa <montoriusz@montoriusz-it.pl>
 * All Rights Reserved. / Wszelkie prawa zastrzeżone.
 * 
 */

(function () {
    
    if (typeof Date.now !== 'function') {
        Date.now = function() { return new Date.getTime(); };
    }
    
    var ss = angular.module('SudokuSolver', [
        'ngSanitize', /*'ngAnimate', 'mgcrea.ngStrap',*/ 'ui.bootstrap', 'mnSudokuGrid'
    ]);
    
    ss.factory('Sudoku', [ function() {
        return Sudoku;
    }]);

    ss.factory('stopwatch', function() { 
        var
            hasPerf = !!(window.performance && performance.now);
            
        function now() {
            return hasPerf ? performance.now() : new Date();
        }
        
        var stopwatch = function(fn) {
            var t;
            t = now();
            fn();
            t = now() - t;
            return hasPerf ? t.toFixed(3) : t;
        };
        
        stopwatch.start = function(sw) {
            if (!sw) {
                sw = { total: 0, start: now() };
            } else if (!sw.start) {
                sw.start = now();
            } else {
                throw new Error("Stopwatch is already running.");
            }
            return sw;
        };
        
        stopwatch.pause = function(sw) {
            if (sw && sw.start) {
                sw.total += now() - sw.start;
                sw.start = null;
            } else {
                throw new Error("Stopwatch is not running.");
            }
            return hasPerf ? sw.total.toFixed(3) : sw.total;
        };
        
        stopwatch.stop = stopwatch.pause;
        
        return stopwatch;
    });
    
    ss.directive('mnMenuSelect', function() {
        return {
            restrict: 'A',
            transclude: true,
            require: [ 'ngModel' ],
            scope: {
                value: '=mnMenuSelect',
                caption: '@'
            },
            template: '<a href="" ng-click="ngModelCtrl.$setViewValue(value, $event)">\
                            <i class="glyphicon glyphicon-ok"\
                               ng-class="ngModelCtrl.$viewValue == value || \'notselected\'"></i>\
                               {{caption}}\
                        </a>',
            link: function(scope, element, attrs, ctrls) {
                scope.ngModelCtrl = ctrls[0];
            }
        };
    });
    
    ss.controller('MainCtrl', ['$scope', 'stopwatch', 'Sudoku', '$modal',
    function($scope, stopwatch, Sudoku, $modal) {
        
        function genStarsHtml(n) {
            var starsHtml = '';
            while (n > 0) {
                starsHtml += '<i class="glyphicon glyphicon-star"></i>';
                --n;
            }
            return starsHtml;
        }
        
        $scope.difficulty = 3;
        $scope.generationLevels = {
            1: { level: 1, maxSteps: 3, name: 'Easy', stars: 1 },
            3: { level: 2, maxSteps: 4, name: 'Medium', stars: 2 },
            4: { level: 3, maxSteps: 0, name: 'Hard', stars: 3 }
        };
        
        $scope.clear = function() {
            $scope.sudoku = { current: new Sudoku() };
            $scope.diag = null;
            $scope.game = {
                revealUsed: 0,
                lastGeneration: null,
                timeStart: Date.now() 
            };
        };
       
        $scope.solve = function(straight) {
            var t;
            if ($scope.sudoku.current.complete === 0) {
                $scope.diag = {
                    level: 'warning',
                    message: '<b>Grid is empty.</b> Input a puzzle to be solved or generate a random one.'
                };
            } else if ($scope.sudoku.current.complete === 81) {
                $scope.diag = {
                    level: 'info',
                    message: '<b>Grid is already complete.</b>'
                };
            } else {
                try {
                    var
                        base = $scope.sudoku.current,
                        current = new Sudoku(base, true);
                    
                    t = stopwatch(function() {
                        if (straight) {
                            current.solveStraight();
                        } else {
                            current = current.solveDeep() || current;
                        }
                    });
                    $scope.sudoku.current = current;
                    if (!current || current.complete < 81) {
                        $scope.diag = {
                            level: 'warning',
                            message: '<b>Can\'t solve.</b> Given puzzle may have multiple solutions...'
                        };
                    } else {
                        $scope.diag = {
                            level: 'success',
                            message: '<b>Successfully solved!</b>'
                        };
                        if (!$scope.sudoku.base) {
                            $scope.sudoku.base = base;
                        }
                    }
                    $scope.diag.message += '<br>';
                    if (t) {
                        $scope.diag.message += ' <span class="label"><i class="glyphicon glyphicon-time"></i> <b>' + t + 'ms</b></span>';
                    }
                    //$scope.diag.message += ' <span class="label">Passes: <b>' + current.passes + '</b></span>';
                } catch (e) {
                    $scope.diag = {
                        level: 'danger',
                        message: '<b>Grid is incorrect.</b> (' + (e.message || e) + ')'
                    };
                }
            }
        };
        
        $scope.generate = function() {
            var s, t, params;
            params = $scope.generationLevels[$scope.difficulty];
            if (!params) {
                throw new Error('Invalid generation level');
            }
            t = stopwatch(function() {
                s = Sudoku.generate(params.level, params.maxSteps);
            });
            
            $scope.diag = {
                level: 'info',
                message: '<b>Random puzzle generated.</b><br>'
                    + ' <span class="label"><i class="glyphicon glyphicon-time"></i> <b>' + t + 'ms</b></span>'
                    + ' <span class="label">' + genStarsHtml(params.stars) + '</span> '
                    //+ ' <span class="label">Attempts: <b>' + attempt + '</b></span>'
            };
            $scope.sudoku.current = null;
            $scope.sudoku.base = s;
            $scope.game = {
                revealUsed: 0,
                difficulty: $scope.difficulty,
                timeStart: Date.now() 
            };
        };
        
        $scope.peep = function() {            
            $modal.open({
                scope: $scope,
                templateUrl: 'peep-modal.html'
            });
            $scope.game.revealUsed = ($scope.game.revealUsed || 0) + 1;
        };
        
        $scope.changed = function(evt) {
            if (evt.type === 'set' && $scope.sudoku.current.complete === 81) {
                $scope.showSuccess();
            }
        };
        
        $scope.showSuccess = function() {
            var m, s, genParams;
            $scope.diag = {
                    level: 'success',
                    message: '<b>Congrats!</b> You solved the puzzle!'
            };
            if ($scope.sudoku.base) {
                genParams = $scope.game.difficulty && $scope.generationLevels[$scope.game.difficulty];
                if (genParams) {
                    $scope.diag.message += '<br><span class="label">' + genStarsHtml(genParams.stars) + '</span> ';
                }
                $scope.diag.message += '<span class="label">';
                if ($scope.game.revealUsed) {
                    $scope.diag.message += '<i class="glyphicon glyphicon-eye-open"></i> <b>Help used ' + $scope.game.revealUsed + ' times</b>';
                } else {
                    $scope.diag.message += '<i class="glyphicon glyphicon-eye-close"></i>';
                }
                $scope.diag.message += '</span> ';
                if ($scope.game.timeStart) {
                    s = (Date.now() - $scope.game.timeStart) / 1000;
                    m = Math.floor(s / 60);
                    s = Math.floor(s % 60);
                    $scope.diag.message += '<span class="label"><i class="glyphicon glyphicon-time"></i> <b>' + m + 'm ' + s + 's </b></span> ';
                }
            }
        };
        
        $scope.clear();
    }]);
    
})();
