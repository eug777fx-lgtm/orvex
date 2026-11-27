#!/usr/bin/env bash
# Lithos Ultra installer — installs the skill + specialist agents at user (global) scope.
# Usage: ./install.sh            install / update
#        ./install.sh --check    verify an existing install, change nothing
# Honours CLAUDE_CONFIG_DIR (default: $HOME/.claude).
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
MODE="install"
case "${1:-}" in
  "") ;;
  --check) MODE="check" ;;
  *) echo "usage: $0 [--check]" >&2; exit 2 ;;
esac

RAW_CFG="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
# Reject config dirs the hooks could never run from.
validate_cfg() {
  case "$1" in
    *$'\n'*|*$'\r'*) echo "config dir must not contain newlines: $1" >&2; exit 1 ;;
    *\\*) echo "config dir must not contain '\\' (Node.js refuses to load ES modules from such paths, so the hooks could never run): $1" >&2; exit 1 ;;
  esac
}
validate_cfg "$RAW_CFG"

# Canonical absolute path of a directory (resolves symlinks and relative paths).
canon() { (cd "$1" && pwd -P); }

if [ "$MODE" = "install" ]; then mkdir -p "$RAW_CFG"; fi
if [ -d "$RAW_CFG" ]; then CFG="$(canon "$RAW_CFG")"; else CFG="$RAW_CFG"; fi
validate_cfg "$CFG"

# The default config dir, canonicalised the same way, so a symlinked ~/.claude is not
# mistaken for a custom location.
if [ -d "$HOME/.claude" ]; then DEFAULT_CFG="$(canon "$HOME/.claude")"; else DEFAULT_CFG="$HOME/.claude"; fi

SKILL_DST="$CFG/skills/lithos-ultra"
AGENT_DST="$CFG/agents"
WF_DST="$CFG/workflows"
MAN_HEADER="# lithos-ultra install manifest v2"
VERSION="$(cat "$SRC/VERSION")"

command -v node >/dev/null || { echo "Node.js >= 18 is required (mission control + guard hooks)"; exit 1; }
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 18 ] || { echo "Node.js >= 18 required, found $(node -v)"; exit 1; }

# Agent basenames shipped by this package (the only agent files we ever touch).
PKG_AGENTS=()
for f in "$SRC"/agents/lithos-*.md; do
  [ -f "$f" ] && PKG_AGENTS+=("$(basename "$f")")
done
[ "${#PKG_AGENTS[@]}" -gt 0 ] || { echo "no agents found in $SRC/agents" >&2; exit 1; }

# Prints agent basenames recorded in a v2 manifest (nothing for legacy/missing manifests).
manifest_agents() {
  local man="$1" first line
  [ -f "$man" ] || return 0
  IFS= read -r first < "$man" || return 0
  [ "$first" = "$MAN_HEADER" ] || return 0
  while IFS= read -r line; do
    case "$line" in
      "agent "*)
        line="${line#agent }"
        case "$line" in */*|..*) continue ;; lithos-*.md) printf '%s\n' "$line" ;; esac ;;
    esac
  done < "$man"
}

check() {
  local ok=1 n=0 missing=0 a s
  if [ -f "$SKILL_DST/SKILL.md" ]; then echo "✓ skill: $SKILL_DST/SKILL.md"; else echo "✗ skill missing: $SKILL_DST/SKILL.md"; ok=0; fi
  for a in "${PKG_AGENTS[@]}"; do
    if [ -f "$AGENT_DST/$a" ]; then n=$((n + 1)); else echo "✗ agent missing: $AGENT_DST/$a"; missing=$((missing + 1)); fi
  done
  if [ "$missing" -eq 0 ]; then
    echo "✓ agents: $n/${#PKG_AGENTS[@]} in $AGENT_DST"
  else
    echo "✗ agents: $n/${#PKG_AGENTS[@]} in $AGENT_DST ($missing missing)"; ok=0
  fi
  for s in mc.mjs guard.mjs; do
    if [ ! -f "$SKILL_DST/scripts/$s" ]; then
      echo "✗ script missing: $SKILL_DST/scripts/$s"; ok=0
    elif node --check "$SKILL_DST/scripts/$s" 2>/dev/null; then
      echo "✓ script parses: $s"
    else
      echo "✗ script does not parse: $SKILL_DST/scripts/$s"; ok=0
    fi
  done
  for w in "$SRC"/skill/workflows/lithos-*.js; do
    w="$(basename "$w")"
    if [ -f "$CFG/workflows/$w" ]; then echo "✓ saved workflow: $w"; else echo "✗ saved workflow missing: $CFG/workflows/$w"; ok=0; fi
  done
  if [ -f "$SKILL_DST/VERSION" ]; then echo "✓ version $(cat "$SKILL_DST/VERSION")"; else echo "✗ VERSION file missing"; ok=0; fi
  if [ -f "$SKILL_DST/.install-manifest" ] && [ -n "$(manifest_agents "$SKILL_DST/.install-manifest")" ]; then
    echo "✓ manifest: $SKILL_DST/.install-manifest"
  else
    echo "✗ manifest missing or legacy format (re-run ./install.sh)"; ok=0
  fi
  if [ "$ok" -eq 1 ]; then echo "check passed"; return 0; fi
  echo "check FAILED"; return 1
}

if [ "$MODE" = "check" ]; then
  if check; then exit 0; else exit 1; fi
fi

mkdir -p "$CFG/skills" "$AGENT_DST"

# Agent files belonging to the package: the current list plus anything a previous v2
# install recorded (covers agents renamed/removed between versions). Never a bare glob.
OLD_AGENTS=()
while IFS= read -r a; do [ -n "$a" ] && OLD_AGENTS+=("$a"); done \
  < <({ manifest_agents "$SKILL_DST/.install-manifest"; printf '%s\n' "${PKG_AGENTS[@]}"; } | sort -u)

EXISTING=()
for a in "${OLD_AGENTS[@]}"; do [ -f "$AGENT_DST/$a" ] && EXISTING+=("$a"); done

# Back up a previous install (skill dir + this package's agents) before replacing it.
if [ -d "$SKILL_DST" ] || [ "${#EXISTING[@]}" -gt 0 ]; then
  BK="$CFG/backups/lithos-ultra-$(date +%Y%m%d-%H%M%S)"
  [ -e "$BK" ] && BK="$BK-$$"
  mkdir -p "$BK/agents"
  if [ -d "$SKILL_DST" ]; then cp -R "$SKILL_DST" "$BK/skill"; fi
  for a in ${EXISTING[@]+"${EXISTING[@]}"}; do cp "$AGENT_DST/$a" "$BK/agents/"; done
  echo "backed up previous install to $BK"
  rm -rf "$SKILL_DST"
  for a in ${EXISTING[@]+"${EXISTING[@]}"}; do rm -f "$AGENT_DST/$a"; done
fi

cp -R "$SRC/skill" "$SKILL_DST"
cp "$SRC/VERSION" "$SKILL_DST/VERSION"
for a in "${PKG_AGENTS[@]}"; do cp "$SRC/agents/$a" "$AGENT_DST/$a"; done
# Saved user workflows: lets the skill call Workflow({name: "lithos-execute"}) instead of
# pasting the template inline. Only lithos-*.js files shipped by this package are written.
mkdir -p "$WF_DST"
PKG_WFS=()
for f in "$SRC"/skill/workflows/lithos-*.js; do b="$(basename "$f")"; PKG_WFS+=("$b"); cp "$f" "$WF_DST/$b"; done
chmod +x "$SKILL_DST"/scripts/*.mjs

# Hook commands reference $HOME/.claude and prose references ~/.claude/; rewrite both
# when a custom CLAUDE_CONFIG_DIR is used. Literal string replacement in node (no sed),
# so '&', '\', '#' and other metacharacters in the path are safe. Inside hook commands
# the path sits in a shell double-quoted string inside a YAML single-quoted scalar, so
# it is escaped for both contexts.
if [ "$CFG" != "$DEFAULT_CFG" ]; then
  REWRITE_FILES=("$SKILL_DST/SKILL.md" "$SKILL_DST"/reference/*.md "$SKILL_DST"/policies/*.md)
  for a in "${PKG_AGENTS[@]}"; do REWRITE_FILES+=("$AGENT_DST/$a"); done
  node -e '
    const fs = require("fs");
    const [cfg, ...files] = process.argv.slice(1);
    const shellDq = cfg.replace(/[\\$"`]/g, (c) => "\\" + c);
    const hookPath = shellDq.split("\x27").join("\x27\x27");
    for (const f of files) {
      const before = fs.readFileSync(f, "utf8");
      const after = before
        .split("$HOME/.claude").join(hookPath)
        .split("~/.claude/").join(cfg + "/");
      if (after !== before) fs.writeFileSync(f, after);
    }
  ' "$CFG" "${REWRITE_FILES[@]}"
  echo "rewrote config paths to $CFG"
fi

# Manifest for clean uninstall: lists only files this package installed.
{
  echo "$MAN_HEADER"
  echo "skill $SKILL_DST"
  for a in "${PKG_AGENTS[@]}"; do echo "agent $a"; done
  for w in "${PKG_WFS[@]}"; do echo "workflow $w"; done
} > "$SKILL_DST/.install-manifest"

echo "installed Lithos Ultra $VERSION"
check
echo
echo "Restart Claude Code (or run /reload-skills) and type: /lithos-ultra"
