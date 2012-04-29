/**
 * main.js
 * ぴこぴこしーけんさー
 * developed by HAZAMA(http://funprogramming.ojaru.jp)
 */

var main = {};

require(["mml_compiler", "sequencer", "scripts/lib/enchant.js", "scripts/lib/oopgame.enchant.js"], function(compiler, Sequencer, dummy, enchant){
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
        this.sequencer = new Sequencer(tree);
    }
    catch(e){
        console.value = "エラー発生！:" + e.message;
        return;
    }
    console.value = "ゲームを開始します。しばらくお待ちください";    
    var tool_box = document.getElementsByClassName("tool_box_clicked")[0];
    tool_box.className = "tool_box";
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
}

main.closeErrorWindow = function(){
    game.currentScene.removeChild(this.error_window);
}

var PatternProducer = enchant.Class.create({
    initialize : function(){
        
    },
    
    getNextNode : function(node, skip_child){
        if(!skip_child && (node.cons === "note" || node.cons === "command" || node.cons === "chord")){return node;}
        if(!skip_child && node.length){return this.getNextNode(node[0], false);}
        
        if(!node.parent){
            return null;
        }
        var index = this.indexOf(node.parent, node);
        if(index + 1 >= node.parent.length){
            return this.getNextNode(node.parent, true);
        }else{
            return this.getNextNode(node.parent[index + 1], false);
        }
    },
    
    make : function(ast){
        var node = this.getNextNode(ast, false), patterns = [], cur_end_time = -1;
        do{
            if(node.cons === "note"){
                
            }
        }while((node = this.getNextNode(node, true)));
    }
});

var InformationBar = enchant.Class.create(enchant.Group, {
    initialize : function(){
        enchant.Group.call(this);
        
        this.score = 0;
        var score = new enchant.Label("SCORE:0");
        score.id = "score";
        
        var tool_box = new enchant.Label(
            '<textarea id="editor" cols="50" rows="20">' +
            '@1 t110 l4 cdef edcr efga gfer\n' +
            'crcr crcr l8 ccddeeff l4 edcr\n' +
            'l2 {ccd}{dee} {ffr}e dc r4\n' +
            '(t2) @0 l4 "ceg""ceg""ceg""ceg" "cfa""cfa""cfa""cfa"\n' +
            '"dgb""dgb""dgb""dgb" "gb<d>""gb<d>""gb<d>""gb<d>"\n' +
            '"ceg"r"ceg"r "gb<d>"r"gb<d>"r "ceg""dfa" "egb""fa<c>"\n' +
            '"dfa<c>""g<cd>""eg<c>"r\n' +
            'l2 "ceg""dfa" "egb""cdfa" "dfgb""ceg" l4 "<ceg<c"\n' +
            '</textarea>' +
            '<input id="error_console" type="text" readonly>' +
            '<p><input type="button" value="コンパイル" onclick="main.game_start()"><input type="button" value="閉じる" onclick="main.close_box()"></p>'
            );
        tool_box.className = "tool_box_clicked";
        tool_box.backgroundColor = "#aaa";
        tool_box.moveTo(0, 20);
        tool_box.width = 430;
        
        this.addChild(score);
        this.addChild(tool_box);
    },
    
    addScore : function(score){
        this.score += score;
    }
});

var Panel = enchant.Class.create(enchant.Sprite, {
    initialize : function(width, height){
        enchant.Sprite.call(this, width, height);
        
        this.className = "panel touched_dummy";
    }
});

var Screen = enchant.Class.create({
    initialize : function(panels){
        this.panels = panels;
        this.info_bar = new InformationBar();
    },
    
    getPanel : function(num){
        return this.panels[num];
    }
});

var ANIM_GRADATION_CLASSES = ["touched_on_time", "touched_slightly_late", "touched_late", "touched_late", "touched_but_fail"];

var HandlePanelTask = enchant.Class.create(enchant.TaskBase, {
    initialize : function(panel, task_manager){
        enchant.TaskBase.call(this, task_manager, "HandlePanel");
        
        this.target = panel;
    },
    
    execute : function(){
        var class_num = Math.floor(Math.random() * ANIM_GRADATION_CLASSES.length);
        this.target.className = this.target.className.replace(/touched.+/, ANIM_GRADATION_CLASSES[class_num]);
    }
})

var MainInputOperator = enchant.Class.create(enchant.InputOperator, {
    initialize : function(screen){
        enchant.InputOperator.call(this);
        
        this.task_manager = null;
        this.screen = screen;
    },
    
    setInputManager : function(input_manager){
        this.input_manager = input_manager;
        this.task_manager = input_manager.stage.getManager("task");
    },
    
    makePanelHandler : function(panel_num){
        var panel = this.screen.getPanel(panel_num);
        this.task_manager.add(new HandlePanelTask(panel, this.task_manager));
    },
    
    operateA : function(){
        this.makePanelHandler(0);
    },
    
    operateB : function(){
        this.makePanelHandler(1);
    },
    
    operateC : function(){
        this.makePanelHandler(2);
    },
    
    operateD : function(){
        this.makePanelHandler(3);
    },
    
    operateE : function(){
        this.makePanelHandler(4);
    },
    
    operateF : function(){
        this.makePanelHandler(5);
    },
    
    operateG : function(){
        this.makePanelHandler(6);
    },
    
    operateH : function(){
        this.makePanelHandler(7);
    },
    
    operateI : function(){
        this.makePanelHandler(8);
    },
    
    operateJ : function(){
        this.makePanelHandler(9);
    },
    
    operateK : function(){
        this.makePanelHandler(10);
    },
    
    operateL : function(){
        this.makePanelHandler(11);
    },
    
    operateM : function(){
        this.makePanelHandler(12);
    },
    
    operateN : function(){
        this.makePanelHandler(13);
    },
    
    operateO : function(){
        this.makePanelHandler(14);
    },
    
    operateP : function(){
        this.makePanelHandler(15);
    },
    
    operateQ : function(){
        game.is_in_game = false;
        var tool_box = document.getElementsByClassName("tool_box")[0];
        tool_box.className = "tool_box_clicked";
    }
});

game = new enchant.Game(465, 465);
game.fps = 30;
game.onload = function(){
	var stage = new enchant.Stage(), panels = [];
    
    for(var i = 0; i < 16; ++i){
        var panel = new Panel(100, 100), num_x = i % 4, num_y = Math.floor(i / 4);
        panel.x = num_x * 100 + num_x * 3;
        panel.y = num_y * 100 + 45 + num_y * 3;
        panel.backgroundColor = "rgba(255, 255, 255, 0.6)";
        stage.addChild(panel);
        panels.push(panel);
    }
    
    game.is_in_game = false;
    var screen = new Screen(panels);
    var main_input = new MainInputOperator(screen);
    stage.getManager("input").setOperator(main_input);
    stage.addChild(screen.info_bar);
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