// ==UserScript==
// @name        Taimanin Asagi Battle Bot
// @version     0.3
// @description A bot for TABA for when you can't participate in Events but still want to. It will focus on Events if any are online, if not, regular missions.
// @author      :piercer / @aernbau
// @match       http://osapi.dmm.com/gadgets/ifr*gadget_asagi*
// @require     http://code.jquery.com/jquery-latest.js
// ==/UserScript==
var time_between_clicks = 10000;
function loadScript(url, callback){
    var script = document.createElement("script");
    script.type = "text/javascript";
    if (script.readyState){  //IE
        script.onreadystatechange = function(){
            if (script.readyState == "loaded" ||
                    script.readyState == "complete"){
                script.onreadystatechange = null;
                callback();
            }
        };
    } else {  //Others
        script.onload = function(){
            callback();
        };
    }
    script.src = url;
    document.getElementsByTagName("head")[0].appendChild(script);
}

loadScript("http://yui.yahooapis.com/3.18.1/build/yui/yui-min.js", function(){
    YUI().use("datasource", function(Y) {
        console.log('YUI loaded');
    });
});

// Match is OSAPI because it loads a new document into itself, so it's not dmm.com blah blah but this.

// This displays the small command area on the top left.
// Click it to reset the bot.
var area_string = /*"<div id='botctrl' style='position: fixed; width: 500px; height: 80px;"
+"background: rgba(58,58,58,0.5); top: 0; left: 0;"
+"border: 1px rgba(208,208,208,0.6) solid; z-index: 9999;'>" //z-indexes in the game have absurd values. gotta out-absurd it.
+"<p id='botstatus' style='color: white;padding: 20px;font-size: 20px; font-family: monospace; display: inline-block;'>Checking bot status.</p>"
+"<button id='run_toggle'>Toggle bot</button>"
+"</div>";*/
"<div id='botctrl' style='position: fixed; width: initial; height: 80px;background: rgba(58,58,58,0.5);"
+"top: 0; left: 0;border: 1px rgba(208,208,208,0.6) solid; z-index: 9999;'>"
+"<div style='display: inline-block; width: 250px;'>"
+"<p id='botstatus' style='color: white;font-size: 20px;font-family: monospace;display:"
+"block;background: rgba(0,0,0,0.7);vertical-align: middle; line-height:40px;"//height: inherit;line-height: 80px;"
+"padding-left: 10px;'>Bot available.</p>"
+"<p id='plr_status' style='color: white;font-size: 20px;font-family: monospace;display:"
+"block;background: rgba(0,0,0,0.7);vertical-align: middle; line-height:40px;"//height: inherit;line-height: 80px;"
+"padding-left: 10px;'>No info.</p>"
+"</div>"
+"<div style='display: inline-block; height: inherit; vertical-align: top;'>"
+"<button id='run_toggle' style='font-family: monospace; background: transparent; color: white;"
+"padding: 5px; border-style: groove; border-color: gray; background: rgba(0,0,0,0.7); height: inherit;"
+"'>Start/Pause bot</button>"
+"<button id='reset_button' style='font-family: monospace; background: transparent; color: white;"
+"padding: 5px; border-style: groove; border-color: gray; background: rgba(0,0,0,0.7); height: inherit;"
+"</div>"
+"'>Reset/Start bot</button></div>";


$("body").append(area_string);



if (typeof(Worker) !== "undefined") {
    $("#botstatus").text("Bot available.");
} else {
    $("#botstatus").text("Browser not supported.");
}

var post_start = false; var run = false;
// Levels deep is how deep in the menu you are.
// 0 - main menu. 1 - event menu. 2 - event where you click.
var layer = 0; var map_l3_order = 0;
// 0 - regular clicker, 1 - arena, 2 - raidmap.
//var event_type = 0;
var which_event = 0;
var event_types = { "Clicker":0, "Arena":1, "RaidMap":2};
// Raid event map values. 0 empty. 1 boss. 2 UR boss.
var raid_event_map = [[0,0,0],[0,0,0],[0,0,0]];
var player_pos = [0,0]; var distance_hp = 0;
var world_raid = [0,0]; var world_raid_exist = false;
var rare_raid = [0,0]; var rare_raid_exist = false;
var area_x = 0;	var area_y = 0;

function bot() {
    //'use strict';
    if(run)
        if(!post_start){
            if($('.game_start_over').length){
                $(".game_start_over")[0].click(); 
            }
            post_start = true;
        }
        else{
            var hp_split = $("#red_gage_num").text().split("/");
            var bp_split = $("#top_bp_num").text().split("/");
            //$("#plr_status").text("HP: "+hp_split[0]+"; BP: "+bp_split[0]);
            
            $("#plr_status").text("HP: "+$("#red_gage_num").text()+"; BP: "+bp_split[0]);

            if(layer==0){ // BASE LAYER
                //if($('img[alt="レイドイベント"]').length){
                if($("#main_frame").find('> a > img[alt="レイドイベント"]').length){
                    which_event = event_types.RaidMap;
                    $('img[alt="レイドイベント"]')[0].click();
                    $("#botstatus").text("Map Event mode.");
                }else if($("#main_frame").find('> a > img[alt="PVPイベント"]').length){
                    which_event = event_types.Arena;
                    $('img[alt="PVPイベント"]')[0].click();
                    $("#botstatus").text("PVP Event mode.");
                }
                else{$('img[alt="クエスト"]')[0].click(); $("#botstatus").text("Quest mode.");}
                layer = 1;
            } else if(layer==1){ // LAYER ONE	/////////////////////////////////////
            	// While I could use Switch here, ifs are easier to see.
                if(which_event == event_types.RaidMap){ 				// MAP EVENT
                	console.log("Raid Layer 1");
                    world_raid_exist = false; rare_raid_exist = false;
                    raid_event_map = [[0,0,0],[0,0,0],[0,0,0]];
                    $(".wre_my_position").parent().parent().attr('id','map');
                    $("#map").children("tr").each(function(){
                        $(this).children("td").each(function(){
                            if($(this).hasClass('wre_my_position')){
                                player_pos[0] = area_x; player_pos[1] = area_y;
                                console.log("Player at "+area_x+" "+area_y);
                            }
                            if($(this).find('> img').length){
                                if($(this).find('> img').attr("src").indexOf("rare_raid") != -1){
                                    //raid_event_map[area_x][area_y] = 1;
                                    world_raid[0] = area_x; world_raid[1] = area_y;
                                    rare_raid_exist = true;
                                    console.log("R at "+area_x+" "+area_y);
                                }
                                if($(this).find('> img').attr("src").indexOf("world_raid") != -1){
                                    rare_raid[0] = area_x; rare_raid[1] = area_y;
                                    world_raid_exist = true;
                                    //raid_event_map[area_x][area_y] = 2;
                                    console.log("UR at "+area_x+" "+area_y);
                                }
                            }
                            area_x++;
                        });
                        area_x = 0;	area_y++;
                    });
                    area_x = 0; area_y = 0;
                    distance_hp = 0;
                    if(world_raid_exist || rare_raid_exist){
                        var health_per_cube = 18;
                        // The distance it takes to move to another window is 30-ish?
                        if(world_raid_exist){
                            distance_hp += Math.abs(player_pos[0] - world_raid[0]) * health_per_cube;
                            distance_hp += Math.abs(player_pos[1] - world_raid[1]) * health_per_cube;
                        } else if (rare_raid_exist) {
                            distance_hp += Math.abs(player_pos[0] - rare_raid[0]) * health_per_cube;
                            distance_hp += Math.abs(player_pos[1] - rare_raid[1]) * health_per_cube;
                        }
                        var split_string = $("#red_gage_num").text().split("/");
                        //console.log(split_string[0]);
                        if(distance_hp < split_string[0]){
                            if($(".wre_link_quest").length){
                                $(".wre_link_quest").attr("id","event_mission");
                                $("#event_mission")[0].click();
                                console.log('Progressing area '+$("$stage_per").text());
                                layer = 2;
                            }
                        }
                    }
                } else if(which_event == event_types.Arena){		// ARENA
                	if($(".top_menu_2").length){
                		console.log("Arena Layer 1.");
                		// Check rank.
                		console.log("Moving to PvP.");
                		$(".top_menu_2")[0].click(); // top menu č is arena.
                		layer = 2;
                	}
                }
                
            } else if(layer == 2){ // LAYER TWO	/////////////////////////////////////
                if(which_event == event_types.RaidMap){				// MAP EVENT
                	console.log("Raid Layer 2");
                    if($("#stage_per").length){
                        YUI().use('node-event-simulate', function(Y) {
                            var node = Y.one("#canvas");
                            //simulate a mouse down at point (100,100) in the client area
                            node.simulate("mousedown", { clientX: 400, clientY: 331 });
                            if($("#stage_per").text() == "100"){
                                console.log("100% reached");
                                layer = 3;
                            }
                        });
                    } else {
                        layer = 3;
                    }
                    //var e = jQuery.Event("mousedown", {pageX: 300, pageY: 500}); //次
                } else if(which_event == event_types.Arena){		// ARENA
                	console.log("Arena Layer 2");
                	var lowest_rank = 100; var low_id = 0;
                	var your_rank = $(".arena_rank_frame").text().split("ク");
                	your_rank = your_rank[1];
                	var i = 0; 
                	console.log("Your rank - "+your_rank);
                	$("#productList").children("li").each(function(){
                		i++;
                		
                		$(this).attr('id','enemy_'+i);
                		$(this).find("> a > div > div").first().find("> div").eq(2).attr('id','rank_'+i);
            			var rank_str = $("#rank_"+i).text().split("ク");
            			rank_str = parseInt(rank_str[1], 10);;
                        //CHECK IF BLUGRD HERE
                        if($("#enemy_"+i).find(".blue_grd").length){
                            console.log("Enemy "+i+" = "+rank_str+" is Rank Up enemy. Skipping. LowID: "+low_id);
                        } else{
                            if(lowest_rank > rank_str){
                                lowest_rank = rank_str; low_id = i;
                            }
                            console.log("Enemy "+i+" = "+rank_str+". LowID: "+low_id);
                        } 

                		// [li] -> [a] -> [div] -> [img, [div], div, div] -> [div, div, div, div]
                	});
                	var bp = $("#top_bp_num").text().split("/");
                	if(bp[0] >= 2 && low_id != 100){
                		console.log("Enough health remaining. Enemy ID = "+low_id);
                		//$("#enemy_"+low_id).click();
                		YUI().use('node-event-simulate', function(Y) {
    		                var node = Y.one("#enemy_"+low_id);
    		                console.log("Player to attack selected.");
    		                node.simulate("click");
    		            });
                		$("#enemy_"+low_id).click();
                        // blue_grd is enemy to rank
                		$("#enemy_"+low_id).find(".red_grd").click();
                		layer = 3;
                	} else if (bp[0] < 2){
                		$(".top_menu_2")[0].click(); // Refreshing the PvP list
                	}
                }
            } else if(layer == 3){ // LAYER THREE /////////////////////////////////////
            	if(which_event == event_types.RaidMap){
            		console.log("Arena Layer 3");
    	            YUI().use('node-event-simulate', function(Y) {
    	                var node = Y.one("#canvas");
    	                console.log("Changing area");
    	                //simulate a mouse down at point (100,100) in the client area
    	                switch(map_l3_order){
    	                    case 0:
    	                        node.simulate("mousedown", { clientX: 250, clientY: 500 });
    	                        map_l3_order = 1; break;
    	                    case 1:
    	                        //INCOMPLETE. EVENT OVER

    	                        //CALCULATE WHICH MAP PART TO PRESS HERE.
    	                        
    	                        map_l3_order = 0; layer = 2;break;
    	                }
    	            });
    	        } else if(which_event == event_types.Arena){		// ARENA
                	console.log("Arena Layer 2");
                	$("#quest_attack_2").click();
                    $(".top_menu_2")[0].click(); 
                    setTimeout(function(){$(".top_menu_2")[0].click();},50); // lol
                    setTimeout(function(){$(".top_menu_2")[0].click();},50);
                    setTimeout(function(){$(".top_menu_2")[0].click();},50);
                    setTimeout(function(){$(".top_menu_2")[0].click();},50);
                    layer = 2;
        			//$("#mypage").click();
                    //setTimeout(function(){$("#botstatus").click();},500);
        			
                }
            }
            //console.log($("#red_gage_num").text());
        }
}

var first_run = true;
$("#reset_button").on("click", function(){
    console.log("Reset");
    $("#botstatus").text("Bot reset.");
    if(first_run){
        run = true;
        setInterval(bot, time_between_clicks);
        first_run = false;
        $("#botstatus").text("Bot active.");
    }
    $("#mypage").click();
    layer = 0;
});

$("#run_toggle").on("click", function(){
    run = !run;
    if(run){
        if(first_run){
            setInterval(bot, time_between_clicks);
            first_run = false;
        }
        $("#botstatus").text("Bot running.");   
    }
    else
        $("#botstatus").text("Bot paused.");
});

//http://puu.sh/pgzpk.png
/*
THE SELECT AREA SCREEN.
JESUS CHRIST. IT'S A SINGLE CANVAS.
*/