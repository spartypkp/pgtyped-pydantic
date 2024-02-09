# Pydantic models generated for queries found in "./output.ts"
from pydantic import BaseModel, Field
from typing import Optional, List

from typing_extensions import NewType

""" 'SeanIsALightweight' parameters type """
SeanIsALightweightParams = NewType('SeanIsALightweightParams', None)

""" 'SeanIsALightweight' return type """
class SeanIsALightweightResult (BaseModel):
  author_id: Optional[float]
  categories: Optional[List[category]]
  id: float
  name: Optional[str]
  rank: Optional[float]


""" 'SeanIsALightweight' query type """
class SeanIsALightweightQuery (BaseModel):
  params: SeanIsALightweightParams
  result: SeanIsALightweightResult


