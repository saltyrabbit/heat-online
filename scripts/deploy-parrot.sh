#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
target=${1:-ParrotVPN}
if [[ -n "$(git status --porcelain --untracked-files=normal)" ]]; then
  printf '%s\n' 'Commit source changes before deployment.' >&2
  exit 1
fi
release_sha=$(git rev-parse HEAD)
npm run build:node
package_dir=$(mktemp -d)
trap 'rm -rf "$package_dir"' EXIT
git archive HEAD | tar -x -C "$package_dir"
cp -R dist "$package_dir/dist"
tar -czf "$package_dir/heat-online-release.tar.gz" -C "$package_dir" \
  --exclude=heat-online-release.tar.gz .
scp "$package_dir/heat-online-release.tar.gz" "$target:/home/ubuntu/heat-online-release.tar.gz"
ssh -o BatchMode=yes "$target" "tar -xOzf /home/ubuntu/heat-online-release.tar.gz ./deploy/install-parrot.sh | bash -s -- '$release_sha'"
