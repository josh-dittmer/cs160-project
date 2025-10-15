'use client';
import type { ItemT } from '@/lib/api/models';
import dynamic from 'next/dynamic';

// keep strong typing for props
type Props = { title: string; items: ItemT[] };

const ItemSlider = dynamic<Props>(() => import('./item_slider'), {
    ssr: false,

    loading: () => <div className="p-4"></div>,
});

export default ItemSlider;
