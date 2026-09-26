#!/bin/sh
# Build the programs. CAPD (https://github.com/CAPDGroup/CAPD, GPL) is fetched at a pinned commit into $CAPD_DIR
# (default: ./_capd, not committed) unless $CAPD_CONFIG points at an existing capd-config.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
CAPD_COMMIT=${CAPD_COMMIT:-03dc5628203334b214bb7d9fd63788a175521005}
CAPD_DIR=${CAPD_DIR:-$HERE/../_capd}
BIN=${BIN:-$HERE/../_bin}
if [ -z "$CAPD_CONFIG" ]; then
  if [ ! -x "$CAPD_DIR/build/bin/capd-config" ]; then
    git clone https://github.com/CAPDGroup/CAPD.git "$CAPD_DIR"
    (cd "$CAPD_DIR" && git checkout "$CAPD_COMMIT" && mkdir -p build && cd build &&
     cmake .. -DCMAKE_BUILD_TYPE=Release -DCAPD_ENABLE_MULTIPRECISION=OFF > cmake.log && make -j"$(nproc)" > make.log)
  fi
  CAPD_CONFIG="$CAPD_DIR/build/bin/capd-config"
fi
mkdir -p "$BIN"
for p in explore scan manifold; do g++ -O2 -o "$BIN/$p" "$HERE/$p.cpp" $($CAPD_CONFIG --cflags --libs); done
g++ -O2 -fopenmp -o "$BIN/prove" "$HERE/prove.cpp" $($CAPD_CONFIG --cflags --libs)
echo "built into $BIN"
