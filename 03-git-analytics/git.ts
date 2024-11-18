import {shell} from './shell';

type Dir = {
    dir?: string;
};

type Repo = Dir & {
    repo: string;
    onProgress?: (phase: string, percentage: number) => void;
};

type Ref = Dir & {
    ref: string;
};

type Pull = Dir & {
    ref?: string;
    remote?: string;
};

type Log = {
    oid: string;
    commit: {
        author: {
            name: string;
            email: string;
            timestamp: number;
        };
        message: string;
    };
};

const ProgressRegExp = new RegExp(/^(remote: )?([^:]+?):[ ]+(\d+)%/);

const clone = ({dir, repo, onProgress}: Repo) => {
    const stderr = onProgress
        ? (chunk?: string) => {
              if (!chunk) return;
              const progress = ProgressRegExp.exec(chunk);
              if (progress) {
                  onProgress(progress[2].toLowerCase(), parseInt(progress[3], 10));
              }
          }
        : undefined;

    return shell.exec(`git clone --single-branch --progress git@github.com:${repo}.git ${dir}`, {
        cwd: process.cwd(),
        stderr,
    });
};

const remove = ({dir, repo}: Repo) =>
    shell.exec(`rm -rf ${dir || repo.split('/').pop()}`, {
        cwd: process.cwd(),
    });

const pull = ({dir, remote, ref}: Pull = {}) =>
    shell.exec(`git pull ${remote} ${ref}`, {
        cwd: dir || process.cwd(),
    });

const main = async ({dir}: Dir = {}): Promise<string> => {
    const r = await shell.exec(
        `git branch --remote --list 'origin/*' --format '{"branch":"%(refname:short)"}'`,
        {
            cwd: dir || process.cwd(),
        },
    );
    if (r.stdout) {
        return r.stdout
            .split('\n')
            .map((line) => JSON.parse(line))
            .filter((line) => line.branch.startsWith('origin/'))
            .pop()
            .branch.replace(/^origin\//, '');
    }
    return '';
};

const checkout = ({ref, dir}: Ref) =>
    shell.exec(`git checkout --force ${ref}`, {
        cwd: dir || process.cwd(),
    });

const log = async ({dir}: Dir): Promise<Array<Log>> => {
    const r = await shell.exec(
        `git log --reflog --pretty=format:'{"oid":"%H","commit":{"author":{"name":"%aN","email":"%aE","timestamp":%ad},"message": "%f"}}' --date=unix`,
        {
            cwd: dir || process.cwd(),
        },
    );
    if (r.stdout) {
        return r.stdout.split('\n').map((line) => JSON.parse(line.replace(/""(.+)""/g, '"$1"')));
    }
    return [];
};

const clean = ({dir}: Dir = {}) =>
    shell.exec(`git clean -fdx`, {
        cwd: dir || process.cwd(),
    });

const reset = ({dir}: Dir = {}) =>
    shell.exec(`git reset HEAD --hard`, {
        cwd: dir || process.cwd(),
    });

export const git = {
    clone,
    pull,
    checkout,
    log,
    reset,
    remove,
    clean,
    main,
};
