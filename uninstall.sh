#!/usr/bin/env bash
# Removes the Lithos Ultra skill and the agents it installed from user scope.
# Only files recorded in the install manifest are deleted; other lithos-*.md agents
# (e.g. your own) are left alone. Project run data (.lithos/ folders) is untouched.
# Usage: ./uninstall.sh           remove what the manifest lists
#        ./uninstall.sh --force   no (valid) manifest: remove this package's agents anyway
set -euo pipefail

FORCE=0
case "${1:-}" in
  "") ;;
  --force) FORCE=1 ;;
  *) echo "usage: $0 [--force]" >&2; exit 2 ;;
esac

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
RAW_CFG="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
if [ ! -d "$RAW_CFG" ]; then echo "nothing to uninstall: $RAW_CFG does not exist"; exit 0; fi
CFG="$(cd "$RAW_CFG" && pwd -P)"
SKILL_DST="$CFG/skills/lithos-ultra"
AGENT_DST="$CFG/agents"
MAN="$SKILL_DST/.install-manifest"
MAN_HEADER="# lithos-ultra install manifest v2"

AGENTS=()
WFS=()
VALID_MANIFEST=0
if [ -f "$MAN" ] && IFS= read -r first < "$MAN" && [ "$first" = "$MAN_HEADER" ]; then
  VALID_MANIFEST=1
  while IFS= read -r line; do
    case "$line" in
      "agent "*)
        a="${line#agent }"
        case "$a" in */*) continue ;; lithos-*.md) AGENTS+=("$a") ;; esac ;;
      "workflow "*)
        w="${line#workflow }"
        case "$w" in */*) continue ;; lithos-*.js) WFS+=("$w") ;; esac ;;
    esac
  done < "$MAN"
fi

if [ "$VALID_MANIFEST" -eq 0 ]; then
  # Without a trustworthy manifest we cannot tell package agents from the user's own.
  # The package list next to this script is authoritative if present; otherwise fall
  # back to listing every lithos-*.md so the user can decide.
  CANDIDATES=()
  if compgen -G "$SRC/agents/lithos-*.md" >/dev/null; then
    for f in "$SRC"/agents/lithos-*.md; do
      a="$(basename "$f")"; [ -f "$AGENT_DST/$a" ] && CANDIDATES+=("$a")
    done
    SOURCE_DESC="agents shipped in $SRC/agents"
  else
    for f in "$AGENT_DST"/lithos-*.md; do [ -f "$f" ] && CANDIDATES+=("$(basename "$f")"); done
    SOURCE_DESC="every lithos-*.md in $AGENT_DST (includes any of your own)"
  fi
  if [ "$FORCE" -eq 0 ]; then
    echo "No valid install manifest at $MAN; refusing to guess which agents to delete."
    if [ "${#CANDIDATES[@]}" -gt 0 ]; then
      echo "Candidate files ($SOURCE_DESC) — review and remove manually:"
      for a in "${CANDIDATES[@]}"; do echo "  $AGENT_DST/$a"; done
    fi
    [ -d "$SKILL_DST" ] && echo "  $SKILL_DST  (skill directory)"
    echo "Or re-run with --force to delete exactly the files listed above."
    exit 1
  fi
  AGENTS=(${CANDIDATES[@]+"${CANDIDATES[@]}"})
  for f in "$SRC"/skill/workflows/lithos-*.js; do [ -f "$f" ] && WFS+=("$(basename "$f")"); done
fi

for a in ${AGENTS[@]+"${AGENTS[@]}"}; do
  p="$AGENT_DST/$a"
  if [ -f "$p" ]; then rm -f "$p"; echo "removed $p"; fi
done
for w in ${WFS[@]+"${WFS[@]}"}; do
  p="$CFG/workflows/$w"
  if [ -f "$p" ]; then rm -f "$p"; echo "removed $p"; fi
done
if [ -d "$SKILL_DST" ]; then rm -rf "$SKILL_DST"; echo "removed $SKILL_DST"; fi
echo "Lithos Ultra uninstalled. Backups (if any) remain in $CFG/backups/."
