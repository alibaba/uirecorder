UIRecorder PC高级使用
============================

如何解决属性值不稳定问题？
-------------------

有很多开发会写一些随机的属性值，例如某些随机的id值，这种属性值会导致录制的脚本完全无法持续运行。

针对这个问题，我们提供了3套解决方案

1. `属性值黑名单正则`: 可以编写正则表达式过滤掉那些不稳定的属性值，例如：`/attr_value_\d+/`，如果需要过滤多种属性值，可以这么写：`/attr_value1_\d+|attr_value2_\d+/`。这个值可以在`uirecorder init`命令中进行配置，也可以在录制过程中的录制面板上即时修改。
2. `属性开关`：在录制面板上，可以通过临时切换不同属性项的开启和关闭，灵活组合出适合自己业务的PATH生成方案，例如某些场景下不适合用`text`，就可以临时将`text`属性项关闭掉。
3. `class值黑名单正则`：对于某些不稳定的class值，我们同样提供了黑名单功能，此功能需要通过`uirecorder init`命令进行配置。

变量功能怎么用？
-------------------

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
2. 录制界面中使用工具面创建新变量
3. 录制界面中使用工具面更新旧变量的值
4. 录制界面中使用工具面板跳转URL: `http://xxx.com/product?id={{productId}}`
5. 录制界面中使用工具面板插入变量字符串: `{{productName}}` 或 `aaa{{productName}}bbb`
6. 断言中使用变量字符串: `{{productName}}` 或 `aaa{{productName}}bbb`

提示: 所有变量字符串均支持JS语法的模板字符串，例如：`{{productName}}, ${new Date().getTime()}, ${parseInt(testVars.a)+parseInt(testVars.b)}`

怎么录制及使用公共脚本？
-------------------

1. 录制 `commons/login.mod.js`
2. 录制 `sample/test.spec.js`

    1. 在录制浏览器的开始页面时输入 `login.mod.js`，或者在输入框的右端点击下拉小三角，选择需要的脚本
    2. 或者在录制中间页面点击：`脚本跳转`，随后同上
    3. 当`login.mod.js`加载完成后，继续别的步骤的录制

3. `source run.sh sample/test.spec.js` ( Linux|Mac ) 或 `run.bat sample/test.spec.js` ( Windows )

如何录制文件上传步骤？
-------------------

1. UI Recorder仅支持Native文件上传, 不支持FLASH上传
2. 直接点击`<input type="file">` 或点击 `<button role="upload">Upload file</button>`, 占位按钮必需要用`role`或`data-role`标注为`upload`
3. 上传的文件必需保存在`uploadfiles/`文件夹中

如何断点调试生成的脚本？
-------------------

1. 安装 [Visual Studio Code](https://code.visualstudio.com/) ，然后打开它
2. 在vs code中打开项目根目录
3. 打开测试脚本, 添加断点
4. 按 `F5` 键执行脚本, 按 `F10` 键执行下一行

如何断言浏览器eval js代码后的结果？
----------------

1. `添加断言`, 选择类型： `jscode`
2. 同步模式: `return document.title`
3. 函数模式:

        function(){
            var str = "aaa";
            return str;
        }

4. 异步模式:

        function(done){
            setTimeout(function(){
                done(123);
            }, 100);
        }

如何在断言前隐藏DOM结点?
----------------

1. `uirecorder init`
2. 在初始化`断言前隐藏`选项时，输入需要隐藏的css选择器
3. `uirecorder start`
4. UIRecorder会在断言前隐藏所有匹配的DOM结点，然后就可以断言那些隐藏在mask层后面的DOM

如何录制可选的点击?
----------------

某些步骤不是非常重要，但却偶尔会出现，这些步骤会总是断言为成功。

1. 按下'Alt'键
2. 点击目标DOM

如何使用图片对比功能?
----------------

1. 安装GraphicsMagick

    > brew install graphicsmagick (Mac)

    > sudo apt-get install graphicsmagick (Linux)

    > http://www.graphicsmagick.org/download.html (Windows)

2. 添加图片对比断言

    > 选择断言类型: imgdiff

    > 选择目标控件

3. 当业务变化时，我们可以通过以下命令更新基线图片

    > `source run.sh sample/test.spec.js --rebuilddiff` (Mac | Linux)

    > `run.bat sample/test.spec.js --rebuilddiff` (Windows)

如何导出原数据?
----------------

如果希望基于UIRecorder录制出来的步骤生成JAVA等别的语言自动化脚本，可以使用我们的原数据导出功能。

此功能可以在生成js语法的自动化脚本同时，也生成json格式的原数据。基于此json文件，我们就可以自由的翻译成任何语言的自动化脚本。

1. `uirecorder start --raw`
2. 录制完后，就可以获得2个文件: `sample/test.spec.js`, `sample/test.spec.json`

如何接入Jenkins？
----------------

1. 添加命令

        source ./install.sh
        source ./run.sh

2. 添加报告

    > [JUnit](https://wiki.jenkins-ci.org/display/JENKINS/JUnit+Plugin): `reports/index.xml`

    > [HTML](https://wiki.jenkins-ci.org/display/JENKINS/HTML+Publisher+Plugin): `reports/index.html`

国内用户可以通过oschina和cnpm提升部署效率，修改install.sh如下：

    ls ~/nvm || git clone https://git.oschina.net/yaniswang/nvm.git ~/nvm
    source ~/nvm/nvm.sh
    export NVM_NODEJS_ORG_MIRROR="http://npm.taobao.org/mirrors/node"
    nvm install v7.10.0
    npm install --registry=https://registry.npm.taobao.org

如何失败时才生成截图？
-------------------

1. 编辑文件：`package.json`, 确保`mochawesome-uirecorder`版本在`1.5.22`及以上
2. 在`--reporter mochawesome-uirecorder`后面添加：` --reporter-options copyShotOnlyFail=true`
