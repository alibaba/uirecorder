echo runtime: $runtime

if [ "$runtime" = "dev" ]; then
	# data build insert here
    npm run pdevtest
else
    npm run ptest
fi

