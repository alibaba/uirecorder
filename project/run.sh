cp /etc/hosts ./hosts
export runtime=$1
echo runtime: $runtime

if [ "$runtime" = "dev" ]; then
	# data build insert here
    npm run pdevtest
else
    npm run ptest
fi

