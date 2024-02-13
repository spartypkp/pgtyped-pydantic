import chokidar from 'chokidar';
import { globSync } from 'glob';
import path from 'path';
import { ParsedConfig, TransformConfig } from './config.js';
import { TransformJob, WorkerPool } from './index.js';
import { debug } from './util.js';
import { processFileFnResult } from './worker.js';
import { writeSqlQueries} from './pythonReader.js';
import { write } from 'fs';
import { TypeAllocator, TypeMapping, TypeScope } from './types.js';
import worker from 'piscina';
import { AsyncQueue } from '@pgtyped/wire';
import {
  generateDeclarationFile,
  generateTypedecsFromFile,
} from './generator.js';
import fs from 'fs';

import os from 'os';
import { remove } from 'fs-extra';
import { spawn } from 'child_process';

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
    console.log('Inside transformer.start(). fileOverride:', fileOverride)

    /**
     * If the user didn't provide the -f paramter, we're using the list of files we got from glob.
     * If he did, we're using glob file list to detect if his provided file should be used with this transform.
     */
    console.log(this.includePattern)
    console.log(this.transform.emitFileName)

    let fileList = globSync(this.includePattern, {
      ...(this.transform.emitFileName && {
        ignore: [`${this.config.srcDir}${this.transform.emitFileName}`],
      }),
    });
    console.log('fileList:', fileList)
    
    if (fileOverride) {
      fileList = fileList.includes(fileOverride) ? [fileOverride] : [];
      console.log('fileList:', fileList)
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
    const result = (await this.pool.run(
      {
        fileName,
        transform: this.transform,
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

  // private async processFile(fileName: string) {
  //   fileName = path.relative(process.cwd(), fileName);
    
  //   if (path.extname(fileName) === '.py') {
  //     // If "_" in file name, return
  //     if (fileName.includes('_codemod')) {
  //       return;
  //     }
  //     if (fileName.includes('_models')) {
  //       return;
  //     }
  //     if (fileName.includes('_processed')) {
  //       return;
  //     }
  //     console.log("Processing python file with apply_codemod.py", fileName)

  //     // Call apply_codemod.py here
  //     const process = spawn('python3', ['./src/apply_codemod.py', fileName]);
  //     process.stdout.on('data', (data) => {
  //         console.log(`stdout: ${data}`);
  //     });
  //     process.stderr.on('data', (data) => {
  //         console.error(`stderr: ${data}`);
  //     });
  //     process.on('close', (code) => {
  //         console.log(`child process exited with code ${code}`);
  //         return;
  //     });
  //     return;
      
      
  //   }
  //   console.log(`Processing ${fileName}`);
  //   return this.processTsFile(fileName);
  // }

  // private async processTsFile(fileName: string) {
  //   console.log("Inside processTsFile()")
  //   const result = (await this.pool.run(
  //     {
  //       fileName,
  //       transform: this.transform,
  //     },
  //     'processFile',
  //   )) as Awaited<processFileFnResult>;
  
  //   if ('skipped' in result && result.skipped) {
  //     console.log(`Skipped ${fileName}: no changes or no queries detected`);
  //   } else if ('error' in result) {
  //     console.error(
  //       `Error processing ${fileName}: ${result.error.message}\n${result.error.stack}`,
  //     );
  //   } else {
  //     console.log(
  //       `Saved ${result.typeDecsLength} query types from ${fileName} to ${result.relativePath}`,
  //     );
  //   }
  // }

  public pushToQueue(job: TransformJob) {
    this.workQueue.push(
      ...job.files.map((fileName) => this.processFile(fileName)),
    );
  }
}
