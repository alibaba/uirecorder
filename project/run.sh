cp /etc/hosts ./hosts
export runtime=$1
echo runtime: $runtime

if [ "$runtime" = "dev" ]; then
	# data build insert here
    tnpm run devtest
else
    tnpm test
fi

