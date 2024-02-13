result = sql(
 """SELECT * FROM books 
 WHERE id 
 is not null;
 """)
print(result)