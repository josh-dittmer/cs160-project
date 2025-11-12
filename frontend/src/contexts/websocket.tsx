import { Endpoints } from "@/lib/api/endpoints";
import { WebSocketMessage } from "@/lib/api/models";
import { useQueryClient } from "@tanstack/react-query";
import { isLeft } from 'fp-ts/lib/Either';
import { createContext, ReactNode, useEffect, useRef } from "react";
import { useAuth } from "./auth";

export type WebsocketContextType = {};

export const WebsocketContext = createContext<WebsocketContextType | null>(null);

export function WebsocketProvider({ children }: { children: ReactNode }) {
    const queryClient = useQueryClient();
    const { token } = useAuth();

    const ws = useRef<WebSocket>(null);

    useEffect(() => {
        if (!token) return;

        ws.current = new WebSocket(`${Endpoints.mainApiInternal}/api/vehicle/ws/monitor`);

        // send auth message on open
        ws.current.onopen = () => {
            if (!ws.current) return;

            ws.current.send(JSON.stringify({
                token: token
            }))
        };

        ws.current.onclose = () => { console.log('WS connection closed!'); }

        ws.current.onmessage = (message) => {
            const json = JSON.parse(message.data);

            const decoded = WebSocketMessage.decode(json);
            if (isLeft(decoded)) {
                throw new Error('invalid websocket message');
            }

            switch (decoded.right.type) {
                case 'orderUpdate':
                    queryClient.invalidateQueries({ queryKey: ['orders'] });
                    queryClient.invalidateQueries({ queryKey: ['orderRoute'] });
                    console.log('updating');
                    break;
                case 'orderDelivered':
                    break;
                case 'vehicleMoved':
                    break;
            }
        };
    }, [token]);

    return (
        <WebsocketContext.Provider value={{}}>
            {children}
        </WebsocketContext.Provider>
    )
}