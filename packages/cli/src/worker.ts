import { startup } from '@pgtyped-pydantic/query';
import { AsyncQueue } from '@pgtyped-pydantic/wire';
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
      declarationFileContents?: string;
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
}: {
  fileName: string;
  transform: TransformConfig;
}) {
  let contents;
  
  
  contents = await connectAndGetFileContents(fileName);
  const types = new TypeAllocator(TypeMapping(config.typesOverrides));

  if (transform.mode === 'sql') {
    // Second parameter has no effect here, we could have used any value
    types.use(
      { name: 'PreparedQuery', from: '@pgtyped-pydantic/runtime' },
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
 
}: {
  fileName: string;
  transform: TransformConfig;
  
}): Promise<IWorkerResult> {
  
  const ppath = path.parse(fileName) as ExtendedParsedPath;
  ppath.dir_base = path.basename(ppath.dir);

  let decsFileName;
  if ('emitTemplate' in transform && transform.emitTemplate) {
    decsFileName = nun.renderString(transform.emitTemplate, ppath);
  } else {
    const suffix = transform.mode === 'ts' ? 'types.ts' : 'ts';
    decsFileName = path.resolve(ppath.dir, `${ppath.name}.${suffix}`);
  }

  let typeDecSet;
  try {
    typeDecSet = await getTypeDecs({ fileName, transform });
    //console.log("Finished getTypeDecs")
  } catch (e) {
    //console.log("Error in getTypeDecs")
    return {
      error: e,
      relativePath: path.relative(process.cwd(), fileName),
    };
  }
  const relativePath = decsFileName;
  if (typeDecSet.typedQueries.length > 0) {
    //console.log("Checking if oldDeclarationFileContents !== declarationFileContents")
    const declarationFileContents = await generateDeclarationFile(typeDecSet);
    console.log("declarationFileContents in worker.ts:", declarationFileContents)
    
    //console.log(declarationFileContents)
    // Get the declaration filename without suffix, and add _models.py
    // const decsFileNamePython = decsFileName.replace(/.ts$/, '_models.py'); 
    // const oldDeclarationFileContents = (await fs.pathExists(decsFileNamePython))
    //   ? await fs.readFile(decsFileNamePython, { encoding: 'utf-8' })
    //   : null;
    //console.log("Old declaration file contents:", oldDeclarationFileContents)
    //console.log("Old functionality: write to file. New fucntionality: return the file contents")
    
      
    return {
      skipped: false,
      typeDecsLength: typeDecSet.typedQueries.length,
      relativePath,
      declarationFileContents,
    };
    

  }
  return {
    skipped: true,
    typeDecsLength: 0,
    relativePath
  };
}

export type processFileFnResult = ReturnType<typeof processFile>;
