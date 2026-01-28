.PHONY: help
 help:	                                       ## Show list of available make targets
	@cat Makefile | grep -e "^[a-zA-Z_\-]*: *.*## *" | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

.PHONY: run
run: resources/highlight.min.js                ## Run the application
	lein run

.PHONY: format
format:                                        ## Reformat Clojure source code
	lein cljfmt fix

.PHONY: package
package: resources/highlight.min.js            ## Package a new release of the application
	lein cljfmt check
	lein clean
	lein compile
	lein release patch

.PHONY: clean
clean:                                         ## Clean the local build directory
	lein clean
	rm -f resources/highlight.min.js

resources/highlight.min.js: target/highlight.min.js
	cp $< $@

target/highlight.min.js: tools/build-highlight-js
	tools/build-highlight-js

