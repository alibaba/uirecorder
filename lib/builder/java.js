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
    if (browserSize) {
        arrRawCmdsTarget[0] = 'Configuration.browserSize = "' + browserSize[0] + 'x' + browserSize[1] + '";';
    } else {
        arrRawCmdsTarget[0] = 'Configuration.startMaximized=true;';
    }
    for (jj = 0, len = arrRawCmds.length; jj < len; jj++) {
        // console.log('arrRawCmds[jj].type:'+arrRawCmds[jj].type);
        switch (arrRawCmds[jj].type) {
            case 'url':
                arrRawCmds[jj].data = arrRawCmds[jj].data.replace(/\"/g, "'");
                arrRawCmdsTarget[jj + 1] = 'actions.openUrl("' + arrRawCmds[jj].data + '");' + '//打开URL';
                console.log('lion arrRawCmdsTarget[' + jj + 1 + ']:' + arrRawCmdsTarget[jj + 1]);
                break;
            case 'dblClick':
                arrRawCmds[jj].data.path = arrRawCmds[jj].data.path.replace(/\"/g, "'");
                arrRawCmdsTarget[jj + 1] = 'actions.click("' + arrRawCmds[jj].data.path + '");' + '//点击:' + arrRawCmds[jj].data.text;
                console.log('lion arrRawCmdsTarget[' + jj + 1 + ']:' + arrRawCmdsTarget[jj + 1]);
                break;
            case 'click':
                arrRawCmds[jj].data.path = arrRawCmds[jj].data.path.replace(/\"/g, "'");
                if (arrRawCmds[jj].data.path.indexOf('radio') != -1 || arrRawCmds[jj].data.path.indexOf('checkbox') != -1 || arrRawCmds[jj].data.path.indexOf('combobox') != -1) {
                    arrRawCmdsTarget[jj + 1] = 'actions.clickByJS("' + arrRawCmds[jj].data.path + '");' + '//点击:' + arrRawCmds[jj].data.text;
                } else {
                    arrRawCmdsTarget[jj + 1] = 'actions.click("' + arrRawCmds[jj].data.path + '");' + '//点击:' + arrRawCmds[jj].data.text;
                }
                console.log('lion arrRawCmdsTarget[' + jj + 1 + ']:' + arrRawCmdsTarget[jj + 1]);
                break;
            case 'switchWindow':
                //arrRawCmds[jj].path = arrRawCmds[jj].data.replace(/\"/g, "'");
                arrRawCmdsTarget[jj + 1] = 'actions.swtichToWindow(' + arrRawCmds[jj].data + ');' + '//切换窗口';
                console.log('lion arrRawCmdsTarget[' + jj + 1 + ']:' + arrRawCmdsTarget[jj + 1]);
                break;
            case 'sendKeys':
                // arrRawCmds[jj - 1].data.path = arrRawCmds[jj - 1].data.path.replace(/\"/g, "'");
                // arrRawCmdsTarget[jj + 1] = 'actions.input("' + arrRawCmds[jj - 1].data.path + '","' + arrRawCmds[jj].data.keys + '");'+'//文本框'+arrRawCmds[jj - 1].data.text+'输入:'+arrRawCmds[jj].data.keys;
                arrRawCmdsTarget[jj + 1] = 'actions.sendKeys("' + arrRawCmds[jj].data.keys + '");' + '//输入:' + arrRawCmds[jj].data.keys;
                console.log('lion arrRawCmdsTarget[' + jj + 1 + ']:' + arrRawCmdsTarget[jj + 1]);
                break;
            case 'waitBody':
                arrRawCmdsTarget[jj + 1] = 'actions.sleep(3000);';
                console.log('lion arrRawCmdsTarget[' + jj + 1 + ']:' + arrRawCmdsTarget[jj + 1]) + '//waitBody等待页面加载完成';
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
                    arrRawCmds[jj].data = arrRawCmds[jj].data.replace(/#/g, "");
                    arrRawCmdsTarget[jj + 1] = 'actions.switchToFrame("' + arrRawCmds[jj].data + '");' + '//切换frame';
                }
                console.log('lion arrRawCmdsTarget[' + jj + 1 + ']:' + arrRawCmdsTarget[jj + 1]);
                break;
            case 'scrollTo':
                arrRawCmdsTarget[jj + 1] = 'actions.scrollTo(' + arrRawCmds[jj].data.x + ',' + arrRawCmds[jj].data.y + ');' + '//滚动页面';
                console.log('lion scrollTo[' + jj + 1 + ']:' + arrRawCmdsTarget[jj + 1]);
                break;
            case 'scrollElementTo':
                arrRawCmdsTarget[jj + 1] = 'actions.scrollElementTo("' + arrRawCmds[jj].data.path + '",' + arrRawCmds[jj].data.x + ',' + arrRawCmds[jj].data.y + ');' + '//滚动元素';
                console.log('lion scrollTo[' + jj + 1 + ']:' + arrRawCmdsTarget[jj + 1]);
                break;
            case 'closeWindow':
                arrRawCmdsTarget[jj + 1] = 'actions.closeCurrentWindow();' + '//关闭当前窗口'
                console.log('lion scrollTo[' + jj + 1 + ']:' + arrRawCmdsTarget[jj + 1]);
                break;
            case 'sleep':
                arrRawCmdsTarget[jj + 1] = 'actions.sleep(' + arrRawCmds[jj].data + ');' + '//sleep';
                console.log('lion scrollTo[' + jj + 1 + ']:' + arrRawCmdsTarget[jj + 1]);
                break;
            case 'mouseMove':
                arrRawCmdsTarget[jj + 1] = 'actions.hover("' + arrRawCmds[jj].data.path + '");' + '//鼠标hover：' + arrRawCmds[jj].data.text;
                console.log('lion scrollTo[' + jj + 1 + ']:' + arrRawCmdsTarget[jj + 1]);
                break;
            case 'expect':
                switch (arrRawCmds[jj].data.type) {
                    case 'displayed':
                        arrRawCmds[jj].data.params[0] = arrRawCmds[jj].data.params[0].replace(/\"/g, "'");
                        if ((arrRawCmds[jj].data.compare == 'equal') && (arrRawCmds[jj].data.to == 'true')) {
                            arrRawCmdsTarget[jj + 1] = 'Assert.assertTrue(actions.waitElementFound("' + arrRawCmds[jj].data.params[0] + '"));' + '//校验元素存在'
                            console.log('lion scrollTo[' + jj + 1 + ']:' + arrRawCmdsTarget[jj + 1]);
                        } else {
                            arrRawCmdsTarget[jj + 1] = 'Assert.assertFalse(actions.waitElementDisapear("' + arrRawCmds[jj].data.params[0] + '"));' + '//校验元素不存在'
                            console.log('lion scrollTo[' + jj + 1 + ']:' + arrRawCmdsTarget[jj + 1]);
                        }
                        break;
                    case 'text':
                        arrRawCmds[jj].data.params[0] = arrRawCmds[jj].data.params[0].replace(/\"/g, "'");
                        if (arrRawCmds[jj].data.compare == 'equal') {
                            arrRawCmdsTarget[jj + 1] = 'Assert.assertTrue(actions.getText("' + arrRawCmds[jj].data.params[0] + '").equals("' + arrRawCmds[jj].data.to + '"));' + '//校验元素的文本值满足期望'
                            console.log('lion scrollTo[' + jj + 1 + ']:' + arrRawCmdsTarget[jj + 1]);
                        } else {
                            arrRawCmdsTarget[jj + 1] = 'Assert.assertFalse(actions.getText("' + arrRawCmds[jj].data.params[0] + '").equals("' + arrRawCmds[jj].data.to + '"));' + '//校验元素的文本值不满足期望'
                            console.log('lion scrollTo[' + jj + 1 + ']:' + arrRawCmdsTarget[jj + 1]);
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