# Pydantic models generated for queries found in "src/notifications/notifications.ts"
from pydantic import BaseModel, Field
from typing import Optional, List

from typing_extensions import NewType

""" 'InsertNotifications' parameters type """
class InsertNotificationsParams (BaseModel):
  params: List[
    payload: Dict[str, Any],
    user_id: float,
    type: notification_type
  ]


""" 'InsertNotifications' return type """
InsertNotificationsResult = NewType('InsertNotificationsResult', None)

""" 'InsertNotifications' query type """
class InsertNotificationsQuery (BaseModel):
  params: InsertNotificationsParams
  result: InsertNotificationsResult


""" 'InsertNotification' parameters type """
class InsertNotificationParams (BaseModel):
  notification: 
    payload: Dict[str, Any],
    user_id: float,
    type: notification_type
  


""" 'InsertNotification' return type """
InsertNotificationResult = NewType('InsertNotificationResult', None)

""" 'InsertNotification' query type """
class InsertNotificationQuery (BaseModel):
  params: InsertNotificationParams
  result: InsertNotificationResult


""" 'GetAllNotifications' parameters type """
GetAllNotificationsParams = NewType('GetAllNotificationsParams', None)

""" 'GetAllNotifications' return type """
class GetAllNotificationsResult (BaseModel):
  created_at: string
  id: float
  payload: Dict[str, Any]
  type: notification_type
  user_id: Optional[float]


""" 'GetAllNotifications' query type """
class GetAllNotificationsQuery (BaseModel):
  params: GetAllNotificationsParams
  result: GetAllNotificationsResult


