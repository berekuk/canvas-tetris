// canvas_tetris is the only one global function
function canvas_tetris(canvas) {
    // Engine is the main object containing all game resources
    // and implementing entry-point run() method
    function Engine(canvas) {
        this.canvas = canvas;
    };

    // obtain, validate and cache canvas context
    Engine.prototype.init_ctx = function() {
        if (!this.canvas.getContext) {
            throw {
                name: 'Fatal',
                message: 'failed to get context',
            };
        }
        this.ctx = this.canvas.getContext('2d');
    };

    // initialize canvas and show main menu
    Engine.prototype.run = function() {
        this.init_ctx();

        var menu = new Menu(this);
        menu.run();
    };

    Engine.prototype.start_game = function() {
        this.ctx.clearRect(0,0,600,600);

        var game = new Game(this);
        game.run();
    };

    function Menu(engine) {
        this.engine = engine;
        this.ctx = engine.ctx;
    };

    Menu.prototype.draw = function() {
        this.ctx.save();

        this.ctx.fillStyle = 'rgb(100,100,100)';
        this.ctx.fillRect(0,0,600,600);

        {
            this.ctx.save();
            this.ctx.translate(200,300);

            this.ctx.fillStyle = 'white';
            this.ctx.fillRect(0,0,200,100);

            this.ctx.strokeStyle = 'black';
            this.ctx.lineWidth = 8;
            this.ctx.lineJoin = 'round';
            this.ctx.strokeRect(0,0,200,100);

            this.ctx.fillStyle = 'black';
            this.ctx.font = '40px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('Play', 100, 50);

            this.ctx.restore();
        }

        this.ctx.restore();
    }

    Menu.prototype.run = function() {
        this.draw();

        var menu = this;

        function start_game() {
            menu.engine.canvas.removeEventListener('keydown', keydown_cb, true);
            menu.engine.canvas.removeEventListener('mouseup', mouseup_cb, true);
            menu.engine.start_game();
        };

        function keydown_cb(e) {
            // space
            if (e.keyCode === 32) {
                start_game();
            }
        };

        function mouseup_cb(e) {
            if (e.clientX >= 200 && e.clientX <= 400 && e.clientY >= 300 && e.clientY <= 400) {
                start_game();
            }
        };

        menu.engine.canvas.addEventListener('keydown', keydown_cb, true);
        menu.engine.canvas.addEventListener('mouseup', mouseup_cb, true);
    };

    function Game(engine) {
        this.engine = engine;
        this.ctx = engine.ctx;

        // constants
        this.colors = {
            'background': 'black',
            'well': 'rgb(64,64,64)',
            'block': 'white',
            'dead_block': 'white',
        };
        this.block_size = 30;
        this.tick_length = 1000;

        // rw attributes
        this.field = new Field();
        this.active_figure = new Figure();
        this.next_figure = new Figure();

        this.init_figure_position();
    };

    Game.prototype.init_figure_position = function() {
        this.figure_position = [
            Math.floor((this.field.width - this.active_figure.width) / 2),
            0
        ];
        if (!this.is_valid_position(this.active_figure, this.figure_position)) {
            this.game_over();
            return;
        }
        return 1;
    };

    Game.prototype.draw_figure = function(figure) {
        this.ctx.save();
        this.ctx.fillStyle = this.colors.block;
        var i = 0;
        for (i = 0; i < 4; i++) {
            var point = figure.points[i];
            this.ctx.fillRect(point[0] * this.block_size, point[1] * this.block_size, this.block_size, this.block_size);
        }
        this.ctx.restore();
    };

    Game.prototype.draw_next_figure = function() {
        this.ctx.save();
        this.ctx.translate(400, 50);
        this.ctx.fillStyle = this.colors.well;
        this.ctx.fillRect(0, 0, 5 * this.block_size, 5 * this.block_size);

        this.ctx.translate(
            this.block_size * (5 - this.next_figure.width) / 2,
            this.block_size * (5 - this.next_figure.height) / 2
        );
        this.draw_figure(this.next_figure);

        this.ctx.restore();
    };

    Game.prototype.draw_chrome = function() {
        this.ctx.save();
        this.ctx.fillStyle = this.colors.background;
        this.ctx.fillRect(0, 0, 600, 600);
        this.draw_next_figure();
        this.ctx.restore();
    };

    Game.prototype.draw_dead_blocks = function() {
        this.ctx.save();
        var x, y;
        for (x = 0; x < this.field.width; x++) {
            for (y = 0; y < this.field.height; y++) {
                if (this.field.get(x,y)) {
                    this.ctx.fillStyle = this.colors.dead_block;
                }
                else {
                    this.ctx.fillStyle = this.colors.well;
                }
                this.ctx.fillRect(x * this.block_size, y * this.block_size, this.block_size, this.block_size);
            }
        }
        this.ctx.restore();
    };

    Game.prototype.draw_active_figure = function() {
        this.ctx.save();
        this.ctx.translate(
            this.block_size * this.figure_position[0],
            this.block_size * this.figure_position[1]
        );
        this.draw_figure(this.active_figure);
        this.ctx.restore();
    };

    Game.prototype.draw_field = function() {
        this.ctx.save();
        this.ctx.translate(50, 50);

        this.draw_dead_blocks();
        this.draw_active_figure();

        this.ctx.restore();
    };

    Game.prototype.draw = function() {
        this.draw_chrome();
        this.draw_field();
    };

    Game.prototype.is_valid_position = function(figure, pos) {
        var i;
        var points = figure.points;
        for (i = 0; i < 4; i++) {
            var x = points[i][0] + pos[0];
            var y = points[i][1] + pos[1];
            if (x < 0) {
                return;
            }
            if (x >= this.field.width) {
                return;
            }
            if (y < 0) {
                return;
            }
            if (y >= this.field.height) {
                return;
            }
            if (this.field.get(x,y)) {
                return;
            }
        }
        return true;
    };

    // generate move_left and move_right methods
    (function(){ // create closure to scope out directions variable
        var directions = [
            { 'method': 'move_left', 'offset': -1 },
            { 'method': 'move_right', 'offset': 1 },
        ];
        var id;
        for (id in directions) {
            (function() { // create closure to separate direction variable instances
                var direction = directions[id];
                Game.prototype[direction.method] = function() {
                    var new_position = [
                        this.figure_position[0] + direction.offset,
                        this.figure_position[1]
                    ];
                    if (this.is_valid_position(this.active_figure, new_position)) {
                        this.figure_position = new_position;
                        this.draw();
                    }
                }
            })();
        }
    })();

    Game.prototype.move_down = function() {
        this.perform_tick();
    };

    Game.prototype.rotate = function() {
        var new_figure = this.active_figure.rotate();
        if (!this.is_valid_position(new_figure, this.figure_position)) {
            return;
        }
        this.active_figure = new_figure;
        this.draw();
    };

    Game.prototype.perform_tick = function() {
        var new_position = [
            this.figure_position[0],
            this.figure_position[1] + 1
        ];
        if (this.is_valid_position(this.active_figure, new_position)) {
            this.figure_position = new_position;
        }
        else {
            var points = this.active_figure.points;
            var i;
            for (i = 0; i < 4; i++) {
                var x = points[i][0] + this.figure_position[0];
                var y = points[i][1] + this.figure_position[1];
                this.field.add_figure(this.active_figure, this.figure_position);
            }

            this.field.collapse();

            this.active_figure = this.next_figure;
            this.next_figure = new Figure();
            if (!this.init_figure_position()) {
                return; // game over, don't call draw()
            }
        }
        this.draw();
    };

    Game.prototype.run = function() {
        var game = this;
        this.keydown_cb = function(e) {
            switch(e.keyCode) {
                case 37: // left
                    game.move_left();
                    break;
                case 39: // right
                    game.move_right();
                    break;
                case 40: // down
                    game.move_down();
                    break;
                case 38: // up
                    game.rotate();
                    break;
            }
        };
        window.addEventListener('keydown', this.keydown_cb, true);

        this.tick_cb_id = window.setInterval(function() { game.perform_tick() }, this.tick_length);
        this.draw();
    };

    Game.prototype.game_over = function() {
        this.gc();
        this.engine.run();
    };

    Game.prototype.gc = function() {
        window.removeEventListener('keydown', this.keydown_cb, true);
        window.clearInterval(this.tick_cb_id);
    };

    function Field() {
        this.width = 9;
        this.height = 15;
        this.data = [];
        var x, y;
        for (y = 0; y < this.height; y++) {
            this.data[y] = [];
            for (x = 0; x < this.width; x++) {
                this.data[y][x] = 0;
            }
        }
    };

    Field.prototype.get = function(x,y) {
        return this.data[y][x];
    };

    Field.prototype.is_line_solid = function(y) {
        for (var x = 0; x < this.width; x++) {
            if (!this.get(x, y)) {
                return;
            }
        }
        return 1;
    };

    Field.prototype.is_line_empty = function(y) {
        for (var x = 0; x < this.width; x++) {
            if (!this.get(x,y)) {
                return;
            }
        }
        return 1;
    };

    Field.prototype.remove_line = function(y) {
        for (var i = y; i > 0; i--) {
            this.data[i] = this.data[i-1];
        }
        this.data[0] = [];
        for (var x = 0; x < this.width; x++) {
            this.data[0][x] = 0;
        }

    };

    Field.prototype.collapse = function() {
        for (var y = 0; y < this.height; y++) {
            if (this.is_line_solid(y)) {
                this.remove_line(y);
            }
        }
    };

    Field.prototype.add_figure = function(figure, position) {
        var points = figure.points;
        for (var i = 0; i < 4; i++) {
            var x = points[i][0] + position[0];
            var y = points[i][1] + position[1];
            this.data[y][x] = 1; // TODO - assert?
        }
    };

    function Figure(figure_id, rotate_id) {
        this.id = figure_id;
        if (typeof this.id === 'undefined') {
            this.id = Math.floor(Math.random() * 7);
        }
        this.rotate_id = rotate_id;
        if (typeof this.rotate_id === 'undefined') {
            this.rotate_id = 0;
        }
        this.points = this.figures[this.id].points[this.rotate_id];
        this.letter = this.figures[this.id].letter;
        this.width = this.figures[this.id].width;
        this.height = this.figures[this.id].height;
        if (this.rotate_id % 2) {
            [this.width, this.height] = [this.height, this.width];
        }
    };

    Figure.prototype.rotate = function() {
        var figure_data = this.figures[this.id];
        var positions = figure_data.points.length;
        var new_rotate_id = (this.rotate_id + 1) % positions;

        var new_figure = new Figure(this.id, new_rotate_id);
        return new_figure;
    };

    Figure.prototype.figures = [
        {
            'points': [
                [ [0,0], [1,0], [2,0], [3,0] ],
                [ [1,0], [1,1], [1,2], [1,3] ],
            ],
            'letter': 'I',
            'width': 4,
            'height': 1,
        },
        {
            'points': [
                [ [0,0], [1,0], [0,1], [1,1] ],
            ],
            'letter': 'O',
            'width': 2,
            'height': 2,
        },
        {
            'points': [
                [ [0,0], [1,0], [2,0], [2,1] ],
                [ [1,0], [1,1], [1,2], [0,2] ],
                [ [0,0], [0,1], [1,1], [2,1] ],
                [ [0,0], [1,0], [0,1], [0,2] ],
            ],
            'letter': 'J',
            'width': 3,
            'height': 2,
        },
        {
            'points': [
                [ [0,0], [1,0], [2,0], [0,1] ],
                [ [0,0], [1,0], [1,1], [1,2] ],
                [ [0,1], [1,1], [2,0], [2,1] ],
                [ [0,0], [0,1], [0,2], [1,2] ],
            ],
            'letter': 'L',
            'width': 3,
            'height': 2,
        },
        {
            'points': [
                [ [1,1], [0,1], [2,1], [1,2] ],
                [ [1,1], [1,0], [0,1], [1,2] ],
                [ [1,1], [1,0], [0,1], [2,1] ],
                [ [1,1], [1,0], [2,1], [1,2] ],
            ],
            'letter': 'T',
            'width': 3,
            'height': 2,
        },
        {
            'points': [
                [ [0,0], [1,0], [1,1], [2,1] ],
                [ [1,0], [0,1], [1,1], [0,2] ],
            ],
            'letter': 'Z',
            'width': 3,
            'height': 2,
        },
        {
            'points': [
                [ [1,0], [0,1], [1,1], [2,0] ],
                [ [0,0], [0,1], [1,1], [1,2] ],
            ],
            'letter': 'S',
            'width': 3,
            'height': 2,
        },
    ];

    var engine = new Engine(canvas);
    engine.run();
};
