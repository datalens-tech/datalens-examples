## 01. Override assets, logo and styles

### Prerequisites

Docker

- [macOS](https://docs.docker.com/desktop/install/mac-install/)
- [Linux](https://docs.docker.com/engine/install/)
- [Windows](https://docs.docker.com/desktop/install/windows-install/)

Git Version Control System

- [Git](https://git-scm.com/downloads)

\* Bash compatible shell for Windows
- [Git Bash](https://git-scm.com/downloads)

### 1. Clone additional repos

- Main DataLens repo with docker-compose.yml file

`git clone git@github.com:datalens-tech/datalens.git`

- UI repo with sources of client side DataLens part

`git clone git@github.com:datalens-tech/datalens-ui.git`

### 2. Check assets for override

Folder `./patch` contains the same directory and files structure as UI project with custom overrides

### 3. Check new Dockerfile 

New `Dockerfile` contains copy of default sources from `datalens-ui` folder with replaced copies `./path` folder assets

### 4. Extend main docker-compose.yml file

All services from main compose file except `datalens-ui` were extended

Service `datalens-ui` for ui build from new `Dockerfile` with resource overriding

### 5. Build new datalens-ui container

`docker compose build datalens-ui`

### 6. Pull US and backend docker images

`docker compose pull`

### 7. Up all compose stack

`docker compose up -d`

### 8. Open DataLens

Open your custom DataLens by path: [http://localhost:8080](http://localhost:8080)
