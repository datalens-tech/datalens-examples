FROM ubuntu:22.04 AS base-stage

ARG NODE_MAJOR=20

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get -y upgrade && apt-get -y install ca-certificates curl gnupg

# node
RUN mkdir -p /etc/apt/keyrings
RUN curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg

RUN echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list

RUN apt-get update && apt-get -y install nginx supervisor nodejs

# remove unnecessary packages
RUN apt-get -y purge curl gnupg gnupg2 && \
  apt-get -y autoremove && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*

# timezone setting
ENV TZ="Etc/UTC"
RUN ln -sf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# user app
RUN useradd -m -u 1000 app && mkdir /opt/app && chown app:app /opt/app

# install package dependencies for production
FROM base-stage AS build-stage

# install system dependencies
RUN apt-get update && apt-get -y install g++ make

WORKDIR /opt/app

COPY datalens-ui/package.json datalens-ui/package-lock.json datalens-ui/.npmrc /opt/app/

RUN npm ci

# copy default sources
COPY datalens-ui/dist /opt/app/dist
COPY datalens-ui/src /opt/app/src
COPY datalens-ui/app-builder.config.ts datalens-ui/tsconfig.json /opt/app/

# override default sources with patch
COPY patch .

RUN npm run build && chown app /opt/app/dist/run && npm prune --production

# production running stage
FROM base-stage AS runtime-stage

# cleanup nginx defaults
RUN rm -rf /etc/nginx/sites-enabled/default

COPY datalens-ui/deploy/nginx /etc/nginx
COPY datalens-ui/deploy/supervisor /etc/supervisor/conf.d

# prepare rootless permissions for supervisor and nginx
ARG USER=app
RUN chown -R ${USER} /var/log/supervisor/ && \
  mkdir /var/run/supervisor && \
  chown -R ${USER} /var/run/supervisor && \
  mkdir -p /var/cache/nginx && chown -R ${USER} /var/cache/nginx && \
  mkdir -p /var/log/nginx  && chown -R ${USER} /var/log/nginx && \
  mkdir -p /var/lib/nginx  && chown -R ${USER} /var/lib/nginx && \
  touch /run/nginx.pid && chown -R ${USER} /run/nginx.pid 

ARG app_version
ENV APP_VERSION=$app_version
ENV TMPDIR=/tmp

WORKDIR /opt/app

COPY --from=build-stage /opt/app/package.json /opt/app/package-lock.json /opt/app/
COPY --from=build-stage /opt/app/node_modules /opt/app/node_modules
COPY --from=build-stage /opt/app/dist /opt/app/dist

RUN chown -R ${USER} /opt/app/dist/run

USER app

ENV NODE_ENV=production

ENV APP_BUILDER_CDN=false
ENV UI_CORE_CDN=false

ENV APP_MODE=full
ENV APP_ENV=production
ENV APP_INSTALLATION=opensource

EXPOSE 8080

ENTRYPOINT ["/usr/bin/supervisord", "-c", "/etc/supervisor/supervisord.conf"]
