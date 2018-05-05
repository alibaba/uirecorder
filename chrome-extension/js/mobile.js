(function(){
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

    var mobilePlatform = 'Android';
    var testVars = {};
    var specLists = [];

    var mapParams = {};
    location.search.replace(/([^\?=]+)=([^&]*)/ ,function(all, key, value){
        mapParams[key] = value;
    });

    // load config
    function updateConfig(config) {
        if(config.testVars){
            testVars = config.testVars;
        }
        mobilePlatform = config.mobilePlatform;
        i18n = config.i18n;
        specLists = config.specLists;
        initRecorder();
    }
    GlobalEvents.on('updateConfig', updateConfig);
    chrome.runtime.sendMessage({
        type: 'initBackService',
        data: {
            port: mapParams.port
        }
    });

    var isLoading = false;
    var isSelectorMode = false;
    var isShowDialog = false;
    var baseUrl = chrome.extension.getURL("/");
    var divToolsPannel = document.getElementById('toolPannel');
    var divDomDialog = document.getElementById('uirecorder-dialog');
    var divDomDialogMask = document.getElementById('dialogMask');
    var domDialogTitle = document.getElementById('uirecorder-dialog-title');
    var domDialogContent = document.getElementById('uirecorder-dialog-content');
    var divDialogBottom = document.getElementById('dialogBottom');

    function initRecorder(){
        // init tool pannel
        var arrToolsHtml = [
            '<span class="uirecorder-button"><a name="text"><img src="'+baseUrl+'img/text.png" alt="">'+__('button_text_text')+'</a></span>',
            (mobilePlatform === 'Android'?'<span class="uirecorder-button"><a name="back"><img src="'+baseUrl+'img/back.png" alt="">'+__('button_back_text')+'</a></span>':''),
            '<span class="uirecorder-button"><a name="alert"><img src="'+baseUrl+'img/alert.png" alt="">'+__('button_alert_text')+'</a></span>',
            '<span class="uirecorder-button"><a name="expect"><img src="'+baseUrl+'img/expect.png" alt="">'+__('button_expect_text')+'</a></span>',
            '<span class="uirecorder-button"><a name="sleep"><img src="'+baseUrl+'img/sleep.png" alt="">'+__('button_sleep_text')+'</a></span>',
            '<span class="uirecorder-button"><a name="jump"><img src="'+baseUrl+'img/jump.png" alt="">'+__('button_jump_text')+'</a></span>',
            '<span class="uirecorder-button"><a name="end"><img src="'+baseUrl+'img/end.png" alt="">'+__('button_end_text')+'</a></span>'
        ];
        divToolsPannel.innerHTML = arrToolsHtml.join('');
        divDialogBottom.innerHTML = '<span class="uirecorder-button"><a name="uirecorder-ok"><img src="'+baseUrl+'img/ok.png" alt="">'+__('dialog_ok')+'</a></span><span class="uirecorder-button"><a name="uirecorder-cancel"><img src="'+baseUrl+'img/cancel.png" alt="">'+__('dialog_cancel')+'</a></span>';
    }

    divToolsPannel.addEventListener('click', function(event){
        var target = event.target;
        if(target.tagName === 'IMG'){
            target = target.parentNode;
        }
        isSelectorMode = false;
        var name = target.name;
        switch(name){
            case 'text':
                showTextDailog();
                break;
            case 'back':
                saveCommand('back');
                break;
            case 'alert':
                showAlertDailog();
                break;
            case 'expect':
                isSelectorMode = true;
                break;
            case 'sleep':
                showSleepDailog();
                break;
            case 'jump':
                showJumpDailog();
                break;
            case 'end':
                chrome.runtime.sendMessage({
                    type: 'save'
                });
                break;
        }
    });

    // 对话框
    var okCallback = null;
    var cancelCallback = null;
    divDomDialog.addEventListener('click', function(event){
        event.stopPropagation();
        event.preventDefault();
        var target = event.target;
        if(target.tagName === 'IMG'){
            target = target.parentNode;
        }
        var name = target.name;
        switch(name){
            case 'uirecorder-ok':
                okCallback();
                break;
            case 'uirecorder-cancel':
                hideDialog();
                cancelCallback && cancelCallback();
                break;
        }
    });
    divDomDialog.addEventListener('keydown', function(event){
        var keyCode = event.keyCode;
        if(keyCode === 13 && (event.ctrlKey || event.metaKey)){
            okCallback();
        }
    });
    document.addEventListener('keyup', function(event){
        var keyCode = event.keyCode;
        switch(keyCode){
            case 27:
                if(isShowDialog){
                    hideDialog();
                    cancelCallback && cancelCallback();
                }
                isSelectorMode = false;
                break;
        }
    });
    // 显示对话框
    function showDialog(title, content, events){
        domDialogTitle.innerHTML = title;
        domDialogContent.innerHTML = content;
        okCallback = events.onOk;
        cancelCallback = events.onCancel;
        divDomDialog.style.display = 'block';
        divDomDialogMask.style.display = 'block';
        isShowDialog = true;
        var onInit = events.onInit;
        if(onInit){
            onInit();
        }
        setDialogCenter();
    }
    function setDialogCenter(){
        divDomDialog.style.marginTop = '-'+(divDomDialog.offsetHeight/2)+'px';
        divDomDialog.style.marginLeft = '-'+(divDomDialog.offsetWidth/2)+'px';
    }
    // 隐藏对话框
    function hideDialog(){
        domDialogTitle.innerHTML = '';
        domDialogContent.innerHTML = '';
        divDomDialog.style.display = 'none';
        divDomDialogMask.style.display = 'none';
        isShowDialog = false;
        isSelectorMode = false;
    }

    // 延迟对话框
    function showSleepDailog(){
        var strHtml = '<ul><li><label>'+__('dialog_sleep_time')+'</label><input type="text" value="1000" placeholder="'+__('dialog_sleep_time_tip')+'" id="uirecorder-sleeptime"> ms</li></ul>';
        var domSleepTime;
        showDialog(__('dialog_sleep_title'), strHtml, {
            onInit: function(){
               domSleepTime = document.getElementById('uirecorder-sleeptime');
               domSleepTime.select();
               domSleepTime.focus();
            },
            onOk: function(){
                var time = domSleepTime.value;
                if(/\d+/.test(time)){
                    saveCommand('sleep', time);
                    hideDialog();
                }
                else{
                    domSleepTime.focus();
                    alert(__('dialog_sleep_time_tip'));
                }
            }
        });
    }

    // 跳转对话框
    function showJumpDailog(){
        var arrHtmls = ['<ul><li><label>'+__('dialog_jump_target')+'</label><input type="text" value="" id="uirecorder-target" list="uirecorder-commons"><datalist id="uirecorder-commons"><datalist id="uirecorder-commons">'];
        for(var i in specLists){
            arrHtmls.push('<option>'+specLists[i]+'</option>');
        }
        arrHtmls.push('</datalist></li></ul>');
        var domTarget;
        showDialog(__('dialog_jump_title'), arrHtmls.join(''), {
            onInit: function(){
               domTarget = document.getElementById('uirecorder-target');
               domTarget.select();
               domTarget.focus();
            },
            onOk: function(){
                var target = domTarget.value;
                if(target){
                    saveCommand('module', target);
                    hideDialog();
                }
                else{
                    domTarget.focus();
                }
            }
        });
    }

    // 文字对话框
    function showTextDailog(text){
        var strHtml = '<ul><li><label>'+__('dialog_text_content')+'</label><input type="text" value="" id="textContent"></li></ul>';
        var domTextContent;
        showDialog(__('dialog_text_title'), strHtml, {
            onInit: function(){
               domTextContent = document.getElementById('textContent');
               domTextContent.select();
               domTextContent.focus();
               domTextContent.value = text || '';
            },
            onOk: function(){
                var text = domTextContent.value;
                if(text){
                    try{
                        eval('\`'+text+'\`');
                    }
                    catch(e){
                        return alert(e);
                    }
                    saveCommand('sendKeys', text+(mobilePlatform === 'iOS' ? '\n' : '{ESCAPE}'));
                    hideDialog();
                }
                else{
                    domTextContent.focus();
                    alert(__('dialog_text_content_tip'));
                }
            }
        });
    }

    // 文字对话框
    function showAlertDailog(){
        var strHtml = '<ul><li><label>'+__('dialog_alert_option')+'</label><select id="alertOption"><option value="accept">'+__('dialog_alert_option_accpet')+'</option><option value="dismiss">'+__('dialog_alert_option_dismiss')+'</option></select></li></ul>';
        var domAlertOption;
        showDialog(__('dialog_alert_title'), strHtml, {
            onInit: function(){
                domAlertOption = document.getElementById('alertOption');
            },
            onOk: function(){
                var alertOption = domAlertOption.value;
                saveCommand(alertOption+'Alert');
                hideDialog();
            }
        });
    }

    // 断言对话框
    function showExpectDailog(path){
        var arrHtmls = [
            '<ul>',
            '<li><label>'+__('dialog_expect_sleep')+'</label><input id="expectSleep" type="text" /> ms</li>',
            '<li><label>'+__('dialog_expect_type')+'</label><select id="expectType" value=""><option>text</option><option>count</option><option>imgdiff</option></select></li>',
            '<li><label>'+__('dialog_expect_path')+'</label><input id="expectPath" type="text" /></li>',
            '<li><label>'+__('dialog_expect_compare')+'</label><select id="expectCompare"><option>equal</option><option>notEqual</option><option>contain</option><option>notContain</option><option>above</option><option>below</option><option>match</option><option>notMatch</option></select></li>',
            '<li><label>'+__('dialog_expect_to')+'</label><textarea id="expectTo"></textarea></li>',
            '</ul>'
        ];
        var domExpectSleep, domExpectType, domExpectPath, domExpectCompare, domExpectTo;
        showDialog(__('dialog_expect_title'), arrHtmls.join(''), {
            onInit: function(){
                domExpectSleep = document.getElementById('expectSleep');
                domExpectType = document.getElementById('expectType');
                domExpectPath = document.getElementById('expectPath');
                domExpectCompare = document.getElementById('expectCompare');
                domExpectTo = document.getElementById('expectTo');

                domExpectSleep.value = '300';
                domExpectPath.value = path;
                domExpectTo.focus();
                domExpectType.onchange = function(){
                    var type = domExpectType.value;
                    switch(type){
                        case 'imgdiff':
                            domExpectCompare.value = 'below';
                            domExpectTo.value = 5;
                            break;
                    }
                };
            },
            onOk: function(){
                var sleep = domExpectSleep.value;
                var type = domExpectType.value;
                var path = domExpectPath.value;
                var compare = domExpectCompare.value;
                var to = domExpectTo.value;
                try{
                    switch(compare){
                        case 'equal':
                        case 'notEqual':
                            /^(true|false)$/.test(to)?eval(to):eval('\`'+to+'\`');
                            break;
                        case 'match':
                        case 'notMatch':
                            eval(to);
                            break;
                        default:
                            eval('\`'+to+'\`');
                            break;
                    }
                }
                catch(e){
                    return alert(e);
                }
                saveCommand('expect', {
                    sleep: sleep,
                    type: type,
                    path: path,
                    compare: compare,
                    to: to
                });
                hideDialog();
            }
        });
    }

    // get event
    var appSource = null;
    var appTree = null;
    var appWidth = 0, appHeight = 0;
    var imgWidth = 0, imgHeight = 0;
    var checkResult = true;
    var scaleX = 1, scaleY =1;
    var mapNodeValueCount = {};
    var arrKeyAttrs = ['resource-id', 'name', 'text'];
    function saveCommand(cmd, data){
        var cmdData = {
            cmd: cmd,
            data: data
        };
        checkResult = null;
        setTimeout(function(){
            if(checkResult === null){
                showLoading();
            }
        }, 500);
        hideLine();
        chrome.runtime.sendMessage({
            type: 'command',
            data: cmdData
        });
    }
    function scanAllNode(){
        mapNodeValueCount = {};
        scanNode(appTree)
    }
    function scanNode(node){
        arrKeyAttrs.forEach(function(name){
            var value = node[name];
            if(value){
                var mapCount = mapNodeValueCount[name] || {};
                mapCount[value] = mapCount[value] && mapCount[value] + 1 || 1;
                mapNodeValueCount[name] = mapCount;
            }
        })
        node.class = node.class || ('XCUIElementType' + node.type);
        var bounds = node.bounds || '';
        if(bounds){
            var match = bounds.match(/^\[([\d\.]+),([\d\.]+)\]\[([\d\.]+),([\d\.]+)\]$/);
            if(match){
                node.startX = parseInt(match[1], 10);
                node.startY = parseInt(match[2], 10);
                node.endX = parseInt(match[3], 10);
                node.endY = parseInt(match[4], 10);

            }
            match = bounds.match(/\{([\d\.]+),\s*([\d\.]+)\},\s*\{([\d\.]+),\s*([\d\.]+)\}/);
            if(match){
                node.startX = parseInt(match[1], 10);
                node.startY = parseInt(match[2], 10);
                node.endX =  node.startX + parseInt(match[3], 10);
                node.endY = node.startY + parseInt(match[4], 10);
            }
            node.boundSize = (node.endX - node.startX) * (node.endY - node.startY);
        }
        else if(node.rect){
            var rect = node.rect;
            node.startX = rect.x;
            node.startY = rect.y;
            node.endX =  rect.x + rect.width;
            node.endY = rect.y + rect.height;
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
            var text = bestNode.text || bestNode.label;
            if(text){
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
        if(node.boundSize && x >= node.startX && x <= node.endX && y >= node.startY && y <= node.endY || node.boundSize === undefined){
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
                if(bestNodeInfo.node === null || node.boundSize < bestNodeInfo.boundSize){
                    bestNodeInfo.node = node;
                    bestNodeInfo.boundSize = node.boundSize;
                }
            }
        }
    }
    function getNodeXPath(node){
        var XPath = '', index;
        while(node){
            var attrName, attrValue;
            for(var i=0;i<arrKeyAttrs.length;i++){
                attrName = arrKeyAttrs[i];
                attrValue = node[attrName];
                if(attrValue && mapNodeValueCount[attrName][attrValue] === 1){
                    XPath = '/*[@'+attrName+'="'+attrValue+'"]' + XPath;
                    return '/'+XPath;
                }
            }
            index = getNodeClassIndex(node)
            XPath = '/' + node['class'] + (index > 1 ? '['+index+']' : '') + XPath;
            node = node.parentNode;
        }
        return '/'+XPath;
    }
    function getNodeClassIndex(node){
        var index = 0;
        var className = node.class;
        var parentNode = node.parentNode;
        if(className && parentNode && Array.isArray(parentNode.children) && parentNode.children.length > 1){
            var childNodes = parentNode.children, childNode;
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
    var loadingContainer = document.getElementById('loadingContainer');
    var screenshot = document.getElementById('screenshot');
    var topLine = document.getElementById('topLine');
    var bottomLine = document.getElementById('bottomLine');
    var leftLine = document.getElementById('leftLine');
    var rightLine = document.getElementById('rightLine');
    function showLoading(){
        loadingContainer.style.display = 'block';
        isLoading = true;
    }
    function hideLoading(){
        loadingContainer.style.display = 'none';
        isLoading = false;
    }
    function showLine(left, top, width, height){
        topLine.style.left = left+'px';
        topLine.style.top = top+'px';
        topLine.style.width = width+'px';
        topLine.style.background = isSelectorMode ? 'green' : 'red';

        bottomLine.style.left = left+'px';
        bottomLine.style.top = top+height+'px';
        bottomLine.style.width = width+'px';
        bottomLine.style.background = isSelectorMode ? 'green' : 'red';

        leftLine.style.top = top+'px';
        leftLine.style.left = left+'px';
        leftLine.style.height = height+'px';
        leftLine.style.background = isSelectorMode ? 'green' : 'red';

        rightLine.style.top = top+'px';
        rightLine.style.left = left+width+'px';
        rightLine.style.height = height+'px';
        rightLine.style.background = isSelectorMode ? 'green' : 'red';
    }
    function hideLine(){
        topLine.style.left = '-9999px';
        bottomLine.style.left = '-9999px';
        leftLine.style.left = '-9999px';
        rightLine.style.left = '-9999px';
    }
    GlobalEvents.on('mobileAppInfo', function(appInfo){
        appSource = appInfo.source;
        appTree = appSource.hierarchy || appSource.tree || appSource;
        scanAllNode();
        screenshot.src = 'data:image/png;base64,'+appInfo.screenshot;
        appWidth = screenshot.naturalWidth;
        appHeight = screenshot.naturalHeight;
        imgWidth = screenshot.width;
        imgHeight = screenshot.height;
        divToolsPannel.style.left = screenshot.offsetLeft + imgWidth + 20 + 'px';
        divToolsPannel.style.display = 'block';
        scaleX = appWidth / imgWidth;
        scaleY = appHeight / imgHeight;
        if(mobilePlatform === 'iOS'){
            var rate = appWidth > 1000 ? 3 : 2;
            scaleX /= rate;
            scaleY /= rate;
        }
        checkResult !== null && hideLoading();
    });
    GlobalEvents.on('checkResult', function(data){
        checkResult = data.success || false;
    });
    GlobalEvents.on('moduleEnd', function(){
        checkResult = true;
    });
    var downX = -9999, downY = -9999, downTime = 0;
    screenshot.addEventListener('click', function(event){
        var upX = event.offsetX, upY = event.offsetY;
        var clickDuration = new Date().getTime() - downTime;
        if(Math.abs(downX - upX) < 20 && Math.abs(downY - upY) < 20){
            var cmdData = getNodeInfo(Math.floor(upX * scaleX), Math.floor(upY * scaleY));
            if(isSelectorMode){
                if(cmdData.path){
                    showExpectDailog(cmdData.path);
                }
            }
            else{
                var pressTime = new Date().getTime() - downTime;
                cmdData.duration = (pressTime / 1000).toFixed(2);
                saveCommand(clickDuration>500?'press':'click', cmdData);
            }
            downTime = 0;
        }
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
        if(downX >=0 && downY >= 0 &&
            upX >= 0 && upY >= 0 &&
            (Math.abs(downX - upX) >= 20 || Math.abs(downY - upY) >= 20)){
                var dragTime = new Date().getTime() - downTime;
                saveCommand('drag', {
                    fromX: Math.floor(downX * scaleX),
                    fromY: Math.floor(downY * scaleY),
                    toX: Math.floor(upX * scaleX),
                    toY: Math.floor(upY * scaleY),
                    duration: (dragTime / 1000).toFixed(2)
                });
                downTime = 0;
        }
        event.stopPropagation();
        event.preventDefault();
    });
    document.addEventListener('mouseup', function(event){
        if(downTime !== 0){
            var upX = event.clientX < screenshot.offsetLeft ? 0 : screenshot.width -1;
            var upY = event.clientY;
            var dragTime = new Date().getTime() - downTime;
            saveCommand('drag', {
                fromX: Math.floor(downX * scaleX),
                fromY: Math.floor(downY * scaleY),
                toX: Math.floor(upX * scaleX),
                toY: Math.floor(upY * scaleY),
                duration: (dragTime / 1000).toFixed(2)
            });
            downTime = 0;
        }
    });
    screenshot.addEventListener('mousemove', function(event){
        var bestNodeInfo = {
            node: null,
            boundSize: 0
        };
        var x = Math.floor(event.offsetX * scaleX);
        var y = Math.floor(event.offsetY * scaleY);
        getBestNode(appTree, x, y, bestNodeInfo);
        var node = bestNodeInfo.node;
        if(node){
            var offsetLeft = screenshot.offsetLeft;
            var offsetTop = screenshot.offsetTop;

            var left = node.startX / scaleX;
            var top = node.startY / scaleY;
            var width = node.endX / scaleX - left;
            var height = node.endY / scaleY - top;

            showLine(left + offsetLeft, top + offsetTop, width, height);
        }
        else{
            hideLine();
        }
    });
    document.addEventListener('keypress', function(event){
        if(!isLoading && !isShowDialog){
            showTextDailog(event.key);
            event.stopPropagation();
            event.preventDefault();
        }
    });

    document.addEventListener('paste', function(event){
        if(!isLoading && !isShowDialog){
            var text = event.clipboardData.getData('text');
            if(text){
                saveCommand('sendKeys', text+(mobilePlatform === 'iOS' ? '\n' : '{ESCAPE}'));
            }
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

