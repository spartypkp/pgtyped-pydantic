# Pydantic models generated for queries found in "src/notifications/notifications.sql"
from pydantic import BaseModel, Field
from typing import Optional, List

""" 'SendNotifications' parameters type """
class ISendNotificationsParams (BaseModel):
  notifications: List[{
    user_id: float,
    payload: Dict[str, Any],
    type: notification_type
  }]


""" 'SendNotifications' return type """
class ISendNotificationsResult (BaseModel):
  notification_id: float


""" 'SendNotifications' query type """
class ISendNotificationsQuery (BaseModel):
  params: ISendNotificationsParams
  result: ISendNotificationsResult


# Query generated from SQL:
# ```
#  * INSERT INTO notifications (user_id, payload, type)
 * VALUES :notifications RETURNING id as notification_id
# ```
class sendNotifications(BaseModel):
    params: ISendNotificationsParams
    result: ISendNotificationsResult


""" 'GetNotifications' parameters type """
class IGetNotificationsParams (BaseModel):
  date: Union[datetime, str]
  userId: Optional[float]


""" 'GetNotifications' return type """
class IGetNotificationsResult (BaseModel):
  created_at: string
  id: float
  payload: Dict[str, Any]
  type: notification_type
  user_id: Optional[float]


""" 'GetNotifications' query type """
class IGetNotificationsQuery (BaseModel):
  params: IGetNotificationsParams
  result: IGetNotificationsResult


# Query generated from SQL:
# ```
#  * SELECT *
 *   FROM notifications
 *  WHERE user_id = :userId
 *  AND created_at > :date!
# ```
class getNotifications(BaseModel):
    params: IGetNotificationsParams
    result: IGetNotificationsResult


""" 'ThresholdFrogs' parameters type """
class IThresholdFrogsParams (BaseModel):
  numFrogs: float


""" 'ThresholdFrogs' return type """
class IThresholdFrogsResult (BaseModel):
  payload: Dict[str, Any]
  type: notification_type
  user_name: str


""" 'ThresholdFrogs' query type """
class IThresholdFrogsQuery (BaseModel):
  params: IThresholdFrogsParams
  result: IThresholdFrogsResult


# Query generated from SQL:
# ```
#  * SELECT u.user_name, n.payload, n.type
 * FROM notifications n
 * INNER JOIN users u on n.user_id = u.id
 * WHERE CAST (n.payload->'num_frogs' AS int) > :numFrogs!
# ```
class thresholdFrogs(BaseModel):
    params: IThresholdFrogsParams
    result: IThresholdFrogsResult


