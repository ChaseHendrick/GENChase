#!/bin/sh
# sh tools/gallery.sh   -- regenerate every README gallery tile from the current studio.html
# Each entry is: outputName hash waitMs preset(optional). Seeds are explicit so every tile reprints.
set -e
mkdir -p tools/shots/tiles
R() { NODE_PATH=/opt/node22/lib/node_modules timeout 400 node tools/plate.js "$2" "tools/shots/tiles/$1" "$3" 1000 "$4" >/dev/null 2>&1 && echo "  $1"; }
R snowflake.jpg   "snowflake/gravner-2008"     26000 ""
R hofstadter.jpg  "hofstadter/hofstadter-1976" 20000 ""
R hexagons.jpg    "swift/swift-1977"           20000 hex
R caustics.jpg    "caustics/berry-caustic"     18000 ""
R physarum.jpg    "physarum/physarum-gallery"  22000 ""
R spinodal.jpg    "cahn/cahn-1958"             34000 ""
R scars.png       "scars/heller-1984"          20000 ""
R twelve.png      "lp/lifshitz-1997"           26000 dodec
R tilings.jpg     "tilings/penrose-1974"       18000 ""
R sandpile.jpg    "sandpile/dhar-1990"         26000 identity
R pendulum.jpg    "pendulum/shinbrot-1992"     26000 classic
R excitable.jpg   "excitable/barkley-1991"     24000 spirals
R schrodinger.jpg "schrodinger/visscher-1991"  22000 double
R holomorphic.jpg "holomorphic/mandelbrot-1980" 18000 seahorse
R turing.jpg      "turing/turing-1952"         26000 spots
R aztec.jpg       "aztec/propp-1992"           20000 classic
R hl.jpg          "hl/hastings-1998"           20000 fine
R sle.jpg         "sle/schramm-2000"           26000 sweep
echo GALLERY RENDERED
