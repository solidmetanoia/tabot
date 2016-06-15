                
// ==UserScript==
// @name        Taimanin Asagi Battle Bot
// @version     0.5
// @description A bot for TABA for when you can't participate in Events but still want to. It will focus on Events if any are online, if not, regular missions.
// @author      :piercer / @aernbau
// @match       http://osapi.dmm.com/gadgets/ifr*gadget_asagi*
// @require     http://code.jquery.com/jquery-latest.js
// ==/UserScript==

var time_between_clicks = 10000;

// Match is OSAPI because it loads a new document into itself, so it's not dmm.com/??? but OSAPI.
// Loading script via require does not work with YUI.
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

// Creates command area in top left.
var area_string = 
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
+"padding: 5px; border-style: groove; border-color: gray; background: rgba(0,0,0,0.7); height: 50%; float:left;"
+"'>Start/Pause bot</button>"
+"<button id='reset_button' style='font-family: monospace; background: transparent; color: white;"
+"padding: 5px; border-style: groove; border-color: gray; background: rgba(0,0,0,0.7); height: 50%; float:left; clear:both;"
+"'>Reset/Start bot</button>"
+"</div>"
+"<div style='display: inline-block; height: inherit; vertical-align: top;'>"
+"<select id='select_bp' style='font-family: monospace; background: transparent; color: white;"
+"padding: 5px; border-style: groove; border-color: gray; background: rgba(0,0,0,0.7); height: 50%; width: 130px; float: left;"
+"'><option value='one'>1BP - Brave</option><option selected='selected' value='two'>2BP - Normal</option><option value='three'>3BP - Careful</option></select>"
+"<select id='select_rank' style='font-family: monospace; background: transparent; color: white;"
+"padding: 5px; border-style: groove; border-color: gray; background: rgba(0,0,0,0.7); height: 50%; width: 130px; float: left; clear:both;"
+"'><option value='str' selected='selected'>Stronger</option><option value='wkr'>Weaker</option></select>"
+"</div></div>";

$("body").append(area_string);

$("#botstatus").text("Bot available.");

var post_start = false; var run = false;
var hp_split; var bp_split; var adv = false;
// Levels deep is how deep in the menu you are.
// 0 - main menu. 1 - event menu. 2 - event where you click.
var layer = 0; var bp_used = 2; var attack_str = true;
// 0 - regular clicker, 1 - arena, 2 - raidmap.
var which_event = 0;
var event_types = { "Clicker":0, "Arena":1, "RaidMap":2};
// Raid event map values.
var player_pos = [0,0]; var distance_hp = 0;
var world_raid = [0,0]; var world_raid_exist = false;
var rare_raid = [0,0]; var rare_raid_exist = false;
var area_x = 0; var area_y = 0;
// Order of action in map progresses with clicks.
var map_l3_order = 0;

function bot() {
    //'use strict';
    if(run)
        if(!post_start){
            // The start screen
            if($('.game_start_over').length){
                $(".game_start_over")[0].click(); 
            }
            post_start = true;
        }
        else{
            hp_split = $("#red_gage_num").text().split("/");
            bp_split = $("#top_bp_num").text().split("/");
            //$("#plr_status").text("HP: "+hp_split[0]+"; BP: "+bp_split[0]);
            if(layer==0){ // BASE LAYER
                $("#plr_status").text("HP: "+$("#red_gage_num").text()+"; BP: "+bp_split[0]);
                // Confirming event type (3 options)
                if($("#main_frame").find("> a > img[alt='レイドイベント']").length){
                    which_event = event_types.RaidMap;
                    $('img[alt="レイドイベント"]')[0].click();
                    $("#botstatus").text("Map or Clicker mode.");
                }else if($("#main_frame").find("> a > img[alt='PVPイベント']").length){
                    which_event = event_types.Arena;
                    $('img[alt="PVPイベント"]')[0].click();
                    $("#botstatus").text("PVP Event mode.");
                }
                else{$('img[alt="クエスト"]')[0].click(); $("#botstatus").text("No events running.");}
                layer = 1;
            } else if(layer==1){ // LAYER ONE   /////////////////////////////////////
                $("#plr_status").text("HP: "+$("#red_gage_num").text()+"; BP: "+bp_split[0]);
                if($("#map").length){
                    $("#botstatus").text("Map Event mode.");
                } else {
                    which_event = event_types.Clicker;
                    $("#botstatus").text("Clicker mode.");
                }
                // While I could use Switch here, ifs are easier to see.
                if(which_event == event_types.RaidMap){                 // MAP EVENT
                    console.log("Raid Layer 1");
                    world_raid_exist = false; rare_raid_exist = false;
                    $(".wre_my_position").parent().parent().attr('id','map');
                    $("#map").children("tr").each(function(){
                        $(this).children("td").each(function(){
                            if($(this).hasClass('wre_my_position')){
                                player_pos[0] = area_x; player_pos[1] = area_y;
                                console.log("Player at "+area_x+" "+area_y);
                            }
                            if($(this).find('> img').length){
                                if($(this).find('> img').attr("src").indexOf("rare_raid") != -1){
                                    world_raid[0] = area_x; world_raid[1] = area_y;
                                    rare_raid_exist = true;
                                    console.log("R at "+area_x+" "+area_y);
                                }
                                if($(this).find('> img').attr("src").indexOf("world_raid") != -1){
                                    rare_raid[0] = area_x; rare_raid[1] = area_y;
                                    world_raid_exist = true;
                                    console.log("UR at "+area_x+" "+area_y);
                                }
                            }
                            area_x++;
                        });
                        area_x = 0; area_y++;
                    });
                    area_x = 0; area_y = 0;
                    distance_hp = 0;
                    // World Boss > Raid Boss > No boss
                    if(world_raid_exist || rare_raid_exist){
                        var health_per_cube = 18;
                        if(world_raid_exist){
                            distance_hp += Math.abs(player_pos[0] - world_raid[0]) * health_per_cube;
                            distance_hp += Math.abs(player_pos[1] - world_raid[1]) * health_per_cube;
                        } else if (rare_raid_exist) {
                            distance_hp += Math.abs(player_pos[0] - rare_raid[0]) * health_per_cube;
                            distance_hp += Math.abs(player_pos[1] - rare_raid[1]) * health_per_cube;
                        }
                        var split_string = $("#red_gage_num").text().split("/");
                        if(distance_hp < split_string[0]){
                            if($(".wre_link_quest").length){
                                $(".wre_link_quest").attr("id","event_mission");
                                $("#event_mission")[0].click();
                                console.log('Progressing area '+$("$stage_per").text());
                                layer = 2;
                            }
                        }
                    }
                } else if(which_event == event_types.Arena){        // ARENA
                    if($(".top_menu_2").length){
                        console.log("Arena Layer 1.");
                        // Check rank.
                        var points = $("#rank_point").text().split(":");
                        console.log("Event points: "+points[1]);
                        console.log("Moving to PvP.");
                        $(".top_menu_2")[0].click(); // top menu č is arena.
                        layer = 2;
                    }
                } else if(which_event == event_types.Clicker){
                    var loc_str = "";
                    if($("img[alt='レイドイベント']").length){
                        console.log("Clicker Layer 1.");
                        if(!($("img[alt='レイドアラートアイコン']").length && bp_split[0] > 0)){
                            $("img[alt='ステージ']").click();
                            layer = 2;
                        } else {
                            loc_str = "Raid enemies exist. ";
                            if(bp_split[0] > 0){
                                loc_str += "Attacking.";
                                $("img[alt='レイドアラートアイコン']").click();
                                layer = 3; // SKIPPING TO LAYER 3 IF RAID
                            } else {loc_str += "Need at least 1 BP.";}
                            console.log(loc_str);
                        }
                    }
                }
                
            } else if(layer == 2){ // LAYER TWO /////////////////////////////////////
                $("#plr_status").text("HP: "+$("#red_gage_num").text()+"; BP: "+bp_split[0]);
                if(which_event == event_types.RaidMap){             // MAP EVENT
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
                } else if(which_event == event_types.Arena){        // ARENA
                    console.log("Arena Layer 2");
                    var attack_rank;
                    if(attack_str)
                        attack_rank = 100;
                    else 
                        attack_rank = 0;
                    var atk_id = 0;
                    var your_rank = $(".arena_rank_frame").text().split("ク");
                    your_rank = your_rank[1];
                    var i = 0; 
                    console.log("Your rank - "+your_rank);
                    $("#productList").children("li").each(function(){
                        i++;
                        
                        $(this).attr('id','enemy_'+i);
                        $(this).find("> a > div > div").first().find("> div").eq(2).attr('id','rank_'+i);
                        var rank_str = $("#rank_"+i).text().split("ク");
                        rank_str = parseInt(rank_str[1], 10);
                        //CHECK IF BLUGRD HERE
                        if($("#enemy_"+i).find(".blue_grd").length){
                            console.log("Enemy "+i+" = "+rank_str+" is Rank Up enemy. Skipping. AtkID: "+atk_id);
                        } else{
                            // Low rank - stronger enemy.
                            if(attack_str){
                                if(attack_rank > rank_str){
                                    attack_rank = rank_str; atk_id = i;
                                }
                            }
                            else{
                                if(attack_rank < rank_str){
                                    attack_rank = rank_str; atk_id = i;
                                }   
                            }
                            console.log("Enemy "+i+" = "+rank_str+". AtkID: "+atk_id);
                        } 
                        // [li] -> [a] -> [div] -> [img, [div], div, div] -> [div, div, div, div]
                    });
                    bp = $("#top_bp_num").text().split("/");
                    if(bp[0] >= bp_used && atk_id != 100){
                        console.log("Enough health remaining. Enemy ID = "+atk_id);
                        //$("#enemy_"+atk_id).click();
                        YUI().use('node-event-simulate', function(Y) {
                            var node = Y.one("#enemy_"+atk_id);
                            console.log("Player to attack selected.");
                            node.simulate("click");
                        });
                        $("#enemy_"+atk_id).click();
                        // blue_grd is enemy to rank
                        $("#enemy_"+atk_id).find(".red_grd").click();
                        layer = 3;
                    } else if (bp[0] < bp_used){
                        $(".top_menu_2")[0].click(); // Refreshing the PvP list
                    }
                } else if(which_event == event_types.Clicker){        // CLICKER
                    YUI().use('node-event-simulate', function(Y) {
                        var node = Y.one("#canvas");
                        // if 100% PUT INTO MEMORY TO CLICK A DIFFERENT LOCATION 2ND TURN
                        if($("#stage_per").length){
                            if($("#stage_per").text() == "100"){
                                adv = true;
                                console.log("Stage clear.");
                            }
                            if( parseInt(hp_split[0], 10) >= parseInt($("#quest_status_window_1").text(), 10)){
                            console.log("Progressing. HP currently: "+hp_split[0]+"; HP needed: "+$("#quest_status_window_1").text());
                            node.simulate("mousedown", { clientX: 150, clientY: 450 });    
                            //node.simulate("click", { clientX: 150, clientY: 450 });    
                            } else {
                                $("#mypage")[0].click();
                                layer = 0;
                            }
                            console.log
                        } else {
                            if(adv){
                                console.log("Clicking STAGE CLEAR.");
                                node.simulate("mousedown", { clientX: 460, clientY: 460 });    
                                node.simulate("click", { clientX: 460, clientY: 460 });  
                                node.simulate("mouseup", { clientX: 460, clientY: 460 });    
                                adv = false;
                            }
                        }
                                                
                        
                        
                    });
                    // 450,350 xy = PLEASE CONTINUE
                    // 150,450 xy = CLICK WHEN RAID APPEARS. BETTER FOR GENERLA
                }
            } else if(layer == 3){ // LAYER THREE /////////////////////////////////////
                if(which_event == event_types.RaidMap){
                    // Moving towards boss if one exists requires coordinate clicks on canvas.
                    map_l3_order = 0;
                    console.log("Arena Layer 3");
                    YUI().use('node-event-simulate', function(Y) {
                        var node = Y.one("#canvas");
                        console.log("Changing area");
                        switch(map_l3_order){
                            case 0:
                                // (250,500) - proceed map button
                                node.simulate("mousedown", { clientX: 250, clientY: 500 });
                                map_l3_order = 1; break;
                            case 1:
                                //INCOMPLETE. EVENT OVER. NEED DATA.

                                //CALCULATE WHICH MAP PART TO PRESS HERE.
                                
                                map_l3_order = 0; layer = 2;break;
                        }
                    });
                } else if(which_event == event_types.Arena){        // ARENA
                    console.log("Arena Layer 2");
                    switch(bp_used){
                        case 1 : $("#quest_attack_1").click(); break;
                        case 2 : $("#quest_attack_2").click(); break;
                        case 3 : $("#quest_attack_3").click(); break;
                        default: break;
                    }
                    // I know this looks hilarious but you need to hit the timer right.
                    // Prevents loading of fight and skips to PvP choice screen most of the time.
                    // If it doesn't, gotta refresh->reset or manually pass->reset.
                    $(".top_menu_2")[0].click();
                    $("#mypage")[0].click();
                    $(".top_menu_2")[0].click();
                    setTimeout(function(){$(".top_menu_2")[0].click();},10); // lol
                    setTimeout(function(){$(".top_menu_2")[0].click();},20);
                    setTimeout(function(){$(".top_menu_2")[0].click();},30);
                    setTimeout(function(){$(".top_menu_2")[0].click();},40);
                    setTimeout(function(){$(".top_menu_2")[0].click();},50);
                    layer = 2;
                    //$("#mypage").click();
                    //setTimeout(function(){$("#botstatus").click();},500);
                    
                } else if(which_event == event_types.Clicker){
                    
                    YUI().use('node-event-simulate', function(Y) {
                        var node = Y.one("#canvas");
                        switch(map_l3_order){
                            case 0: console.log("Clicker Layer RAID"); $(".friend_frame")[0].click(); map_l3_order = 1; break;
                            case 1: $("#battle_start_button").click(); map_l3_order = 2; break;
                            case 2: if($("img[alt='ファイスアイコン']").length)
                                        $("img[alt='ファイスアイコン']")[0].click(); 
                                    map_l3_order = 3; break;
                            case 3: $("#quest_attack_1").click(); map_l3_order++; break;
                            case 4: map_l3_order++; break;
                            case 5: map_l3_order++; break;
                            case 6: node.simulate("mousedown", { clientX: 240, clientY: 100 });
                                    node.simulate("click", { clientX: 240, clientY: 100 });
                                    node.simulate("mouseup", { clientX: 240, clientY: 100 }); map_l3_order++; break;
                            case 7: node.simulate("mousedown", { clientX: 460, clientY: 460 }); map_l3_order++; break;
                            case 8: map_l3_order++; break;
                            case 9: node.simulate("mousedown", { clientX: 460, clientY: 490 }); 
                                    node.simulate("click", { clientX: 460, clientY: 490 });
                                    node.simulate("mouseup", { clientX: 460, clientY: 490 });
                                    map_l3_order++; break;
                            case 10: $("#mypage")[0].click(); map_l3_order = 0; layer = 0; break;
                        }
                    });
                }
            }
        }
}

var first_run = true;
$("#reset_button").on("click", function(){
    console.log("Reset");
    $("#botstatus").text("Bot reset.");
    run = true;
    if(first_run){
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

$("#select_bp").on("change", function(){
    switch($("#select_bp").val()){
        case 'one' : bp_used = 1; console.log ("Using 1 BP."); break;
        case 'two' : bp_used = 2; console.log ("Using 2 BP."); break;
        case 'three' : bp_used = 3; console.log ("Using 3 BP."); break;
        default: break;
    }
});

$("#select_rank").on("change", function(){
    switch($("#select_rank").val()){
        case 'str' : attack_str = true; console.log ("Attacking stronger."); break;
        case 'wkr' : attack_str = false; console.log ("Attacking weaker."); break;
        default: break;
    }
});