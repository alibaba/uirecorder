@echo off
C:\Users\Administrator\AppData\Local\Google\Chrome\Application\chrome.exe --pack-extension=%cd%\chrome-extension --pack-extension-key=%cd%\uirecorder.pem
move chrome-extension.crx tool/uirecorder.crx
echo Build done!
