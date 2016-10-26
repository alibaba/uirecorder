@echo off
"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --pack-extension=%cd%\chrome-extension --pack-extension-key=%cd%\uirecorder.pem
move chrome-extension.crx tool/uirecorder.crx
echo Build done!
