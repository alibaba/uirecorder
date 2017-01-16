if [ "$1" = "" ]; then
    npm run paralleltest
else
    npm run singletest $1
fi
