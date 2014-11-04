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
var Sudoku = (function() {

    function Sudoku(src) {
        this.hash = Date.now().toString(36);
        this.grid = new Array(81);
        this.allow = new Array(81);

        if (src && src instanceof Sudoku) {
            this.parent   = src;
            this.mod      = src.mod;
            //this.log      = src.log;
            this.passes   = src.passes;
            this.complete = src.complete;
            this.grid     = src.grid.slice(0);
            this.allow    = src.allow.slice(0);
        } else {
            this.parent   = null;
            this.updateMod();
            this.passes   = 0;
            this.complete = 0;
            //this.log = '';
            for (var i = 0; i < 81; i++) {
                this.grid[i] = 0;
                this.allow[i] = 511;
            }
        }
    }
    
    function genAreas () {
        var n, b, i, j, list;
        Sudoku.areas = {
            rows: new Array(9),
            cols: new Array(9),
            boxes: new Array(9)
        };
        // Boxes
        for (n = 0; n < 9; ++n) {
            Sudoku.areas.boxes[n] = list = new Array(9);
            b = Math.floor(n / 3) * 27 + (n % 3) * 3;
            for (var i = 0; i < 3; ++i) {
                for (var j = 0; j < 3; ++j) {
                    list[i * 3 + j] = b + i * 9 + j;
                }
            }
        }
        // Rows
        for (n = 0; n < 9; ++n) {
            Sudoku.areas.rows[n] = list = new Array(9);
            b = n * 9;
            for (var i = 0; i < 9; ++i) {
                list[i] = b + i;
            }
        }
        // Cols
        for (n = 0; n < 9; ++n) {
            Sudoku.areas.cols[n] = list = new Array(9);
            for (var i = 0; i < 9; ++i) {
                list[i] = n + i * 9;
            }
        }
    }

    Sudoku.LOG2 = Math.log(2);

    Sudoku.prototype.updateMod = function() {
        this.mod = Date.now();
    };
    
    Sudoku.prototype.isDescendant = function(d) {
        if (!(d instanceof Sudoku))
            throw new Error("Invalid object for relation check.");
        while (d.parent instanceof Sudoku) {
            if (d.parent === this)
                return true;
            d = d.parent;
        }
        return false;
    };
  
    Sudoku.prototype.hasValue = function (yx) {
        if (yx instanceof Array)
            yx = yx[0] * 9 + yx[1];
        return this.grid[yx] !== 0;
    };

    Sudoku.prototype.setCell = function (yx, val) {
        var c;
        val = val ? +val : 0;
        if (yx instanceof Array)
            c = yx[0] * 9 + yx[1];
        else
            c = yx;
        if (this.grid[c] === val)
            return;
        var bit = 1 << (val - 1);
        // ensure cell is empty
        if (this.grid[c] !== 0 || (this.allow[c] & bit) === 0)
            throw new Error("Setting value " + val + " at " + yx + " failed."); // return false
        this.grid[c] = val;
        this.allow[c] = -1;
        // mark allowed cell values
        this._markCellAreas(c, bit);
        this.complete++;
        this.updateMod();
    };
    
    Sudoku.prototype._markCellAreas = function(c, bit) {
        bit = ~bit;
        this._applyMask(Sudoku.areas.rows[Math.floor(c / 9)], bit);
        this._applyMask(Sudoku.areas.cols[Math.floor(c % 9)], bit);
        this._applyMask(Sudoku.areas.boxes[Math.floor(c / 27) * 3 + Math.floor(c / 3) % 3], bit);
    };

    Sudoku.prototype._applyMask = function (cells, mask) {
        for (var i = 0; i < cells.length; ++i) {
            if (this.allow[cells[i]] !== -1) {
                this.allow[cells[i]] &= mask;
            }
        }
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

    Sudoku.prototype.solveStraight = function(steps) {
        var complete_before;
        if (!steps) {
            steps = null;
        }
        do {
            this.passes++;
            if (steps !== null)
                steps--;
            complete_before = this.complete;
            for (var i = 0; i < 9; i++) {
                this._solveArea(Sudoku.areas.rows[i]);
                this._solveArea(Sudoku.areas.cols[i]);
                this._solveArea(Sudoku.areas.boxes[i]);
            }
        } while (this.complete > complete_before && (steps === null || steps > 0));
    };
    
    Sudoku.prototype._solveArea = function (cells) {
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
                throw new Error("No possibilities at " + cells[i]);
            sv = Math.log(v) / Sudoku.LOG2;
            if (sv % 1 === 0) // only possible value for cell i
                results.push({cell: cells[i], value: sv + 1});
            for (j = 0; j < 9; ++j) // values 1 to 9
                if (v & (1 << j))
                    cbv[j].push(cells[i]);
        }
        for (var i = 0; i < 9; ++i)
            if (cbv[i].length === 1) // only possible cell for value j
                results.push({cell: cbv[i][0], value: i + 1});
        // results may be redundant (or conflicting?)
        for (var i = 0; i < results.length; ++i)
            this.setCell(results[i].cell, results[i].value);
    };

    Sudoku.prototype.strike = function (tryOn) {
        var p = new Array(), c, v;
        for (var i = 0; i < 81; i++)
            if (this.grid[i] === 0)
                p.push(i);
        if (p.length === 0)
            return false;

        c = p[Math.floor(Math.random() * p.length)];
        do {
            // TODO: stworzyć listę dozwolonych strzałów w komórce
            v = Math.floor(Math.random() * 9);
        } while ((this.allow[c] & (1 << v)) === 0);
        v += 1;

        if (tryOn) {
            try {
                if (!(tryOn instanceof Sudoku)) {
                    tryOn = new Sudoku(this);
                }
                tryOn.setCell(c, v);
                tryOn.solveStraight();
            } catch (ex) {
                return false;
                // TODO: dodać pętle (po c { po v { } } i eliminować błędne strzały z listy)
            }
        }
        this.setCell(c, v);
        return tryOn || true;
    };

    Sudoku.prototype.debug = function () {
        var w = window.open('', 'debug', 'location=no,status=yes,width=900,height=500,resizable=yes,scrollbars=yes');
        w.document.open();
        w.document.write('<html><head><style type="text/css">td { font-family: Courier New; }</style></head></<body>');
        var s = '<table border="1">';
        for (var i = 0; i < 81; i++) {
            if (i % 27 === 0 && i !== 0)
                s += '<tr><td colspan="11" /></tr>';
            if (i % 9 === 0)
                s += "<tr>";
            s += '<td align="center">'
            if (this.grid[i])
                s += '<font size="5"><b>' + this.grid[i] + '</b></font>';
            if (this.allow[i] !== -1)
                s += Sudoku.mask2Str(this.allow[i]);
            s += '</td>'
            if (i % 9 === 8)
                s += "</tr>";
            else if (i % 3 === 2)
                s += "<td/>";
        }
        s += "</table>";
        w.document.write(s);
        //w.document.write('<p><b>Log:</b><br/>' + this.log + '</p>');
        w.document.write('<b>Passes:</b> ' + this.passes + '<br />');
        w.document.write('<b>Complete:</b> ' + this.complete + ' / 81<br />');
        w.document.write("</body></html>");
        w.document.close();
    };

    Sudoku.mask2Str = function (v) {
        var s = '';
        for (var i = 0; i < 9; i++)
            if (v & (1 << i))
                s += i + 1;
        return s;
    };
    
    genAreas();
    
    return Sudoku;
})();