TARGETS=$(addprefix dist/, $(notdir $(wildcard netrun/${USER}/*.js))) dist/netrun.js
SOURCES=$(wildcard netrun/${USER}/*.js) netrun/netrun.js

all: dist ${TARGETS}

dist:
	@mkdir dist

${TARGETS}: ${SOURCES}
	echo target $@ source $<
	npx rollup -c --silent

# dist/%.js: netrun/${USER}/%.js
# 	npx rollup -c --silent
#
# dist/netrun.js: netrun/netrun.js
# 	npx rollup -c --silent

clean:
	rm -rf dist
