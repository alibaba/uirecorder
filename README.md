UI Recorder
=======================

![logo.png](https://raw.github.com/alibaba/uirecorder/master/logo.png)

[![NPM version](https://img.shields.io/npm/v/uirecorder.svg?style=flat)](https://www.npmjs.com/package/uirecorder)
[![License](https://img.shields.io/npm/l/uirecorder.svg?style=flat)](https://www.npmjs.com/package/uirecorder)
[![NPM count](https://img.shields.io/npm/dm/uirecorder.svg?style=flat)](https://www.npmjs.com/package/uirecorder)
[![NPM count](https://img.shields.io/npm/dt/uirecorder.svg?style=flat)](https://www.npmjs.com/package/uirecorder)

UI Recorder is a UI test case recorder such as [Selenium IDE](http://docs.seleniumhq.org/projects/ide/).

UI Recorder is much powerful then Selenium IDE!

UI Recorder is easily for use.

Features
================

1. Support all user operation: key event, mouse event, alert, file upload, drag, svg
2. No interference when recording: the same as self test
3. Record test file saved in local
4. Support kinds of expect: val,text,displayed,enabled,selected,attr,css,url,title,cookie,localStorage,sessionStorage
5. Support mock: [fake.js](https://github.com/marak/Faker.js/)
6. Support common test case: one case call another
7. Support i18n: en, zh-cn, zh-tw
8. Test file base on NodeJs: [jWebDriver](http://jwebdriver.com/)

ScreenShots
================

![shot1](https://raw.github.com/alibaba/uirecorder/master/screenshot/shot1.jpg)

![shot2](https://raw.github.com/alibaba/uirecorder/master/screenshot/shot2.jpg)

![shot3](https://raw.github.com/alibaba/uirecorder/master/screenshot/shot3.jpg)

Quick start
================

1. Install NodeJs

    > [https://nodejs.org/](https://nodejs.org/)

2. Install UI Recorder

    > npm install uirecorder -g

3. Init config

    > uirecorder init

4. Start recorder test case

    > uirecorder start

5. Run test case

    > npm install mocha -g

    > npm install jwebdriver expect.js mocha-generators faker --save-dev

    > mocha *.spec.js

Video Tutorial:
-------------------------

* 中文教程：[http://v.youku.com/v_show/id_XMTY4NTk5NjI4MA==.html](http://v.youku.com/v_show/id_XMTY4NTk5NjI4MA==.html)

How to deploy WebDriver Server
================

1. Selenium standalone server:

    > Selenium Server & IEDriverServer & SafariDriver: [http://selenium-release.storage.googleapis.com/index.html](http://selenium-release.storage.googleapis.com/index.html)

    > ChromeDriver: [http://chromedriver.storage.googleapis.com/index.html](http://chromedriver.storage.googleapis.com/index.html)

    > Run selenium server: `java -jar selenium-server-standalone-2.26.0.jar`

2. Selenium Grid: [https://github.com/SeleniumHQ/selenium/wiki/Grid2](https://github.com/SeleniumHQ/selenium/wiki/Grid2)
3. F2etest: [https://github.com/alibaba/f2etest](https://github.com/alibaba/f2etest)

How to record common test case?
================

1. Record `common.mod.js`
2. Record `test.spec.js`

    1. please input `common.mod.js` in recorder start page or insert test case in page
    2. After `common.mod.js` loaded, then recorder other steps

3. mocha *.spec.js

How to record file upload?
================

1. UI Recorder only support native file compont, no support for Flash
2. `<input type="file">` must place on top layer
3. File base path: `c:\uploadFiles\`

Can't do when recording
================

1. don't change url in location bar
2. don't change focus by TAB key
3. don't use dblclick, WebDriver no support
4. don't select text by mouse, WebDriver no support
5. don't focus to background window manualy
6. don't click useless DOM, only record key steps

How to save screenshots after test?
================

1. create new folder in current: screenshots
2. `mocha test/*.spec.js`
3. Screenshots saved: `./screenshots/*.png`

How develop test friendly code?
================

1. please dont't use random id or name
2. please name a id for DOM area
3. add label for form
4. please listen click event instead of mousedown


Other Tips
================

1. Mac system: localhost must place in hosts

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

Thanks
================

* colors: [https://github.com/Marak/colors.js](https://github.com/Marak/colors.js)
* commander: [https://github.com/tj/commander.js](https://github.com/tj/commander.js)
* inquirer: [https://github.com/sboudrias/Inquirer.js](https://github.com/sboudrias/Inquirer.js)
* jWebDriver: [https://github.com/yaniswang/jWebDriver](https://github.com/yaniswang/jWebDriver)
* async: [https://github.com/caolan/async](https://github.com/caolan/async)
* Faker.js: [https://github.com/marak/Faker.js/](https://github.com/marak/Faker.js/)
