import {
	parseSQLFile,
	prettyPrintEvents,
	queryASTToIR,
	SQLQueryAST,
	SQLQueryIR,
	TSQueryAST,
} from '@pgtyped-pydantic/parser';

import { getTypes, TypeSource } from '@pgtyped-pydantic/query';
import {
	ParameterTransform,
	processSQLQueryIR,
	processTSQueryAST,
} from '@pgtyped-pydantic/runtime';
import { camelCase } from 'camel-case';
import { pascalCase } from 'pascal-case';
import path from 'path';
import { ParsedConfig, TransformConfig } from './config.js';
import { parseCode as parseTypescriptFile } from './parseTypescript.js';
import { TypeAllocator, TypeDefinitions, TypeScope } from './types.js';
import { IQueryTypes } from '@pgtyped-pydantic/query/lib/actions.js';
import { ParseEvent, parseTSQuery } from '@pgtyped-pydantic/parser';

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

const interfaceGen = (modelName: string, docstring:string, contents: string) =>
	`    class ${modelName}(BaseModel):
        \"\"\"${docstring}\"\"\"\n
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

export const generateModel = (modelName: string, docstring: string, fields: IField[]) => {
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
			const entryLine = `        ${escapeKey(fieldName)}${paramSuffix}: ${fieldType}`;
			lines.push(entryLine);
			return lines.join('\n');
		})
		.filter(Boolean)
		.join('\n');
    let output = '';
    if (contents.trim() === '') {
        output = interfaceGen(modelName, docstring, `        pass # Looking for better ways to handle None, hmu\n`);
    } else {
        output = interfaceGen(modelName, docstring, contents);
    }
	return output;
}
// Converted to use Python typing modules' NewType
export const generateTypeAlias = (typeName: string, alias: string) => {

	return `    class ${typeName}(BaseModel):\n        pass\n`;

};

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
    //console.log(queryData);
    

	const typeData = await typeSource(queryData);
	const modelName = pascalCase(queryName);
	const interfacePrefix = '';

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
					`Query "${modelName}" is invalid. Can't generate models.`,
				);
			}
		} else {
			console.error(
				`Query '${modelName}' is invalid. Query contains an anonymous column. Consider giving the column an explicit name.`,
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
		const resultErrorComment = `# Query '${modelName}' is invalid, so its result is assigned type 'Any'.\n * ${explanation} */\n`;
		const paramErrorComment = `# Query '${modelName}' is invalid, so its parameters are assigned type 'Any'.\n * ${explanation} */\n`;
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
    const pydanticParams = [];
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
			let fieldType = pascalCase(param.name);
            
            
            fieldType = fieldType;
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

    // 
    



	let resultModelName = `${interfacePrefix}${modelName}Result`;
	const returnDocstring = `'${modelName}' return type `;
    const returnTypesModel = generateModel(resultModelName, returnDocstring, returnFieldTypes);
	
   

	let paramModelName = `${interfacePrefix}${modelName}Params`;
	let docstring = `'${modelName}' parameters type`;

    const paramTypesModel = generateModel(paramModelName, docstring, paramFieldTypes);
	

    let params_func = `    def params(self`;
    let init_msg = '';
    for (const param of paramFieldTypes) {
        params_func += `, ${param.fieldName}: ${param.fieldType}`;
        init_msg += `${param.fieldName} = ${param.fieldName}, `;
    }
    if (init_msg !== '') {
        init_msg = init_msg.slice(0, -2);
    }
    // Remove the last comma
    if (params_func[params_func.length - 1] === ',') {
        params_func = params_func.slice(0, -1);
    }
    params_func += `) -> ${modelName}Params:\n        """\n    Method to set the parameters of the SQL invocation.\n        """\n        return self.${modelName}Params(${init_msg})\n\n`;



	return [paramTypesModel, returnTypesModel, params_func].join(
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
					name: pascalCase(sqlQueryAST.name),
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
					name: pascalCase(tsQueryAST.name),
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
	let pydanticModel = '';
	for (const typedQuery of typedQueries) {
		pydanticModel = typedQuery.pydanticModel;
		if (typedQuery.mode === 'ts') {
			continue;
		}
        
        

		const pythonFilename = typedQuery.fileName.replace("_temp.sql", ".py");
		const sqlQuery = typedQuery.query.ir.statement;

		let python_class_structure = `
class ${pascalCase(typedQuery.query.name)}:
    """ 
    Class to hold all pydantic models for a single SQL query.
	Please suggest more useful class methods and properties.
	"""


${pydanticModel}

    def __init__(self):
        self.sql_string = """${sqlQuery}""" 
        self.paramType = self.${typedQuery.query.paramTypeAlias}
        self.resultType = self.${typedQuery.query.returnTypeAlias}
        self.definition_file = "${pythonFilename}" # This is the file where the class is defined
        self.definition_mode = "sql" # Only sql is supported for now
        self.query_ir = """${typedQuery.query.ir}"""
        self.query_ast = """${typedQuery.query.ast}"""


    def run(self, params: ${typedQuery.query.paramTypeAlias}, connection: psycopg.Connection) -> List[${typedQuery.query.returnTypeAlias}]:
        """ 
        Method to run the sql query.
        """
        connection.row_factory = class_row(self.${typedQuery.query.returnTypeAlias})
        rows: List[self.${typedQuery.query.returnTypeAlias}] = sql_executor(sql_query_with_placeholders=self.sql_string, parameters_in_pydantic_class=params, connection=connection)
        return rows
    


### EOF ###`;
		pydanticModels += python_class_structure;
	}
	return pydanticModels;
}

/*
	@property
	def params(self) -> ${typedQuery.query.paramTypeAlias}:
		"""
		Property for accessing the parameters of the SQL invocation.
		"""
		return ${typedQuery.query.paramTypeAlias}



	@property
	def returns(self) -> ${typedQuery.query.returnTypeAlias}:
		"""
		Propery for accessing the return type of the SQL invocation.
		"""
		return ${typedQuery.query.returnTypeAlias}

*/

export function generateDeclarationFile(typeDecSet: TypeDeclarationSet) {
	// file paths in generated files must be stable across platforms
	// https://github.com/adelsz/pgtyped/issues/230
	const isWindowsPath = path.sep === '\\';
	// always emit POSIX paths
	const stableFilePath = isWindowsPath
		? typeDecSet.fileName.replace(/\\/g, '/')
		: typeDecSet.fileName;



	const content = generateDeclarations(typeDecSet.typedQueries);

	return content;
}

// export function genTypedSQLOverloadFunctions(
//   functionName: string,
//   typedQueries: TSTypedQuery[],
// ) {
//   return typedQueries
//     .map(
//       (typeDec) =>
//         `class ${functionName}(BaseModel):\n    query: Literal["${typeDec.query.ast.text}"]\n    result: ${typeDec.query.queryTypeAlias}\n`,
//     )
//     .filter((s) => s)
//     .join('\n');
// }
