ARG OUTLINE_IMAGE=docker.getoutline.com/outlinewiki/outline:latest

FROM ${OUTLINE_IMAGE}

WORKDIR /opt/outline

COPY --chown=nodejs:nodejs shared/i18n/locales/ru_RU/translation.json ./build/shared/i18n/locales/ru_RU/translation.json
COPY --chown=nodejs:nodejs docker/outline-ru/patch-outline-ru.js /tmp/patch-outline-ru.js

RUN node /tmp/patch-outline-ru.js && rm /tmp/patch-outline-ru.js
