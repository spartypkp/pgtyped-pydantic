# Pydantic models generated for queries found in "src/books/books.sql"
from pydantic import BaseModel, Field
from typing import Optional, List

from typing_extensions import NewType

""" 'FindBookById' parameters type """
class IFindBookByIdParams (BaseModel):
  id: Optional[float]


""" 'FindBookById' return type """
class IFindBookByIdResult (BaseModel):
  author_id: Optional[float]
  categories: Optional[List[category]]
  id: float
  name: Optional[str]
  rank: Optional[float]


""" 'FindBookById' query type """
class IFindBookByIdQuery (BaseModel):
  params: IFindBookByIdParams
  result: IFindBookByIdResult


# Query generated from SQL:
# ```
  # SELECT * FROM books WHERE id = :id
# ```
class findBookById(BaseModel):
    params: FindBookByIdParams
    result: FindBookByIdResult


""" 'FindAllBooks' parameters type """
IFindAllBooksParams = NewType('IFindAllBooksParams', None)

""" 'FindAllBooks' return type """
class IFindAllBooksResult (BaseModel):
  author_id: Optional[float]
  categories: Optional[List[category]]
  id: float
  name: Optional[str]
  rank: Optional[float]


""" 'FindAllBooks' query type """
class IFindAllBooksQuery (BaseModel):
  params: IFindAllBooksParams
  result: IFindAllBooksResult


# Query generated from SQL:
# ```
  # SELECT * FROM books WHERE id is not null
# ```
class findAllBooks(BaseModel):
    params: FindAllBooksParams
    result: FindAllBooksResult


