import type { WebSection } from "@/lib/website-sections/types";

let idCounter = 0;
function id() {
  idCounter += 1;
  return `tmpl_modern_${idCounter}`;
}

export function modernMinimalTemplate(): Record<string, WebSection[]> {
  idCounter = 0;

  return {
    home: [
      {
        id: id(),
        type: "hero",
        visible: true,
        heading: "Specialty Coffee,\nRoasted Fresh",
        subheading: "Small-batch, single origin coffee delivered to your door. Roasted weekly for peak freshness.",
        overlayOpacity: 0.6,
        primaryButton: { text: "Shop Coffee", url: "/shop" },
        secondaryButton: { text: "Our Story", url: "/about" },
      },
      {
        id: id(),
        type: "featured_products",
        visible: true,
        heading: "Our Coffee",
        subheading: "Hand-selected beans, expertly roasted.",
        maxProducts: 4,
        showViewAll: true,
      },
      {
        id: id(),
        type: "cta_banner",
        visible: true,
        heading: "Free delivery on your first order",
        subheading: "Use code WELCOME at checkout.",
        button: { text: "Shop Now", url: "/shop" },
        backgroundStyle: "primary",
      },
      {
        id: id(),
        type: "testimonials",
        visible: true,
        heading: "What People Are Saying",
        layout: "grid",
        testimonials: [
          { quote: "The freshest coffee I've ever had. You can taste the difference.", author: "Sarah M.", role: "Subscriber", rating: 5 },
          { quote: "Beautiful packaging, incredible flavour. My new go-to roaster.", author: "James K.", role: "Regular", rating: 5 },
          { quote: "Fast delivery and the coffee is outstanding. Highly recommend.", author: "Emma L.", role: "Gift Buyer", rating: 5 },
        ],
      },
      {
        id: id(),
        type: "newsletter",
        visible: true,
        heading: "Stay Fresh",
        subheading: "Get roasting updates, brew tips, and exclusive offers.",
        buttonText: "Subscribe",
        background: "dark",
      },
    ],

    shop: [
      {
        id: id(),
        type: "all_products",
        visible: true,
        heading: "Shop All Coffee",
        showSearch: true,
        showFilters: true,
        columns: 3,
      },
    ],

    about: [
      {
        id: id(),
        type: "hero_split",
        visible: true,
        heading: "Our Story",
        subheading: "From bean to cup",
        body: "We started with a simple belief: great coffee should be accessible to everyone. Every bag we roast is a reflection of our commitment to quality, sustainability, and flavour.",
        imagePosition: "right",
        button: { text: "Shop Our Range", url: "/shop" },
      },
      {
        id: id(),
        type: "about",
        visible: true,
        heading: "What Makes Us Different",
        body: "We source directly from farms we trust. Every batch is roasted in small quantities to ensure consistency and freshness.\n\nOur roastery is powered by renewable energy, and we use fully compostable packaging. Great coffee shouldn't cost the earth.",
        imagePosition: "left",
        showSocialLinks: true,
      },
      {
        id: id(),
        type: "cta_banner",
        visible: true,
        heading: "Ready to taste the difference?",
        subheading: "Order today and experience specialty coffee at its best.",
        button: { text: "Shop Now", url: "/shop" },
        backgroundStyle: "gradient",
      },
    ],

    contact: [
      {
        id: id(),
        type: "contact_form",
        visible: true,
        heading: "Get in Touch",
        subheading: "Questions, feedback, or just want to say hello? Drop us a message.",
        showName: true,
        showEmail: true,
        showPhone: false,
        showMessage: true,
        showSubject: true,
        submitText: "Send Message",
        showMap: false,
      },
      {
        id: id(),
        type: "faq",
        visible: true,
        heading: "Frequently Asked Questions",
        subheading: "",
        items: [
          { question: "How fresh is your coffee?", answer: "We roast to order. Your coffee is roasted within 48 hours of ordering and shipped the same day." },
          { question: "Do you offer subscriptions?", answer: "Yes! Subscribe for weekly, fortnightly, or monthly deliveries. Pause or cancel any time." },
          { question: "What grind options do you offer?", answer: "Whole bean, cafetière, filter, espresso, and Aeropress. If unsure, whole bean stays freshest." },
          { question: "Do you deliver internationally?", answer: "Currently we deliver across the UK. International shipping is coming soon." },
        ],
      },
    ],

    wholesale: [
      {
        id: id(),
        type: "wholesale_info",
        visible: true,
        heading: "Wholesale Partners",
        body: "We supply specialty coffee to cafés, restaurants, hotels, and offices across the UK. Competitive pricing, reliable weekly delivery, and dedicated account support.",
        features: [
          "Competitive trade pricing",
          "Flexible order quantities",
          "Dedicated account manager",
          "Free barista training",
          "Sample packs available",
          "Next-day delivery",
        ],
        button: { text: "Apply for Wholesale", url: "/contact" },
      },
    ],

    brewing: [
      {
        id: id(),
        type: "text_content",
        visible: true,
        heading: "Brewing Guides",
        body: "<h3>Cafetière (French Press)</h3><p>Use 15g of coarsely ground coffee per 250ml of water. Pour water just off the boil (around 94°C) and steep for 4 minutes. Press slowly and serve immediately.</p><h3>Pour Over</h3><p>Use a medium-fine grind at a 1:16 ratio. Bloom with twice the weight of coffee in water for 30 seconds, then pour in slow, steady circles until you reach your target weight.</p><h3>Espresso</h3><p>Use 18g of finely ground coffee. Aim for a 36g yield in 25-30 seconds. Adjust grind finer for slower extraction, coarser for faster.</p><h3>Aeropress</h3><p>Use 15g of medium-fine ground coffee with 200ml of water at 85°C. Steep for 1 minute, then press steadily for 30 seconds.</p>",
        background: "light",
        maxWidth: "medium",
      },
    ],
  };
}

/** Backward-compatible alias used by stripe-billing webhook */
export const getModernMinimalDefaults = modernMinimalTemplate;
