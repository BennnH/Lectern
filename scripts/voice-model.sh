#!/bin/sh
# Downloads the speech model for voice commands into resources/voice/.
#
# Model: Vosk small US English 0.15, by Alpha Cephei (Apache 2.0 licence), 40 MB.
# It comes from the official Vosk models page, is checked against known checksums,
# and is repacked as .tar.gz because that's the format the voice engine reads.
# Run with: npm run voice-model

set -eu

MODEL=vosk-model-small-en-us-0.15
URL="${VOICE_MODEL_URL:-https://alphacephei.com/vosk/models/$MODEL.zip}"
DEST=resources/voice
OUT="$DEST/$MODEL.tar.gz"

if [ -f "$OUT" ]; then
  echo "Already installed: $OUT"
  exit 0
fi

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

echo "Downloading ${MODEL}..."
curl --fail --location --progress-bar --output "$TMP/model.zip" "$URL"
unzip -q "$TMP/model.zip" -d "$TMP"

echo "Checking the files..."
cd "$TMP/$MODEL"
if ! shasum -a 256 -c --quiet <<'SUMS'
75370a0137f9daf8f469dedd7daa4513ae7a621f03240c6e512e2b50b656a7b6  am/final.mdl
1e2228006d01d805ad1c267fee9f79709ca87ac51bd82b0e3f5c69ba543f0fc4  conf/mfcc.conf
8f14cb1eeb07c762c371db648c6be688d347236155ca0f64fb13b6567a8ce81f  conf/model.conf
023c8b7e30704a9e37765c635c252e608a02f361235bf94abdcf2a5225d85b20  graph/Gr.fst
5caafba3081e1646545ac6bff0dd7a318e53dcbdc86f237909ce1d2ac1293d34  graph/HCLr.fst
9ad87cc166d0998f08f758f47a6223a120dfffcbee805c4849c3aa5e6bb3c0fc  graph/disambig_tid.int
da199d9c991e0e84681ddbb34627b915b26302d50a8fdaa23c51e2bc3a50b5c3  graph/phones/word_boundary.int
8c5d7dd69d2122313baaf19f61f35dd3fa18b70c62ac0687e311e1c46e6daca7  ivector/final.dubm
3f37faf90c375b9e4740b569398b5829ed9cc07d19be6d441f72c3b71d7efcc6  ivector/final.ie
ddd83586dc5f928cda8738b922c85ffe38fc789cb5f9151a712ca12f37265382  ivector/final.mat
33be09afcc80059847a275c3d043b51f1ab954c7c2438ddbbf4745e8ba144ff9  ivector/global_cmvn.stats
a2f3571754b64297cb7efb2e7ca3df61995c5a45fcbb97188f90613552bb2dfe  ivector/online_cmvn.conf
9f0c5f7c82d18eaf25d8bce470efa9f7741f88411fe428774bc0a9bb69a24756  ivector/splice.conf
SUMS
then
  echo "The downloaded model doesn't match the expected files, so it wasn't installed." >&2
  exit 1
fi
cd - > /dev/null

# COPYFILE_DISABLE stops macOS adding hidden ._ files to the archive
mkdir -p "$DEST"
COPYFILE_DISABLE=1 tar -czf "$OUT" -C "$TMP" "$MODEL"
echo "Installed: $OUT ($(du -h "$OUT" | cut -f1))"
