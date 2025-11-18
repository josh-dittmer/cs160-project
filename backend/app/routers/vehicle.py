from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from ..schemas import OrderRouteResponse
from ..auth import get_current_user, get_user_from_token, UserCtx
from ..database import get_db
from ..models import Order, OrderStatus, DeliveryVehicle, DeliveryVehicleStatus
from sqlalchemy.orm import Session
from ..auth import verify_password
from ..route_optimization import optimize_order_route
from typing import Dict

router = APIRouter(prefix="/api/vehicle", tags=["vehicle"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, WebSocket] = {}

    async def connect(self, websocket: WebSocket, db: Session):
        await websocket.accept()
        
        data = await websocket.receive_json()

        user = get_user_from_token(data.get("token", ""), db)
        self.active_connections[user.id] = websocket
                
        print(f"User {user.email} connected")

        return user

    def disconnect(self, user_id: int):
        if user_id in self.active_connections:
            del self.active_connections[user_id]

    async def send_message(self, message, user_id: int):
        websocket = self.active_connections.get(user_id)
        if websocket:
            try:
                await websocket.send_json(message)
            except Exception as e:
                print(f"Error sending to {user_id}: {e}")
                self.disconnect(user_id)

manager = ConnectionManager()

@router.websocket('/ws/monitor')
async def vehicle_websocket(
    websocket: WebSocket,
    db: Session = Depends(get_db)
):
    user = await manager.connect(websocket, db)

    try:
        while True:
            data = await websocket.receive_text()
            await manager.send_message(f"You said: {data}", user.id)
    except WebSocketDisconnect:
        print(f"User {user.email} disconnected")
        manager.disconnect(user.id)

@router.websocket('/ws/deliver')
async def vehicle_websocket(
    websocket: WebSocket,
    db: Session = Depends(get_db)
):
    try:
        await websocket.accept()

        vehicle: DeliveryVehicle | None = None

        while True:
            data = await websocket.receive_json()

            # authenticate vehicle
            if not vehicle:
                id = data.get("id", "")
                secret = data.get("secret", "")

                v = db.get(DeliveryVehicle, id)

                if not v or not verify_password(
                    plain_password=secret,
                    hashed_password=v.secret_hash
                ):
                    await websocket.close()
                    return
                
                vehicle = v

            # assign pending orders (put constraints here)
            if vehicle.status is DeliveryVehicleStatus.READY:
                orders = db.query(Order).filter_by(status=OrderStatus.PACKING).all()

                routes = await optimize_order_route(orders)

                affected_users: set = set()

                for r in routes:
                    for v in r.visits:
                        i = v.shipment_index

                        orders[i].delivery_vehicle_id = vehicle.id
                        orders[i].status = OrderStatus.SHIPPED
                        orders[i].polyline = r.route_polyline.points

                        affected_users.add(orders[i].user_id)

                db.commit()

                for user in affected_users:
                        await manager.send_message({
                            'type': 'orderUpdate'
                        }, user)
                        
    except Exception as e:
        print(f"Error sending to {vehicle.id}: {e}")
        if (vehicle):
            print(f"Vehicle {vehicle.id} disconnected")
    return

@router.get("/order-route/{order_id}", response_model=OrderRouteResponse)
async def order_route(
    order_id: int,
    user: UserCtx = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> OrderRouteResponse:
    # lookup order
    order = db.get(Order, order_id)

    if not order or not order.user_id == user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")
        
    return OrderRouteResponse(polyline=order.polyline)