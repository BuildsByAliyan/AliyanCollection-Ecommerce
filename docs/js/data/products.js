/* =====================================================================
   js/data/products.js
   Aliyan Collection - ALL products live ONLY in this file.
   Add / edit / remove a product here and every page updates by itself
   (home, shop pages, product page, search, wishlist, cart).
   ---------------------------------------------------------------------
   Load order: config.js  ->  data/products.js  ->  core/*.js ...
   Plain script -> exposes  window.AliyanProducts  (and window.PRODUCTS).

   Each product:
     id             unique id, first letter = category (M men, W women, K kids)
     name           title shown on cards / product page
     category       'men' | 'women' | 'kids'
     price          current price (number)
     originalPrice  price before discount (same as price when no discount)
     (discount %    is NOT stored - clean() below computes discountPercent from price and originalPrice)
     sku            stock code
     image          path from the docs/ folder (use AliyanConfig.url() to show it)
     onSale         true = SALE tag on cards
     condition      'new' | 'pre-owned'
     dateAdded      'YYYY-MM-DD'  (used by "Newest / Oldest" sorting)

   OPTIONAL fields - the product page shows them ONLY when they are here
   (nothing is invented; leave them out and that part simply is not shown):
     rating         number 0-5, e.g. 4.5      (needs reviewCount too)
     reviewCount    number of real reviews, e.g. 12
     stock          number in stock; 0 = "Out of Stock" (Add to Cart is disabled)
     sizes          e.g. ['S','M','L','XL','XXL']  (default: XS-XL clothes, EU sizes for shoes)
     reviews        [{ name: 'Sara', rating: 5, text: 'Great quality.' }]  -> shows a Reviews tab

   HOW TO ADD A PRODUCT:  copy one line below, change the values, and put
   the picture in assets/images/products/<category>/.
   ===================================================================== */
(function (global) {
    'use strict';

    var PRODUCTS = [

        /* ---------- MEN ---------- */
        { id: 'M-101', name: 'Slim Fit Denim Jeans', category: 'men', price: 95.00, originalPrice: 95.00, sku: 'ALYM-JN101',
          image: 'assets/images/products/men/men-slim-fit-denim-jeans.jpg',
          onSale: false, condition: 'new', dateAdded: '2026-09-03' },
        { id: 'M-102', name: 'Classic Black Suit', category: 'men', price: 219.00, originalPrice: 280.00, sku: 'ALYM-ST102',
          image: 'assets/images/products/men/men-classic-black-suit.jpg',
          onSale: true, condition: 'new', dateAdded: '2026-09-05' },
        { id: 'M-103', name: 'Leather Biker Jacket', category: 'men', price: 180.00, originalPrice: 180.00, sku: 'ALYM-JK103',
          image: 'assets/images/products/men/men-leather-biker-jacket.jpg',
          onSale: false, condition: 'pre-owned', dateAdded: '2026-08-29' },
        { id: 'M-105', name: 'Running Sneakers', category: 'men', price: 110.00, originalPrice: 110.00, sku: 'ALYM-SN105',
          image: 'assets/images/products/men/men-running-sneakers.jpg',
          onSale: false, condition: 'new', dateAdded: '2026-09-01' },
        { id: 'M-106', name: 'Digital Watch', category: 'men', price: 85.00, originalPrice: 85.00, sku: 'ALYM-WT106',
          image: 'assets/images/products/men/men-digital-watch.jpg',
          onSale: false, condition: 'new', dateAdded: '2026-09-12' },
        { id: 'M-107', name: 'Wool Scarf', category: 'men', price: 50.00, originalPrice: 50.00, sku: 'ALYM-SF107',
          image: 'assets/images/products/men/men-wool-scarf.jpg',
          onSale: false, condition: 'new', dateAdded: '2026-09-14' },
        { id: 'M-109', name: 'Cargo Trousers', category: 'men', price: 75.00, originalPrice: 75.00, sku: 'ALYM-TR109',
          image: 'assets/images/products/men/men-cargo-trousers.jpg',
          onSale: false, condition: 'new', dateAdded: '2026-09-18' },
        { id: 'M-110', name: 'Smart Dress Shirt', category: 'men', price: 65.00, originalPrice: 80.00, sku: 'ALYM-DS110',
          image: 'assets/images/products/men/men-smart-dress-shirt.jpg',
          onSale: true, condition: 'new', dateAdded: '2026-09-15' },
        { id: 'M-111', name: 'Formal Leather Shoes', category: 'men', price: 130.00, originalPrice: 130.00, sku: 'ALYM-SH111',
          image: 'assets/images/products/men/men-formal-leather-shoes.jpg',
          onSale: false, condition: 'new', dateAdded: '2026-08-24' },
        { id: 'M-113', name: 'Hooded Sweatshirt', category: 'men', price: 70.00, originalPrice: 70.00, sku: 'ALYM-SW113',
          image: 'assets/images/products/men/men-hooded-sweatshirt.jpg',
          onSale: false, condition: 'pre-owned', dateAdded: '2026-08-15' },
        { id: 'M-115', name: 'Denim Vest', category: 'men', price: 60.00, originalPrice: 60.00, sku: 'ALYM-VT115',
          image: 'assets/images/products/men/men-denim-vest.jpg',
          onSale: false, condition: 'new', dateAdded: '2026-09-11' },
        { id: 'M-116', name: 'Designer Sunglasses', category: 'men', price: 150.00, originalPrice: 150.00, sku: 'ALYM-SG116',
          image: 'assets/images/products/men/men-designer-sunglasses.jpg',
          onSale: false, condition: 'new', dateAdded: '2026-08-23' },
        { id: 'M-117', name: 'V-Neck Sweater', category: 'men', price: 80.00, originalPrice: 80.00, sku: 'ALYM-SW117',
          image: 'assets/images/products/men/men-v-neck-sweater.jpg',
          onSale: false, condition: 'new', dateAdded: '2026-09-09' },
        { id: 'M-118', name: 'Plaid Flannel Shirt', category: 'men', price: 55.00, originalPrice: 55.00, sku: 'ALYM-FS118',
          image: 'assets/images/products/men/men-plaid-flannel-shirt.jpg',
          onSale: false, condition: 'new', dateAdded: '2026-09-20' },
        { id: 'M-119', name: 'Winter Coat', category: 'men', price: 245.00, originalPrice: 245.00, sku: 'ALYM-CT119',
          image: 'assets/images/products/men/men-winter-coat.jpg',
          onSale: false, condition: 'new', dateAdded: '2026-08-17' },

        /* ---------- WOMEN ---------- */
        { id: 'W-101', name: 'Elegant Silk Scarf', category: 'women', price: 65.00, originalPrice: 65.00, sku: 'ALYW-SF101',
          image: 'assets/images/products/women/women-elegant-silk-scarf.jpg',
          onSale: false, condition: 'new', dateAdded: '2026-09-03' },
        { id: 'W-102', name: 'High-Waist Jeans', category: 'women', price: 80.00, originalPrice: 100.00, sku: 'ALYW-JN102',
          image: 'assets/images/products/women/women-high-waist-jeans.jpg',
          onSale: true, condition: 'new', dateAdded: '2026-09-05' },
        { id: 'W-103', name: 'Leather Handbag', category: 'women', price: 150.00, originalPrice: 150.00, sku: 'ALYW-HB103',
          image: 'assets/images/products/women/women-leather-handbag.jpg',
          onSale: false, condition: 'new', dateAdded: '2026-08-29' },
        { id: 'W-104', name: 'Cashmere Sweater', category: 'women', price: 120.00, originalPrice: 120.00, sku: 'ALYW-SW104',
          image: 'assets/images/products/women/women-cashmere-sweater.jpg',
          onSale: false, condition: 'new', dateAdded: '2026-09-08' },
        { id: 'W-105', name: 'Pencil Skirt', category: 'women', price: 55.00, originalPrice: 55.00, sku: 'ALYW-SK105',
          image: 'assets/images/products/women/women-pencil-skirt.jpg',
          onSale: false, condition: 'new', dateAdded: '2026-09-01' },
        { id: 'W-106', name: 'Strappy Heels', category: 'women', price: 90.00, originalPrice: 120.00, sku: 'ALYW-SH106',
          image: 'assets/images/products/women/women-strappy-heels.jpg',
          onSale: true, condition: 'new', dateAdded: '2026-09-12' },
        { id: 'W-107', name: 'Trench Coat', category: 'women', price: 220.00, originalPrice: 220.00, sku: 'ALYW-CT107',
          image: 'assets/images/products/women/women-trench-coat.jpg',
          onSale: false, condition: 'new', dateAdded: '2026-09-14' },
        { id: 'W-108', name: 'Statement Necklace', category: 'women', price: 79.99, originalPrice: 99.99, sku: 'ALYW-JW108',
          image: 'assets/images/products/women/women-statement-necklace.jpg',
          onSale: true, condition: 'new', dateAdded: '2026-08-19' },
        { id: 'W-109', name: 'Midi Dress', category: 'women', price: 99.00, originalPrice: 99.00, sku: 'ALYW-D109',
          image: 'assets/images/products/women/women-midi-dress.jpg',
          onSale: false, condition: 'new', dateAdded: '2026-09-18' },
        { id: 'W-110', name: 'Stiletto Boots', category: 'women', price: 110.00, originalPrice: 110.00, sku: 'ALYW-BT110',
          image: 'assets/images/products/women/women-stiletto-boots.jpg',
          onSale: false, condition: 'new', dateAdded: '2026-09-15' },
        { id: 'W-111', name: 'Casual Cotton Tee', category: 'women', price: 30.00, originalPrice: 30.00, sku: 'ALYW-TS111',
          image: 'assets/images/products/women/women-casual-cotton-tee.jpg',
          onSale: false, condition: 'new', dateAdded: '2026-08-24' },
        { id: 'W-112', name: 'Diamond Earrings', category: 'women', price: 239.20, originalPrice: 299.00, sku: 'ALYW-JW112',
          image: 'assets/images/products/women/women-diamond-earrings.jpg',
          onSale: true, condition: 'new', dateAdded: '2026-08-26' },
        { id: 'W-113', name: 'Yoga Leggings', category: 'women', price: 45.00, originalPrice: 45.00, sku: 'ALYW-AT113',
          image: 'assets/images/products/women/women-yoga-leggings.jpg',
          onSale: false, condition: 'new', dateAdded: '2026-09-21' },
        { id: 'W-114', name: 'Denim Jacket', category: 'women', price: 135.00, originalPrice: 135.00, sku: 'ALYW-JK114',
          image: 'assets/images/products/women/women-denim-jacket.jpg',
          onSale: false, condition: 'new', dateAdded: '2026-09-20' },
        { id: 'W-115', name: 'Maxi Skirt', category: 'women', price: 70.00, originalPrice: 70.00, sku: 'ALYW-SK115',
          image: 'assets/images/products/women/women-maxi-skirt.jpg',
          onSale: false, condition: 'new', dateAdded: '2026-09-11' },
        { id: 'W-116', name: 'Silk Blouse', category: 'women', price: 85.00, originalPrice: 85.00, sku: 'ALYW-BL116',
          image: 'assets/images/products/women/women-silk-blouse.jpg',
          onSale: false, condition: 'new', dateAdded: '2026-08-23' },
        { id: 'W-117', name: 'Puffer Vest', category: 'women', price: 115.00, originalPrice: 115.00, sku: 'ALYW-VT117',
          image: 'assets/images/products/women/women-puffer-vest.jpg',
          onSale: false, condition: 'new', dateAdded: '2026-09-09' },
        { id: 'W-118', name: 'Slip Dress', category: 'women', price: 105.00, originalPrice: 105.00, sku: 'ALYW-D118',
          image: 'assets/images/products/women/women-slip-dress.jpg',
          onSale: false, condition: 'new', dateAdded: '2026-08-17' },
        { id: 'W-119', name: 'Hoop Earrings', category: 'women', price: 40.00, originalPrice: 50.00, sku: 'ALYW-JW119',
          image: 'assets/images/products/women/women-hoop-earrings.jpg',
          onSale: true, condition: 'new', dateAdded: '2026-08-26' },
        { id: 'W-120', name: 'Wide-Leg Trousers', category: 'women', price: 95.00, originalPrice: 95.00, sku: 'ALYW-TR120',
          image: 'assets/images/products/women/women-wide-leg-trousers.jpg',
          onSale: false, condition: 'new', dateAdded: '2026-08-15' },

        /* ---------- KIDS ---------- */
        { id: 'K-001', name: 'Dinosaur Hooded Jumper', category: 'kids', price: 65.00, originalPrice: 65.00, sku: 'ALYK-HJ001',
          image: 'assets/images/products/kids/kids-dinosaur-hooded-jumper.jpg',
          onSale: false, condition: 'new', dateAdded: '2026-10-15' },
        { id: 'K-002', name: 'Girl\'s Summer Dress', category: 'kids', price: 55.00, originalPrice: 70.00, sku: 'ALYK-DS002',
          image: 'assets/images/products/kids/kids-girls-summer-dress.jpg',
          onSale: true, condition: 'new', dateAdded: '2026-10-08' },
        { id: 'K-003', name: 'Toddler Denim Overalls', category: 'kids', price: 75.00, originalPrice: 75.00, sku: 'ALYK-OA003',
          image: 'assets/images/products/kids/kids-toddler-denim-overalls.jpg',
          onSale: false, condition: 'pre-owned', dateAdded: '2026-10-19' },
        { id: 'K-004', name: 'Sports Sneakers (Youth)', category: 'kids', price: 90.00, originalPrice: 100.00, sku: 'ALYK-SN004',
          image: 'assets/images/products/kids/kids-sports-sneakers-youth.jpg',
          onSale: true, condition: 'new', dateAdded: '2026-10-03' },
        { id: 'K-006', name: 'Ballet Flats', category: 'kids', price: 50.00, originalPrice: 50.00, sku: 'ALYK-BF006',
          image: 'assets/images/products/kids/kids-ballet-flats.jpg',
          onSale: false, condition: 'new', dateAdded: '2026-09-28' },
        { id: 'K-007', name: 'Winter Puffer Jacket', category: 'kids', price: 120.00, originalPrice: 120.00, sku: 'ALYK-PJ007',
          image: 'assets/images/products/kids/kids-winter-puffer-jacket.jpg',
          onSale: false, condition: 'new', dateAdded: '2026-10-01' },
        { id: 'K-011', name: 'Rain Boots', category: 'kids', price: 60.00, originalPrice: 60.00, sku: 'ALYK-RB011',
          image: 'assets/images/products/kids/kids-rain-boots.jpg',
          onSale: false, condition: 'new', dateAdded: '2026-09-23' },
        { id: 'K-012', name: 'Little Princess Skirt', category: 'kids', price: 70.00, originalPrice: 70.00, sku: 'ALYK-SK012',
          image: 'assets/images/products/kids/kids-little-princess-skirt.jpg',
          onSale: false, condition: 'new', dateAdded: '2026-10-22' },
        { id: 'K-013', name: 'Adventure Backpack', category: 'kids', price: 85.00, originalPrice: 85.00, sku: 'ALYK-BP013',
          image: 'assets/images/products/kids/kids-adventure-backpack.jpg',
          onSale: false, condition: 'new', dateAdded: '2026-09-18' }
    ];

    /* ------------------------- Helpers ------------------------- */

    var CATEGORY_LABELS = { men: 'Men', women: 'Women', kids: 'Kids' };

    function clean(p) {
        // computed extras so other scripts never have to calculate them
        p.discountPercent = p.originalPrice > p.price
            ? Math.round((1 - p.price / p.originalPrice) * 100)
            : 0;
        p.timestamp = new Date(p.dateAdded + 'T00:00:00Z').getTime() || 0;
        p.categoryLabel = CATEGORY_LABELS[p.category] || '';
        return Object.freeze(p);
    }

    PRODUCTS.forEach(clean);

    var BY_ID = {};
    PRODUCTS.forEach(function (p) { BY_ID[String(p.id).toUpperCase()] = p; });

    var API = {
        /* every product (read-only array) */
        all: Object.freeze(PRODUCTS.slice()),

        categories: Object.freeze(Object.keys(CATEGORY_LABELS)),
        categoryLabels: Object.freeze(CATEGORY_LABELS),

        /* getById('M-101') -> product or null */
        getById: function (id) {
            if (id === undefined || id === null) { return null; }
            return BY_ID[String(id).trim().toUpperCase()] || null;
        },

        /* getByIds(['M-101','W-101']) or getByIds('M-101,W-101') -> products in that order */
        getByIds: function (ids) {
            if (typeof ids === 'string') { ids = ids.split(','); }
            return (ids || [])
                .map(function (id) { return API.getById(id); })
                .filter(Boolean);
        },

        /* getByCategory('men') -> array ('all' or empty returns everything) */
        getByCategory: function (category) {
            if (!category || category === 'all') { return PRODUCTS.slice(); }
            category = String(category).toLowerCase();
            if (category === 'man' || category === 'mens') { category = 'men'; }
            if (category === 'woman' || category === 'womens') { category = 'women'; }
            return PRODUCTS.filter(function (p) { return p.category === category; });
        },

        /* search('silk') -> products whose name / sku / category match every word */
        search: function (text) {
            var words = String(text || '').toLowerCase().split(/\s+/).filter(Boolean);
            if (!words.length) { return []; }
            return PRODUCTS.filter(function (p) {
                var hay = (p.name + ' ' + p.sku + ' ' + p.categoryLabel + ' ' + p.condition).toLowerCase();
                return words.every(function (w) { return hay.indexOf(w) !== -1; });
            });
        },

        /* getRelated(product, 4) -> other products of the same category */
        getRelated: function (product, limit) {
            if (!product) { return []; }
            var list = PRODUCTS.filter(function (p) {
                return p.category === product.category && p.id !== product.id;
            });
            // same condition / on-sale items first, then the rest
            list.sort(function (a, b) {
                var sa = (a.onSale === product.onSale ? 1 : 0) + (a.condition === product.condition ? 1 : 0);
                var sb = (b.onSale === product.onSale ? 1 : 0) + (b.condition === product.condition ? 1 : 0);
                return sb - sa || b.timestamp - a.timestamp;
            });
            return list.slice(0, limit || 4);
        },

        /* getPriceRange('men') -> { min: 20, max: 245 } (whole dollars) */
        getPriceRange: function (category) {
            var list = API.getByCategory(category);
            if (!list.length) { return { min: 0, max: 0 }; }
            var prices = list.map(function (p) { return p.price; });
            return {
                min: Math.floor(Math.min.apply(null, prices)),
                max: Math.ceil(Math.max.apply(null, prices))
            };
        }
    };

    global.AliyanProducts = Object.freeze(API);
    global.PRODUCTS = API.all;          // short alias

})(window);
