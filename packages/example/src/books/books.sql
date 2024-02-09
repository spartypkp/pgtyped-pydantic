/* @name FindBookById */
SELECT * FROM books WHERE id = :id;

/* @name FindAllBooks */
SELECT * FROM books WHERE id is not null;