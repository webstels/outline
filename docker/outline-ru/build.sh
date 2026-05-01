#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME="${IMAGE_NAME:-webs464/outline-ru}"
TAG="${TAG:-latest}"
SOURCE_IMAGE="${SOURCE_IMAGE:-docker.getoutline.com/outlinewiki/outline:latest}"
PUSH=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --push)
      PUSH=1
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
    --source-image)
      SOURCE_IMAGE="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

docker build \
  --pull \
  --build-arg "OUTLINE_IMAGE=${SOURCE_IMAGE}" \
  --tag "${IMAGE_NAME}:${TAG}" \
  --file docker/outline-ru/Dockerfile \
  .

if [[ "$PUSH" == "1" ]]; then
  docker push "${IMAGE_NAME}:${TAG}"
fi

echo "Built ${IMAGE_NAME}:${TAG} from ${SOURCE_IMAGE}"
