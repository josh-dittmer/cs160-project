'use client';

import { ItemT } from "@/lib/api/models";
import { ChevronLeft, ChevronRight, Image, Plus } from "lucide-react";
import { motion } from "motion/react";
import { useRef } from "react";
import { Mousewheel, Navigation } from 'swiper/modules';
import { Swiper, SwiperClass, SwiperSlide } from "swiper/react";

import { useUpsertCartItemMutation } from "@/lib/mutations/cart_item/upsert";
import 'swiper/css';
import 'swiper/css/pagination';

function Item({ item }: { item: ItemT }) {
    const { mutate } = useUpsertCartItemMutation();

    const visitItemPage = () => {
        window.location.href = `/home/item/${item.id}`;
    };

    const addToCart = (id: number) => {
        mutate({
            item_id: id,
            quantity: 1
        })
    };

    return (
        <div className="flex justify-center group">
            <div className="m-2 w-72 text-left">
                <div className="relative flex items-center justify-center bg-bg-medium min-h-36 rounded-xl overflow-hidden">
                    <button
                        onClick={visitItemPage}
                        className="w-full cursor-pointer"
                    >
                        {item.image_url ? (
                            <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-full h-36 object-cover"
                            />
                        ) : (
                            <Image width={30} height={30} className="text-fg-dark" />
                        )}
                    </button>
                    <div className="absolute bottom-0 right-0 p-4 opacity-0 group-hover:opacity-100">
                        <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => addToCart(item.id)}
                            className="bg-bg-light hover:bg-bg-medium p-1 rounded-full"
                        >
                            <Plus className="text-fg-dark" width={25} height={25} />
                        </motion.button>
                    </div>
                </div>
                <div className="flex items-center p-1">
                    <h1 className="text-md text-fg-dark grow">{item.name}</h1>
                    <p className="text-fg-medium text-sm"><span className="font-bold">${(item.price_cents / 100).toFixed(2)}</span></p>
                </div>
            </div>
        </div>
    )
}

export default function ItemSlider({ title, items }: { title: string, items: ItemT[] }) {
    const swiperRef = useRef<SwiperClass>(null);
    const currItems: ItemT[] = items;

    const slideNext = () => {
        swiperRef.current?.slideNext();
    }

    const slidePrev = () => {
        swiperRef.current?.slidePrev();
    }

    return (
        <div className="w-full">
            <div className="p-2 border-bg-dark border-b">
                <h1 className="text-2xl text-fg-dark">{title}</h1>
            </div>
            <div className="grid grid-cols-[0.1fr_1fr_0.1fr] p-2">
                <div className="flex justify-center items-center">
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={slidePrev}
                        className="rounded-full hover:bg-bg-medium p-1">
                        <ChevronLeft width={20} height={20} className="text-fg-dark" />
                    </motion.button>
                </div>
                <Swiper
                    slidesPerView={'auto'}
                    breakpoints={{
                        1024: {
                            slidesPerView: 3
                        }
                    }}
                    spaceBetween={30}
                    mousewheel={true}
                    modules={[Navigation, Mousewheel]}
                    cssMode={true}
                    loop={true}
                    className="w-full"
                    onSwiper={(swiper) => (swiperRef.current = swiper)}
                >
                    {currItems.map((item) => (
                        <SwiperSlide key={item.id} className="max-w-72 lg:max-w-full">
                            <Item item={item} />
                        </SwiperSlide>
                    ))}
                </Swiper>
                <div className="flex justify-center items-center">
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={slideNext}
                        className="rounded-full hover:bg-bg-medium p-1">
                        <ChevronRight width={20} height={20} className="text-fg-dark" />
                    </motion.button>
                </div>
            </div>
        </div>
    )
}