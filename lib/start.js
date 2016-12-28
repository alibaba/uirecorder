var path = require('path');
var fs = require('fs');
var os = require('os');
var http = require('http');
var url = require('url');
var cp = require('child_process');
var inquirer = require('inquirer');
var async = require('async');
var co = require('co');
var chai = require("chai");
var should = chai.should();
var JWebDriver = require('jwebdriver');
chai.use(JWebDriver.chaiSupportChainPromise);
var xml2map = require('xml2map');
var chromedriver = require('chromedriver');

var faker = require('faker');
var WebSocketServer = require('websocket').server;
var i18n = require('./i18n');
var colors = require('colors');

var symbols = {
  ok: '✓',
  err: '✖'
};
if (process.platform === 'win32') {
  symbols.ok = '\u221A';
  symbols.err = '\u00D7';
}

var wsConnection;

var rootPath = getRootPath();

function startRecorder(options){
    var locale = options.locale;
    var cmdFilename = options.cmdFilename;
    var mobile = options.mobile;
    var debug = options.debug;
    if(locale){
        i18n.setLocale(locale);
    }
    var runtime = process.env['runtime'] || '';
    var configPath = 'config'+(runtime ? '-' + runtime : '') + '.json';
    console.log('? '.green+__('config_file').bold+' ' + configPath.cyan+'');
    var configFile = path.resolve(rootPath + '/' + configPath);
    var configJson = {};
    if(fs.existsSync(configFile)){
        var content = fs.readFileSync(configFile).toString();
        try{
            configJson = JSON.parse(content);
        }
        catch(e){
            console.log(configPath.bold+' ' + __('json_parse_failed').red);
            process.exit(1);
        }
    }
    else{
        console.log(configPath.bold+' '+__('file_missed').red);
        process.exit(1);
    }
    if(!configJson.webdriver){
        console.log(__('please_reinit').red);
        process.exit(1);
    }
    var recorderConfig = configJson.recorder || {};
    var pathAttrs = recorderConfig.pathAttrs;
    var attrValueBlack = recorderConfig.attrValueBlack;
    var testVars = configJson.vars;
    var isConfigEdited = false;
    var hostsPath = 'hosts' + (runtime ? '-'+runtime : '');
    var hostsFile = path.resolve(rootPath + '/' + hostsPath);
    var hosts = '';
    if(fs.existsSync(hostsFile)){
        if(!mobile){
            console.log('? '.green+__('hosts_file').bold+' ' + hostsPath.cyan+'');
        }
        hosts = fs.readFileSync(hostsFile).toString();
    }
    // read spec list
    var commonSpecRelPath = 'commons/';
    var commonSpecPath = rootPath + '/' + commonSpecRelPath;
    if(fs.existsSync(commonSpecPath) == false || fs.statSync(commonSpecPath).isDirectory() === false){
        commonSpecRelPath = '';
        commonSpecPath = rootPath;
    }
    var dirList = fs.readdirSync(commonSpecPath);
    var specLists = [];
    dirList.forEach(function(item){
        if(/.*\.js$/.test(item)){
            specLists.push(commonSpecRelPath + item);
        }
    });

    startChromeDriver();

    var questions = [];
    if(mobile){
       questions = [
            {
                'type': 'input',
                'name': 'fileName',
                'message': __('input_spec_name'),
                'default': cmdFilename || 'sample/test.spec.js',
                'filter': function(input){
                    return input.replace(/(^\s+|\s+$)/g, '').replace(/\\/g,'/');
                },
                'validate': function(input){
                    return input !== '' && /\.js$/.test(input);
                }
            },
            {
                'type': 'input',
                'name': 'mobileAppPath',
                'message': __('mobile_app_path'),
                'default': '',
                'filter': function(input){
                    return input.replace(/(^\s+|\s+$)/g, '');
                },
                'validate': function(input){
                    return /\.(apk|app)$/.test(input) && fs.existsSync(input);
                }
            }
        ];
    }
    else{
       questions = [
            {
                'type': 'input',
                'name': 'fileName',
                'message': __('input_spec_name'),
                'default': cmdFilename || 'sample/test.spec.js',
                'filter': function(input){
                    return input.replace(/(^\s+|\s+$)/g, '').replace(/\\/g,'/');
                },
                'validate': function(input){
                    return input !== '' && /\.js$/.test(input);
                }
            },
            {
                'type': 'confirm',
                'name': 'checker',
                'message': __('open_checker_browser'),
                'default': true
            },
            {
                'type': 'input',
                'name': 'browserSize',
                'message': __('browser_size'),
                'default': 'maximize',
                'filter': function(input){
                    return input.replace(/(^\s+|\s+$)/g, '');
                },
                'validate': function(input){
                    return input === 'maximize' || /^\d+\s*[x, ]\s*\d+$/.test(input);
                }
            }
        ];
    }
    inquirer.prompt(questions).then(function(anwsers){
        var fileName = anwsers.fileName;
        var openChecker = anwsers.checker;
        var browserSize = anwsers.browserSize || '';
        var match = browserSize.match(/^(\d+)\s*[x, ]\s*(\d+)$/);
        if(match){
            browserSize = [ parseInt(match[1], 10), parseInt(match[2], 10)];
        }
        else{
            browserSize = null;
        }
        var mobileAppPath = anwsers.mobileAppPath;

        var arrTestCodes = [];
        var recorderBrowser, checkerBrowser, recorderMobileApp;
        var lastWindowId = 0;
        var lastFrameId = null;
        var lastTestTitle = '';
        var arrLastTestCodes = [];
        var allCaseCount = 0;
        var failedCaseCount = 0;
        function escapeStr(str){
            return str.replace(/\'/g, "\\'").replace(/\\/g, '\\\\').replace(/\n/g, '\\n');
        }
        function pushTestCode(cmd, text, ext, codes){
            var title = cmd +': ';
            title += text ? text + ' ( '+ext+' )' : ext;
            lastTestTitle = title;
            arrLastTestCodes = [];
            if(Array.isArray(codes)){
                codes.forEach(function(line){
                    arrLastTestCodes.push('    '+line);
                });
            }
            else{
                arrLastTestCodes.push('    '+codes);
            }
            title = title.replace(/^\w+:/, function(all){
                return all.cyan;
            });
            console.log('  '+title);
        }
        function saveTestCode(success, error){
            if(checkerBrowser || recorderMobileApp){
                if(success){
                    console.log('   '+symbols.ok.green+__('exec_succeed').green);
                }
                else{
                    console.log('   '+symbols.err.red+__('exec_failed').red, error);
                }
            }
            allCaseCount ++;
            if(!success){
                failedCaseCount ++;
            }
            if(arrLastTestCodes.length > 0){
                (checkerBrowser || recorderMobileApp) && sendWsMessage('checkResult', {
                    title: lastTestTitle,
                    success: success
                });
                if(!success){
                    lastTestTitle = '\u00D7 ' + lastTestTitle;
                }
                arrTestCodes.push('it(\''+escapeStr(lastTestTitle)+'\', function(){');
                arrTestCodes = arrTestCodes.concat(arrLastTestCodes);
                arrTestCodes.push("});");
                arrTestCodes.push("");
                lastTestTitle = '';
                arrLastTestCodes = [];
            }
        }
        var cmdQueue = async.priorityQueue(function(cmdInfo, next) {
            var window = cmdInfo.window;
            var frame = cmdInfo.frame;
            var cmd = cmdInfo.cmd;
            var data = cmdInfo.data;
            if(cmd === 'updateMobile'){
                if(recorderMobileApp){
                    var screenshot;
                    recorderMobileApp.getScreenshot(function(error, png64){
                        screenshot = png64;
                    }).source(function(error, source){
                        if(screenshot && source){
                            sendWsMessage('mobileAppInfo', {
                                screenshot: screenshot,
                                source: xml2map.tojson(source)
                            });
                            next();
                        }
                    });
                }
                else{
                    next();
                }
                return;
            }
            else if(cmd === 'end'){
                return next();
            }
            var arrTasks = [];
            arrTasks.push(function(callback){
                if(mobile){
                    // skip window switch when mobile mode
                    return callback();
                }
                function doNext(){
                    saveTestCode(true);
                    callback();
                }
                function catchError(error){
                    saveTestCode(false, error);
                    callback();
                }
                if(window !== lastWindowId){
                    lastWindowId = window;
                    lastFrameId = null;
                    pushTestCode('switchWindow', '', window, 'return driver.sleep(500).switchWindow('+window+');')
                    checkerBrowser && checkerBrowser.sleep(500).switchWindow(window).then(doNext).catch(catchError) || doNext();
                }
                else{
                    callback();
                }
            });
            arrTasks.push(function(callback){
                if(mobile){
                    // skip frame switch when mobile mode
                    return callback();
                }
                function doNext(){
                    saveTestCode(true);
                    callback();
                }
                function catchError(error){
                    saveTestCode(false, error);
                    callback();
                }
                if(frame !== lastFrameId){
                    lastFrameId = frame;
                    var arrCodes = [];
                    if(frame !== null){
                        arrCodes.push('return driver.switchFrame(null)');
                        arrCodes.push('       .wait(\''+frame+'\', 30000).then(function(element){');
                        arrCodes.push('           return this.switchFrame(element).wait(\'body\');');
                        arrCodes.push('       });');
                    }
                    else{
                        arrCodes.push('return driver.switchFrame(null);');
                    }
                    pushTestCode('switchFrame', '', frame, arrCodes);
                    checkerBrowser && checkerBrowser.switchFrame(null, function(error){
                        if(frame !== null){
                            return this.wait(frame, 10000).then(function(element){
                                return this.switchFrame(element).wait('body');
                            });
                        }
                    }).then(doNext).catch(catchError) || doNext();
                }
                else{
                    callback();
                }

            });
            arrTasks.push(function(callback){
                function doNext(){
                    saveTestCode(true);
                    callback();
                }
                function catchError(error){
                    saveTestCode(false, error);
                    callback();
                }
                var arrCodes = [];
                if(mobile){
                    switch(cmd){
                        case 'click':
                            if(data.path){
                                pushTestCode('click', data.text, data.path, 'return driver.wait(\''+escapeStr(data.path)+'\', 30000).click();');
                                recorderMobileApp.wait(data.path, 10000).click().then(doNext).catch(catchError);
                            }
                            else{
                                pushTestCode('click', '', data.x+', '+data.y, 'return driver.mouseMove('+data.x+', '+data.y+').click(0);');
                                recorderMobileApp.mouseMove(data.x, data.y).click(0).then(doNext).catch(catchError);
                            }
                            break;
                        case 'swipe':
                            pushTestCode('swipe', '', data.startX+', '+data.startY+', '+data.endX+', '+data.endY+', '+data.duration, 'return driver.touchSwipe('+data.startX+', '+data.startY+', '+data.endX+', '+data.endY+', '+data.duration+');');
                            recorderMobileApp.touchSwipe(data.startX, data.startY, data.endX, data.endY, data.duration).then(doNext).catch(catchError);
                            break;
                        case 'val':
                            pushTestCode('val', '', data.keys, 'return driver.val(\''+escapeStr(data.keys)+'\');');
                            recorderMobileApp.val(data.keys).then(doNext).catch(catchError);
                            break;
                        default:
                            callback();
                            break;
                    }
                }
                else{
                    var reDomRequire = /^(val|text|displayed|enabled|selected|attr|css)$/;
                    var reParamRequire = /^(attr|css|cookie|localStorage|sessionStorage|alert)$/;
                    switch(cmd){
                        case 'url':
                            pushTestCode('url', '', data, 'return driver.url(_(\''+escapeStr(data)+'\'));');
                            checkerBrowser && checkerBrowser.url(getVarStr(data)).then(doNext).catch(catchError) || doNext();
                            break;
                        case 'closeWindow':
                            pushTestCode('closeWindow', '', '', 'return driver.closeWindow();');
                            checkerBrowser && checkerBrowser.closeWindow().then(doNext).catch(catchError) || doNext();
                            break;
                        case 'sleep':
                            pushTestCode('sleep', '', data.time, 'return driver.sleep('+data.time+');');
                            checkerBrowser && checkerBrowser.sleep(data.time).then(doNext).catch(catchError) || doNext();
                            break;
                        case 'waitBody':
                            pushTestCode('waitBody', '', '', 'return driver.sleep(500).wait(\'body\', 30000);');
                            checkerBrowser && checkerBrowser.sleep(500).wait('body', 10000).then(doNext).catch(catchError) || doNext();
                            break;
                        case 'mouseMove':
                            arrCodes = [];
                            arrCodes.push('return driver.sleep(300).wait(\''+escapeStr(data.path)+'\', 30000)');
                            arrCodes.push('       .sleep(300).mouseMove('+(data.x ? data.x + ', ' + data.y : '')+');');
                            pushTestCode('mouseMove', data.text, data.path+(data.x !== undefined?', '+data.x+', '+data.y:''), arrCodes);
                            checkerBrowser && checkerBrowser.sleep(300).wait(data.path, 10000).sleep(300).mouseMove(data.x, data.y).then(doNext).catch(catchError) || doNext();
                            break;
                        case 'mouseDown':
                            arrCodes = [];
                            arrCodes.push('return driver.sleep(300).wait(\''+escapeStr(data.path)+'\', 30000)');
                            arrCodes.push('       .sleep(300).mouseMove('+data.x+', '+data.y+').mouseDown('+data.button+');');
                            pushTestCode('mouseDown', data.text, data.path + ', ' + data.x + ', ' + data.y + ', ' + data.button, arrCodes);
                            checkerBrowser && checkerBrowser.sleep(300).wait(data.path, 10000).sleep(300).mouseMove(data.x, data.y).mouseDown(data.button).then(doNext).catch(catchError) || doNext();
                            break;
                        case 'mouseUp':
                            arrCodes = [];
                            arrCodes.push('return driver.sleep(300).wait(\''+escapeStr(data.path)+'\', 30000)');
                            arrCodes.push('       .sleep(300).mouseMove('+data.x+', '+data.y+').mouseMove('+data.x+', '+data.y+').mouseUp('+data.button+');');
                            pushTestCode('mouseUp', data.text, data.path + ', ' + data.x + ', ' + data.y + ', ' + data.button, arrCodes);
                            checkerBrowser && checkerBrowser.sleep(300).wait(data.path, 10000).sleep(300).mouseMove(data.x, data.y).mouseMove(data.x, data.y).mouseUp(data.button).then(doNext).catch(catchError) || doNext();
                            break;
                        case 'click':
                            arrCodes = [];
                            arrCodes.push('return driver.sleep(300).wait(\''+escapeStr(data.path)+'\', 30000)');
                            arrCodes.push('       .sleep(300).mouseMove('+data.x+', '+data.y+').click('+data.button+');');
                            pushTestCode('click', data.text, data.path + ', ' + data.x + ', ' + data.y + ', ' + data.button, arrCodes);
                            checkerBrowser && checkerBrowser.sleep(300).wait(data.path, 10000).sleep(300).mouseMove(data.x, data.y).click(data.button).then(doNext).catch(catchError) || doNext();
                            break;
                        case 'touchClick':
                            arrCodes = [];
                            arrCodes.push('return driver.sleep(300).wait(\''+escapeStr(data.path)+'\', 30000)');
                            arrCodes.push('       .sleep(300).touchClick();');
                            pushTestCode('touchClick', data.text, data.path, arrCodes);
                            checkerBrowser && checkerBrowser.sleep(300).wait(data.path, 10000).sleep(300).touchClick().then(doNext).catch(catchError) || doNext();
                            break;
                        case 'dblClick':
                            arrCodes = [];
                            arrCodes.push('return driver.sleep(300).wait(\''+escapeStr(data.path)+'\', 30000)');
                            arrCodes.push('       .sleep(300).mouseMove('+data.x+', '+data.y+').click(0).click(0);');
                            pushTestCode('dblClick', data.text, data.path + ', ' + data.x + ', ' + data.y + ', ' + data.button, arrCodes);
                            checkerBrowser && checkerBrowser.sleep(300).wait(data.path, 10000).sleep(300).mouseMove(data.x, data.y).click(0).click(0).then(doNext).catch(catchError) || doNext();
                            break;
                        case 'sendKeys':
                            pushTestCode('sendKeys', '', data.keys, 'return driver.sendKeys(\''+escapeStr(data.keys)+'\');');
                            checkerBrowser && checkerBrowser.sendKeys(data.keys).then(doNext).catch(catchError) || doNext();
                            break;
                        case 'keyDown':
                            pushTestCode('keyDown', '', data.character, 'return driver.keyDown(\''+escapeStr(data.character)+'\');');
                            checkerBrowser && checkerBrowser.keyDown(data.character).then(doNext).catch(catchError) || doNext();
                            break;
                        case 'keyUp':
                            pushTestCode('keyUp', '', data.character, 'return driver.keyUp(\''+escapeStr(data.character)+'\');');
                            checkerBrowser && checkerBrowser.keyUp(data.character).then(doNext).catch(catchError) || doNext();
                            break;
                        case 'scrollTo':
                            pushTestCode('scrollTo', '', data.x + ', ' + data.y, 'return driver.scrollTo('+data.x+', '+data.y+');');
                            checkerBrowser && checkerBrowser.scrollTo(data.x, data.y).then(doNext).catch(catchError) || doNext();
                            break;
                        case 'select':
                            arrCodes = [];
                            arrCodes.push('return driver.sleep(300).wait(\''+escapeStr(data.path)+'\', 30000)');
                            arrCodes.push('       .sleep(300).select({');
                            arrCodes.push('           type: \''+data.type+'\',');
                            arrCodes.push('           value: \''+data.value+'\'');
                            arrCodes.push('       });');
                            pushTestCode('select', data.text, data.path + ', ' + data.type + ', ' + data.value, arrCodes);
                            checkerBrowser && checkerBrowser.sleep(300).wait(data.path, 10000).sleep(300).select({
                                type: data.type,
                                value: data.value
                            }).then(doNext).catch(catchError) || doNext();
                            break;
                        case 'acceptAlert':
                            pushTestCode('acceptAlert', '', '', 'return driver.acceptAlert();');
                            checkerBrowser && checkerBrowser.acceptAlert().then(doNext).catch(catchError) || doNext();
                            break;
                        case 'dismissAlert':
                            pushTestCode('dismissAlert', '', '', 'return driver.dismissAlert();');
                            checkerBrowser && checkerBrowser.dismissAlert().then(doNext).catch(catchError) || doNext();
                            break;
                        case 'setAlert':
                            pushTestCode('setAlert', '', data.text, 'return driver.setAlert("'+data.text+'");');
                            checkerBrowser && checkerBrowser.setAlert(data.text).then(doNext).catch(catchError) || doNext();
                            break;
                        case 'uploadFile':
                            arrCodes = [];
                            arrCodes.push('return driver.sleep(300).wait(\''+escapeStr(data.path)+'\', {timeout: 30000, displayed: false})');
                            arrCodes.push('       .sleep(300).uploadFile(rootPath+\'/uploadfiles/'+data.filename+'\');');
                            pushTestCode('uploadFile', data.text, data.path + ', ' + data.filename, arrCodes);
                            checkerBrowser && checkerBrowser.sleep(300).wait(data.path, {timeout: 10000, displayed: false})
                                .sleep(300).sendElementKeys(rootPath+'/uploadfiles/'+data.filename).then(doNext).catch(catchError) || doNext();
                            break;
                        // 添加断言
                        case 'expect':
                            co(function*(){
                                var sleepTime = data.sleep;
                                var expectType = data.type;
                                var expectParams = data.params;
                                var expectCompare = data.compare;
                                var expectTo = data.to;
                                arrCodes = [];
                                if(reDomRequire.test(expectType)){
                                    arrCodes.push('return driver.sleep('+sleepTime+').wait(\''+escapeStr(expectParams[0])+'\', 30000)');
                                }
                                else{
                                    arrCodes.push('return driver');
                                }
                                switch(expectType){
                                    case 'val':
                                        arrCodes.push('       .val()');
                                        break;
                                    case 'text':
                                        arrCodes.push('       .text()');
                                        break;
                                    case 'displayed':
                                        arrCodes.push('       .displayed()');
                                        break;
                                    case 'enabled':
                                        arrCodes.push('       .enabled()');
                                        break;
                                    case 'selected':
                                        arrCodes.push('       .selected()');
                                        break;
                                    case 'attr':
                                        arrCodes.push('       .attr(\''+escapeStr(expectParams[1])+'\')');
                                        break;
                                    case 'css':
                                        arrCodes.push('       .css(\''+escapeStr(expectParams[1])+'\')');
                                        break;
                                    case 'url':
                                        arrCodes.push('       .url()');
                                        break;
                                    case 'title':
                                        arrCodes.push('       .title()');
                                        break;
                                    case 'cookie':
                                        arrCodes.push('       .cookie(\''+escapeStr(expectParams[0])+'\')');
                                        break;
                                    case 'localStorage':
                                        arrCodes.push('       .localStorage(\''+escapeStr(expectParams[0])+'\')');
                                        break;
                                    case 'sessionStorage':
                                        arrCodes.push('       .sessionStorage(\''+escapeStr(expectParams[0])+'\')');
                                        break;
                                    case 'alert':
                                        arrCodes.push('       .getAlert()');
                                        break;
                                }
                                var codeExpectTo = expectTo.replace(/"/g, '\\"').replace(/\n/g, '\\n');
                                switch(expectCompare){
                                    case 'equal':
                                        arrCodes.push('       .should.equal(_('+(/^(true|false)$/.test(codeExpectTo)?codeExpectTo:'\''+escapeStr(codeExpectTo)+'\'')+'));');
                                        break;
                                    case 'notEqual':
                                        arrCodes.push('       .should.not.equal(_('+(/^(true|false)$/.test(codeExpectTo)?codeExpectTo:'\''+escapeStr(codeExpectTo)+'\'')+'));');
                                        break;
                                    case 'contain':
                                        arrCodes.push('       .should.contain(_(\''+escapeStr(codeExpectTo)+'\'));');
                                        break;
                                    case 'above':
                                        arrCodes.push('       .should.above(_(\''+escapeStr(codeExpectTo)+'\'));');
                                        break;
                                    case 'below':
                                        arrCodes.push('       .should.below(_(\''+escapeStr(codeExpectTo)+'\'));');
                                        break;
                                    case 'match':
                                        arrCodes.push('       .should.match('+escapeStr(codeExpectTo)+');');
                                        break;
                                    case 'notMatch':
                                        arrCodes.push('       .should.not.match('+escapeStr(codeExpectTo)+');');
                                        break;
                                }
                                pushTestCode('expect', '', expectType + ', ' + JSON.stringify(expectParams) + ', ' + expectCompare + ', ' + expectTo, arrCodes);
                                if(checkerBrowser){
                                    var element, value;
                                    if(reDomRequire.test(expectType)){
                                        element = yield checkerBrowser.sleep(sleepTime).wait(expectParams[0], 10000);
                                    }
                                    switch(expectType){
                                        case 'val':
                                            value = yield element.val();
                                            break;
                                        case 'text':
                                            value = yield element.text();
                                            break;
                                        case 'displayed':
                                            value = yield element.displayed();
                                            break;
                                        case 'enabled':
                                            value = yield element.enabled();
                                            break;
                                        case 'selected':
                                            value = yield element.selected();
                                            break;
                                        case 'attr':
                                            value = yield element.attr(expectParams[1]);
                                            break;
                                        case 'css':
                                            value = yield element.css(expectParams[1]);
                                            break;
                                        case 'url':
                                            value = yield checkerBrowser.url();
                                            break;
                                        case 'title':
                                            value = yield checkerBrowser.title();
                                            break;
                                        case 'cookie':
                                            value = yield checkerBrowser.cookie(expectParams[0]);
                                            break;
                                        case 'localStorage':
                                            value = yield checkerBrowser.localStorage(expectParams[0]);
                                            break;
                                        case 'sessionStorage':
                                            value = yield checkerBrowser.sessionStorage(expectParams[0]);
                                            break;
                                        case 'alert':
                                            value = yield checkerBrowser.getAlert();
                                            break;
                                    }
                                    switch(expectCompare){
                                        case 'equal':
                                            expectTo = /^(true|false)$/.test(expectTo)?eval(expectTo):expectTo;
                                            value.should.equal(getVarStr(expectTo));
                                            break;
                                        case 'notEqual':
                                            expectTo = /^(true|false)$/.test(expectTo)?eval(expectTo):expectTo;
                                            value.should.not.equal(getVarStr(expectTo));
                                            break;
                                        case 'contain':
                                            value.should.contain(getVarStr(expectTo));
                                            break;
                                        case 'above':
                                            value.should.above(getVarStr(expectTo));
                                            break;
                                        case 'below':
                                            value.should.below(getVarStr(expectTo));
                                            break;
                                        case 'match':
                                            value.should.match(eval(expectTo));
                                            break;
                                        case 'notMatch':
                                            value.should.not.match(eval(expectTo));
                                            break;
                                    }
                                }
                            }).then(doNext).catch(catchError);
                            break;
                        // 使用变量
                        case 'useVar':
                            var varinfo = data.varinfo;
                            var varType = varinfo.type;
                            arrCodes = [];
                            arrCodes.push('return driver.sleep(300).wait(\''+escapeStr(data.path)+'\', 30000)');
                            switch(varType){
                                case 'insert':
                                    if(varinfo.isNew){
                                        updateNewVar(varinfo.name, varinfo.value);
                                    }
                                    arrCodes.push('       .val(testVars[\''+escapeStr(varinfo.name)+'\']);');
                                    pushTestCode('insertVar', data.text, data.path + ', ' + varinfo.name, arrCodes);
                                    break;
                                case 'faker':
                                    faker.locale = varinfo.lang;
                                    arrCodes.unshift('faker.locale = \'' + varinfo.lang + '\';');
                                    arrCodes.push('       .val(faker.fake(\''+escapeStr(varinfo.str)+'\'));');
                                    pushTestCode('insertFaker', data.text, data.path + ', ' + varinfo.lang + ', ' + varinfo.str, arrCodes);
                                    break;
                            }
                            checkerBrowser && checkerBrowser.sleep(300).wait(data.path, 10000).val(varType === 'faker' ? faker.fake(varinfo.str) : testVars[varinfo.name]).then(doNext).catch(catchError) || doNext();
                            break;
                        // 更新变量
                        case 'updateVar':
                            co(function*(){
                                var varName = data.name;
                                var updateType = data.updateType;
                                var updateParams = data.updateParams;
                                var updateRegex = data.updateRegex;
                                arrCodes = [];
                                if(reDomRequire.test(updateType)){
                                    arrCodes.push('return driver.sleep(300).wait(\''+escapeStr(updateParams[0])+'\', 30000)');
                                }
                                else{
                                    arrCodes.push('return driver');
                                }
                                switch(updateType){
                                    case 'val':
                                        arrCodes.push('       .val()');
                                        break;
                                    case 'text':
                                        arrCodes.push('       .text()');
                                        break;
                                    case 'attr':
                                        arrCodes.push('       .attr(\''+escapeStr(updateParams[1])+'\')');
                                        break;
                                    case 'css':
                                        arrCodes.push('       .css(\''+escapeStr(updateParams[1])+'\')');
                                        break;
                                    case 'url':
                                        arrCodes.push('       .url()');
                                        break;
                                    case 'title':
                                        arrCodes.push('       .title()');
                                        break;
                                    case 'cookie':
                                        arrCodes.push('       .cookie(\''+escapeStr(updateParams[0])+'\')');
                                        break;
                                    case 'localStorage':
                                        arrCodes.push('       .localStorage(\''+escapeStr(updateParams[0])+'\')');
                                        break;
                                    case 'sessionStorage':
                                        arrCodes.push('       .sessionStorage(\''+escapeStr(updateParams[0])+'\')');
                                        break;
                                }
                                arrCodes.push('       .then(function(value){');
                                arrCodes.push('           var match = value.match('+updateRegex+');');
                                arrCodes.push('           if(match){');
                                arrCodes.push('               value = match[1];');
                                arrCodes.push('           }');
                                arrCodes.push('           testVars[\''+varName+'\'] = value;');
                                arrCodes.push('       });');
                                pushTestCode('updateVar', '', varName + ', ' + updateType + ', ' + JSON.stringify(updateParams) + ', ' + updateRegex, arrCodes);
                                if(checkerBrowser){
                                    var element, value;
                                    if(reDomRequire.test(updateType)){
                                        element = yield checkerBrowser.sleep(300).wait(updateParams[0], 10000);
                                    }
                                    switch(updateType){
                                        case 'val':
                                            value = yield element.val();
                                            break;
                                        case 'text':
                                            value = yield element.text();
                                            break;
                                        case 'attr':
                                            value = yield element.attr(updateParams[1]);
                                            break;
                                        case 'css':
                                            value = yield element.css(updateParams[1]);
                                            break;
                                        case 'url':
                                            value = yield checkerBrowser.url();
                                            break;
                                        case 'title':
                                            value = yield checkerBrowser.title();
                                            break;
                                        case 'cookie':
                                            value = yield checkerBrowser.cookie(updateParams[0]);
                                            break;
                                        case 'localStorage':
                                            value = yield checkerBrowser.localStorage(updateParams[0]);
                                            break;
                                        case 'sessionStorage':
                                            value = yield checkerBrowser.sessionStorage(updateParams[0]);
                                            break;
                                    }
                                    if(updateRegex){
                                        updateRegex = eval(updateRegex);
                                        var match = value.match(updateRegex);
                                        if(match){
                                            value = match[1];
                                        }
                                    }
                                    testVars[varName] = value;
                                    if(data.isNew){
                                        updateNewVar(varName, value);
                                    }
                                }
                            }).then(doNext).catch(catchError);
                            break;
                        // 插入用例
                        case 'module':
                            var moduleName = /[\/\\]/.test(data) ? data : commonSpecRelPath + data;
                            co(function*(){
                                console.log(('  -------------- start load '+moduleName+' --------------').gray);
                                sendWsMessage('moduleStart', {
                                    file: moduleName
                                });
                                var arrTasks = [runSpec(moduleName, recorderBrowser, testVars, function(title, errorMsg){
                                    title = title.replace(/^\w+:/, function(all){
                                        return all.cyan;
                                    });
                                    console.log('  '+title);
                                    console.log('   '+(errorMsg?symbols.err.red+__('exec_failed').red + '\t' + errorMsg:symbols.ok.green+__('exec_succeed').green));
                                })];
                                if(checkerBrowser){
                                    arrTasks.push(runSpec(moduleName, checkerBrowser, testVars))
                                }
                                yield arrTasks;
                                yield recorderBrowser.sleep(1000);
                                yield recorderBrowser.eval(function(done){
                                    setInterval(function(){
                                        if(document.readyState==='complete')done()
                                    }, 10);
                                });
                                sendWsMessage('moduleEnd', {
                                    file: moduleName,
                                    success: true
                                });
                                arrTestCodes.push('callSpec(\''+moduleName+'\');\r\n');
                                console.log(('  -------------- end load '+moduleName+' --------------').gray);
                                console.log('  module'.cyan+': ', moduleName);
                            }).then(doNext).catch(function(err){
                                console.log(('  -------------- load '+moduleName+' failed --------------').gray);
                                sendWsMessage('moduleEnd', {
                                    file: moduleName,
                                    success: false
                                });
                                catchError(err);
                            });
                            break;
                    }
                }
            });
            function* runSpec(name, driver, testVars, callback){
                global.before = function(func){
                    func.call({
                        driver: driver,
                        testVars: testVars
                    });
                }
                global.describe = function(){}
                var arrSpecs = [];
                global.it = function(title, func){
                    arrSpecs.push({
                        title: title,
                        func: func
                    });
                }
                require(rootPath + '/' + name)();
                var spec;
                for(var i in arrSpecs){
                    spec = arrSpecs[i];
                    var errorMsg = null;
                    try{
                        yield spec.func();
                    }
                    catch(e){
                        errorMsg = e;
                    }
                    callback && callback(spec.title, errorMsg);
                }
            }
            async.series(arrTasks, function(){
                next();
            });
        }, 1);
        function onReady(){
            // checker browser
            if(openChecker){
                newChromeBrowser({hosts: hosts, isRecorder: false, debug: debug}, function*(browser){
                    if(browserSize){
                        yield browser.windowSize(browserSize[0], browserSize[1]);
                    }
                    else{
                        yield browser.maximize();
                    }
                    checkerBrowser = browser;
                    console.log(__('checker_browser_opened').green);
                    for(var i=0;i<900;i++){
                        if(checkerBrowser){
                            yield checkerBrowser.windowSize();
                            yield checkerBrowser.sleep(2000);
                        }
                        else{
                            break;
                        }
                    }
                });
            }
            else if(mobile){
                newMobileApp({mobileAppPath: mobileAppPath}, function(mobileApp){
                    recorderMobileApp = mobileApp;
                    updateMobileInfo();
                });
            }
            function updateMobileInfo(){
                cmdQueue.push({cmd:'updateMobile'}, 1, function(){
                    setTimeout(updateMobileInfo, 200);
                });
            }
            // recorder browser
            newChromeBrowser({hosts: hosts, isRecorder: true, debug: debug}, function*(browser){
                if(!mobile){
                    if(browserSize){
                        yield browser.windowSize(browserSize[0], browserSize[1]);
                    }
                    else{
                        yield browser.maximize();
                    }
                }
                recorderBrowser = browser;
                yield browser.url('chrome-extension://'+(debug?'pbmdkecbddfcmdhiolcogdkdeglkpfjj':'njkfhfdkecbpjlnfmminhmdcakopmcnc')+'/'+(mobile?'mobile':'start')+'.html');
                console.log(__('recorder_browser_opened').green);
                console.log('');
                console.log('------------------------------------------------------------------'.green);
                console.log('');
                for(var i=0;i<900;i++){
                    if(recorderBrowser){
                        yield recorderBrowser.windowSize();
                        yield recorderBrowser.sleep(2000);
                    }
                    else{
                        break;
                    }
                }
            });
        }
        var arrSendKeys = [];
        var lastCmdInfo0 = null;
        var lastCmdInfo1 = null;
        var lastCmdInfo2 = null;
        var dblClickFilterTimer = null;
        function onCommand(cmdInfo){
            // 合并命令流
            function sendKeysFilter(cmdInfo){
                // 合并连续的sendKeys
                var cmd = cmdInfo.cmd;
                var data = cmdInfo.data;
                if(!mobile && cmd === 'sendKeys'){
                    arrSendKeys.push(data.keys);
                }
                else{
                    if(arrSendKeys.length > 0){
                        // 满足条件，进行合并
                        clickFilter({
                            window: lastCmdInfo0.window,
                            frame: lastCmdInfo0.frame,
                            cmd: 'sendKeys',
                            data: {
                                keys: arrSendKeys.join('')
                            }
                        });
                        arrSendKeys = [];
                    }
                    clickFilter(cmdInfo);
                }
                lastCmdInfo0 = cmdInfo;
            }
            function clickFilter(cmdInfo){
                // 合并为click，增加兼容性 (mouseDown不支持button参数)
                var cmd = cmdInfo.cmd;
                var data = cmdInfo.data;
                if(lastCmdInfo1 && lastCmdInfo1.cmd === 'mouseDown'){
                    var lastCmdData = lastCmdInfo1.data;
                    if(cmd === 'mouseUp' &&
                        cmdInfo.window === lastCmdInfo1.window &&
                        cmdInfo.frame === lastCmdInfo1.frame &&
                        lastCmdData.path === data.path &&
                        Math.abs(lastCmdData.x - data.x) < 20 &&
                        Math.abs(lastCmdData.y - data.y) < 20
                    ){
                        // 条件满足，合并为click
                        cmdInfo = {
                            window: cmdInfo.window,
                            frame: cmdInfo.frame,
                            cmd: 'click',
                            data: data,
                            text: cmdInfo.text
                        };
                    }
                    else{
                        // 不需要合并，恢复之前旧的mouseDown
                        dblClickFilter(lastCmdInfo1);
                    }
                }
                if(cmdInfo.cmd !== 'mouseDown'){
                    // mouseDown 缓存到下一次，确认是否需要合并click，非mouseDown立即执行
                    dblClickFilter(cmdInfo);
                }
                lastCmdInfo1 = cmdInfo;
            }
            function dblClickFilter(cmdInfo){
                // 合并为dblClick，增加兼容性, 某些浏览器不支持连续的两次click
                var cmd = cmdInfo.cmd;
                var data = cmdInfo.data;
                if(lastCmdInfo2 && lastCmdInfo2.cmd === 'click'){
                    var lastCmdData = lastCmdInfo2.data;
                    clearTimeout(dblClickFilterTimer);
                    if(cmd === 'click' &&
                        cmdInfo.window === lastCmdInfo2.window &&
                        cmdInfo.frame === lastCmdInfo2.frame &&
                        lastCmdData.path === data.path &&
                        Math.abs(lastCmdData.x - data.x) < 20 &&
                        Math.abs(lastCmdData.y - data.y) < 20
                    ){
                        // 条件满足，合并为click
                        cmdInfo = {
                            window: cmdInfo.window,
                            frame: cmdInfo.frame,
                            cmd: 'dblClick',
                            data: data,
                            text: cmdInfo.text
                        };
                    }
                    else{
                        // 不需要合并，恢复之前旧的click
                        cmdQueue.push(lastCmdInfo2, 2);
                    }
                }
                if(cmdInfo.cmd !== 'click'){
                    // click 缓存到下一次，确认是否需要合并dblClick，非click立即执行
                    cmdQueue.push(cmdInfo, 2);
                }
                else{
                    // 400毫秒以内才进行dblClick合并
                    dblClickFilterTimer = setTimeout(function(){
                        cmdQueue.push(lastCmdInfo2, 2);
                        lastCmdInfo2 = null;
                    }, 500);
                }
                lastCmdInfo2 = cmdInfo;
            }
            sendKeysFilter(cmdInfo);
        }
        function onEnd(){
            recorderBrowser.close(function(){
                recorderBrowser = null;
                console.log('');
                console.log('------------------------------------------------------------------'.green);
                console.log('');
                saveTestFile();
                console.log(__('recorder_server_closed').green);
                console.log(__('recorder_browser_closed').green);
                checkerBrowser && checkerBrowser.close(function(){
                    checkerBrowser = null;
                    console.log(__('checker_browser_closed').green);
                    process.exit();
                }) || process.exit();
            });
        }
        var recorderConfig = {
            pathAttrs : pathAttrs,
            attrValueBlack: attrValueBlack,
            testVars: testVars,
            specLists: specLists,
            i18n: __('chrome')
        };
        startRecorderServer(recorderConfig, onReady, onCommand, onEnd);
        function saveTestFile(){
            var tempalteFile = path.resolve(__dirname, '../template/'+(mobile?'jwebdriver-mobile':'jwebdriver')+'.js');
            var templateContent = fs.readFileSync(tempalteFile).toString();
            var testFile = path.resolve(fileName);
            mkdirs(path.dirname(testFile));
            fileName = path.relative(rootPath, testFile).replace(/\\/g,'/');
            arrTestCodes = arrTestCodes.map(function(line){
                return '    '+ line;
            });
            var sizeCode = '';
            if(browserSize){
                sizeCode = '.windowSize('+browserSize[0]+', '+browserSize[1]+')';
            }
            else{
                sizeCode = '.maximize()';
            }
            if(mobileAppPath){
                var relAppPath = path.relative(rootPath, mobileAppPath);
                if(/^\.\./.test(relAppPath) === false){
                    mobileAppPath = relAppPath;
                }
            }
            templateContent = templateContent.replace(/\{\$(\w+)\}/g, function(all, name){
                switch(name){
                    case 'testCodes':
                        return arrTestCodes.join('\r\n');
                    case 'sizeCode':
                        return sizeCode;
                    case 'appPath':
                        return mobileAppPath.replace(/\\/g, '\\\\');
                }
                return all;
            });
            fs.writeFileSync(testFile, templateContent);
            if(checkerBrowser){
                console.log(__('check_sumary').green, String(allCaseCount).bold, String(allCaseCount-failedCaseCount).bold, String(failedCaseCount).bold.red + colors.styles.green.open);
            }
            else{
                console.log(__('nocheck_sumary').green, String(allCaseCount).bold, mobile?'':('('+__('nocheck').yellow + colors.styles.green.open+')'));
            }
            console.log(__('test_spec_saved').green+fileName.bold);
            if(isConfigEdited){
                fs.writeFileSync(configFile, JSON.stringify(configJson, null, 4));
                console.log(__('config_saved').green + configPath.bold);
            }
            console.log('');
        }

        function updateNewVar(name, key){
            testVars[name] = key;
            sendWsMessage('config', recorderConfig);
            isConfigEdited = true;
        }
    });

    function getVarStr(str){
        return typeof str === 'string' && str.replace(/\{\{(.+?)\}\}/g, function(all, key){
            return testVars[key] || '';
        }) || str;
    }
}

// get test root
function getRootPath(){
    var rootPath = path.resolve('.');
    while(rootPath){
        if(fs.existsSync(rootPath + '/config.json')){
            break;
        }
        rootPath = rootPath.substring(0, rootPath.lastIndexOf(path.sep));
    }
    return rootPath;
}

// start chrome driver
function startChromeDriver(){
    chromedriver.start(['--url-base=wd/hub', '--port=9766']);
}

// start recorder server
function startRecorderServer(config, onReady, onCommand, onEnd){
    var serverPort = 9765;
    var server = http.createServer();
    server.listen(serverPort, function(){
        console.log('');
        console.log(__('recorder_server_listen_on').green, serverPort);
        onReady();
    });
    wsServer = new WebSocketServer({
        httpServer: server,
        autoAcceptConnections: true
    });
    wsServer.on('connect', function(connection) {
        wsConnection = connection;
        sendWsMessage('config', config);
        connection.on('message', function(message) {
            var message = message.utf8Data;
            try{
                message = JSON.parse(message);
            }
            catch(e){};
            var type = message.type;
            switch(type){
                case 'saveCmd':
                    onCommand(message.data);
                    break;
                case 'end':
                    onCommand({
                        cmd: 'end'
                    });
                    setTimeout(function(){
                        wsConnection && wsConnection.close();
                        server.close(function(){
                            onEnd();
                        });
                    }, 500);
                    break;
            }
        });
        connection.on('close', function(reasonCode, description) {
            wsConnection = null;
        });
    });
}

function sendWsMessage(type, data){
    if(wsConnection){
        var message = {
            type: type,
            data: data
        };
        wsConnection.send(JSON.stringify(message));
    }
}

function newChromeBrowser(options, callback){
    var driver = new JWebDriver({
        'host': '127.0.0.1',
        'port': 9766
    });
    var capabilities = {};
    if(options.hosts){
        capabilities.hosts = options.hosts;
    }
    else{
        capabilities.proxy = {
            'proxyType': 'direct'
        };
    }
    if(options.isRecorder){
        if(options.debug){
            capabilities.chromeOptions = {
                args:['--disable-bundled-ppapi-flash', '--load-extension='+path.resolve(__dirname, '../chrome-extension')],
                prefs: {
                    'plugins.plugins_disabled': ['Adobe Flash Player']
                }
            };
        }
        else{
            var crxPath = path.resolve(__dirname, '../tool/uirecorder.crx');
            var extContent = fs.readFileSync(crxPath).toString('base64');
            capabilities.chromeOptions = {
                args: ['--disable-bundled-ppapi-flash'],
                prefs: {
                    'plugins.plugins_disabled': ['Adobe Flash Player']
                },
                extensions: [extContent],
            };
        }
    }
    else{
        capabilities.chromeOptions = {
            args: ['--disable-bundled-ppapi-flash'],
            prefs: {
                'plugins.plugins_disabled': ['Adobe Flash Player']
            }
        };
    }
    driver.session(capabilities, function*(error, browser){
        if(error){
            console.log(__('chrome_init_failed').red);
            console.log(error);
            process.exit(1);
        }
        else{
            yield browser.config({
                asyncScriptTimeout: 10000
            });
            yield callback(this);
        }
    }).catch(function(e){});
}

function getDeviceList(platformName){
    var arrDeviceList = [];
    var strText, match;
    if(platformName === 'Android')
    {
        // for android
        strText = cp.execSync('adb devices').toString();
        strText.replace(/(.+?)\s+device\r?\n/g, function(all, deviceName){
            arrDeviceList.push({
                udid: deviceName
            });
        });
    }
    else{
        // ios real device
        strText = cp.execSync('instruments -s devices').toString();
        strText.replace(/([^\r\n]+)\s+\[(.+?)\]\r?\n/g, function(all, deviceName, udid){
            if(/^(iphone|ipad)/i.test(deviceName)){
                arrDeviceList.push({
                    name: deviceName,
                    udid: udid
                });
            }
        });
        // ios simulator
        strText = cp.execSync('xcrun simctl list devices').toString();
        strText.replace(/\r?\n\s*(.+?)\s+\((.+?)\) \(Booted\)/g, function(all, deviceName, udid){
            arrDeviceList.push({
                name: deviceName,
                udid: udid
            });
        });
    }
    return arrDeviceList;
}

function newMobileApp(options, callback){
    var driver = new JWebDriver({
        'host': '127.0.0.1',
        'port': 4444
    });
    var mobileAppPath = options.mobileAppPath;
    var platformName = /\.apk$/.test(mobileAppPath)?'Android':'iOS';
    var deviceList = getDeviceList(platformName);
    if(deviceList.length === 0){
        console.log(__('mobile_open_first').red);
        process.exit(1);
    }
    driver.session({
        'platformName': platformName,
        'udid': deviceList[0].udid,
        'app': path.resolve(mobileAppPath)
    }).then(function(){
        callback(this);
    }).catch(function(e){
        console.log(__('mobile_open_failed').red, e);
        process.exit(1);
    });
}

function mkdirs(dirname){
    if(fs.existsSync(dirname)){
        return true;
    }else{
        if(mkdirs(path.dirname(dirname))){
            fs.mkdirSync(dirname);
            return true;
        }
    }
}

module.exports = startRecorder;
