# Pydantic models generated for queries found in "src/comments/comments.sql"
from pydantic import BaseModel, Field
from typing import Optional, List

from typing_extensions import NewType

""" 'GetAllComments' parameters type """
class GetAllCommentsParams (BaseModel):
  id: float


""" 'GetAllComments' return type """
class GetAllCommentsResult (BaseModel):
  body: Optional[str]
  book_id: Optional[float]
  id: float
  user_id: Optional[float]


""" 'GetAllComments' query type """
class GetAllCommentsQuery (BaseModel):
  params: GetAllCommentsParams
  result: GetAllCommentsResult


# Query generated from SQL:
# ```
  # SELECT * FROM book_comments WHERE id = :id! OR user_id = :id                                      
# ```
class getAllComments(BaseModel):
    params: GetAllCommentsParams
    result: GetAllCommentsResult


""" 'GetAllCommentsByIds' parameters type """
class GetAllCommentsByIdsParams (BaseModel):
  ids: List[(float)]


""" 'GetAllCommentsByIds' return type """
class GetAllCommentsByIdsResult (BaseModel):
  body: Optional[str]
  book_id: Optional[float]
  id: float
  user_id: Optional[float]


""" 'GetAllCommentsByIds' query type """
class GetAllCommentsByIdsQuery (BaseModel):
  params: GetAllCommentsByIdsParams
  result: GetAllCommentsByIdsResult


# Query generated from SQL:
# ```
  # SELECT * FROM book_comments WHERE id in :ids AND id in :ids!
# ```
class getAllCommentsByIds(BaseModel):
    params: GetAllCommentsByIdsParams
    result: GetAllCommentsByIdsResult


""" 'InsertComment' parameters type """
class InsertCommentParams (BaseModel):
  comments: List[
    userId: float,
    commentBody: str
  ]


""" 'InsertComment' return type """
class InsertCommentResult (BaseModel):
  body: Optional[str]
  book_id: Optional[float]
  id: float
  user_id: Optional[float]


""" 'InsertComment' query type """
class InsertCommentQuery (BaseModel):
  params: InsertCommentParams
  result: InsertCommentResult


# Query generated from SQL:
# ```
  # INSERT INTO book_comments (user_id, body)
 # -- NOTE: this is a note
 # VALUES :comments RETURNING *
# ```
class insertComment(BaseModel):
    params: InsertCommentParams
    result: InsertCommentResult


""" 'SelectExistsTest' parameters type """
SelectExistsTestParams = NewType('SelectExistsTestParams', None)

""" 'SelectExistsTest' return type """
class SelectExistsTestResult (BaseModel):
  isTransactionExists: Optional[bool]


""" 'SelectExistsTest' query type """
class SelectExistsTestQuery (BaseModel):
  params: SelectExistsTestParams
  result: SelectExistsTestResult


# Query generated from SQL:
# ```
  # SELECT EXISTS ( SELECT 1 WHERE true ) AS "isTransactionExists"
# ```
class selectExistsTest(BaseModel):
    params: SelectExistsTestParams
    result: SelectExistsTestResult


