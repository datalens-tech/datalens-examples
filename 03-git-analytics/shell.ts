import child from 'child_process';

type Timer = ReturnType<typeof setTimeout>;

type Params = {
    cwd?: string;
    stderr?: (chunk?: string) => void;
    stdout?: (chunk?: string) => void;
};

type Result = {
    stdout?: string;
    stderr?: string;
    code?: number;
};

const exec = (command: string, params: Params = {}, timeout?: number): Promise<Result> => {
    return new Promise((resolve, reject) => {
        let timer: Timer | null = null;

        if (timeout !== undefined) {
            timer = setTimeout(() => {
                reject(new Error(`timeout error: ${timeout}`));
            }, timeout);
        }

        const result: Result = {};

        const process = child.exec(
            command,
            {
                cwd: params.cwd,
                maxBuffer: 128 * 1024 * 1024,
            },
            (err, stdout, stderr) => {
                if (err === null) {
                    result.stdout = (stdout || '').trim();
                    result.stderr = (stderr || '').trim();
                    if (timer !== null) {
                        clearTimeout(timer);
                    }
                    resolve(result);
                    return;
                }

                if (timer !== null) {
                    clearTimeout(timer);
                }
                reject(err);
            },
        );
        if (params.stdout) {
            process.stdout?.on('data', params.stdout);
        }
        if (params.stderr) {
            process.stderr?.on('data', params.stderr);
        }
        process.on('exit', (code) => {
            result.code = code || undefined;
        });
        process.on('error', (err) => {
            if (timer !== null) {
                clearTimeout(timer);
            }
            reject(err);
        });
    });
};

export const shell = {
    exec,
};
