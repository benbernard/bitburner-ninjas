# bitburner-ninjas

## Setup

Run `npm install` to install dependencies

THen you will want to create a directory inside netrun to put your scripts.

    cd netrun
    mkdir $USER

Run `npm start` to start server on port 3000.

## Using another set of scripts

If you want to use my scripts or someone else's in this repo, just run npm like so:

    USER=bernard npm start

You can also put the `USER=bernard` into the `.env` file at the root of the
directory.  (then just run with `npm start`)

## Installing in Bitburner

Use `wget` against localhost:3000 and load into 'netrun.js'.  I recommend
setting up an alias so that you can reload it directly if you modify netrun.js
and need to reload from scratch.

    alias reload="wget http://localhost:3000 netrun.js"

This will only work if the server is running (normally via `npm start`).

Then just run `reload` from the Terminal

## Running scripts

    run netrun.js yourscript[.js] ARGS

You can also setup an alias for some of this, like so:

    alias nr="run netrun.js"

If you run all your scripts under `netrun.js`, they will be auto-updated to the
version that is on the server. You will also incur some ram overhead, but your
script will still run in its own ram space.

You can always directly run your scripts as well with `run` as per normal, but
you will not get auto-updating behavior.
