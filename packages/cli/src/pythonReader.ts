import fs from 'fs';
import path from 'path';

// Absolute path to the root directory of the project
const rootDir = path.resolve(__dirname, '../'); // Adjust the relative path as needed

// Absolute path to output.ts
const outputFilePath = path.join(rootDir, 'packages/cli/src/output.ts');

// Example sql query syntax:
// #sql(NAME)<"""SQL QUERY""">#
export function writeSqlQueries(filePath: string): string {
    const fileContents = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContents.split('\n');
    
    let isInsideSql = false;
    let sqlQuery = '';
    let queryName = "None";
    for (let i = 0; i < lines.length; i++) {
      // If the line contains the start of a sql query #sql(
      
      if (lines[i].includes('#sql(')) {
        // Find the string inbetween the parenthesis, this is the name of the query
        queryName = lines[i].split('#sql(')[1].split(')')[0];
        // Find the start of the sql query ')<"""'
        lines[i] = lines[i].split(')')[1].split('<"""')[1];
      
        isInsideSql = true;
        lines[i] = lines[i].split('#sql<"""')[1]; // Remove the tag from the line
      }
  
      if (lines[i].includes('""">#')) {
        isInsideSql = false;
        sqlQuery += lines[i].split('""">#')[0]; // Only add the part of the line before the tag

        /* const getUsersWithComments = sql`
  SELECT u.* FROM users u
  INNER JOIN book_comments bc ON u.id = bc.user_id
  GROUP BY u.id
  HAVING count(bc.id) > $minCommentCount;`;
      
        */
        const final_format = `const ${queryName} =sql\`\n${sqlQuery}\`;`
        fs.appendFileSync(outputFilePath, final_format + '\n\n');
        sqlQuery = '';
        queryName = "None";
        continue;
      }
  
      if (isInsideSql) {
        sqlQuery += lines[i] + '\n';
      }
    }
    return outputFilePath;
  }
  

// Usage:
// writeSqlQueries('path/to/your/python/file.py', 'output.ts');