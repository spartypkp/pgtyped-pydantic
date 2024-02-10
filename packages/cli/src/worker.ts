import { startup } from '@pgtyped/query';
import { AsyncQueue } from '@pgtyped/wire';
import fs from 'fs-extra';
import nun from 'nunjucks';
import path from 'path';
import worker from 'piscina';
import { ParsedConfig, TransformConfig } from './config.js';
import {
  generateDeclarationFile,
  generateTypedecsFromFile,
} from './generator.js';
import { TypeAllocator, TypeMapping, TypeScope } from './types.js';
import { removeSqlQueries } from './pythonReader.js';

// disable autoescape as it breaks windows paths
// see https://github.com/adelsz/pgtyped/issues/519 for details
nun.configure({ autoescape: false });

let connected = false;
const connection = new AsyncQueue();
const config: ParsedConfig = worker.workerData;

interface ExtendedParsedPath extends path.ParsedPath {
  dir_base: string;
}

export type IWorkerResult =
  | {
      skipped: boolean;
      typeDecsLength: number;
      relativePath: string;
    }
  | {
      error: any;
      relativePath: string;
    };

async function connectAndGetFileContents(fileName: string) {
  if (!connected) {
    await startup(config.db, connection);
    connected = true;
  }

  // last part fixes https://github.com/adelsz/pgtyped/issues/390
  return fs.readFileSync(fileName).toString().replace(/\r\n/g, '\n');
}

export async function getTypeDecs({
  fileName,
  transform,
  python_content,
}: {
  fileName: string;
  transform: TransformConfig;
  python_content?: any;
}) {
  let contents;
  console.log(`Inside getTypeDecs, fileName: ${fileName}`)
  if (python_content !== undefined) {
    
    contents = python_content[0];
  } else {
    contents = await connectAndGetFileContents(fileName);
  }
  console.log(`----Contents: ${contents}`)
  const types = new TypeAllocator(TypeMapping(config.typesOverrides));

  if (transform.mode === 'sql') {
    // Second parameter has no effect here, we could have used any value
    types.use(
      { name: 'PreparedQuery', from: '@pgtyped/runtime' },
      TypeScope.Return,
    );
  }
  return await generateTypedecsFromFile(
    contents,
    fileName,
    connection,
    transform,
    types,
    config,
  );
}

export type getTypeDecsFnResult = ReturnType<typeof getTypeDecs>;

export async function processFile({
  fileName,
  transform,
  python_content,
}: {
  fileName: string;
  transform: TransformConfig;
  python_content?: any;
}): Promise<IWorkerResult> {
  console.log(`----Processing ${fileName}`);
  const ppath = path.parse(fileName) as ExtendedParsedPath;
  console.log(`----Parsed path: ${ppath.dir_base}`)
  ppath.dir_base = path.basename(ppath.dir);
  console.log(`----Dir base: ${ppath.dir_base}`)
  let decsFileName;
  if ('emitTemplate' in transform && transform.emitTemplate) {
    decsFileName = nun.renderString(transform.emitTemplate, ppath);
  } else {
    const suffix = transform.mode === 'ts' ? 'types.ts' : 'ts';
    decsFileName = path.resolve(ppath.dir, `${ppath.name}.${suffix}`);
  }
  console.log(`----Decs file name: ${decsFileName}`)

  let typeDecSet;
  try {
    if (python_content !== undefined) {
      console.log(`---- Python case! calling getTypeDecs with python_content`)
      typeDecSet = await getTypeDecs({ fileName, transform, python_content });
    } else {
      console.log(`---- Not python case! calling getTypeDecs without python_content`)
      typeDecSet = await getTypeDecs({ fileName, transform });
    }
  } catch (e) {
    return {
      error: e,
      relativePath: path.relative(process.cwd(), fileName),
    };
  }
  const relativePath = path.relative(process.cwd(), decsFileName);
  console.log(`----Relative path: ${relativePath}`)
  if (typeDecSet.typedQueries.length > 0) {
    const declarationFileContents = await generateDeclarationFile(typeDecSet);
    const oldDeclarationFileContents = (await fs.pathExists(decsFileName))
      ? await fs.readFile(decsFileName, { encoding: 'utf-8' })
      : null;
    if (oldDeclarationFileContents !== declarationFileContents) {
      await fs.outputFile(decsFileName, declarationFileContents);
      if (python_content !== undefined) {
        // Delete the sql queries from the python file, so that it isn't processed again
        await removeSqlQueries(fileName, python_content[1], python_content[2]);
      }
      return {
        skipped: false,
        typeDecsLength: typeDecSet.typedQueries.length,
        relativePath,
      };
    }
  }
  return {
    skipped: true,
    typeDecsLength: 0,
    relativePath,
  };
}

export type processFileFnResult = ReturnType<typeof processFile>;
