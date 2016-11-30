UI Recorder
=======================

![logo.png](https://raw.github.com/alibaba/uirecorder/master/logo.png)

[![NPM version](https://img.shields.io/npm/v/uirecorder.svg?style=flat)](https://www.npmjs.com/package/uirecorder)
[![License](https://img.shields.io/npm/l/uirecorder.svg?style=flat)](https://www.npmjs.com/package/uirecorder)
[![NPM count](https://img.shields.io/npm/dm/uirecorder.svg?style=flat)](https://www.npmjs.com/package/uirecorder)
[![NPM count](https://img.shields.io/npm/dt/uirecorder.svg?style=flat)](https://www.npmjs.com/package/uirecorder)

UI Recorder 是一款零成本UI自动化录制工具，类似于[Selenium IDE](http://docs.seleniumhq.org/projects/ide/).

UI Recorder 要比Selenium IDE更加强大!

UI Recorder 非常简单易用.

1. 官方网站: [http://uirecorder.com/](http://uirecorder.com/)
2. 语言切换: [English](https://github.com/alibaba/uirecorder/blob/master/README.md), [简体中文](https://github.com/alibaba/uirecorder/blob/master/README_zh-cn.md), [繁體中文](https://github.com/alibaba/uirecorder/blob/master/README_zh-tw.md)
3. 变更日志: [CHANGE](https://github.com/alibaba/uirecorder/blob/master/CHANGE.md)
4. 视频教程：[PC中文教程](http://v.youku.com/v_show/id_XMTY4NTk5NjI4MA==.html)

功能
================

1. 支持所有用户行为: 键盘事件, 鼠标事件, alert, 文件上传, 拖放, svg
2. 支持无线native app录制, 基于macaca实现: [https://macacajs.com/](https://macacajs.com/)
3. 无干扰录制: 和正常测试无任何区别，无需任何交互
4. 录制用例存储在本地
5. 支持丰富的断言类型: val,text,displayed,enabled,selected,attr,css,url,title,cookie,localStorage,sessionStorage
6. 支持数据mock: [fake.js](https://github.com/marak/Faker.js/)
7. 支持公共测试用例: 允许用例中动态调用另外一个
8. 支持并发测试
9. 支持多国语言: 英文, 简体中文, 繁体中文
10. 支持单步截图
11. 支持HTML报告和JUnit报告
12. 全系统支持: windows, mac, linux
13. 支持多运行时测试, 例如：开发测试、预发测试
14. 基于Nodejs的测试用例: [jWebDriver](http://jwebdriver.com/)

软件截图
================

![shot1](https://raw.github.com/alibaba/uirecorder/master/screenshot/shot1.png)

![shot2](https://raw.github.com/alibaba/uirecorder/master/screenshot/shot2.png)

![shot3](https://raw.github.com/alibaba/uirecorder/master/screenshot/shot3.png)

![shot4](https://raw.github.com/alibaba/uirecorder/master/screenshot/shot4.png)

快速开始
================

安装
--------------------------

1. 安装 NodeJs

    > [https://nodejs.org/](https://nodejs.org/)

2. 安装 chrome

    > [https://www.google.com/chrome/](https://www.google.com/chrome/)

3. 安装 UI Recorder

    > npm install uirecorder mocha -g

PC录制
---------------------------

1. 初始化配置

    > uirecorder init

    > npm install

2. 开始录制测试用例

    > uirecorder start sample/test.spec.js

3. 启动WebDriver服务器

4. 运行测试用例

    > source run.sh ( Linux|Mac )

    > run.bat ( Windows )

5. 获得测试报告和单步截图

    > ./reports/index.html

    > ./reports/index.xml (JUnit)

    > ./reports/index.json

    > ./screenshots/

无线录制
---------------------------

1. 安装并且启动macaca server:

    > 安装 macaca: [http://macacajs.com/](http://macacajs.com/)

    > 连接你的手机或模拟器

    > macaca server --port 4444

2. 初始化配置

    > uirecorder init --mobile

    > npm install

3. 开始录制测试用例

    > uirecorder start --mobile sample/test.spec.js

4. 运行测试用例

    > source run.sh ( Linux|Mac )

    > run.bat ( Windows )

5. 获得测试报告和单步截图

    > ./reports/index.html

    > ./reports/index.xml (JUnit)

    > ./reports/index.json

    > ./screenshots/

QA
================

如何部署WebDriver服务？
----------------

1. Selenium standalone server:

    > npm install selenium-standalone -g

    > selenium-standalone install

    > selenium-standalone start

    或者

    > 下载Selenium Server和IEDriverServer: [http://selenium-release.storage.googleapis.com/index.html](http://selenium-release.storage.googleapis.com/index.html)

    > 下载ChromeDriver: [http://chromedriver.storage.googleapis.com/index.html](http://chromedriver.storage.googleapis.com/index.html)

    > 添加驱动路径到PATH环境变量中

    > 运行selenium server: `java -jar selenium-server-standalone-x.xx.x.jar`

2. Selenium Grid: [https://github.com/SeleniumHQ/selenium/wiki/Grid2](https://github.com/SeleniumHQ/selenium/wiki/Grid2)
3. F2etest: [https://github.com/alibaba/f2etest](https://github.com/alibaba/f2etest)

如何接入Jenkins？
----------------

1. 添加命令

        source install.sh
        source run.sh

2. 添加报告

    > JUnit: `reports/index.xml`

    > HTML: `reports`

国内用户可以通过oschina和cnpm提升部署效率，修改install.sh如下：

    ls ~/nvm || git clone https://git.oschina.net/yaniswang/nvm.git ~/nvm
    source ~/nvm/nvm.sh
    nvm install 6.9.1
    npm config set prefix=~/npm-global
    export PATH=$PATH:~/npm-global/bin
    npm install -g cnpm --registry=https://registry.npm.taobao.org
    cnpm install

如何切换runtime运行时环境?
----------------

1. `export runtime=dev` ( Linux|Mac ) 或者 `set runtime=dev` ( Window )
2. `uirecorder init` (保存到`config-dev.json`)
3. `uirecorder start` (从`config-dev.json`读取)
4. `source run.sh dev` 或者 `run.bat dev` (从`config-dev.json`读取)

提示: 默认运行时用于线上测试，并不运行此格式的测试脚本, ~xxx.spec.js, dev运行时才会运行所有脚本.

如何过滤不稳定的PATH路径？
----------------

1. 因为某些属性值是随机或不稳定，我们无法录制出稳定的CSS选择器路径
2. 我们可以使用黑名单过滤这些属性值，你可以在命令行输入命令`uirecorder init`，然后输入黑名单正则表达式

提示: 属性黑名单是一个正则表达式, 可以类似这样使用: `/attr_\d+/`

如何录制公共用例？
----------------

1. 录制 `commons/login.mod.js`
2. 录制 `test.spec.js`

    1. 在开始页面的时候输入 `login.mod.js`，或者在录制中间页面时插入用例
    2. 当`login.mod.js`加载完成后，继续别的步骤的录制

3. source run.sh ( Linux|Mac ) 或 run.bat ( Windows )

如何录制文件上传？
----------------

1. UI Recorder仅支持Native文件上传, 不支持FLASH上传
2. `<input type="file">` 必需在最顶层
3. 上传的文件必需保存在`uploadfiles/`文件夹中

如何使用变量功能？
----------------

编辑config.json

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

1. 开始页面输入: `http://xxx.com/product?id={{productId}}`
2. 录制界面中使用工具面板插入变量
3. 断言中使用变量字符串: `aaa{{productName}}bbb`

如何使用faker？
----------------

您可以在这里找到详细文档: [https://github.com/marak/Faker.js/](https://github.com/marak/Faker.js/)

录制中禁止如下操作！
----------------

1. 禁止直接手动修改地址栏中的URL
2. 禁止使用TAB切换焦点
3. 不要使用双击, WebDriver兼容性不好
4. 不要使用鼠标选择部分文本, WebDriver兼容性不好
5. 不要手动切换至背景窗口
6. 不要点击非关键区域, 仅录制关键步骤

如何开发测试友好的代码？
----------------

1. 不要使用随机的id或name
2. 请为一个DOM功能区块命名一个id值
3. 为form表单项添加label
4. 请监听click，不要监听mousedown

如何为无线用例设置uuid
----------------

1. export devices="xxx1,xxx2" (windows: set devices="xxx1,xxx2")
2. source run.sh ( Linux|Mac ) 或 run.bat ( Windows )

更多提示
----------------

1. Mac操作系统: hosts中必需要有`127.0.0.1 localhost`的绑定
2. Mac或Linux: 必要时添加sudo


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

感谢
================

* jWebDriver: [https://github.com/yaniswang/jWebDriver](https://github.com/yaniswang/jWebDriver)
* colors: [https://github.com/Marak/colors.js](https://github.com/Marak/colors.js)
* commander: [https://github.com/tj/commander.js](https://github.com/tj/commander.js)
* inquirer: [https://github.com/sboudrias/Inquirer.js](https://github.com/sboudrias/Inquirer.js)
* async: [https://github.com/caolan/async](https://github.com/caolan/async)
* chai: [https://github.com/chaijs/chai](https://github.com/chaijs/chai)
* Faker.js: [https://github.com/marak/Faker.js/](https://github.com/marak/Faker.js/)
* mocha-parallel-tests: [https://github.com/yandex/mocha-parallel-tests](https://github.com/yandex/mocha-parallel-tests)
* Mochawesome: [https://github.com/adamgruber/mochawesome](https://github.com/adamgruber/mochawesome)
