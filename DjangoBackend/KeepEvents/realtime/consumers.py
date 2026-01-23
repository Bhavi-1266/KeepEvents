import json
from urllib.parse import parse_qs
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from users.models import users
from events.models import Events
from guardian.shortcuts import get_objects_for_user

class RealtimeConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # parse query params
        query_string = self.scope["query_string"].decode()
        params = parse_qs(query_string)

        user_id = params.get("userid", [None])[0]
        if not user_id:
            await self.close()
            return

        try:
            # Wrap DB call in sync_to_async
            user = await self.get_user(user_id)
        except users.DoesNotExist:
            await self.close()
            return

        self.user = user

        # define groups SAFELY
        self.user_group = f"user_{user.userid}"
        self.event_groups = []

        await self.channel_layer.group_add(
            self.user_group,
            self.channel_name,
        )

        # Wrap guardian call in sync_to_async
        events = await self.get_user_events(user)

        for event in events:
            group = f"event_{event.eventid}"
            self.event_groups.append(group)
            await self.channel_layer.group_add(group, self.channel_name)

        
        await self.channel_layer.group_add(
            "broadcast",
            self.channel_name,
            )           
        
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "user_group"):
            await self.channel_layer.group_discard(
                self.user_group,
                self.channel_name,
            )

        for group in getattr(self, "event_groups", []):
            await self.channel_layer.group_discard(
                group,
                self.channel_name,
            )
        await self.channel_layer.group_discard(
            "broadcast",
            self.channel_name,
            )  

    async def broadcast(self, event):
        await self.send(text_data=json.dumps({
            "type": event["event"],
            "data": event["data"],
        }))

    # Database helper methods
    @database_sync_to_async
    def get_user(self, user_id):
        return users.objects.get(userid=user_id)

    @database_sync_to_async
    def get_user_events(self, user):
        return list(get_objects_for_user(
            user,
            "events.view_event_obj",
            Events,
        ))