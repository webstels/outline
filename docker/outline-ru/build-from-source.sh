#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME="${IMAGE_NAME:-webs464/outline-ru}"
TAG="${TAG:-latest}"
BASE_IMAGE="${BASE_IMAGE:-${IMAGE_NAME}-base}"
BASE_TAG="${BASE_TAG:-${TAG}}"
PUSH=0
PUSH_BASE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --help)
      cat <<'EOF'
Usage: docker/outline-ru/build-from-source.sh [options]

Builds webs464/outline-ru from the current source tree, verifies Russian AI
localization and AI document chat assets, and optionally pushes the image.

Options:
  --push                  Push the final image.
  --push-base             Push the intermediate base image.
  --image <name>          Final image name. Default: webs464/outline-ru.
  --tag <tag>             Final image tag. Default: latest.
  --base-image <name>     Base image name. Default: <image>-base.
  --base-tag <tag>        Base image tag. Default: <tag>.
  --help                  Show this help.
EOF
      exit 0
      ;;
    --push)
      PUSH=1
      shift
      ;;
    --push-base)
      PUSH_BASE=1
      shift
      ;;
    --image)
      IMAGE_NAME="$2"
      shift 2
      ;;
    --tag)
      TAG="$2"
      shift 2
      ;;
    --base-image)
      BASE_IMAGE="$2"
      shift 2
      ;;
    --base-tag)
      BASE_TAG="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

docker build \
  --file Dockerfile.base \
  --tag "${BASE_IMAGE}:${BASE_TAG}" \
  .

docker build \
  --file Dockerfile \
  --build-arg "BASE_IMAGE=${BASE_IMAGE}:${BASE_TAG}" \
  --tag "${IMAGE_NAME}:${TAG}" \
  .

docker run --rm --entrypoint node "${IMAGE_NAME}:${TAG}" -e "
const fs = require('fs');
const ru = JSON.parse(fs.readFileSync('/opt/outline/build/shared/i18n/locales/ru_RU/translation.json', 'utf8'));
const api = fs.readFileSync('/opt/outline/build/server/routes/api/documents/documents.js', 'utf8');
const assets = fs.readdirSync('/opt/outline/build/app/assets').filter((file) => file.includes('AIChat'));

if (ru['AI chat'] !== 'Чат с ИИ') {
  throw new Error('Russian AI translation is missing');
}
if (!api.includes('documents.ask')) {
  throw new Error('documents.ask endpoint is missing');
}
if (!assets.length) {
  throw new Error('AIChat frontend asset is missing');
}

console.log('Image verification passed');
"

if [[ "$PUSH_BASE" == "1" ]]; then
  docker push "${BASE_IMAGE}:${BASE_TAG}"
fi

if [[ "$PUSH" == "1" ]]; then
  docker push "${IMAGE_NAME}:${TAG}"
fi

echo "Built ${IMAGE_NAME}:${TAG} from source using ${BASE_IMAGE}:${BASE_TAG}"
