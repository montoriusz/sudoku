/* 
 * LEGAL NOTICE / NOTA PRAWNA
 * Copyright (c) 2011 Paweł Motofa <montoriusz@montoriusz-it.pl>
 * All Rights Reserved. / Wszelkie prawa zastrzeżone.
 * 
 * All information contained herein is, and remains
 * the property of Paweł Motofa. The intellectual and
 * technical concepts contained herein are proprietary
 * to Paweł Motofa and are subject of business secret.
 * You DO NOT have premission to copy, reproduce, modify
 * or redistribute this content or any part of it. 
 * 
 * Cała informacja zawarta w tym pliku jest własnością
 * Pawła Motofy. Koncepcje i idee zawarte w poniższym
 * kodzie należą do Pawła Motofy i podlegają tajemnicy
 * handlowej. Nie masz prawa kopiować, odtwarzać,
 * modyfikować ani rozpowszechniać zawartości tego pliku
 * ani żadnej jego części.
 * 
 */

(function () {
    
    if (typeof Date.now !== 'function') {
        Date.now = function() { return new Date.getTime(); };
    }
    
    var ss = angular.module('SudokuSolver', ['ngSanitize']);
    
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
        
        // TODO: stopwatch.begin = function(name) { };
        // TODO: stopwatch.end = function(name) { };
        
        return stopwatch;
    });

    ss.directive('sudokuGrid', ['$parse', 'Sudoku', function($parse, Sudoku) {
        
        function genTemplate() {
            var i, c, s = '<div><table class="sudoku-grid">';
            for (i = 0; i < 81; ++i) {
                c = '';
                if (i % 9 === 0) s += '<tr>';
                if (i % 27 < 9) c += ' tb';
                if (i >= 72) c += ' bb';
                if (i % 3 === 0) c += ' lb';
                if (i % 9 === 8) c += ' rb';
                s += '<td';
                if (c) s += ' class="' + c + '"';
                s += '><input name="' + i + '" type="text" maxlength="1"></td>';
                if (i % 9 === 8) s += '</tr>';
            }
            s += '</table></div>';
            return s;
        }
        
        function link(scope, element, attrs /*, ngModel */) {
            
            var
                input, i;
            
            function targetInput(target) {
                var idx;
                if (target.tagName !== 'INPUT') {
                    return false;
                }
                idx = parseInt(target.name);
                if (isNaN(idx)) {
                    return false;
                }
                return idx;
            }
            
            function highlight(val, target) {
                var input;
                if (!val) {
                    scope.inputs.removeClass('hl');
                } else {
                    for (i = 0; i < scope.inputs.length; ++i) {
                        input = scope.inputs.eq(i);
                        if (input.val() == val) {
                            scope.inputs.eq(i).addClass('hl');
                        }
                    }
                }
            }
            
            function onKeyDown(evt) {
                var
                    idx, input, value;
                idx = targetInput(evt.target);
                if (idx === false || !evt.keyCode)
                    return;
                if (evt.keyCode >= 37 && evt.keyCode <= 40 // Arrows
                        && !(evt.ctrlKey || evt.shiftKey || evt.altKey)) {
                    evt.preventDefault();
                    if (evt.keyCode === 37) { // Left
                        idx -= 1;
                    } else if (evt.keyCode === 38) { // Up
                        idx -= 9;
                    } else if (evt.keyCode === 39) { // Right
                        idx += 1;
                    } else if (evt.keyCode === 40) { // Down
                        idx += 9;
                    }
                    if (idx >= 0 && idx <= 80) {
                        input = scope.inputs[idx];
                        input.focus();
                        input.setSelectionRange(0, 0);
                    }
                } else if (evt.keyCode >= 49 && evt.keyCode <= 57
                        || evt.keyCode >= 97 && evt.keyCode <= 105) { // 1 - 9
                    evt.preventDefault();
                    if (scope.model.base && scope.model.base.grid[idx] !== 0)
                        return;
                    input = scope.inputs[idx];
                    value = evt.keyCode <= 57 ? evt.keyCode - 48 : evt.keyCode - 96;
                    if (scope.model.current.grid[idx] != value) {
                        scope.$apply(function() {
                            clearValue(idx);
                            setValue(idx, value);
                            scope.inputTimes[idx] = Date.now();
                            highlight(value, input);
                        });
                    }
                } else if (evt.keyCode === 48 // 0
                        || evt.keyCode === 46 // Delete
                        || evt.keyCode === 8 // Backspace
                ) {
                    evt.preventDefault();
                    if (scope.model.base && scope.model.base.grid[idx] !== 0)
                        return;
                    input = scope.inputs[idx];
                    scope.$apply(function() {
                        input.value = '';
                        clearValue(idx);
                        highlight(false, input);
                    });
                } else {
                    evt.preventDefault();
                }
            }
            
            function onFocusBlur(evt) {
                var
                    idx, cur_val;
                idx = targetInput(evt.target);
                if (idx === false)
                    return;
                if (evt.type === 'focusout') {
                    cur_val = 0;
                } else {
                    cur_val = scope.inputs.eq(idx).val();
                }
                highlight(cur_val, evt.target);
            }
            
            function updateFormBase() {
                var i, input, v, b = scope.model.base || null;
                for (i = 0; i < scope.inputs.length; ++i) {
                    input = scope.inputs.eq(i);
                    v = b ? b.grid[i] : false;
                    input
                        .val(v || '')
                        .prop('readonly', !!v)
                        .toggleClass('frozen', !!v)
                        .removeClass('invalid');
                }
            }
            
            /*
            function clearFormValues() {
                scope.inputTimes = new Array(81);
                for (i = 0; i < scope.inputs.length; ++i) {
                    scope.inputs.eq(i).val('');
                }
                scope.inputTimes = new Array(81);
            }
            */
            
            function updateFormCurrent() {
                var i, v, input, pending_inputs, idx;
                if (!scope.model.current) {
                    return;
                }
                pending_inputs = [];
                for (i = 0; i < scope.inputs.length; ++i) {
                    input = scope.inputs.eq(i);
                    v = scope.model.current.grid[i];
                    if (v) {
                        input.val(v);
                        input.removeClass('invalid');
                    } else {
                        v = input.val();
                        if (v && input.hasClass('invalid')) {
                            pending_inputs.push({ idx: i, t: scope.inputTimes[i], v: v });
                        } else {
                            input.val('');
                            input.removeClass('invalid');
                        }
                    } 
                }
                pending_inputs.sort(function(a, b) { return a.t - b.t; });
                scope.model.isInvalid = false;
                for (i = 0; i < pending_inputs.length; ++i) {
                    idx = pending_inputs[i].idx;
                    setValue(idx, scope.inputs.eq(idx).val());
                }
            }
            
            function setValue(c, v) {
                var input;
                if (scope.model.current.grid[c] != v) {
                    input = scope.inputs.eq(c);
                    try {
                        scope.model.current.setCell(c, v);
                    } catch (ex) {
                        input.val(v);
                        input.addClass('invalid');
                        scope.model.isInvalid = true;
                    }
                }
            }
            
            function clearValue(c) {
                var i;
                if (scope.model.base && scope.model.base.hasValue(c)) {
                    return;
                }
                if (scope.model.current.hasValue(c)) {
                    scope.model.current.clearCell(c);
                } else {
                    scope.inputs.eq(c).val('').removeClass('invalid');
                    scope.model.isInvalid = false;
                    for (i = 0; i < scope.inputs.length; ++i) {
                        if (scope.inputs.eq(i).hasClass('invalid')) {
                            scope.model.isInvalid = true;
                            break;
                        }
                    }
                }
            }

            // Initialization
            
            scope.inputs = element.find('input');
                        
            element[0].addEventListener('keydown', onKeyDown, false);
            element[0].addEventListener('focusin', onFocusBlur, false);
            element[0].addEventListener('focusout', onFocusBlur, false);
            
            scope.$watchGroup([
                'model',
                'model.base', 'model.base.mod',
                'model.current', 'model.current.mod'
            ], function(newValues, oldValues) {
                var
                    baseChanged = (newValues[0] !== oldValues[0]
                                || newValues[1] !== oldValues[1]
                                || newValues[2] !== oldValues[2]),
                    currentChanged = (newValues[0] !== oldValues[0]
                                || newValues[3] !== oldValues[3]
                                || newValues[4] !== oldValues[4])
                    ;
                     
                // >> Ugly
                oldValues.length = 0;
                Array.prototype.push.apply(oldValues, newValues);
                // << Ugly
                     
                if (!scope.model) {
                    throw new Error("Model is empty.")
                } else {
                    /*if (!('base' in scope.model))
                        scope.model.base = null; */
                }

                // Base changed
                if (baseChanged) {
                    updateFormBase();
                    scope.inputTimes = null;
                }

                // Clear current
                if (!scope.model.current
                        || baseChanged && !currentChanged
                        || scope.model.base && !scope.model.base.isDescendant(scope.model.current)) {
                    scope.model.current = new Sudoku(scope.model.base || null);
                    scope.inputTimes = null;
                    if (!baseChanged) {
                        updateFormBase(); // clearForm
                    }
                }

                if (!scope.inputTimes) {
                    scope.inputTimes = new Array(81);
                }
                // Current changed
                if (currentChanged || baseChanged) {
                    updateFormCurrent();
                }
            });
        }
        
        return {
            //templateUrl: 'templates/sudoku-grid.html',
            //require: 'ngModel',
            template: genTemplate,
            restrict: 'E',
            scope: {
                model: '=ngModel',
            },
            link: link
        };
    }]);
    
    ss.controller('MainCtrl', ['$scope', 'stopwatch', 'Sudoku', function($scope, stopwatch, Sudoku) {
        $scope.sudoku = { current: new Sudoku() }; // { base: null };
        $scope.diag = null;
       
        $scope.clear = function() {
            $scope.sudoku = { current: new Sudoku() };
            $scope.diag = null;
        };
       
        $scope.solve = function() {
            var t;
            if ($scope.sudoku.current.complete == 0) {
                $scope.diag = {
                    level: 'info',
                    message: '<b>Grid is empty.</b>'
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
                        current = new Sudoku(base);
                    
                    current.passes = 0;
                    t = stopwatch(function() {
                        current.solveStraight();
                    });
                    if (current.complete < 81) {
                        $scope.diag = {
                            level: 'info',
                            message: '<b>Can\'t solve.</b> Given grid may have multiple solutions...'
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
                    $scope.diag.message += ' <span class="label">Passes: <b>' + current.passes + '</b></span>';
                    $scope.sudoku.current = current;
                } catch (e) {
                    $scope.diag = {
                        level: 'warning',
                        message: '<b>Grid is incorrect.</b> Solving failed. (' + (e.message || e) + ')'
                    };
                }
            }
        };
        
        $scope.generate = function() {
            var
                s, trial, t, attempt = 0;
            t = stopwatch(function() {
                while (!trial || trial.complete < 81) {
                    if (!trial) {
                        s = new Sudoku();
                        ++attempt;
                    }
                    trial = s.strike(trial || true);
                }
            });
            $scope.diag = {
                level: 'info',
                message: '<b>Random grid generated.</b><br>'
                    + ' <span class="label">Time: <b>' + t + 'ms</b></span>'
                    + ' <span class="label">Attempts: <b>' + attempt + '</b></span>'
            };
            $scope.sudoku.current = null;
            $scope.sudoku.base = s;
            // TODO: $scope.sudoku.solved = trial;
        };
        
        $scope.debug = function() {
            if ($scope.sudoku.current instanceof Sudoku) {
                $scope.sudoku.current.debug();
            }
        };
    }]);
    
    
})();
