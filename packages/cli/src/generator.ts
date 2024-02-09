import {
  parseSQLFile,
  prettyPrintEvents,
  queryASTToIR,
  SQLQueryAST,
  SQLQueryIR,
  TSQueryAST,
} from '@pgtyped/parser';

import { getTypes, TypeSource } from '@pgtyped/query';
import {
  ParameterTransform,
  processSQLQueryIR,
  processTSQueryAST,
} from '@pgtyped/runtime';
import { camelCase } from 'camel-case';
import { pascalCase } from 'pascal-case';
import path from 'path';
import { ParsedConfig, TransformConfig } from './config.js';
import { parseCode as parseTypescriptFile } from './parseTypescript.js';
import { TypeAllocator, TypeDefinitions, TypeScope } from './types.js';
import { IQueryTypes } from '@pgtyped/query/lib/actions.js';

export enum ProcessingMode {
  SQL = 'sql-file',
  TS = 'query-file',
}

export interface IField {
  optional?: boolean;
  fieldName: string;
  fieldType: string;
  comment?: string;
}

const interfaceGen = (modelName: string, contents: string) =>
  `class ${modelName} (BaseModel):
${contents}
\n\n`;

export function escapeComment(comment: string) {
  return comment.replace(/\*\//g, '#');
}

/** Escape a key if it isn't an identifier literal */
export function escapeKey(key: string) {
  if (/^[a-zA-Z_$][a-zA-Z_$0-9]*$/.test(key)) {
    return key;
  }
  return `"${key}"`;
}

export const generateModel = (modelName: string, fields: IField[]) => {
  const sortedFields = fields
    .slice()
    .sort((a, b) => a.fieldName.localeCompare(b.fieldName));
  const contents = sortedFields
    .map(({ fieldName, fieldType, comment, optional }) => {
      const lines = [];
      if (comment) {
        lines.push(`  # ${escapeComment(comment)} `);
      }
      
      const paramSuffix = optional ? ' = None' : '';
      const entryLine = `  ${escapeKey(fieldName)}${paramSuffix}: ${fieldType}`;
      lines.push(entryLine);
      return lines.join('\n');
    })
    .join('\n');
  return interfaceGen(modelName, contents);
};
// Converted to use Python typing modules' NewType
export const generateTypeAlias = (typeName: string, alias: string) =>
  `${typeName} = NewType('${typeName}', ${alias})\n\n`;

// TODO: Convert
type ParsedQuery =
  | {
      ast: TSQueryAST;
      mode: ProcessingMode.TS;
    }
  | {
      ast: SQLQueryAST;
      mode: ProcessingMode.SQL;
    };

// I (ChatGPT) will attempt to convert this function to Pydantic
export async function queryToPydanticDeclarations(
  parsedQuery: ParsedQuery,
  typeSource: TypeSource,
  types: TypeAllocator,
  config: ParsedConfig,
): Promise<string> {
  let queryData;
  let queryName;
  if (parsedQuery.mode === ProcessingMode.TS) {
    queryName = pascalCase(parsedQuery.ast.name);
    queryData = processTSQueryAST(parsedQuery.ast);
  } else {
    queryName = pascalCase(parsedQuery.ast.name);
    queryData = processSQLQueryIR(queryASTToIR(parsedQuery.ast));
  }

  const typeData = await typeSource(queryData);
  const modelName = pascalCase(queryName);
  const interfacePrefix = config.hungarianNotation ? 'I' : '';

  const typeError = 'errorCode' in typeData;
  const hasAnonymousColumns =
    !typeError &&
    (typeData as IQueryTypes).returnTypes.some(
      ({ returnName }) => returnName === '?column?',
    );

  if (typeError || hasAnonymousColumns) {
    // tslint:disable:no-console
    if (typeError) {
      console.error('Error in query. Details: %o', typeData);
      if (config.failOnError) {
        throw new Error(
          `Query "${queryName}" is invalid. Can't generate models.`,
        );
      }
    } else {
      console.error(
        `Query '${queryName}' is invalid. Query contains an anonymous column. Consider giving the column an explicit name.`,
      );
    }
    let explanation = '';
    if (hasAnonymousColumns) {
      explanation = `Query contains an anonymous column. Consider giving the column an explicit name.`;
    }

    const returnModel = generateTypeAlias(
      `${modelName}Result`,
      'Any',
    );
    const paramModel = generateTypeAlias(
      `${modelName}Params`,
      'Any',
    );
    const resultErrorComment = `# Query '${queryName}' is invalid, so its result is assigned type 'Any'.\n * ${explanation} */\n`;
    const paramErrorComment = `# Query '${queryName}' is invalid, so its parameters are assigned type 'Any'.\n * ${explanation} */\n`;
    return `${resultErrorComment}${returnModel}${paramErrorComment}${paramModel}`;
  }

  const { returnTypes, paramMetadata } = typeData;

  const returnFieldTypes: IField[] = [];
  const paramFieldTypes: IField[] = [];

  returnTypes.forEach(({ returnName, type, nullable, comment }) => {
    let pyTypeName = types.use(type, TypeScope.Return);

    const lastCharacter = returnName[returnName.length - 1]; // Checking for type hints
    const addNullability = lastCharacter === '?';
    const removeNullability = lastCharacter === '!';
    if (
      (addNullability || nullable || nullable == null) &&
      !removeNullability
    ) {
      pyTypeName = `Optional[${pyTypeName}]`;
    }

    if (addNullability || removeNullability) {
      returnName = returnName.slice(0, -1);
    }

    returnFieldTypes.push({
      fieldName: config.camelCaseColumnNames
        ? camelCase(returnName)
        : returnName,
      fieldType: pyTypeName,
      comment,
    });
  });

  const { params } = paramMetadata;
  for (const param of paramMetadata.mapping) {
    if (
      param.type === ParameterTransform.Scalar ||
      param.type === ParameterTransform.Spread
    ) {
      const isArray = param.type === ParameterTransform.Spread;
      const assignedIndex =
        param.assignedIndex instanceof Array
          ? param.assignedIndex[0]
          : param.assignedIndex;
      const pgTypeName = params[assignedIndex - 1];
      let pyTypeName = types.use(pgTypeName, TypeScope.Parameter);

      if (!param.required) {
        pyTypeName = `Optional[${pyTypeName}]`;
      }

      // Allow optional scalar parameters to be missing from parameters object
      // ChatGPT wants to remove optional, we shall see if it's needed
      // const optional =
      //   param.type === ParameterTransform.Scalar && !param.required;

      paramFieldTypes.push({
       //optional,
        fieldName: param.name,
        fieldType: isArray ? `List[(${pyTypeName})]` : pyTypeName,
      });
    } else {
      const isArray = param.type === ParameterTransform.PickSpread;
      let fieldType = Object.values(param.dict)
        .map((p) => {
          const paramType = types.use(
            params[p.assignedIndex - 1],
            TypeScope.Parameter,
          );
          return p.required
            ? `    ${p.name}: ${paramType}`
            : `    ${p.name}: Optional[${paramType}]`;
        })
        .join(',\n');
      fieldType = `\n${fieldType}\n  `;
      if (isArray) {
        fieldType = `List[${fieldType}]`;
      }
      paramFieldTypes.push({
        fieldName: param.name,
        fieldType,
      });
    }
  }

  // TypeAllocator errors are currently considered non-fatal since a `never`
  // type is emitted which can be caught later when compiling the generated
  // code
  // tslint:disable-next-line:no-console
  types.errors.forEach((err) => console.log(err));

  const resultModelName = `${interfacePrefix}${modelName}Result`;
  const returnTypesModel =
    `""" '${queryName}' return type """\n` +
    (returnFieldTypes.length > 0
      ? generateModel(
          `${interfacePrefix}${modelName}Result`,
          returnFieldTypes,
        )
      : generateTypeAlias(resultModelName, 'None'));

  const paramModelName = `${interfacePrefix}${modelName}Params`;
  const paramTypesModel =
    `""" '${queryName}' parameters type """\n` +
    (paramFieldTypes.length > 0
      ? generateModel(
          `${interfacePrefix}${modelName}Params`,
          paramFieldTypes,
        )
      : generateTypeAlias(paramModelName, 'None'));

  const typePairInterface =
    `""" '${queryName}' query type """\n` +
    generateModel(`${interfacePrefix}${modelName}Query`, [
      { fieldName: 'params', fieldType: paramModelName },
      { fieldName: 'result', fieldType: resultModelName },
    ]);

  return [paramTypesModel, returnTypesModel, typePairInterface].join(
    '',
  );
}





export type TSTypedQuery = {
  mode: 'ts';
  fileName: string;
  query: {
    name: string;
    ast: TSQueryAST;
    queryTypeAlias: string;
  };
  pydanticModel: string;
};

type SQLTypedQuery = {
  mode: 'sql';
  fileName: string;
  query: {
    name: string;
    ast: SQLQueryAST;
    ir: SQLQueryIR;
    paramTypeAlias: string;
    returnTypeAlias: string;
  };
  pydanticModel: string;
};

export type TypedQuery = TSTypedQuery | SQLTypedQuery;
export type TypeDeclarationSet = {
  typedQueries: TypedQuery[];
  typeDefinitions: TypeDefinitions;
  fileName: string;
};
export async function generateTypedecsFromFile(
  contents: string,
  fileName: string,
  connection: any,
  transform: TransformConfig,
  types: TypeAllocator,
  config: ParsedConfig,
): Promise<TypeDeclarationSet> {
  const typedQueries: TypedQuery[] = [];
  const interfacePrefix = ''; // Actually wtf even is Hungarian notation?
  const typeSource: TypeSource = (query) => getTypes(query, connection);

  const { queries, events } =
    transform.mode === 'sql'
      ? parseSQLFile(contents)
      : parseTypescriptFile(contents, fileName, transform);

  if (events.length > 0) {
    prettyPrintEvents(contents, events);
    if (events.find((e) => 'critical' in e)) {
      return {
        typedQueries,
        typeDefinitions: types.toTypeDefinitions(),
        fileName,
      };
    }
  }

  for (const queryAST of queries) {
    let typedQuery: TypedQuery;
    if (transform.mode === 'sql') {
      const sqlQueryAST = queryAST as SQLQueryAST;
      const result = await queryToPydanticDeclarations(
        { ast: sqlQueryAST, mode: ProcessingMode.SQL },
        typeSource,
        types,
        config,
      );
      typedQuery = {
        mode: 'sql' as const,
        query: {
          name: camelCase(sqlQueryAST.name),
          ast: sqlQueryAST,
          ir: queryASTToIR(sqlQueryAST),
          paramTypeAlias: `${interfacePrefix}${pascalCase(
            sqlQueryAST.name,
          )}Params`,
          returnTypeAlias: `${interfacePrefix}${pascalCase(
            sqlQueryAST.name,
          )}Result`,
        },
        fileName,
        // Rename this maybe
        pydanticModel: result,
      };
    } else {
      const tsQueryAST = queryAST as TSQueryAST;
      const result = await queryToPydanticDeclarations(
        {
          ast: tsQueryAST,
          mode: ProcessingMode.TS,
        },
        typeSource,
        types,
        config,
      );
      typedQuery = {
        mode: 'ts' as const,
        fileName,
        query: {
          name: tsQueryAST.name,
          ast: tsQueryAST,
          queryTypeAlias: `${interfacePrefix}${pascalCase(
            tsQueryAST.name,
          )}Query`,
        },
        pydanticModel: result,
      };
    }
    typedQueries.push(typedQuery);
  }
  return { typedQueries, typeDefinitions: types.toTypeDefinitions(), fileName };
}

export function generateDeclarations(typedQueries: TypedQuery[]): string {
  let pydanticModels = '';
  for (const typedQuery of typedQueries) {
    pydanticModels += typedQuery.pydanticModel;
    if (typedQuery.mode === 'ts') {
      continue;
    }
    const queryPP = typedQuery.query.ast.statement.body
      .split('\n')
      .map((s: string) => ' # ' + s)
      .join('\n');
    pydanticModels += `# Query generated from SQL:\n` +
      `# \`\`\`\n` +
      ` ${queryPP}\n` +
      `# \`\`\`\n`;
    pydanticModels += `class ${typedQuery.query.name}(BaseModel):\n` +
      `    params: ${typedQuery.query.paramTypeAlias}\n` +
      `    result: ${typedQuery.query.returnTypeAlias}\n\n\n`;
  }
  return pydanticModels;
}


export function generateDeclarationFile(typeDecSet: TypeDeclarationSet){
  // file paths in generated files must be stable across platforms
  // https://github.com/adelsz/pgtyped/issues/230
  const isWindowsPath = path.sep === '\\';
  // always emit POSIX paths
  const stableFilePath = isWindowsPath
    ? typeDecSet.fileName.replace(/\\/g, '/')
    : typeDecSet.fileName;

  let content = `# Pydantic models generated for queries found in "${stableFilePath}"\n`;
  content += 'from pydantic import BaseModel, Field\n';
  content += 'from typing import Optional, List\n\n';
  content += 'from typing_extensions import NewType\n\n';
  
  content += generateDeclarations(typeDecSet.typedQueries);
  
  return content;
}

export function genTypedSQLOverloadFunctions(
  functionName: string,
  typedQueries: TSTypedQuery[],
) {
  return typedQueries
    .map(
      (typeDec) =>
        `class ${functionName}(BaseModel):\n    query: Literal["${typeDec.query.ast.text}"]\n    result: ${typeDec.query.queryTypeAlias}\n`,
    )
    .filter((s) => s)
    .join('\n');
}
