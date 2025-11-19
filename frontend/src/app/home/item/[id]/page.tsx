'use client';

import AddToCartButton from '@/components/add_to_cart_button/add_to_cart_button';
import { ItemDetail, ItemDetailT } from '@/lib/api/models';
import { get, request } from '@/lib/api/request';
import * as t from 'io-ts';
import { Package, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { useState, useEffect, use } from 'react';
import { toTitleCase } from '@/lib/util/categoryHelpers';

// Define the nutrition type
const NutritionFact = t.partial({
    value: t.union([t.number, t.string]),
    unit: t.string,
    dailyValue: t.number
});

const Nutrition = t.partial({
    servingSize: t.string,
    servingsPerContainer: t.string,
    calories: t.number,
    totalFat: NutritionFact,
    saturatedFat: NutritionFact,
    transFat: NutritionFact,
    cholesterol: NutritionFact,
    sodium: NutritionFact,
    totalCarbohydrate: NutritionFact,
    dietaryFiber: NutritionFact,
    totalSugars: NutritionFact,
    protein: NutritionFact,
    vitaminD: NutritionFact,
    calcium: NutritionFact,
    iron: NutritionFact,
    potassium: NutritionFact,
    vitaminA: NutritionFact,
    vitaminC: NutritionFact,
    vitaminB6: NutritionFact,
    vitaminB12: NutritionFact,
    vitaminK: NutritionFact,
    vitaminE: NutritionFact,
    folate: NutritionFact,
    thiamin: NutritionFact,
    omega3: NutritionFact,
    probiotics: NutritionFact,
    selenium: NutritionFact,
    phosphorus: NutritionFact,
});

type NutritionT = t.TypeOf<typeof Nutrition>;

function NutritionLabel({ nutrition }: { nutrition: NutritionT }) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="bg-white border-2 border-black font-sans text-sm">
            {/* Clickable Header - Only Title When Collapsed */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full text-left p-2 hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-bold">Nutrition Facts</h2>
                    <div className="ml-4 flex-shrink-0">
                        {isExpanded ? (
                            <ChevronUp className="w-6 h-6 text-black" />
                        ) : (
                            <ChevronDown className="w-6 h-6 text-black" />
                        )}
                    </div>
                </div>
            </button>

            {/* Collapsible Content - Everything Else */}
            {isExpanded && (
                <div className="p-2 pt-0">
                    <div className="border-b-8 border-black pb-1 mb-1">
                        {nutrition.servingsPerContainer && (
                            <p className="text-xs">{nutrition.servingsPerContainer}</p>
                        )}
                        {nutrition.servingSize && (
                            <p className="font-bold">Serving size <span className="float-right">{nutrition.servingSize}</span></p>
                        )}
                    </div>

                    {/* Calories */}
                    {nutrition.calories !== undefined && (
                        <div className="border-b-4 border-black py-1">
                            <p className="text-xs font-bold">Amount per serving</p>
                            <p className="text-3xl font-bold">
                                Calories <span className="float-right">{nutrition.calories}</span>
                            </p>
                        </div>
                    )}

            <div className="border-b-2 border-black py-1">
                <p className="text-xs text-right font-bold">% Daily Value*</p>
            </div>

            {/* Macronutrients */}
            {nutrition.totalFat && (
                <div className="border-b border-gray-400 py-1">
                    <p><span className="font-bold">Total Fat</span> {nutrition.totalFat.value}{nutrition.totalFat.unit}
                        {nutrition.totalFat.dailyValue !== undefined && (
                            <span className="float-right font-bold">{nutrition.totalFat.dailyValue}%</span>
                        )}
                    </p>
                </div>
            )}

            {nutrition.saturatedFat && (
                <div className="border-b border-gray-400 py-1 pl-4">
                    <p>Saturated Fat {nutrition.saturatedFat.value}{nutrition.saturatedFat.unit}
                        {nutrition.saturatedFat.dailyValue !== undefined && (
                            <span className="float-right font-bold">{nutrition.saturatedFat.dailyValue}%</span>
                        )}
                    </p>
                </div>
            )}

            {nutrition.transFat && (
                <div className="border-b border-gray-400 py-1 pl-4">
                    <p><span className="italic">Trans</span> Fat {nutrition.transFat.value}{nutrition.transFat.unit}</p>
                </div>
            )}

            {nutrition.cholesterol && (
                <div className="border-b border-gray-400 py-1">
                    <p><span className="font-bold">Cholesterol</span> {nutrition.cholesterol.value}{nutrition.cholesterol.unit}
                        {nutrition.cholesterol.dailyValue !== undefined && (
                            <span className="float-right font-bold">{nutrition.cholesterol.dailyValue}%</span>
                        )}
                    </p>
                </div>
            )}

            {nutrition.sodium && (
                <div className="border-b border-gray-400 py-1">
                    <p><span className="font-bold">Sodium</span> {nutrition.sodium.value}{nutrition.sodium.unit}
                        {nutrition.sodium.dailyValue !== undefined && (
                            <span className="float-right font-bold">{nutrition.sodium.dailyValue}%</span>
                        )}
                    </p>
                </div>
            )}

            {nutrition.totalCarbohydrate && (
                <div className="border-b border-gray-400 py-1">
                    <p><span className="font-bold">Total Carbohydrate</span> {nutrition.totalCarbohydrate.value}{nutrition.totalCarbohydrate.unit}
                        {nutrition.totalCarbohydrate.dailyValue !== undefined && (
                            <span className="float-right font-bold">{nutrition.totalCarbohydrate.dailyValue}%</span>
                        )}
                    </p>
                </div>
            )}

            {nutrition.dietaryFiber && (
                <div className="border-b border-gray-400 py-1 pl-4">
                    <p>Dietary Fiber {nutrition.dietaryFiber.value}{nutrition.dietaryFiber.unit}
                        {nutrition.dietaryFiber.dailyValue !== undefined && (
                            <span className="float-right font-bold">{nutrition.dietaryFiber.dailyValue}%</span>
                        )}
                    </p>
                </div>
            )}

            {nutrition.totalSugars && (
                <div className="border-b border-gray-400 py-1 pl-4">
                    <p>Total Sugars {nutrition.totalSugars.value}{nutrition.totalSugars.unit}</p>
                </div>
            )}

            {nutrition.protein && (
                <div className="border-b-8 border-black py-1">
                    <p><span className="font-bold">Protein</span> {nutrition.protein.value}{nutrition.protein.unit}</p>
                </div>
            )}

            {/* Vitamins and Minerals */}
            <div className="py-2 text-xs space-y-1">
                {nutrition.vitaminD && (
                    <p className="border-b border-gray-300 py-1">
                        Vitamin D {nutrition.vitaminD.value}{nutrition.vitaminD.unit}
                        <span className="float-right font-bold">{nutrition.vitaminD.dailyValue}%</span>
                    </p>
                )}
                {nutrition.calcium && (
                    <p className="border-b border-gray-300 py-1">
                        Calcium {nutrition.calcium.value}{nutrition.calcium.unit}
                        <span className="float-right font-bold">{nutrition.calcium.dailyValue}%</span>
                    </p>
                )}
                {nutrition.iron && (
                    <p className="border-b border-gray-300 py-1">
                        Iron {nutrition.iron.value}{nutrition.iron.unit}
                        <span className="float-right font-bold">{nutrition.iron.dailyValue}%</span>
                    </p>
                )}
                {nutrition.potassium && (
                    <p className="border-b border-gray-300 py-1">
                        Potassium {nutrition.potassium.value}{nutrition.potassium.unit}
                        <span className="float-right font-bold">{nutrition.potassium.dailyValue}%</span>
                    </p>
                )}
                {nutrition.vitaminA && (
                    <p className="border-b border-gray-300 py-1">
                        Vitamin A {nutrition.vitaminA.value}{nutrition.vitaminA.unit}
                        <span className="float-right font-bold">{nutrition.vitaminA.dailyValue}%</span>
                    </p>
                )}
                {nutrition.vitaminC && (
                    <p className="border-b border-gray-300 py-1">
                        Vitamin C {nutrition.vitaminC.value}{nutrition.vitaminC.unit}
                        <span className="float-right font-bold">{nutrition.vitaminC.dailyValue}%</span>
                    </p>
                )}
                {nutrition.vitaminB6 && (
                    <p className="border-b border-gray-300 py-1">
                        Vitamin B6 {nutrition.vitaminB6.value}{nutrition.vitaminB6.unit}
                        <span className="float-right font-bold">{nutrition.vitaminB6.dailyValue}%</span>
                    </p>
                )}
                {nutrition.vitaminB12 && (
                    <p className="border-b border-gray-300 py-1">
                        Vitamin B12 {nutrition.vitaminB12.value}{nutrition.vitaminB12.unit}
                        <span className="float-right font-bold">{nutrition.vitaminB12.dailyValue}%</span>
                    </p>
                )}
                {nutrition.vitaminK && (
                    <p className="border-b border-gray-300 py-1">
                        Vitamin K {nutrition.vitaminK.value}{nutrition.vitaminK.unit}
                        <span className="float-right font-bold">{nutrition.vitaminK.dailyValue}%</span>
                    </p>
                )}
                {nutrition.folate && (
                    <p className="border-b border-gray-300 py-1">
                        Folate {nutrition.folate.value}{nutrition.folate.unit}
                        <span className="float-right font-bold">{nutrition.folate.dailyValue}%</span>
                    </p>
                )}
                {nutrition.omega3 && (
                    <p className="border-b border-gray-300 py-1">
                        Omega-3 Fatty Acids {nutrition.omega3.value}{nutrition.omega3.unit}
                    </p>
                )}
                {nutrition.probiotics && (
                    <p className="border-b border-gray-300 py-1">
                        Probiotics: {nutrition.probiotics.value}
                    </p>
                )}
            </div>

            <div className="border-t-4 border-black pt-2 text-xs">
                <p>* Percent Daily Values are based on a 2,000 calorie diet.</p>
            </div>
                </div>
            )}
        </div>
    );
}

export default function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [item, setItem] = useState<ItemDetailT | null>(null);
    const [nutrition, setNutrition] = useState<NutritionT | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [showZoom, setShowZoom] = useState(false);
    const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const fetchedItem = await request(`/api/items/${id}`, get({ decoder: ItemDetail }));
                setItem(fetchedItem);

                // Parse nutrition data
                if (fetchedItem.nutrition_json) {
                    try {
                        const parsedNutrition = JSON.parse(fetchedItem.nutrition_json);
                        setNutrition(parsedNutrition);
                    } catch (e) {
                        console.error('Failed to parse nutrition JSON:', e);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch item:', error);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setZoomPosition({ x, y });
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto p-6 flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-fg-primary mx-auto mb-4"></div>
                    <p className="text-fg-medium">Loading product details...</p>
                </div>
            </div>
        );
    }

    if (error || !item) {
        notFound();
        return null;
    }

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-8">
            {/* Top Section - Image and Product Info Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* Product Image and Video */}
                <div className="space-y-4">
                    <div 
                        className="bg-white rounded-2xl overflow-hidden aspect-square border border-gray-200 -mt-6 relative cursor-crosshair"
                        onMouseEnter={() => setShowZoom(true)}
                        onMouseLeave={() => setShowZoom(false)}
                        onMouseMove={handleMouseMove}
                    >
                        {/* Main Image */}
                        <div className="w-full h-full flex items-center justify-center">
                            {item.image_url ? (
                                item.image_url.startsWith('data:') ? (
                                    // Use regular img tag for base64 images to avoid hydration issues
                                    <img
                                        src={item.image_url}
                                        alt={item.name}
                                        className="w-full h-full object-contain"
                                    />
                                ) : (
                                    <Image
                                        src={item.image_url}
                                        alt={item.name}
                                        width={600}
                                        height={600}
                                        className="w-full h-full object-contain"
                                        priority
                                    />
                                )
                            ) : (
                                <Package className="w-32 h-32 text-fg-medium" />
                            )}
                        </div>

                        {/* Zoomed Image Overlay */}
                        {showZoom && item.image_url && (
                            <div 
                                className="absolute inset-0 pointer-events-none"
                                style={{
                                    backgroundImage: `url(${item.image_url})`,
                                    backgroundSize: '200%',
                                    backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`,
                                    backgroundRepeat: 'no-repeat',
                                }}
                            />
                        )}
                    </div>
                    
                    {/* Product Video */}
                    {item.video_url && (
                        <div className="space-y-3">
                            <h3 className="text-xl font-semibold text-fg-primary">
                                Product Video
                            </h3>
                            <div className="bg-black rounded-2xl overflow-hidden border border-gray-200">
                                {item.video_url.includes('youtube.com/embed') || item.video_url.includes('vimeo.com') ? (
                                    <iframe
                                        src={item.video_url}
                                        className="w-full aspect-video"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                ) : (
                                    <video
                                        src={item.video_url}
                                        controls
                                        className="w-full"
                                        preload="metadata"
                                    >
                                        Your browser does not support the video tag.
                                    </video>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Product Info Card */}
                <div className="bg-bg-light border border-bg-dark rounded-xl p-6 space-y-4">
                    <div>
                        <h1 className="text-3xl font-bold text-fg-dark mb-2">{item.name}</h1>
                        {item.category && (
                            <p className="text-fg-medium text-sm">
                                Category: <span className="font-semibold">{toTitleCase(item.category)}</span>
                            </p>
                        )}
                    </div>

                    {/* Price */}
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-fg-dark">
                            ${(item.price_cents / 100).toFixed(2)}
                        </span>
                        <span className="text-fg-medium text-sm">
                            ({item.weight_oz} oz)
                        </span>
                    </div>

                    {/* Stock Status */}
                    <div className="flex items-center gap-2">
                        <TrendingUp className={`w-5 h-5 ${item.stock_qty > 10 ? 'text-green-500' : 'text-orange-500'}`} />
                        <span className={`font-semibold ${item.stock_qty > 10 ? 'text-green-600' : 'text-orange-600'}`}>
                            {item.stock_qty > 0 ? `${item.stock_qty} in stock` : 'Out of stock'}
                        </span>
                    </div>

                    {/* Description */}
                    {item.description && (
                        <div className="pt-4 border-t border-bg-medium">
                            <h3 className="font-semibold text-fg-dark mb-2">Description</h3>
                            <p className="text-fg-medium leading-relaxed">{item.description}</p>
                        </div>
                    )}

                    {/* Add to Cart Button */}
                    <AddToCartButton item={item} />
                </div>
            </div>

            {/* Bottom Section - Nutrition Facts */}
            <div>
                {nutrition ? (
                    <NutritionLabel nutrition={nutrition} />
                ) : (
                    <div className="bg-bg-light border border-bg-dark rounded-xl p-8 text-center">
                        <p className="text-fg-medium">Nutrition information not available for this item.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

