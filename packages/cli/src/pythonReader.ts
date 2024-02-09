import fs from 'fs';

function writeSqlQueries(filePath: string, outputFilePath: string) {
  const fileContents = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContents.split('\n');
  
  let isInsideSql = false;
  let sqlQuery = '';
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '#sql<') {
      isInsideSql = true;
      continue;
    }

    if (lines[i].trim() === '">') {
      isInsideSql = false;
      fs.appendFileSync(outputFilePath, sqlQuery + '\n');
      sqlQuery = '';
      continue;
    }

    if (isInsideSql) {
      sqlQuery += lines[i] + '\n';
    }
  }
}

// Usage:
// writeSqlQueries('path/to/your/python/file.py', 'output.ts');