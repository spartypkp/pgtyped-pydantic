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
    let fileList = globSync(this.includePattern, {
      ...(this.transform.emitFileName && {
        ignore: [`${this.config.srcDir}${this.transform.emitFileName}`],
      }),
    });
    
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
    if (path.extname(fileName) === '.py') {
      // If "_" in file name, return
      if (fileName.includes('_')) {
        return;
      }
      // Call apply_codemod.py here
      const process = spawn('python3', ['apply_codemod.py', fileName]);
      process.stdout.on('data', (data) => {
          console.log(`stdout: ${data}`);
      });
      process.stderr.on('data', (data) => {
          console.error(`stderr: ${data}`);
      });
      process.on('close', (code) => {
          console.log(`child process exited with code ${code}`);
          return;
      });


      console.log('og fileName:', fileName)
      // Get the path of the file, excluding the file name
      
      const filePath = path.dirname(fileName);
      
      // DIRECTLY SEND STRING TO generator.ts
      const python_contents = await writeSqlQueries(fileName);
      // Remove .py from file name and add .ts
      let tfileName = fileName.slice(0, -3)+'.ts';
      const baseName = path.basename(tfileName);
      const tempFilePath = path.join(os.tmpdir(), baseName);
      console.log('tempFilePath:', tempFilePath)
      // Create the temporary file


      // Write data to the temporary file
      // Join the list of strings with newlines
      const python_contents_str = python_contents.join('\n');


      fs.writeFileSync(tempFilePath, python_contents_str);

      await this.processTsFile(tempFilePath);

      // Decfilename: original filePath + original file name + _models.py
      const decsFileName = path.resolve(filePath, `${baseName.slice(0, -3)}_models.py`);
      // Copy the temporary file to the ACTUAL directory
      fs.copyFileSync(tempFilePath, decsFileName);
      // Remove the temporary file
      fs.unlinkSync(tempFilePath);
      // Remove the sql query from the python file, so it doesn't get processed again
      
      
    }
    return this.processTsFile(fileName);
  }

  private async processTsFile(fileName: string) {
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

  public pushToQueue(job: TransformJob) {
    this.workQueue.push(
      ...job.files.map((fileName) => this.processFile(fileName)),
    );
  }
}
