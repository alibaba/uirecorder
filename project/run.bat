@echo off
echo runtime: %runtime%

if "%runtime%" equ "dev" (
	rem data build insert here
	npm run pdevtest
) else (
	npm run ptest
)
