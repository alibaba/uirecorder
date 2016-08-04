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
    var testVars = config.vars;
    var browsers = webdriverConfig.browsers;
    browsers = browsers.replace(/^\s+|\s+$/g, '');

    // read hosts
    var hostsPath = './hosts';
    var hosts = '';
    if(fs.existsSync(hostsPath)){
        hosts = fs.readFileSync(hostsPath).toString();
    }

    var filename = path.basename(__filename);

    browsers.split(/\s*,\s*/).forEach(function(browser){
        var browserInfo = browser.split(' ');
        var browserName = browserInfo[0];
        var browserVersion = browserInfo[1];

        describe(filename + ' : ' + browser, function(){

            this.timeout(600000);

            var browser;
            before(function*(){
                var driver = new JWebDriver({
                    'host': webdriverConfig.host,
                    'port': webdriverConfig.port || 4444
                });
                delete webdriverConfig['host'];
                delete webdriverConfig['port'];
                delete webdriverConfig['browsers'];
                browser = yield driver.session(Object.assign(webdriverConfig, {
                    'hosts': hosts,
                    'browserName': browserName,
                    'version': browserVersion,
                    'ie.ensureCleanSession': true
                }));
                yield browser.maximize();
                this.browser = browser;
                this.testVars = testVars;
            });

            module.exports();

            after(function*(){
                if(browser){
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
