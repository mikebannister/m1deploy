test:
	@NODE_ENV=test ./support/expresso/bin/expresso --serial test/*.test.js

coverage:
	rm -rf ./lib-cov
	@NODE_ENV=test node-jscoverage ./lib ./lib-cov
	@NODE_ENV=test ./support/expresso/bin/expresso -I ./lib-cov --serial test/*.test.js

start:
	@NODE_ENV=development bin/m1deploy

.PHONY: coverage test start
