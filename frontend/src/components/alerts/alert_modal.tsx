'use client';

import Modal from '../modal/modal';
import { useAlerts } from '@/lib/alerts/alerts-context';
import { StatusBadge } from '../employee_table/status_badge';
import { Icons } from '../employee_table/icons';

export default function AlertsModal() {
    const { open, setOpen, flaggedItems } = useAlerts();

    return (
        <Modal
            open ={open}
            onClose={() => setOpen(false)}
            title="Attention Required: Flagged Items"
            footer={
                <div className="flex gap-3">
                    <button className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                        onClick={() => setOpen(false)}>Close</button>
                </div>
            }
        >
            {flaggedItems.length === 0 ? (
                <p className='text-zinc-700'>No items are flagged as Expired or Damaged!</p>
            ) : (
                <div className="space-y-3">
                    {flaggedItems.map(item => (
                        <div key={item.id} className="flex items-center justify-between rounded-xl border border-zinc-200 px-3 py-2">
                            <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-100">
                                    <Icons.Package2 className="h-4 w-4 text-zinc-500" />
                                </div>
                                <div>
                                    <div className="font-medium text-zinc-900">{item.name}</div>
                                    <div className="text-xs text-zinc-500">{item.category}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <StatusBadge status={item.status} />
                                <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                                    {item.condition}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Modal>
    );
}