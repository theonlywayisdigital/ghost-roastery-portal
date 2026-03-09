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
        type: "brewing_guide",
        visible: true,
        heading: "Brewing Guides",
        subheading: "Master the perfect cup with our step-by-step guides",
        methods: [
          {
            name: "Cafeti\u00e8re",
            grind: "Coarse",
            ratio: "15g / 250ml",
            steps: [
              { title: "Preheat", description: "Rinse the cafeti\u00e8re with hot water", duration: "30s" },
              { title: "Add Coffee", description: "Add coarsely ground coffee", duration: "" },
              { title: "Pour", description: "Fill with water just off the boil (93-96\u00b0C)", duration: "30s" },
              { title: "Brew", description: "Place the plunger on top without pressing. Let it steep", duration: "4 min" },
              { title: "Plunge & Pour", description: "Press the plunger slowly and pour immediately", duration: "30s" },
            ],
          },
          {
            name: "Pour Over (V60)",
            grind: "Medium-Fine",
            ratio: "15g / 250ml",
            steps: [
              { title: "Rinse Filter", description: "Place filter in V60 and rinse with hot water", duration: "15s" },
              { title: "Add Coffee", description: "Add medium-fine ground coffee, create a small well in the centre", duration: "" },
              { title: "Bloom", description: "Pour twice the weight of coffee in water, let it bloom", duration: "30s" },
              { title: "Pour", description: "Pour in slow circles from the centre outward", duration: "2 min" },
              { title: "Serve", description: "Let it drip through completely and serve", duration: "30s" },
            ],
          },
        ],
      },
    ],
  };
}

/** Backward-compatible alias used by stripe-billing webhook */
export const getModernMinimalDefaults = modernMinimalTemplate;
