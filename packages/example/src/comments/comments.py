# Pydantic models generated for queries found in "src/comments/comments.sql"
from pydantic import BaseModel, Field
from typing import Optional, List

""" 'GetAllComments' parameters type """
class IGetAllCommentsParams (BaseModel):
  id: float


""" 'GetAllComments' return type """
class IGetAllCommentsResult (BaseModel):
  body: Optional[str]
  book_id: Optional[float]
  id: float
  user_id: Optional[float]


""" 'GetAllComments' query type """
class IGetAllCommentsQuery (BaseModel):
  params: IGetAllCommentsParams
  result: IGetAllCommentsResult


# Query generated from SQL:
# ```
#  * SELECT * FROM book_comments WHERE id = :id! OR user_id = :id                                      
# ```
class getAllComments(BaseModel):
    params: IGetAllCommentsParams
    result: IGetAllCommentsResult


""" 'GetAllCommentsByIds' parameters type """
class IGetAllCommentsByIdsParams (BaseModel):
  ids: List[(float)]


""" 'GetAllCommentsByIds' return type """
class IGetAllCommentsByIdsResult (BaseModel):
  body: Optional[str]
  book_id: Optional[float]
  id: float
  user_id: Optional[float]


""" 'GetAllCommentsByIds' query type """
class IGetAllCommentsByIdsQuery (BaseModel):
  params: IGetAllCommentsByIdsParams
  result: IGetAllCommentsByIdsResult


# Query generated from SQL:
# ```
#  * SELECT * FROM book_comments WHERE id in :ids AND id in :ids!
# ```
class getAllCommentsByIds(BaseModel):
    params: IGetAllCommentsByIdsParams
    result: IGetAllCommentsByIdsResult


""" 'InsertComment' parameters type """
class IInsertCommentParams (BaseModel):
  comments: List[{
    userId: float,
    commentBody: str
  }]


""" 'InsertComment' return type """
class IInsertCommentResult (BaseModel):
  body: Optional[str]
  book_id: Optional[float]
  id: float
  user_id: Optional[float]


""" 'InsertComment' query type """
class IInsertCommentQuery (BaseModel):
  params: IInsertCommentParams
  result: IInsertCommentResult


# Query generated from SQL:
# ```
#  * INSERT INTO book_comments (user_id, body)
 * -- NOTE: this is a note
 * VALUES :comments RETURNING *
# ```
class insertComment(BaseModel):
    params: IInsertCommentParams
    result: IInsertCommentResult


""" 'SelectExistsTest' parameters type """
ISelectExistsTestParams = NewType('ISelectExistsTestParams', None)

""" 'SelectExistsTest' return type """
class ISelectExistsTestResult (BaseModel):
  isTransactionExists: Optional[bool]


""" 'SelectExistsTest' query type """
class ISelectExistsTestQuery (BaseModel):
  params: ISelectExistsTestParams
  result: ISelectExistsTestResult


# Query generated from SQL:
# ```
#  * SELECT EXISTS ( SELECT 1 WHERE true ) AS "isTransactionExists"
# ```
class selectExistsTest(BaseModel):
    params: ISelectExistsTestParams
    result: ISelectExistsTestResult


