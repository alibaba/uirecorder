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
var chromedriver = require('chromedriver');
const resemble = require('resemblejs-node');
resemble.outputSettings({
    errorType: 'flatDifferenceIntensity'
});

var WebSocketServer = require('websocket').server;
var i18n = require('./i18n');
var colors = require('colors');

var symbols = {
  ok: '✓',
  err: '✖'
};
var recorderBrowserTimeout = 1000;
var checkerBrowserTimeout = 0;
if (process.platform === 'win32') {
  symbols.ok = '\u221A';
  symbols.err = '\u00D7';
  recorderBrowserTimeout = 0;
  checkerBrowserTimeout = 1000;
}

var wsConnection;

var rootPath = getRootPath();
var pkg = require('../package.json');

function startRecorder(options){
    var locale = options.locale;
    var cmdFilename = options.cmdFilename;
    var mobile = options.mobile;
    var debug = options.debug;
    var raw = options.raw;
    var mobileDevice = options.mobileDevice;
    if(locale){
        i18n.setLocale(locale);
    }
    var configPath = 'config.json';
    var configFile = path.resolve(rootPath + '/' + configPath);
    var configJson = {};
    if(fs.existsSync(configFile)){
        var content = fs.readFileSync(configFile).toString();
        try{
            configJson = JSON.parse(content);
        }
        catch(e){
            console.log(configPath.bold+' ' + __('json_parse_failed').red, e);
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
    if(pathAttrs){
        pathAttrs = pathAttrs.replace(/^\s+|\s+$/g, '');
        pathAttrs = pathAttrs.split(/\s*,\s*/).map(function(name){
            return {
                name: name,
                on: true
            };
        });
        pathAttrs.unshift({
            name: 'name',
            on: true
        });
        pathAttrs.unshift({
            name: 'text',
            on: true
        });
        pathAttrs.unshift({
            name: 'id',
            on: true
        });
    }
    var attrValueBlack = recorderConfig.attrValueBlack;
    var classValueBlack = recorderConfig.classValueBlack;
    var hideBeforeExpect = recorderConfig.hideBeforeExpect;
    var testVars = configJson.vars;
    var isConfigEdited = false;
    var hostsPath = 'hosts';
    var hostsFile = path.resolve(rootPath + '/' + hostsPath);
    var hosts = '';
    if(fs.existsSync(hostsFile)){
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
    if(cmdFilename){
        console.log('? '.green+__('input_spec_name').white.bold + ' ' + cmdFilename.cyan);
    }
    else{
        questions.push({
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
        });
    }
    questions.push({
        'type': 'confirm',
        'name': 'continueRecord',
        'message': __('continue_to_record'),
        'default': false,
        'when': function(answers){
            var fileName = cmdFilename ||answers.fileName;
            if(fs.existsSync(fileName)){
                var content = fs.readFileSync(fileName).toString();
                return /\s*function _\(str\)/.test(content);
            }
            return false;
        }
    });
    if(mobile){
        questions = questions.concat([
            {
                'type': 'input',
                'name': 'mobileAppPath',
                'message': __('mobile_app_path'),
                'default': '',
                'filter': function(input){
                    return input.replace(/(^\s+|\s+$)/g, '');
                },
                'validate': function(input){
                    return (/^https?:\/\//.test(input) || (/\.(apk|app|zip)$/.test(input) && fs.existsSync(input)));
                },
                'when': function(answers){
                    if(answers.continueRecord){
                        var fileName = cmdFilename || answers.fileName;
                        var content = fs.readFileSync(fileName).toString();
                        var match = content.match(/appPath = '([^']+)';/);
                        if(match){
                            answers.mobileAppPath = match[1];
                            match = content.match(/platformName = '([^']+)';/);
                            answers.mobilePlatform = match[1];
                        }
                    }
                    return !answers.mobileAppPath;
                }
            },
            {
                'type': 'list',
                'name': 'mobilePlatform',
                'choices': ['Android', 'iOS'],
                'message': __('mobile_platform'),
                'when': function(answers){
                    if(!answers.mobilePlatform){
                        var mobileAppPath = answers.mobileAppPath;
                        var mobilePlatform = null;
                        if(/(\bandroid\b|\.apk$)/i.test(mobileAppPath)){
                            mobilePlatform = 'Android';
                        }
                        if(/(\bios\b|\.app$)/i.test(mobileAppPath)){
                            mobilePlatform = 'iOS';
                        }
                        if(mobilePlatform){
                            answers.mobilePlatform = mobilePlatform;
                        }
                        else{
                            return true;
                        }
                    }
                }
            }
        ]);
    }
    else{
        questions = questions.concat([
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
                },
                'when': function(answers){
                    if(answers.continueRecord){
                        var fileName = cmdFilename || answers.fileName;
                        var content = fs.readFileSync(fileName).toString();
                        var match = content.match(/\.windowSize\((\d+), (\d+)\)/);
                        if(match){
                            answers.browserSize = match[1] + ' x ' + match[2];
                        }
                    }
                    return !answers.continueRecord;
                }
            }
        ]);
    }
    inquirer.prompt(questions).then(function(answers){
        var fileName = answers.fileName || cmdFilename;
        var testFile = path.resolve(fileName);
        fileName = path.relative(rootPath, testFile).replace(/\\/g,'/');
        var specName = fileName.replace(/\.js$/,'');
        var caseName = specName + ' : chrome';

        var continueRecord = answers.continueRecord;
        var openChecker = answers.checker;
        var browserSize = answers.browserSize || '';
        var match = browserSize.match(/^(\d+)\s*[x, ]\s*(\d+)$/);
        if(match){
            browserSize = [ parseInt(match[1], 10), parseInt(match[2], 10)];
        }
        else{
            browserSize = null;
        }
        var mobileAppPath = answers.mobileAppPath;
        var mobilePlatform = answers.mobilePlatform;

        var arrTestCodes = [];
        var recorderBrowser, checkerBrowser, recorderMobileApp;
        var lastWindowId = 0;
        var lastFrameId = null;
        var lastTestTitle = '';
        var arrLastTestCodes = [];
        var arrRawCmds = [];
        var allCaseCount = 0;
        var failedCaseCount = 0;
        var isModuleLoading = false;

        function escapeStr(str){
            return str.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/\'/g, "\\'");
        }
        function pushRawCmd(cmd, data){
            arrRawCmds.push({
                type: cmd,
                data: data
            });
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
                    console.log('   '+symbols.err.red+__('exec_failed').red, error && error.message || error);
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
                arrTestCodes.push('it(\''+escapeStr(lastTestTitle)+'\', async function(){');
                arrTestCodes = arrTestCodes.concat(arrLastTestCodes);
                arrTestCodes.push("});");
                arrTestCodes.push("");
                lastTestTitle = '';
                arrLastTestCodes = [];
            }
        }
        var cmdQueue = async.priorityQueue(function(cmdInfo, next) {
            if(isModuleLoading){
                return next();
            }
            var window = cmdInfo.window;
            var frame = cmdInfo.frame;
            var cmd = cmdInfo.cmd;
            var data = cmdInfo.data;
            if(cmd === '!updateMobile'){
                if(recorderMobileApp){
                    var screenshot;
                    recorderMobileApp.getScreenshot(function(error, png64){
                        screenshot = png64;
                    }).source(function(error, source){
                        if(screenshot && source){
                            sendWsMessage('mobileAppInfo', {
                                screenshot: screenshot,
                                source: JSON.parse(source)
                            });
                        }
                        else{
                            console.log(error);
                        }
                        next();
                    });
                }
                else{
                    next();
                }
                return;
            }
            else if(cmd === '!updateAttrValueBlack'){
                configJson.recorder.attrValueBlack = data;
                recorderConfig.attrValueBlack = data;
                sendWsMessage('config', recorderConfig);
                isConfigEdited = true;
                return next();
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
                    pushRawCmd('switchWindow', window);
                    pushTestCode('switchWindow', '', window, 'await driver.sleep(500).switchWindow('+window+');')
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
                        arrCodes.push('await driver.switchFrame(null)');
                        arrCodes.push('       .wait(\''+frame+'\', 30000).then(function(element){');
                        arrCodes.push('           return this.switchFrame(element).wait(\'body\');');
                        arrCodes.push('       });');
                    }
                    else{
                        arrCodes.push('await driver.switchFrame(null);');
                    }
                    pushRawCmd('switchFrame', frame);
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
                pushRawCmd(cmd, data);
                var arrCodes = [];
                if(mobile){
                    switch(cmd){
                        case 'click':
                            if(data.path){
                                pushTestCode('tap', data.text, data.path, 'await driver.wait(\''+escapeStr(data.path)+'\', 30000).sendElementActions(\'tap\');');
                                recorderMobileApp.wait(data.path, 10000).sendElementActions('tap').then(doNext).catch(catchError);
                            }
                            else{
                                pushTestCode('tap', '', data.x+', '+data.y, 'await driver.sendActions(\'tap\', {x: '+data.x+', y: '+data.y+'});');
                                recorderMobileApp.sendActions('tap', {x: data.x, y: data.y}).then(doNext).catch(catchError);
                            }
                            break;
                        case 'dblClick':
                            if(data.path){
                                pushTestCode('doubleTap', data.text, data.path, 'await driver.wait(\''+escapeStr(data.path)+'\', 30000).sendElementActions(\'doubleTap\');');
                                recorderMobileApp.wait(data.path, 10000).sendElementActions('doubleTap').then(doNext).catch(catchError);
                            }
                            else{
                                pushTestCode('doubleTap', '', data.x+', '+data.y, 'await driver.sendActions(\'doubleTap\', {x: '+data.x+', y: '+data.y+'});');
                                recorderMobileApp.sendActions('doubleTap', {x: data.x, y: data.y}).then(doNext).catch(catchError);
                            }
                            break;
                        case 'press':
                            if(data.path){
                                pushTestCode('press', data.text, data.path+', '+data.duration, 'await driver.wait(\''+escapeStr(data.path)+'\', 30000).sendElementActions(\'press\', {duration: '+data.duration+'});');
                                recorderMobileApp.wait(data.path, 10000).sendElementActions('press', {duration : data.duration}).then(doNext).catch(catchError);
                            }
                            else{
                                pushTestCode('press', '', data.x+', '+data.y+', '+data.duration, 'await driver.sendActions(\'press\', {x: '+data.x+', y: '+data.y+', duration: '+data.duration+'});');
                                recorderMobileApp.sendActions('press', {x: data.x, y: data.y, duration: data.duration}).then(doNext).catch(catchError);
                            }
                            break;
                        case 'drag':
                            pushTestCode('drag', '', data.fromX+', '+data.fromY+', '+data.toX+', '+data.toY+', '+data.duration, 'await driver.sendActions(\'drag\', {fromX: '+data.fromX+', fromY:'+data.fromY+', toX:'+data.toX+', toY:'+data.toY+', duration: '+data.duration+'});');
                            recorderMobileApp.sendActions('drag', {fromX: data.fromX, fromY: data.fromY, toX: data.toX, toY: data.toY, duration: data.duration}).then(doNext).catch(catchError);
                            break;
                        case 'sendKeys':
                            pushTestCode('sendKeys', '', data, 'await driver.sendKeys(_(\`'+escapeStr(data)+'\`));');
                            recorderMobileApp.sendKeys(getVarStr(eval('\`'+data+'\`'))).then(doNext).catch(catchError);
                            break;
                        case 'sleep':
                            pushTestCode('sleep', '', data, 'await driver.sleep('+data+');');
                            recorderMobileApp.sleep(data).then(doNext).catch(catchError);
                            break;
                        case 'acceptAlert':
                            pushTestCode('acceptAlert', '', '', 'await driver.acceptAlert();');
                            recorderMobileApp.acceptAlert().then(doNext).catch(catchError);
                            break;
                        case 'dismissAlert':
                            pushTestCode('dismissAlert', '', '', 'await driver.dismissAlert();');
                            recorderMobileApp.dismissAlert().then(doNext).catch(catchError);
                            break;
                        case 'back':
                            pushTestCode('back', '', '', 'await driver.back();');
                            recorderMobileApp.back().then(doNext).catch(catchError);
                            break;
                        case 'expect':
                            co(function*(){
                                var expectSleep = data.sleep;
                                var expectType = data.type;
                                var expectPath = data.path;
                                var expectCompare = data.compare;
                                var expectTo = data.to;
                                arrCodes = [];
                                if(expectType === 'count'){
                                    arrCodes.push('await driver.wait(\''+escapeStr(expectPath)+'\', {timeout: 1000, noerror: true})');
                                    arrCodes.push('    .then(function(elements){');
                                    arrCodes.push('        return String(elements.length);');
                                    arrCodes.push('    })');
                                }
                                else if(expectType === 'imgdiff'){
                                    arrCodes.push("let self = this;");
                                    arrCodes.push("let imgBasePath = self.diffbasePath + '/' + self.caseName + '_' + self.stepId + '.png';");
                                    arrCodes.push("let imgNewPath = self.screenshotPath + '/' + self.caseName + '_' + self.stepId + '_new.png';");
                                    arrCodes.push("let imgDiffPath = self.screenshotPath + '/' + self.caseName + '_' + self.stepId + '_diff.png';");
                                    arrCodes.push("let elemshot = await driver.sleep(300).getScreenshot({");
                                    arrCodes.push("    elem: '"+escapeStr(expectPath)+"',");
                                    arrCodes.push("    filename: imgNewPath");
                                    arrCodes.push("});");
                                    arrCodes.push("elemshot = new Buffer(elemshot, 'base64');");
                                    arrCodes.push("if(!fs.existsSync(imgBasePath) || process.env['npm_config_rebuilddiff']){");
                                    arrCodes.push("    fs.writeFileSync(imgBasePath, elemshot);");
                                    arrCodes.push("}");
                                    arrCodes.push("let diff = resemble(elemshot).compareTo(imgBasePath).ignoreColors();");
                                    arrCodes.push("let diffResult = await new Promise((resolve) => diff.onComplete(resolve));");
                                    arrCodes.push("diffResult.getDiffImage().pack().pipe(fs.createWriteStream(imgDiffPath));");
                                    arrCodes.push("diffResult.rawMisMatchPercentage");
                                }
                                else{
                                    arrCodes.push('await driver.sleep('+expectSleep+').wait(\''+escapeStr(expectPath)+'\', 30000)');
                                    switch(expectType){
                                        case 'text':
                                            arrCodes.push('       .text()');
                                            break;
                                    }
                                    arrCodes.push('       .should.not.be.a(\'error\')');
                                }
                                var codeExpectTo = expectTo.replace(/"/g, '\\"').replace(/\n/g, '\\n');
                                switch(expectCompare){
                                    case 'equal':
                                        arrCodes.push('       .should.equal(_('+(/^(true|false)$/.test(codeExpectTo)?codeExpectTo:'\`'+escapeStr(codeExpectTo)+'\`')+'));');
                                        break;
                                    case 'notEqual':
                                        arrCodes.push('       .should.not.equal(_('+(/^(true|false)$/.test(codeExpectTo)?codeExpectTo:'\`'+escapeStr(codeExpectTo)+'\`')+'));');
                                        break;
                                    case 'contain':
                                        arrCodes.push('       .should.contain(_(\`'+escapeStr(codeExpectTo)+'\`));');
                                        break;
                                    case 'notContain':
                                        arrCodes.push('       .should.not.contain(_(\`'+escapeStr(codeExpectTo)+'\`));');
                                        break;
                                    case 'above':
                                        arrCodes.push('       .should.above(_(\`'+escapeStr(codeExpectTo)+'\`));');
                                        break;
                                    case 'below':
                                        arrCodes.push('       .should.below(_(\`'+escapeStr(codeExpectTo)+'\`));');
                                        break;
                                    case 'match':
                                        arrCodes.push('       .should.match('+escapeStr(codeExpectTo)+');');
                                        break;
                                    case 'notMatch':
                                        arrCodes.push('       .should.not.match('+escapeStr(codeExpectTo)+');');
                                        break;
                                }
                                pushTestCode('expect', '', expectType + ', ' + expectPath + ', ' + expectCompare + ', ' + expectTo, arrCodes);
                                var element, value;
                                if(expectType === 'count'){
                                    value = yield recorderMobileApp.wait(expectPath, {
                                        timeout: 1000,
                                        noerror: true
                                    }).then(function(elements){
                                        return String(elements.length);
                                    });
                                }
                                else if(expectType === 'imgdiff'){
                                    // 录制时，不需要进行即时的图片校验
                                    value = 0;
                                }
                                else{
                                    element = yield recorderMobileApp.sleep(expectSleep).wait(expectPath, 10000);
                                    switch(expectType){
                                        case 'text':
                                            value = yield element.text();
                                            break;
                                    }
                                    value.should.not.be.a('error');
                                }
                                switch(expectCompare){
                                    case 'equal':
                                        expectTo = /^(true|false)$/.test(expectTo)?eval(expectTo):eval('\`'+expectTo+'\`');
                                        value.should.equal(getVarStr(expectTo));
                                        break;
                                    case 'notEqual':
                                        expectTo = /^(true|false)$/.test(expectTo)?eval(expectTo):eval('\`'+expectTo+'\`');
                                        value.should.not.equal(getVarStr(expectTo));
                                        break;
                                    case 'contain':
                                        value.should.contain(getVarStr(eval('\`'+expectTo+'\`')));
                                        break;
                                    case 'notContain':
                                        value.should.not.contain(getVarStr(eval('\`'+expectTo+'\`')));
                                        break;
                                    case 'above':
                                        value.should.above(getVarStr(eval('\`'+expectTo+'\`')));
                                        break;
                                    case 'below':
                                        value.should.below(getVarStr(eval('\`'+expectTo+'\`')));
                                        break;
                                    case 'match':
                                        value.should.match(eval(expectTo));
                                        break;
                                    case 'notMatch':
                                        value.should.not.match(eval(expectTo));
                                        break;
                                }
                            }).then(doNext).catch(catchError);
                            break;
                        // 插入用例
                        case 'module':
                            var moduleName = /[\/\\]/.test(data) ? data : commonSpecRelPath + data;
                            loadModule(moduleName, function(error){
                                if(error !== null){
                                    catchError(error);
                                }
                                else{
                                    console.log('  module'.cyan+': ', moduleName);
                                    arrTestCodes.push('callSpec(\''+escapeStr(moduleName)+'\');\r\n');
                                    doNext();
                                }
                            });
                            break;
                        }
                }
                else{
                    var reDomRequire = /^(val|text|displayed|enabled|selected|attr|css|count|imgdiff)$/;
                    var reParamRequire = /^(attr|css|cookie|localStorage|sessionStorage|alert)$/;
                    switch(cmd){
                        case 'url':
                            pushTestCode('url', '', data, 'await driver.url(_(\`'+escapeStr(data)+'\`));');
                            checkerBrowser && checkerBrowser.url(getVarStr(eval('\`'+data+'\`'))).then(doNext).catch(catchError) || doNext();
                            break;
                        case 'closeWindow':
                            pushTestCode('closeWindow', '', '', 'await driver.closeWindow();');
                            checkerBrowser && checkerBrowser.closeWindow().then(doNext).catch(catchError) || doNext();
                            break;
                        case 'sleep':
                            pushTestCode('sleep', '', data, 'await driver.sleep('+data+');');
                            checkerBrowser && checkerBrowser.sleep(data).then(doNext).catch(catchError) || doNext();
                            break;
                        case 'waitBody':
                            arrCodes = [];
                            arrCodes.push('await driver.sleep(500).wait(\'body\', 30000).html().then(function(code){');
                            arrCodes.push('    isPageError(code).should.be.false;');
                            arrCodes.push('});');
                            pushTestCode('waitBody', '', '', arrCodes);
                            checkerBrowser && checkerBrowser.sleep(500).wait('body', 10000).html().then(function(code){
                                isPageError(code).should.be.false;
                            }).then(doNext).catch(catchError) || doNext();
                            break;
                        case 'eval':
                            pushTestCode('eval', '', data.replace(/\n/g, ' \\n '), 'await driver.eval(_(\''+escapeStr(data)+'\'));');
                            checkerBrowser && checkerBrowser.eval(getVarStr(data)).then(doNext).catch(catchError) || doNext();
                            break;
                        case 'mouseMove':
                            arrCodes = [];
                            arrCodes.push('await driver.sleep(300).wait(\''+escapeStr(data.path)+'\', 30000)');
                            arrCodes.push('       .sleep(300).mouseMove('+(data.x ? data.x + ', ' + data.y : '')+');');
                            pushTestCode('mouseMove', data.text, data.path+(data.x !== undefined?', '+data.x+', '+data.y:''), arrCodes);
                            checkerBrowser && checkerBrowser.sleep(300).wait(data.path, 10000).sleep(300).mouseMove(data.x, data.y).then(doNext).catch(catchError) || doNext();
                            break;
                        case 'mouseDown':
                            arrCodes = [];
                            arrCodes.push('await driver.sleep(300).wait(\''+escapeStr(data.path)+'\', 30000)');
                            arrCodes.push('       .sleep(300).mouseMove('+data.x+', '+data.y+').mouseDown('+data.button+');');
                            pushTestCode('mouseDown', data.text, data.path + ', ' + data.x + ', ' + data.y + ', ' + data.button, arrCodes);
                            checkerBrowser && checkerBrowser.sleep(300).wait(data.path, 10000).sleep(300).mouseMove(data.x, data.y).mouseDown(data.button).then(doNext).catch(catchError) || doNext();
                            break;
                        case 'mouseUp':
                            arrCodes = [];
                            arrCodes.push('await driver.sleep(300).wait(\''+escapeStr(data.path)+'\', 30000)');
                            arrCodes.push('       .sleep(300).mouseMove('+data.x+', '+data.y+').mouseMove('+data.x+', '+data.y+').mouseUp('+data.button+');');
                            pushTestCode('mouseUp', data.text, data.path + ', ' + data.x + ', ' + data.y + ', ' + data.button, arrCodes);
                            checkerBrowser && checkerBrowser.sleep(300).wait(data.path, 10000).sleep(300).mouseMove(data.x, data.y).mouseMove(data.x, data.y).mouseUp(data.button).then(doNext).catch(catchError) || doNext();
                            break;
                        case 'click':
                            arrCodes = [];
                            var option = data.option;
                            arrCodes.push('await driver.sleep(300).wait(\''+escapeStr(data.path)+'\', '+(option?'5000':'30000')+')');
                            arrCodes.push('       .sleep(300).mouseMove('+data.x+', '+data.y+').click('+data.button+')'+(option?'.catch(catchError)':'')+';');
                            pushTestCode(option?'optionClick':'click', data.text, data.path + ', ' + data.x + ', ' + data.y + ', ' + data.button, arrCodes);
                            checkerBrowser && checkerBrowser.sleep(300).wait(data.path, 10000).sleep(300).mouseMove(data.x, data.y).click(data.button).then(doNext).catch(catchError) || doNext();
                            break;
                        case 'touchClick':
                            arrCodes = [];
                            arrCodes.push('await driver.sleep(300).wait(\''+escapeStr(data.path)+'\', 30000)');
                            arrCodes.push('       .sleep(300).touchClick();');
                            pushTestCode('touchClick', data.text, data.path, arrCodes);
                            checkerBrowser && checkerBrowser.sleep(300).wait(data.path, 10000).sleep(300).touchClick().then(doNext).catch(catchError) || doNext();
                            break;
                        case 'dblClick':
                            arrCodes = [];
                            arrCodes.push('await driver.sleep(300).wait(\''+escapeStr(data.path)+'\', 30000)');
                            arrCodes.push('       .sleep(300).mouseMove('+data.x+', '+data.y+').click(0).click(0);');
                            pushTestCode('dblClick', data.text, data.path + ', ' + data.x + ', ' + data.y + ', ' + data.button, arrCodes);
                            checkerBrowser && checkerBrowser.sleep(300).wait(data.path, 10000).sleep(300).mouseMove(data.x, data.y).click(0).click(0).then(doNext).catch(catchError) || doNext();
                            break;
                        case 'sendKeys':
                            pushTestCode('sendKeys', '', data.keys, 'await driver.sendKeys(\''+escapeStr(data.keys)+'\');');
                            checkerBrowser && checkerBrowser.sendKeys(data.keys).then(doNext).catch(catchError) || doNext();
                            break;
                        case 'keyDown':
                            pushTestCode('keyDown', '', data.character, 'await driver.keyDown(\''+escapeStr(data.character)+'\');');
                            checkerBrowser && checkerBrowser.keyDown(data.character).then(doNext).catch(catchError) || doNext();
                            break;
                        case 'keyUp':
                            pushTestCode('keyUp', '', data.character, 'await driver.keyUp(\''+escapeStr(data.character)+'\');');
                            checkerBrowser && checkerBrowser.keyUp(data.character).then(doNext).catch(catchError) || doNext();
                            break;
                        case 'scrollTo':
                            pushTestCode('scrollTo', '', data.x + ', ' + data.y, 'await driver.scrollTo('+data.x+', '+data.y+');');
                            checkerBrowser && checkerBrowser.scrollTo(data.x, data.y).then(doNext).catch(catchError) || doNext();
                            break;
                        case 'scrollElementTo':
                            arrCodes = [];
                            arrCodes.push('await driver.sleep(300).wait(\''+escapeStr(data.path)+'\', 30000)');
                            arrCodes.push('       .sleep(300).scrollElementTo('+ data.x + ', ' + data.y +');');
                            pushTestCode('scrollElementTo', data.text, data.path+(data.x !== undefined?', '+data.x+', '+data.y:''), arrCodes);
                            checkerBrowser && checkerBrowser.sleep(300).wait(data.path, 10000).sleep(300).scrollElementTo(data.x, data.y).then(doNext).catch(catchError) || doNext();
                            break;
                        case 'select':
                            arrCodes = [];
                            arrCodes.push('await driver.sleep(300).wait(\''+escapeStr(data.path)+'\', 30000)');
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
                            pushTestCode('acceptAlert', '', '', 'await driver.acceptAlert();');
                            checkerBrowser && checkerBrowser.acceptAlert().then(doNext).catch(catchError) || doNext();
                            break;
                        case 'dismissAlert':
                            pushTestCode('dismissAlert', '', '', 'await driver.dismissAlert();');
                            checkerBrowser && checkerBrowser.dismissAlert().then(doNext).catch(catchError) || doNext();
                            break;
                        case 'setAlert':
                            pushTestCode('setAlert', '', data.text, 'await driver.setAlert("'+data.text+'");');
                            checkerBrowser && checkerBrowser.setAlert(data.text).then(doNext).catch(catchError) || doNext();
                            break;
                        case 'uploadFile':
                            arrCodes = [];
                            arrCodes.push('await driver.sleep(300).wait(\''+escapeStr(data.path)+'\', {timeout: 30000, displayed: false})');
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
                                if(expectType === 'count'){
                                    arrCodes.push('await driver.sleep('+sleepTime+').wait(\''+escapeStr(expectParams[0])+'\', {timeout: 1000, noerror: true})');
                                    arrCodes.push('    .then(function(elements){');
                                    arrCodes.push('        return String(elements.length);');
                                    arrCodes.push('    })');
                                }
                                else if(expectType === 'imgdiff'){
                                    arrCodes.push("let self = this;");
                                    arrCodes.push("let imgBasePath = self.diffbasePath + '/' + self.caseName + '_' + self.stepId + '.png';");
                                    arrCodes.push("let imgNewPath = self.screenshotPath + '/' + self.caseName + '_' + self.stepId + '_new.png';");
                                    arrCodes.push("let imgDiffPath = self.screenshotPath + '/' + self.caseName + '_' + self.stepId + '_diff.png';");
                                    arrCodes.push("let elemshot = await driver.sleep(300).getScreenshot({");
                                    arrCodes.push("    elem: '"+escapeStr(expectParams[0])+"',");
                                    arrCodes.push("    filename: imgNewPath");
                                    arrCodes.push("});");
                                    arrCodes.push("elemshot = new Buffer(elemshot, 'base64');");
                                    arrCodes.push("if(!fs.existsSync(imgBasePath) || process.env['npm_config_rebuilddiff']){");
                                    arrCodes.push("    fs.writeFileSync(imgBasePath, elemshot);");
                                    arrCodes.push("}");
                                    arrCodes.push("let diff = resemble(elemshot).compareTo(imgBasePath).ignoreColors();");
                                    arrCodes.push("let diffResult = await new Promise((resolve) => diff.onComplete(resolve));");
                                    arrCodes.push("diffResult.getDiffImage().pack().pipe(fs.createWriteStream(imgDiffPath));");
                                    arrCodes.push("diffResult.rawMisMatchPercentage");
                                }
                                else{
                                    if(reDomRequire.test(expectType)){
                                        arrCodes.push('await driver.sleep('+sleepTime+').wait(\''+escapeStr(expectParams[0])+'\', 30000)');
                                    }
                                    else{
                                        arrCodes.push('await driver');
                                    }
                                    switch(expectType){
                                        case 'val':
                                            arrCodes.push('    .val()');
                                            break;
                                        case 'text':
                                            arrCodes.push('    .text()');
                                            break;
                                        case 'displayed':
                                            arrCodes.push('    .displayed()');
                                            break;
                                        case 'enabled':
                                            arrCodes.push('    .enabled()');
                                            break;
                                        case 'selected':
                                            arrCodes.push('    .selected()');
                                            break;
                                        case 'attr':
                                            arrCodes.push('    .attr(\''+escapeStr(expectParams[1])+'\')');
                                            break;
                                        case 'css':
                                            arrCodes.push('    .css(\''+escapeStr(expectParams[1])+'\')');
                                            break;
                                        case 'url':
                                            arrCodes.push('    .url()');
                                            break;
                                        case 'title':
                                            arrCodes.push('    .title()');
                                            break;
                                        case 'cookie':
                                            arrCodes.push('    .cookie(\''+escapeStr(expectParams[0])+'\')');
                                            break;
                                        case 'localStorage':
                                            arrCodes.push('    .localStorage(\''+escapeStr(expectParams[0])+'\')');
                                            break;
                                        case 'sessionStorage':
                                            arrCodes.push('    .sessionStorage(\''+escapeStr(expectParams[0])+'\')');
                                            break;
                                        case 'alert':
                                            arrCodes.push('    .getAlert()');
                                            break;
                                        case 'jscode':
                                            arrCodes.push('    .eval(\''+escapeStr(expectParams[0])+'\')');
                                            break;
                                    }
                                    arrCodes.push('    .should.not.be.a(\'error\')');
                                }
                                var codeExpectTo = expectTo.replace(/"/g, '\\"').replace(/\n/g, '\\n');
                                switch(expectCompare){
                                    case 'equal':
                                        arrCodes.push('    .should.equal(_('+(/^(true|false)$/.test(codeExpectTo)?codeExpectTo:'\`'+escapeStr(codeExpectTo)+'\`')+'));');
                                        break;
                                    case 'notEqual':
                                        arrCodes.push('    .should.not.equal(_('+(/^(true|false)$/.test(codeExpectTo)?codeExpectTo:'\`'+escapeStr(codeExpectTo)+'\`')+'));');
                                        break;
                                    case 'contain':
                                        arrCodes.push('    .should.contain(_(\`'+escapeStr(codeExpectTo)+'\`));');
                                        break;
                                    case 'notContain':
                                        arrCodes.push('    .should.not.contain(_(\`'+escapeStr(codeExpectTo)+'\`));');
                                        break;
                                    case 'above':
                                        arrCodes.push('    .should.above(_(\`'+escapeStr(codeExpectTo)+'\`));');
                                        break;
                                    case 'below':
                                        arrCodes.push('    .should.below(_(\`'+escapeStr(codeExpectTo)+'\`));');
                                        break;
                                    case 'match':
                                        arrCodes.push('    .should.match('+escapeStr(codeExpectTo)+');');
                                        break;
                                    case 'notMatch':
                                        arrCodes.push('    .should.not.match('+escapeStr(codeExpectTo)+');');
                                        break;
                                }
                                pushTestCode('expect', '', expectType + ', ' + String(expectParams) + ', ' + expectCompare + ', ' + expectTo, arrCodes);
                                if(checkerBrowser){
                                    var element, value;
                                    if(expectType === 'count'){
                                        value = yield checkerBrowser.sleep(sleepTime).wait(expectParams[0], {
                                            timeout: 1000,
                                            noerror: true
                                        }).then(function(elements){
                                            return String(elements.length);
                                        });
                                    }
                                    else if(expectType === 'imgdiff'){
                                        // 录制时，不需要进行即时的图片校验
                                        value = 0;
                                    }
                                    else{
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
                                            case 'jscode':
                                                value = yield checkerBrowser.eval(expectParams[0]);
                                                break;
                                        }
                                        value.should.not.be.a('error');
                                    }
                                    switch(expectCompare){
                                        case 'equal':
                                            expectTo = /^(true|false)$/.test(expectTo)?eval(expectTo):eval('\`'+expectTo+'\`');
                                            value.should.equal(getVarStr(expectTo));
                                            break;
                                        case 'notEqual':
                                            expectTo = /^(true|false)$/.test(expectTo)?eval(expectTo):eval('\`'+expectTo+'\`');
                                            value.should.not.equal(getVarStr(expectTo));
                                            break;
                                        case 'contain':
                                            value.should.contain(getVarStr(eval('\`'+expectTo+'\`')));
                                            break;
                                        case 'notContain':
                                            value.should.not.contain(getVarStr(eval('\`'+expectTo+'\`')));
                                            break;
                                        case 'above':
                                            value.should.above(getVarStr(eval('\`'+expectTo+'\`')));
                                            break;
                                        case 'below':
                                            value.should.below(getVarStr(eval('\`'+expectTo+'\`')));
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
                        case 'insertVar':
                            var varinfo = data.varinfo;
                            var varType = varinfo.type;
                           if(varinfo.isNew){
                                updateNewVar(varinfo.name, varinfo.value);
                                isConfigEdited = true;
                            }
                            arrCodes = [];
                            arrCodes.push('await driver.sleep(300).wait(\''+escapeStr(data.path)+'\', 30000)');
                            arrCodes.push('       .val(_(\`'+escapeStr(varinfo.template)+'\`));');
                            pushTestCode('insertVar', data.text, data.path + ', ' + varinfo.template, arrCodes);
                            checkerBrowser && checkerBrowser.sleep(300).wait(data.path, 10000).val(getVarStr(eval('\`'+varinfo.template+'\`'))).then(doNext).catch(catchError) || doNext();
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
                                    arrCodes.push('await driver.sleep(300).wait(\''+escapeStr(updateParams[0])+'\', 30000)');
                                }
                                else{
                                    arrCodes.push('await driver');
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
                                pushTestCode('updateVar', '', varName + ', ' + updateType + ', ' + String(updateParams) + ', ' + updateRegex, arrCodes);
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
                                    updateNewVar(varName, value);
                                    if(data.isNew){
                                        isConfigEdited = true;
                                    }
                                }
                            }).then(doNext).catch(catchError);
                            break;
                        // 插入用例
                        case 'module':
                            var moduleName = /[\/\\]/.test(data) ? data : commonSpecRelPath + data;
                            loadModule(moduleName, function(error){
                                if(error !== null){
                                    catchError(error);
                                }
                                else{
                                    console.log('  module'.cyan+': ', moduleName);
                                    arrTestCodes.push('callSpec(\''+escapeStr(moduleName)+'\');\r\n');
                                    doNext();
                                }
                            });
                            break;
                    }
                }
            });
            async.series(arrTasks, function(){
                next();
            });
        }, 1);

        function loadModule(moduleName, callback){
            co(function*(){
                console.log(('  -------------- start load '+moduleName+' --------------').gray);
                sendWsMessage('moduleStart', {
                    file: moduleName
                });
                isModuleLoading = true;
                var arrTasks = [];
                if(mobile){
                    arrTasks.push(runSpec(moduleName, recorderMobileApp, testVars, function(title, errorMsg){
                        title = title.replace(/^\w+:/, function(all){
                            return all.cyan;
                        });
                        console.log('  '+title);
                        console.log('   '+(errorMsg?symbols.err.red+__('exec_failed').red + '\t' + errorMsg:symbols.ok.green+__('exec_succeed').green));
                    }));
                }
                else{
                    arrTasks.push(runSpec(moduleName, recorderBrowser, testVars, function(title, errorMsg){
                        title = title.replace(/^\w+:/, function(all){
                            return all.cyan;
                        });
                        console.log('  '+title);
                        console.log('   '+(errorMsg?symbols.err.red+__('exec_failed').red + '\t' + errorMsg:symbols.ok.green+__('exec_succeed').green));
                    }));
                    if(checkerBrowser){
                        arrTasks.push(function*(){
                            yield sleep(200);
                            yield runSpec(moduleName, checkerBrowser, testVars)
                        });
                    }
                }
                yield arrTasks;
                yield recorderBrowser.sleep(1000);
                if(!mobile){
                    yield recorderBrowser.eval(function(done){
                        setInterval(function(){
                            if(document.readyState==='complete')done()
                        }, 10);
                    });
                }
                sendWsMessage('moduleEnd', {
                    file: moduleName,
                    success: true
                });
                console.log(('  -------------- end load '+moduleName+' --------------').gray);
                isModuleLoading = false;
            }).then(function(){
                callback && callback(null);
            }).catch(function(error){
                console.log(('  -------------- load '+moduleName+' failed --------------').gray);
                sendWsMessage('moduleEnd', {
                    file: moduleName,
                    success: false
                });
                callback && callback(error);
            });
            function sleep(ms){
                return function(cb){
                    setTimeout(cb, ms);
                };
            }
        }

        function* runSpec(name, driver, testVars, callback){
            var runtimeObj = {
                driver: driver,
                testVars: testVars
            };
            var casePath = path.dirname(caseName);
            runtimeObj.screenshotPath = rootPath + '/screenshots/' + casePath;
            runtimeObj.diffbasePath = rootPath + '/diffbase/' + casePath;
            runtimeObj.caseName = caseName.replace(/.*\//g, '').replace(/\s*[:\.\:\-\s]\s*/g, '_');
            mkdirs(runtimeObj.screenshotPath);
            mkdirs(runtimeObj.diffbasePath);
            runtimeObj.stepId = 0;
            global.before = function(func){
                func.call(runtimeObj);
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
                    yield spec.func.call(runtimeObj);
                }
                catch(e){
                    errorMsg = e;
                }
                callback && callback(spec.title, errorMsg);
            }
        }

        function onReady(){
            // recorder browser

            setTimeout(function(){
                newChromeBrowser({hosts: hosts, isRecorder: true, debug: debug}, function*(browser){
                    if(!mobile){
                        if(browserSize){
                            yield browser.windowSize(browserSize[0], browserSize[1]);
                        }
                        else{
                            yield browser.maximize();
                        }
                    }
                    yield browser.url('chrome-extension://'+(debug?'dloihppejiolohmfmhdceaikmmfmmemf':'njkfhfdkecbpjlnfmminhmdcakopmcnc')+'/'+(mobile?'mobile':'start')+'.html');
                    yield browser.eval('document.title="'+__('recorder_browser_title')+' - UIRecorder"');
                    console.log(__('recorder_browser_opened').green);
                    recorderBrowser = browser;
                    checkAllReady();
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
            }, recorderBrowserTimeout);
            if(mobile){
                // init mobile
                function updateMobileInfo(){
                    cmdQueue.push({cmd:'!updateMobile'}, 1, function(){
                        setTimeout(updateMobileInfo, 200);
                    });
                }
                newMobileApp({
                    mobileAppPath: mobileAppPath,
                    mobilePlatform: mobilePlatform,
                    mobileDevice: mobileDevice
                }, function(mobileApp){
                    recorderMobileApp = mobileApp;
                    checkAllReady();
                    updateMobileInfo();
                });
            }
            else if(openChecker){
                // checker browser
                setTimeout(function(){
                    newChromeBrowser({hosts: hosts, isRecorder: false, debug: debug}, function*(browser){
                        if(browserSize){
                            yield browser.windowSize(browserSize[0], browserSize[1]);
                        }
                        else{
                            yield browser.maximize();
                        }
                        yield browser.eval('document.title="'+__('checker_browser_title')+' - UIRecorder";');
                        console.log(__('checker_browser_opened').green);
                        console.log('');
                        console.log('------------------------------------------------------------------'.green);
                        console.log('');
                        checkerBrowser = browser;
                        checkAllReady();
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
                }, checkerBrowserTimeout);
            }
        }
        function checkAllReady(){
            if(recorderBrowser && ((openChecker && checkerBrowser) || (mobile && recorderMobileApp) || !(openChecker || mobile))){
                if(continueRecord){
                    var testFile = path.resolve(fileName);
                    var absfileName = path.relative(rootPath, testFile).replace(/\\/g,'/');
                    loadModule(absfileName);
                }
            }
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
                        (lastCmdData.x == data.x || Math.abs(lastCmdData.x - data.x) < 20) &&
                        (lastCmdData.y == data.y || Math.abs(lastCmdData.y - data.y) < 20)
                    ){
                        // 条件满足，合并为dblClick
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
                    // 500毫秒以内才进行dblClick合并
                    dblClickFilterTimer = setTimeout(function(){
                        cmdQueue.push(lastCmdInfo2, 2);
                        lastCmdInfo2 = null;
                    }, 500);
                }
                lastCmdInfo2 = cmdInfo;
            }
            if(/^!/.test(cmdInfo.cmd)){
                cmdQueue.push(cmdInfo, 2);
            }
            else{
                sendKeysFilter(cmdInfo);
            }
        }
        function onEnd(bSaveFile){
            recorderBrowser.close(function(){
                recorderBrowser = null;
                console.log('');
                console.log('------------------------------------------------------------------'.green);
                console.log('');
                if(bSaveFile){
                    saveTestFile();
                }
                console.log(__('recorder_server_closed').green);
                console.log(__('recorder_browser_closed').green);
                if(checkerBrowser){
                    checkerBrowser.close(function(){
                        checkerBrowser = null;
                        console.log(__('checker_browser_closed').green);
                        chromedriver.stop();
                        process.exit();
                    });
                }
                else{
                    chromedriver.stop();
                    process.exit();
                }
            });
        }
        var recorderConfig = {
            version: pkg.version,
            pathAttrs : pathAttrs,
            attrValueBlack: attrValueBlack,
            classValueBlack: classValueBlack,
            hideBeforeExpect: hideBeforeExpect,
            mobilePlatform: mobilePlatform,
            testVars: testVars,
            specLists: specLists,
            i18n: __('chrome')
        };
        startRecorderServer(recorderConfig, onReady, onCommand, onEnd);
        function saveTestFile(){
            if(allCaseCount > 0){
                var testFile = path.resolve(rootPath + '/' + fileName);
                arrTestCodes = arrTestCodes.map(function(line){
                    return line?'    '+ line:'';
                });
                if(continueRecord){
                    var testContent = fs.readFileSync(testFile).toString();
                    testContent = testContent.replace(/[ \t]+function _\(str\){/, function(all){
                        return arrTestCodes.join('\r\n') + '\r\n' + all;
                    });
                    fs.writeFileSync(testFile, testContent);
                }
                else{
                    var tempalteFile = path.resolve(__dirname, '../template/'+(mobile?'jwebdriver-mobile':'jwebdriver')+'.js');
                    var templateContent = fs.readFileSync(tempalteFile).toString();
                    mkdirs(path.dirname(testFile));
                    var sizeCode = '';
                    if(browserSize){
                        sizeCode = '.windowSize('+browserSize[0]+', '+browserSize[1]+')';
                    }
                    else{
                        sizeCode = '.maximize()';
                    }
                    if(mobileAppPath){
                        if(!/^https?:\/\//.test(mobileAppPath)){
                            var relAppPath = path.relative(rootPath, mobileAppPath);
                            if(/^\.\./.test(relAppPath) === false){
                                mobileAppPath = relAppPath;
                            }
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
                            case 'platformName':
                                return mobilePlatform;
                        }
                        return all;
                    });
                    fs.writeFileSync(testFile, templateContent);
                    // delete diff base
                    var diffbasePath = rootPath + '/diffbase/' + path.dirname(fileName);
                    if(fs.existsSync(diffbasePath)){
                        var escapedCaseName = caseName.replace(/.*\//g, '').replace(/\s*[:\.\:\-\s]\s*/g, '_');
                        var dirList = fs.readdirSync(diffbasePath);
                        dirList.forEach(function(item){
                            if(item.indexOf(escapedCaseName) === 0){
                                fs.unlinkSync(diffbasePath + '/' + item);
                            }
                        });
                    }
                }

                if(checkerBrowser){
                    console.log(__('check_sumary').green, String(allCaseCount).bold, String(allCaseCount-failedCaseCount).bold, String(failedCaseCount).bold.red + colors.styles.green.open);
                }
                else{
                    console.log(__('nocheck_sumary').green, String(allCaseCount).bold, mobile?'':('('+__('nocheck').yellow + colors.styles.green.open+')'));
                }
                console.log(__('test_spec_saved').green+fileName.bold);
                if(raw){
                    var rawFile = testFile.replace(/\.js$/, '.json');
                    var rawFileName = fileName.replace(/\.js$/, '.json');
                    if(continueRecord && fs.existsSync(rawFile)){
                        var oldRawContent = fs.readFileSync(rawFile).toString();
                        try{
                            var arrOldRaw = JSON.parse(oldRawContent);
                            arrRawCmds = arrOldRaw.concat(arrRawCmds);
                        }
                        catch(e){}
                    }
                    fs.writeFileSync(rawFile, JSON.stringify(arrRawCmds, null, 4));
                    console.log(__('raw_cmds_saved').green+rawFileName.bold);
                }
                if(isConfigEdited){
                    fs.writeFileSync(configFile, JSON.stringify(configJson, null, 4));
                    console.log(__('config_saved').green + configPath.bold);
                }
            }
            else{
                console.log(__('no_step_recorded').yellow);
            }
            console.log('');
        }

        function updateNewVar(name, key){
            testVars[name] = key;
            sendWsMessage('config', recorderConfig);
        }
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

// check page error
function isPageError(code){
    return code == '' || / jscontent="errorCode" jstcache="\d+"|diagnoseConnectionAndRefresh|dnserror_unavailable_header|id="reportCertificateErrorRetry"|400 Bad Request|403 Forbidden|404 Not Found|500 Internal Server Error|502 Bad Gateway|503 Service Temporarily Unavailable|504 Gateway Time-out/i.test(code);
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
                case 'save':
                    onCommand({
                        cmd: 'end'
                    });
                    setTimeout(function(){
                        wsConnection && wsConnection.close();
                        server.close(function(){
                            onEnd(true);
                        });
                    }, 500);
                    break;
                case 'end':
                    onCommand({
                        cmd: 'end'
                    });
                    setTimeout(function(){
                        wsConnection && wsConnection.close();
                        server.close(function(){
                            onEnd(false);
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
                args:['--enable-automation', '--disable-bundled-ppapi-flash', '--load-extension='+path.resolve(__dirname, '../chrome-extension')],
                prefs: {
                    'plugins.plugins_disabled': ['Adobe Flash Player']
                }
            };
        }
        else{
            var crxPath = path.resolve(__dirname, '../tool/uirecorder.crx');
            var extContent = fs.readFileSync(crxPath).toString('base64');
            capabilities.chromeOptions = {
                args: ['--enable-automation', '--disable-bundled-ppapi-flash'],
                prefs: {
                    'plugins.plugins_disabled': ['Adobe Flash Player']
                },
                extensions: [extContent]
            };
        }
    }
    else{
        capabilities.chromeOptions = {
            args: ['--enable-automation', '--disable-bundled-ppapi-flash'],
            prefs: {
                'plugins.plugins_disabled': ['Adobe Flash Player']
            }
        };
    }
    driver.session(capabilities, function*(error, browser){
        if(error){
            console.log(__('chrome_init_failed').red);
            console.log(error);
            if(/unable to connect to renderer/.test(error)){
                console.log(__('localhost_hosts_tip').red);
            }
            chromedriver.stop();
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
        strText = cp.execSync('idevice_id -l').toString();
        strText.replace(/(.+)\r?\n/g, function(all, udid){
            var deviceName = cp.execSync('idevice_id -d '+udid).toString();
            deviceName = deviceName.replace(/\r?\n/g, '');
            arrDeviceList.push({
                name: deviceName,
                udid: udid
            });
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
    var mobilePlatform = options.mobilePlatform;
    var mobileDevice = options.mobileDevice;
    var deviceList = getDeviceList(mobilePlatform);
    var capabilities = {
        'platformName': mobilePlatform,
        'app': /^(\/|[a-z]:\\|https?:\/\/)/i.test(mobileAppPath)?mobileAppPath:path.resolve(mobileAppPath)
    };
    if(mobileDevice){
        capabilities.deviceName = mobileDevice;
    }
    else if(deviceList.length === 0){
        capabilities.deviceName = mobilePlatform === 'Android'?'Android Emulator':'iPhone 7';
    }
    else{
        capabilities.udid = deviceList[0].udid;
    }
    driver.session(capabilities).then(function(){
        callback(this);
    }).catch(function(e){
        console.log(__('mobile_open_failed').red, e);
        chromedriver.stop();
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
