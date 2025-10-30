# Video Generation Examples & Use Cases

This document provides real-world examples and use cases for AI-powered video generation using Veo 3.1.

## Use Cases for Food Delivery Platform

### 1. Product Hero Videos

Generate eye-catching videos for featured products:

```json
{
  "prompt": "A perfectly ripe avocado cut in half revealing the pit, placed on a wooden cutting board with natural morning light streaming from the left, close-up cinematic shot with shallow depth of field",
  "model": "veo-3.1-generate-preview"
}
```

**Best for**: Homepage hero sections, featured products, premium items

### 2. Social Media Content

Quick videos for Instagram, TikTok, and Twitter:

```json
{
  "prompt": "A hand sprinkling fresh herbs over a colorful salad bowl in slow motion, with the sound of vegetables being tossed, bright and vibrant colors, social media style",
  "model": "veo-3.1-fast-generate-preview"
}
```

**Best for**: Daily posts, stories, reels, quick engagement content

### 3. Category Showcase Videos

Highlight different product categories:

```json
{
  "prompt": "A variety of fresh fruits (strawberries, blueberries, oranges, apples) arranged on a white marble surface, camera slowly rotating around the display, professional food photography style with soft diffused lighting",
  "model": "veo-3.1-generate-preview"
}
```

**Best for**: Category pages, navigation menus, homepage sections

### 4. Seasonal Promotions

Create videos for seasonal campaigns:

```json
{
  "prompt": "A wicker basket filled with autumn harvest vegetables (pumpkins, squash, corn) on a rustic wooden table, warm golden hour lighting, cozy autumn atmosphere, camera slowly zooming in",
  "model": "veo-3.1-fast-generate-preview"
}
```

**Best for**: Seasonal landing pages, holiday promotions, email campaigns

### 5. Recipe Inspiration

Show ingredients or preparation steps:

```json
{
  "prompt": "Fresh pasta ingredients laid out on a kitchen counter: flour mound with eggs in the center, rolling pin, and herbs, overhead shot, natural window light, Italian cooking documentary style",
  "model": "veo-3.1-generate-preview"
}
```

**Best for**: Recipe pages, cooking guides, meal kit promotions

### 6. A/B Testing Creative

Quickly test different video concepts:

```json
{
  "prompt": "A glass of fresh orange juice with ice cubes being poured from above, citrus fruits in the background, bright and refreshing atmosphere, beverage commercial style",
  "model": "veo-3.1-fast-generate-preview"
}
```

**Best for**: Ad testing, conversion optimization, user research

## Prompt Templates by Product Type

### Fruits

```
"A {fruit_name} {action} on a {surface}, {lighting}, {camera_movement}, {style}"

Examples:
- "A juicy red apple rotating slowly on a white pedestal, soft studio lighting, camera circling the subject, clean product photography style"
- "Three ripe peaches with water droplets on them sitting on a rustic wooden board, golden hour sunlight, static shot, farm-fresh aesthetic"
```

### Vegetables

```
"Fresh {vegetable} {arrangement}, {environment}, {lighting}, {style}"

Examples:
- "Fresh kale leaves being washed under running water with droplets splashing, close-up shot, natural lighting, healthy lifestyle commercial style"
- "A bundle of organic carrots with dirt and green tops on a farmer's market stall, afternoon sunlight, camera panning across, authentic farm-to-table style"
```

### Prepared Foods

```
"{Dish} {presentation}, {action}, {atmosphere}, {style}"

Examples:
- "A steaming bowl of ramen with chopsticks picking up noodles, wisps of steam rising, warm restaurant lighting, cozy food vlog style"
- "A chef's hand drizzling olive oil over a fresh caprese salad, basil leaves and tomatoes glistening, professional kitchen setting, culinary show style"
```

### Beverages

```
"{Beverage} being {action}, {vessel}, {environment}, {style}"

Examples:
- "Cold brew coffee being poured over ice in a glass, condensation forming on the glass, minimalist white background, modern beverage advertisement style"
- "A smoothie blender in action with colorful fruits visible, then a perfect smoothie in a glass with a straw, kitchen countertop, health and wellness style"
```

## Advanced Prompt Techniques

### 1. Adding Dialogue

Veo 3.1 can generate dialogue in videos:

```json
{
  "prompt": "Two people at a farmer's market stall, one person picking up a tomato and saying 'These look so fresh!', the vendor smiling and responding 'Picked this morning!', natural outdoor market sounds, documentary style",
  "model": "veo-3.1-generate-preview"
}
```

### 2. Sound Effects

Specify desired sound effects:

```json
{
  "prompt": "A chef's knife slicing through a fresh bell pepper on a wooden cutting board, with the crisp sound of knife hitting the board, close-up shot, professional kitchen lighting",
  "model": "veo-3.1-generate-preview"
}
```

### 3. Cinematic Styles

Reference film or photography styles:

```json
{
  "prompt": "A rustic loaf of artisan bread on a wooden cutting board with flour dust in the air, shot in the style of a Kinfolk magazine photo shoot, soft natural light, shallow depth of field, warm earth tones",
  "model": "veo-3.1-generate-preview"
}
```

### 4. Camera Movements

Specify different camera techniques:

```json
{
  "prompt": "A table filled with various Mediterranean dishes (hummus, falafel, pita, olives), camera slowly tracking from left to right, overhead shot, restaurant ambiance, food travel show style",
  "model": "veo-3.1-generate-preview"
}
```

### 5. Time-Based Effects

Create slow motion or time-lapse effects:

```json
{
  "prompt": "A strawberry falling into a bowl of cream in extreme slow motion, splash creating a crown effect, white background, high-speed photography style, with the sound of the splash",
  "model": "veo-3.1-generate-preview"
}
```

## Workflow Examples

### Daily Social Media Content

Generate a week's worth of content:

```python
daily_prompts = [
    "Monday: A steaming cup of coffee with latte art on a cafe table, morning sunlight, cozy atmosphere",
    "Tuesday: Fresh tacos being assembled with colorful toppings, street food style, vibrant energy",
    "Wednesday: A Buddha bowl with colorful vegetables being drizzled with dressing, healthy living aesthetic",
    "Thursday: Pasta being twirled on a fork, close-up shot, Italian restaurant ambiance",
    "Friday: Champagne being poured into glasses, celebration atmosphere, weekend vibes",
    "Saturday: BBQ ribs being brushed with sauce on a grill, backyard party setting, summer cookout style",
    "Sunday: A stack of pancakes with syrup being poured, cozy breakfast at home, family brunch atmosphere"
]

for day_prompt in daily_prompts:
    response = generate_video_sync(prompt=day_prompt, model="veo-3.1-fast-generate-preview")
    # Save for scheduled posting
```

### A/B Test Campaign

Test multiple creative approaches:

```python
variations = [
    {
        "name": "Lifestyle",
        "prompt": "Happy family eating fresh salad together at dinner table, warm home atmosphere, lifestyle commercial style"
    },
    {
        "name": "Product Focus",
        "prompt": "Close-up of crisp lettuce leaves in a glass bowl, water droplets glistening, clean product shot, commercial style"
    },
    {
        "name": "Action",
        "prompt": "Hands tearing fresh lettuce into a salad bowl, kitchen sounds, cooking tutorial style"
    }
]

for variation in variations:
    video = generate_video_sync(
        prompt=variation["prompt"],
        model="veo-3.1-fast-generate-preview"
    )
    # Run ad test with this variation
```

### Seasonal Campaign

Create a complete seasonal video set:

```python
fall_campaign = {
    "hero": "Autumn harvest vegetables in a wooden crate, falling leaves in background, warm golden light, farm-fresh story",
    "category_produce": "Pumpkins and squash displayed at a farmer's market, rustic setting, harvest season atmosphere",
    "category_prepared": "A bowl of butternut squash soup with sage garnish, steam rising, cozy fall dinner setting",
    "social_teaser": "Cinnamon stick falling into a cup of apple cider, close-up, autumn comfort vibes"
}

for video_type, prompt in fall_campaign.items():
    video = generate_video_sync(
        prompt=prompt,
        model="veo-3.1-generate-preview"  # Use best quality for campaign
    )
    # Save with naming convention
```

## Quality Tips

### Getting the Best Results

1. **Use Standard Model for Final Content**
   - Use `veo-3.1-generate-preview` for marketing campaigns
   - Use `veo-3.1-fast-generate-preview` for testing and social media

2. **Iterate on Prompts**
   - Start broad, then add specific details
   - Test multiple variations
   - Keep what works, refine what doesn't

3. **Focus on Lighting**
   - "soft diffused lighting" - gentle and flattering
   - "golden hour sunlight" - warm and inviting
   - "studio lighting" - professional and clean
   - "natural window light" - authentic and real

4. **Specify Camera Work**
   - "close-up shot" - detail focus
   - "overhead shot" - shows full scene
   - "slowly rotating around" - dynamic movement
   - "tracking left to right" - smooth pan
   - "zooming in gradually" - builds focus

5. **Add Context and Style**
   - Include the setting (kitchen, market, restaurant)
   - Reference visual styles (commercial, documentary, lifestyle)
   - Mention atmosphere (cozy, vibrant, professional)

### Common Mistakes to Avoid

❌ **Too Vague**: "A video about food"
✅ **Specific**: "A chef's hand placing basil leaves on a margherita pizza, close-up, with kitchen sounds"

❌ **Too Complex**: "Ten different dishes rotating while someone dances and fireworks explode"
✅ **Focused**: "A bowl of pasta being twirled on a fork, close-up shot, Italian restaurant setting"

❌ **No Audio Guidance**: "A person cooking"
✅ **With Audio**: "A person dicing vegetables with the sound of knife hitting cutting board"

❌ **Unrealistic**: "A flying hamburger in space"
✅ **Realistic**: "A hamburger rotating on a plate, studio lighting, commercial product shot"

## Performance Benchmarks

Based on testing:

| Model | Avg Generation Time | Quality Rating | Cost | Best For |
|-------|-------------------|----------------|------|----------|
| veo-3.1-generate-preview | 45-60s | ★★★★★ | $0.15 | Hero videos, campaigns |
| veo-3.1-fast-generate-preview | 25-35s | ★★★★☆ | $0.10 | Social media, testing |

## Examples by Video Length Perception

Even though all videos are 8 seconds, you can create different pacing:

### Fast-Paced (Lots of Action)
```json
{
  "prompt": "Ingredients for a salad being tossed into a bowl quickly one after another - lettuce, tomatoes, cucumber, olives - energetic cooking show style",
  "model": "veo-3.1-fast-generate-preview"
}
```

### Slow-Paced (Calm and Elegant)
```json
{
  "prompt": "Honey slowly drizzling from a wooden dipper onto a piece of toast, extreme close-up, soft morning light, zen-like peaceful atmosphere",
  "model": "veo-3.1-generate-preview"
}
```

### Medium-Paced (Balanced)
```json
{
  "prompt": "A barista pouring steamed milk into a coffee cup creating latte art, medium shot, coffee shop background, professional but relaxed atmosphere",
  "model": "veo-3.1-fast-generate-preview"
}
```

## Integration Patterns

### Pattern 1: On-Demand Generation
```
User requests video → Generate immediately → Return video
Best for: Admin tools, content creation dashboards
```

### Pattern 2: Pre-Generation
```
Batch generate videos → Store in database → Serve on demand
Best for: Product catalogs, featured content
```

### Pattern 3: Scheduled Generation
```
Cron job generates daily videos → Posts to social media
Best for: Social media automation, content calendars
```

### Pattern 4: User-Triggered Generation
```
Admin creates product → Auto-generate product video → Save with product
Best for: Inventory management, product onboarding
```

## Next Steps

1. **Start Simple**: Try the example prompts to understand the model
2. **Build a Prompt Library**: Save successful prompts for reuse
3. **A/B Test**: Compare different styles to see what converts
4. **Scale Gradually**: Start with hero content, expand to categories
5. **Monitor Costs**: Track generation costs and ROI

## Resources

- [Video API Documentation](VIDEO_API.md) - Complete API reference
- [Setup Guide](../../docs/SETUP_AI_VIDEO_GENERATION.md) - Installation and configuration
- [Veo Prompt Guide](https://ai.google.dev/gemini-api/docs/prompting-video) - Official prompt engineering tips

## Contributing

Have a great prompt or use case? Consider documenting it here to help the team!

