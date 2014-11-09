/* 
 * LEGAL NOTICE / NOTA PRAWNA
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
            hasPerf = !!(window.performance && performance.now),
            runs = {};
        
        var stopwatch = function(fn) {
            var t;
            if (hasPerf) {
                t = performance.now();
                fn();
                t = (performance.now() - t).toFixed(3);
            } else {
                t = new Date();
                fn();
                t = new Date() - t;
            }
            return t;
        };
        
        // TODO: stopwatch.start = function(name) { };
        // TODO: stopwatch.stop = function(name) { };
        
        return stopwatch;
    });
    
    ss.controller('MainCtrl', ['$scope', 'stopwatch', 'Sudoku', '$modal',
    function($scope, stopwatch, Sudoku, $modal) {
            
        $scope.clear = function() {
            $scope.sudoku = { current: new Sudoku() };
            $scope.diag = null;
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
                            current = current.solveDeep();
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
                        $scope.diag.message += ' <span class="label">Time: <b>' + t + 'ms</b></span>';
                    }
                    //$scope.diag.message += ' <span class="label">Passes: <b>' + current.passes + '</b></span>';
                } catch (e) {
                    $scope.diag = {
                        level: 'danger',
                        message: '<b>Grid is incorrect.</b> Solving failed. (' + (e.message || e) + ')'
                    };
                }
            }
        };
        
        $scope.generate = function(diff) {
            var s, t, level = 1, maxSteps = 3, diff_text;
            switch (diff) {
                case 1: level = 1, maxSteps = 3; diff_text = 'Easy'; break;
                //case 2: level = 2, maxSteps = 4; diff_text = 'Medium'; break;
                case 3: level = 2, maxSteps = 4; diff_text = 'Medium'; break;
                case 4: level = 3, maxSteps = 0; diff_text = 'Hard'; break;
            }
            t = stopwatch(function() {
                s = Sudoku.generate(level, maxSteps);
            });
            $scope.diag = {
                level: 'info',
                message: '<b>Random grid generated.</b><br>'
                    + ' <span class="label">Time: <b>' + t + 'ms</b></span>'
                    + ' <span class="label">Max. difficulty: <b>' + diff_text + '</b></span>'
                    //+ ' <span class="label">Attempts: <b>' + attempt + '</b></span>'
            };
            $scope.sudoku.current = null;
            $scope.sudoku.base = s;
        };
        
        $scope.peep = function() {            
            $modal.open({
                scope: $scope,
                templateUrl: 'peep-modal.html'
            });
        };
        
        $scope.changed = function(evt) {
            var m, s;
            if (evt.type === 'set' && $scope.sudoku.current.complete === 81) {
                $scope.diag = {
                    level: 'success',
                    message: '<b>Congrats!</b> You solved the puzzle!'
                };
                if ($scope.sudoku.base) {
                    s = (Date.now() - $scope.sudoku.base.mod) / 1000;
                    m = Math.floor(s / 60);
                    s = Math.floor(s % 60);
                    $scope.diag.message += '<br><span class="label">Time: <b>' + m + 'm ' + s + 's </b></span>';
                }
            }
        };
        
        $scope.clear();
    }]);
    
    
})();
