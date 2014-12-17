/* 
 * Copyright (c) 2011 Paweł Motofa <montoriusz@montoriusz-it.pl>
 * All Rights Reserved. / Wszelkie prawa zastrzeżone.
 * 
 */
var Sudoku = (function() {

    var log2 = Math.log(2);

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
    
    Sudoku.ROW = 0;
    Sudoku.COL = 1;
    Sudoku.BOX = 2;
    
    function genAreas () {
        var n, b, i, j, list, list2;
        Sudoku.areas = [
            new Array(9),
            new Array(9),
            new Array(9)
        ];
        for (n = 0; n < 9; ++n) {
            // Rows & cols
            Sudoku.areas[Sudoku.ROW][n] = list = new Array(9);
            Sudoku.areas[Sudoku.COL][n] = list2 = new Array(9);
            b = n * 9;
            for (var i = 0; i < 9; ++i) {
                list[i] = b + i;
                list2[i] = n + i * 9;
            }
            // Boxes
            Sudoku.areas[Sudoku.BOX][n] = list = new Array(9);
            b = Math.floor(n / 3) * 27 + (n % 3) * 3;
            for (var i = 0; i < 3; ++i) {
                for (var j = 0; j < 3; ++j) {
                    list[i * 3 + j] = b + i * 9 + j;
                }
            }
        }
    }
    
    Sudoku.cellAreas = function(c) {
        return [
            Sudoku.areas[Sudoku.ROW][Math.floor(c / 9)],
            Sudoku.areas[Sudoku.COL][Math.floor(c % 9)],
            Sudoku.areas[Sudoku.BOX][Math.floor(c / 27) * 3 + Math.floor(c / 3) % 3]
        ];
    };
    
    
    
    Sudoku.fromString = function(str) {
        var i, s, v;
        if (typeof str !== 'string' || str.length !== 81) {
            throw new Error('Invalid string to create Sudoku.');
        }
        s = new Sudoku();
        for (i = 0; i < 81; ++i) {
            v = +s[i];
            if (v >= 1 && v <= 9) {
                s.setCell(i, v);
            }
        }
        return s;
    };
    
    Sudoku.prototype.toString = function() {
        return this.grid.join('');
    };
    
    function applyMask(cells, mask) {
        for (var i = 0; i < cells.length; ++i) {
            if (this.allow[cells[i]] !== -1) {
                this.allow[cells[i]] &= mask;
            }
        }
    }
    
    function markCellAreas(c, bit) {
        var i, areas = Sudoku.cellAreas(c);
        bit = ~bit;
        for (i = 0; i < 3; ++i) {
            applyMask.call(this, areas[i], bit);
        }
    }
    
    function solveArea(cells, search) {
        var
            i, j, v, sv, 
            results = new Array(),
            cbv = new Array(), // cells by value
            err;

        for (i = 0; i < 9; ++i) {
            cbv[i] = new Array();
        }
        for (i = 0; i < cells.length; ++i) {
            v = this.allow[cells[i]];
            if (v === -1){
                continue;
            }
            if (v === 0) {
                err = new Error("No possibilities at " + formatPos(cells[i]));
                err.sudokuData = { cell: cells[i], value: null };
                throw err;
            }
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
        if (!(d instanceof Sudoku)) {
            throw new Error("Invalid object type.");
        }
        while (d.parent instanceof Sudoku) {
            if (d.parent === this) {
                return true;
            }
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
        var err;
        val = +val;
        if (!val || isNaN(val)) {
            err = new Error("Invalid cell value to set at " + formatPos(c) + ".");
            err.sudokuData = { cell: c, value: val };
            throw err;
        }
        if (this.grid[c] === val) {
            return;
        }
        var bit = 1 << (val - 1);
        if (this.grid[c] !== 0 || (this.allow[c] & bit) === 0) {
            err = new Error("Setting value " + val + " at " + formatPos(c) + " failed."); // return false
            err.sudokuData = { cell: c, value: val };
            throw err;
        }
        this.grid[c] = val;
        this.allow[c] = -1;
        this.complete++;
        // Mark allowed cell values
        markCellAreas.call(this, c, bit);
        this.updateMod();
    };
    
    Sudoku.prototype.clearCell = function(c) {
        var i, gridCopy = this.grid;
        if (this.grid[c] === 0) {
            return;
        }
        this.complete = 0;
        this.grid = new Array(81);
        gridCopy[c] = 0;
        for (i = 0; i < 81; i++) {
            this.grid[i] = 0;
            this.allow[i] = 511;
        }
        this.updateMod();
        for (i = 0; i < 81; i++) {
            if (gridCopy[i] !== 0) {
                this.setCell(i, gridCopy[i]);
            }
        }
    };

    Sudoku.prototype.solveStraight = function(search, steps) {
        var complete_before, i, j;
        steps  = steps || null;
        search = search || 3;
        do {
            complete_before = this.complete;
            for (i = 0; i < 9; ++i) {
                for (j = 0; j < 3; ++j) {
                    solveArea.call(this, Sudoku.areas[j][i], search);
                }
            }
            if (steps !== null) --steps;
        } while (this.complete > complete_before && (steps === null || steps > 0));
        return this.complete === 81 ? this : false;
    };

    Sudoku.prototype.guess = function (testCallback, random) {
        var
            c, v,
            p = new Array(), trial = null;
    
        // Possible strikes
        for (c = 0; c < 81; ++c) {
            if (this.grid[c] === 0) {
                for (v = 0; v < 9; ++v) {
                    if (this.allow[c] && (1 << v))
                        p.push([c, v + 1]);
                }
            }
        }

        // Strike
        while (p.length) {
            if (random) {
                c = p.splice(Math.floor(Math.random() * p.length), 1)[0];
            } else {
                c = p.pop();
            }
            trial = new Sudoku(this);
            try {
                trial.setCell(c[0], c[1]);
                trial = testCallback.call(trial, c[0], c[1], this);
                if (trial) {
                    return trial;
                }
            } catch (ex) { }
            
            if (random && --random === 0) {
                return false;
            }
        }
        
        return false;
    };
    
    Sudoku.prototype.solveDeep = function() {
        return this.solveStraight() || this.guess(function() {
            // Narrowing search space: second guess only if there's <= 18 cells left
            return this.solveStraight() || this.complete > 63 && this.guess(function() {
                return this.solveStraight();
            });
        });
    };
    
    Sudoku.generate = function(level, maxSteps) {
        var s = new Sudoku(), solution = false;
        do {
            // Trying some random guesses (9 seems to be optimal, wondering why ;)
            if (!s.guess(function(cell, value) {
                // Continue if there is a (maybe incomplete) solution
                solution = this.solveStraight(level, maxSteps);
                s.setCell(cell, value);
                return true;
            }, 9)) {
                s = new Sudoku();
            }
        } while (!solution || solution.complete < 81);
        return s;
    };
    
    return Sudoku;
})();
