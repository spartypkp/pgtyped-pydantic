import fs from 'fs';
import path from 'path';



// Absolute path to output.ts
const outputFilePath = './output.ts'; // Adjust the relative path as needed

// Example sql query syntax:
// #sql(NAME)<"""SQL QUERY""">#
export function writeSqlQueries(filePath: string): string {
    const fileContents = fs.readFileSync(filePath, 'utf-8');
    console.log(filePath);
    console.log(fileContents);
    
    const lines = fileContents.split('\n');
    
    let isInsideSql = false;
    let sqlQuery = '';
    let queryName = "None";
    for (let i = 0; i < lines.length; i++) {
      // If the line contains the start of a sql query #sql(
      console.log('index:', i)
      console.log(lines[i])
      if (lines[i].includes('#sql(')) {
        // Example line: '  #sql(getUsersWithComments)<"""SQL QUERY""">#'
        // First, extract the query name
        const queryNameStart = lines[i].indexOf('#sql(') + 5;
        const queryNameEnd = lines[i].indexOf(')', queryNameStart);
        queryName = lines[i].substring(queryNameStart, queryNameEnd);
        console.log('queryName:', queryName);
        isInsideSql = true;
        // Next, extract the sql query
        const sqlQueryStart = lines[i].indexOf('"""') + 3;
        // Find the end of the sql query
        const sqlQueryEnd = lines[i].indexOf('""">#', sqlQueryStart);
        sqlQuery += lines[i].substring(sqlQueryStart, sqlQueryEnd) + '\n';
        console.log('sqlQuery:', sqlQuery);
        
        
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