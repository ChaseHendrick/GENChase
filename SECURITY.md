# Security

GENChase is one HTML file you open locally. There is no account, no server, and no secret the studio holds on your behalf. A plate is a hash in the URL. Images you generate are yours.

## What to report

A vulnerability is something that lets a page you did not mean to trust:

- run script in someone else's GENChase origin (through a hash, a seed, a Settings JSON paste, an export, a gallery name)
- persist or send data the person did not export
- force a networked origin so `file://` and the zip launcher no longer work
- read a clipboard paste, a print, or a gallery entry from another origin

Not a vulnerability:

- a plate that looks wrong, a print that does not match, a GPU tab going black, a residual that fails
- a technique that implements a paper you dislike
- opening `studio.html` from a host you do not trust (that is the host)

Use the [issue tracker](https://github.com/ChaseHendrick/GENChase/issues) for those.

## How to report

Use GitHub's private advisory on this repository:

**[Report a vulnerability](https://github.com/ChaseHendrick/GENChase/security/advisories/new)**

Do not open a public issue for a real one. There is no separate security email.

Include:

1. what happens
2. how to make it happen, from a clean `studio.html`
3. which browsers you tried
4. whether it needs a hosted origin, or also happens on `file://`

## Scope

In scope: `studio.html`, the launchers in `run/`, anything the page writes to `localStorage` or the clipboard, and a service worker if one is registered.

Out of scope: GitHub, a copy someone else hosted, browsers, WebGL drivers.

## What we will do

We will answer. A report that reproduces gets a fix in `studio.html` and a note in the advisory. There may be a bounty.

The source is Apache-2.0. General licensing questions belong in repository issues, not private security reports.
