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
    
    var ss = angular.module('SudokuSolver', []);
    
    ss.factory('Sudoku', [ function() {
        return Sudoku;
    }]);

    ss.directive('sudokuGrid', ['Sudoku', function(Sudoku) {
        
        function link(scope, element, attrs /*, ngModel */) {
            
            var
                control, input, i;
            
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
                if (!val) {
                    scope.inputs.removeClass('hl');
                } else {
                    for (i = 0; i < scope.inputs.length; ++i) {
                        if (scope.current.grid[i] === +val) {
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
                } else if (evt.keyCode >= 49 && evt.keyCode <= 57) { // 1 - 9
                    evt.preventDefault();
                    input = scope.inputs[idx];
                    value = evt.keyCode - 48;
                    if (scope.current.grid[idx] == value)
                        return;
                    clearValue(idx);
                    scope.inputTimes[idx] = Date.now();
                    input.value = value;
                    if (!setValue(idx, value)) {
                        input.value = scope.current.grid[idx] || '';
                    }
                    highlight(value, input);
                } else if (evt.keyCode === 48 // 0
                        || evt.keyCode === 46 // Delete
                        || evt.keyCode === 8 // Backspace
                ) {
                    evt.preventDefault();
                    input = scope.inputs[idx];
                    input.value = '';
                    scope.inputTimes[idx] = null;
                    clearValue(idx);
                    highlight(false, input);
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
            
            function loadModel() {
                var i, input, v;
                //if (!(scope.model instanceof Sudoku))
                //    return;
                scope.current = new Sudoku(scope.model || null);
                for (i = 0; i < scope.inputs.length; ++i) {
                    input = scope.inputs.eq(i);
                    v = scope.current.grid[i];
                    input.val(v || '');
                    input.prop('readonly', !!v);
                    input.toggleClass('frozen', !!v);
                }
                scope.inputTimes = new Array(81);
            }
            
            function setValue(c, v) {
                var input;
                /*if (!/^[1-9]$/.test(v) || scope.model.hasValue(c))
                    return false;*/

                input = scope.inputs.eq(c);
                try {
                    scope.current.setCell(c, v);
                    input.removeClass('invalid');
                } catch (ex) {
                    input.addClass('invalid');
                    //console.log('Invalid cell value: ' + ex);
                }
                return true;
            }
            
            function clearValue(c) {
                var i, v, input, ord_inputs, idx;
                if (scope.model.hasValue(c) || !scope.current.hasValue(c)) {
                    scope.inputs.eq(c).removeClass('invalid');
                    return;
                }
                scope.current = new Sudoku(scope.model);
                ord_inputs = [];
                for (i = 0; i < scope.inputs.length; ++i) {
                    input = scope.inputs.eq(i);
                    v = scope.current.grid[i];
                    if (v) {
                        input.val(v);
                    } else if (i === c) {
                        input.val('');
                    } else {
                        v = input.val();
                        if (v) {
                            ord_inputs.push({ idx: i, t: scope.inputTimes[i], v: v });
                        }
                    }
                }
                
                ord_inputs.sort(function(a, b) { return a.t - b.t; });
                for (i = 0; i < ord_inputs.length; ++i) {
                    idx = ord_inputs[i].idx;
                    setValue(idx, scope.inputs.eq(idx).val());
                }
            }
                        
            // Controller interface
            control = scope.ctrl = {
                apply: function() {
                    // TODO: check for invalid
                }
            };
                                    
            
            // Initialization
            
            scope.inputs = element.find('input');
            
            for (i = 0; i < scope.inputs.length; ++i) {
                input = scope.inputs.eq(i);
                input.attr('name', i).attr('maxlength', 1);
            }
                        
            element[0].addEventListener('keydown', onKeyDown, false);
            element[0].addEventListener('focusin', onFocusBlur, false);
            element[0].addEventListener('focusout', onFocusBlur, false);
            
            if (attrs.control) {
                scope.$parent[attrs.control] = control;
            }
            
            scope.$watch('model', loadModel);
        }
        
        return {
            templateUrl: 'templates/sudoku-grid.html',
            //require: 'ngModel',
            restrict: 'E',
            scope: {
                model: '=ngModel'
            },
            link: link
        };
    }]);
    
    ss.controller('MainCtrl', ['$scope', 'Sudoku', function($scope, Sudoku) {
       $scope.sudoku = new Sudoku();
       
       $scope.clear = function() {
           $scope.sudoku = new Sudoku();
       };
       
       $scope.solve = function() {
           console.debug($scope.grid);
            var sudoku = new Sudoku($scope.grid);
            try {
                sudoku.solveFast();
                $scope.grid = sudoku.getGrid();
                console.debug($scope.grid);
            } catch (e) {
                alert('Solving failed: ' + e);
            }
       };
    }]);
    
    
})();
