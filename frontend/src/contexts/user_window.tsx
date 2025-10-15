import { createContext, Dispatch, ReactNode, SetStateAction, useState } from "react";

export type UserWindow = {
    visible: boolean,
    setVisible: Dispatch<SetStateAction<boolean>>
};

export const UserWindowContext = createContext<UserWindow | null>(null);

export function UserWindowProvider({ children }: { children: ReactNode }) {
    const [visible, setVisible] = useState<boolean>(false);

    return (
        <UserWindowContext.Provider value={{ visible: visible, setVisible: setVisible }}>
            {children}
        </UserWindowContext.Provider>
    )
}