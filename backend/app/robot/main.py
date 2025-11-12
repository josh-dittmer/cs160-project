import websockets
import asyncio
from ..schemas import DeliveryVehicleAuth

ROBOT_ID = 1
ROBOT_SECRET = "abc123"

async def connect():
    uri = "ws://localhost:8080/api/vehicle/ws/deliver"

    async with websockets.connect(uri) as websocket:
        # send auth request
        await websocket.send(DeliveryVehicleAuth(
            id=ROBOT_ID, secret=ROBOT_SECRET
        ).model_dump_json())

        while True:
            message = await websocket.recv()
            print(f"Received: {message}")

asyncio.run(connect())