#!/usr/bin/env bash
#
# Spak Build Script
# 构建所有 TypeScript 包，并尝试注册全局命令
#

set -e

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'
BOLD='\033[1m'
DIM='\033[2m'

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_LOG="$PROJECT_ROOT/.build.log"
SPAK_VERSION=$(node -e "console.log(require('$PROJECT_ROOT/package.json').version)")

echo ""
echo -e "  ${CYAN}◇${NC}  ${BOLD}Spak Build${NC} ${DIM}v${SPAK_VERSION}${NC}"
echo ""

# Step 1: TypeScript Compilation
# NOTE: The CLI entry (bin.js) requires lib/cli/index.js with the src/ prefix
# stripped, so we compile the root project with `tsconfig.root.json`
# (rootDir = src → outDir = lib). The default `tsconfig.json` uses rootDir = "."
# and emits into lib/src/, which breaks `require('./lib/cli/index.js')`.
echo -e "  ${CYAN}◇${NC}  Compiling TypeScript..."

if pnpm tsc --build --force > "$BUILD_LOG" 2>&1; then
  echo -e "  ${GREEN}✓${NC}  TypeScript compilation successful"
else
  echo -e "  ${RED}✗${NC}  TypeScript compilation failed"
  cat "$BUILD_LOG"
  rm -f "$BUILD_LOG"
  exit 1
fi

rm -f "$BUILD_LOG"

# Re-compile the root CLI with the correct rootDir so that bin.js can resolve
# ./lib/cli/index.js. (build.sh used to mis-target lib/src/ via tsconfig.json.)
if pnpm exec tsc --build "$PROJECT_ROOT/tsconfig.root.json" > "$BUILD_LOG" 2>&1; then
  echo -e "  ${GREEN}✓${NC}  Root CLI compiled into lib/cli/"
else
  echo -e "  ${RED}✗${NC}  Root CLI compilation failed"
  cat "$BUILD_LOG"
  rm -f "$BUILD_LOG"
  exit 1
fi
rm -f "$BUILD_LOG"

# Step 1.5: Copy project-level unified locale files (the single source of truth)
# The authoritative translations live in the repo-root /locales directory.
# We also copy them into the published lib/locales so installed packages
# can still resolve translations when cwd is outside the project.
ROOT_LOCALES_SRC="$PROJECT_ROOT/locales"
ROOT_LOCALES_DST="$PROJECT_ROOT/lib/locales"
if [ -d "$ROOT_LOCALES_SRC" ]; then
  mkdir -p "$ROOT_LOCALES_DST"
  cp "$ROOT_LOCALES_SRC"/*.yml "$ROOT_LOCALES_DST" 2>/dev/null || true
fi

# Legacy fallback: also copy root package src/locales if it still exists
# (keeps older projects working while they migrate to the unified dir).
LEGACY_LOCALES_SRC="$PROJECT_ROOT/src/locales"
if [ -d "$LEGACY_LOCALES_SRC" ]; then
  mkdir -p "$ROOT_LOCALES_DST"
  cp "$LEGACY_LOCALES_SRC"/*.yml "$ROOT_LOCALES_DST" 2>/dev/null || true
fi

# Step 2: Global binary registration
echo ""
echo -e "  ${CYAN}◇${NC}  Registering spm command..."

# spm is the primary CLI (package manager + runtime control).
# spak is now a pure runtime identity (only -v / guidance to spm).
SPM_BIN_SOURCE="$PROJECT_ROOT/packages/spm/lib/index.js"
SPAK_BIN_SOURCE="$PROJECT_ROOT/bin.js"

# Registration targets: spm is the CLI, spak stays as the runtime identity.
BIN_TARGET_SYS="/usr/local/bin/spm"
SPAK_TARGET_SYS="/usr/local/bin/spak"
BIN_TARGET_USER="$HOME/.local/bin/spm"
SPAK_TARGET_USER="$HOME/.local/bin/spak"

# Make the sources executable so a symlink (or copy) works on every platform.
chmod +x "$SPM_BIN_SOURCE"
chmod +x "$SPAK_BIN_SOURCE"

REGISTERED=""

# Clean up stale/conflicting `spak` links from previous builds or package
# managers (pnpm global, node_modules/.bin, dist). Otherwise an older broken
# link earlier in $PATH shadows the freshly-built binary.
cleanup_stale_spak() {
  local stale
  # 1) pnpm config global bin dir (e.g. ~/.local/share/pnpm/spak)
  local pnpm_bin
  pnpm_bin="$(pnpm bin -g 2>/dev/null || true)"
  if [ -n "$pnpm_bin" ]; then
    stale="$pnpm_bin/spak"
    if [ -L "$stale" ] || [ -f "$stale" ]; then
      rm -f "$stale" 2>/dev/null || true
      echo -e "  ${DIM}  Removed stale global link: ${stale}${NC}"
    fi
    stale="$pnpm_bin/spm"
    if [ -L "$stale" ] || [ -f "$stale" ]; then
      rm -f "$stale" 2>/dev/null || true
      echo -e "  ${DIM}  Removed stale global link: ${stale}${NC}"
    fi
  fi
  # 2) local node_modules/.bin/spak + spm
  for name in spak spm; do
    stale="$PROJECT_ROOT/node_modules/.bin/$name"
    if [ -L "$stale" ] || [ -f "$stale" ]; then
      rm -f "$stale" 2>/dev/null || true
      echo -e "  ${DIM}  Removed stale link: ${stale}${NC}"
    fi
  done
  # 3) previous dist fallback
  stale="$PROJECT_ROOT/dist/spak"
  if [ -f "$stale" ]; then
    rm -f "$stale" 2>/dev/null || true
    echo -e "  ${DIM}  Removed stale dist binary: ${stale}${NC}"
  fi
}

# Helper: try to link a binary into a directory, returns 0 on success.
# Usage: try_link <target> <source> <name>
try_link() {
  local target="$1"
  local source="$2"
  local name="$3"
  if [ -w "$(dirname "$target")" ]; then
    if [ -L "$target" ] || [ ! -e "$target" ]; then
      ln -sf "$source" "$target" 2>/dev/null || return 1
      echo -e "  ${GREEN}✓${NC}  Global command registered: ${DIM}${name}${NC} (${DIM}$target${NC})"
      REGISTERED="$target"
      return 0
    fi
  fi
  return 1
}

# Always try to drop copies into the project's own bin/ too.
mkdir -p "$PROJECT_ROOT/bin" 2>/dev/null || true
ln -sf "$SPM_BIN_SOURCE" "$PROJECT_ROOT/bin/spm" 2>/dev/null || true
ln -sf "$SPAK_BIN_SOURCE" "$PROJECT_ROOT/bin/spak" 2>/dev/null || true

# Check if we're in a virtual/container environment (no global writes at all)
IN_VENV=false
if [ -n "$CI" ] || [ -n "$CONTAINER" ] || [ -f "/.dockerenv" ]; then
  IN_VENV=true
fi

if [ "$IN_VENV" = true ]; then
  BUILD_OUTPUT="$PROJECT_ROOT/bin/spm"
  cp -f "$SPM_BIN_SOURCE" "$BUILD_OUTPUT" 2>/dev/null || true
  chmod +x "$BUILD_OUTPUT" 2>/dev/null || true
  BUILD_OUTPUT2="$PROJECT_ROOT/bin/spak"
  cp -f "$SPAK_BIN_SOURCE" "$BUILD_OUTPUT2" 2>/dev/null || true
  chmod +x "$BUILD_OUTPUT2" 2>/dev/null || true
  cleanup_stale_spak
  echo -e "  ${YELLOW}⚠${NC}  Virtual environment detected"
  echo -e "  ${GREEN}✓${NC}  Binaries installed to ${DIM}$PROJECT_ROOT/bin${NC}"
  echo ""
  echo -e "  ${DIM}  To use spm command, add to PATH or run:${NC}"
  echo -e "  ${DIM}  export PATH=\"\$PATH:$PROJECT_ROOT/bin\"${NC}"
else
  cleanup_stale_spak
  # Try the system bin first (most reliable global location on this host),
  # fall back to user-local bin, then finally the project bin copy.
  if try_link "$BIN_TARGET_SYS" "$SPM_BIN_SOURCE" "spm"
  then :
  elif try_link "$BIN_TARGET_USER" "$SPM_BIN_SOURCE" "spm"
  then :
  else
    BUILD_OUTPUT="$PROJECT_ROOT/bin/spm"
    cp -f "$SPM_BIN_SOURCE" "$BUILD_OUTPUT" 2>/dev/null || true
    chmod +x "$BUILD_OUTPUT" 2>/dev/null || true
    echo -e "  ${YELLOW}⚠${NC}  Neither ${DIM}$BIN_TARGET_SYS${NC} nor ${DIM}$BIN_TARGET_USER${NC} are writable"
    echo -e "  ${GREEN}✓${NC}  spm binary available at ${DIM}$BUILD_OUTPUT${NC}"
  fi
  # Register spak as a runtime identity too (same target dirs).
  if try_link "$SPAK_TARGET_SYS" "$SPAK_BIN_SOURCE" "spak"; then
    :
  elif try_link "$SPAK_TARGET_USER" "$SPAK_BIN_SOURCE" "spak"; then
    :
  fi
  # If we installed into ~/.local/bin, remind the user if it's not in PATH.
  if [ -n "$REGISTERED" ] && [ "$REGISTERED" = "$BIN_TARGET_USER" ]; then
    case ":$PATH:" in
      *":$HOME/.local/bin:"*) ;;
      *)
        echo -e "  ${YELLOW}⚠${NC}  ${DIM}\$HOME/.local/bin${NC} is not currently in your \$PATH"
        echo -e "  ${DIM}  Add this to your shell rc to use the 'spm' command globally:${NC}"
        echo -e "  ${DIM}  export PATH=\"\$HOME/.local/bin:\$PATH\"${NC}"
        ;;
    esac
  fi
fi

# Done
echo ""
echo -e "  ${GREEN}◇${NC}  ${BOLD}Build complete${NC}"
echo ""
