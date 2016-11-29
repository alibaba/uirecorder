UI Recorder
=======================

![logo.png](https://raw.github.com/alibaba/uirecorder/master/logo.png)

[![NPM version](https://img.shields.io/npm/v/uirecorder.svg?style=flat)](https://www.npmjs.com/package/uirecorder)
[![License](https://img.shields.io/npm/l/uirecorder.svg?style=flat)](https://www.npmjs.com/package/uirecorder)
[![NPM count](https://img.shields.io/npm/dm/uirecorder.svg?style=flat)](https://www.npmjs.com/package/uirecorder)
[![NPM count](https://img.shields.io/npm/dt/uirecorder.svg?style=flat)](https://www.npmjs.com/package/uirecorder)

UI Recorder 是一款零成本UI自動化錄製工具，類似於[Selenium IDE](http://docs.seleniumhq.org/projects/ide/).

UI Recorder 要比Selenium IDE更加強大!

UI Recorder 非常簡單易用.

1. 官方網站: [http://uirecorder.com/](http://uirecorder.com/)
2. 語言切換: [English](https://github.com/alibaba/uirecorder/blob/master/README.md), [簡體中文](https://github.com/alibaba/uirecorder/blob/master/README_zh-cn.md), [繁體中文](https://github.com/alibaba/uirecorder/blob/master/README_zh-tw.md)
3. 變更日誌: [CHANGE](https://github.com/alibaba/uirecorder/blob/master/CHANGE.md)
4. 視頻教程：[PC中文教程](http://v.youku.com/v_show/id_XMTY4NTk5NjI4MA==.html)

功能
================

1. 支持所有用戶行為: 鍵盤事件, 鼠標事件, alert, 文件上傳, 拖放, svg
2. 支持無線native app錄製, 基於macaca實現: [https://macacajs.com/](https://macacajs.com/)
3. 無干擾錄製: 和正常測試無任何區別，無需任何交互
4. 錄製用例存儲在本地
5. 支持豐富的斷言類型: val,text,displayed,enabled,selected,attr,css,url,title,cookie,localStorage,sessionStorage
6. 支持數據mock: [fake.js](https://github.com/marak/Faker.js/)
7. 支持公共測試用例: 允許用例中動態調用另外一個
8. 支持多國語言: 英文, 簡體中文, 繁體中文
9. 支持單步截圖
10. 支持HTML報告和JUnit報告
11. 全系統支持: windows, mac, linux
12. 支持多運行時測試, 例如：開發測試、預發測試
13. 基於Nodejs的測試用例: [jWebDriver](http://jwebdriver.com/)

軟件截圖
================

![shot1](https://raw.github.com/alibaba/uirecorder/master/screenshot/shot1.png)

![shot2](https://raw.github.com/alibaba/uirecorder/master/screenshot/shot2.png)

![shot3](https://raw.github.com/alibaba/uirecorder/master/screenshot/shot3.png)

![shot4](https://raw.github.com/alibaba/uirecorder/master/screenshot/shot4.png)

快速開始
================

安裝
--------------------------

1. 安裝 NodeJs

    > [https://nodejs.org/](https://nodejs.org/)

2. 安裝 chrome

    > [https://www.google.com/chrome/](https://www.google.com/chrome/)

3. 安裝 UI Recorder

    > npm install uirecorder mocha -g

PC錄製
---------------------------

1. 初始化配置

    > uirecorder init

    > npm install

2. 開始錄製測試用例

    > uirecorder start

3. 啟動WebDriver服務器

4. 運行測試用例

    > source run.sh ( Linux|Mac )

    > run.bat ( Windows )

5. 獲得測試報告和單步截圖

    > ./reports/index.html

    > ./reports/index.xml (JUnit)

    > ./reports/index.json

    > ./screenshots/

無線錄製
---------------------------

1. 安裝並且啟動macaca server:

    > 安裝 macaca: [http://macacajs.com/](http://macacajs.com/)

    > 連接你的手機或模擬器

    > macaca server --port 4444

2. 初始化配置

    > uirecorder init --mobile

    > npm install

3. 開始錄製測試用例

    > uirecorder start --mobile

4. 運行測試用例

    > source run.sh ( Linux|Mac )

    > run.bat ( Windows )

5. 獲得測試報告和單步截圖

    > ./reports/index.html

    > ./reports/index.xml (JUnit)

    > ./reports/index.json

    > ./screenshots/

QA
================

如何部署WebDriver服務？
----------------

1. Selenium standalone server:

    > npm install selenium-standalone -g

    > selenium-standalone install

    > selenium-standalone start

    或者

    > 下載Selenium Server和IEDriverServer: [http://selenium-release.storage.googleapis.com/index.html](http://selenium-release.storage.googleapis.com/index.html)

    > 下載ChromeDriver: [http://chromedriver.storage.googleapis.com/index.html](http://chromedriver.storage.googleapis.com/index.html)

    > 添加驅動路徑到PATH環境變量中

    > 運行selenium server: `java -jar selenium-server-standalone-x.xx.x.jar`

2. Selenium Grid: [https://github.com/SeleniumHQ/selenium/wiki/Grid2](https://github.com/SeleniumHQ/selenium/wiki/Grid2)
3. F2etest: [https://github.com/alibaba/f2etest](https://github.com/alibaba/f2etest)

如何接入Jenkins？
----------------

1. 添加命令

        source install.sh
        source run.sh

2. 添加報告

    > JUnit: reports/index.xml

    > HTML: reports/

如何切換runtime運行時環境?
----------------

1. export runtime=dev ( Linux|Mac ) 或者 set runtime=dev ( Window )
2. uirecorder init (保存到`config-dev.json`)
3. uirecorder start (從`config-dev.json`讀取)
4. source run.sh dev 或者 run.bat dev (從`config-dev.json`讀取)

提示: 默認運行時用於線上測試，並不運行此格式的測試腳本, ~xxx.spec.js, dev運行時才會運行所有腳本.

如何過濾不穩定的PATH路徑？
----------------

1. 因為某些屬性值是隨機或不穩定，我們無法錄製出穩定的CSS選擇器路徑
2. 我們可以使用黑名單過濾這些屬性值，你可以在命令行輸入命令`uirecorder init`，然後輸入黑名單正則表達式

如何錄製公共用例？
----------------

1. 錄製 `commons/login.mod.js`
2. 錄製 `test.spec.js`

    1. 在開始頁面的時候輸入 `login.mod.js`，或者在錄製中間頁面時插入用例
    2. 當`login.mod.js`加載完成後，繼續別的步驟的錄製

3. mocha *.spec.js

公共用例可以存放在以下兩個目錄中:

1. commons
2. 根目錄 (如果"commons"目錄沒有的情況下)

如何錄製文件上傳？
----------------

1. UI Recorder僅支持Native文件上傳, 不支持FLASH上傳
2. `<input type="file">` 必需在最頂層
3. 上傳的文件必需保存在: `c:\uploadFiles\`

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
2. 錄製界面中使用工具面板插入變量
3. 斷言中使用變量字符串: `aaa{{productName}}bbb`

如何使用faker？
----------------

您可以在這裡找到詳細文檔: [https://github.com/marak/Faker.js/](https://github.com/marak/Faker.js/)

錄製中禁止如下操作！
----------------

1. 禁止直接手動修改地址欄中的URL
2. 禁止使用TAB切換焦點
3. 不要使用雙擊, WebDriver兼容性不好
4. 不要使用鼠標選擇部分文本, WebDriver兼容性不好
5. 不要手動切換至背景窗口
6. 不要點擊非關鍵區域, 僅錄製關鍵步驟

如何開發測試友好的代碼？
----------------

1. 不要使用隨機的id或name
2. 請為一個DOM功能區塊命名一個id值
3. 為form表單項添加label
4. 請監聽click，不要監聽mousedown

如何為無線用例設置uuid
----------------

1. export devices="xxx1,xxx2" (windows: set devices="xxx1,xxx2")
2. mocha **/*.spec.js --reporter mochawesome-uirecorder

更多提示
----------------

1. Mac操作系統: hosts中必需要有`127.0.0.1 localhost`的綁定
2. Mac或Linux: 必要時添加sudo

License
================

HTMLHint is released under the MIT license:

> The MIT License
>
> Copyright (c) 2016 alibaba.com
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
* Faker.js: [https://github.com/marak/Faker.js/](https://github.com/marak/Faker.js/)
* Mochawesome: [https://github.com/adamgruber/mochawesome](https://github.com/adamgruber/mochawesome)
