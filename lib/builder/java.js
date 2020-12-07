const path = require('path');
const fs = require('fs');

function getJavaTemplateContent(rootPath) {
    var templateName = 'javaTemplate.java';
    var tempalteFilePath = path.resolve(__dirname, '../../template/' + templateName);
    var customTemplateFilePath = path.join(rootPath, '../template/', templateName);
    if (fs.existsSync(customTemplateFilePath)) {
        tempalteFilePath = customTemplateFilePath;
    }
    return fs.readFileSync(tempalteFilePath).toString();
}

function getArrRawCmdsTarget(arrRawCmdsTarget, browserSize, arrRawCmds) {
    //console.log("lion test");
    // if (browserSize) {
    //     arrRawCmdsTarget[0] = 'Configuration.browserSize = "' + browserSize[0] + 'x' + browserSize[1] + '";';
    // } else {
    //     arrRawCmdsTarget[0] = 'Configuration.startMaximized=true;';
    // }
    arrRawCmdsTarget[0] = '//自动生成的操作脚本从这里开始';
    for (jj = 0, len = arrRawCmds.length; jj < len; jj++) {
        try{
            arrRawCmds[jj].data = arrRawCmds[jj].data.replace(/\"/g, "'");
        }
        catch(e){
        }
        try{
            arrRawCmds[jj].data.path = arrRawCmds[jj].data.path.replace(/\"/g, "'");
        }
        catch(e){
        }
        // console.log('arrRawCmds[jj].type:'+arrRawCmds[jj].type);
        switch (arrRawCmds[jj].type) {
            case 'contextClick':
                arrRawCmdsTarget[jj + 1] = 'actions.contextClick("' + arrRawCmds[jj].data.path + '");' + '//点击:' + arrRawCmds[jj].data.text;
                //console.log('lion arrRawCmdsTarget[' + jj + 1 + ']:' + arrRawCmdsTarget[jj + 1]);
                break;
            case 'url':
                // arrRawCmdsTarget[jj + 1] = 'actions.openUrl("' + arrRawCmds[jj].data + '", operation,"' + browserSize[0] + 'x' + browserSize[1] + '");' + '//打开URL';
                arrRawCmdsTarget[jj + 1] = 'actions.openUrl("' + arrRawCmds[jj].data +'","'+ browserSize[0] + 'x' + browserSize[1] + '");' + '//打开URL';
                //console.log('lion arrRawCmdsTarget[' + jj + 1 + ']:' + arrRawCmdsTarget[jj + 1]);
                break;
            case 'dblClick':
                arrRawCmdsTarget[jj + 1] = 'actions.click("' + arrRawCmds[jj].data.path + '");' + '//点击:' + arrRawCmds[jj].data.text;
                //console.log('lion arrRawCmdsTarget[' + jj + 1 + ']:' + arrRawCmdsTarget[jj + 1]);
                break;
            case 'click':
                if (arrRawCmds[jj].data.path.indexOf('radio') != -1 || arrRawCmds[jj].data.path.indexOf('checkbox') != -1 || arrRawCmds[jj].data.path.indexOf('combobox') != -1) {
                    arrRawCmdsTarget[jj + 1] = 'actions.clickByJS("' + arrRawCmds[jj].data.path + '");' + '//点击:' + arrRawCmds[jj].data.text;
                } else {
                    arrRawCmdsTarget[jj + 1] = 'actions.click("' + arrRawCmds[jj].data.path + '");' + '//点击:' + arrRawCmds[jj].data.text;
                }
                //console.log('lion arrRawCmdsTarget[' + jj + 1 + ']:' + arrRawCmdsTarget[jj + 1]);
                break;
            case 'mouseDown':
                if (arrRawCmds[jj].data.path.indexOf('radio') != -1 || arrRawCmds[jj].data.path.indexOf('checkbox') != -1 || arrRawCmds[jj].data.path.indexOf('combobox') != -1) {
                    arrRawCmdsTarget[jj + 1] = 'actions.clickByJS("' + arrRawCmds[jj].data.path + '");' + '//点击:' + arrRawCmds[jj].data.text;
                } else {
                    arrRawCmdsTarget[jj + 1] = 'actions.click("' + arrRawCmds[jj].data.path + '");' + '//点击:' + arrRawCmds[jj].data.text;
                }
                //console.log('lion arrRawCmdsTarget[' + jj + 1 + ']:' + arrRawCmdsTarget[jj + 1]);
                break;
            case 'mouseUp':
                if (arrRawCmds[jj].data.path.indexOf('radio') != -1 || arrRawCmds[jj].data.path.indexOf('checkbox') != -1 || arrRawCmds[jj].data.path.indexOf('combobox') != -1) {
                    arrRawCmdsTarget[jj + 1] = 'actions.clickByJS("' + arrRawCmds[jj].data.path + '");' + '//点击:' + arrRawCmds[jj].data.text;
                } else {
                    arrRawCmdsTarget[jj + 1] = 'actions.click("' + arrRawCmds[jj].data.path + '");' + '//点击:' + arrRawCmds[jj].data.text;
                }
                //console.log('lion arrRawCmdsTarget[' + jj + 1 + ']:' + arrRawCmdsTarget[jj + 1]);
                break;
            case 'switchWindow':
                arrRawCmdsTarget[jj + 1] = 'actions.swtichToWindow(' + arrRawCmds[jj].data + ');' + '//切换窗口';
                //console.log('lion arrRawCmdsTarget[' + jj + 1 + ']:' + arrRawCmdsTarget[jj + 1]);
                break;
            case 'sendKeys':
                // arrRawCmdsTarget[jj + 1] = 'actions.input("' + arrRawCmds[jj - 1].data.path + '","' + arrRawCmds[jj].data.keys + '");'+'//文本框'+arrRawCmds[jj - 1].data.text+'输入:'+arrRawCmds[jj].data.keys;
                arrRawCmdsTarget[jj + 1] = 'actions.sendKeys("' + arrRawCmds[jj].data.keys + '");' + '//输入:' + arrRawCmds[jj].data.keys;
                //console.log('lion arrRawCmdsTarget[' + jj + 1 + ']:' + arrRawCmdsTarget[jj + 1]);
                break;
            case 'waitBody':
                arrRawCmdsTarget[jj + 1] = 'actions.sleep(1000);';
                //console.log('lion arrRawCmdsTarget[' + jj + 1 + ']:' + arrRawCmdsTarget[jj + 1]) + '//waitBody等待页面加载完成';
                break;
            // case 'switchFrame':
            //     arrRawCmds[jj].data = arrRawCmds[jj].data.replace(/\"/g,"'");
            //     arrRawCmdsTarget[jj]='actions.switchToFrame("'+arrRawCmds[jj].data+'");';
            //     console.log('lion arrRawCmdsTarget['+jj+']:'+arrRawCmdsTarget[jj]);
            //     break;
            case 'switchFrame':
                if (null == arrRawCmds[jj].data) {
                    arrRawCmdsTarget[jj + 1] = 'actions.switchToDefaultContent();' + '//退出frame';
                } else {
                    // arrRawCmds[jj].data = arrRawCmds[jj].data.replace(/#/g, "");
                    arrRawCmdsTarget[jj + 1] = 'actions.switchToFrame("' + arrRawCmds[jj].data + '");' + '//切换frame';
                }
                //console.log('lion arrRawCmdsTarget[' + jj + 1 + ']:' + arrRawCmdsTarget[jj + 1]);
                break;
            case 'scrollTo':
                arrRawCmdsTarget[jj + 1] = 'actions.scrollTo(' + arrRawCmds[jj].data.x + ',' + arrRawCmds[jj].data.y + ');' + '//滚动页面';
                //console.log('lion scrollTo[' + jj + 1 + ']:' + arrRawCmdsTarget[jj + 1]);
                break;
            case 'scrollElementTo':
                arrRawCmdsTarget[jj + 1] = 'actions.scrollElementTo("' + arrRawCmds[jj].data.path + '",' + arrRawCmds[jj].data.x + ',' + arrRawCmds[jj].data.y + ');' + '//滚动元素';
                //console.log('lion scrollTo[' + jj + 1 + ']:' + arrRawCmdsTarget[jj + 1]);
                break;
            case 'closeWindow':
                arrRawCmdsTarget[jj + 1] = 'actions.closeCurrentWindow();' + '//关闭当前窗口'
                //console.log('lion scrollTo[' + jj + 1 + ']:' + arrRawCmdsTarget[jj + 1]);
                break;
            case 'sleep':
                arrRawCmdsTarget[jj + 1] = 'actions.sleep(' + arrRawCmds[jj].data + ');' + '//sleep';
                //console.log('lion scrollTo[' + jj + 1 + ']:' + arrRawCmdsTarget[jj + 1]);
                break;
            case 'mouseMove':
                arrRawCmdsTarget[jj + 1] = 'actions.hover("' + arrRawCmds[jj].data.path + '");' + '//鼠标hover：' + arrRawCmds[jj].data.text;
                //console.log('lion scrollTo[' + jj + 1 + ']:' + arrRawCmdsTarget[jj + 1]);
                break;
            case 'dragend':
                arrRawCmdsTarget[jj + 1] = 'actions.dragAndDropBy("' + arrRawCmds[jj].data.path + '",'+arrRawCmds[jj].data.x+','+arrRawCmds[jj].data.y+');' + '//拖拽元素：' + arrRawCmds[jj].data.text;
                //console.log('lion scrollTo[' + jj + 1 + ']:' + arrRawCmdsTarget[jj + 1]);
                break;
            case 'uploadFile':
                if(arrRawCmdsTarget[jj].indexOf('click') != -1){
                    arrRawCmdsTarget[jj] = '';
                }
                arrRawCmdsTarget[jj + 1] = 'actions.uploadFile("' + arrRawCmds[jj].data.path + '","'+arrRawCmds[jj].data.filename+'");' + '//上传文件：' + arrRawCmds[jj].data.filename;
                //console.log('lion scrollTo[' + jj + 1 + ']:' + arrRawCmdsTarget[jj + 1]);
                break;
            case 'expect':
                switch (arrRawCmds[jj].data.type) {
                    case 'displayed':
                        arrRawCmds[jj].data.params[0] = arrRawCmds[jj].data.params[0].replace(/\"/g, "'");
                        if ((arrRawCmds[jj].data.compare == 'equal') && (arrRawCmds[jj].data.to == 'true')) {
                            arrRawCmdsTarget[jj + 1] = 'actions.checkElementFound("' + arrRawCmds[jj].data.params[0] + '");' + '//校验元素存在'
                            //console.log('lion scrollTo[' + jj + 1 + ']:' + arrRawCmdsTarget[jj + 1]);
                        } else {
                            arrRawCmdsTarget[jj + 1] = 'actions.checkElementNotFound("' + arrRawCmds[jj].data.params[0] + '");' + '//校验元素不存在'
                            //console.log('lion scrollTo[' + jj + 1 + ']:' + arrRawCmdsTarget[jj + 1]);
                        }
                        break;
                    case 'text':
                        arrRawCmds[jj].data.params[0] = arrRawCmds[jj].data.params[0].replace(/\"/g, "'");
                        arrRawCmds[jj].data.to = arrRawCmds[jj].data.to.replace(/"/g, '\"')
                        if (arrRawCmds[jj].data.compare == 'equal') {
                            arrRawCmdsTarget[jj + 1] = 'actions.checkTextEqual("' + arrRawCmds[jj].data.params[0] + '","' + arrRawCmds[jj].data.to + '");' + '//校验元素的文本值满足期望'
                            //console.log('lion scrollTo[' + jj + 1 + ']:' + arrRawCmdsTarget[jj + 1]);
                        } else {
                            arrRawCmdsTarget[jj + 1] = 'actions.checkTextNotEqual("' + arrRawCmds[jj].data.params[0] + '","' + arrRawCmds[jj].data.to + '");' + '//校验元素的文本值不满足期望'
                            //console.log('lion scrollTo[' + jj + 1 + ']:' + arrRawCmdsTarget[jj + 1]);
                        }
                        break;
                }
                break;
        }
    }
    return arrRawCmdsTarget;
}

module.exports = {
    getJavaTemplateContent,
    getArrRawCmdsTarget,
};
