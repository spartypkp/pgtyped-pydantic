# Pydantic models generated for queries found in "src/books/books.sql"
from pydantic import BaseModel, Field
from typing import Optional, List

from typing_extensions import NewType

""" 'FindBookById' parameters type """
class FindBookByIdParams (BaseModel):
  id: Optional[float]


""" 'FindBookById' return type """
class FindBookByIdResult (BaseModel):
  author_id: Optional[float]
  categories: Optional[List[category]]
  id: float
  name: Optional[str]
  rank: Optional[float]


""" 'FindBookById' query type """
class FindBookByIdQuery (BaseModel):
  params: FindBookByIdParams
  result: FindBookByIdResult


# Query generated from SQL:
# ```
  # SELECT * FROM books WHERE id = :id
# ```
class findBookById(BaseModel):
    params: FindBookByIdParams
    result: FindBookByIdResult


""" 'FindAllBooks' parameters type """
FindAllBooksParams = NewType('FindAllBooksParams', None)

""" 'FindAllBooks' return type """
class FindAllBooksResult (BaseModel):
  author_id: Optional[float]
  categories: Optional[List[category]]
  id: float
  name: Optional[str]
  rank: Optional[float]


""" 'FindAllBooks' query type """
class FindAllBooksQuery (BaseModel):
  params: FindAllBooksParams
  result: FindAllBooksResult


# Query generated from SQL:
# ```
  # SELECT * FROM books WHERE id is not null
# ```
class findAllBooks(BaseModel):
    params: FindAllBooksParams
    result: FindAllBooksResult


