/* 
 * Copyright (c) 2011 Paweł Motofa <montoriusz@montoriusz-it.pl>
 * All Rights Reserved. / Wszelkie prawa zastrzeżone.
 * 
 */

(function() {
    
    var module = angular.module('mnSudokuGrid', []);
    
    function renderGrid(cellCallback, footer) {
        var i, clas, s = '<table class="sudoku-grid">';
        for (i = 0; i < 81; ++i) {
            clas = '';
            // Row begin
            if (i % 9 === 0) s += '<tr>';
            // Cell classes
            if (i % 27 < 9) clas += ' tb';
            if (i >= 72) clas += ' bb';
            if (i % 3 === 0) clas += ' lb';
            if (i % 9 === 8) clas += ' rb';
            // Cell begin
            s += '<td';
            if (clas) s += ' class="' + clas + '"';
            s += '>';
            s += cellCallback(i);
            s += '</td>';
            if (i % 9 === 8) s += '</tr>';
        }
        if (footer) {
            s += '<tr><td colspan="9" class="text-right nb">' + footer + '</td></tr></table>';
        }
        return s;
    }

    module.directive('mnSudokuGrid', ['$parse', 'Sudoku', function($parse, Sudoku) {
            
        function genTemplate() {
            return renderGrid(function(c) {
               return '<input name="' + c + '" type="text" maxlength="1"></td>'; 
            }, '<span class="badge">{{model.current.complete}} / 81</span>');
        }
            
        function targetInput(target) {
            var idx = false;

            if (target.tagName === 'INPUT') {
                idx = parseInt(target.name);
                if (isNaN(idx)) {
                    idx = false;
                }
            }
            return idx;
        }
        
        function onKeyDown(evt) {
            var
                scope = this.scope, idx, input, value, grid_changed = false;
            idx = targetInput(evt.target);
            if (idx === false) {
                return;
            }

            // Arrows
            if (evt.keyCode >= 37 && evt.keyCode <= 40
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
                    input = this.inputs[idx];
                    input.focus();
                    input.setSelectionRange(0, 0);
                }
            }

            // Digits
            else if (evt.keyCode >= 49 && evt.keyCode <= 57     // digits
                    || evt.keyCode >= 97 && evt.keyCode <= 105) { // numpad digits
                evt.preventDefault();
                if (scope.model.base && scope.model.base.hasValueAt(idx))
                    return;
                input = this.inputs[idx];
                value = evt.keyCode <= 57 ? evt.keyCode - 48 : evt.keyCode - 96;
                if (scope.model.current.grid[idx] != value) {
                    this.clearValue(idx);
                    grid_changed = this.setValue(idx, value);
                    this.inputTimes[idx] = Date.now();
                    this.highlight(value, input);
                    scope.$apply(function() {
                        (grid_changed === true) && scope.onChange({
                            event: { type: 'set', cell: idx, value: value }
                        });
                    });
                }
            }

            // Delete
            else if (evt.keyCode === 48   // 0
                    || evt.keyCode === 46 // Delete
                    || evt.keyCode === 8  // Backspace
            ) {
                evt.preventDefault();
                if (scope.model.base && scope.model.base.hasValueAt(idx))
                    return;
                input = this.inputs[idx];
                if (input.value) {
                    input.value = '';
                    this.clearValue(idx);
                    this.highlight(false, input);
                    scope.$apply(function() {
                        scope.onChange({
                            event: { type: 'unset', cell: idx, value: null }
                        });
                    });
                }
            } else {
                evt.preventDefault();
            }
        };
        
        function onFocusBlur(evt) {
            var idx, cur_val;

            idx = targetInput(evt.target);
            if (idx !== false) {
                cur_val = (evt.type === 'focusin' || evt.type === 'focus') ? this.inputs.eq(idx).val() : false;
                this.highlight(cur_val, evt.target);
            }
        }
        
        function onValuesChange(newValues, oldValues) {
            var
                baseChanged = (newValues[0] !== oldValues[0]
                            || newValues[1] !== oldValues[1]
                            || newValues[2] !== oldValues[2]),
                currentChanged = (newValues[0] !== oldValues[0]
                            || newValues[3] !== oldValues[3]
                            || newValues[4] !== oldValues[4]),
                scope = this.scope;

            // >> Save current values as old values (ugly, angular could do better)
            oldValues.length = 0;
            Array.prototype.push.apply(oldValues, newValues);
            // <<

            if (!scope.model) {
                throw new Error("Model is empty.");
            }

            // Base changed
            if (baseChanged) {
                this.updateFormBase();
                this.inputTimes = null;
            }

            // Recreate current if changed, orphaned or not exist
            if (!scope.model.current
                    || baseChanged && !currentChanged) {
                scope.model.current = new Sudoku(scope.model.base || null, true);
                this.inputTimes = null;
                if (!baseChanged) {
                    this.updateFormBase(); // clear form
                }
            }

            if (!this.inputTimes) {
                this.inputTimes = new Array(81);
            }

            if (currentChanged || baseChanged) {
                this.updateFormCurrent();
            }
        }
        
        function GridCtrl(scope, element) {
            var onFocusBlurBound = onFocusBlur.bind(this);
            
            this.scope = scope;
            this.element = element;
            this.inputs = element.find('INPUT');
            
            element[0].addEventListener('keydown', onKeyDown.bind(this), false);
            // Use capturing since focus/blur doesn't bubble in FF.
            element[0].addEventListener('focus', onFocusBlurBound, true);
            element[0].addEventListener('blur', onFocusBlurBound, true);
            
            // Watch model
            scope.$watchGroup([
                'model',
                'model.base', 'model.base.mod',
                'model.current', 'model.current.mod'
            ], onValuesChange.bind(this));
        }
        
        GridCtrl.prototype.highlight = function(val, target) {
            var input, i;
            if (!val) {
                this.inputs.removeClass('hl');
            } else {
                for (i = 0; i < this.inputs.length; ++i) {
                    input = this.inputs.eq(i);
                    if (input.val() == val) {
                        this.inputs.eq(i).addClass('hl');
                    }
                }
            }
        };
        
        GridCtrl.prototype.updateFormBase = function() {
            var i, input, v, b = this.scope.model.base || null;

            for (i = 0; i < this.inputs.length; ++i) {
                input = this.inputs.eq(i);
                v = b ? b.grid[i] : false;
                input
                    .val(v)
                    .prop('readonly', !!v)
                    .toggleClass('frozen', v)
                    .removeClass('invalid');
            }
        };
        
        GridCtrl.prototype.updateFormCurrent = function() {
            var 
                i, data_val, form_val, input,
                pending_inputs, idx;

            if (!this.scope.model.current) {
                return;
            }

            // Update cells and collect invalid values to re-input
            pending_inputs = [];
            for (i = 0; i < this.inputs.length; ++i) {
                input = this.inputs.eq(i);
                data_val = this.scope.model.current.grid[i];
                form_val = input.val();
                if (data_val) {
                    input.removeClass('invalid');
                    if (data_val != form_val) {
                        input.val(data_val);
                    }
                } else {
                    if (form_val && input.hasClass('invalid')) {
                        pending_inputs.push({ idx: i, t: this.inputTimes[i], v: form_val });
                    } else {
                        input.val('');
                        input.removeClass('invalid');
                    }
                }
            }

            // Re-input values in primary order
            pending_inputs.sort(function(a, b) { return a.t - b.t; });
            this.scope.model.isInvalid = false;
            for (i = 0; i < pending_inputs.length; ++i) {
                idx = pending_inputs[i].idx;
                this.setValue(idx, this.inputs.eq(idx).val());
            }
        };
        
        GridCtrl.prototype.setValue = function(c, v) {
            var input;

            if (this.scope.model.current.grid[c] != v) {
                input = this.inputs.eq(c);
                try {
                    this.scope.model.current.setCell(c, v);
                    return true;
                } catch (ex) {
                    input.val(v);
                    input.addClass('invalid');
                    this.scope.model.isInvalid = true;
                    return false;
                }
            }
            return null;
        }; 

        GridCtrl.prototype.clearValue = function (c) {
            var i;

            if (this.scope.model.base && this.scope.model.base.hasValueAt(c)) {
                return;
            }
            if (this.scope.model.current.hasValueAt(c)) {
                this.scope.model.current.clearCell(c);
            } else {
                this.inputs.eq(c).val('').removeClass('invalid');
                this.scope.model.isInvalid = false;
                for (i = 0; i < this.inputs.length; ++i) {
                    if (this.inputs.eq(i).hasClass('invalid')) {
                        this.scope.model.isInvalid = true;
                        break;
                    }
                }
            }
        };
        
        function link(scope, element) {
            new GridCtrl(scope, element);
        }
        
        return {
            template: genTemplate,
            restrict: 'E',
            scope: {
                model: '=ngModel',
                onChange: '&'
            },
            link: link
        };
    }]);

    module.directive('mnSudokuView', ['Sudoku', function(Sudoku) {
        function genTemplate() {
            return renderGrid(function(c) {
                var s, i;
                s = '<span class="v" ng-show="model.grid[' + c + ']" ng-bind="model.grid[' + c + ']"></span>';
                s += '<div class="a" ng-hide="model.grid[' + c + ']">';
                for (i = 1; i <= 9; ++i) {
                    s += '<span ng-bind="allowed(' + c + ',' + i +')"></span>';
                }
                s += '</div>';
                return s;
            }, '<span class="badge">{{model.complete}} / 81</span>');
        }
        
        return {
            template: genTemplate,
            restrict: 'E',
            scope: { model: '=ngModel' },
            controller: ['$scope', function($scope) {
                $scope.allowed = function(c, v) {
                    return $scope.model.isAllowedAt(c, v) ? v : '';
                };
            }]
        };
    }]);
    
})();

