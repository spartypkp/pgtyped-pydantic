# Pydantic models generated for queries found in "src/notifications/notifications.sql"
from pydantic import BaseModel, Field
from typing import Optional, List

from typing_extensions import NewType

""" 'SendNotifications' parameters type """
class SendNotificationsParams (BaseModel):
  notifications: List[
    user_id: float,
    payload: Dict[str, Any],
    type: notification_type
  ]


""" 'SendNotifications' return type """
class SendNotificationsResult (BaseModel):
  notification_id: float


""" 'SendNotifications' query type """
class SendNotificationsQuery (BaseModel):
  params: SendNotificationsParams
  result: SendNotificationsResult


# Query generated from SQL:
# ```
  # INSERT INTO notifications (user_id, payload, type)
 # VALUES :notifications RETURNING id as notification_id
# ```
class sendNotifications(BaseModel):
    params: SendNotificationsParams
    result: SendNotificationsResult


""" 'GetNotifications' parameters type """
class GetNotificationsParams (BaseModel):
  date: Union[datetime, str]
  userId: Optional[float]


""" 'GetNotifications' return type """
class GetNotificationsResult (BaseModel):
  created_at: string
  id: float
  payload: Dict[str, Any]
  type: notification_type
  user_id: Optional[float]


""" 'GetNotifications' query type """
class GetNotificationsQuery (BaseModel):
  params: GetNotificationsParams
  result: GetNotificationsResult


# Query generated from SQL:
# ```
  # SELECT *
 #   FROM notifications
 #  WHERE user_id = :userId
 #  AND created_at > :date!
# ```
class getNotifications(BaseModel):
    params: GetNotificationsParams
    result: GetNotificationsResult


""" 'ThresholdFrogs' parameters type """
class ThresholdFrogsParams (BaseModel):
  numFrogs: float


""" 'ThresholdFrogs' return type """
class ThresholdFrogsResult (BaseModel):
  payload: Dict[str, Any]
  type: notification_type
  user_name: str


""" 'ThresholdFrogs' query type """
class ThresholdFrogsQuery (BaseModel):
  params: ThresholdFrogsParams
  result: ThresholdFrogsResult


# Query generated from SQL:
# ```
  # SELECT u.user_name, n.payload, n.type
 # FROM notifications n
 # INNER JOIN users u on n.user_id = u.id
 # WHERE CAST (n.payload->'num_frogs' AS int) > :numFrogs!
# ```
class thresholdFrogs(BaseModel):
    params: ThresholdFrogsParams
    result: ThresholdFrogsResult


