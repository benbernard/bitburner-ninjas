# bitburner-ninjas

This repo allow local editing of bitburner files, which was my main reason for writing it.

It also servers as a repository of my personal scripts for the game, but it is
setup so that you don't use those by default.

## Setup

Run `npm install` to install dependencies

Then you will want to create a directory inside netrun to put your scripts.

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

## Writing Scripts

Just put whatever `.js` files you want in your `netrun/$USER` directory, they
will get loaded into your home server whenever you run netrun.js, and yes, you
can add a script and run it in the same command.

If you want you can use my `baseScript.js` class, just copy it into your
`$USER` directory.  You can also use my `tk.js` toolkit, but it contains more
of my personal logic and strategy, so you may not want it (in my mind that goes
from getting a toolchain to use local tools for writing scripts to just playing
the game with someone else's tools, but you make up your own mind!)

## Importing scripts from the game

This isn't possible right now.  Maybe something could get rigged up between the
server and using GET params in wget inside bitburner, but I just manually
copied all the scripts out of the game and now only edit them in my local
editor.  I welcome pull requests!
