import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../Src/prisma";
import { distanceFromTownKm, formatDuration, haversineKm } from "../Src/geo";

// ===============================
// SEED DATA
// Real places within 25 km of Hemmathagama town centre.
// Coordinates: OpenStreetMap / Wikidata. Descriptions: summarised from Wikipedia.
// Photos: Wikimedia Commons (author and licence stored in image_credit).
// Opening hours: typical visiting hours. Only the Temple of the Tooth, Pinnawala and
// Peradeniya hours are from published sources; the rest are sample values to verify
// on site (SRS BR-02). Open-air sites use daylight hours; 00:00-23:59 means open 24 hours.
// Run with: npx prisma db seed --config prisma7.config.ts
// ===============================

const categories = [
  { category_name: "Religious", description: "Temples, churches, kovils and mosques" },
  { category_name: "Nature/Scenic", description: "Mountains, viewpoints and natural areas" },
  { category_name: "Heritage/Cultural", description: "Historic and cultural sites" },
  { category_name: "Recreational", description: "Gardens, museums and family attractions" },
  { category_name: "Restaurants/Dining", description: "Places to eat and food stops" },
  { category_name: "Public/Useful", description: "Hospitals, bus stands and public services" },
];

const commons = (path: string) =>
  `https://upload.wikimedia.org/wikipedia/commons/thumb/${path}/1280px-${path.split("/").pop()}`;

const TEMPLE_DRESS =
  "Clothing: cover shoulders and knees; light or white clothing is customary.\n" +
  "Footwear: shoes and hats come off before entering - easy slip-on shoes help.";

type SeedPlace = {
  category: string;
  place_name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  opening_time?: string;
  closing_time?: string;
  best_time_to_visit?: string;
  visit_duration_minutes?: number;
  suitability?: string;
  travel_tips?: string;
  facilities?: string;
  before_you_go?: string;
  image?: string;
  image_credit?: string;
};

const places: SeedPlace[] = [
  // ---------- Religious ----------
  {
    category: "Religious",
    place_name: "Temple of the Sacred Tooth Relic",
    description:
      "Sri Dalada Maligawa, the Buddhist temple in the former royal palace complex of Kandy that houses the relic of the tooth of the Buddha. A UNESCO World Heritage site and one of the most important places of worship in Sri Lanka.",
    address: "Sri Dalada Veediya, Kandy",
    latitude: 7.2936,
    longitude: 80.6414,
    opening_time: "05:30",
    closing_time: "20:00",
    best_time_to_visit: "Early morning or during evening puja",
    visit_duration_minutes: 90,
    suitability: "All visitors, Families, Culture",
    travel_tips: "Expect security checks at the entrance. Combine with Kandy Lake and the National Museum next door.",
    before_you_go:
      TEMPLE_DRESS +
      "\nCarry: socks for hot stone floors, water, small change for shoe keeping.\n" +
      "Safety: very crowded on poya (full moon) days - keep valuables close.",
    image: commons("e/eb/SL_Kandy_asv2020-01_img33_Sacred_Tooth_Temple.jpg"),
    image_credit: "A.Savin, FAL, via Wikimedia Commons",
  },
  {
    category: "Religious",
    place_name: "Lankatilaka Vihara",
    opening_time: "08:00",
    closing_time: "17:00",
    description:
      "Fourteenth-century Gampola-era Buddhist temple with integrated Hindu shrines, built on the Panhalgala rock in Udunuwara.",
    address: "Hiyarapitiya, Udunuwara",
    latitude: 7.23388,
    longitude: 80.5647,
    best_time_to_visit: "Morning",
    visit_duration_minutes: 60,
    suitability: "Families, Culture, Photography",
    travel_tips: "Often visited together with Gadaladeniya Vihara and Embekka Devalaya on one loop.",
    before_you_go:
      TEMPLE_DRESS +
      "\nCarry: water - the rock steps are exposed to the sun.\n" +
      "Safety: steps can be slippery after rain.",
    image: commons("9/9a/Lankathilaka_Vhihara_-_Le_temple.JPG"),
    image_credit: "BluesyPete, CC BY-SA 3.0, via Wikimedia Commons",
  },
  {
    category: "Religious",
    place_name: "Gadaladeniya Vihara",
    opening_time: "08:00",
    closing_time: "17:00",
    description:
      "Stone Buddhist temple built in 1344 during the Gampola period, known for its South Indian architectural influence.",
    address: "Gadaladeniya, Pilimathalawa",
    latitude: 7.2573,
    longitude: 80.55608,
    best_time_to_visit: "Morning",
    visit_duration_minutes: 45,
    suitability: "Families, Culture",
    travel_tips: "A short walk up from the road; part of the Gampola-era temple loop.",
    before_you_go: TEMPLE_DRESS + "\nSafety: smooth rock surfaces are slippery when wet.",
    image: commons("9/94/Gadaladeniya_Viharaya_02.JPG"),
    image_credit: "Cherubino, CC BY-SA 3.0, via Wikimedia Commons",
  },
  {
    category: "Religious",
    place_name: "St. Paul's Church, Kandy",
    opening_time: "07:00",
    closing_time: "17:00",
    description:
      "Anglican church in the historic centre of Kandy, just west of the Temple of the Tooth, built during the British colonial period.",
    address: "Temple Street, Kandy",
    latitude: 7.29453,
    longitude: 80.63969,
    best_time_to_visit: "Morning, outside service times",
    visit_duration_minutes: 30,
    suitability: "All visitors, Culture",
    travel_tips: "Easy to visit on foot from the Temple of the Tooth.",
    before_you_go: "Clothing: modest dress is appreciated.\nSafety: Kandy town traffic is heavy - use pedestrian crossings.",
    image: commons("8/8c/SL_Kandy_asv2020-01_img29_StPaul_Church.jpg"),
    image_credit: "A.Savin, FAL, via Wikimedia Commons",
  },

  // ---------- Heritage / Cultural ----------
  {
    category: "Heritage/Cultural",
    place_name: "Embekka Devalaya",
    opening_time: "08:00",
    closing_time: "17:00",
    description:
      "Shrine dedicated to God Kataragama, built by King Vikramabahu III of the Gampola era (1357-1374) and famous for its intricately carved wooden pillars.",
    address: "Embekka, Udunuwara",
    latitude: 7.21792,
    longitude: 80.56772,
    best_time_to_visit: "Morning, for light on the carvings",
    visit_duration_minutes: 45,
    suitability: "Culture, Photography, Students",
    travel_tips: "Look closely at the carved pillars in the drummers' hall.",
    before_you_go: TEMPLE_DRESS,
    image: commons("2/26/Embekka_Devalaya_01.JPG"),
    image_credit: "Cherubino, CC BY-SA 3.0, via Wikimedia Commons",
  },
  {
    category: "Heritage/Cultural",
    place_name: "Dawson Tower",
    opening_time: "06:00",
    closing_time: "18:00",
    description:
      "Memorial tower at the Kadugannawa Pass honouring Captain William Dawson, who directed construction of the Colombo-Kandy road, the island's first modern highway.",
    address: "Kadugannawa Pass, Colombo-Kandy Road (A1)",
    latitude: 7.25668,
    longitude: 80.51796,
    best_time_to_visit: "Morning",
    visit_duration_minutes: 20,
    suitability: "All visitors, History",
    travel_tips: "Combine with the National Railway Museum, a short distance away.",
    before_you_go: "Safety: the tower stands beside the busy A1 - park well off the road and watch for traffic.",
    image: commons("f/f9/Captain_Dawson_Tower_Kadugannawa_in_2013.jpg"),
    image_credit: "MediaJet, CC BY-SA 4.0, via Wikimedia Commons",
  },
  {
    category: "Heritage/Cultural",
    place_name: "National Museum of Kandy",
    opening_time: "09:00",
    closing_time: "17:00",
    description:
      "Museum beside the Temple of the Tooth, housed in the Palle Vahala building of the former Royal Palace, with artefacts from the Kandyan kingdom.",
    address: "Royal Palace Complex, Kandy",
    latitude: 7.29472,
    longitude: 80.64083,
    best_time_to_visit: "Weekday mornings",
    visit_duration_minutes: 60,
    suitability: "Families, Students, History",
    travel_tips: "Check opening days before you travel; public holidays may differ.",
    image: commons("5/54/Kandy_National_Museum.jpg"),
    image_credit: "Ji-Elle, CC BY-SA 3.0, via Wikimedia Commons",
  },
  {
    category: "Heritage/Cultural",
    place_name: "Utuwankanda",
    opening_time: "06:00",
    closing_time: "18:00",
    description:
      "Rocky hill near Mawanella associated with the 19th-century folk figure Saradiel, with views over the Kegalle hills.",
    address: "Utuwankanda, Mawanella",
    latitude: 7.26199,
    longitude: 80.41916,
    best_time_to_visit: "Early morning",
    visit_duration_minutes: 90,
    suitability: "Hikers, History",
    travel_tips: "Start early to avoid the midday heat.",
    before_you_go:
      "Footwear: sturdy walking shoes with good grip.\nCarry: water and sun protection.\nSafety: hike in a group and stay on the main path.",
  },

  // ---------- Nature / Scenic ----------
  {
    category: "Nature/Scenic",
    place_name: "Ambuluwawa",
    opening_time: "08:00",
    closing_time: "18:00",
    description:
      "Mountain near Gampola topped by a tall tower with an external spiral stairway and a multi-religious complex, giving wide views over the central hills.",
    address: "Ambuluwawa, Gampola",
    latitude: 7.16107,
    longitude: 80.54734,
    best_time_to_visit: "Clear mornings",
    visit_duration_minutes: 120,
    suitability: "Families, Photography, Viewpoint",
    travel_tips: "The road up is narrow and steep; drive slowly.",
    before_you_go:
      "Clothing: modest dress for the religious sites at the top.\n" +
      "Footwear: shoes with grip for the tower stairway.\n" +
      "Safety: the upper stairway is very narrow and exposed - not suitable for young children or anyone uneasy with heights, and avoid it in wind or rain.",
    image: commons("7/7d/Ambuluwawa_Sri_Lanka.jpg"),
    image_credit: "Kaushiru90, CC BY-SA 4.0, via Wikimedia Commons",
  },
  {
    category: "Nature/Scenic",
    place_name: "Bible Rock (Bathalegala)",
    opening_time: "06:00",
    closing_time: "18:00",
    description:
      "Distinctive flat-topped mountain near Aranayake, named for its resemblance to a book resting on a lectern. Visible from the Colombo-Kandy road.",
    address: "Bathalegala, Aranayake",
    latitude: 7.18833,
    longitude: 80.43444,
    best_time_to_visit: "Early morning, dry weather",
    visit_duration_minutes: 180,
    suitability: "Hikers, Viewpoint",
    travel_tips: "Ask locally about the path conditions before starting.",
    before_you_go:
      "Footwear: hiking shoes - the path is steep and rocky.\nCarry: at least 1 litre of water per person, snacks, rain jacket.\n" +
      "Safety: avoid the summit in mist or rain; tell someone your plan.",
    image: commons("9/9a/Bathalegala.jpg"),
    image_credit: "Ireshwikis, CC BY-SA 3.0, via Wikimedia Commons",
  },
  {
    category: "Nature/Scenic",
    place_name: "Alagalla Mountain Range",
    opening_time: "06:00",
    closing_time: "17:00",
    description:
      "Mountain range on the border of the Central and Sabaragamuwa provinces, known for forested ridges and views over the Kadugannawa pass and the railway below.",
    address: "Alagalla, Kadugannawa",
    latitude: 7.29798,
    longitude: 80.47157,
    best_time_to_visit: "Dry season, early morning",
    visit_duration_minutes: 240,
    suitability: "Experienced hikers",
    travel_tips: "This is a full-day hike - plan it as the main activity of your day.",
    before_you_go:
      "Footwear: proper hiking boots.\nCarry: plenty of water, food, first-aid kit, rain jacket.\n" +
      "Safety: hike with a local guide or group; leeches are common after rain.",
    image: commons("2/2e/A_view_from_Alagalla_Mountain_Range.jpg"),
    image_credit: "Icaptures84, CC BY-SA 4.0, via Wikimedia Commons",
  },

  // ---------- Recreational ----------
  {
    category: "Recreational",
    place_name: "Pinnawala Elephant Orphanage",
    description:
      "Captive breeding and conservation centre for Asian elephants at Pinnawala, where visitors can watch the herd, including river bathing sessions.",
    address: "Pinnawala, Rambukkana",
    latitude: 7.30056,
    longitude: 80.38833,
    opening_time: "08:30",
    closing_time: "18:00",
    best_time_to_visit: "Around the river bathing times",
    visit_duration_minutes: 150,
    suitability: "Families, Children, Wildlife",
    travel_tips: "Check the day's feeding and bathing times at the ticket office.",
    before_you_go: "Carry: water and sun protection.\nSafety: keep a safe distance from the elephants and follow staff instructions.",
    image: commons("5/50/Pinnawala_01.jpg"),
    image_credit: "Bernard Gagnon, CC BY-SA 3.0, via Wikimedia Commons",
  },
  {
    category: "Recreational",
    place_name: "Royal Botanic Gardens, Peradeniya",
    description:
      "Sri Lanka's largest botanic garden, about 5.5 km west of Kandy, famous for its orchid house, giant bamboo, palm avenues and the giant Javan fig tree.",
    address: "Peradeniya",
    latitude: 7.27111,
    longitude: 80.59556,
    opening_time: "07:30",
    closing_time: "17:00",
    best_time_to_visit: "Morning",
    visit_duration_minutes: 180,
    suitability: "Families, Children, Nature",
    travel_tips: "The grounds are large - pick up a map at the entrance.",
    before_you_go: "Footwear: comfortable walking shoes.\nCarry: water, umbrella for sun or rain.",
    facilities: "Toilets, Café, Parking",
    image: commons("9/98/Botanical_Garden_of_Peradeniya_03.jpg"),
    image_credit: "Bernard Gagnon, CC BY-SA 3.0, via Wikimedia Commons",
  },
  {
    category: "Recreational",
    place_name: "National Railway Museum, Kadugannawa",
    opening_time: "09:00",
    closing_time: "17:00",
    description:
      "Sri Lanka Railways' museum at Kadugannawa, displaying historic locomotives, carriages and railway equipment.",
    address: "Kadugannawa",
    latitude: 7.25761,
    longitude: 80.5209,
    best_time_to_visit: "Weekday mornings",
    visit_duration_minutes: 60,
    suitability: "Families, Children, Students",
    travel_tips: "Check opening days before travelling.",
    image: commons("8/8f/National_railway_museum,_Sri_Lanka.JPG"),
    image_credit: "AntanO, CC BY-SA 4.0, via Wikimedia Commons",
  },
  {
    category: "Recreational",
    place_name: "Ceylon Tea Museum",
    opening_time: "08:30",
    closing_time: "16:30",
    description:
      "Tea museum in the former Hanthana Tea Factory, built in 1925, about 3 km south of Kandy, with historic tea-processing machinery.",
    address: "Hanthana, Kandy",
    latitude: 7.26861,
    longitude: 80.63266,
    best_time_to_visit: "Morning",
    visit_duration_minutes: 90,
    suitability: "Families, Students",
    travel_tips: "The access road climbs into the Hanthana hills.",
    image: commons("1/13/KANDY_TEA_MUSEUM_KANDY_TOWN_SRI_LANKA_JAN_2013_(8583226551).jpg"),
    image_credit: "calflier001, CC BY-SA 2.0, via Wikimedia Commons",
  },

  // ---------- Restaurants / Dining ----------
  {
    category: "Restaurants/Dining",
    place_name: "Hela Bojun, Mawanella",
    opening_time: "07:00",
    closing_time: "19:00",
    travel_tips: "Freshly made Sri Lankan snacks and meals; busiest around lunchtime, so arrive before 12:00 for the widest choice.",
    description: "Restaurant on the Colombo-Kandy road at Mawanella (listed on OpenStreetMap). Confirm opening hours before you travel.",
    address: "Mawanella",
    latitude: 7.24907,
    longitude: 80.45979,
    visit_duration_minutes: 45,
    suitability: "All visitors",
  },
  {
    category: "Restaurants/Dining",
    place_name: "Seetha's, Mawanella",
    opening_time: "07:00",
    closing_time: "22:00",
    travel_tips: "Good for a rice-and-curry lunch on the Colombo-Kandy road; parking is limited at peak times.",
    description: "Restaurant in Mawanella town (listed on OpenStreetMap). Confirm opening hours before you travel.",
    address: "Mawanella",
    latitude: 7.25205,
    longitude: 80.44764,
    visit_duration_minutes: 45,
    suitability: "All visitors",
  },
  {
    category: "Restaurants/Dining",
    place_name: "Jamboo Hotel & Restaurant",
    opening_time: "07:00",
    closing_time: "22:00",
    travel_tips: "Close to Hemmathagama town; a convenient breakfast or dinner stop at the start or end of the day.",
    description: "Restaurant on the Gampola side of Hemmathagama (listed on OpenStreetMap). Confirm opening hours before you travel.",
    address: "Gampola",
    latitude: 7.16411,
    longitude: 80.55338,
    visit_duration_minutes: 45,
    suitability: "All visitors",
  },

  // ---------- Public / Useful ----------
  {
    category: "Public/Useful",
    place_name: "Hemmathagama Hospital",
    opening_time: "00:00",
    closing_time: "23:59",
    travel_tips: "For emergencies call 1990 (Suwa Seriya ambulance). Bring ID and any medication you take.",
    description: "Hospital in Hemmathagama town centre. For emergencies, call 1990 (Suwa Seriya ambulance).",
    address: "Hemmathagama",
    latitude: 7.1733,
    longitude: 80.50158,
    suitability: "All visitors",
  },
  {
    category: "Public/Useful",
    place_name: "Base Hospital Mawanella",
    opening_time: "00:00",
    closing_time: "23:59",
    travel_tips: "The nearest larger hospital with emergency care. For an ambulance call 1990.",
    description: "Main hospital serving the Mawanella area. For emergencies, call 1990 (Suwa Seriya ambulance).",
    address: "Mawanella",
    latitude: 7.25356,
    longitude: 80.44583,
    suitability: "All visitors",
  },
  {
    category: "Public/Useful",
    place_name: "Hemmathagama Bus Stand",
    opening_time: "05:00",
    closing_time: "21:00",
    description: "Town bus stand in Hemmathagama with services to the surrounding towns.",
    address: "Hemmathagama",
    latitude: 7.17551,
    longitude: 80.50058,
    suitability: "All visitors",
    travel_tips: "Bus times vary; ask at the stand.",
  },
];

// Rows from the earlier sample seed that now have a real counterpart
const renamed: Record<string, string> = {
  "Allagalla Mountain Range": "Alagalla Mountain Range",
  "Mawanella Base Hospital": "Base Hospital Mawanella",
  "Utuwankanda (Saradiel's Rock)": "Utuwankanda",
};

// Rows from the earlier sample seed that were placeholders, not real places
const placeholders = [
  "Hemmathagama Town Mosque",
  "Village Temple",
  "Paddy Field Viewpoint",
  "Town Eatery",
  "Kadugannawa Rest Stop",
];

async function main() {
  // Categories
  const categoryIds = new Map<string, number>();

  for (const category of categories) {
    const saved = await prisma.category.upsert({
      where: { category_name: category.category_name },
      update: { description: category.description },
      create: category,
    });

    categoryIds.set(saved.category_name, saved.category_id);
  }

  // Rename earlier sample rows so plans that use them keep working
  for (const [oldName, newName] of Object.entries(renamed)) {
    const oldRow = await prisma.place.findFirst({ where: { place_name: oldName } });
    const newRow = await prisma.place.findFirst({ where: { place_name: newName } });

    if (oldRow && !newRow) {
      await prisma.place.update({ where: { place_id: oldRow.place_id }, data: { place_name: newName } });
    }
  }

  // Places: update by name, or create
  let created = 0;
  let updated = 0;

  for (const { category, ...place } of places) {
    const data = {
      description: place.description,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
      opening_time: place.opening_time ?? null,
      closing_time: place.closing_time ?? null,
      best_time_to_visit: place.best_time_to_visit ?? null,
      visit_duration_minutes: place.visit_duration_minutes ?? null,
      visit_duration: formatDuration(place.visit_duration_minutes),
      suitability: place.suitability ?? null,
      travel_tips: place.travel_tips ?? null,
      facilities: place.facilities ?? null,
      before_you_go: place.before_you_go ?? null,
      category_id: categoryIds.get(category)!,
      distance: distanceFromTownKm(place),
    };

    const existing = await prisma.place.findFirst({ where: { place_name: place.place_name } });

    // Photos: the seed sets its own photo where it has one, but never clears
    // a photo an admin has uploaded or pasted for a place the seed has none for.
    const photo = place.image ? { image: place.image, image_credit: place.image_credit ?? null } : {};

    if (existing) {
      await prisma.place.update({ where: { place_id: existing.place_id }, data: { ...data, ...photo } });
      updated++;
    } else {
      await prisma.place.create({ data: { place_name: place.place_name, ...data, ...photo } });
      created++;
    }
  }

  // Remove placeholders. Any plan stop that used one moves to the nearest real
  // place in the same category, unless that plan already includes it.
  let removed = 0;

  for (const name of placeholders) {
    const placeholder = await prisma.place.findFirst({ where: { place_name: name } });
    if (!placeholder) continue;

    const candidates = await prisma.place.findMany({
      where: {
        category_id: placeholder.category_id,
        place_name: { notIn: placeholders },
      },
    });

    const replacement = candidates.sort(
      (a, b) => haversineKm(placeholder, a) - haversineKm(placeholder, b)
    )[0];

    const stops = await prisma.visitPlanPlace.findMany({ where: { place_id: placeholder.place_id } });

    for (const stop of stops) {
      const alreadyInPlan =
        replacement &&
        (await prisma.visitPlanPlace.findFirst({
          where: { plan_id: stop.plan_id, place_id: replacement.place_id },
        }));

      if (replacement && !alreadyInPlan) {
        await prisma.visitPlanPlace.update({
          where: { plan_place_id: stop.plan_place_id },
          data: { place_id: replacement.place_id },
        });
      } else {
        await prisma.visitPlanPlace.delete({ where: { plan_place_id: stop.plan_place_id } });
      }
    }

    await prisma.place.delete({ where: { place_id: placeholder.place_id } });
    removed++;
  }

  // Administrator account. Self-registration always creates regular users,
  // so the seed is how the first admin is provisioned.
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || "admin@sabatrail.local").toLowerCase();
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const adminPassword =
      process.env.SEED_ADMIN_PASSWORD || crypto.randomBytes(9).toString("base64url");

    await prisma.user.create({
      data: {
        name: "SabaTrail Admin",
        email: adminEmail,
        password: await bcrypt.hash(adminPassword, 10),
        role: "ADMIN",
      },
    });

    console.log(
      process.env.SEED_ADMIN_PASSWORD
        ? `Admin created: ${adminEmail} (password from SEED_ADMIN_PASSWORD)`
        : `Admin created: ${adminEmail} / ${adminPassword}`
    );
  } else if (existingAdmin.role !== "ADMIN") {
    await prisma.user.update({ where: { user_id: existingAdmin.user_id }, data: { role: "ADMIN" } });
    console.log(`Promoted existing user to admin: ${adminEmail}`);
  } else {
    console.log(`Admin already exists: ${adminEmail}`);
  }

  // Demo visitor with two sample day plans, so the planner can be tried
  // straight after seeding. Plans are only added if the account has none.
  const demoEmail = (process.env.SEED_DEMO_EMAIL || "demo@sabatrail.local").toLowerCase();
  let demoUser = await prisma.user.findUnique({ where: { email: demoEmail } });

  if (!demoUser) {
    const demoPassword =
      process.env.SEED_DEMO_PASSWORD || crypto.randomBytes(9).toString("base64url");

    demoUser = await prisma.user.create({
      data: {
        name: "Demo Visitor",
        email: demoEmail,
        password: await bcrypt.hash(demoPassword, 10),
        role: "USER",
      },
    });

    console.log(
      process.env.SEED_DEMO_PASSWORD
        ? `Demo user created: ${demoEmail} (password from SEED_DEMO_PASSWORD)`
        : `Demo user created: ${demoEmail} / ${demoPassword}`
    );
  } else {
    console.log(`Demo user already exists: ${demoEmail}`);
  }

  const demoPlans = [
    {
      plan_name: "Temples and Botanic Gardens",
      daysAhead: 7,
      stops: [
        ["Gadaladeniya Vihara", "08:30"],
        ["Lankatilaka Vihara", "09:45"],
        ["Embekka Devalaya", "11:00"],
        ["Hela Bojun, Mawanella", "13:00"],
        ["Royal Botanic Gardens, Peradeniya", "15:00"],
      ],
    },
    {
      plan_name: "Railway Museum and Bible Rock",
      daysAhead: 14,
      stops: [
        ["National Railway Museum, Kadugannawa", "09:00"],
        ["Utuwankanda", "11:00"],
        ["Seetha's, Mawanella", "13:00"],
        ["Bible Rock (Bathalegala)", "15:00"],
      ],
    },
  ] as const;

  const existingDemoPlans = await prisma.visitPlan.count({ where: { user_id: demoUser.user_id } });

  if (existingDemoPlans === 0) {
    for (const demoPlan of demoPlans) {
      const visitDate = new Date();
      visitDate.setUTCHours(0, 0, 0, 0);
      visitDate.setUTCDate(visitDate.getUTCDate() + demoPlan.daysAhead);

      const stopPlaces = await prisma.place.findMany({
        where: { place_name: { in: demoPlan.stops.map(([name]) => name) } },
        select: { place_id: true, place_name: true },
      });
      const idByName = new Map(stopPlaces.map((place) => [place.place_name, place.place_id]));
      const stops = demoPlan.stops.filter(([name]) => idByName.has(name));

      await prisma.visitPlan.create({
        data: {
          user_id: demoUser.user_id,
          plan_name: demoPlan.plan_name,
          visit_date: visitDate,
          plan_places: {
            create: stops.map(([name, time], index) => ({
              place_id: idByName.get(name)!,
              visit_order: index + 1,
              planned_time: time,
            })),
          },
        },
      });
    }

    console.log(`Demo plans created: ${demoPlans.length}`);
  }

  console.log(
    `Categories: ${categoryIds.size}. Places created: ${created}, updated: ${updated}, placeholders removed: ${removed}.`
  );
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
