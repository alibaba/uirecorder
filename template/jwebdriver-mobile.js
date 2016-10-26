var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var faker  = require('faker');
var chai = require("chai");
var should = chai.should();
var JWebDriver = require('jwebdriver');
chai.use(JWebDriver.chaiSupportChainPromise);

var appPath = '{$appPath}';
var platformName = /\.apk$/.test(appPath)?'Android':'iOS';

module.exports = function(){

    var driver, testVars;

    before(function(){
        var self = this;
        driver = self.driver;
        testVars = self.testVars;
    });

{$testCodes}
};

if(module.parent && /mocha\.js/.test(module.parent.id)){
    runThisSpec();
}

function runThisSpec(){
    // read config
    var config = require('./config.json');
    var webdriverConfig = Object.assign({},config.webdriver);
    var host = webdriverConfig.host;
    var port = webdriverConfig.port || 4444;
    var testVars = config.vars;

    var specName = path.basename(__filename).replace(/\.js$/,'');
    var arrDeviceList = getEnvList() || getDeviceList(platformName);
    if(arrDeviceList.length ===0 ){
        console.log('Search mobile device failed!');
        process.exit(1);
    }

    arrDeviceList.forEach(function(device){
        var caseName = specName + ' : ' + (device.name?device.name+' ('+device.udid+')':device.udid);

        describe(caseName, function(){

            this.timeout(600000);
            this.slow(1000);

            before(function(){
                var self = this;
                var driver = new JWebDriver({
                    'host': host,
                    'port': port
                });
                self.driver = driver.session({
                    'platformName': platformName,
                    'udid': device.udid,
                    'app': path.resolve(appPath)
                });
                self.testVars = testVars;
                return self.driver;
            });

            module.exports();

            after(function(){
                var driver = this.driver;
                return driver && driver.then(function(){
                    if(fs.existsSync('screenshots')){
                        return this.getScreenshot('screenshots/' + caseName.replace(/ : /,'_') + '.png');
                    }
                }).close();
            });

        });
    });
}

function getEnvList(){
    var strEnvList = process.env.devices;
    if(strEnvList){
        return strEnvList.split(/\s*,\s*/).map(function(udid){
            return {udid: udid};
        });
    }
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
        // for ios
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

function callSpec(name){
    try{
        require('./'+name)();
    }
    catch(e){
        console.log(e)
        process.exit(1);
    }
}
