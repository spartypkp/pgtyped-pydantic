
            import { sql } from '@pgtyped/runtime';

            // Welcome to the worst hack of all time

            const GIMMEBOOKS =sql`
SELECT * FROM books 
 WHERE id 
 is not null;
 `;

