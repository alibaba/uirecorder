var ENABLE_ICON1 = 'img/icon.png';
var ENABLE_ICON2 = 'img/icon-record.png';
var DISABLE_ICON = 'img/icon-disable.png';

var isWorking = true;
var workIcon = 1;
var workIconTimer = null;
var recordConfig = null;
var isModuleLoading = false;

// i18n
var i18n = {};
var __ = function(str){
    var args = arguments;
    str = i18n[str] || str;
    var count = 0;
    str = str.replace(/%s/g, function(){
        count ++;
        return args[count] || '';
    });
    return str;
};

// Global events port
var mapGlobalEvents = {};
var GlobalEvents = {
    on: function(type, handler){
        var arrEvents = mapGlobalEvents[type] || [];
        arrEvents.push(handler);
        mapGlobalEvents[type] = arrEvents;
    },
    emit: function(type, data){
        sendGlobalEvents({
            type: type,
            data: data
        });
    },
    _emit: function(type, data){
        var arrEvents = mapGlobalEvents[type] || [];
        arrEvents.forEach(function(handler){
            handler(data);
        });
    }
};
var mapPorts = {};
var maxPortId = 0;
chrome.extension.onConnect.addListener(function(port) {
    var portId = maxPortId++;
    mapPorts[portId] = port;
    var tabId = port.sender.tab.id;
    port.onMessage.addListener(function(msg){
        sendGlobalEvents(msg, tabId);
    });
    port.onDisconnect.addListener(function(port){
        delete mapPorts[portId];
    });
});
function sendGlobalEvents(msg, senderTabId){
    GlobalEvents._emit(msg.type, msg.data);
    var port, tabId;
    for(var portId in mapPorts){
        port = mapPorts[portId];
        tabId = port.sender.tab.id;
        if(senderTabId !== undefined && senderTabId !== tabId){
            port = null;
        }
        port && port.postMessage(msg);
    }
}

// websocket to ui recorder server
var wsSocket;
function connectServer(port){
    if(!wsSocket){
        wsSocket = new WebSocket('ws://127.0.0.1:'+port, "protocolOne");
        wsSocket.onopen = function (event) {
            console.log('ws connected!');
        }
        wsSocket.onmessage = function (message) {
            message = message.data;
            try{
                message = JSON.parse(message);
            }
            catch(e){}
            var type = message.type;
            var data = message.data;
            switch(type){
                case 'config':
                    recordConfig = data;
                    i18n = recordConfig.i18n;
                    GlobalEvents.emit('updateConfig', recordConfig);
                    break;
                case 'checkResult':
                    chrome.notifications.create({
                        type: 'basic',
                        iconUrl: 'img/'+(data.success?'success':'fail')+'.png',
                        title: data.success?__('exec_succeed'):__('exec_failed'),
                        message: data.title
                    });
                    GlobalEvents.emit('checkResult', data);
                    break;
                case 'moduleStart':
                    isModuleLoading = true;
                    recordConfig.isModuleLoading = true;
                    chrome.notifications.create({
                        type: 'basic',
                        iconUrl: 'img/warn.png',
                        title: __('module_start_title'),
                        message: __('module_start_message', data.file)
                    });
                    GlobalEvents.emit('moduleStart');
                    break;
                case 'moduleEnd':
                    isModuleLoading = false;
                    recordConfig.isModuleLoading = false;
                    chrome.notifications.create({
                        type: 'basic',
                        iconUrl: 'img/'+(data.success?'success':'fail')+'.png',
                        title: __('module_end_title'),
                        message: __('module_end_message', data.success?__('succeed'):__('failed'), data.file)
                    });
                    GlobalEvents.emit('moduleEnd');
                    break;
                case 'mobileAppInfo':
                    GlobalEvents.emit('mobileAppInfo', data);
                    break;

            }
        }
        wsSocket.onclose = function(){
            wsSocket = null;
            console.log('ws closed!');
        }
    }
}

GlobalEvents.on('updatePathAttr', function(newAttr){
    var arrPathAttrs = recordConfig.pathAttrs;
    arrPathAttrs.forEach(function(attr){
        if(attr.name === newAttr.name){
            attr.on = newAttr.on;
        }
    });
});

function sendWsMessage(type, data){
    if(wsSocket){
        var message = {
            type: type,
            data: data
        };
        wsSocket.send(JSON.stringify(message));
    }
}

// set recorder work status
function setRecorderWork(enable){
    isWorking = enable;
    if(isWorking){
        chrome.browserAction.setTitle({title: __('icon_record_tip')});
        chrome.browserAction.setIcon({path: workIcon===1?ENABLE_ICON1:ENABLE_ICON2});
        workIcon *= -1;
        workIconTimer = setTimeout(function(){
            setRecorderWork(true);
        }, 1000);
    }
    else{
        clearTimeout(workIconTimer);
        chrome.browserAction.setTitle({title: __('icon_end_tip')});
        chrome.browserAction.setIcon({path: DISABLE_ICON});
    }
}

var arrTasks = [];
var lastWindow = -1;
var allKeyMap = {};
var allMouseMap = {};

// save recoreded command
function saveCommand(windowId, frame, cmd, data){
    if(isModuleLoading){
        return;
    }
    var cmdInfo = {
        window: windowId,
        frame: frame,
        cmd: cmd,
        data: data,
        fix: false
    };

    checkLostKey(windowId);

    switch(cmd){
        case 'keyDown':
            allKeyMap[data.character] = cmdInfo;
            break;
        case 'keyUp':
            delete allKeyMap[data.character];
            break;
        case 'mouseDown':
            allMouseMap[data.button] = cmdInfo;
            break;
        case 'mouseUp':
            delete allMouseMap[data.button];
            break;
    }

    execNextCommand(cmdInfo);
}

// 补足丢失的事件
function checkLostKey(windowId){
    if(windowId !== lastWindow){
        if(lastWindow !== -1){
            var cmdInfo;
            for(var key in allKeyMap){
                cmdInfo = allKeyMap[key];
                execNextCommand({
                    window: cmdInfo.window,
                    frame: cmdInfo.frame,
                    cmd: 'keyUp',
                    data: cmdInfo.data,
                    fix: true
                });
            }
            allKeyMap = {};
            for(var button in allMouseMap){
                cmdInfo = allMouseMap[button];
                execNextCommand({
                    window: cmdInfo.window,
                    frame: cmdInfo.frame,
                    cmd: 'mouseUp',
                    data: cmdInfo.data,
                    fix: true
                });
            }
            allMouseMap = {};
        }
        lastWindow = windowId;
    }
}

var isRunning = false;
function execNextCommand(newCmdInfo){
    if(newCmdInfo){
        arrTasks.push(newCmdInfo);
    }
    if(arrTasks.length > 0 && isRunning === false){
        var cmdInfo = arrTasks.shift();
        console.log('cmd: { window: '+cmdInfo.window+', frame: '+cmdInfo.frame+', cmd: '+cmdInfo.cmd+ ', data:', JSON.stringify(cmdInfo.data) + ', fix: '+cmdInfo.fix+' }');
        isRunning = true;
        sendWsMessage('saveCmd', cmdInfo);
        setTimeout(function(){
            isRunning = false;
            execNextCommand();
        }, 200);
    }
}

// manage window id
var arrWindows = [];
function getWindowId(tabId){
    for(var i=0,len=arrWindows.length;i<len;i++){
        if(arrWindows[i] === tabId){
            return i;
        }
    }
    return -1;
}
function addWindowId(tabId){
    arrWindows.push(tabId);
    var windowId = arrWindows.length -1;
    checkLostKey(windowId);
    console.log('newWindow { id: '+ windowId + ' }');
    return windowId;
}
function delWindowId(tabId){
    var windowId = getWindowId(tabId);
    if(windowId !== -1){
        arrWindows.splice(windowId, 1);
        console.log('closeWindow: { id: '+ windowId + ' }');
    }
}

// catch incognito window
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (!tab.incognito && isWorking && /^chrome:\/\//.test(tab.url) === false) {
        var windowId = getWindowId(tabId);
        if(windowId === -1){
            windowId = addWindowId(tabId);
        }
    }
});

// catch url
chrome.webNavigation.onCommitted.addListener(function(navInfo){
    if(isWorking){
        var tabId = navInfo.tabId;
        var type = navInfo.transitionType;
        var url = navInfo.url;
        var windowId = getWindowId(tabId);
        if(windowId !== -1 && /^(typed|reload|auto_bookmark)$/.test(type) && /^https?:\/\//.test(url)){
            checkLostKey(-1);
            saveCommand(windowId, null, 'url', url);
        }
    }
});

// catch window close
chrome.tabs.onRemoved.addListener(function(tabId, removeInfo){
    var windowId = getWindowId(tabId);
    if(windowId !== -1){
        delWindowId(tabId);
        if(windowId !== 0 ){
            saveCommand(windowId, null, 'closeWindow');
        }
    }
    if(arrWindows.length === 0){
        setRecorderWork(false);
    }
});

// catch current window events
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if(isWorking && sender && sender.tab){
        var tabId = sender.tab.id;
        var windowId = getWindowId(tabId);
        if(windowId !== -1){
            var type = request.type;
            var data = request.data;
            switch(type){
                case 'initBackService':
                    connectServer(data.port);
                    break;
                case 'save':
                    endRecorder(true);
                    break;
                case 'end':
                    endRecorder();
                    break;
                case 'getConfig':
                    sendResponse(recordConfig);
                    break;
                case 'command':
                    saveCommand(windowId, data.frame, data.cmd, data.data);
                    break;

            }
            return true;
        }
    }
});

// on action clicked
chrome.browserAction.onClicked.addListener(function(tab){
    if(isWorking){
        endRecorder();
    }
    else{
        alert(__('icon_end_msg'));
    }
});

// on windows removed
chrome.windows.onRemoved.addListener(function(){
    endRecorder();
})

// end recorder
function endRecorder(bSaveFile){
    setRecorderWork(false);
    sendWsMessage(bSaveFile?'save':'end');
}

setRecorderWork(true);

