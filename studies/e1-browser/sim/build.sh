#!/usr/bin/env bash
# E1 browser check: build JSBSim v1.3.3 + bridge.cpp to a modularized ES module
# (dist/jsbsim.mjs + dist/jsbsim.wasm) for worker.js. Study recipe only.
#
# Usage: studies/e1-browser/sim/build.sh [WORK_DIR]
#   WORK_DIR (default: $E1_WORK or ./.work next to this script, gitignored) holds
#   the emsdk checkout, JSBSim source and CMake build. Existing checkouts at the
#   pinned revisions are reused. Outputs go to sim/dist/ (gitignored).
set -euo pipefail

EMSDK_VERSION=6.0.13
EMSDK_REPO=https://github.com/emscripten-core/emsdk.git
JSBSIM_REPO=https://github.com/JSBSim-Team/jsbsim.git
JSBSIM_TAG=v1.3.3
JSBSIM_COMMIT=66f7fafc07fe13e7ede9db20873030fed2881713
EXC_FLAGS=-fwasm-exceptions   # the default no-exception build aborts at model load

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
WORK=${1:-${E1_WORK:-$HERE/.work}}
DIST=$HERE/dist
mkdir -p "$WORK" "$DIST"

E1_EMSDK=${E1_EMSDK:-$WORK/emsdk}
SRC=${JSBSIM_SRC:-$WORK/jsbsim-1.3.3}
BUILD=${JSBSIM_BUILD:-$WORK/build-wasm-exc}

# 1. emsdk (pinned SDK version; the emsdk tool revision itself is recorded below)
if [ ! -d "$E1_EMSDK" ]; then git clone "$EMSDK_REPO" "$E1_EMSDK"; fi
"$E1_EMSDK/emsdk" install "$EMSDK_VERSION"
"$E1_EMSDK/emsdk" activate "$EMSDK_VERSION" >/dev/null
# shellcheck disable=SC1091
EMSDK_QUIET=1 source "$E1_EMSDK/emsdk_env.sh"
EMCC_VERSION=$(emcc --version | head -1)
case "$EMCC_VERSION" in *"$EMSDK_VERSION"*) ;; *) echo "unexpected emcc: $EMCC_VERSION" >&2; exit 1;; esac

# 2. JSBSim source at the pinned commit
if [ ! -d "$SRC" ]; then
  git clone --depth 1 --branch "$JSBSIM_TAG" "$JSBSIM_REPO" "$SRC"
fi
got=$(git -C "$SRC" rev-parse HEAD)
if [ "$got" != "$JSBSIM_COMMIT" ]; then echo "JSBSim commit $got != $JSBSIM_COMMIT" >&2; exit 1; fi

# 3. Static library (unmodified upstream source)
if [ ! -f "$BUILD/src/libJSBSim.a" ]; then
  mkdir -p "$BUILD"
  (cd "$BUILD" && emcmake cmake "$SRC" -DCMAKE_BUILD_TYPE=Release -DBUILD_PYTHON_MODULE=OFF \
     -DBUILD_DOCS=OFF -DCMAKE_CXX_FLAGS="$EXC_FLAGS" -DCMAKE_C_FLAGS="$EXC_FLAGS" \
   && emmake make -j"$(nproc)" libJSBSim)
fi

# 4. Bridge + only the c172x data it loads, embedded under /jsbsim in MEMFS.
#    Study use only: this data is not shipped (see README licence notes).
DATA=(
  aircraft/c172x/c172x.xml
  aircraft/c172x/c172ap.xml
  engine/eng_io320.xml
  engine/prop_75in2f.xml
  systems/GNCUtilities.xml
  systems/Autopilot.xml
)
EMBED=()
for f in "${DATA[@]}"; do EMBED+=(--embed-file "$SRC/$f@/jsbsim/$f"); done

em++ -O2 -std=c++17 $EXC_FLAGS -I"$SRC/src" -I"$BUILD/src" "$HERE/bridge.cpp" \
  "$BUILD/src/libJSBSim.a" -o "$DIST/jsbsim.mjs" \
  -sMODULARIZE=1 -sEXPORT_ES6=1 -sEXPORT_NAME=createJSBSim -sENVIRONMENT=worker,web,node \
  -sALLOW_MEMORY_GROWTH=1 -sEXPORTED_RUNTIME_METHODS=HEAPF64,UTF8ToString \
  -sEXPORTED_FUNCTIONS=_gf_init,_gf_set_inputs,_gf_step,_gf_state,_gf_state_len,_gf_step_index,_gf_digest_hex,_gf_trim_status,_gf_trim_throttle,_gf_trim_pitch \
  "${EMBED[@]}"

# 5. Build record read by worker.js ("ready" message)
WASM_BYTES=$(stat -c %s "$DIST/jsbsim.wasm")
WASM_SHA=$(sha256sum "$DIST/jsbsim.wasm" | cut -d' ' -f1)
EMSDK_REV=$(git -C "$E1_EMSDK" rev-parse HEAD)
cat > "$DIST/build-info.json" <<EOF
{"jsbsim_tag": "$JSBSIM_TAG", "jsbsim_commit": "$JSBSIM_COMMIT", "emsdk": "$EMSDK_VERSION",
 "emsdk_rev": "$EMSDK_REV", "emcc": "${EMCC_VERSION//\"/}", "flags": "-O2 $EXC_FLAGS",
 "wasm_bytes": $WASM_BYTES, "wasm_sha256": "$WASM_SHA"}
EOF
cat "$DIST/build-info.json"
