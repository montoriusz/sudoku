/* 
 * LEGAL NOTICE / NOTA PRAWNA
 * Copyright (c) 2011 Paweł Motofa <montoriusz@montoriusz-it.pl>
 * All Rights Reserved. / Wszelkie prawa zastrzeżone.
 * 
 * All information contained herein is and remains
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
            if (saveParent) {
                this.parent = src;
            } else {
                this.parent = null;
            }
            this.mod      = src.mod;
            //this.log      = src.log;
            //this.passes   = src.passes;
            this.complete = src.complete;
            this.grid     = src.grid.slice(0);
            this.allow    = src.allow.slice(0);
        } else {
            this.parent   = null;
            this.updateMod();
            //this.passes   = 0;
            this.complete = 0;
            //this.log = '';
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
        // results may be redundant (or conflicting?)
        for (var i = 0; i < results.length; ++i)
            this.setCell(results[i].cell, results[i].value);
    }
    
    function formatPos(yx) {
        var
            r = 1 + Math.floor(yx / 9),
            c = 1 + (yx % 9);
        return  'row ' + r + ', col ' + c;
    }
    
    function mask2Str(v) {
        var s = '';
        for (var i = 0; i < 9; i++)
            if (v & (1 << i))
                s += i + 1;
        return s;
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
        //this.passes = 0;
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
            //this.passes++;
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

        //console.log('Strike out ' + p.length  +  ' (' + this.hash + ')');

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

    Sudoku.prototype.debug = function () {
        var w = window.open('', 'debug', 'location=no,status=yes,width=900,height=500,resizable=yes,scrollbars=yes');
        w.document.open();
        w.document.write('<html><head><style type="text/css">'
                + 'table { border-collapse: collapse; border: 3px solid #000; } '
                + 'td { padding: 2px; font-family: Courier New; border: 1px solid #000; } td:empty { background: #000; padding: 1px; }'
                + '</style></head></<body>');
        var s = '<table border="1">';
        for (var i = 0; i < 81; i++) {
            if (i % 27 === 0 && i !== 0)
                s += '<tr><td colspan="11"></td></tr>';
            if (i % 9 === 0)
                s += "<tr>";
            s += '<td align="center">';
            if (this.grid[i])
                s += '<font size="5"><b>' + this.grid[i] + '</b></font>';
            if (this.allow[i] !== -1)
                s += mask2Str(this.allow[i]);
            s += '</td>';
            if (i % 9 === 8)
                s += '</tr>';
            else if (i % 3 === 2)
                s += '<td></td>';
        }
        s += "</table>";
        w.document.write(s);
        //w.document.write('<p><b>Log:</b><br/>' + this.log + '</p>');
        //w.document.write('<b>Passes:</b> ' + this.passes + '<br />');
        w.document.write('<b>Complete:</b> ' + this.complete + ' / 81<br />');
        w.document.write("</body></html>");
        w.document.close();
    };
    
    return Sudoku;
})();
