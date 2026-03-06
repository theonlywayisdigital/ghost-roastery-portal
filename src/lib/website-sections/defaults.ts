import type { SectionType, WebSection } from "./types";

let counter = 0;
function generateId(): string {
  counter += 1;
  return `section_${Date.now()}_${counter}`;
}

export function createDefaultSection(type: SectionType): WebSection {
  const id = generateId();

  switch (type) {
    case "hero":
      return {
        id,
        type: "hero",
        visible: true,
        heading: "Welcome to Our Roastery",
        subheading: "Specialty coffee, roasted with care and delivered to your door.",
        overlayOpacity: 0.5,
        primaryButton: { text: "Shop Now", url: "/shop" },
        secondaryButton: { text: "Our Story", url: "/about" },
      };

    case "hero_split":
      return {
        id,
        type: "hero_split",
        visible: true,
        heading: "Crafted with Passion",
        subheading: "From bean to cup",
        body: "Every batch is carefully sourced, roasted and packed to deliver the perfect cup. Discover our range of single origins and blends.",
        imagePosition: "right",
        button: { text: "Explore Our Range", url: "/shop" },
      };

    case "featured_products":
      return {
        id,
        type: "featured_products",
        visible: true,
        heading: "Our Coffee",
        subheading: "Hand-picked favourites from our current selection.",
        maxProducts: 4,
        showViewAll: true,
      };

    case "all_products":
      return {
        id,
        type: "all_products",
        visible: true,
        heading: "Shop All Coffee",
        showSearch: true,
        showFilters: true,
        columns: 3,
      };

    case "about":
      return {
        id,
        type: "about",
        visible: true,
        heading: "Our Story",
        body: "We believe great coffee starts with great relationships. From the farmers who grow the beans to the customers who enjoy them, every step matters.\n\nOur small-batch roasting process ensures each bag delivers consistent quality and flavour.",
        imagePosition: "right",
        showSocialLinks: true,
      };

    case "about_team":
      return {
        id,
        type: "about_team",
        visible: true,
        heading: "Meet the Team",
        subheading: "The people behind every roast.",
        members: [
          { name: "Alex", role: "Head Roaster", bio: "15 years of roasting experience." },
          { name: "Sam", role: "Green Buyer", bio: "Sourcing the best beans from around the world." },
        ],
      };

    case "testimonials":
      return {
        id,
        type: "testimonials",
        visible: true,
        heading: "What Our Customers Say",
        layout: "grid",
        testimonials: [
          {
            quote: "The best coffee I've ever had delivered to my door. Genuinely can't go back to supermarket coffee.",
            author: "Sarah M.",
            role: "Subscriber",
            rating: 5,
          },
          {
            quote: "Incredible flavour and freshness. You can tell it's been roasted with real care.",
            author: "James K.",
            role: "Regular Customer",
            rating: 5,
          },
          {
            quote: "Fast delivery, beautiful packaging, and outstanding coffee. What more could you ask for?",
            author: "Emma L.",
            role: "Gift Buyer",
            rating: 5,
          },
        ],
      };

    case "text_content":
      return {
        id,
        type: "text_content",
        visible: true,
        heading: "Brewing Guide",
        body: "For the perfect cup, we recommend using 15g of coffee per 250ml of water. Grind fresh, use water just off the boil (around 94°C), and brew for 4 minutes in a cafetière.\n\nFor pour-over methods, try a slightly finer grind and a 1:16 ratio. Experiment to find your perfect brew.",
        background: "light",
        maxWidth: "medium",
      };

    case "image_gallery":
      return {
        id,
        type: "image_gallery",
        visible: true,
        heading: "Gallery",
        images: [],
        columns: 3,
        layout: "grid",
      };

    case "cta_banner":
      return {
        id,
        type: "cta_banner",
        visible: true,
        heading: "Ready to try something new?",
        subheading: "Order today and get free delivery on your first bag.",
        button: { text: "Shop Now", url: "/shop" },
        backgroundStyle: "primary",
      };

    case "faq":
      return {
        id,
        type: "faq",
        visible: true,
        heading: "Frequently Asked Questions",
        subheading: "Everything you need to know about our coffee and delivery.",
        items: [
          {
            question: "How fresh is your coffee?",
            answer: "We roast to order. Your coffee is roasted within 48 hours of your order being placed and shipped the same day.",
          },
          {
            question: "Do you offer subscriptions?",
            answer: "Yes! You can subscribe to receive fresh coffee weekly, fortnightly, or monthly. Cancel or pause at any time.",
          },
          {
            question: "What grind options do you offer?",
            answer: "We offer whole bean, cafetière, filter, espresso, and Aeropress grinds. If you're unsure, whole bean is always the freshest option.",
          },
        ],
      };

    case "contact_form":
      return {
        id,
        type: "contact_form",
        visible: true,
        heading: "Get in Touch",
        subheading: "Have a question? We'd love to hear from you.",
        showName: true,
        showEmail: true,
        showPhone: false,
        showMessage: true,
        showSubject: true,
        submitText: "Send Message",
        showMap: false,
      };

    case "newsletter":
      return {
        id,
        type: "newsletter",
        visible: true,
        heading: "Stay in the Loop",
        subheading: "Subscribe for roasting updates, brew tips, and exclusive offers.",
        buttonText: "Subscribe",
        background: "dark",
      };

    case "instagram_feed":
      return {
        id,
        type: "instagram_feed",
        visible: true,
        heading: "Follow Us on Instagram",
        handle: "",
      };

    case "blog_latest":
      return {
        id,
        type: "blog_latest",
        visible: true,
        heading: "From the Blog",
        subheading: "Stories, guides, and updates from our roastery.",
        maxPosts: 3,
      };

    case "wholesale_info":
      return {
        id,
        type: "wholesale_info",
        visible: true,
        heading: "Wholesale Partners",
        body: "We supply specialty coffee to cafés, restaurants, and offices across the UK. Competitive pricing, reliable delivery, and dedicated account support.",
        features: [
          "Competitive wholesale pricing",
          "Flexible order quantities",
          "Dedicated account manager",
          "Free barista training",
        ],
        button: { text: "Apply for Wholesale", url: "/wholesale" },
      };

    case "custom_html":
      return {
        id,
        type: "custom_html",
        visible: true,
        html: "",
      };

    case "logo_bar":
      return {
        id,
        type: "logo_bar",
        visible: true,
        heading: "Trusted By",
        logos: [],
        grayscale: true,
      };

    case "pricing_table":
      return {
        id,
        type: "pricing_table",
        visible: true,
        heading: "Simple Pricing",
        subheading: "Choose the plan that works for you.",
        tiers: [
          {
            name: "Starter",
            price: "£9",
            period: "/month",
            features: ["250g bag monthly", "Free delivery", "Cancel anytime"],
            button: { text: "Get Started", url: "/shop" },
            highlighted: false,
          },
          {
            name: "Regular",
            price: "£19",
            period: "/month",
            features: ["2x 250g bags monthly", "Free delivery", "Early access to new roasts", "Cancel anytime"],
            button: { text: "Get Started", url: "/shop" },
            highlighted: true,
          },
          {
            name: "Coffee Lover",
            price: "£29",
            period: "/month",
            features: ["4x 250g bags monthly", "Free delivery", "Early access to new roasts", "Exclusive blends", "Cancel anytime"],
            button: { text: "Get Started", url: "/shop" },
            highlighted: false,
          },
        ],
      };

    case "stats_counter":
      return {
        id,
        type: "stats_counter",
        visible: true,
        heading: "By the Numbers",
        stats: [
          { value: "10,000", label: "Bags Roasted", suffix: "+" },
          { value: "500", label: "Happy Customers", suffix: "+" },
          { value: "15", label: "Single Origins" },
          { value: "4.9", label: "Star Rating", suffix: "/5" },
        ],
        background: "dark",
      };

    case "video_hero":
      return {
        id,
        type: "video_hero",
        visible: true,
        heading: "Watch Our Story",
        subheading: "From bean to cup, see how we craft every roast.",
        videoUrl: "",
        overlayOpacity: 0.5,
        primaryButton: { text: "Shop Now", url: "/shop" },
      };
  }
}
