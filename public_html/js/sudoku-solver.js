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
                            <i class="fa fa-check"\
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
        
        var game;
        
        function starsHtml(n) {
            var html = '';
            while (n > 0) {
                html += '<i class="fa fa-star"></i> ';
                --n;
            }
            return html;
        }
        
        $scope.difficulty = 3;
        $scope.generationLevels = {
            1: { level: 1, maxSteps: 3, name: 'Easy', stars: 1 },
            3: { level: 2, maxSteps: 4, name: 'Medium', stars: 2 },
            4: { level: 3, maxSteps: 0, name: 'Hard', stars: 3 }
        };
        
        $scope.starsHtml = starsHtml;
        
        $scope.clear = function() {
            $scope.sudoku = { current: new Sudoku() };
            $scope.diag = null;
            game = {
                revealUsed: 0,
                lastGeneration: null,
                timeStart: Date.now() 
            };
        };
       
        $scope.solve = function(straight) {
            var t;
            if ($scope.sudoku.current.complete === 0) {
                $scope.diag = { message: 'grid-empty' };
            } else if ($scope.sudoku.current.complete === 81) {
                $scope.diag = { message: 'grid-already-complete' };
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
                        $scope.diag = { message: 'cannot-solve' };
                    } else {
                        $scope.diag = {
                            message: 'solve-success',
                            time: t && (t + 'ms') || null
                        };
                        if (!$scope.sudoku.base) {
                            $scope.sudoku.base = base;
                        }
                    }
                } catch (e) {
                    $scope.diag = {
                        message: 'grid-incorrect',
                        error: e.message || e
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
                message: 'puzzle-generated',
                time: t && (t + 'ms') || null,
                difficulty: $scope.difficulty
            };
            $scope.sudoku.current = null;
            $scope.sudoku.base = s;
            game = {
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
            game.revealUsed = (game.revealUsed || 0) + 1;
        };
        
        $scope.changed = function(evt) {
            if (evt.type === 'set' && $scope.sudoku.current.complete === 81) {
                $scope.showSuccess();
            }
        };
        
        $scope.showSuccess = function() {
            var m, s;
            $scope.diag = { message: 'user-solved' };
            if (game && $scope.sudoku.base) {
                s = (Date.now() - game.timeStart) / 1000;
                m = Math.floor(s / 60);
                s = Math.floor(s % 60);
                $scope.diag.game = {
                    difficulty: game.difficulty || null,
                    revealUsed: game.revealUsed,
                    time: m + 'm ' + s + 's'
                };
            }
        };
        
        $scope.clear();
    }]);
    
})();
