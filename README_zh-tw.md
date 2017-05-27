UI Recorder
=======================

![logo.png](https://raw.github.com/alibaba/uirecorder/master/logo.png)

[![NPM version](https://img.shields.io/npm/v/uirecorder.svg?style=flat)](https://www.npmjs.com/package/uirecorder)
[![License](https://img.shields.io/npm/l/uirecorder.svg?style=flat)](https://www.npmjs.com/package/uirecorder)
[![NPM count](https://img.shields.io/npm/dm/uirecorder.svg?style=flat)](https://www.npmjs.com/package/uirecorder)
[![NPM count](https://img.shields.io/npm/dt/uirecorder.svg?style=flat)](https://www.npmjs.com/package/uirecorder)

UI Recorder 是一款零成本UI自動化錄制工具，類似於[Selenium IDE](http://docs.seleniumhq.org/projects/ide/).

UI Recorder 要比Selenium IDE更加強大!

UI Recorder 非常簡單易用.

1. 官方網站: [http://uirecorder.com/](http://uirecorder.com/)
2. 語言切換: [English](https://github.com/alibaba/uirecorder/blob/master/README.md), [簡體中文](https://github.com/alibaba/uirecorder/blob/master/README_zh-cn.md), [繁體中文](https://github.com/alibaba/uirecorder/blob/master/README_zh-tw.md)
3. 變更日誌: [CHANGE](https://github.com/alibaba/uirecorder/blob/master/CHANGE.md)
4. 視頻教程：[PC中文教程](http://v.youku.com/v_show/id_XMTY4NTk5NjI4MA==.html)
5. 釘釘交流群：11779932(加入驗證：UIRecorder錄制)，下載釘釘：[https://www.dingtalk.com/](https://www.dingtalk.com/)

功能
================

1. 支持所有用戶行為: 鍵盤事件, 鼠標事件, alert, 文件上傳, 拖放, svg, shadow dom
2. 支持無線native app(Android, iOS)錄制, 基於macaca實現: [https://macacajs.com/](https://macacajs.com/)
3. 無干擾錄制: 和正常測試無任何區別，無需任何交互
4. 錄制用例存儲在本地
5. 支持豐富的斷言類型: val,text,displayed,enabled,selected,attr,css,url,title,cookie,localStorage,sessionStorage
6. 支持強大的變量字符串
7. 支持公共測試用例: 允許用例中動態調用另外一個
8. 支持併發測試
9. 支持多國語言: 英文, 簡體中文, 繁體中文
10. 支持單步截圖
11. 支持HTML報告和JUnit報告
12. 全系統支持: Windows, Mac, Linux
13. 基於Nodejs的測試用例: [jWebDriver](http://jwebdriver.com/)

軟件截圖
================

![shot1](https://raw.github.com/alibaba/uirecorder/master/screenshot/shot1.png)

![shot2](https://raw.github.com/alibaba/uirecorder/master/screenshot/shot2.png)

![shot3](https://raw.github.com/alibaba/uirecorder/master/screenshot/shot3.png)

![shot4](https://raw.github.com/alibaba/uirecorder/master/screenshot/shot4.png)

視頻演示
================

![video1](http://wx1.sinaimg.cn/mw1024/7f3afc78gy1fdf5gass5rg20sg0g0kjo.gif)

![video2](http://wx2.sinaimg.cn/mw1024/7f3afc78gy1fdf5hb8anig20sg0g0u12.gif)

快速開始
================

安裝
--------------------------

1. 安裝 NodeJs (版本號 >= v7.x)

    > [https://nodejs.org/](https://nodejs.org/)

    > `sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}` (Mac, Linux)

2. 安裝 chrome

    > [https://www.google.com/chrome/](https://www.google.com/chrome/)

3. 安裝 UI Recorder

    > `npm install uirecorder mocha -g`

PC錄制
---------------------------

1. 初始化測試工程

    > 創建新文件夾

    > `uirecorder init`

2. 開始錄制測試用例

    > 修改hosts文件

    > `uirecorder sample/test.spec.js`

3. 啓動WebDriver服務器

4. 運行測試用例

    > 運行所有腳本: `source run.sh` ( Linux|Mac ) 或 `run.bat` ( Windows )

    > 運行單個腳本: `source run.sh sample/test.spec.js` ( Linux|Mac ) 或 `run.bat sample/test.spec.js` ( Windows )

5. 獲得測試報告和單步截圖

    > ./reports/index.html

    > ./reports/index.xml (JUnit)

    > ./reports/index.json

    > ./screenshots/

無線錄制
---------------------------

1. 安裝並且啓動macaca server:

    > 安裝 macaca: [http://macacajs.com/](http://macacajs.com/)

    > 連接你的手機或模擬器

    > `macaca server --port 4444`

2. 初始化測試工程

    > 創建新文件夾

    > `uirecorder init --mobile`

3. 開始錄制測試用例

    > `uirecorder --mobile sample/test.spec.js`

4. 運行測試用例

    > 運行所有腳本: `source run.sh` ( Linux|Mac ) 或 `run.bat` ( Windows )

    > 運行單個腳本: `source run.sh sample/test.spec.js` ( Linux|Mac ) 或 `run.bat sample/test.spec.js` ( Windows )

5. 獲得測試報告和單步截圖

    > ./reports/index.html

    > ./reports/index.xml (JUnit)

    > ./reports/index.json

    > ./screenshots/

QA
================

如何斷點調試測試代碼？
----------------

1. 安裝 [Visual Studio Code](https://code.visualstudio.com/) ，然後打開它
2. 在vs code中打開項目根目錄
3. 打開測試腳本, 添加斷點
4. 按 `F5` 鍵執行腳本, 按 `F10` 鍵執行下一行

如何部署WebDriver服務？
----------------

1. Selenium standalone server:

    > `npm run server`

2. Selenium Grid: [https://github.com/SeleniumHQ/selenium/wiki/Grid2](https://github.com/SeleniumHQ/selenium/wiki/Grid2)
3. F2etest: [https://github.com/alibaba/f2etest](https://github.com/alibaba/f2etest)

如何基於環境變量臨時修改webdriver的host和port，在本地調試腳本?
----------------

1. `export webdriver=127.0.0.1:4444` 或 `set webdriver=127.0.0.1:4444` (Windows)

提示：端口號是非必填項，例如：`export webdriver=127.0.0.1`

如何接入Jenkins？
----------------

1. 添加命令

        source ./install.sh
        source ./run.sh

2. 添加報告

    > [JUnit](https://wiki.jenkins-ci.org/display/JENKINS/JUnit+Plugin): `reports/index.xml`

    > [HTML](https://wiki.jenkins-ci.org/display/JENKINS/HTML+Publisher+Plugin): `reports/index.html`

國內用戶可以通過oschina和cnpm提升部署效率，修改install.sh如下：

    ls ~/nvm || git clone https://git.oschina.net/yaniswang/nvm.git ~/nvm
    source ~/nvm/nvm.sh
    export NVM_NODEJS_ORG_MIRROR="http://npm.taobao.org/mirrors/node"
    nvm install v6.9.5
    npm install --registry=https://registry.npm.taobao.org

如何過濾不穩定的PATH路徑？
----------------

1. 因為某些屬性值是隨機或不穩定，我們無法錄制出穩定的CSS選擇器路徑
2. 我們可以使用黑名單過濾這些屬性值，你可以在命令行輸入命令`uirecorder init`，然後輸入黑名單正則表達式

提示: 屬性黑名單是一個正則表達式, 可以類似這樣使用: `/attr_\d+/`

如何錄制公共用例？
----------------

1. 錄制 `commons/login.mod.js`
2. 錄制 `sample/test.spec.js`

    1. 在開始頁面的時候輸入 `login.mod.js`，或者在錄制中間頁面時插入用例
    2. 當`login.mod.js`加載完成後，繼續別的步驟的錄制

3. `source run.sh` ( Linux|Mac ) 或 `run.bat` ( Windows )

如何錄制文件上傳？
----------------

1. UI Recorder僅支持Native文件上傳, 不支持FLASH上傳
2. 直接點擊`<input type="file">` 或點擊 `<button role="upload">Upload file</button>`, 佔位按鈕必需要用`role`或`data-role`標注為`upload`
3. 上傳的文件必需保存在`uploadfiles/`文件夾中

如何使用變量功能？
----------------

編輯config.json

    {
        "recorder": {
            ...
        },
        "webdriver": {
            ...
        },
        "vars": {
            "productId": "123456",
            "productName": "mp3"
        }
    }

1. 開始頁面輸入: `http://xxx.com/product?id={{productId}}`
2. 錄制界面中使用工具面創建新變量
3. 錄制界面中使用工具面更新舊變量的值
4. 錄制界面中使用工具面板跳轉URL: `http://xxx.com/product?id={{productId}}`
5. 錄制界面中使用工具面板插入變量字符串: `{{productName}}` 或 `aaa{{productName}}bbb`
6. 斷言中使用變量字符串: `{{productName}}` 或 `aaa{{productName}}bbb`

提示: 所有變量字符串均支持JS語法的模板字符串，例如：`{{productName}}, ${new Date().getYear()}, ${parseInt(testVars.a)+parseInt(testVars.b)}`

如何斷言瀏覽器eval js代碼後的結果？
----------------

1. `添加斷言`, 選擇類型： `jscode`
2. 同步模式: `return document.title`
3. 函數模式:

        function(){
            var str = "aaa";
            return str;
        }

4. 異步模式:

        function(done){
            setTimeout(function(){
                done(123);
            }, 100);
        }

如何在斷言前隱藏DOM結點?
----------------

1. `uirecorder init`
2. 在初始化`斷言前隱藏`選項時，輸入需要隱藏的css選擇器
3. `uirecorder start`
4. UIRecorder會在斷言前隱藏所有匹配的DOM結點，然後就可以斷言那些隱藏在mask層後面的DOM

如何錄制可選的點擊?
----------------

某些步驟不是非常重要，但卻偶爾會出現，這些步驟會總是斷言為成功。

1. 按下'Alt'鍵
2. 點擊目標DOM

錄制中禁止如下操作！
----------------

1. 禁止直接手動修改地址欄中的URL
2. 禁止使用TAB切換焦點
3. 不要使用雙擊, WebDriver兼容性不好
4. 不要使用鼠標選擇部分文本, WebDriver兼容性不好
5. 不要手動切換至背景窗口
6. 不要點擊非關鍵區域, 僅錄制關鍵步驟

如何開發測試友好的代碼？
----------------

1. 不要使用隨機的id或name
2. 請為一個DOM功能區塊命名一個id值
3. 為form表單項添加label
4. 請監聽click，不要監聽mousedown

如何為無線用例設置uuid
----------------

1. `export devices=xxx1,xxx2` (windows: `set devices=xxx1,xxx2`)
2. `source run.sh` ( Linux|Mac ) 或 `run.bat` ( Windows )

如何導出原數據?
----------------

1. `uirecorder start --raw`
2. 錄制完後，就可以獲得2個文件: `sample/test.spec.js`, `sample/test.spec.json`

更多提示
----------------

1. Mac操作系統: hosts中必需要有`127.0.0.1 localhost`的綁定


License
================

HTMLHint is released under the MIT license:

> The MIT License
>
> Copyright (c) 2016 - 2017 alibaba.com
>
> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in
> all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
> THE SOFTWARE.

感謝
================

* jWebDriver: [https://github.com/yaniswang/jWebDriver](https://github.com/yaniswang/jWebDriver)
* colors: [https://github.com/Marak/colors.js](https://github.com/Marak/colors.js)
* commander: [https://github.com/tj/commander.js](https://github.com/tj/commander.js)
* inquirer: [https://github.com/sboudrias/Inquirer.js](https://github.com/sboudrias/Inquirer.js)
* async: [https://github.com/caolan/async](https://github.com/caolan/async)
* chai: [https://github.com/chaijs/chai](https://github.com/chaijs/chai)
* mocha-parallel-tests: [https://github.com/yandex/mocha-parallel-tests](https://github.com/yandex/mocha-parallel-tests)
* Mochawesome: [https://github.com/adamgruber/mochawesome](https://github.com/adamgruber/mochawesome)
