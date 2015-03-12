test:
	@NODE_ENV=test ./node_modules/.bin/mocha \
		--require should \
		--harmony \
		test/index.js

.PHONY: test