UI Recorder change log
====================

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
