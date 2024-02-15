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
import { AsyncQueue } from '@pgtyped-pydantic/wire';
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
  public declarationFileContents: string = "";

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
    //console.log('Inside transformer.start(). fileOverride:', fileOverride)

    /**
     * If the user didn't provide the -f paramter, we're using the list of files we got from glob.
     * If he did, we're using glob file list to detect if his provided file should be used with this transform.
     */
    

    let fileList = globSync(this.includePattern, {
      ...(this.transform.emitFileName && {
        ignore: [`${this.config.srcDir}${this.transform.emitFileName}`],
      }),
    });
    //console.log('fileList:', fileList)
    
    if (fileOverride) {
      fileList = fileList.includes(fileOverride) ? [fileOverride] : [];
      //console.log('fileList:', fileList)
      if (fileList.length > 0) {
        this.fileOverrideUsed = true;
      }
    }
    debug('found query files %o', fileList);

    this.pushToQueue({
      files: fileList,
    });
    
    await Promise.all(this.workQueue);
    //console.log('workQueue done')
    return this.fileOverrideUsed
  }

  private async processFile(fileName: string) {
    fileName = path.relative(process.cwd(), fileName);
    // If "_sql" not in file name, return
    //console.log(`Processing ${fileName}`);
    if (!fileName.includes('_test_')) {
      return;
    }
    //console.log("Got past the guardian of terrible hacks!")
    
    const result = (await this.pool.run(
      {
        fileName,
        transform: this.transform,
      },
      'processFile',
    )) as Awaited<processFileFnResult>;
    //console.log("result:", result)
    if ('skipped' in result && result.skipped) {
      console.log(`Skipped ${fileName}: no changes or no queries detected`);
    } else if ('error' in result) {
      console.error(
        `Error processing ${fileName}: ${result.error.message}\n${result.error.stack}`,
      );
    } else {
      //console.log(`Saved ${result.typeDecsLength} query types from ${fileName} to ${result.relativePath}`,);
      this.declarationFileContents = result.declarationFileContents;
    }
  }

  

  public pushToQueue(job: TransformJob) {
    this.workQueue.push(
      ...job.files.map((fileName) => this.processFile(fileName)),
    );
  }
}
