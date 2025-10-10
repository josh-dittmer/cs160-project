'use client';
import dynamic from 'next/dynamic';
import type { ItemT } from '@/lib/api/models';

// keep strong typing for props
type Props = { title: string; items: ItemT[] };

const ItemSlider = dynamic<Props>(() => import('./item_slider'), {
  ssr: false,

  loading: () => <div className="p-4">Loading…</div>,
});

export default ItemSlider;
