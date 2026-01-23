from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync


def send_to_user(user_id, event, data):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"user_{user_id}",
        {
            "type": "broadcast",
            "event": event,
            "data": data,
        }
    )


def send_to_event(event_id, event, data):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"event_{event_id}",
        {
            "type": "broadcast",
            "event": event,
            "data": data,
        }
    )
    
def send_to_all(event, data):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        "broadcast",
        {
            "type": "broadcast",
            "event": event,
            "data": data,
        }
    )