// Static product catalogue (frontend-only build; no database).
import type { Product, ProductVariant, Order } from '@/types';

const TS = '2025-01-01T00:00:00.000Z';

function variant(
  id: string,
  product_id: string,
  name: string,
  sku: string,
  pack_size: number,
  price_paise: number,
  compare_at_price_paise: number,
  stock_quantity: number
): ProductVariant {
  return { id, product_id, name, sku, pack_size, price_paise, compare_at_price_paise, stock_quantity, is_active: 1, created_at: TS, updated_at: TS };
}

export const products: Product[] = [
  {
    id: 'prod_mango_01',
    name: 'mi-biotics™ Fermented Millet Gut Shot - Alphonso Mango',
    slug: 'mibiotics-mango',
    tagline: 'Patented fermented multi-millet gut shot with real Alphonso mango',
    description: 'mi-biotics™ is a chilled, fermented multi-millet gut shot (75ml) designed for daily microbiome health. Made from real Alphonso mangoes and a fermented multi-millet base of bajra, jowar, and ragi: dairy-free, clean-label, and zero preservatives. Contains clinically researched LGG® and Wellmune® bio-actives, independently validated by AMILI Singapore.',
    flavor: 'Alphonso Mango',
    category: 'Gut Shot',
    image_url: '/images/products/mibiotics-mango.png',
    gallery_json: '["/images/products/mibiotics-mango.png", "/images/products/mibiotics-render.jpg"]',
    ingredients: 'Fermented Multi-Millet Matrix (Bajra / Pearl Millet, Jowar / Sorghum, Ragi / Finger Millet), Real Alphonso Mango Puree, Filtered Water, LGG® (Lacticaseibacillus rhamnosus GG by Chr. Hansen), Wellmune® (Yeast Beta Glucan by Kerry), Natural Spices. No dairy. No added sugar. No preservatives. No artificial additives.',
    nutrition_json: '{"serving_size": "75 ml", "energy_kcal": 42, "carbohydrates_g": 8.5, "naturally_occurring_sugars_g": 4.1, "added_sugars_g": 0, "protein_g": 1.2, "dietary_fiber_g": 1.8, "fat_g": 0.2, "lgg_probiotics": "10+ Billion CFU", "wellmune_beta_glucan_mg": 250}',
    usage_instructions: 'Drink 1 chilled shot (75ml) once a day whenever it fits your routine. Shake well before drinking. Keep refrigerated at 2°C to 8°C.',
    is_active: 1,
    is_verified_price: 1,
    created_at: TS,
    updated_at: TS,
    variants: [
      variant('var_mango_6p', 'prod_mango_01', '6-Pack (6 × 75ml) - Starter', 'RETU-MB-MNG-6P', 6, 54000, 60000, 60),
      variant('var_mango_12p', 'prod_mango_01', '12-Pack (12 × 75ml) - 2 Weeks', 'RETU-MB-MNG-12P', 12, 102000, 120000, 45),
      variant('var_mango_24p', 'prod_mango_01', '24-Pack (24 × 75ml) - Monthly Protocol', 'RETU-MB-MNG-24P', 24, 192000, 240000, 30),
    ],
  },
  {
    id: 'prod_lychee_02',
    name: 'mi-biotics™ Fermented Millet Gut Shot - Lychee',
    slug: 'mibiotics-lychee',
    tagline: 'Crisp floral lychee notes infused into our patented fermented millet matrix',
    description: 'Clean, delicate real lychee combined with living cultures from our patented fermentation process. Zero lactose, zero gluten-containing grains, no added sugar, and high concentration of short-chain fatty acid precursors.',
    flavor: 'Lychee',
    category: 'Gut Shot',
    image_url: '/images/products/mibiotics-render.jpg',
    gallery_json: '["/images/products/mibiotics-render.jpg", "/images/products/mibiotics-mango.png"]',
    ingredients: 'Fermented Multi-Millet Matrix (Bajra, Jowar, Ragi), Real Lychee Puree, Filtered Water, LGG® (Chr. Hansen), Wellmune® (Kerry), Natural Spices. 100% plant-based, clean-label.',
    nutrition_json: '{"serving_size": "75 ml", "energy_kcal": 39, "carbohydrates_g": 7.8, "naturally_occurring_sugars_g": 3.8, "added_sugars_g": 0, "protein_g": 1.1, "dietary_fiber_g": 1.6, "fat_g": 0.1, "lgg_probiotics": "10+ Billion CFU", "wellmune_beta_glucan_mg": 250}',
    usage_instructions: 'Drink 1 chilled shot (75ml) daily. Shake well before drinking. Keep refrigerated at 2°C to 8°C.',
    is_active: 1,
    is_verified_price: 1,
    created_at: TS,
    updated_at: TS,
    variants: [
      variant('var_lychee_6p', 'prod_lychee_02', '6-Pack (6 × 75ml) - Starter', 'RETU-MB-LYC-6P', 6, 54000, 60000, 50),
      variant('var_lychee_12p', 'prod_lychee_02', '12-Pack (12 × 75ml) - 2 Weeks', 'RETU-MB-LYC-12P', 12, 102000, 120000, 35),
      variant('var_lychee_24p', 'prod_lychee_02', '24-Pack (24 × 75ml) - Monthly Protocol', 'RETU-MB-LYC-24P', 24, 192000, 240000, 25),
    ],
  },
  {
    id: 'prod_duo_03',
    name: 'mi-biotics™ Discovery Duo Pack (Mango + Lychee)',
    slug: 'mibiotics-discovery-duo',
    tagline: 'Experience both launch flavours in a single variety box',
    description: 'The optimal discovery box containing an even split of Alphonso Mango and Lychee 75ml bottles. Enjoy the variety of whole-food fruit tastes while receiving the identical patented fermented multi-millet therapeutic dosage.',
    flavor: 'Mango & Lychee Variety',
    category: 'Variety Pack',
    image_url: '/images/products/mibiotics-mango.png',
    gallery_json: '["/images/products/mibiotics-mango.png", "/images/products/mibiotics-render.jpg"]',
    ingredients: 'Combination of mi-biotics™ Alphonso Mango and Lychee bottles. 100% dairy-free, live fermented cultures, LGG®, Wellmune®.',
    nutrition_json: '{"serving_size": "75 ml", "energy_kcal": 40.5, "carbohydrates_g": 8.1, "naturally_occurring_sugars_g": 3.9, "added_sugars_g": 0, "protein_g": 1.15, "dietary_fiber_g": 1.7, "fat_g": 0.15, "lgg_probiotics": "10+ Billion CFU per bottle", "wellmune_beta_glucan_mg": 250}',
    usage_instructions: 'Drink 1 chilled shot (75ml) daily. Shake well before drinking. Keep refrigerated at 2°C to 8°C.',
    is_active: 1,
    is_verified_price: 1,
    created_at: TS,
    updated_at: TS,
    variants: [
      variant('var_duo_6p', 'prod_duo_03', '6-Pack Duo (3 Mango + 3 Lychee)', 'RETU-MB-DUO-6P', 6, 54000, 60000, 75),
      variant('var_duo_12p', 'prod_duo_03', '12-Pack Duo (6 Mango + 6 Lychee)', 'RETU-MB-DUO-12P', 12, 102000, 120000, 50),
    ],
  },
];

export async function getAllProducts(_includeInactive = false): Promise<Product[]> {
  return products;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  return products.find((p) => p.slug === slug) ?? null;
}

// No order storage without a backend.
export async function getOrderByReference(_reference: string): Promise<Order | null> {
  return null;
}

export async function getInvoiceByOrderId(_orderId: string): Promise<{ invoice_number: string } | null> {
  return null;
}
