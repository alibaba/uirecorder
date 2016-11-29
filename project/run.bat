@echo off
copy "C:\Windows\System32\drivers\etc\hosts" "hosts" /Y
set runtime=%1
echo runtime: %runtime%

if "%runtime%" equ "dev" (
	rem data build insert here
	npm run devtest
) else (
	npm test
)
