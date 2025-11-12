import { MapsContext } from "@/contexts/maps";
import { OrderT } from "@/lib/api/models";
import { useOrderRouteQuery } from "@/lib/queries/order_route";
import { GoogleMap, OverlayView } from "@react-google-maps/api";
import { Home } from "lucide-react";
import { useCallback, useContext, useEffect, useState } from "react";
import LoadingSpinner from "../loading_spinner/loading_spinner";

export default function OrderMap({ order }: { order: OrderT }) {
    const { data } = useOrderRouteQuery(order.id);

    const orderCoords = {
        lat: order.latitude,
        lng: order.longitude
    };

    const mapsContext = useContext(MapsContext);

    const [map, setMap] = useState<google.maps.Map>();

    const onLoad = useCallback((map: google.maps.Map) => {
        const styledMapType = new google.maps.StyledMapType([
            {
                featureType: 'poi',
                stylers: [{ visibility: 'off' }]
            }
        ], { name: 'Styled Map' });

        map.mapTypes.set('styled_map', styledMapType);

        setMap(map);
    }, [mapsContext?.loaded]);

    useEffect(() => {
        if (map && data && data.polyline !== null) {
            const decodedPath = google.maps.geometry.encoding.decodePath(data.polyline);

            new google.maps.Polyline({
                path: decodedPath,
                geodesic: true,
                strokeColor: "#FF0000",
                strokeOpacity: 1.0,
                strokeWeight: 2,
                map: map
            });
        }
    }, [map, data]);

    if (!mapsContext?.loaded) {
        return (
            <div className="flex items-center justify-center h-54">
                <LoadingSpinner width={50} height={50} />
            </div>
        )
    }

    return (
        <div className="w-full h-full">
            <GoogleMap
                mapContainerStyle={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '12px 12px 0px 0px'
                }}
                center={orderCoords}
                zoom={13}
                options={{
                    disableDefaultUI: true,
                    mapTypeId: 'styled_map',
                    colorScheme: google.maps.ColorScheme.FOLLOW_SYSTEM,
                }}
                onLoad={onLoad}
            >
                <OverlayView
                    position={orderCoords}
                    mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                >
                    <div className="w-fit h-fit p-1 bg-bg-dark rounded-full border-2 border-fg-dark">
                        <Home width={20} height={20} className="text-fg-dark" />
                    </div>
                </OverlayView>
            </GoogleMap>
        </div>
    )
}