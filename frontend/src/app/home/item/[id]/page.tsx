import AddToCartButton from '@/components/add_to_cart_button/add_to_cart_button';
import { ItemDetail, ItemDetailT } from '@/lib/api/models';
import { get, request } from '@/lib/api/request';
import * as t from 'io-ts';
import { Package, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import { notFound } from 'next/navigation';

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
    return (
        <div className="bg-white border-2 border-black p-2 font-sans text-sm">
            <div className="border-b-8 border-black pb-1">
                <h2 className="text-3xl font-bold">Nutrition Facts</h2>
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
    );
}

export default async function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const addToCart = () => {

    };

    // Fetch item details
    let item: ItemDetailT;
    try {
        item = await request(`/api/items/${id}`, get({ decoder: ItemDetail }));
    } catch (error) {
        notFound();
    }

    // Parse nutrition data
    let nutrition: NutritionT | null = null;
    if (item.nutrition_json) {
        try {
            nutrition = JSON.parse(item.nutrition_json);
        } catch (e) {
            console.error('Failed to parse nutrition JSON:', e);
        }
    }

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-8">
            {/* Top Section - Image and Product Info Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Product Image */}
                <div className="bg-bg-medium rounded-2xl overflow-hidden aspect-square flex items-center justify-center">
                    {item.image_url ? (
                        <Image
                            src={item.image_url}
                            alt={item.name}
                            width={600}
                            height={600}
                            className="w-full h-full object-cover"
                            priority
                        />
                    ) : (
                        <Package className="w-32 h-32 text-fg-medium" />
                    )}
                </div>

                {/* Product Info Card */}
                <div className="bg-bg-light border border-bg-dark rounded-xl p-6 space-y-4">
                    <div>
                        <h1 className="text-3xl font-bold text-fg-dark mb-2">{item.name}</h1>
                        {item.category && (
                            <p className="text-fg-medium capitalize text-sm">
                                Category: <span className="font-semibold">{item.category}</span>
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

