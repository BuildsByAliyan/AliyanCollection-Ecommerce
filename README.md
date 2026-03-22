<div align="center">

# 🛍️ ALIYAN COLLECTION

### *Where Style Meets Sophistication — Fashion for the Whole Family*

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Visit_Website-black?style=for-the-badge)](https://buildsbyaliyan.github.io/AliyanCollection-Ecommerce/)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![GitHub Pages](https://img.shields.io/badge/Hosted_on-GitHub_Pages-181717?style=for-the-badge&logo=github)](https://pages.github.com/)

</div>

---

## 📖 Project Overview

**Aliyan Collection** is a fully responsive, multi-page e-commerce fashion website designed for a modern clothing brand. It offers a clean, minimalist, and premium shopping experience for Men, Women, and Kids — bringing an upscale boutique feel directly to the browser.

The website features a cinematic intro animation, smooth navigation, a fully functional shopping cart with persistent local storage, a wishlist system, product filtering, and multiple supporting pages — all built using pure HTML, CSS, and Vanilla JavaScript with zero frameworks.

> 💡 Built as a complete frontend e-commerce solution — no backend required, deployable anywhere.

---

## ✨ Features

### 🛒 Shopping Experience
- **Add to Cart** — Add products with one click; cart persists across sessions via `localStorage`
- **Sliding Cart Panel** — Smooth side-drawer cart with item quantity controls and real-time total
- **Wishlist System** — Save favourite products; wishlist also persists via `localStorage`
- **Order Placement Page** — Dedicated order form for checkout flow

### 👗 Product Categories
- **Men's Wear** — Full collection page (`mens.html`) with curated clothing
- **Women's Wear** — Dedicated women's category (`women.html`) with product grid
- **Kids' Wear** — Separate kids section (`kids.html`) for children's clothing
- **Special Sales Section** — Highlighted promotional banner on homepage

### 🎬 Visual & UX Design
- **Cinematic Intro Screen** — Full-screen video splash screen (separate desktop & mobile versions)
- **Sticky Header** — Transparent navbar that transitions to solid on scroll
- **Hamburger Mobile Menu** — Collapsible navigation for small screens
- **Smooth Scroll & Transitions** — CSS-powered animations and hover effects throughout
- **Follow Us Section** — Full-width responsive Instagram/social banner

### 📄 Multi-Page Website
| Page | Purpose |
|------|---------|
| `index.html` | Homepage with hero, new arrivals, special sale, newsletter |
| `mens.html` | Men's product listing |
| `women.html` | Women's product listing |
| `kids.html` | Kids' product listing |
| `product.html` | Individual product detail page |
| `about.html` | Brand story and about page |
| `blog.html` | Fashion blog with articles |
| `contact.html` | Contact form and details |
| `myaccount.html` | User account page |
| `wishlist.html` | Saved wishlist items |
| `order.html` | Order placement page |
| `trackyourorder.html` | Order tracking page |
| `return.html` | Return policy page |
| `privacy.html` | Privacy policy page |
| `demo.html` | Demo/preview page |

### 📱 Responsive Design
- Mobile-first layout with breakpoints for all screen sizes
- Separate assets (images & videos) for desktop and mobile
- Touch-friendly navigation and buttons

### 💳 Payment & Trust Badges
- Accepted payments icons: **Visa**, **Mastercard**, **PayPal**, **COD** (Cash on Delivery)
- Social proof sections and newsletter subscription form

### 📣 Social & Contact Integration
- Direct **WhatsApp** link for quick customer support (`wa.me/923700256087`)
- **Facebook**, **Instagram**, **TikTok**, **Pinterest** social links
- Newsletter subscription with email input

---

## 🛠️ Tech Stack

| Technology | Usage |
|------------|-------|
| **HTML5** | Page structure & semantic markup |
| **CSS3** | Styling, animations, flexbox, grid, media queries |
| **Vanilla JavaScript** | Cart logic, wishlist, localStorage, DOM manipulation |
| **localStorage API** | Persistent cart & wishlist across sessions |
| **Google Fonts** | Montserrat font family |
| **MP4 Video** | Intro screen animation (desktop + mobile variants) |
| **GitHub Pages** | Hosting & deployment |

> ⚡ Zero dependencies. No frameworks, no npm, no build tools required.

---

## 📸 Screenshots

> 🖼️ Replace the placeholders below with your actual screenshots.


## 🚀 Installation & Local Setup

Follow these simple steps to run the project on your local machine:

### Step 1 — Clone the Repository
```bash
git clone https://github.com/buildsbyaliyan/AliyanCollection-Ecommerce.git
```

### Step 2 — Navigate to the Project Folder
```bash
cd AliyanCollection-Ecommerce
```

### Step 3 — Open in Browser

**Option A — Direct open (simplest):**
```bash
# Navigate to the docs folder and open index.html
open docs/index.html        # macOS
start docs/index.html       # Windows
xdg-open docs/index.html    # Linux
```

**Option B — Using VS Code Live Server (recommended):**
1. Install the **Live Server** extension in VS Code
2. Right-click on `docs/index.html`
3. Click **"Open with Live Server"**

**Option C — Using Python local server:**
```bash
cd docs
python -m http.server 8000
# Then visit: http://localhost:8000
```

> ✅ No npm install, no build step, no dependencies — it just works!

---

## 🌐 Live Demo

🔗 **[https://buildsbyaliyan.github.io/AliyanCollection-Ecommerce/](https://buildsbyaliyan.github.io/AliyanCollection-Ecommerce/)**

---

## 📁 Folder Structure

```
AliyanCollection-Ecommerce/
│
└── docs/                          # Main website root (GitHub Pages source)
    ├── index.html                 # Homepage
    ├── mens.html                  # Men's collection
    ├── women.html                 # Women's collection
    ├── kids.html                  # Kids' collection
    ├── product.html               # Product detail page
    ├── about.html                 # About page
    ├── blog.html                  # Blog page
    ├── contact.html               # Contact page
    ├── myaccount.html             # Account page
    ├── wishlist.html              # Wishlist page
    ├── order.html                 # Order page
    ├── trackyourorder.html        # Order tracking
    ├── return.html                # Return policy
    ├── privacy.html               # Privacy policy
    ├── demo.html                  # Demo page
    │
    ├── assets/                    # Images, videos, logos
    │   ├── Loadingd.mp4           # Intro video (desktop)
    │   ├── Loadingr.mp4           # Intro video (mobile)
    │   ├── hlogo.png              # Header logo
    │   ├── menwear.jpg            # Men's category banner
    │   ├── womenwear.jpg          # Women's category banner
    │   └── ...                    # Other images & media
    │
    ├── product/                   # Product images
    │   ├── m1.jpg - m19.jpg       # Men's products
    │   ├── w1.jpg - w20.jpg       # Women's products
    │   └── k1.jpg - k13.jpg       # Kids' products
    │
    └── icons/                     # UI icons & payment badges
        ├── shopping.png           # Cart icon
        ├── wishlist.png           # Wishlist icon
        ├── visa.png               # Visa badge
        ├── mastercard.png         # Mastercard badge
        ├── paypal.png             # PayPal badge
        ├── COD.png                # Cash on Delivery badge
        ├── facebook.png           # Social icon
        ├── instagram.png          # Social icon
        ├── tik-tok.png            # Social icon
        └── whatsapp.png           # WhatsApp icon
```

---

## 📬 Contact & Social Links

| Platform | Link |
|----------|------|
| 🌐 **Website** | [buildsbyaliyan.github.io/AliyanCollection-Ecommerce](https://buildsbyaliyan.github.io/AliyanCollection-Ecommerce/) |
| 💬 **WhatsApp** | [+92 370 0256087](https://wa.me/923700256087) |
| 📘 **Facebook** | [creativestudi0.pk_](https://facebook.com/creativestudi0.pk_) |
| 📸 **Instagram** | [@creativestudi0.pk_](https://instagram.com/creativestudi0.pk_) |
| 🎵 **TikTok** | [@creativestudi0.pk_](https://www.tiktok.com/@creativestudi0.pk_) |

---

## 📜 License

This project is licensed under the terms of the [LICENSE](LICENSE) file included in this repository.

---

<div align="center">

**Made with ❤️ by [Aliyan](https://github.com/buildsbyaliyan)**

⭐ If you like this project, please give it a star — it means a lot!

</div>
