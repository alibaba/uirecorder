cp /etc/hosts ./hosts
export runtime=$1
echo runtime: $runtime

if [ "$runtime" = "dev" ]; then
	# data build insert here
    npm run devtest
else
    npm test
fi

