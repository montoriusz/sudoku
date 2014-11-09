/* 
 * Copyright (c) 2011 Paweł Motofa <montoriusz@montoriusz-it.pl>
 * All Rights Reserved. / Wszelkie prawa zastrzeżone.
 * 
 */
var Sudoku = (function() {

    var log2 = Math.log(2);

    function genAreas () {
        var n, b, i, j, list, list2;
        Sudoku.areas = {
            rows: new Array(9),
            cols: new Array(9),
            boxes: new Array(9)
        };
        for (n = 0; n < 9; ++n) {
            // Boxes
            Sudoku.areas.boxes[n] = list = new Array(9);
            b = Math.floor(n / 3) * 27 + (n % 3) * 3;
            for (var i = 0; i < 3; ++i) {
                for (var j = 0; j < 3; ++j) {
                    list[i * 3 + j] = b + i * 9 + j;
                }
            }

            // Rows & cols
            Sudoku.areas.rows[n] = list = new Array(9);
            Sudoku.areas.cols[n] = list2 = new Array(9);
            b = n * 9;
            for (var i = 0; i < 9; ++i) {
                list[i] = b + i;
                list2[i] = n + i * 9;
            }
        }
    }

    function Sudoku(src, saveParent) {
        if (!Sudoku.areas) {
            genAreas();
        }
        this.hash = Date.now().toString(36);
        this.grid = new Array(81);
        this.allow = new Array(81);

        if (src && src instanceof Sudoku) {
            this.parent   = saveParent ? src : null;
            this.mod      = src.mod;
            this.complete = src.complete;
            this.grid     = src.grid.slice(0);
            this.allow    = src.allow.slice(0);
        } else {
            this.parent   = null;
            this.updateMod();
            this.complete = 0;
            for (var i = 0; i < 81; i++) {
                this.grid[i] = 0;
                this.allow[i] = 511;
            }
        }
    }
    
    Sudoku.fromString = function(str) {
        var i, s, v;
        if (typeof str !== 'string' || str.length !== 81) {
            throw new Error('Invalid string to create Sudoku.');
        }
        s = new Sudoku();
        for (i = 0; i < 81; ++i) {
            v = +s[i];
            if (!isNaN(v) && v >= 1 && v <= 9) {
                s.setCell(i, v);
            }
        }
        return s;
    };
    
    Sudoku.prototype.toString = function() {
        var i, str = '';
        for (i = 0; i < 81; ++i) {
            str += this.grid[i].toString();
        }
        return str;
    };
    
    function applyMask(cells, mask) {
        for (var i = 0; i < cells.length; ++i) {
            if (this.allow[cells[i]] !== -1) {
                this.allow[cells[i]] &= mask;
            }
        }
    }
    
    function markCellAreas(c, bit) {
        bit = ~bit;
        applyMask.call(this, Sudoku.areas.rows[Math.floor(c / 9)], bit);
        applyMask.call(this, Sudoku.areas.cols[Math.floor(c % 9)], bit);
        applyMask.call(this, Sudoku.areas.boxes[Math.floor(c / 27) * 3 + Math.floor(c / 3) % 3], bit);
    }
    
    function solveArea(cells, search) {
        var
            i, j, v, sv, 
            results = new Array(),
            cbv = new Array(); // cells by value

        for (i = 0; i < 9; ++i)
            cbv[i] = new Array();
        for (i = 0; i < cells.length; ++i) {
            v = this.allow[cells[i]];
            if (v === -1)
                continue;
            if (v === 0)
                throw new Error("No possibilities at " + formatPos(cells[i]));
            if (search & 2) {
                sv = Math.log(v) / log2;
                if (sv % 1 === 0) // only possible value for cell i
                    results.push({cell: cells[i], value: sv + 1});
            }
            if (search & 1) {
                for (j = 0; j < 9; ++j) // values 1 to 9
                    if (v & (1 << j))
                        cbv[j].push(cells[i]);
            }
        }
        if (search & 1) {
            for (var i = 0; i < 9; ++i)
                if (cbv[i].length === 1) // only possible cell for value j
                    results.push({cell: cbv[i][0], value: i + 1});
        }
        // results may be redundant
        for (var i = 0; i < results.length; ++i)
            this.setCell(results[i].cell, results[i].value);
    }
    
    function formatPos(yx) {
        var
            r = 1 + Math.floor(yx / 9),
            c = 1 + (yx % 9);
        return  'row ' + r + ', col ' + c;
    }

    Sudoku.prototype.updateMod = function() {
        this.mod = Date.now();
    };
    
    Sudoku.prototype.isDescendant = function(d) {
        if (!(d instanceof Sudoku))
            throw new Error("Invalid object type.");
        while (d.parent instanceof Sudoku) {
            if (d.parent === this)
                return true;
            d = d.parent;
        }
        return false;
    };
  
    Sudoku.prototype.hasValueAt = function (yx) {
        return (this.grid[yx] !== 0);
    };
    
    Sudoku.prototype.isAllowedAt = function(c, val) {
        return (this.allow[c] !== -1 && (this.allow[c] & (1 << val - 1)) !== 0);
    };

    Sudoku.prototype.setCell = function (c, val) {
        val = +val;
        if (isNaN(val)) {
            throw new Error("Invalid cell value to set.");
        }
        if (this.grid[c] === val)
            return;
        var bit = 1 << (val - 1);
        if (this.grid[c] !== 0 || (this.allow[c] & bit) === 0)
            throw new Error("Setting value " + val + " at " + formatPos(c) + " failed."); // return false
        this.grid[c] = val;
        this.allow[c] = -1;
        // mark allowed cell values
        markCellAreas.call(this, c, bit);
        this.complete++;
        this.updateMod();
    };
    
    Sudoku.prototype.clearCell = function(c) {
        var i, gridCopy = this.grid;
        if (this.grid[i] === 0) {
            return;
        }
        this.complete = 0;
        this.grid = new Array(81);
        for (i = 0; i < 81; i++) {
            this.grid[i] = 0;
            this.allow[i] = 511;
        }
        this.updateMod();
        for (i = 0; i < 81; i++) {
            if (i !== c && gridCopy[i] !== 0) {
                this.setCell(i, gridCopy[i]);
            }
        }
    };

    Sudoku.prototype.solveStraight = function(search, steps) {
        var complete_before;
        if (!steps) {
            steps = null;
        }
        search = search || 3;
        do {
            if (steps !== null)
                steps--;
            complete_before = this.complete;
            for (var i = 0; i < 9; i++) {
                solveArea.call(this, Sudoku.areas.rows[i], search);
                solveArea.call(this, Sudoku.areas.cols[i], search);
                solveArea.call(this, Sudoku.areas.boxes[i], search);
            }
        } while (this.complete > complete_before && (steps === null || steps > 0));
        return this.complete === 81 ? this : false;
    };

    Sudoku.prototype.strike = function (callback, random) {
        var
            c, v,
            p = new Array(), trial = null;
        for (c = 0; c < 81; ++c) {
            if (this.grid[c] === 0) {
                for (v = 0; v < 9; ++v) {
                    if (this.allow[c] && (1 << v))
                        p.push([c, v + 1]);
                }
            }
        }

        while (p.length) {
            if (random) {
                c = p.splice(Math.floor(Math.random() * p.length), 1)[0];
            } else {
                c = p.pop();
            }
            trial = new Sudoku(this);
            try {
                trial.setCell(c[0], c[1]);
                trial = callback.call(this, trial, c[0], c[1]);
                if (trial) {
                    return trial;
                }
            } catch (ex) {
            }
            if (random === 1) {
                return false;
            } else if (random) {
                --random;
            }
        }
        
        return false;
    };
    
    Sudoku.prototype.solveDeep = function() {
        return this.solveStraight() || this.strike(function(trial) {
            return trial.solveStraight()
                    || (trial.complete < 63 ? null : trial.strike(function(trial2) {
                        return trial2.solveStraight();
                    }));
        }) || this;
    };
    
    Sudoku.generate = function(level, maxSteps) {
        var s = new Sudoku(), found = false;
        do {
            if (!s.strike(function(trial, cell, value) {
                trial.solveStraight(level, maxSteps);
                if (trial.complete === 81) {
                    found = true;
                }
                s.setCell(cell, value);
                return true;
            }, 9)) {
                s = new Sudoku();
            }
        } while (!found);
        return s;
    };

    
    return Sudoku;
})();
