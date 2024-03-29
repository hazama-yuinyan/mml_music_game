/**
 * main.js
 * 音ゲー（仮）
 * developed by HAZAMA(http://funprogramming.ojaru.jp)
 */

var main = {screen : null};

require(["mml_compiler", "sequencer", "scripts/lib/enchant.js", "scripts/lib/oopgame.enchant.js", "utils"], function(compiler, Sequencer, dummy, enchant, utils){
//var game;
//"use strict";

main.game_start = function(){
    var editor = document.getElementById("editor"), console = document.getElementById("error_console");
    try{
        var tree = compiler.mml_parser.parse(editor.value);
        if(!tree){
            this.handleParserErrors();
            return;
        }
        var _self = this;
        this.sequencer = new Sequencer(tree, function(){
            var tool_box = document.getElementsByClassName("tool_box_clicked")[0];
        tool_box.className = "tool_box";
            var generator = new NormalPatternGenerator();
            var patterns = generator.make(_self.sequencer.note_tags);
            
            setTimeout(function(){
                _self.sequencer.compressor.connect(_self.sequencer.context.destination);
                var task_manager = _self.task_manager;
                task_manager.add(new HighlightPanelOnNoteTask(patterns, _self.sequencer, _self.screen.panels, _self.screen.markers,
                    _self.screen.info_bar, task_manager));
                _self.progress_task.setComplete();
            }, 3000);
            
            var count_label = _self.task_manager.stage.createLabelAtCenter("3", {style : 'font: bold xx-large "Comic Sans MS", "Zapfino", "Brush Script", cursive, sans-serif',
                end_time : game.frame + 3 * game.fps, auto_show : true}, {x : true, y : true});
            _self.task_manager.add(new CountDownTask(count_label, 3, _self.task_manager));
        });
    }
    catch(e){
        console.value = "エラー発生！:" + e.message;
        return;
    }
    console.value = "ゲームを開始します。しばらくお待ちください";
    this.progress_task = new RespondTask(console, this.task_manager);
    this.task_manager.add(this.progress_task);
    game.is_in_game = true;
};

main.close_box = function(){
    var tool_box = document.getElementsByClassName("tool_box_clicked")[0];
    tool_box.className = "tool_box";
};

main.handleParserErrors = function(){
    this.error_window = new enchant.Label(
        '<textarea cols="50" rows="25"></textarea>' +
        '<input type="button" value="閉じる" onclick="main.closeErrorWindow()">'
    );
    this.error_window.className = "error_window";
    this.error_window.width = 400;
    var error_console = this.error_window._element.firstElementChild;
    error_console.value = compiler.mml_parser.stringifyErrors();
    game.currentScene.addChild(this.error_window);
};

main.closeErrorWindow = function(){
    game.currentScene.removeChild(this.error_window);
};

main.showResult = function(){
    var wrapper = new enchant.Label("");
    var result = document.getElementById("result_wrapper");
    var btn_tweet = document.getElementById("btn_tweet"), info_bar = this.screen.info_bar;
    var btn_tweet_a_elem = btn_tweet.firstElementChild;
    var url = btn_tweet_a_elem.getAttribute("href");
    var text = url + "似非音ゲーで" + info_bar.score + "ポイント獲得したよ！「ハマるブラウザゲームをつくろう」";

    btn_tweet_a_elem.setAttribute("href", encodeURI(text));
    
    var score_display = document.getElementById("result_score");
    score_display.innerText = info_bar.score;
    result.style.display = "block";
    wrapper._element.appendChild(result);
    wrapper.width = game.width;
    wrapper.height = game.height;
    this.task_manager.stage.addChild(wrapper);
};

var NormalPatternGenerator = enchant.Class.create({
    initialize : function(){
        
    },
    
    /**
     * トラック1をメロディー、トラック2をメインの伴奏とみなしてゲームのパネル表示のパターンを生成する
     * ------------------------
     * パネルに左上から右に0,1,2...と番号を振り、0~6,7~13,14~15のセクションに分け0~6,7~13はc~bの音、
     * 14,15を予備に割り当てる。
     * ------------------------
     */
    make : function(note_tags){
        var melody = note_tags[0], accompaniment = note_tags[1], patterns = [], i = 0, j = 0, time = 0, m_tag, a_tag, targets;
        var use_first_section = true, used_nums = [];
        melody = melody.slice(0).filter(function(tag){
            return tag.type == "note";
        });
        accompaniment = accompaniment.slice(0).filter(function(tag){
            return tag.type == "note";
        });
        
        while(true){
            m_tag = melody[i], a_tag = accompaniment[j];
            
            if(j >= accompaniment.length || m_tag && m_tag.start_frame < a_tag.start_frame){
                targets = m_tag.pitches.slice(0);
                time = m_tag.start_frame;
                ++i;
            }else if(i >= melody.length || m_tag.start_frame > a_tag.start_frame){
                targets = a_tag.pitches.slice(0);
                time = a_tag.start_frame;
                ++j;
            }else{
                targets = m_tag.pitches.slice(0).concat(a_tag.pitches.slice(0));
                time = m_tag.start_frame;
                ++i, ++j;
            }
            
            var pattern = targets.map(function(pitch){
                var tmp = Math.floor((pitch % 12 + 0.2) * 7.0 / 12);
                tmp = (use_first_section) ? tmp : tmp + 7;
                if(used_nums.indexOf(tmp) != -1){
                    tmp = (use_first_section) ? 14 : 15;
                }
                used_nums.push(tmp);
                return tmp;
            });
            patterns.push({frame : time, pattern : pattern});
            used_nums.splice(0);
            use_first_section = !use_first_section;
            
            if(i == melody.length && j == accompaniment.length){break;}
        }
        
        return patterns;
    }
});

var InformationBar = enchant.Class.create(enchant.Group, {
    initialize : function(){
        enchant.Group.call(this);
        
        this.score = 0;
        this.num_chains = 0;
        this.color = {r : 0, b : 0};
        var score_label = new enchant.Label("SCORE:0");
        score_label.id = "score";
        var chains_label = new enchant.Label("chain");
        chains_label.width = 100;
        chains_label.moveTo(game.width - 100, 15);
        chains_label.visible = false;
        chains_label.font = 'normal large "Comic Sans MS", "Zapfino", "Brush Script", cursive, sans-serif';
        
        var tool_box = new enchant.Label(
            '<label for="editor" style="font-size: x-large">MMLソース</label><br>' +
            '<textarea id="editor" name="editor" cols="50" rows="20">' +
            '@1 t110 l4 cdef edcr efga gfer\n' +
            'crcr crcr l8 ccddeeff l4 edcr\n' +
            'l2 {ccd}{dee} {ffr}e dc r4\n' +
            '(t2) @0 l4 "ceg""ceg""ceg""ceg" "cfa""cfa""cfa""cfa"\n' +
            '"dgb""dgb""dgb""dgb" "gb<d>""gb<d>""gb<d>""gb<d>"\n' +
            '"ceg"r"ceg"r "gb<d>"r"gb<d>"r "ceg""dfa" "egb""fa<c>"\n' +
            '"dfa<c>""g<cd>""eg<c>"r\n' +
            'l2 "ceg""dfa" "egb""cdfa" "dfgb""ceg" l4 "<ceg<c"\n' +
            '</textarea>' +
            '<input id="error_console" type="text" size="50" readonly>' +
            '<p><input type="button" value="コンパイル" onclick="main.game_start()"><input type="button" value="閉じる" onclick="main.close_box()"></p>'
            );
        tool_box.className = "tool_box_clicked";
        tool_box.backgroundColor = "#aaa";
        tool_box.moveTo(0, 20);
        tool_box.width = 430;
        
        this.addChild(score_label);
        this.addChild(tool_box);
        this.addChild(chains_label);
        
        this.addScore = function(score){
            this.score += score;
            score_label.text = "SCORE:" + this.score;
        };
        
        this.incrementChains = function(){
            ++this.num_chains;
            chains_label.text = this.num_chains + '<span style="font-size: medium">' + ((this.num_chains > 1) ? "chains" : "chain") + "</span>";
            if(this.num_chains % 10 == 0){
                if(this.color.r < 255){this.color.r += Math.floor(0.5 * this.num_chains);}
                if(this.color.b < 255){this.color.b += this.num_chains;}
                chains_label.color = "rgb(" + this.color.r + ", 0, " + this.color.b + ")";
            }
            if(this.num_chains == 1){chains_label.visible = true;}
        };
        
        this.resetChains = function(){
            this.num_chains = 0;
            this.color.r = 0;
            this.color.b = 0;
            chains_label.visible = false;
        }
    }
});

var Panel = enchant.Class.create(enchant.Sprite, {
    initialize : function(width, height){
        enchant.Sprite.call(this, width, height);
        
        this.className = "panel";
    }
});

var Screen = enchant.Class.create({
    initialize : function(panels, markers){
        this.panels = panels;
        this.info_bar = new InformationBar();
        this.markers = markers;
    },
    
    getPanel : function(num){
        return this.panels[num];
    }
});

var RespondTask = enchant.Class.create(enchant.TaskBase, {
    initialize : function(console, task_manager){
        enchant.TaskBase.call(this, task_manager, "Respond");
        
        this.console = console;
        this.next_updating_frame = game.frame + game.fps;
        this.is_complete = false;
    },
    
    setComplete : function(){
        this.is_complete = true;
    },
    
    execute : function(){
        if(game.frame >= this.next_updating_frame){
            this.console.value += '.';
            this.next_updating_frame = game.frame + game.fps;
        }
        
        if(!this.is_complete){this.task_manager.add(this);}
    }
});

var CountDownTask = enchant.Class.create(enchant.TaskBase, {
    initialize : function(target, count_start_num, task_manager){
        enchant.TaskBase.call(this, task_manager, "CountDown");
        
        this.target = target;
        this.count_num = count_start_num;
        this.next_count_down_frame = game.frame + game.fps;
    },
    
    execute : function(){
        if(this.next_count_down_frame <= game.frame){
            --this.count_num;
            this.target.text = this.count_num;
            this.next_count_down_frame = game.frame + game.fps;
        }
        
        if(this.count_num > 0){
            this.task_manager.add(this);
        }
    }
});

var NUM_TOUCH_SUCCESS_FRAMES = 12000;

var HighlightPanelOnNoteTask = enchant.Class.create(enchant.TaskBase, {
    initialize : function(patterns, sequencer, panels, markers, info_bar, task_manager){
        enchant.TaskBase.call(this, task_manager, "HighlightPanelOnNote");
        
        this.patterns = patterns;
        this.markers = markers;
        this.visible_markers = [];
        this.cur_index = 0;
        this.cur_sample_frame = 0;
        this.sequencer = sequencer;
        this.handle_task = new HandlePanelsTask(panels, markers, sequencer, info_bar, task_manager);
        this.effect_manager = task_manager.stage.getManager("effect");
        task_manager.add(this.handle_task);
    },
    
    execute : function(){
        var pattern = this.patterns[this.cur_index];
        
        if(this.cur_sample_frame >= pattern.frame - NUM_TOUCH_SUCCESS_FRAMES){
            pattern.pattern.forEach(function(panel_num){
                var marker = this.markers[panel_num];
                this.effect_manager.add(new ScaleUpEffect(Math.floor(game.frame + NUM_TOUCH_SUCCESS_FRAMES / 48000 * game.fps), marker));
                if(marker.visible){         //まだ一つ前の音符の処理をしている場合に備えてリセットしておく
                    marker.scaleX = 0.01;
                    marker.scaleY = 0.01;
                    var handle_task = this.handle_task, index = handle_task.panel_nums.indexOf(panel_num);
                    if(index != -1){
                        handle_task.panel_nums.splice(index, 1);
                        handle_task.note_play_frames.splice(index , 1);
                    }
                }else{
                    marker.visible = true;
                }
            }, this);
            this.handle_task.addNewInfos(pattern.pattern, pattern.frame);
            this.visible_markers.push(pattern);
            ++this.cur_index;
        }
        
        this.visible_markers.forEach(function(markers, index){  //画面に表示されているマーカーの内、通りすぎてしまったものを削除する
            if(this.cur_sample_frame >= markers.frame + NUM_TOUCH_SUCCESS_FRAMES){
                markers.pattern.forEach(function(panel_num){
                    var marker = this.markers[panel_num];
                    marker.visible = false;
                    marker.scaleX = 0.01;
                    marker.scaleY = 0.01;
                }, this);
                
                this.visible_markers.splice(index, 1);
            }
        }, this);
        
        this.cur_sample_frame = this.sequencer.cur_frame;
        if(this.cur_index < this.patterns.length){
            this.task_manager.add(this);
        }else{
            setTimeout(function(){
                main.showResult();
            }, 1000);
        }
    }
});

var ANIM_GRADATION_CLASSES = ["touched_very_early", "touched_early", "touched_slightly_early", "touched_on_time",
    "touched_slightly_late", "touched_late", "touched_late", "touched_but_fail"];
var TOUCH_TIMING_ON_TIME = 3, TOUCH_TIMING_FAILED = 7, THRESHOLD_FAIL = 24000, THRESHOLD_XXX = 16800, THRESHOLD_SLIGHTLY = 9600,
THRESHOLD_JUST = 4800;

var HandlePanelsTask = enchant.Class.create(enchant.TaskBase, {
    initialize : function(panels, markers, sequencer, info_bar, task_manager){
        enchant.TaskBase.call(this, task_manager, "HandlePanel");
        
        this.panels = panels;
        this.markers = markers;
        this.panel_nums = [];
        this.note_play_frames = [];
        this.panel_nums_in_animation = [];
        this.start_animation_frames = [];
        this.info_bar = info_bar;
        this.sequencer = sequencer;
        this.input_operator = task_manager.stage.getManager("input").operator;
    },
    
    addNewInfos : function(panel_nums, note_play_frame){
        this.panel_nums = this.panel_nums.concat(panel_nums);
        this.note_play_frames = this.note_play_frames.concat(panel_nums.map(function(){return note_play_frame;}));
    },
    
    findLastIndexOf : function(array, func){
        for(var i = array.length - 1; i >= 0; --i){
            if(func(array[i])){return i;}
        }
        
        return -1;
    },
    
    checkTouchTiming : function(note_play_frame, cur_frame){
        var diff_time = note_play_frame - cur_frame, diff_time_abs = Math.abs(diff_time);
        if(diff_time_abs > THRESHOLD_FAIL){
            this.info_bar.resetChains();
            return TOUCH_TIMING_FAILED;
        }
        
        this.info_bar.incrementChains();
        if(diff_time_abs <= THRESHOLD_JUST){
            this.info_bar.addScore((this.info_bar.num_chains + 1) * 250);   //とりあえず追加するスコアをハードコーディング
            return TOUCH_TIMING_ON_TIME;
        }else if(diff_time_abs <= THRESHOLD_SLIGHTLY){
            this.info_bar.addScore((this.info_bar.num_chains + 1) * 150);
            return (diff_time >= 0) ? TOUCH_TIMING_ON_TIME - 1 : TOUCH_TIMING_ON_TIME + 1;
        }else if(diff_time_abs <= THRESHOLD_XXX){
            this.info_bar.addScore((this.info_bar.num_chains + 1) * 75);
            return (diff_time >= 0) ? TOUCH_TIMING_ON_TIME - 2 : TOUCH_TIMING_ON_TIME + 2;
        }else{
            this.info_bar.addScore((this.info_bar.num_chains + 1) * 25);
            return (diff_time >= 0) ? TOUCH_TIMING_ON_TIME - 3 : TOUCH_TIMING_ON_TIME + 3;
        }
    },
    
    execute : function(){
        var result, cur_frame = this.sequencer.cur_frame;
        this.input_operator.touched_panel_nums.forEach(function(touched_panel_num){
            var index;
            if((index = this.panel_nums.indexOf(touched_panel_num)) == -1){ //マーカーのないパネルを叩いてしまった場合
                this.info_bar.resetChains();
                return;
            }
            
            result = this.checkTouchTiming(this.note_play_frames[index], cur_frame);
            var panel_num = this.panel_nums[index];
            this.panels[panel_num].className = "panel " + ANIM_GRADATION_CLASSES[result];
            this.markers[panel_num].visible = false;
            this.panel_nums_in_animation.push(panel_num);
            this.start_animation_frames.push(game.frame);
            this.panel_nums.splice(index, 1);
            this.note_play_frames.splice(index, 1);
        }, this);
        
        var index = this.findLastIndexOf(this.note_play_frames, function(frame){    //タッチされなかったパネル番号を削除する
            return NUM_TOUCH_SUCCESS_FRAMES + frame < cur_frame;
        });
        if(index != -1){
            this.panel_nums.splice(0, index);
            this.note_play_frames.splice(0, index);
        }
        this.input_operator.touched_panel_nums.splice(0);
        
        this.start_animation_frames.forEach(function(start_animation_frame, index){
            if(game.frame >= Math.round(start_animation_frame + game.fps / 5)){
                this.panels[this.panel_nums_in_animation[index]].className = "panel";
                this.panel_nums_in_animation.splice(index, 1);
                this.start_animation_frames.splice(index, 1);
            }
        }, this);
        
        this.task_manager.add(this);
    }
});

var ScaleUpEffect = enchant.Class.create(enchant.Effect, {
    initialize : function(end_time, target){
        enchant.Effect.call(this, end_time);
        
        this.target = target;
    },
    
    update : function(){
        this.target.scale(1.25);
    }
});

var MainInputOperator = enchant.Class.create(enchant.InputOperator, {
    initialize : function(screen){
        enchant.InputOperator.call(this);
        
        this.task_manager = null;
        this.screen = screen;
        this.touched_panel_nums = [];
    },
    
    setInputManager : function(input_manager){
        this.input_manager = input_manager;
        this.task_manager = input_manager.stage.getManager("task");
    },
    
    markTouchedPanel : function(panel_num){
        this.touched_panel_nums.push(panel_num);
    },
    
    operateA : function(){
        this.markTouchedPanel(0);
    },
    
    operateB : function(){
        this.markTouchedPanel(1);
    },
    
    operateC : function(){
        this.markTouchedPanel(2);
    },
    
    operateD : function(){
        this.markTouchedPanel(3);
    },
    
    operateE : function(){
        this.markTouchedPanel(4);
    },
    
    operateF : function(){
        this.markTouchedPanel(5);
    },
    
    operateG : function(){
        this.markTouchedPanel(6);
    },
    
    operateH : function(){
        this.markTouchedPanel(7);
    },
    
    operateI : function(){
        this.markTouchedPanel(8);
    },
    
    operateJ : function(){
        this.markTouchedPanel(9);
    },
    
    operateK : function(){
        this.markTouchedPanel(10);
    },
    
    operateL : function(){
        this.markTouchedPanel(11);
    },
    
    operateM : function(){
        this.markTouchedPanel(12);
    },
    
    operateN : function(){
        this.markTouchedPanel(13);
    },
    
    operateO : function(){
        this.markTouchedPanel(14);
    },
    
    operateP : function(){
        this.markTouchedPanel(15);
    },
    
    operateQ : function(){
        game.is_in_game = false;
        var tool_box = document.getElementsByClassName("tool_box")[0];
        tool_box.className = "tool_box_clicked";
    }
});

game = new enchant.Game(465, 465);
game.fps = 60;
game.preload(["marker.png"]);
game.onload = function(){
	var stage = new enchant.Stage(), panels = [], markers = [];
    
    for(var i = 0; i < 16; ++i){
        var panel = new Panel(100, 100), num_x = i % 4, num_y = Math.floor(i / 4), marker = new enchant.Sprite(100, 100);
        panel.x = num_x * 100 + num_x * 3;
        panel.y = num_y * 100 + 45 + num_y * 3;
        panel.backgroundColor = "rgba(255, 255, 255, 0.6)";
        stage.addChild(panel);
        panels.push(panel);
        marker.image = game.assets["marker.png"];
        marker.moveTo(panel.x + 5, panel.y + 5);
        marker.scale(0.01);
        marker.visible = false;
        stage.addChild(marker);
        markers.push(marker);
    }
    
    game.is_in_game = false;
    var screen = new Screen(panels, markers);
    var main_input = new MainInputOperator(screen);
    stage.getManager("input").setOperator(main_input);
    stage.addChild(screen.info_bar);
    main.screen = screen;
    main.task_manager = stage.getManager("task");
    game.currentScene.addChild(stage);
};
	
game.keybind(49, 'a');		//1キー
game.keybind(50, 'b');		//2キー
game.keybind(51, 'c');		//3キー
game.keybind(52, 'd');		//4キー
game.keybind(81, 'e');		//qキー
game.keybind(87, 'f');		//wキー
game.keybind(69, 'g');      //eキー
game.keybind(82, 'h');		//rキー
game.keybind(65, 'i');      //aキー
game.keybind(83, 'j');		//sキー
game.keybind(68, 'k');      //dキー
game.keybind(70, 'l');		//fキー
game.keybind(90, 'm');      //zキー
game.keybind(88, 'n');		//xキー
game.keybind(67, 'o');      //cキー
game.keybind(86, 'p');		//vキー
game.keybind(80, 'q');      //pキー
	
['c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q'].forEach(function(type){
	this.addEventListener(type + 'buttondown', function() {
		if (!this.input[type]) {
			this.input[type] = true;
		}
	});
	this.addEventListener(type + 'buttonup', function() {
		if (this.input[type]) {
			this.input[type] = false;
		}
	});
}, game);
	
game.start();

});