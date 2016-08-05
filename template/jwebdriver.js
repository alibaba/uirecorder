var expect  = require('expect.js');
var faker  = require('faker');

module.exports = function(browser, testVars){

    before(function(){
        browser = browser || this.browser;
        testVars = testVars || this.testVars;
    });

{$testCodes}
};

if(module.parent && /mocha\.js/.test(module.parent.id)){
    runThisSpec();
}

function runThisSpec(){
    var JWebDriver = require('jwebdriver');
    require('mocha-generators').install();
    var fs = require('fs');
    var path = require('path');

    // read config
    var config = require('./config.json');
    var webdriverConfig = config.webdriver;
    var host = webdriverConfig.host;
    var port = webdriverConfig.port || 4444;
    var testVars = config.vars;
    var browsers = webdriverConfig.browsers;
    browsers = browsers.replace(/^\s+|\s+$/g, '');
    delete webdriverConfig['host'];
    delete webdriverConfig['port'];
    delete webdriverConfig['browsers'];

    // read hosts
    var hostsPath = './hosts';
    var hosts = '';
    if(fs.existsSync(hostsPath)){
        hosts = fs.readFileSync(hostsPath).toString();
    }

    var specFilename = path.basename(__filename);

    browsers.split(/\s*,\s*/).forEach(function(browserName){
        var browserInfo = browserName.split(' ');
        browserName = browserInfo[0];
        var browserVersion = browserInfo[1];

        describe(specFilename + ' : ' + browserName, function(){

            this.timeout(600000);

            var browser;
            before(function*(){
                var driver = new JWebDriver({
                    'host': host,
                    'port': port
                });
                var sessionConfig = Object.assign({}, webdriverConfig, {
                    'hosts': hosts,
                    'browserName': browserName,
                    'version': browserVersion,
                    'ie.ensureCleanSession': true
                });
                browser = yield driver.session(sessionConfig);
                yield browser.maximize();
                this.browser = browser;
                this.testVars = testVars;
            });

            module.exports();

            after(function*(){
                if(browser){
                    if(fs.existsSync('screenshots')){
                        var png_base64  = yield browser.getScreenshot();
                        var pngFileName = 'screenshots/' + specFilename.replace(/\.js$/,'') + '_' + browserName+'.png';
                        fs.writeFileSync(pngFileName, png_base64, 'base64');
                    }
                    yield browser.close();
                }
            });

        });
    });
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
