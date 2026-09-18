#!/bin/sh
# sh tools/gallery.sh   -- regenerate every README gallery tile from the current studio.html
# Each entry is: outputName hash waitMs preset(optional). Seeds are explicit so every tile reprints.
#
# Nine tiles, not eighteen. The ones that were dropped were all coarse-grid field simulations shown at
# print size: a few hundred cells interpolated across two thousand pixels is soft however it is encoded,
# and three of them read as blurry at README scale. What is left is either drawn from geometry (tilings,
# channels, cell walls, ticks, arcs) or computed on a grid fine enough to stay sharp, and where a tile
# needs a finer grid than the tab's default the hash carries it.
mkdir -p tools/shots/tiles
R() {
  if NODE_PATH=/opt/node22/lib/node_modules timeout 900 node tools/plate.js "$2" "tools/shots/tiles/$1" "$3" 1000 "$4" >/dev/null 2>&1; then echo "  ok   $1"; else echo "  FAIL $1"; fi
}
# grid 384 for the neural field, so the retinal warp is resampling a fine sheet rather than a coarse one
R cortex.jpg      "cortex/kluver-1928/eyJncmlkIjozODR9"        40000 tunnel
# grid 384, and the condensate is drawn from its own density rather than upscaled
R vortex.jpg      "bec/abrikosov-1957/eyJncmlkIjozODR9"        60000 lattice
# channels are line segments, so this one is geometry all the way down
R drainage.jpg    "landscape/howard-1994"                      70000 network
# the froth is a lattice of flat cells: crisp at any size
R froth.jpg       "potts/graner-1992/eyJncmlkIjo0MDB9"         60000 sides
# every tick is a rectangle
R matrices.jpg    "rmt/dyson-1962"                             45000 sweep
# the Eden cluster is one pixel per lattice cell, drawn with nearest-neighbor scaling
R eden.jpg        "kpz/kardar-1986"                            45000 eden
# geodesic arcs, computed per cell
R hyperbolic.jpg  "hyperbolic/poincare-1882"                   50000 spots
# kept from the old set: both are drawn from geometry and stay sharp
R snowflake.jpg   "snowflake/gravner-2008"                     26000 ""
R tilings.jpg     "tilings/penrose-1974"                       18000 ""
echo GALLERY RENDERED
