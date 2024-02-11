# Pydantic models generated for queries found in "src/books/test.py"
from pydantic import BaseModel, Field
from typing import Optional, List

from typing_extensions import NewType

""" 'StupidModel' parameters type """
StupidModelParams = NewType('StupidModelParams', None)

""" 'StupidModel' return type """
class StupidModelResult (BaseModel):
  author_id: Optional[float]
  categories: Optional[List[category]]
  id: float
  name: Optional[str]
  rank: Optional[float]


""" 'StupidModel' query type """
class StupidModelQuery (BaseModel):
  params: StupidModelParams
  result: StupidModelResult


