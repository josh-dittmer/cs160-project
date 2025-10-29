import { createContext, Dispatch, ReactNode, SetStateAction, useState } from "react";

export type PaymentWindow = {
    visible: boolean,
    setVisible: Dispatch<SetStateAction<boolean>>
};

export const PaymentWindowContext = createContext<PaymentWindow | null>(null);

export function PaymentWindowProvider({ children }: { children: ReactNode }) {
    const [visible, setVisible] = useState<boolean>(false);

    return (
        <PaymentWindowContext.Provider value={{ visible: visible, setVisible: setVisible }}>
            {children}
        </PaymentWindowContext.Provider>
    )
}