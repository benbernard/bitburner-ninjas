TARGETS=$(addprefix dist/, $(notdir $(wildcard netrun/${USER}/*.js)))

all: dist ${TARGETS} dist/netrun.js

dist:
	@mkdir dist

dist/%.js: netrun/${USER}/%.js
	npx rollup $< --format esm -o $@ --silent

dist/netrun.js: netrun/netrun.js
	npx rollup $< --format esm -o $@ --silent
