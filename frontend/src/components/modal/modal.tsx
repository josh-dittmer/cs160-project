'use client';
import  React  from 'react';

type ModalProps = {
    open: boolean;
    title?: string;
    onClose: () => void;
    children: React.ReactNode;
    footer?: React.ReactNode;
};

export default function Modal({ open, title, onClose, children, footer }: ModalProps) {
    if (!open) return null;

    return (
        <div className = "fixed inset-0 z-50 grid place-items-center bg-black/25" role="dialog" aria-modal="true">
            <div className="w[520px] max-w-[calc(100vw-32px)] overflow-hidden rounded-2xl bg-white shawdow-2xl">
                <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
                    {/*This is optional for the modal, created it 
                    so can have a title if needed and modal can be reused */}
                    <div className="font-semibold">{title}</div> 
                    <button className="rounded-md px-2 py-1 text-xl hovering:bg-zinc-100" 
                    onClick={onClose} aria-label="Close">x</button>
                    </div>
                    <div className='px-4 py-4 text-zinc-700'>{children}</div>
                    {/*Condionally rendering footer incase we need one for Modal*/}
                    {footer && <div className="flex justify-end gap-3 border-t border-zinc-200 px-4 py-3">{footer}</div>}
                </div>
        </div>
    );
}
