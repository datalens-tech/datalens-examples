## 03. Analyze all git repository commits and save it to SQLite or PostgreSQL

### Prerequisites

JavaScript runtime environment

- [Node.js](https://nodejs.org/en)

Git Version Control System

- [Git](https://git-scm.com/downloads)

\* Bash compatible shell for Windows
- [Git Bash](https://git-scm.com/downloads)

### 1. Install all additional packages

`npm i`

### 2. Run analyze script

`npm start`

### 3. Import data from SQLite to PostgreSQL

Install `pgloader` util

- macOS

`brew install pgloader`

- Linux

`sudo apt-get install pgloader`

Import data from SQLite to PostgreSQL

```sh
pgloader sqlite://./database.sqlite postgresql://username:password@hostname:port/databasename
```