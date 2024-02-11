import fs from 'fs';
import path from 'path';



// Absolute path to output.ts
const outputFilePath = './output.ts'; // Adjust the relative path as needed

// Example sql query syntax:
// #sql(NAME)<"""SQL QUERY""">#
export function writeSqlQueries(filePath: string): string[] {
  let fileContents = fs.readFileSync(filePath, 'utf-8');
  console.log(filePath);
  console.log(fileContents);

  // Define the regex pattern
  const pattern = /#sql\((.*?)\)<"""(.*?)""">#/gs;
  let match;
  const finalStrings = [];

  // Use the regex to match and extract the SQL queries
  while ((match = pattern.exec(fileContents)) !== null) {
      const queryName = match[1];
      let sqlQuery = match[2];

      // Replace newlines with spaces in the SQL query
      sqlQuery = sqlQuery.replace(/\n/g, ' ');

      const final_format = `const ${queryName} =sql\`\n${sqlQuery}\`;\n\n`
      finalStrings.push(final_format);

      // Replace the SQL query in the file with the string "# Processing {queryName}"
      fileContents = fileContents.replace(match[0], `# Processing ${queryName}`);
  }

  // Write the modified file contents back to the file
  fs.writeFileSync(filePath, fileContents, 'utf-8');
  return finalStrings;
}