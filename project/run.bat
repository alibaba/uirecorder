@echo off
echo runtime: %runtime%

if "%1" neq "" (
    npm run singletest %1
) else (
    npm run paralleltest
)
