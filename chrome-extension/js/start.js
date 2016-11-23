(function(){
    var frmStart = document.getElementById('formStart');
    var txtUrl = document.getElementById('url');
    var btnStart = document.getElementById('btnStart');
    var lstCommons = document.getElementById('commons');

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

    var testVars = {};

    // load config
    chrome.runtime.sendMessage({
        type: 'getConfig'
    }, function(config){
        i18n = config.i18n;
        testVars = config.testVars;
        txtUrl.setAttribute('placeholder', __('start_placeholder'));
        btnStart.textContent = __('start_button');
        var specLists = config.specLists;
        var arrHtmls = [];
        for(var i in specLists){
            arrHtmls.push('<option>'+specLists[i]+'</option>');
        }
        lstCommons.innerHTML = arrHtmls.join('');
    });
    txtUrl.focus();
    frmStart.onsubmit = function(){
        var url = txtUrl.value;
        url = url.replace(/^\s+|\s+$/g, '');
        if(/^([\w-]+\.)+(com|net|org|com\.cn)(\s+|$)/.test(url)){
            url = 'http://' + url;
        }
        if(/^https?:\/\//i.test(url)){
            chrome.runtime.sendMessage({
                type: 'command',
                data: {
                    frame: null,
                    cmd: 'url',
                    data: {
                        url: url
                    }
                }
            });
            location.href = getVarStr(url);
        }
        else if(/\.js$/.test(url)){
            chrome.runtime.sendMessage({
                type: 'command',
                data: {
                    frame: null,
                    cmd: 'module',
                    data: url
                }
            });
        }
        else{
            alert('请输入标准的url或用例文件名。');
        }
        return false;
    }

    function getVarStr(str){
        return str.replace(/\{\{(.+?)\}\}/g, function(all, key){
            return testVars[key] || '';
        });
    }
})();

