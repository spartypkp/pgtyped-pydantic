import { ParseEvent, parseTSQuery, TSQueryAST } from '@pgtyped-pydantic/parser';


// 1. parseText from packages/parser/src/loader/typescript/query.ts

// 2. 

// Create a function that calls parseTSQuery with the given text
// and returns the result.
export function parseText(text: string, queryName: string) {
  const {query, events} = parseTSQuery(text, queryName);

  
}