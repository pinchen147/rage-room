#!/usr/bin/env bash
# Downloads every CC0 asset in the manifest into public/assets/.
# Idempotent: skips files that already exist. All sources are CC0 (see public/CREDITS.json).
set -euo pipefail
cd "$(dirname "$0")/.."

ASSETS=public/assets
mkdir -p "$ASSETS"/hdri "$ASSETS"/textures "$ASSETS"/models "$ASSETS"/audio

fetch() { # fetch <url> <dest>
  local url=$1 dest=$2
  if [ -s "$dest" ]; then return 0; fi
  mkdir -p "$(dirname "$dest")"
  echo "GET  $dest"
  curl -fsSL --retry 3 -o "$dest" "$url"
}

# ---------- HDRI ----------
fetch "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/abandoned_garage_1k.hdr" \
  "$ASSETS/hdri/abandoned_garage_1k.hdr"

# ---------- PBR texture sets (1k jpg) ----------
PH_TEX="https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k"
for map in diff nor_gl rough; do
  fetch "$PH_TEX/garage_floor/garage_floor_${map}_1k.jpg"           "$ASSETS/textures/garage_floor/${map}_1k.jpg"
  fetch "$PH_TEX/concrete_wall_004/concrete_wall_004_${map}_1k.jpg" "$ASSETS/textures/concrete_wall_004/${map}_1k.jpg"
  fetch "$PH_TEX/metal_plate/metal_plate_${map}_1k.jpg"             "$ASSETS/textures/metal_plate/${map}_1k.jpg"
done
fetch "$PH_TEX/metal_plate/metal_plate_metal_1k.jpg" "$ASSETS/textures/metal_plate/metal_1k.jpg"

# ---------- Poly Haven models (1k gltf + include files via files API) ----------
ph_model() { # ph_model <asset_id>
  local id=$1 dir="$ASSETS/models/$1"
  if [ -s "$dir/.complete" ]; then return 0; fi
  mkdir -p "$dir"
  echo "MODEL $id"
  curl -fsSL --retry 3 "https://api.polyhaven.com/files/$id" | python3 -c '
import json, sys, urllib.request, pathlib, os
data = json.load(sys.stdin)
main = data["gltf"]["1k"]["gltf"]  # {url, include: {relpath: {url}}}
dest = pathlib.Path(sys.argv[1])
def get(url, rel):
    p = dest / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    if p.exists() and p.stat().st_size > 0:
        return
    print(f"  -> {rel}")
    urllib.request.urlretrieve(url, p)
get(main["url"], os.path.basename(main["url"]))
for rel, meta in main.get("include", {}).items():
    get(meta["url"], rel)
' "$dir"
  touch "$dir/.complete"
}

for id in Television_01 wine_bottles_01 ceramic_vase_01 plastic_monobloc_chair_01 \
          cardboard_box_01 wooden_crate_01 steel_frame_shelves_01 metal_office_desk \
          barrel_03 old_tyre; do
  ph_model "$id"
done

# ---------- Audio packs ----------
unzip_into() { # unzip_into <url> <zipname> <destdir> <glob...>  (globs are basename patterns)
  local url=$1 zipname=$2 dest=$3
  shift 3
  if [ -d "$dest" ] && [ -n "$(ls -A "$dest" 2>/dev/null)" ]; then return 0; fi
  mkdir -p "$dest"
  echo "ZIP  $zipname -> $dest"
  local tmp=".tmp-assets/$zipname.d" zip=".tmp-assets/$zipname"
  mkdir -p "$tmp"
  curl -fsSL --retry 3 -o "$zip" "$url"
  unzip -qo "$zip" -d "$tmp"
  find "$tmp" -path '*__MACOSX*' -prune -o -type f \( -name '*.ogg' -o -name '*.wav' \) -print |
    while IFS= read -r f; do
      local base g
      base=$(basename "$f")
      for g in "$@"; do
        # shellcheck disable=SC2254
        case "$base" in
          $g) cp "$f" "$dest/"; break ;;
        esac
      done
    done
  rm -rf "$tmp" "$zip" 2>/dev/null || true
}

mkdir -p .tmp-assets
unzip_into "https://kenney.nl/media/pages/assets/impact-sounds/87b4ddecda-1677589768/kenney_impact-sounds.zip" \
  kenney_impact.zip "$ASSETS/audio/impact" '*'
unzip_into "https://opengameart.org/sites/default/files/sfx_breaking_and_falling.zip" \
  breaking.zip "$ASSETS/audio/break" '*'
unzip_into "https://opengameart.org/sites/default/files/swishes.zip" \
  swishes.zip "$ASSETS/audio/whoosh" '*'
unzip_into "https://opengameart.org/sites/default/files/25-CC0-bang-sfx.zip" \
  bang.zip "$ASSETS/audio/explosion" 'bang_*' 'cannon_*'
unzip_into "https://kenney.nl/media/pages/assets/sci-fi-sounds/6b296f9ecf-1677589334/kenney_sci-fi-sounds.zip" \
  scifi.zip "$ASSETS/audio/scifi" 'explosionCrunch_*' 'lowFrequency_explosion_*' 'impactMetal_*'
unzip_into "https://kenney.nl/media/pages/assets/interface-sounds/fa43c1dd4d-1677589452/kenney_interface-sounds.zip" \
  interface.zip "$ASSETS/audio/ui" 'click_*' 'tick_*' 'confirmation_*' 'glass_*'

rm -f "$ASSETS"/audio/explosion/fw_loop.ogg
rm -rf .tmp-assets 2>/dev/null || true
echo "DONE. Census:"
find "$ASSETS" -type f | wc -l
du -sh "$ASSETS"
