var i18n = require('i18n');
var path = require('path');
var osLocale = require('os-locale');
i18n.configure({
    locales:['en', 'zh-cn', 'zh-tw'],
    defaultLocale: 'en',
    directory: path.resolve(__dirname, '../i18n/'),
    updateFiles: false,
    extension: '.js',
    register: global
});

var loc = osLocale.sync();
loc = loc.toLowerCase().replace(/_/g, '-');
i18n.setLocale(loc);
module.exports = i18n;
