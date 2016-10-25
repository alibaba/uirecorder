(function(){
    // 全局事件
    var mapGlobalEvents = {};
    var eventPort = chrome.extension.connect();
    var GlobalEvents = {
        on: function(type, handler){
            var arrEvents = mapGlobalEvents[type] || [];
            arrEvents.push(handler);
            mapGlobalEvents[type] = arrEvents;
        },
        emit: function(type, data){
            eventPort.postMessage({
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
    eventPort.onMessage.addListener(function(msg) {
        GlobalEvents._emit(msg.type, msg.data);
    });

    // get event
    var appSource = null;
    var appTree = null;
    var appWidth = 0, appHeight = 0;
    var imgWidth = 0, imgHeight = 0;
    var scaleX = 1, scaleY =1;
    var mapNodeId = {};
    function saveCommand(cmd, data){
        var cmdData = {
            cmd: cmd,
            data: data
        };
        chrome.runtime.sendMessage({
            type: 'command',
            data: cmdData
        });
    }
    function scanAllNode(){
        mapNodeId = {};
        scanNode(appTree)
    }
    function scanNode(node){
        var id = node['resource-id'];
        if(id){
            mapNodeId[id] = mapNodeId[id] && mapNodeId[id] + 1 || 1;
        }
        node.class = node.class || ('XCUIElementType' + node.type);
        var bounds = node.bounds || '';
        var match = bounds.match(/^\[(\d+),(\d+)\]\[(\d+),(\d+)\]$/);
        if(match){
            node.startX = parseInt(match[1], 10);
            node.startY = parseInt(match[2], 10);
            node.endX = parseInt(match[3], 10);
            node.endY = parseInt(match[4], 10);
            node.boundSize = (node.endX - node.startX) * (node.endY - node.startY);
        }
        match = bounds.match(/\{(\d+),\s*(\d+)\},\s*\{(\d+),\s*(\d+)\}/);
        if(match){
            node.startX = parseInt(match[1], 10);
            node.startY = parseInt(match[2], 10);
            node.endX =  node.startX + parseInt(match[3], 10);
            node.endY = node.startY + parseInt(match[4], 10);
            node.boundSize = (node.endX - node.startX) * (node.endY - node.startY);
        }
        var childNodes = node.children || node.node;
        if(childNodes){
            node.children = childNodes;
            if(!Array.isArray(childNodes)){
                childNodes = [childNodes];
            }
            var childNode;
            for(var i=0;i<childNodes.length;i++){
                childNode = childNodes[i];
                childNode.parentNode = node;
                scanNode(childNode);
            }
        }
    }
    // get node info by x,y
    function getNodeInfo(x, y){
        var nodeInfo = {};
        var bestNodeInfo = {
            node: null,
            boundSize: 0
        };
        getBestNode(appTree, x, y, bestNodeInfo);
        var bestNode = bestNodeInfo.node;
        if(bestNode){
            if(bestNode.text){
                var text = bestNode.text;
                text = text.replace(/\s*\r?\n\s*/g,' ');
                text = text.replace(/^\s+|\s+$/g, '');
                var textLen = byteLen(text);
                text = textLen > 20 ? leftstr(text, 20) + '...' : text;
                nodeInfo.text = text;
            }
            nodeInfo.path = getNodeXPath(bestNode);
        }
        else{
            nodeInfo.x = x;
            nodeInfo.y = y;
        }
        return nodeInfo;
    }
    function getBestNode(node, x, y, bestNodeInfo){
        if(node.boundSize && x >= node.startX && x <= node.endX && y >= node.startY && y <= node.endY){
            var childNodes = node.children;
            if(childNodes){
                if(!Array.isArray(childNodes)){
                    childNodes = [childNodes];
                }
                for(var i=0;i<childNodes.length;i++){
                    getBestNode(childNodes[i], x, y, bestNodeInfo);
                }
            }
            else{
                if(bestNodeInfo.node === null || node.boundSize <= bestNodeInfo.boundSize){
                    bestNodeInfo.node = node;
                    bestNodeInfo.boundSize = node.boundSize;
                }
            }
        }
    }
    function getNodeXPath(node){
        var id, className;
        var XPath = '', index;
        while(node){
            id = node['resource-id'];
            className = node['class'];
            if(mapNodeId[id] === 1){
                XPath = '/*[@resource-id="'+id+'"]' + XPath;
                return '/'+XPath;
            }
            else{
                index = getNodeClassIndex(node)
                XPath = '/' + className + (index > 1 ? '['+index+']' : '') + XPath;
            }
            node = node.parentNode;
        }
        return '/'+XPath;
    }
    function getNodeClassIndex(node){
        var index = 0;
        var className = node.class;
        var parentNode = node.parentNode;
        if(className && parentNode && Array.isArray(parentNode.node) && parentNode.node.length > 1){
            var childNodes = parentNode.node, childNode;
            index = -1;
            for(var i=0;i<childNodes.length;i++){
                childNode = childNodes[i];
                if(childNode.class === className){
                    index ++;
                    if(childNode === node){
                        break;
                    }
                }
            }
        }
        return index + 1;
    }
    var screenshot = document.getElementById('screenshot');
    var keyinput = document.getElementById('keyinput');
    GlobalEvents.on('mobileAppInfo', function(appInfo){
        appSource = appInfo.source;
        appTree = appSource.tree || appSource.hierarchy.node;
        scanAllNode();
        screenshot.src = 'data:image/png;base64,'+appInfo.screenshot;
        screenshot.style = 'width: auto;height: 100%';
        appWidth = screenshot.naturalWidth;
        appHeight = screenshot.naturalHeight;
        imgWidth = screenshot.width;
        imgHeight = screenshot.height;
        scaleX = appWidth / imgWidth;
        scaleY = appHeight / imgHeight;
        if(appSource.tree){
            var rate = appWidth > 1000 ? 3 : 2;
            scaleX /= rate;
            scaleY /= rate;
        }
    });
    var downX = -9999, downY = -9999, downTime = 0;
    screenshot.addEventListener('click', function(event){
        var upX = event.offsetX, upY = event.offsetY;
        if(Math.abs(downX - upX) < 20 && Math.abs(downY - upY) < 20){
            var cmdData = getNodeInfo(Math.floor(upX * scaleX), Math.floor(upY * scaleY));
            saveCommand('click', cmdData);
            if(cmdData.path){
                keyinput.style.display = 'block';
                keyinput.focus();
            }
            else{
                keyinput.style.display = 'none';
            }
        }
        event.stopPropagation();
        event.preventDefault();
    });
    screenshot.addEventListener('mousedown', function(event){
        downX = event.offsetX;
        downY = event.offsetY;
        downTime = new Date().getTime();
        event.stopPropagation();
        event.preventDefault();
    });
    screenshot.addEventListener('mouseup', function(event){
        var upX = event.offsetX, upY = event.offsetY;
        if(Math.abs(downX - upX) >= 20 || Math.abs(downY - upY) >= 20){
            saveCommand('swipe', {
                startX: Math.floor(downX * scaleX),
                startY: Math.floor(downY * scaleY),
                endX: Math.floor(upX * scaleX),
                endY: Math.floor(upY * scaleY),
                duration: 20
            });
        }
        event.stopPropagation();
        event.preventDefault();
    });
    keyinput.addEventListener('keydown', function(event){
        if(event.keyCode === 13){
            var self = this;
            saveCommand('val', {
                keys: this.value
            });
            self.value = '';
            self.style.display = 'none';
        }
    });

    // 计算字节长度,中文两个字节
    function byteLen(text){
        var count = 0;
        for(var i=0,len=text.length;i<len;i++){
            char = text.charCodeAt(i);
            count += char > 255 ? 2 : 1;
        }
        return count;
    }

    // 从左边读取限制长度的字符串
    function leftstr(text, limit){
        var substr = '';
        var count = 0;
        var char;
        for(var i=0,len=text.length;i<len;i++){
            char = text.charCodeAt(i);
            substr += text.charAt(i);
            count += char > 255 ? 2 : 1;
            if(count >= limit){
                return substr;
            }
        }
        return substr;
    }

})();

