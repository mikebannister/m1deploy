test:
	@NODE_ENV=test ./support/expresso/bin/expresso --serial test/*.test.js

.PHONY: test
