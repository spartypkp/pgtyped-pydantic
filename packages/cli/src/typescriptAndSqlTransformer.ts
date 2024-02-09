import chokidar from 'chokidar';
import { globSync } from 'glob';
import path from 'path';
import { ParsedConfig, TransformConfig } from './config.js';
import { TransformJob, WorkerPool } from './index.js';
import { debug } from './util.js';
import { processFileFnResult } from './worker.js';
import { writeSqlQueries } from './pythonReader.js';
import { write } from 'fs';
import { TypeAllocator, TypeMapping, TypeScope } from './types.js';
import worker from 'piscina';
import { AsyncQueue } from '@pgtyped/wire';
import {
  generateDeclarationFile,
  generateTypedecsFromFile,
} from './generator.js';
// tslint:disable:no-console

export class TypescriptAndSqlTransformer {
  public readonly workQueue: Promise<unknown>[] = [];
  private readonly includePattern: string;
  private fileOverrideUsed = false;

  constructor(
    private readonly pool: WorkerPool,
    private readonly config: ParsedConfig,
    private readonly transform: TransformConfig,
  ) {
    this.includePattern = `${this.config.srcDir}/**/${transform.include}`;
  }

  private async watch() {
    const cb = async (fileName: string) => {
      // we will not push it to the queue to not consume more memory
      return this.processFile(fileName);
    };

    chokidar
      .watch(this.includePattern, {
        persistent: true,
      })
      .on('add', cb)
      .on('change', cb);
  }

  public async start(watch: boolean, fileOverride?: string) {
    if (watch) {
      return this.watch();
    }

    /**
     * If the user didn't provide the -f paramter, we're using the list of files we got from glob.
     * If he did, we're using glob file list to detect if his provided file should be used with this transform.
     */
    let fileList = globSync(this.includePattern, {
      ...(this.transform.emitFileName && {
        ignore: [`${this.config.srcDir}${this.transform.emitFileName}`],
      }),
    });
    if (fileOverride) {
      fileList = fileList.includes(fileOverride) ? [fileOverride] : [];
      if (fileList.length > 0) {
        this.fileOverrideUsed = true;
      }
    }
    debug('found query files %o', fileList);

    this.pushToQueue({
      files: fileList,
    });

    await Promise.all(this.workQueue);
    return this.fileOverrideUsed;
  }

  

  private async processFile(fileName: string) {
    fileName = path.relative(process.cwd(), fileName);
    console.log(`Processing ${fileName}`);
    if (path.extname(fileName) === '.py') {
      // If "_" in file name, return
      if (fileName.includes('_')) {
        return;
      }
      // DIRECTLY SEND STRING TO generator.ts
      const [python_contents, lineNumber, lineIndex] = await writeSqlQueries(fileName);
      // Tracked variables:
      // Filepath - in this fn
      // Transform - this.transform
      // Explain current process first
      // 1. Send filePath of temporary ts file to processTsFile
      // 2. processTsFile will send the file to worker.ts
      // 3. worker.ts will call getTypeDecs
      // 4. 
      return this.processTsFile(fileName, [python_contents, lineNumber, lineIndex]);
      
    }
    return this.processTsFile(fileName);
  }

  private async processTsFile(fileName: string, python_content?: any) {
    const result = (await this.pool.run(
      {
        fileName,
        transform: this.transform,
        python_content,
      },
      'processFile',
    )) as Awaited<processFileFnResult>;
  
    if ('skipped' in result && result.skipped) {
      console.log(`Skipped ${fileName}: no changes or no queries detected`);
    } else if ('error' in result) {
      console.error(
        `Error processing ${fileName}: ${result.error.message}\n${result.error.stack}`,
      );
    } else {
      console.log(
        `Saved ${result.typeDecsLength} query types from ${fileName} to ${result.relativePath}`,
      );
    }
  }

  public pushToQueue(job: TransformJob) {
    this.workQueue.push(
      ...job.files.map((fileName) => this.processFile(fileName)),
    );
  }
}
