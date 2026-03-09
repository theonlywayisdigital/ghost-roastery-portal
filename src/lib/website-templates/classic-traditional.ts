import type { WebSection } from "@/lib/website-sections/types";

let idCounter = 0;
function id() {
  idCounter += 1;
  return `tmpl_classic_${idCounter}`;
}

export function classicTraditionalTemplate(): Record<string, WebSection[]> {
  idCounter = 0;

  return {
    home: [
      {
        id: id(),
        type: "hero_split",
        visible: true,
        heading: "Craft Coffee,\nRoasted with Care",
        subheading: "Est. 2024",
        body: "From carefully selected green beans to your morning cup — every step is guided by tradition, expertise, and a passion for exceptional coffee.",
        imagePosition: "right",
        button: { text: "Explore Our Range", url: "/shop" },
      },
      {
        id: id(),
        type: "about",
        visible: true,
        heading: "Our Heritage",
        body: "We believe the best coffee tells a story. Each origin we source has a unique character shaped by its terroir, processing, and the dedication of the farmers who grew it.\n\nOur role is simple: honour the bean. We roast in small batches, tasting every lot, and only release coffee when it meets our exacting standards.",
        imagePosition: "left",
        showSocialLinks: false,
      },
      {
        id: id(),
        type: "featured_products",
        visible: true,
        heading: "Seasonal Selection",
        subheading: "Our current favourites, roasted this week.",
        maxProducts: 3,
        showViewAll: true,
      },
      {
        id: id(),
        type: "text_content",
        visible: true,
        heading: "From Farm to Cup",
        body: "We source from trusted farms across Colombia, Ethiopia, Brazil, Guatemala, and Kenya. Each coffee is selected for its distinctive character and roasted to highlight its natural sweetness and complexity.\n\nWhether you prefer a bright, fruity filter or a rich, chocolatey espresso — there's a coffee here for you.",
        background: "light",
        maxWidth: "medium",
      },
      {
        id: id(),
        type: "testimonials",
        visible: true,
        heading: "Customer Reviews",
        layout: "grid",
        testimonials: [
          { quote: "Genuinely the best coffee subscription I've tried. The quality is consistent and the flavours are incredible.", author: "Thomas R.", role: "12-month subscriber", rating: 5 },
          { quote: "I bought a gift box for my dad and now he won't drink anything else. Thanks for that!", author: "Lucy W.", role: "Gift buyer", rating: 5 },
          { quote: "Professional roasting, beautiful presentation, and outstanding customer service.", author: "Mark D.", role: "Café owner", rating: 5 },
        ],
      },
      {
        id: id(),
        type: "cta_banner",
        visible: true,
        heading: "Start your coffee journey",
        subheading: "Order a taster pack and discover your new favourite.",
        button: { text: "Shop Taster Packs", url: "/shop" },
        backgroundStyle: "dark",
      },
    ],

    shop: [
      {
        id: id(),
        type: "all_products",
        visible: true,
        heading: "Our Coffee",
        showSearch: true,
        showFilters: true,
        columns: 3,
      },
    ],

    about: [
      {
        id: id(),
        type: "hero",
        visible: true,
        heading: "Our Story",
        subheading: "A passion for exceptional coffee, from the very first roast.",
        overlayOpacity: 0.5,
        primaryButton: { text: "Meet the Team", url: "#team" },
      },
      {
        id: id(),
        type: "about",
        visible: true,
        heading: "How It All Started",
        body: "What began as a weekend hobby roasting beans in a converted garage has grown into a small but dedicated roastery serving customers across the UK.\n\nWe've stayed true to our roots: small batches, personally sourced beans, and a relentless focus on quality over quantity.",
        imagePosition: "right",
        showSocialLinks: true,
      },
      {
        id: id(),
        type: "about_team",
        visible: true,
        heading: "Meet the Team",
        subheading: "The people behind every roast.",
        members: [
          { name: "Alex", role: "Founder & Head Roaster", bio: "15 years of roasting, still excited by every new origin." },
          { name: "Sam", role: "Green Buyer", bio: "Travels to origin to build relationships with farmers." },
          { name: "Jordan", role: "Quality Lead", bio: "SCA-certified Q Grader. Tastes every batch before release." },
        ],
      },
      {
        id: id(),
        type: "image_gallery",
        visible: true,
        heading: "The Roastery",
        images: [],
        columns: 3,
        layout: "grid",
      },
    ],

    contact: [
      {
        id: id(),
        type: "contact_form",
        visible: true,
        heading: "Contact Us",
        subheading: "Whether it's a question about our coffee, a wholesale enquiry, or just to say hello — we'd love to hear from you.",
        showName: true,
        showEmail: true,
        showPhone: true,
        showMessage: true,
        showSubject: true,
        submitText: "Send Message",
        showMap: true,
        mapAddress: "London, UK",
      },
    ],

    wholesale: [
      {
        id: id(),
        type: "wholesale_info",
        visible: true,
        heading: "Trade & Wholesale",
        body: "We partner with cafés, restaurants, and retailers who share our passion for quality coffee. From single-origin espresso to house blends, we'll work with you to find the perfect fit for your business.",
        features: [
          "Competitive wholesale pricing",
          "Bespoke blend development",
          "Equipment consultation",
          "Barista training included",
          "Flexible delivery schedules",
          "Marketing support",
        ],
        button: { text: "Enquire About Wholesale", url: "/contact" },
      },
      {
        id: id(),
        type: "faq",
        visible: true,
        heading: "Wholesale FAQ",
        subheading: "",
        items: [
          { question: "What is the minimum order?", answer: "Our minimum order is 5kg per delivery. For new accounts, we offer a trial order at a reduced minimum." },
          { question: "Do you offer bespoke blends?", answer: "Yes. We can develop a custom blend tailored to your equipment and customer preferences." },
          { question: "What are your delivery options?", answer: "We offer weekly and fortnightly delivery across the UK. Next-day delivery is available for most postcodes." },
        ],
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
export const getClassicTraditionalDefaults = classicTraditionalTemplate;
