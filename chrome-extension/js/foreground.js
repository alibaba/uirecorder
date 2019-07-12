(function(){
    var isIframe = self !== top;
    var isRecording = false;
    var isStopEvent = false;
    var isBodyReady = false;
    var isOnload = false;
    var isModuleLoading = false;

    // dom selector
    var pkgVersion = '';
    var divDomSelector = null;
    var lastSelectDom = null;
    var domSelectorCallback = null;
    var spanShowDomPath = null;
    var divAttrsContainer = null;
    var domGetValueCallback = null;
    var lastAlertExpect = null;
    var lastWorkMode = 'record';
    var hoverMode = false;

    // 全局配置
    var configLoaded = false;
    var testVars = {};
    var arrPathAttrs = [];
    var mapPathAttrs = {};
    var strAttrValueBlack = '';
    var reTextValueBlack = /[×\s]/;
    var reAttrValueBlack = /^$/;
    var reClassValueBlack = /^$/;
    var hideBeforeExpect = '';
    var specLists = [];

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

    // load config
    function updateConfig(config){
        pkgVersion = config.version;
        if(config.testVars){
            testVars = config.testVars;
        }
        var pathAttrs = config.pathAttrs;
        if(pathAttrs){
            arrPathAttrs = pathAttrs;
        }
        arrPathAttrs.map(function(attr){
            mapPathAttrs[attr.name] = attr.on;
        });
        strAttrValueBlack = config.attrValueBlack;
        if(strAttrValueBlack){
            try{
                    reAttrValueBlack = eval(strAttrValueBlack);
            }
            catch(e){
                reAttrValueBlack = /^$/;
            }
        }
        var strClassValueBlack = config.classValueBlack;
        if(strClassValueBlack){
            try{
                reClassValueBlack = eval(strClassValueBlack);
            }
            catch(e){
                reClassValueBlack = /^$/;
            }
        }
        hideBeforeExpect = config.hideBeforeExpect || '';
        specLists = config.specLists;
        i18n = config.i18n;
        isModuleLoading = config.isModuleLoading;
        configLoaded = true;
        if(!isModuleLoading){
            showToolPannel();
        }
    }
    chrome.runtime.sendMessage({
        type: 'getConfig'
    }, updateConfig);
    GlobalEvents.on('updateConfig', updateConfig);

    GlobalEvents.on('moduleStart', function(){
        isModuleLoading = true;
    });

    GlobalEvents.on('moduleStart', function(){
        isModuleLoading = true;
    });

    GlobalEvents.on('moduleEnd', function(){
        isModuleLoading = false;
        showToolPannel();
    });

    GlobalEvents.on('updatePathAttr', function(newAttr){
        arrPathAttrs.forEach(function(attr){
            if(attr.name === newAttr.name){
                attr.on = newAttr.on;
            }
        });
        arrPathAttrs.map(function(attr){
            mapPathAttrs[attr.name] = attr.on;
        });
        updateAttrsContainer();
    });

    function getVarStr(str){
        if(typeof str === 'string'){
            return str.replace(/\{\{(.+?)\}\}/g, function(all, key){
                return testVars[key] || '';
            });
        }
        else{
            return str;
        }
    }

    // 读取cookie
    function getCookie(name){
        var mapCookies = {};
        var cookie = document.cookie || '';
        cookie.replace(/([^=]+)\s*=\s*([^;]*)\s*;?\s*/g, function(all, name, value){
            mapCookies[name] = value;
        });
        return mapCookies[name];
    }

    var reHoverClass = /(on)?(hover|hovered|over|active|current|focus|focused|focusin|selected)([^a-z0-9]|$)/i;

    // get selector path
    function getDomPath(target, isAllDom){
        var arrAllPaths = [];
        var node = target, path;
        while(node){
            var nodeName = node.nodeName.toLowerCase();
            if(/^#document/.test(nodeName)){
                path = getRelativeDomPath(node, target, isAllDom);
                if(path){
                    arrAllPaths.push(path);
                }
                node = node.parentNode || node.host;
                target = node;
            }
            else{
                node = node.parentNode || node.host;
            }
        }
        return arrAllPaths.length > 0 ? arrAllPaths.reverse().join(' /deep/ ') : null;
    }

    function getRelativeDomPath(rootNode, target, isAllDom){
        var relativePath = '';
        var tagName = target.nodeName.toLowerCase();
        var tempPath;
        var testidValue = target.getAttribute && mapPathAttrs.id && target.getAttribute('data-testid');
        var idValue = mapPathAttrs.id && target.getAttribute && target.getAttribute('id');
        var textValue = mapPathAttrs.text && target.childNodes.length === 1 && target.firstChild.nodeType === 3 && target.textContent;
        var nameValue = mapPathAttrs.name && target.getAttribute && target.getAttribute('name');
        var typeValue = mapPathAttrs.type && target.getAttribute && target.getAttribute('type');
        var valueValue = mapPathAttrs.value && target.getAttribute && target.getAttribute('value');
        var tempTestPath = '[data-testid="'+testidValue+'"]';
        var tempIdPath = '#'+idValue;
        var tempTextPath = `//${tagName}[text()="${textValue}"]`;
        if(testidValue && checkUniqueSelector(rootNode, tempTestPath)){
            return tempTestPath;
        }
        // 检查目标元素自身是否有唯一id
        else if(idValue && reAttrValueBlack.test(idValue) === false && checkUniqueSelector(rootNode, tempIdPath, isAllDom)){
            // id定位
            return tempIdPath;
        }
        else if(textValue && !reTextValueBlack.test(textValue) && textValue.length <= 50 && checkUniqueXPath(rootNode, tempTextPath, isAllDom)){
            // text定位
            return tempTextPath;
        }
        else if(tagName === 'input'){
            // 表单项特殊校验
            tempPath = nameValue ? tagName + '[name="'+nameValue+'"]' : tagName;
            if(valueValue){
                switch(typeValue){
                    case 'radio':
                    case 'checkbox':
                        tempPath += '[value="'+valueValue+'"]';
                        break;
                }
            }
            tempPath += (childPath ? ' > ' + childPath : '');
            if(checkUniqueSelector(rootNode, tempPath, isAllDom)){
                return tempPath;
            }
        }
        else if(nameValue){
            // 非input，但有name值
            tempPath = tagName + '[name="'+nameValue+'"]'
            if(tempPath && reAttrValueBlack.test(nameValue) === false && checkUniqueSelector(rootNode, tempPath, isAllDom)){
                return tempPath;
            }
        }
        else if(mapPathAttrs.id){
            // 检查目标是否有父容器有唯一id
            var idNodeInfo = getClosestIdNode(target, isAllDom);
            if(idNodeInfo){
                relativePath = idNodeInfo.path + ' ';
            }
        }
        var current = target;
        var childPath = '';
        while(current !== null){
            if(current !== rootNode){
                childPath = getSelectorElement(current, rootNode, relativePath, childPath, isAllDom);
                if(childPath.substr(0,1) === '!'){
                    return relativePath + childPath.substr(1);
                }
                current = current.parentNode;
            }
            else{
                current = null;
            }
        }
        return null;
    }
    // 读取最近的id唯一节点
    function getClosestIdNode(target, isAllDom){
        var current = target;
        var body = target.ownerDocument.body;
        while(current !== null){
            if(current.nodeName !== 'HTML'){
                var testidValue = current.getAttribute && current.getAttribute('data-testid');
                var idValue = current.getAttribute && current.getAttribute('id');
                if(testidValue && checkUniqueSelector(body, '[data-testid="'+testidValue+'"]', isAllDom)){
                    return {
                        node: current,
                        path: '[data-testid="'+testidValue+'"]'
                    };
                }
                else if(idValue && reAttrValueBlack.test(idValue) === false && checkUniqueSelector(body, '#'+idValue, isAllDom)){
                    return {
                        node: current,
                        path: '#'+idValue
                    };
                }
                current = current.parentNode;
            }
            else{
                current = null;
            }
        }
        return null;
    }
    // 获取节点CSS选择器
    function getSelectorElement(target, rootNode, relativePath, childPath, isAllDom){
        var tagName = target.nodeName.toLowerCase();
        var elementPath = tagName, tempPath;
        // 校验tagName是否能唯一定位
        tempPath = elementPath + (childPath ? ' > ' + childPath : '');
        if(checkUniqueSelector(rootNode, relativePath + tempPath, isAllDom)){
            return '!' + tempPath;
        }
        // 校验class能否定位
        var relativeClass = null;
        var classValue = target.getAttribute && target.getAttribute('class');
        if(classValue){
            var arrClass = classValue.split(/\s+/);
            for(var i in arrClass){
                var className = arrClass[i];
                if(className && reHoverClass.test(className) === false && reClassValueBlack.test(className) === false){
                    tempPath = elementPath + '.'+arrClass[i] + (childPath ? ' > ' + childPath : '');
                    if(checkUniqueSelector(rootNode, relativePath + tempPath, isAllDom)){
                        return '!' + tempPath;
                    }
                    else{
                        // 无法绝对定位,再次测试是否可以在父节点中相对定位自身
                        var parent = target.parentNode;
                        if(parent){
                            var element = parent.querySelectorAll('.'+className);
                            if(element.length === 1){
                                relativeClass = className;
                            }
                        }
                    }
                }
            }
        }
        // 校验属性是否能定位
        var attr, attrName, attrValue;
        for(var i in arrPathAttrs){
            attr = arrPathAttrs[i];
            if(attr.on){
                attrName = attr.name;
                attrValue = target.getAttribute && target.getAttribute(attrName);
                if(attrValue && reAttrValueBlack.test(attrValue) === false){
                    elementPath += '['+attrName+'="'+attrValue+'"]';
                    tempPath = elementPath + (childPath ? ' > ' + childPath : '');
                    if(checkUniqueSelector(rootNode, relativePath + tempPath, isAllDom)){
                        return '!' + tempPath;
                    }
                }
            }
        }
        // 父元素定位
        if(relativeClass){
            elementPath += '.' + relativeClass;
        }
        else{
            var index = getChildIndex(target);
            if(index !== -1){
                elementPath += ':nth-child('+index+')';
            }
        }
        tempPath = elementPath + (childPath ? ' > ' + childPath : '');
        if(checkUniqueSelector(rootNode, relativePath + tempPath, isAllDom)){
            return '!' + tempPath;
        }
        return tempPath;
    }
    function curCSS(elem, name){
        var curStyle = elem.currentStyle;
        var style = elem.style;
        return (curStyle && curStyle[name]) || (style && style[name]);
    }
    function isHidden(elem){
        return ( elem.offsetWidth === 0 && elem.offsetHeight === 0 ) || (curCSS( elem, "display" ) === "none");
    }
    function checkUniqueSelector(relativeNode, path, isAllDom){
        try{
            var elements = relativeNode.querySelectorAll(path);
            if(isAllDom){
                return elements.length === 1;
            }
            else{
                var count = 0;
                for(var i=0;i<elements.length;i++){
                    if(!isHidden(elements[i]))count ++;
                }
                return count === 1;
            }
        }
        catch(e){return false;}
    }
    function checkUniqueXPath(relativeNode, path, isAllDom){
        try{
            var result = document.evaluate(path, relativeNode, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            if(isAllDom){
                return result.snapshotLength === 1;
            }
            else{
                var count = 0;
                for(var i=0;i<result.snapshotLength;i++){
                    if(!isHidden(result.snapshotItem(i)))count ++;
                }
                return count === 1;
            }
        }
        catch(e){return false;}
    }
    function getChildIndex(el){
        var index = -1;
        var parentNode = el.parentNode;
        if(parentNode){
            var childNodes = parentNode.childNodes;
            var total = 0;
            var node;
            for (var i = 0, len=childNodes.length; i < len; i++) {
                node = childNodes[i];
                if(node.nodeType === 1){
                    total++;
                    if ( node === el) {
                        index = total;
                    }
                }
            }
        }
        if(total === 1){
            index = -1;
        }
        return index;
    }

    function findDomPathElement(path){
        var newElements = [], element;
        if(/^\.?\//.test(path)){
            // for xpath
            var result = document.evaluate(path, document.documentElement, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            for(var i=0;i<result.snapshotLength;i++){
                element = result.snapshotItem(i);
                if(!isHidden(element) && isNotInToolsPannel(element))newElements.push(element);
            }
        }
        else{
            // for css selector
            var elements = document.querySelectorAll(path);
            for(var i=0;i<elements.length;i++){
                element = elements[i];
                if(!isHidden(element) && isNotInToolsPannel(element))newElements.push(element);
            }
        }
        return newElements;
    }

    // get frame id
    function getFrameId(){
        var frame = -1;
        if(isIframe){
            try{
                var frameElement = window.frameElement;
                if(frameElement !== null){
                    frame = getDomPath(frameElement) || -1;
                }
                else{
                    frame = '!'+location.href.replace(/^https?:/,'');
                    var parentFrames = parent.frames;
                    for(var i=0,len=parentFrames.length;i<len;i++){
                        if(parentFrames[i] === window){
                            frame = '!'+i;
                            break;
                        }
                    }
                }
            }
            catch(e){}
        }
        else{
            frame = null;
        }
        return frame;
    }

    // hide dom
    function hideDom(path){
        var arrElements = document.querySelectorAll(path);
        var element;
        for(var i=0,len=arrElements.length;i<len;i++){
            element = arrElements[i];
            element._lastDispaly = element.style.display;
            element.style.display = 'none';
        }
    }

    // show dom
    function showDom(path){
        var arrElements = document.querySelectorAll(path);
        var element;
        for(var i=0,len=arrElements.length;i<len;i++){
            element = arrElements[i];
            element.style.display = element._lastDispaly || 'block';
            element._lastDispaly = '';
        }
    }

    // save command
    function saveCommand(cmd, data){
        var frameId = getFrameId();
        var cmdData = {
            frame: frameId,
            cmd: cmd,
            data: data
        };
        if(/^!/.test(frameId)){
            parent.postMessage({
                type: 'uiRecorderFrameCommmand',
                data: cmdData
            }, '*');
        }
        else{
            chrome.runtime.sendMessage({
                type: 'command',
                data: cmdData
            });
            if(lastAlertExpect && cmdData.cmd === lastAlertExpect.params[0]){
                lastAlertExpect.params = [];
                chrome.runtime.sendMessage({
                    type: 'command',
                    data: {
                        cmd: 'expect',
                        frame: frameId,
                        data: lastAlertExpect
                    }
                });
                lastAlertExpect = null;
            }
        }
    }

    window.addEventListener('message', function(e){
        var data = e.data;
        var type = data && data.type;
        if(type === 'uiRecorderAlertCommand'){
            var cmdInfo = data.cmdInfo;
            saveCommand(cmdInfo.cmd, cmdInfo.data);
        }
        else if(type === 'uiRecorderFrameCommmand'){
            data = data.data;
            // fix frameId to path
            var frame = data.frame;
            if(frame){
                data.frame = getCrossDomainFrameId(frame);
            }
            chrome.runtime.sendMessage({
                type: 'command',
                data: data
            });
        }
    }, true);

    function getCrossDomainFrameId(frame){
        var arrIframes, frameDom = null;
        var framePath;
        var match = frame.match(/^!(\d+)$/)
        if(match){
            var frameId = match[1];
            var frameWindow = window.frames[frameId];
            arrIframes = document.getElementsByTagName("iframe");
            for(var i =0, len = arrIframes.length;i<len;i++){
                frameDom = arrIframes[i];
                if(frameDom.contentWindow === frameWindow){
                    break;
                }
            }
            framePath = getDomPath(frameDom);
        }
        else{
            var frameHref = frame.substr(1);
            arrIframes = document.querySelectorAll('* /deep/ iframe');
            for(var i =0, len = arrIframes.length;i<len;i++){
                frameDom = arrIframes[i];
                if(frameDom.src.replace(/^https?:/,'') === frameHref){
                    break;
                }
            }
            framePath = getDomPath(frameDom);
        }
        return framePath;
    }

    function simulateMouseEvent(target, type, bubbles, cancelable, view, detail, screenX, screenY, clientX, clientY){
        try{
            var customEvent = document.createEvent("MouseEvents");
            customEvent.initMouseEvent(type, bubbles, cancelable, view, detail, screenX, screenY, clientX, clientY);
            target.dispatchEvent(customEvent);
        }
        catch(e){}
    }

    function simulateKeyboardEvent(target, type, keyCode, charCode){
        try{
            var customEvent = document.createEvent('KeyboardEvent');
            customEvent.initKeyEvent(type, false, true, null, false, false, false, false, keyCode, charCode);
            target.dispatchEvent(customEvent);
        }
        catch(e){}
    }

    function simulateInputEvent(target){
        try{
            var customEvent = document.createEvent('Event');
            customEvent.initEvent('input', true, true);
            target.dispatchEvent(customEvent);
        }
        catch(e){}
    }


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

    function getTargetText(target){
        var nodeName = target.nodeName;
        var id = target.getAttribute('id');
        var text = '';
        if(nodeName === 'INPUT'){
            var type = target.getAttribute('type');
            switch(type){
                case 'button':
                case 'reset':
                case 'submit':
                    text = target.getAttribute('value');
                    break;
                default:
                    var parentNode = target.parentNode;
                    if(parentNode.nodeName === 'LABEL'){
                        text = parentNode.textContent;
                    }
                    else if(id){
                        var labelForElement = findDomPathElement('label[for="'+id+'"]');
                        if(labelForElement.length > 0){
                            text = labelForElement[0].textContent;
                        }
                        else{
                            text = target.getAttribute('name');
                        }
                    }
                    else{
                        text = target.getAttribute('name');
                    }
            }
        }
        else if(nodeName === 'SELECT'){
            text = target.getAttribute('name');
        }
        else{
            text = target.textContent;
        }
        text = text || '';
        text = text.replace(/\s*\r?\n\s*/g,' ');
        text = text.replace(/^\s+|\s+$/g, '');
        var textLen = byteLen(text);
        if(textLen <= 60){
            text = textLen > 20 ? leftstr(text, 20) + '...' : text;
        }
        else{
            text = '';
        }
        return text;
    }

    // 调整label为for的表单DOM,以增加PATH稳定性
    function getLabelTarget(target){
        var labelDom;
        if(target.nodeName !== 'INPUT'){
            if(target.nodeName === 'LABEL'){
                labelDom = target;
            }
            else if(target.parentNode.nodeName === 'LABEL'){
                labelDom = target.parentNode;
            }
        }
        if(labelDom){
            // label标签，替换为目标表单项
            var forValue = labelDom.getAttribute && labelDom.getAttribute('for');
            var labelTargets;
            if(forValue){
                // 有指定for
                labelTargets = findDomPathElement('#'+forValue);
                if(labelTargets.length === 1 && isDomVisible(labelTargets[0])){
                    return labelTargets[0];
                }
            }
            else{
                // 没有指定for
                labelTargets = labelDom.querySelectorAll('input');
                if(labelTargets.length === 1 && isDomVisible(labelTargets[0])){
                    return labelTargets[0];
                }
            }
        }
    }

    // 检测dom是否可见
    function isDomVisible(target){
        var offset = target.getBoundingClientRect();
        return offset.width > 0 && offset.height > 0;
    }

    // show loading
    var divLoading;
    function initLoading(){
        divLoading = document.createElement("div");
        divLoading.id = 'uirecorder-loading';
        divLoading.innerHTML = '<style>#uirecorder-loading{display:none;position:fixed;z-index:2147483647;left:0;top:0;width:100%;height:100%;}#uirecorder-loading div{z-index:0;background:#000;width:100%;height:100%;opacity:0.6}#uirecorder-loading span{z-index:1;position:fixed;top:50%;left:50%;margin-left:-80px;margin-top:-20px;color:white;font-size:30px;}</style><div></div><span>'+__('loading')+'</span>';
        document.body.appendChild(divLoading);
    }

    function showLoading(){
        if(divLoading){
            divLoading.style.display = 'block';
        }
    }

    function hideLoading(){
        if(divLoading){
            divLoading.style.display = 'none';
        }
    }

    function onBodyReady(){
        if(isBodyReady === false){
            isBodyReady = true;
            hookAlert();
            initLoading();
            if(!isModuleLoading){
                showLoading();
            }
        }
    }

    function onLoad(){
        onBodyReady();
        isOnload = true;
        if(isIframe === false){
            saveCommand('waitBody');
        }
        hideLoading();
        if(!isModuleLoading){
            if(isIframe && location.href === 'about:blank'){
                // 富文本延后初始化
                setTimeout(showToolPannel, 500);
            }
            else{
                showToolPannel();
            }
        }
    }

    function showToolPannel(){
        if(isOnload && configLoaded){
            if(!document._uirecorderEventInited){
                initRecorderEvent();
            }
            initRecorderDom();
        }
    }

    function checkBodyReady(){
        var body = document.getElementsByTagName("body");
        if(body && body.length===1){
            onBodyReady();
        }
        else{
            setTimeout(checkBodyReady, 10);
        }
    }

    checkBodyReady();

    if(document.readyState === 'complete'){
        onLoad();
    }
    else{
        window.addEventListener('load', onLoad, true);
    }

    // 工作模式变更
    GlobalEvents.on('modeChange', function(mode){
        switch(mode){
            case 'record':
                removeSelector();
                isRecording = true;
                isStopEvent = false;
                break;
            case 'pauseAll':
                removeSelector();
                isRecording = false;
                isStopEvent = true;
                break;
            case 'pauseRecord':
                removeSelector();
                isRecording = false;
                isStopEvent = false;
                break;
            case 'select':
                initDomSelecter();
                isRecording = false;
                isStopEvent = true;
        }
    });
    // 设置全局工作模式
    function setGlobalWorkMode(mode){
        lastWorkMode = mode;
        GlobalEvents.emit('modeChange', mode);
    }

    // dom选择器hover事件
    GlobalEvents.on('selecterHover', function(event){
        var frameId = getFrameId();
        if(frameId !== event.frame){
            // 清空选择器其余的iframe浮层
            if(divDomSelector){
                divDomSelector.style.display = 'none';
            }
        }
        if(isIframe === false){
            // 主窗口显示path路径
            spanShowDomPath.innerHTML = event.path;
        }
    });

    // 添加悬停命令
    GlobalEvents.on('addHover', function(event){
        var frameId = getFrameId();
        if(frameId === event.frame){
            var elements = findDomPathElement(event.path);
            if(elements.length === 1){
                var target = elements[0];
                GlobalEvents.emit('showDomPath', event.path);
                saveCommand('mouseMove', {
                    path: event.path,
                    x: event.x,
                    y: event.y,
                    text: getTargetText(target)
                });
                simulateMouseEvent(target, 'mouseover', true, true, null);
                simulateMouseEvent(target, 'mousemove', true, true, null, 1, event.screenX, event.screenY, event.clientX, event.clientY);
            }
        }
    });

    // 插入变量
    GlobalEvents.on('insertVar', function(event){
        var varinfo = event.varinfo;
        if(varinfo.isNew){
            testVars[varinfo.name] = varinfo.value;
        }
        var frameId = getFrameId();
        if(frameId === event.frame){
            var path = event.path;
            var elements = findDomPathElement(path);
            if(elements.length === 1){
                var target = elements[0];
                target.focus();
                target.value = getVarStr(eval('\`'+varinfo.template+'\`'));
                GlobalEvents.emit('showDomPath', path);
                saveCommand('insertVar', {
                    path: path,
                    varinfo: varinfo,
                    text: getTargetText(target)
                });
                simulateKeyboardEvent(target, 'keyup', 20, 20);
                simulateInputEvent(target);
            }
        }
    });

    // 执行JS
    GlobalEvents.on('eval', function(event){
        var frameId = getFrameId();
        if(frameId === event.frame){
            var code = event.code;
            eval(getVarStr(code));
            saveCommand('eval', code);
        }
    });

    // 更新变量
    GlobalEvents.on('updateVar', function(event){
        var frameId = getFrameId();
        if(frameId === event.frame){
            saveCommand('updateVar', event.varinfo);
        }
    });

    // 获取DOM值
    GlobalEvents.on('getDomValue', function(event){
        var domInfo = event.domInfo;
        var frameId = getFrameId();
        if(frameId === domInfo.frame){
            var path = domInfo.path;
            var elements = findDomPathElement(path);
            if(elements.length === 1){
                var expectTarget = elements[0];
                var type = event.type;
                var param = event.param;
                var expectValue = '';
                switch(type){
                    case 'val':
                        expectValue = expectTarget.value || '';
                        break;
                    case 'text':
                        var text = expectTarget.textContent || '';
                        text = text.replace(/^\s+|\s+$/g, '');
                        expectValue = text;
                        break;
                    case 'displayed':
                        expectValue = 'true';
                        break;
                    case 'enabled':
                        expectValue = expectTarget.disabled ? 'false' : 'true';
                        break;
                    case 'selected':
                        expectValue = expectTarget.checked ? 'true' : 'false';
                        break;
                    case 'attr':
                        if(param){
                            expectValue = expectTarget.getAttribute(param) || '';
                        }
                        break;
                    case 'css':
                        if(param){
                            var styles = window.getComputedStyle(expectTarget, null);
                            expectValue = styles.getPropertyValue(param) || '';
                        }
                        break;
                }
                GlobalEvents.emit('returnDomValue', expectValue);
            }
        }
    });

    // 添加断言命令
    GlobalEvents.on('addExpect', function(event){
        var frameId = getFrameId();
        if(frameId === event.frame){
            saveCommand('expect', event.data);
        }
    });

    // 主窗口
    if(isIframe === false){
        // DOM选择器点击事件
        GlobalEvents.on('selecterClick', function(event){
            domSelectorCallback({
                frame: event.frame,
                path: event.path,
                x: event.x,
                y: event.y
            });
        });
        // 返回DOM当前值
        GlobalEvents.on('returnDomValue', function(value){
            domGetValueCallback(value);
        });
        function getDomValue(type, domInfo, param, callback){
            domGetValueCallback = callback;
            GlobalEvents.emit('getDomValue', {
                type: type,
                domInfo: domInfo,
                param: param
            });
        }
        // 显示target的path
        GlobalEvents.on('showDomPath', function(path){
            spanShowDomPath.innerHTML = path;
        });
    }

    function hookAlert(){
        // eval with unsafe window
        function unsafeEval(str){
            var head = document.getElementsByTagName("head")[0];
            var script = document.createElement("script");
            script.innerHTML = '('+str+')();';
            head.appendChild(script);
            head.removeChild(script);
        }

        // hook alert, confirm, prompt
        function hookAlertFunction(){
            var rawAlert = window.alert;
            function sendAlertCmd(cmd, data){
                var cmdInfo = {
                    cmd: cmd,
                    data: data || {}
                };
                window.postMessage({
                    'type': 'uiRecorderAlertCommand',
                    'cmdInfo': cmdInfo
                }, '*');
            }
            window.alert = function(str){
                var ret = rawAlert.call(this, str);
                sendAlertCmd('acceptAlert');
                return ret;
            }
            var rawConfirm = window.confirm;
            window.confirm = function(str){
                var ret = rawConfirm.call(this, str);
                sendAlertCmd(ret?'acceptAlert':'dismissAlert');
                return ret;
            }
            var rawPrompt = window.prompt;
            window.prompt = function(str){
                var ret = rawPrompt.call(this, str);
                if(ret === null){
                    sendAlertCmd('dismissAlert');
                }
                else{
                    sendAlertCmd('setAlert', {
                        text: ret
                    });
                    sendAlertCmd('acceptAlert');
                }
                return ret;
            }
            function wrapBeforeUnloadListener(oldListener){
                var newListener = function(e){
                    var returnValue = oldListener(e);
                    if(returnValue){
                        sendAlertCmd('acceptAlert');
                    }
                    return returnValue;
                }
                return newListener;
            }
            var rawAddEventListener = window.addEventListener;
            window.addEventListener = function(type, listener, useCapture){
                if(type === 'beforeunload'){
                    listener = wrapBeforeUnloadListener(listener);
                }
                return rawAddEventListener.call(window, type, listener, useCapture);
            };
            setTimeout(function(){
                var oldBeforeunload = window.onbeforeunload;
                if(oldBeforeunload){
                    window.onbeforeunload = wrapBeforeUnloadListener(oldBeforeunload)
                }
            }, 1000);
        }
        unsafeEval(hookAlertFunction.toString());
    }
    // 初始化选择器
    function initDomSelecter(){
        divDomSelector = document.createElement("div");
        divDomSelector.id = 'uirecorder-selecter-mask';
        divDomSelector.className = 'uirecorder';
        divDomSelector.innerHTML = '<style>#uirecorder-selecter-mask{display:none;background:rgba(151, 232, 81,0.5);position:fixed;z-index:2147483647;}</style>';
        divDomSelector.addEventListener('click', function(event){
            event.stopPropagation();
            event.preventDefault();
            endDomSelector(event);
        });
        document.body.appendChild(divDomSelector);
    }

    // 显示当前hover的dom
    function showSelecterHover(clientX, clientY){
        divDomSelector.style.display = 'none';
        var newSelectDom = document.elementFromPoint(clientX, clientY);
        if(newSelectDom && isNotInToolsPannel(newSelectDom) && /^(HTML|IFRAME)$/i.test(newSelectDom.tagName) === false){
            divDomSelector.style.display = 'block';
            if(newSelectDom !== lastSelectDom){
                var rect = newSelectDom.getBoundingClientRect();
                divDomSelector.style.left = rect.left+'px';
                divDomSelector.style.top = rect.top+'px';
                divDomSelector.style.width = rect.width+'px';
                divDomSelector.style.height = rect.height+'px';
                var frameId = getFrameId();
                GlobalEvents.emit('selecterHover', {
                    frame: frameId,
                    path: getDomPath(newSelectDom)
                });
                lastSelectDom = newSelectDom;
            }
        }
    }

    // 更新属性配置列表
    function updateAttrsContainer(){
        if(divAttrsContainer){
            var arrHtml = [];
            arrPathAttrs.forEach(function(attr){
                arrHtml.push('<span class="'+(attr.on?'on':'off')+'">'+attr.name+'</span>');
            });
            divAttrsContainer.innerHTML = arrHtml.join('');
        }
    }

    // 结束DOM选择器
    function endDomSelector(event){
        if(lastSelectDom !== null){
            var frameId = getFrameId();
            setGlobalWorkMode('pauseAll');
            GlobalEvents.emit('selecterClick', {
                frame: frameId,
                path: getDomPath(lastSelectDom),
                x: event.offsetX,
                y: event.offsetY,
                ctrlKey: event.metaKey || event.ctrlKey
            });
        }
    }

    // 清除dom选择器
    function removeSelector(){
        if(divDomSelector){
            document.body.removeChild(divDomSelector);
            divDomSelector = null;
        }
    }

    // 判断事件是否在工具面板
    function isNotInToolsPannel(target){
        while(target){
            if(/uirecorder/.test(target.className)){
                return false;
            }
            target = target.parentNode;
        }
        return true;
    }

    // 初始化事件
    function initRecorderEvent(){

        document._uirecorderEventInited = true;

        document.addEventListener('mousemove', function(event){
            var target = event.target;
            if(divDomSelector){
                event.stopPropagation();
                event.preventDefault();
                showSelecterHover(event.clientX, event.clientY);
            }
            else if(isNotInToolsPannel(target) && !isRecording && isStopEvent){
                event.stopPropagation();
                event.preventDefault();
            }
        }, true);

        document.addEventListener('mouseover', function(event){
            if(isNotInToolsPannel(event.target) && !isRecording && isStopEvent){
                event.stopPropagation();
                event.preventDefault();
            }
        }, true);

        document.addEventListener('mouseout', function(event){
            if(isNotInToolsPannel(event.target) && !isRecording && isStopEvent){
                event.stopPropagation();
                event.preventDefault();
            }
        }, true);

        document.addEventListener('dblclick', function(event){
            if(isNotInToolsPannel(event.target) && !isRecording && isStopEvent){
                event.stopPropagation();
                event.preventDefault();
            }
        }, true);
        // catch event
        document.addEventListener('mousedown', function(event){
            var target = event.target;
            if(target.shadowRoot){
                target = event.path[0];
            }
            if(isNotInToolsPannel(target)){
                if(isRecording){
                    if(isMouseNotInScroll(event) && /^(html|select|optgroup|option)$/i.test(target.tagName) === false && isUploadElement(target) === false){
                        var labelTarget = getLabelTarget(target);
                        if(labelTarget){
                            target = labelTarget;
                        }
                        saveParentsOffset(target);
                        var path = getDomPath(target);
                        if(path !== null){
                            var offset = target.getBoundingClientRect();
                            var x,y;
                            if(labelTarget){
                                x = Math.floor(offset.width / 2);
                                y = Math.floor(offset.height / 2);
                            }
                            else{
                                x = event.clientX-offset.left;
                                y = event.clientY-offset.top;
                            }
                            GlobalEvents.emit('showDomPath', path);
                            saveCommand('mouseDown', {
                                path: path,
                                x: x,
                                y: y,
                                button: event.button,
                                text: getTargetText(target),
                                option: event.altKey
                            });
                        }
                    }
                }
                else if(isStopEvent){
                    event.stopPropagation();
                    event.preventDefault();
                }
            }
        }, true);

        document.addEventListener('mouseup', function(event){
            var target = event.target;
            if(target.shadowRoot){
                target = event.path[0];
            }
            if(isNotInToolsPannel(target)){
                if(isRecording){
                    var tagName = target.tagName;
                    if(isMouseNotInScroll(event) && /^(html|select|optgroup|option)$/i.test(tagName) === false && isUploadElement(target) === false){
                        // get offset of the fixed parent
                        var labelTarget = getLabelTarget(target);
                        if(labelTarget){
                            target = labelTarget;
                        }
                        var fixedParent = getFixedParent(target);
                        if(fixedParent !== null){
                            var offset = target.getBoundingClientRect();
                            var x,y;
                            if(labelTarget){
                                x = Math.floor(offset.width / 2);
                                y = Math.floor(offset.height / 2);
                            }
                            else{
                                x = event.clientX-fixedParent.left;
                                y = event.clientY-fixedParent.top;
                            }
                            GlobalEvents.emit('showDomPath', fixedParent.path);
                            saveCommand('mouseUp', {
                                path: fixedParent.path,
                                x: x,
                                y: y,
                                button: event.button,
                                text: getTargetText(target),
                                option: event.altKey
                            });
                        }
                    }
                }
                else if(isStopEvent){
                    event.stopPropagation();
                    event.preventDefault();
                }
            }
        }, true);

        // mobile event
        document.addEventListener('touchstart', function(event){
            var touchEvent = event.targetTouches[0];
            var target = touchEvent.target;
            if(isNotInToolsPannel(target)){
                if(isRecording){

                }
                else{
                    if(divDomSelector){
                        showSelecterHover(touchEvent.clientX, touchEvent.clientY);
                    }
                    if(isStopEvent){
                        event.stopPropagation();
                        event.preventDefault();
                    }
                }
            }
        }, true);

        document.addEventListener('touchmove', function(event){
            var touchEvent = event.targetTouches[0];
            var target = touchEvent.target;
            if(isNotInToolsPannel(target)){
                if(isRecording){

                }
                else{
                    if(divDomSelector){
                        showSelecterHover(touchEvent.clientX, touchEvent.clientY);
                    }
                    if(isStopEvent){
                        event.stopPropagation();
                        event.preventDefault();
                    }
                }
            }
        }, true);

        document.addEventListener('touchend', function(event){
            var touchEvent = event.changedTouches[0];
            var target = touchEvent.target;
            if(isNotInToolsPannel(target)){
                if(isRecording){

                }
                else{
                    if(divDomSelector){
                        endDomSelector();
                    }
                    if(isStopEvent){
                        event.stopPropagation();
                        event.preventDefault();
                    }
                }
            }
        }, true);


        // save all parents offset
        var mapParentsOffset = {};
        function saveParentsOffset(target){
            var documentElement = document.documentElement;
            mapParentsOffset = {};
            var notFirstNode = false; // 当前点击控件以可见范围内进行定位，其它以全局定位（很多局部控件是不可见的）
            while(target !== null){
                var nodeName = target.nodeName.toLowerCase();
                if(nodeName !== '#document-fragment'){
                    var path = getDomPath(target, notFirstNode);
                    var rect = target.getBoundingClientRect();
                    mapParentsOffset[path] = {
                        left: parseInt(rect.left, 10),
                        top: parseInt(rect.top, 10)
                    };
                }
                if(nodeName === 'html'){
                    target = null;
                }
                else{
                    target = target.parentNode || target.host;
                }
                notFirstNode = false;
            }
        }

        // get the fixed offset parent
        function getFixedParent(target){
            var documentElement = document.documentElement;
            var node = target;
            var nodeName, path, offset, left, top, savedParent;
            var notFirstNode = false; // 当前点击控件以可见范围内进行定位，其它以全局定位（很多局部控件是不可见的）
            while(node !== null){
                nodeName = node.nodeName.toLowerCase();
                if(nodeName !== '#document-fragment'){
                    path = getDomPath(node, notFirstNode);
                    if(path === null){
                        break;
                    }
                    offset = node.getBoundingClientRect();
                    left = parseInt(offset.left, 10);
                    top = parseInt(offset.top, 10);
                    savedParent = mapParentsOffset[path];
                    if(savedParent && left === savedParent.left && top === savedParent.top){
                        return {
                            path: path,
                            left: left,
                            top: top
                        };
                    }
                }
                if(nodeName === 'html'){
                    node = null;
                }
                else{
                    node = node.parentNode;
                }
                notFirstNode = true;
            }
            path = getDomPath(target);
            if(path !== null){
                offset = target.getBoundingClientRect();
                return {
                    path: path,
                    left: offset.left,
                    top: offset.top
                };
            }
            else{
                return null;
            }
        }

        var modifierKeys = {
            17: 'CTRL', // Ctrl
            18: 'ALT', // Alt
            16: 'SHIFT', // Shift
            91: 'CTRL' // Command/Meta
        };

        var NonTextKeys = {
            8: 'BACK_SPACE', // BACK_SPACE
            9: 'TAB', // TAB
            13: 'ENTER', // ENTER
            19: 'PAUSE', // PAUSE
            27: 'ESCAPE', // ESCAPE
            33: 'PAGE_UP', // PAGE_UP
            34: 'PAGE_DOWN', // PAGE_DOWN
            35: 'END', // END
            36: 'HOME', // HOME
            37: 'LEFT', // LEFT
            38: 'UP', // UP
            39: 'RIGHT', // RIGHT
            40: 'DOWN', // DOWN
            45: 'INSERT', // INSERT
            46: 'DELETE' // DELETE
        };

        // catch keydown event
        var lastModifierKeydown = null;
        var isModifierKeyRecord = false; // 是否记录控制键
        document.addEventListener('keydown', function(event){
            var target = event.target;
            if(isNotInToolsPannel(target)){
                var keyCode = event.keyCode;
                var modifierKey = modifierKeys[keyCode];
                var NonTextKey = NonTextKeys[keyCode];
                if(isRecording){
                    var stickModifierKey;
                    if(event.ctrlKey){
                        stickModifierKey = 'CTRL';
                    }
                    else if(event.altKey){
                        stickModifierKey = 'ALT';
                    }
                    else if(event.shiftKey){
                        stickModifierKey = 'SHIFT';
                    }
                    else if(event.metaKey){
                        stickModifierKey = 'CTRL';
                    }
                    if(modifierKey){
                        // 控制键只触发一次keyDown
                        if(isModifierKeyRecord && modifierKey !== lastModifierKeydown){
                            lastModifierKeydown = modifierKey;
                            saveCommand('keyDown', {
                                character: modifierKey
                            });
                        }
                    }
                    else if(NonTextKey){
                        if(stickModifierKey && isModifierKeyRecord === false){
                            isModifierKeyRecord = true;
                            saveCommand('keyDown', {
                                character: stickModifierKey
                            });
                        }
                        saveCommand('sendKeys', {
                            keys: '{'+NonTextKey+'}'
                        });
                    }
                    else if(stickModifierKey === 'CTRL'){
                        var typedCharacter = String.fromCharCode(keyCode);
                        if(/^[az]$/i.test(typedCharacter)){
                            if(isModifierKeyRecord === false){
                                isModifierKeyRecord = true;
                                saveCommand('keyDown', {
                                    character: stickModifierKey
                                });
                            }
                            saveCommand('sendKeys', {
                                keys: typedCharacter.toLowerCase()
                            });
                        }
                    }
                }
                else if(isStopEvent){
                    event.stopPropagation();
                    event.preventDefault();
                }
            }
        }, true);

        // get paste text
        document.addEventListener('paste', function(event){
            var target= event.target;
            if(isNotInToolsPannel(target)){
                if(isRecording){
                    var text = event.clipboardData.getData('text');
                    if(text){
                        saveCommand('sendKeys', {
                            keys: text
                        });
                    }
                }
            }
        });

        // catch keyup event
        document.addEventListener('keyup', function(event){
            var target= event.target;
            if(isNotInToolsPannel(target)){
                var modifierKey = modifierKeys[event.keyCode];
                if(isRecording){
                    if(isModifierKeyRecord && modifierKey){
                        isModifierKeyRecord = false;
                        lastModifierKeydown = null;
                        saveCommand('keyUp', {
                            character: modifierKey
                        });
                    }
                }
                else{
                    if(!isRecording && event.keyCode === 27){
                        if(hoverMode){
                            hoverMode =false;
                            document.getElementsByName('uirecorder-hover')[0].childNodes[1].nodeValue = __('button_hover_on_text');
                        }
                        setGlobalWorkMode('record');
                    }
                    if(isStopEvent){
                        event.stopPropagation();
                        event.preventDefault();
                    }
                }
            }
        }, true);

        // catch keypress event
        document.addEventListener('keypress', function(event){
            var target = event.target;
            if(isNotInToolsPannel(target) && /^(HTML|IFRAME)$/i.test(target.tagName) === false){
                if(isRecording){
                    var typedCharacter = String.fromCharCode(event.keyCode);
                    if(typedCharacter !== '' && /[\r\n]/.test(typedCharacter) === false){
                        saveCommand('sendKeys', {
                            keys: typedCharacter
                        });
                    }
                }
                else if(isStopEvent){
                    event.stopPropagation();
                    event.preventDefault();
                }
            }
        }, true);

        document.addEventListener('compositionend', function(event){
            var target = event.target;
            if(isNotInToolsPannel(target)){
                if(isRecording){
                    saveCommand('sendKeys', {
                        keys:event.data
                    });
                }
                else if(isStopEvent){
                    event.stopPropagation();
                    event.preventDefault();
                }
            }
        }, true);

        var lastScroll = {};
        var lastElementScrolls = {};
        var scrollEventTimer = null;
        // page scroll
        document.addEventListener('scroll', function(event){
            var target = event.target;
            if(isNotInToolsPannel(target)){
                if(isRecording){
                    var pageOffset = {
                        x: parseInt(window.pageXOffset, 10),
                        y: parseInt(window.pageYOffset, 10)
                    };
                    if(pageOffset.x !== lastScroll.x || pageOffset.y !== lastScroll.y){
                        scrollEventTimer && clearTimeout(scrollEventTimer);
                        scrollEventTimer = setTimeout(function(){
                            saveCommand('scrollTo', pageOffset);
                        }, 500);
                        lastScroll = pageOffset;
                    }
                }
                else if(isStopEvent){
                    event.stopPropagation();
                    event.preventDefault();
                }
            }
        }, true);
        // element scroll
        document.body.addEventListener('scroll', function(event){
            var target = event.target;
            if(isNotInToolsPannel(target) && target.offsetWidth > 5 && target.offsetHeight > 5){
                if(isRecording){
                    var elementOffset = {
                        x: parseInt(target.scrollLeft, 10),
                        y: parseInt(target.scrollTop, 10)
                    };
                    var path = getDomPath(target, true);
                    if(path !== null){
                        var lastElementScroll = lastElementScrolls[path] || {};
                        if(lastElementScroll && (elementOffset.x !== lastElementScroll.x || elementOffset.y !== lastElementScroll.y)){
                            scrollEventTimer && clearTimeout(scrollEventTimer);
                            scrollEventTimer = setTimeout(function(){
                                GlobalEvents.emit('showDomPath', path);
                                saveCommand('scrollElementTo', {
                                    path: path,
                                    x: elementOffset.x,
                                    y: elementOffset.y
                                });
                            }, 500);
                            lastElementScrolls[path] = elementOffset;
                        }
                    }
                }
                else if(isStopEvent){
                    event.stopPropagation();
                    event.preventDefault();
                }
            }
        }, true);
        function isMouseNotInScroll(event){
            var target = event.target;
            return !(target.clientWidth > 0 && event.offsetX >= target.clientWidth) && !(target.clientHeight > 0 && event.offsetY >= target.clientHeight);
        }
        // catch file change
        function isUploadElement(target){
            return isFileInput(target) || isUploadRole(target);
        }
        function isFileInput(target){
            return target.tagName === 'INPUT' && target.getAttribute('type') === 'file';
        }
        function isUploadRole(target){
            while(target){
                var role = target.getAttribute && (target.getAttribute('role') || target.getAttribute('data-role'));
                if(/^(upload|file)$/i.test(role)){
                    return true;
                }
                target = target.parentNode;
            }
            return false;
        }
        document.addEventListener('change', function(event){
            var target = event.target;
            if(isNotInToolsPannel(target)){
                if(isRecording){
                    if(isFileInput(target)){
                        var path = getDomPath(target, true);
                        var filepath = target.value || '';
                        var match = filepath.match(/[^\\\/]+$/);
                        if(path !== null && match !== null){
                            GlobalEvents.emit('showDomPath', path);
                            saveCommand('uploadFile', {
                                path: path,
                                filename: match[0],
                                text: getTargetText(target)
                            });
                        }
                    }
                    else if(target.tagName === 'SELECT'){
                        if(isDomVisible(target)){
                            // no record invisible select
                            var path = getDomPath(target);
                            if(path !== null){
                                var index = target.selectedIndex;
                                var option = target.options[index];
                                var value = option.getAttribute('value');
                                var type;
                                if(value){
                                    type = 'value';
                                }
                                else{
                                    type = 'index';
                                    value = index;
                                }
                                GlobalEvents.emit('showDomPath', path);
                                saveCommand('select', {
                                    path: path,
                                    type: type,
                                    value: value,
                                    text: getTargetText(target)
                                });
                            }
                        }
                    }
                }
                else if(isStopEvent){
                    event.stopPropagation();
                    event.preventDefault();
                }
            }
        }, true);
    }

    // 初始化dom
    function initRecorderDom(){
        var recorderLoaded = document.getElementById('uirecorderloaded');
        if(recorderLoaded){
            // 定时探测DOM是否被破坏
            setTimeout(initRecorderDom, 200);
            return;
        }

        // 加载探测
        recorderLoaded = document.createElement("span");
        recorderLoaded.id = 'uirecorderloaded';
        recorderLoaded.style.display = 'none';
        document.body.appendChild(recorderLoaded);

        // 初始化工具面板
        function initToolsPannel(){
            // tools pannel
            var baseUrl = chrome.extension.getURL("/");
            var divDomToolsPannel = document.createElement("div");
            divDomToolsPannel.id = 'uirecorder-tools-pannel';
            divDomToolsPannel.className = 'uirecorder';
            var arrHTML = [
                '<div style="padding:5px;color:#666;font-size:16px;"><strong>DomPath: </strong><span id="uirecorder-path"></span></div>',
                '<div style="padding:5px;color:#999;font-size:10px;">'+__('attr_switch')+'<span id="uirecorder-attrs"><span class="on">data-id</span></span></div>',
                '<div style="padding:5px;color:#999;font-size:10px;">'+__('attr_black')+'<input id="uirecorder-attrblack" value="'+strAttrValueBlack+'" placeholder="'+__('attr_black_tip')+'" style="border:1px solid #ccc;padding:3px;background:#f1f1f1;width:600px;" /></div>',
                '<div><span class="uirecorder-button"><a name="uirecorder-hover"><img src="'+baseUrl+'img/hover.png" alt="">'+__('button_hover_on_text')+'</a></span><span class="uirecorder-button"><a name="uirecorder-expect"><img src="'+baseUrl+'img/expect.png" alt="">'+__('button_expect_text')+'</a></span><span class="uirecorder-button"><a name="uirecorder-vars"><img src="'+baseUrl+'img/vars.png" alt="">'+__('button_vars_text')+'</a></span><span class="uirecorder-button"><a name="uirecorder-jscode"><img src="'+baseUrl+'img/jscode.png" alt="">'+__('button_jscode_text')+'</a></span><span class="uirecorder-button"><a name="uirecorder-sleep"><img src="'+baseUrl+'img/sleep.png" alt="">'+__('button_sleep_text')+'</a></span><span class="uirecorder-button"><a name="uirecorder-jump"><img src="'+baseUrl+'img/jump.png" alt="">'+__('button_jump_text')+'</a></span><span class="uirecorder-button"><a name="uirecorder-end"><img src="'+baseUrl+'img/end.png" alt="">'+__('button_end_text')+'</a></span></div>',
                '<span id="uirecorder-version">UIRecorder v'+pkgVersion+'</span>',
                '<style>#uirecorder-tools-pannel{position:fixed;z-index:2147483647;padding:20px;width:850px;box-sizing:border-box;border:1px solid #ccc;line-height:1;background:rgba(241,241,241,0.9);box-shadow: 5px 5px 10px #888888;bottom:10px;left:10px;cursor:move;text-align:left;}#uirecorder-path{border-bottom: dashed 1px #ccc;padding:2px;color:#FF7159;font-size:12px;}.uirecorder-button{cursor:pointer;margin: 5px;}.uirecorder-button a{text-decoration: none;color:#333333;font-family: arial, sans-serif;font-size: 12px;color: #777;text-shadow: 1px 1px 0px white;background: -webkit-linear-gradient(top, #ffffff 0%,#dfdfdf 100%);border-radius: 3px;box-shadow: 0 1px 3px 0px rgba(0,0,0,0.4);padding: 5px 7px;}.uirecorder-button a:hover{background: -webkit-linear-gradient(top, #ffffff 0%,#eee 100%);box-shadow: 0 1px 3px 0px rgba(0,0,0,0.4);}.uirecorder-button a:active{background: -webkit-linear-gradient(top, #dfdfdf 0%,#f1f1f1 100%);box-shadow: 0px 1px 1px 1px rgba(0,0,0,0.2) inset, 0px 1px 1px 0 rgba(255,255,255,1);}.uirecorder-button a img{display:inline-block;padding-right: 8px;position: relative;top: 2px;vertical-align:baseline;width:auto;height:auto;}#uirecorder-attrs span{text-align: center; border-radius:4px;padding:3px 5px;font-size:12px;text-decoration: none;margin:0px 3px;display: inline-block;cursor: pointer;}#uirecorder-attrs span.on{color:#777;background-color:#f3f3f3;box-shadow: 0 1px 3px 0px rgba(0,0,0,0.3);}#uirecorder-attrs span.off{color:#bbb;background-color: #eee;box-shadow: 0 1px 3px 0px rgba(0,0,0,0.2);}#uirecorder-version{position:absolute;top:10px;right:10px;color:#999;font-size:12px;}</style>'
            ];
            divDomToolsPannel.innerHTML = arrHTML.join('');
            var diffX = 0, diffY =0;
            var isDrag = false, isMove = false;
            divDomToolsPannel.addEventListener('selectstart', function(event){
                event.stopPropagation();
                event.preventDefault();
            });
            function onMouseDown(event){
                var touchEvent = event.targetTouches ? event.targetTouches[0] : event;
                diffX = touchEvent.clientX - divDomToolsPannel.offsetLeft;
                diffY = touchEvent.clientY - divDomToolsPannel.offsetTop;
                isDrag = true;
            }
            divDomToolsPannel.addEventListener('mousedown', onMouseDown);
            divDomToolsPannel.addEventListener('touchstart', onMouseDown);
            function onMouseMove(event){
                var touchEvent = event.targetTouches ? event.targetTouches[0] : event;
                if(isDrag && touchEvent.clientX > 0 && touchEvent.clientY > 0){
                    isMove = true;
                    event.stopPropagation();
                    event.preventDefault();
                    divDomToolsPannel.style.left = touchEvent.clientX - diffX + 'px';
                    divDomToolsPannel.style.top = touchEvent.clientY - diffY + 'px';
                    divDomToolsPannel.style.bottom = 'auto';
                    divDomToolsPannel.style.right = 'auto';
                }
            }
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('touchmove', onMouseMove);
            function onMouseUp(event){
                if(isMove){
                    event.stopPropagation();
                    event.preventDefault();
                }
                isMove = false;
                isDrag = false;
            }
            divDomToolsPannel.addEventListener('mouseup', onMouseUp);
            divDomToolsPannel.addEventListener('touchend', onMouseUp);
            divDomToolsPannel.addEventListener('click', function(event){
                event.stopPropagation();
                event.preventDefault();
                var ctrlKey = event.metaKey || event.ctrlKey
                var target = event.target;
                var parentNode = target.parentNode;
                if(parentNode && parentNode.id === 'uirecorder-attrs'){
                    GlobalEvents.emit('updatePathAttr', {
                        name: target.textContent,
                        on: !(target.className === 'on')
                    });
                }
                else{
                    if(target.tagName === 'IMG'){
                        target = parentNode;
                    }
                    var name = target.name;
                    var tmpLastWordMode = lastWorkMode;
                    switch(name){
                        case 'uirecorder-hover':
                            hideDialog();
                            hoverMode = !hoverMode;
                            target.childNodes[1].nodeValue = hoverMode ? __('button_hover_off_text') : __('button_hover_on_text');
                            if(hoverMode){
                                showSelector(function(domInfo){
                                    // 使事件可以触发
                                    setGlobalWorkMode('pauseRecord');
                                    // 添加悬停
                                    GlobalEvents.emit('addHover', domInfo);
                                    if(ctrlKey){
                                        // 持续悬停模式，继续添加悬停
                                        setGlobalWorkMode('select');
                                    }
                                    else{
                                        // 单一悬停模式
                                        hoverMode = false;
                                        target.childNodes[1].nodeValue = __('button_hover_on_text');
                                        setGlobalWorkMode('record');
                                    }
                                });
                            }
                            else{
                                setGlobalWorkMode('record');
                            }
                            break;
                        case 'uirecorder-sleep':
                            showSleepDailog();
                            break;
                        case 'uirecorder-expect':
                            hideDialog();
                            if(hideBeforeExpect){
                                hideDom(hideBeforeExpect);
                            }
                            showSelector(function(domInfo){
                                if(hideBeforeExpect){
                                    showDom(hideBeforeExpect);
                                }
                                showExpectDailog(domInfo, function(frameId, expectData){
                                    if(expectData.type === 'alert'){
                                        lastAlertExpect = expectData;
                                    }
                                    else{
                                        GlobalEvents.emit('addExpect', {
                                            frame: frameId,
                                            data: expectData
                                        })
                                    }
                                    setGlobalWorkMode(tmpLastWordMode);
                                });
                            });
                            break;
                        case 'uirecorder-vars':
                            hideDialog();
                            showSelector(function(domInfo){
                                showVarsDailog(domInfo, function(varInfo){
                                    var varType = varInfo.type;
                                    delete varInfo['type'];
                                    if(varType === 'update'){
                                        GlobalEvents.emit('updateVar', {
                                            frame: domInfo.frame,
                                            varinfo: varInfo
                                        });
                                    }
                                    else{
                                        GlobalEvents.emit('insertVar', {
                                            frame: domInfo.frame,
                                            path: domInfo.path,
                                            varinfo: varInfo
                                        });
                                    }
                                    setGlobalWorkMode(tmpLastWordMode);
                                });
                            });
                            break;
                        case 'uirecorder-jscode':
                            hideDialog();
                            showSelector(function(domInfo){
                                showJSCodeDialog(domInfo, function(code){
                                    GlobalEvents.emit('eval', {
                                        frame: domInfo.frame,
                                        code: code
                                    });
                                    setGlobalWorkMode('record');
                                });
                            });
                            break;
                        case 'uirecorder-jump':
                            showJumpDailog();
                            break;
                        case 'uirecorder-end':
                            chrome.runtime.sendMessage({
                                type: 'save'
                            });
                            break;
                    }
                }
            });
            function showSelector(callback){
                domSelectorCallback = callback;
                setGlobalWorkMode('select');
            }
            document.body.appendChild(divDomToolsPannel);
            spanShowDomPath = document.getElementById('uirecorder-path');
            // attr container
            divAttrsContainer = document.getElementById('uirecorder-attrs');
            updateAttrsContainer();
            // attr value black editor
            var txtUirecorderAttrBlack = document.getElementById('uirecorder-attrblack');
            txtUirecorderAttrBlack.addEventListener('change', function(event){
                var newAttrBlack = txtUirecorderAttrBlack.value;
                try{
                    reAttrValueBlack = eval(newAttrBlack);
                    strAttrValueBlack = newAttrBlack;
                    saveCommand('!updateAttrValueBlack', newAttrBlack);
                }
                catch(e){
                    alert(e);
                }
            });
            // 对话框
            var divDomDialog = document.createElement("div");
            var isShowDialog = false;
            var okCallback = null;
            var cancelCallback = null;
            divDomDialog.id = 'uirecorder-dialog';
            divDomDialog.className = 'uirecorder';
            var arrHTML = [
                '<h2 id="uirecorder-dialog-title"></h2>',
                '<div id="uirecorder-dialog-content"></div>',
                '<div style="padding-bottom:10px;text-align:center;"><span class="uirecorder-button"><a name="uirecorder-ok"><img src="'+baseUrl+'img/ok.png" alt="">'+__('dialog_ok')+'</a></span><span class="uirecorder-button"><a name="uirecorder-cancel"><img src="'+baseUrl+'img/cancel.png" alt="">'+__('dialog_cancel')+'</a></span></div>',
                '<style>#uirecorder-dialog{display:none;position:fixed;z-index:2147483647;padding:20px;top:50%;left:50%;min-width:480px;margin-left:-240px;margin-top:-160px;box-sizing:border-box;border:1px solid #ccc;background:rgba(241,241,241,1);box-shadow: 5px 5px 10px #888888;color:black}#uirecorder-dialog h2{padding-bottom:10px;border-bottom: solid 1px #ccc;margin-bottom:10px;color:#333;}#uirecorder-dialog ul{list-style:none;padding:0;}#uirecorder-dialog li{padding: 5px 0 5px 30px;margin:0;}#uirecorder-dialog li label{display:inline-block;width:100px;color:#666}#uirecorder-dialog li input,#uirecorder-dialog li select,#uirecorder-dialog li textarea{display:inline-block;font-size:16px;border:1px solid #ccc;border-radius:2px;padding:5px}#uirecorder-dialog li input,#uirecorder-dialog li textarea{width:250px;}</style>'
            ];
            divDomDialog.innerHTML = arrHTML.join('');
            document.body.appendChild(divDomDialog);
            var domDialogTitle = document.getElementById('uirecorder-dialog-title');
            var domDialogContent = document.getElementById('uirecorder-dialog-content');
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
                        cancelCallback();
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
                        break;
                }
            }, true);
            // 显示对话框
            function showDialog(title, content, events){
                domDialogTitle.innerHTML = title;
                domDialogContent.innerHTML = content;
                okCallback = events.onOk;
                cancelCallback = events.onCancel;
                divDomDialog.style.display = 'block';
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
                isShowDialog = false;
            }
            function showExpectDailog(expectTarget, callback){
                var arrHtmls = [
                    '<ul>',
                    '<li><label>'+__('dialog_expect_sleep')+'</label><input id="uirecorder-expect-sleep" type="text" /> ms</li>',
                    '<li><label>'+__('dialog_expect_type')+'</label><select id="uirecorder-expect-type" value=""><option>val</option><option>text</option><option>displayed</option><option>enabled</option><option>selected</option><option>attr</option><option>css</option><option>url</option><option>title</option><option>cookie</option><option>localStorage</option><option>sessionStorage</option><option>alert</option><option>jscode</option><option>count</option><option>imgdiff</option></select></li>',
                    '<li id="uirecorder-expect-dom-div"><label>'+__('dialog_expect_dom')+'</label><input id="uirecorder-expect-dom" type="text" /></li>',
                    '<li id="uirecorder-expect-param-div"><label>'+__('dialog_expect_param')+'</label><textarea id="uirecorder-expect-param"></textarea></li>',
                    '<li><label>'+__('dialog_expect_compare')+'</label><select id="uirecorder-expect-compare"><option>equal</option><option>notEqual</option><option>contain</option><option>notContain</option><option>above</option><option>below</option><option>match</option><option>notMatch</option></select></li>',
                    '<li><label>'+__('dialog_expect_to')+'</label><textarea id="uirecorder-expect-to"></textarea></li>',
                    '</ul>'
                ];
                var domExpectDomDiv, domExpectParamDiv, domExpectSleep, domExpectType, domExpectDom, domExpectParam, domExpectCompare, domExpectTo;
                var reDomRequire = /^(val|text|displayed|enabled|selected|attr|css|count|imgdiff)$/;
                var reParamRequire = /^(attr|css|cookie|localStorage|sessionStorage|alert|jscode)$/;
                showDialog(__('dialog_expect_title'), arrHtmls.join(''), {
                    onInit: function(){
                        // 初始化dom及事件
                        domExpectDomDiv = document.getElementById('uirecorder-expect-dom-div');
                        domExpectParamDiv = document.getElementById('uirecorder-expect-param-div');
                        domExpectSleep = document.getElementById('uirecorder-expect-sleep');
                        domExpectType = document.getElementById('uirecorder-expect-type');
                        domExpectDom = document.getElementById('uirecorder-expect-dom');
                        domExpectParam = document.getElementById('uirecorder-expect-param');
                        domExpectCompare = document.getElementById('uirecorder-expect-compare');
                        domExpectTo = document.getElementById('uirecorder-expect-to');
                        domExpectType.onchange = function(){
                            var type = domExpectType.value;
                            domExpectDomDiv.style.display = reDomRequire.test(type) ? 'block' : 'none';
                            domExpectParamDiv.style.display = reParamRequire.test(type) ? 'block' : 'none';
                            switch(type){
                                case 'alert':
                                    domExpectParam.value = 'mouseUp';
                                    break;
                                case 'imgdiff':
                                    domExpectCompare.value = 'below';
                                    domExpectTo.value = 5;
                                    break;
                            }
                            refreshToValue();
                        };
                        domExpectParam.onchange = refreshToValue
                        function refreshToValue(){
                            var type = domExpectType.value;
                            var param = domExpectParam.value;
                            switch(type){
                                case 'url':
                                    domExpectTo.value = location.href;
                                    break;
                                case 'title':
                                    domExpectTo.value = document.title;
                                    break;
                                case 'cookie':
                                    if(param){
                                        domExpectTo.value = getCookie(param) || '';
                                    }
                                    break;
                                case 'localStorage':
                                    if(param){
                                        domExpectTo.value = localStorage.getItem(param) || '';
                                    }
                                    break;
                                case 'sessionStorage':
                                    if(param){
                                        domExpectTo.value = sessionStorage.getItem(param) || '';
                                    }
                                    break;
                                case 'imgdiff':
                                    break;
                                default:
                                    // 到iframe中获取默认值
                                    getDomValue(type, expectTarget, param, function(value){
                                        domExpectTo.value = value;
                                    });
                            }
                        }
                        // 初始化默认值
                        domExpectSleep.value = '300';
                        domExpectType.value = 'val';
                        domExpectDom.value = expectTarget.path;
                        domExpectParam.value = '';
                        domExpectCompare.value = 'equal';
                        domExpectTo.value = '';
                        domExpectType.onchange();
                    },
                    onOk: function(){
                        var sleep = domExpectSleep.value;
                        var type = domExpectType.value;
                        var arrParams = [];
                        reDomRequire.test(type) && arrParams.push(domExpectDom.value);
                        reParamRequire.test(type) && arrParams.push(domExpectParam.value);
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
                        var expectData = {
                            sleep: sleep || 300,
                            type: type,
                            params: arrParams,
                            compare:compare,
                            to: to
                        };
                        callback(expectTarget.frame, expectData);
                        hideDialog();
                    },
                    onCancel: function(){
                        setGlobalWorkMode('record');
                    }
                });
            }
            function showVarsDailog(domInfo, callback){
                var arrHtmls = [
                    '<ul>',
                    '<li><label>'+__('dialog_vars_type')+'</label><select id="uirecorder-vars-type"><option value="insert" selected>'+__('dialog_vars_type_insert')+'</option><option value="update">'+__('dialog_vars_type_update')+'</option></select></li>',
                    '<li><label>'+__('dialog_vars_name')+'</label><span id="uirecorder-vars-namearea"><select id="uirecorder-vars-name" value="">',
                ];
                for(var name in testVars){
                    arrHtmls.push('<option>'+name+'</option>');
                }
                arrHtmls.push('</select> <a href="#" id="uirecorder-vars-addname">'+__('dialog_vars_addname')+'</a></span></li>');
                arrHtmls.push('<li style="display:none"><label>'+__('dialog_vars_update_type')+'</label><select id="uirecorder-vars-update-type" value=""><option>val</option><option>text</option><option>attr</option><option>css</option><option>url</option><option>title</option><option>cookie</option><option>localStorage</option><option>sessionStorage</option></select></li>');
                arrHtmls.push('<li style="display:none"><label>'+__('dialog_vars_update_dom')+'</label><input id="uirecorder-vars-dompath" type="text" /></li>');
                arrHtmls.push('<li style="display:none"><label>'+__('dialog_vars_update_param')+'</label><input id="uirecorder-vars-update-param" type="text" value="" /></li>');
                arrHtmls.push('<li style="display:none"><label>'+__('dialog_vars_update_regex')+'</label><input id="uirecorder-vars-update-regex" type="text" value="/(.*)/" /></li>');
                arrHtmls.push('<li><label>'+__('dialog_vars_value')+'</label><input id="uirecorder-vars-value" type="text" readonly /></li>');
                arrHtmls.push('<li><label>'+__('dialog_vars_template')+'</label><input id="uirecorder-vars-template" type="text" /></li>');
                arrHtmls.push('<li><label>'+__('dialog_vars_template_result')+'</label><input id="uirecorder-vars-template-result" type="text" readonly /></li>');
                arrHtmls.push('</ul>');
                var reDomRequire = /^(val|text|displayed|enabled|selected|attr|css)$/;
                var reParamRequire = /^(attr|css|cookie|localStorage|sessionStorage)$/;
                var isNewName = false; // 是否新变量
                var domVarsDomPath;
                var domVarsType, domVarsNameArea, domVarsName, domVarsTemplate, domVarsTemplateResult, domVarsAddName, domVarsValue;
                var domVarsUpdateType, domVarsUpdateParam, domVarsUpdateRegex;

                var tempTestVars = {};
                function getTempVarStr(str){
                    if(typeof str === 'string'){
                        return str.replace(/\{\{(.+?)\}\}/g, function(all, key){
                            return tempTestVars[key] || '';
                        });
                    }
                    else{
                        return str;
                    }
                }
                showDialog(__('dialog_vars_title'), arrHtmls.join(''), {
                    onInit: function(){
                        // 初始化dom及事件
                        domVarsDomPath = document.getElementById('uirecorder-vars-dompath');
                        domVarsDomPath.value = domInfo.path;
                        domVarsType = document.getElementById('uirecorder-vars-type');
                        domVarsNameArea = document.getElementById('uirecorder-vars-namearea');
                        domVarsName = document.getElementById('uirecorder-vars-name');
                        domVarsTemplate = document.getElementById('uirecorder-vars-template');
                        domVarsTemplateResult = document.getElementById('uirecorder-vars-template-result');
                        domVarsAddName = document.getElementById('uirecorder-vars-addname');
                        domVarsUpdateType = document.getElementById('uirecorder-vars-update-type');
                        domVarsUpdateParam = document.getElementById('uirecorder-vars-update-param');
                        domVarsUpdateRegex = document.getElementById('uirecorder-vars-update-regex');
                        domVarsValue = document.getElementById('uirecorder-vars-value');
                        domVarsAddName.onclick = function(){
                            var oldVarsNameOnchange = domVarsName.onchange;
                            domVarsNameArea.innerHTML = '<input id="uirecorder-vars-name" type="text" attr-new="1" >';
                            domVarsName = document.getElementById('uirecorder-vars-name');
                            domVarsName.value = '';
                            domVarsValue.value = '';
                            domVarsName.focus();
                            domVarsName.onchange = oldVarsNameOnchange;
                            domVarsValue.readOnly = domVarsType.value === 'insert' ? false : true;
                            isNewName = true;
                        }
                        domVarsType.onchange = function(){
                            var varType = domVarsType.value;
                            domVarsTemplate.parentNode.style.display = varType === 'insert'?'block':'none';
                            domVarsTemplateResult.parentNode.style.display = varType === 'insert'?'block':'none';
                            domVarsUpdateType.parentNode.style.display = varType === 'update'?'block':'none';
                            domVarsDomPath.parentNode.style.display = varType === 'update'?'block':'none';
                            domVarsUpdateRegex.parentNode.style.display = varType === 'update'?'block':'none';
                            domVarsUpdateParam.parentNode.style.display = varType === 'update'?'block':'none';
                            switch(varType){
                                case 'insert':
                                    domVarsName.onchange();
                                    break;
                                case 'update':
                                    domVarsUpdateType.onchange();
                                    break;
                            }
                            setDialogCenter();
                        }
                        domVarsName.onchange = function(){
                            var type = domVarsType.value;
                            if(type === 'insert'){
                                tempTestVars = Object.assign({}, testVars);
                                var varValue = tempTestVars[domVarsName.value] || '';
                                domVarsValue.value = varValue;
                                domVarsTemplate.value = '{{'+domVarsName.value+'}}';
                                domVarsValue.onchange();
                            }
                            else{
                                refreshToValue();
                            }
                        };
                        domVarsValue.onchange = function(){
                            var varName = domVarsName.value;
                            var varValue = domVarsValue.value;
                            if(varName){
                                tempTestVars[varName] = varValue;
                            }
                            domVarsTemplate.onchange();
                        }
                        domVarsTemplate.onchange = function(){
                            var template = domVarsTemplate.value;
                            try{
                                template = eval('\`'+template+'\`');
                            }
                            catch(e){
                                alert(e);
                                template = '';
                            }
                            domVarsTemplateResult.value = getTempVarStr(template);
                        }
                        function refreshToValue(){
                            var type = domVarsUpdateType.value;
                            var param = domVarsUpdateParam.value;
                            var newValue = '';
                            switch(type){
                                case 'url':
                                    newValue = location.href;
                                    break;
                                case 'title':
                                    newValue = document.title;
                                    break;
                                case 'cookie':
                                    if(param){
                                        newValue = getCookie(param) || '';
                                    }
                                    break;
                                case 'localStorage':
                                    if(param){
                                        newValue = localStorage.getItem(param) || '';
                                    }
                                    break;
                                case 'sessionStorage':
                                    if(param){
                                        newValue = sessionStorage.getItem(param) || '';
                                    }
                                    break;
                                default:
                                    domInfo.path = domVarsDomPath.value;
                                    // 到iframe中获取默认值
                                    getDomValue(type, domInfo, param, setUpdateValue);
                            }
                            setUpdateValue(newValue);
                        }
                        function setUpdateValue(value){
                            var newValue = '';
                            try{
                                var reUpdate = domVarsUpdateRegex.value;
                                if(reUpdate){
                                    try{
                                        var match = value.match(eval(reUpdate));
                                        if(match){
                                            newValue = match[1];
                                        }
                                    }
                                    catch(e){
                                        alert(e);
                                    }
                                }
                                else{
                                    newValue = value;
                                }
                            }
                            catch(e){}
                            domVarsValue.value = newValue;
                        }
                        domVarsUpdateType.onchange = function(){
                            var updateType = domVarsUpdateType.value;
                            domVarsDomPath.parentNode.style.display = reDomRequire.test(updateType) ? 'block' : 'none';
                            domVarsUpdateParam.parentNode.style.display = reParamRequire.test(updateType)?'block':'none';
                            domVarsName.onchange();
                            setDialogCenter();
                        };
                        domVarsUpdateParam.onchange = domVarsName.onchange;
                        domVarsUpdateRegex.onchange = domVarsName.onchange;
                        domVarsDomPath.onchange = domVarsName.onchange;
                        domVarsName.onchange();
                    },
                    onOk: function(){
                        var type = domVarsType.value;
                        switch(type){
                            case 'insert':
                                var varName = domVarsName.value;
                                var varValue = domVarsValue.value;
                                var template = domVarsTemplate.value;
                                try{
                                    eval('\`'+template+'\`');
                                }
                                catch(e){
                                    return alert(e);
                                }
                                if(isNewName && testVars[varName] !== undefined){
                                    domVarsName.focus();
                                    return alert(__('dialog_vars_name_duplicated'));
                                }
                                callback({
                                    type: type,
                                    name: varName,
                                    value: varValue,
                                    isNew: isNewName,
                                    template: template
                                });
                                break;
                            case 'update':
                                var varName = domVarsName.value;
                                var updateType = domVarsUpdateType.value;
                                var arrParams = [];
                                reDomRequire.test(updateType) && arrParams.push(domVarsDomPath.value);
                                reParamRequire.test(updateType) && arrParams.push(domVarsUpdateParam.value);
                                testVars[varName] = domVarsValue.value;
                                callback({
                                    type: type,
                                    name: varName,
                                    updateType: updateType,
                                    updateParams: arrParams,
                                    updateRegex: domVarsUpdateRegex.value,
                                    isNew: isNewName
                                });
                                break;
                        }
                        hideDialog();
                    },
                    onCancel: function(){
                        setGlobalWorkMode('record');
                    }
                });
            }

            function showSleepDailog(){
                var strHtml = '<ul><li><label>'+__('dialog_sleep_time')+'</label><input type="text" value="1000" placeholder="'+__('dialog_sleep_time_tip')+'" id="uirecorder-sleeptime"> ms</li></ul>';
                setGlobalWorkMode('pauseAll');
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
                            setGlobalWorkMode('record');
                        }
                        else{
                            domSleepTime.focus();
                            alert('dialog_sleep_time_tip');
                        }
                    },
                    onCancel: function(){
                        setGlobalWorkMode('record');
                    }
                });
            }

            function showJSCodeDialog(domInfo, callback){
                var strHtml = '<ul><li><label>'+__('dialog_jscode_code')+'</label><textarea placeholder="'+__('dialog_jscode_tip')+'" id="uirecorder-code" style="vertical-align:top;height:100px;width:400px;white-space:nowrap; overflow:scroll;"></textarea></li></ul>';
                setGlobalWorkMode('pauseAll');
                var domCode;
                showDialog(__('dialog_jscode_title'), strHtml, {
                    onInit: function(){
                       domCode = document.getElementById('uirecorder-code');
                       domCode.select();
                       domCode.focus();
                    },
                    onOk: function(){
                        var code = domCode.value;
                        if(code){
                            callback(code);
                            hideDialog();
                        }
                        else{
                            domCode.focus();
                            alert(__('dialog_jscode_tip'));
                        }
                    },
                    onCancel: function(){
                        setGlobalWorkMode('record');
                    }
                });
            }

            function showJumpDailog(){
                var arrHtmls = [
                    '<ul>',
                    '<li><label>'+__('dialog_jump_target')+'</label><input type="search" placeholder="'+__('jump_placeholder')+'" id="uirecorder-target" list="uirecorder-commons" style="font-size:12px;"><datalist id="uirecorder-commons">',
                ];
                for(var i in specLists){
                    arrHtmls.push('<option>'+specLists[i]+'</option>');
                }
                arrHtmls.push('</datalist></li>');
                arrHtmls.push('</ul>');
                setGlobalWorkMode('pauseAll');
                var domTarget;
                showDialog(__('dialog_jump_title'), arrHtmls.join(''), {
                    onInit: function(){
                       domTarget = document.getElementById('uirecorder-target');
                       domTarget.focus();
                    },
                    onOk: function(){
                        var target = domTarget.value;
                        target = target.replace(/^\s+|\s+$/g, '');
                        if(/^([\w-]+\.)+(com|net|org|com\.cn)(\s+|$)/.test(target)){
                            target = 'http://' + target;
                        }
                        var varStr = target;
                        try{
                            varStr = eval('\`'+varStr+'\`');
                        }
                        catch(e){
                            return alert(e);
                        }
                        varStr = getVarStr(varStr);
                        if(/^https?:\/\//i.test(target) || /^https?:\/\//i.test(varStr)){
                            saveCommand('url', target);
                            location.href = varStr;
                            setGlobalWorkMode('record');
                        }
                        else if(/\.js$/.test(target)){
                            setGlobalWorkMode('pauseRecord');
                            saveCommand('module', target);
                        }
                        else{
                            domTarget.focus();
                            return alert(__('jump_alert'));
                        }
                        hideDialog();
                    },
                    onCancel: function(){
                        setGlobalWorkMode('record');
                    }
                });
            }
        }

        if(isIframe === false){
            initToolsPannel();
        }
        isRecording = true;

        // 定时探测DOM是否被破坏
        setTimeout(initRecorderDom, 200);
    }

})();
