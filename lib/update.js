var latestVersion  = require('latest-version');
var semver = require('semver');
var pkg = require('../package.json');
var i18n = require('./i18n');

function checkUpdate(locale){
    if(locale){
        i18n.setLocale(locale);
    }
    var pkgName = pkg.name;
    latestVersion(pkgName).then(function(newVersion){
        var oldVersion = pkg.version;
        var isNew = semver.gt(newVersion, oldVersion)
        if(isNew){
            process.on('exit', function(){
                var updateCmd = 'npm update '+pkgName+' -g';
                console.log('');
                console.log('------------------------------------------------------------------'.yellow);
                console.log('');
                console.log(__('update_tip', oldVersion.gray, newVersion.green.bold, updateCmd.cyan.bold));
                console.log('');
                console.log('------------------------------------------------------------------'.yellow);
            });
            process.on('SIGINT', function () {
                console.error('');
                process.exit();
            });
        }
    });
}

module.exports = checkUpdate;
