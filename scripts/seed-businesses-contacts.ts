import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const ROASTER_ID = "0f15f667-f15e-4e29-9307-05a41cd5c311";
const USER_ID = "1c1507c4-7033-41a4-80fd-91b485a9fc30"; // author for notes/activity

// ─── Businesses ───

const BUSINESSES = [
  {
    name: "The Grind House",
    types: ["wholesale", "retail"],
    industry: "cafe",
    status: "active",
    email: "orders@thegrindhouse.co.uk",
    phone: "020 7946 0123",
    website: "https://thegrindhouse.co.uk",
    address_line_1: "14 Roast Lane",
    city: "London",
    county: "Greater London",
    postcode: "EC1V 9NR",
    country: "UK",
    source: "wholesale_application",
    total_spend: 4820.00,
    order_count: 12,
    notes: "Great cafe on Old Street. Orders every 2 weeks. Prefers medium roast.",
  },
  {
    name: "Copper & Bean",
    types: ["wholesale"],
    industry: "restaurant",
    status: "active",
    email: "chef@copperandbean.com",
    phone: "0161 234 5678",
    website: "https://copperandbean.com",
    address_line_1: "8 Northern Quarter",
    city: "Manchester",
    county: "Greater Manchester",
    postcode: "M1 1JQ",
    country: "UK",
    source: "wholesale_application",
    total_spend: 3250.50,
    order_count: 8,
    notes: "Fine dining restaurant. Uses our single origin for espresso martinis.",
  },
  {
    name: "FitBrew Gyms",
    types: ["wholesale", "retail"],
    industry: "gym",
    status: "active",
    email: "procurement@fitbrewgyms.co.uk",
    phone: "0113 987 6543",
    website: "https://fitbrewgyms.co.uk",
    address_line_1: "Unit 3, Apex Business Park",
    address_line_2: "Ring Road",
    city: "Leeds",
    county: "West Yorkshire",
    postcode: "LS12 6BE",
    country: "UK",
    source: "enquiry_form",
    total_spend: 6100.00,
    order_count: 18,
    notes: "Chain of 5 gyms across Yorkshire. Bulk orders monthly. Very price sensitive.",
  },
  {
    name: "The Harbour Hotel",
    types: ["wholesale"],
    industry: "hotel",
    status: "active",
    email: "fbmanager@harbourhotel.co.uk",
    phone: "01234 567890",
    website: "https://harbourhotel.co.uk",
    address_line_1: "1 Waterfront Drive",
    city: "Bristol",
    county: "Bristol",
    postcode: "BS1 5DB",
    country: "UK",
    source: "wholesale_application",
    total_spend: 8940.00,
    order_count: 22,
  },
  {
    name: "Bloom & Brew",
    types: ["retail"],
    industry: "cafe",
    status: "active",
    email: "hello@bloomandbrew.co.uk",
    phone: "0131 456 7890",
    address_line_1: "22 Rose Street",
    city: "Edinburgh",
    county: "Midlothian",
    postcode: "EH2 2JF",
    country: "UK",
    source: "storefront_order",
    total_spend: 1240.00,
    order_count: 5,
  },
  {
    name: "Workspace Coffee Co",
    types: ["wholesale", "retail"],
    industry: "coworking",
    status: "active",
    email: "ops@workspacecoffee.co",
    phone: "020 3456 7890",
    website: "https://workspacecoffee.co",
    address_line_1: "Floor 3, The Shard Business Centre",
    city: "London",
    county: "Greater London",
    postcode: "SE1 9SG",
    country: "UK",
    source: "manual",
    total_spend: 5600.00,
    order_count: 14,
    notes: "Supplies coffee to 3 coworking spaces. Interested in branded packaging.",
  },
  {
    name: "Green & Wild Events",
    types: ["retail"],
    industry: "events",
    status: "active",
    email: "bookings@greenandwild.events",
    phone: "07700 900456",
    website: "https://greenandwild.events",
    address_line_1: "The Old Barn",
    address_line_2: "Meadow Lane",
    city: "Cotswolds",
    county: "Gloucestershire",
    postcode: "GL54 1AA",
    country: "UK",
    source: "enquiry_form",
    total_spend: 980.00,
    order_count: 3,
    notes: "Wedding and festival catering. Seasonal orders — peaks in summer.",
  },
  {
    name: "Daily Dose Retail",
    types: ["retail", "supplier"],
    industry: "retail",
    status: "active",
    email: "buying@dailydose.shop",
    phone: "0121 345 6789",
    website: "https://dailydose.shop",
    address_line_1: "45 High Street",
    city: "Birmingham",
    county: "West Midlands",
    postcode: "B2 4TT",
    country: "UK",
    source: "manual",
    total_spend: 3400.00,
    order_count: 9,
    notes: "Independent deli. Stocks our retail bags. Also supplies us packaging.",
  },
  {
    name: "Bean There Café",
    types: ["lead"],
    industry: "cafe",
    status: "active",
    lead_status: "contacted",
    email: "info@beanthere.cafe",
    phone: "01onal 234567",
    address_line_1: "7 Market Square",
    city: "Bath",
    county: "Somerset",
    postcode: "BA1 1ES",
    country: "UK",
    source: "enquiry_form",
    total_spend: 0,
    order_count: 0,
    notes: "Enquired via website. Sent samples on 15 Feb. Following up next week.",
  },
  {
    name: "Peak District Lodge",
    types: ["lead", "prospect"],
    industry: "hotel",
    status: "active",
    lead_status: "new",
    email: "gm@peakdistrictlodge.co.uk",
    phone: "01onal 987654",
    address_line_1: "Buxton Road",
    city: "Bakewell",
    county: "Derbyshire",
    postcode: "DE45 1AH",
    country: "UK",
    source: "manual",
    total_spend: 0,
    order_count: 0,
  },
  {
    name: "Sunrise Smoothies",
    types: ["lead"],
    industry: "cafe",
    status: "active",
    lead_status: "qualified",
    email: "hello@sunrisesmoothies.co.uk",
    phone: "020 8765 4321",
    address_line_1: "101 Camden High Street",
    city: "London",
    county: "Greater London",
    postcode: "NW1 7JE",
    country: "UK",
    source: "enquiry_form",
    total_spend: 0,
    order_count: 0,
    notes: "Health-focused café. Interested in our organic range. Meeting scheduled.",
  },
  {
    name: "Old Mill Suppliers",
    types: ["supplier"],
    industry: "other",
    status: "active",
    email: "sales@oldmillsuppliers.co.uk",
    phone: "01onal 112233",
    address_line_1: "The Old Mill",
    city: "Stroud",
    county: "Gloucestershire",
    postcode: "GL5 1QG",
    country: "UK",
    source: "manual",
    total_spend: 0,
    order_count: 0,
    notes: "Green bean supplier. Imports from Colombia and Ethiopia.",
  },
  {
    name: "Pacific Trade Co",
    types: ["supplier"],
    industry: "other",
    status: "inactive",
    email: "uk@pacifictrade.com",
    phone: "020 7123 4567",
    website: "https://pacifictrade.com",
    address_line_1: "Canary Wharf Tower",
    city: "London",
    county: "Greater London",
    postcode: "E14 5AB",
    country: "UK",
    source: "manual",
    total_spend: 0,
    order_count: 0,
    notes: "Previous green bean supplier. Switched to Old Mill for better pricing.",
  },
  {
    name: "The Velvet Cup",
    types: ["wholesale"],
    industry: "cafe",
    status: "active",
    email: "manager@velvetcup.co.uk",
    phone: "0141 332 8899",
    website: "https://velvetcup.co.uk",
    address_line_1: "55 Buchanan Street",
    city: "Glasgow",
    county: "Glasgow",
    postcode: "G1 3HL",
    country: "UK",
    source: "wholesale_application",
    total_spend: 2100.00,
    order_count: 6,
  },
  {
    name: "CoWork Central",
    types: ["retail"],
    industry: "office",
    status: "active",
    email: "admin@coworkcentral.io",
    phone: "0117 234 5678",
    address_line_1: "15 Temple Way",
    city: "Bristol",
    county: "Bristol",
    postcode: "BS1 6DZ",
    country: "UK",
    source: "storefront_order",
    total_spend: 760.00,
    order_count: 4,
  },
];

// ─── Contacts ───

// businessIndex: maps to BUSINESSES array index (null = no business link)
const CONTACTS = [
  // The Grind House team
  { first_name: "Sarah", last_name: "Mitchell", email: "sarah@thegrindhouse.co.uk", phone: "07700 900100", types: ["wholesale", "retail"], source: "wholesale_application", role: "Owner", businessIndex: 0, total_spend: 2400, order_count: 6 },
  { first_name: "Tom", last_name: "Wright", email: "tom@thegrindhouse.co.uk", phone: "07700 900101", types: ["wholesale"], source: "wholesale_application", role: "Head Barista", businessIndex: 0, total_spend: 2420, order_count: 6 },

  // Copper & Bean
  { first_name: "James", last_name: "Chen", email: "james@copperandbean.com", phone: "07700 900102", types: ["wholesale"], source: "wholesale_application", role: "Head Chef", businessIndex: 1, total_spend: 3250.50, order_count: 8 },

  // FitBrew Gyms
  { first_name: "Priya", last_name: "Sharma", email: "priya@fitbrewgyms.co.uk", phone: "07700 900103", types: ["wholesale", "retail"], source: "enquiry_form", role: "Procurement Manager", businessIndex: 2, total_spend: 6100, order_count: 18 },
  { first_name: "Dan", last_name: "Okafor", email: "dan@fitbrewgyms.co.uk", phone: "07700 900104", types: ["wholesale"], source: "enquiry_form", role: "Operations Director", businessIndex: 2, total_spend: 0, order_count: 0 },

  // The Harbour Hotel
  { first_name: "Emma", last_name: "Richardson", email: "emma@harbourhotel.co.uk", phone: "07700 900105", types: ["wholesale"], source: "wholesale_application", role: "F&B Manager", businessIndex: 3, total_spend: 8940, order_count: 22 },

  // Bloom & Brew
  { first_name: "Isla", last_name: "MacGregor", email: "isla@bloomandbrew.co.uk", phone: "07700 900106", types: ["retail"], source: "storefront_order", role: "Owner", businessIndex: 4, total_spend: 1240, order_count: 5 },

  // Workspace Coffee Co
  { first_name: "Marcus", last_name: "Ali", email: "marcus@workspacecoffee.co", phone: "07700 900107", types: ["wholesale", "retail"], source: "manual", role: "CEO", businessIndex: 5, total_spend: 5600, order_count: 14 },

  // Green & Wild Events
  { first_name: "Lucy", last_name: "Thornton", email: "lucy@greenandwild.events", phone: "07700 900108", types: ["retail"], source: "enquiry_form", role: "Event Director", businessIndex: 6, total_spend: 980, order_count: 3 },

  // Daily Dose Retail
  { first_name: "Raj", last_name: "Patel", email: "raj@dailydose.shop", phone: "07700 900109", types: ["retail", "supplier"], source: "manual", role: "Owner", businessIndex: 7, total_spend: 3400, order_count: 9 },

  // Bean There Café (lead)
  { first_name: "Katie", last_name: "Evans", email: "katie@beanthere.cafe", phone: "07700 900110", types: ["lead"], source: "enquiry_form", lead_status: "contacted", role: "Owner", businessIndex: 8, total_spend: 0, order_count: 0 },

  // Sunrise Smoothies (lead)
  { first_name: "Zara", last_name: "Hassan", email: "zara@sunrisesmoothies.co.uk", phone: "07700 900111", types: ["lead"], source: "enquiry_form", lead_status: "qualified", role: "Founder", businessIndex: 10, total_spend: 0, order_count: 0 },

  // Old Mill Suppliers
  { first_name: "George", last_name: "Barnes", email: "george@oldmillsuppliers.co.uk", phone: "07700 900112", types: ["supplier"], source: "manual", role: "Sales Manager", businessIndex: 11, total_spend: 0, order_count: 0 },

  // The Velvet Cup
  { first_name: "Fiona", last_name: "Douglas", email: "fiona@velvetcup.co.uk", phone: "07700 900113", types: ["wholesale"], source: "wholesale_application", role: "Manager", businessIndex: 13, total_spend: 2100, order_count: 6 },

  // CoWork Central
  { first_name: "Nathan", last_name: "Cole", email: "nathan@coworkcentral.io", phone: "07700 900114", types: ["retail"], source: "storefront_order", role: "Office Manager", businessIndex: 14, total_spend: 760, order_count: 4 },

  // Standalone contacts (no business)
  { first_name: "Alex", last_name: "Turner", email: "alex.turner@gmail.com", phone: "07700 900115", types: ["retail"], source: "storefront_order", businessIndex: null, business_name: null, total_spend: 89.50, order_count: 2 },
  { first_name: "Sophie", last_name: "Williams", email: "sophie.w@outlook.com", phone: "07700 900116", types: ["retail"], source: "storefront_order", businessIndex: null, business_name: null, total_spend: 156.00, order_count: 4 },
  { first_name: "Chris", last_name: "Baker", email: "chris.baker@hotmail.co.uk", phone: null, types: ["lead"], source: "enquiry_form", lead_status: "new", businessIndex: null, business_name: null, total_spend: 0, order_count: 0 },
  { first_name: "Mel", last_name: "Okonkwo", email: "mel@okonkwo.design", phone: "07700 900118", types: ["retail"], source: "manual", businessIndex: null, business_name: "Okonkwo Design Studio", total_spend: 245.00, order_count: 3 },
  { first_name: "Harry", last_name: "Jacobs", email: "harry.j@yahoo.co.uk", phone: null, types: ["lead"], source: "enquiry_form", lead_status: "lost", businessIndex: null, business_name: null, total_spend: 0, order_count: 0 },
];

// ─── Activity / Notes templates ───

const BIZ_NOTES = [
  "Placed large order for seasonal blend. Very happy with quality.",
  "Discussed potential for own-label packaging. Sending mockups next week.",
  "Price review meeting scheduled for end of month.",
  "Sent new menu of single-origin options. Awaiting feedback.",
  "They've started offering our cold brew on tap — great visibility!",
  "Invoicing issue resolved — switched them to net-30 terms.",
  "Visited their new location. Coffee setup looks great.",
  "Requested samples of our decaf range.",
];

const CONTACT_NOTES = [
  "Called to follow up on last order. Very pleased with the dark roast.",
  "Met at the London Coffee Festival. Keen to try our new blend.",
  "Sent pricing sheet for wholesale tier upgrade.",
  "Discussed delivery frequency — switching to weekly.",
  "Left voicemail re: overdue invoice. Will try again Thursday.",
];

const BIZ_ACTIVITY_TYPES = [
  { type: "email_logged", desc: "Sent pricing proposal for Q2" },
  { type: "email_logged", desc: "Followed up on sample delivery" },
  { type: "order_placed", desc: "New order placed — 20kg House Blend" },
  { type: "order_placed", desc: "Repeat order — 10kg Single Origin Colombian" },
  { type: "status_changed", desc: "Status changed from lead to active" },
  { type: "wholesale_approved", desc: "Wholesale access approved — Standard tier" },
];

// ─── Seed function ───

async function seed() {
  console.log("Seeding businesses and contacts...\n");

  // 1. Clear existing data for this roaster
  console.log("Clearing existing data...");
  await supabase.from("contact_activity").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("contact_notes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("business_activity").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("business_notes").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  // Unlink contacts from businesses before deleting businesses
  await supabase.from("contacts").update({ business_id: null }).eq("roaster_id", ROASTER_ID);
  await supabase.from("contacts").delete().eq("roaster_id", ROASTER_ID);
  await supabase.from("businesses").delete().eq("roaster_id", ROASTER_ID);

  // 2. Insert businesses
  console.log("Creating businesses...");
  const businessIds: string[] = [];

  for (const biz of BUSINESSES) {
    const { data, error } = await supabase
      .from("businesses")
      .insert({
        roaster_id: ROASTER_ID,
        ...biz,
        last_activity_at: randomDate(30),
      })
      .select("id")
      .single();

    if (error) {
      console.error(`  Failed: ${biz.name} — ${error.message}`);
      businessIds.push("");
      continue;
    }
    businessIds.push(data.id);
    console.log(`  Created: ${biz.name}`);
  }

  // 3. Insert contacts
  console.log("\nCreating contacts...");
  const contactIds: string[] = [];

  for (const contact of CONTACTS) {
    const businessId = contact.businessIndex !== null ? businessIds[contact.businessIndex] : null;
    const businessName = contact.businessIndex !== null
      ? BUSINESSES[contact.businessIndex].name
      : (contact as { business_name?: string }).business_name || null;

    const { data, error } = await supabase
      .from("contacts")
      .insert({
        roaster_id: ROASTER_ID,
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email,
        phone: contact.phone || null,
        types: contact.types,
        source: contact.source,
        status: "active",
        lead_status: contact.lead_status || null,
        business_id: businessId || null,
        business_name: businessName,
        role: contact.role || null,
        total_spend: contact.total_spend || 0,
        order_count: contact.order_count || 0,
        last_activity_at: randomDate(14),
      })
      .select("id")
      .single();

    if (error) {
      console.error(`  Failed: ${contact.first_name} ${contact.last_name} — ${error.message}`);
      contactIds.push("");
      continue;
    }
    contactIds.push(data.id);
    console.log(`  Created: ${contact.first_name} ${contact.last_name}${businessName ? ` (${businessName})` : ""}`);
  }

  // 4. Add notes to businesses
  console.log("\nAdding business notes...");
  for (let i = 0; i < businessIds.length; i++) {
    if (!businessIds[i]) continue;
    const noteCount = Math.floor(Math.random() * 3) + 1;
    for (let n = 0; n < noteCount; n++) {
      const content = BIZ_NOTES[Math.floor(Math.random() * BIZ_NOTES.length)];
      await supabase.from("business_notes").insert({
        business_id: businessIds[i],
        author_id: USER_ID,
        content,
      });
    }
  }

  // 5. Add activity to businesses
  console.log("Adding business activity...");
  for (let i = 0; i < businessIds.length; i++) {
    if (!businessIds[i]) continue;

    // Created activity
    await supabase.from("business_activity").insert({
      business_id: businessIds[i],
      author_id: USER_ID,
      activity_type: "business_created",
      description: `Business "${BUSINESSES[i].name}" created`,
      created_at: randomDate(60),
    });

    // Random activities
    const activityCount = Math.floor(Math.random() * 4) + 1;
    for (let a = 0; a < activityCount; a++) {
      const act = BIZ_ACTIVITY_TYPES[Math.floor(Math.random() * BIZ_ACTIVITY_TYPES.length)];
      await supabase.from("business_activity").insert({
        business_id: businessIds[i],
        author_id: USER_ID,
        activity_type: act.type,
        description: act.desc,
        created_at: randomDate(30),
      });
    }
  }

  // 6. Add notes and activity to contacts
  console.log("Adding contact notes and activity...");
  for (let i = 0; i < contactIds.length; i++) {
    if (!contactIds[i]) continue;

    // Created activity
    await supabase.from("contact_activity").insert({
      contact_id: contactIds[i],
      activity_type: "contact_created",
      description: `Contact created via ${CONTACTS[i].source.replace("_", " ")}`,
      created_at: randomDate(60),
    });

    // Random notes
    if (Math.random() > 0.4) {
      const content = CONTACT_NOTES[Math.floor(Math.random() * CONTACT_NOTES.length)];
      const { data: note } = await supabase
        .from("contact_notes")
        .insert({
          contact_id: contactIds[i],
          author_id: USER_ID,
          content,
        })
        .select("id")
        .single();

      if (note) {
        await supabase.from("contact_activity").insert({
          contact_id: contactIds[i],
          activity_type: "note_added",
          description: content.length > 100 ? content.slice(0, 100) + "..." : content,
          metadata: { note_id: note.id },
          created_at: randomDate(14),
        });
      }
    }
  }

  console.log("\nDone! Seeded:");
  console.log(`  ${businessIds.filter(Boolean).length} businesses`);
  console.log(`  ${contactIds.filter(Boolean).length} contacts`);
  console.log(`  + notes and activity for each`);
}

function randomDate(daysBack: number): string {
  const now = Date.now();
  const offset = Math.floor(Math.random() * daysBack * 24 * 60 * 60 * 1000);
  return new Date(now - offset).toISOString();
}

seed().catch(console.error);
