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
        <div className = "modal-backdrop" role="dialog" aria-modal="true">
            <div className="modal-card">
                <div className="modal-header">
                    {/*This is optional for the modal, created it 
                    so can have a title if needed and modal can be reused */}
                    <div className="modal-title">{title}</div> 
                    <button className="modal-x" onClick={onClose} aria-label="Close">x</button>
                    </div>
                    <div className='modal-body'>{children}</div>
                    //Condionally rendering footer incase we need one for Modal
                    {footer && <div className="modal-footer">{footer}</div>}
                </div>
        </div>
    );
}
