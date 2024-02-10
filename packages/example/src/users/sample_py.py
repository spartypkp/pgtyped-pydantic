# Pydantic models generated for queries found in "src/users/sample.ts"
from pydantic import BaseModel, Field
from typing import Optional, List

from typing_extensions import NewType

""" 'GetUsersWithComments' parameters type """
class GetUsersWithCommentsParams (BaseModel):
  minCommentCount: float


""" 'GetUsersWithComments' return type """
class GetUsersWithCommentsResult (BaseModel):
  # Age (in years) 
  age: Optional[float]
  email: str
  first_name: Optional[str]
  id: float
  last_name: Optional[str]
  registration_date: string
  user_name: str


""" 'GetUsersWithComments' query type """
class GetUsersWithCommentsQuery (BaseModel):
  params: GetUsersWithCommentsParams
  result: GetUsersWithCommentsResult


""" 'SelectExistsQuery' parameters type """
SelectExistsQueryParams = NewType('SelectExistsQueryParams', None)

""" 'SelectExistsQuery' return type """
class SelectExistsQueryResult (BaseModel):
  isTransactionExists: Optional[bool]


""" 'SelectExistsQuery' query type """
class SelectExistsQueryQuery (BaseModel):
  params: SelectExistsQueryParams
  result: SelectExistsQueryResult


