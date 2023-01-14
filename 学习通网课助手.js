// ==UserScript==
// @name         学习通网课助手
// @namespace    https://github.com/cubxx
// @version      0.1
// @description  lazy dog
// @author       Cubxx
// @match      https://*.chaoxing.com/*
// @icon         https://mooc.chaoxing.com/favicon.ico
// @grant        none
// ==/UserScript==

(function () {
    //自动下一节
    $tm.urlFunc(/mycourse\/studentstudy/, () => {
        $tm.onloadFuncs.push(() => {
            let lis = document.getElementsByClassName('posCatalog_select'); //右侧菜单所有元素
            let c = lis.length;
            //选择任务点
            for (let i = 0; i < lis.length; i++) {
                if (lis[i].childElementCount == 3 && lis[i].children[1].value == '2') { c = i; break; } //获取未完成任务点为2
                //if(lis[i].className.includes('posCatalog_active')){ c=i; break;} //获取当前选中
            }
            lis[c].children[0].click();
            //自动向下
            let stop = setInterval(() => {
                let duration = parseInt(sessionStorage.getItem('dur')),
                    time = parseInt(sessionStorage.getItem('time'));
                if ((duration && time >= duration) || lis[c].childElementCount != 3) {
                    //if(c<lis.length && lis[c].childElementCount!=3){
                    c++;
                    (lis[c].childElementCount == 1) && c++;
                    lis[c].children[0].click();
                    sessionStorage.setItem('time', 0);
                }
                lis[c].innerText.includes('直播') && clearInterval(stop);
            }, 5 * 1000); //每5s检查一次
        });
    });

    //控制播放
    $tm.urlFunc(/ananas\/modules\/video\/index.html\?v=/, () => {
        // window.onerror = () => { return true } //隐藏报错
        let v;
        let duration = 0, n = 0;
        let stop = setInterval(() => {
            v = document.getElementById('video_html5_api');
            //播放
            v.play();
            //拉取进度条
            duration = v.duration;
            sessionStorage.setItem('dur', v.duration);
            //v.currentTime = duration;
            //静音
            v.volume = 0;
            //解锁进度条
            let seekbar = videojs.getComponent("SeekBar");
            seekbar.prototype.handleMouseDown = function (c) { seekbar.prototype.__proto__.handleMouseDown.call(this, c); }
            seekbar.prototype.handleMouseMove = function (c) { seekbar.prototype.__proto__.handleMouseMove.call(this, c); }
            seekbar.prototype.handleMouseUp = function (c) { seekbar.prototype.__proto__.handleMouseUp.call(this, c); }
            videojs("video").off("seeked");
            //解锁鼠标
            Ext.apply = function () { };
            //倍数
            videojs("video").playbackRate = function () { return v.playbackRate = 2 };
            if (v && seekbar && !isNaN(duration)) {
                clearInterval(stop);
                // window.v = v;
            }
        }, 2000);
        //倍数控制
        setInterval(() => {
            sessionStorage.setItem('time', v.currentTime);
            /* if(duration&&duration-10<=v.currentTime){
                v.playbackRate=1;
            }else{ v.playbackRate=4;} */
        }, 5 * 1000)
    });

    //模拟阅读
    $tm.urlFunc(/ztnodedetailcontroller/, () => {
        let li = document.getElementsByClassName('wh wh'), n = 0;
        setInterval(() => {
            n++;
            if (0 == n % 60) { //每60s滚动一次
                let a = li[parseInt(Math.random() * li.length)];
                if (a.tagName == 'A' && Math.random() < 0.1) a.click();
                window.scrollTo(0, Math.random() * 10000);
            }
        }, 1000); //*/
        let data = $('script')[39].innerHTML.match(/data = {([\s\S]*?)height/)[1].replace(/[\t\n\s]*/g, '').split(',').slice(0, 2).map(e => { return e.split(':')[1].slice(1, -1) })
        setInterval(ctid => {
            ctid = data[1];
            setSetting({
                resourceID: data[0] + "," + ctid,
                resourceType: "special",
                from: 0,
                passportUID: getCookie("_uid"),
                t: window["t-" + ctid],
                token: window["token-" + ctid],
            })
        }, 10 * 1000);
    });

    //直播回放 //查看进度 https://mooc1.chaoxing.com/ananas/live/liveinfo
    $tm.urlFunc(/zhibo.chaoxing.com/, () => {
        alert('脚本加载完成');
        //解除拖拽
        player.currentTime(myVid.duration);
        //记录时间
        let n = 0;
        setInterval(() => {
            $.ajax({
                url: "https://zhibo.chaoxing.com/saveTimePc",
                type: "get",
                data: {
                    "streamName": streamName,
                    "vdoid": vdoid,
                    "userId": userId,
                    "isStart": 1,
                    "t": new Date().getTime(),
                    "courseId": courseId
                },
                success: function () { }
            });
            n++;
            if (n % 2 == 0) {
                console.clear();
                console.log('已观看 ' + n / 2 + ' 分钟');
            }
        }, 30 * 1e3);
    });
})();
