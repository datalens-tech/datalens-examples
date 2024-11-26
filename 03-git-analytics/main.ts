/* eslint-disable no-console */
import fs from 'node:fs';
import path from 'node:path';

import cliProgress from 'cli-progress';
import {open as sqlite} from 'sqlite';
import sqlite3 from 'sqlite3';

import {ext} from './ext';
import {git} from './git';

const REPOSITORIES = [
    'https://github.com/ydb-platform/ydb',

    'https://github.com/datalens-tech/datalens',
    'https://github.com/datalens-tech/datalens-ui',
    'https://github.com/datalens-tech/datalens-us',
    'https://github.com/datalens-tech/datalens-backend',

    'https://github.com/gravity-ui/app-builder',
    'https://github.com/gravity-ui/app-layout',
    'https://github.com/gravity-ui/charts',
    'https://github.com/gravity-ui/components',
    'https://github.com/gravity-ui/dynamic-forms',
    'https://github.com/gravity-ui/expresskit',
    'https://github.com/gravity-ui/gateway',
    'https://github.com/gravity-ui/markdown-editor',
    'https://github.com/gravity-ui/navigation',
    'https://github.com/gravity-ui/nodekit',
    'https://github.com/gravity-ui/page-constructor',
    'https://github.com/gravity-ui/postgreskit',
    'https://github.com/gravity-ui/uikit',
    'https://github.com/gravity-ui/yagr',

    'https://github.com/divkit/divkit',

    'https://github.com/diplodoc-platform/cli',
    'https://github.com/diplodoc-platform/client',
    'https://github.com/diplodoc-platform/components',
    'https://github.com/diplodoc-platform/diplodoc',
    'https://github.com/diplodoc-platform/transform',

    'https://github.com/userver-framework/userver',

    'https://github.com/emmetio/emmet',

    'https://github.com/google/zx',

    'https://github.com/catboost/catboost',

    'https://github.com/yandex/yafsdp',
];

type PrepareType = {
    root: string;
    db: Awaited<ReturnType<typeof sqlite>>;
    bar: cliProgress.SingleBar & {format: (fmt: string) => void};
};

const prepare = async (): Promise<PrepareType> => {
    const db = await sqlite({
        filename: './database.sqlite',
        driver: sqlite3.Database,
    });
    await db.exec(
        'CREATE TABLE IF NOT EXISTS commits (hash VARCHAR(32) PRIMARY KEY, repo VARCHAR(128), message TEXT, name VARCHAR(128), email VARCHAR(128), timestamp INTEGER, files TEXT)',
    );
    await db.exec('CREATE INDEX IF NOT EXISTS index_repo ON commits(repo)');
    await db.exec('CREATE INDEX IF NOT EXISTS index_email ON commits(email)');
    await db.exec('CREATE INDEX IF NOT EXISTS index_timestamp ON commits(timestamp)');

    const root = './repo';

    if (!fs.existsSync(root)) {
        fs.mkdirSync(root);
    }

    const cliBar = new cliProgress.SingleBar(cliProgress.Presets.shades_classic);
    // @ts-ignore
    cliBar.format = (fmt: string) => {
        // @ts-ignore
        // eslint-disable-next-line no-param-reassign
        cliBar.options.format = fmt;
    };
    const bar = cliBar as PrepareType['bar'];

    return {root, db, bar};
};

type CloneParams = {
    root: string;
    repo: string;
    bar: PrepareType['bar'];
};

const clone = async ({root, repo, bar}: CloneParams) => {
    const dir = path.join(root, repo.replace(/\//g, '-'));

    console.log('repo:', repo);
    bar.start(100, 0);

    const onProgress = (phase: string, percentage: number) => {
        bar.update(percentage);
        bar.format(`  ${phase} | {bar} | {percentage}% | {eta_formatted} `);
    };

    if (!fs.existsSync(dir)) {
        await git.clone({
            dir,
            repo,
            onProgress,
        });
    }
    const ref = await git.main({dir});
    await git.checkout({dir, ref});
    await git.pull({dir, remote: 'origin', ref});

    return {dir};
};

type AnalyzeParams = {
    repo: string;
    dir: string;
    commit: Awaited<ReturnType<typeof git.log>>[0];
    db: PrepareType['db'];
};

const analyze = async ({repo, dir, commit, db}: AnalyzeParams) => {
    const hash = commit.oid;

    const commitLine = await db.get('SELECT hash FROM commits WHERE hash = :hash', {
        ':hash': hash,
    });
    if (commitLine) {
        return;
    }

    await git.checkout({dir, ref: commit.oid});
    await git.clean({dir});

    await db.run(
        'INSERT INTO commits(hash, repo, message, name, email, timestamp, files) VALUES (:hash, :repo, :message, :name, :email, :timestamp, :files)',
        {
            ':hash': hash,
            ':repo': repo,
            ':message': commit.commit.message.split('\n').shift(),
            ':name': commit.commit.author.name,
            ':email': commit.commit.author.email,
            ':timestamp': commit.commit.author.timestamp,
            ':files': JSON.stringify(await ext(dir)),
        },
    );
};

const main = async () => {
    const {db, root, bar} = await prepare();

    for (let r = 0; r < REPOSITORIES.length; r += 1) {
        bar.format('  init | {bar} | {percentage}% | {eta_formatted} ');

        const repo = REPOSITORIES[r].replace('https://github.com/', '');

        const {dir} = await clone({root, repo, bar});

        const commits = (await git.log({dir})).sort(
            (a, b) => a.commit.author.timestamp - b.commit.author.timestamp,
        );

        // @ts-ignore
        bar.options.format = '  analyze | {bar} | {percentage}% | {eta_formatted} ';
        bar.start(commits.length - 1, 0);

        for (let i = 0; i < commits.length; i++) {
            await analyze({repo, dir, commit: commits[i], db});

            bar.update(i);
        }
        bar.stop();
    }
};

main();
