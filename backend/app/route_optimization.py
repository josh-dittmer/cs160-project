from .models import Order
from google.maps import routeoptimization_v1
from google.protobuf.timestamp_pb2 import Timestamp
from datetime import datetime, timedelta, timezone
import os

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "./keys.json"

GOOGLE_PROJECT_ID = os.getenv("GOOGLE_PROJECT_ID", "")

HOME_LATITUDE = 37.3352
HOME_LONGITUDE = -121.8811

client = routeoptimization_v1.RouteOptimizationAsyncClient()

async def optimize_order_route(orders: list[Order]):
    shipments = []

    for order in orders:
        shipments.append({
            "deliveries": [{
                "arrival_waypoint" : {
                    "location": {
                        "lat_lng": {
                            "latitude": order.latitude,
                            "longitude": order.longitude
                        }   
                    }
                },
            }],
            "label": f"{order.id}"
        })

    shipment_model = {
        "global_start_time": Timestamp(seconds=int(datetime.now(timezone.utc).timestamp())),
        "global_end_time": Timestamp(seconds=int((datetime.now(timezone.utc) + timedelta(days=30)).timestamp())),
        "shipments": shipments,
        "vehicles": [
            {
                "end_location": {
                    "latitude": HOME_LATITUDE,
                    "longitude": HOME_LONGITUDE
                },
                "start_location": {
                    "latitude": HOME_LATITUDE,
                    "longitude": HOME_LONGITUDE
                },
                "cost_per_hour": 50.0,
                "cost_per_kilometer": 5.0,
            }
        ]
    }

    request = routeoptimization_v1.OptimizeToursRequest(
        parent=f"projects/{GOOGLE_PROJECT_ID}",
        model=shipment_model,
        populate_polylines=True,
        populate_transition_polylines=True
    )

    response = await client.optimize_tours(request=request)

    return response.routes
