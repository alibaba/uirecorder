UI Recorder change log
====================

## ver 2.4.11 (2017-4-1)

1. Fix: Support macaca new wda source api

## ver 2.4.10 (2017-3-29)

1. Fix: No reset browser size when continue recording

## ver 2.4.9 (2017-3-21)

1. Fix: data-testid not work

## ver 2.4.8 (2017-3-21)

1. Fix: disable get screenshot when closeWindow
2. Fix: insert new var failed in other iframe context

## ver 2.4.7 (2017-3-20)

1. Fix: insert var failed when add new var in iframe context
2. Add: support get data-testid before get id
3. Add: add new feature eval jscode in browser side

## ver 2.4.6 (2017-3-18)

1. Add: add localhost hosts tip for mac system
2. Update: update selenium-standalone to version v6.1.0
3. Fix: stop chromedriver and browser before recorder ended
4. Fix: add i18n text for var template dialog
5. Add: add title to recorder browser and checker browser

## ver 2.4.5 (2017-3-17)

1. Add: add attr data-test
2. Add: support auto show text dialog when mobile recording
3. Add: support js template string to insert var(pc), jump url(pc), send keys(mobile), expect(pc, mobile)
4. Del: delete support to faker.js
5. Fix: support to chrome v57

## ver 2.4.4 (2017-3-14)

1. Fix: not record sendKeys when paste in recorder dom area

## ver 2.4.3 (2017-3-7)

1. Fix: delay 1 second to init recorder browser

## ver 2.4.2 (2017-3-7)

1. Fix: fix update var failed in next page when recording

## ver 2.4.1 (2017-3-6)

1. Add: support save paste text when record pc test

## ver 2.4.0 (2017-3-6)

1. Fix: fix continue record issue when json file is missing
2. Remove: remove runtime
3. Update: support new version of macaca
4. Add: support new feature for mobile record: sleep, text, back, alert, expect, end
5. Add: support ios real device
6. Add: support download app file from url
7. Add: support continue record for mobile

## ver 2.3.32 (2017-2-17)

1. Fix: fix continue record issue
2. Fix: not save file when record zero step
3. Add: support optionClick

## ver 2.3.31 (2017-2-14)

1. Fix: add escape to module name when call spec
2. Add: support continue record

## ver 2.3.30 (2017-2-10)

1. Fix: fix raw path issue
2. Add: support disable id and name when recording
3. Add: support edit attr value black when recording
4. Add: support add sleep time

## ver 2.3.29 (2017-2-10)

1. Add: support save raw cmd json file

## ver 2.3.28 (2017-2-9)

1. Add: support expect after hover in mac os
2. Fix: fix some case skiped issue
3. Add: support show hosts in html reporter
4. Add: support use unicode file name for test case
5. Add: support start selenium-standalone server by npm cmd: `npm run server`
6. Fix: fix throw no error issue when expect a non existed dom
7. Fix: fix issue when expect a string contain `'`

## ver 2.3.27 (2017-2-4)

1. Fix: fix chromedriver install failed issue
2. Fix: fix run failed in windows system

## ver 2.3.26 (2017-1-16)

1. Add: support single test by run command
2. Add: support hide dom before expect

## ver 2.3.25 (2017-1-12)

1. Add: support scroll in element

## ver 2.3.24 (2017-1-6)

1. Fix: support node v7.x
2. Update: up chromedriver to v2.27

## ver 2.3.23 (2017-1-6)

1. Add: check page error after page loaded

## ver 2.3.22 (2017-1-4)

1. Add: support disable path attr temporary
2. Fix: fix updatevar failed issue when in iframe

## ver 2.3.19 (2016-12-28)

1. Fix: exclude uirecorder tool panel doms when get dom path
2. Fix: fix aria upload role issue

## ver 2.3.16 (2016-12-28)

1. Fix: fix upload check failed issue
2. Add: support aria role for upload

## ver 2.3.15 (2016-12-27)

1. Add: update mochawesome-uirecorder, add support lightbox

## ver 2.3.13 (2016-12-24)

1. Fix: update jwebdriver to v2.0.5, fix issue: send key to rich editor failed with first time

## ver 2.3.12 (2016-12-23)

1. Fix: fix double event issue when in rich editor

## ver 2.3.11 (2016-12-23)

1. Fix: fix click event lost issue in some special case

## ver 2.3.10 (2016-12-22)

1. Add: support jump to var only url

## ver 2.3.9 (2016-12-21)

1. Add: support change webdriver host & port by env
2. Add: change to use chromedriver (https://www.npmjs.com/package/chromedriver)

## ver 2.3.8 (2016-12-20)

1. Add: support auto check update

## ver 2.3.7 (2016-12-20)

1. Add: support more expect type: notEqual, above, below, match, notMatch
2. Add: add readme: How to add expect after hover?

## ver 2.3.6 (2016-12-20)

1. Fix: fix jwebdriver chai issue when throw error by promise

## ver 2.3.5 (2016-12-19)

1. Fix: fix mouseUp issue when change window

## ver 2.3.4 (2016-12-16)

1. Fix: fix mouseDown issue when open new window

## ver 2.3.3 (2016-12-16)

1. Update: up chromedriver to v2.26

## ver 2.3.2 (2016-12-13)

1. Add: module dialog change to jump to dialog, support for url jump

## ver 2.3.0 (2016-12-12)

1. Fix: switchWindow losted when check browser is disabled (PC)
2. Add: support update var with webdriver (PC)
2. Add: support define different hosts file for different runtime (PC)

## ver 2.2.18 (2016-12-6)

1. Fix: exit with code 0 when use mochawesome-uirecorder, support to jenkins

## ver 2.2.15 (2016-12-6)

1. Fix: support test case saved in third level directory

## ver 2.2.14 (2016-12-5)

1. Fix: fix mouseUp issue again

## ver 2.2.13 (2016-12-5)

1. Fix: fix frame id issue
2. Fix: fix mouseUp issue
3. Add: support set delay time for expect

## ver 2.2.12 (2016-12-2)

1. Fix: update jwebdriver to fix findVisbile issue
2. Fix: fix drag drop issue in some special case

## ver 2.2.11 (2016-12-1)

1. Add: support record for shadow dom

## ver 2.2.10 (2016-12-1)

1. Fix: update jwebdriver, fix local ip issue

## ver 2.2.9 (2016-11-30)

1. Fix: disable flash when recording

## ver 2.2.8 (2016-11-30)

1. Fix: fix project files for mobile mode
2. Fix: fix some issues for record tool panel

## ver 2.2.7 (2016-11-29)

1. Add: support parallel test

## ver 2.2.4 (2016-11-29)

1. Add: change to local file upload

## ver 2.2.0 (2016-11-29)

1. Add: show config path for user confirm runtime
2. Add: init full test project
3. Add: add tutorial how to dock jenkins
4. Fix: fix websocket connect failed when system use invalid proxy

## ver 2.1.17 (2016-11-25)

1. Add: support runtime switch

## ver 2.1.16 (2016-11-25)

1. Fix: fix var string issue again

## ver 2.1.15 (2016-11-24)

1. Fix: fix var string no support for boolean type

## ver 2.1.14 (2016-11-23)

1. Add: add simulate input event when insert var in recording
2. Add: show common spec lists in start page

## ver 2.1.11 (2016-11-18)

1. Update: update to chromedriver v2.25
2. Fix: fix common test load failed issue
3. Fix: fix show text failed when i18n load slowly
4. Add: support var edit feature

## ver 2.1.10 (2016-11-17)

1. Add: create commons directory when init config
2. Add: add change log link to README

## ver 2.1.9 (2016-11-17)

1. Add: show version at top

## ver 2.1.7 (2016-11-17)

1. Fix: fix screenshots filename issue

## ver 2.1.5 (2016-11-16)

1. Fix: fix add double expect commands issue
2. Add: add reporter mochawesome-uirecorder, support list screenshots

## ver 2.1.4 (2016-11-15)

1. Fix: fix root path
2. Fix: fix readme

## ver 2.1.3 (2016-11-15)

1. Add: support start with url include var
2. Add: support expect to string include var
3. Add: add mochawesome reporter to readme

## ver 2.1.2 (2016-11-14)

1. Fix: fix dblClick crash issue

## ver 2.1.1 (2016-11-14)

1. Add: support new expect type: alert
2. Fix: fix issue for expect type: url, title, cookie, localStorage, sessionStorage

## ver 2.1.0 (2016-11-11)

1. Add: support save test case into sub directory
2. Fix: fix issue when url contain space at front or end
3. Add: create screenshots directory when init config

## ver 2.0.3 (2016-11-9)

1. Add: save screenshots after each step
2. Fix: fix bin issue for mac & linux
3. Fix: fix some issue for pc record
4. Add: support edit path when expect dom

## ver 2.0.0 (2016-11-8)

1. Add: Support jWebDriver v2.0.0
2. Add: Support macaca for mobile record

## ver 1.4.0 (2016-9-22)

1. Add: add default help to cli
2. Add: support define browser size for test case

## ver 1.3.0 (2016-9-20)

1. Add: find visible elements for DOM PATH, short path length, more compatibility
2. Fix: fix chrome open failed issue when computer is very slow
3. Update: update to chromedriver v2.24
