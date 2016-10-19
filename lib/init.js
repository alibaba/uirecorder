var fs = require('fs');
var path = require('path');
var inquirer = require('inquirer');
var i18n = require('./i18n');

function initConfig(options){
    var locale = options.locale;
    var mobile = options.mobile;
    if(locale){
        i18n.setLocale(locale);
    }
    var configFile = path.resolve('config.json');
    var config = {};
    if(fs.existsSync(configFile)){
        var content = fs.readFileSync(configFile).toString();
        try{
            config = JSON.parse(content);
        }
        catch(e){}
    }
    var recorder;
    config.webdriver = config.webdriver || {};
    config.vars = config.vars || {};
    var webdriver = config.webdriver;
    webdriver.host = webdriver.host || '127.0.0.1';
    webdriver.port = webdriver.port || 4444;
    if(!mobile){
        config.recorder = config.recorder || {};
        recorder = config.recorder;
        recorder.pathAttrs = recorder.pathAttrs || 'data-id,data-name,type,data-type,data-role,data-value';
        recorder.attrValueBlack = recorder.attrValueBlack || '';
        webdriver.browsers = webdriver.browsers || 'chrome, ie 11';
    }
    var questions = [];
    if(mobile){
        questions = [
            {
                'type': 'input',
                'name': 'host',
                'message': __('webdriver_host'),
                'default': webdriver.host,
                'filter': function(input){
                    return input.replace(/(^\s+|\s+$)/g, '');
                },
                'validate': function(input){
                    return input !== '' && /^https?:\/\//.test(input) === false;
                }
            },
            {
                'type': 'input',
                'name': 'port',
                'message': __('webdriver_port'),
                'default': webdriver.port,
                'filter': function(input){
                    return input.replace(/(^\s+|\s+$)/g, '');
                },
                'validate': function(input){
                    return input !== '';
                }
            }
        ];
    }
    else{
        questions = [
            {
                'type': 'input',
                'name': 'pathAttrs',
                'message': __('dom_path_config'),
                'default': recorder.pathAttrs,
                'filter': function(input){
                    return input.replace(/(^\s+|\s+$)/g, '');
                }
            },
            {
                'type': 'input',
                'name': 'attrValueBlack',
                'message': __('attr_black_list'),
                'default': recorder.attrValueBlack,
                'filter': function(input){
                    return input.replace(/(^\s+|\s+$)/g, '');
                }
            },
            {
                'type': 'input',
                'name': 'host',
                'message': __('webdriver_host'),
                'default': webdriver.host,
                'filter': function(input){
                    return input.replace(/(^\s+|\s+$)/g, '');
                },
                'validate': function(input){
                    return input !== '' && /^https?:\/\//.test(input) === false;
                }
            },
            {
                'type': 'input',
                'name': 'port',
                'message': __('webdriver_port'),
                'default': webdriver.port,
                'filter': function(input){
                    return input.replace(/(^\s+|\s+$)/g, '');
                },
                'validate': function(input){
                    return input !== '';
                }
            },
            {
                'type': 'input',
                'name': 'browsers',
                'message': __('webdriver_browsers'),
                'default': webdriver.browsers,
                'filter': function(input){
                    return input.replace(/(^\s+|\s+$)/g, '');
                },
                'validate': function(input){
                    return input !== '';
                }
            }
        ];
    }
    inquirer.prompt(questions).then(function(anwsers){
        webdriver.host = String(anwsers.host).replace(/^\s+|\s+$/g, '');
        webdriver.port = String(anwsers.port).replace(/^\s+|\s+$/g, '');
        if(!mobile){
            recorder.pathAttrs = String(anwsers.pathAttrs).replace(/^\s+|\s+$/g, '');
            recorder.attrValueBlack = String(anwsers.attrValueBlack).replace(/^\s+|\s+$/g, '');
            webdriver.browsers = String(anwsers.browsers).replace(/^\s+|\s+$/g, '');
        }
        fs.writeFileSync(configFile, JSON.stringify(config, null, 4));
        console.log('config.json '.bold+__('file_saved').green);
        if(!mobile){
            var hostsFile = path.resolve('hosts');
            if(fs.existsSync(hostsFile) === false){
                fs.writeFileSync(hostsFile, '');
                console.log('hosts '.bold+__('file_created').green);
            }
        }
    }).catch(function(err){
        console.log(err)
    });
}

module.exports = initConfig;
