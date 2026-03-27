import bcrypt from "bcryptjs";
import { getShardForValue, openSession, shards } from "../config/neo4j";
import { env } from "../config/env";
import { SCHEMA_QUERIES } from "../config/schema";

type Gender = "Male" | "Female" | "Non-binary" | "Other";
type PreferredGender = Gender | "Any";
type UserRole = "admin" | "user";

type DemoCluster = {
  famousPersons: string[];
  interests: string[];
  events: string[];
  places: string[];
  occupations: string[];
  educations: string[];
  bioFocus: string[];
};

type DemoUser = {
  id: string;
  email: string;
  shardId?: string;
  name: string;
  bio: string;
  age: number;
  location: string;
  role: UserRole;
  gender: Gender;
  prefGender: PreferredGender;
  occupation: string;
  education: string;
  famousPersons: string[];
  interests: string[];
  events: string[];
  places: string[];
};

const DEMO_SEED_BATCH = "muduo-demo-v1";

const FIRST_NAMES = [
  "Ava",
  "Liam",
  "Mila",
  "Noah",
  "Zoe",
  "Ethan",
  "Nora",
  "Leo",
  "Ivy",
  "Mason",
  "Ruby",
  "Julian",
  "Layla",
  "Kai",
  "Elena",
  "Owen",
  "Sofia",
  "Ezra",
  "Maya",
  "Lucas",
  "Aria",
  "Felix",
  "Chloe",
  "Milo",
  "Jade",
  "Theo",
  "Lena",
  "Asher",
  "Hazel",
  "Rowan"
];

const LAST_NAMES = [
  "Parker",
  "Meyer",
  "Khan",
  "Rossi",
  "Dubois",
  "Jensen",
  "Costa",
  "Nguyen",
  "Muller",
  "Garcia",
  "Silva",
  "Novak",
  "Fischer",
  "Young",
  "Martin",
  "Lopez",
  "Bianchi",
  "Keller",
  "Sato",
  "Petrov"
];

const LOCATIONS = [
  "Zurich",
  "Berlin",
  "Amsterdam",
  "Barcelona",
  "Lisbon",
  "Copenhagen",
  "Paris",
  "Vienna",
  "Stockholm",
  "Prague",
  "Budapest",
  "Milan",
  "Munich",
  "London",
  "Dublin",
  "Warsaw"
];

const GENDERS: Gender[] = ["Male", "Female", "Non-binary", "Other"];
const PREFERRED_GENDERS: PreferredGender[] = ["Female", "Male", "Any", "Non-binary", "Other"];

const CLUSTERS: DemoCluster[] = [
  {
    famousPersons: ["Taylor Swift", "Phoebe Bridgers", "Harry Styles", "Dua Lipa", "Troye Sivan", "Olivia Rodrigo", "Lorde"],
    interests: ["Songwriting", "Vinyl Collecting", "Live Music", "Photography", "Late-night Walks", "Poetry", "Zine Making"],
    events: ["Primavera Sound", "Montreux Jazz Festival", "Lollapalooza Berlin", "OpenAir St. Gallen", "Glastonbury", "Coachella"],
    places: ["Shoreditch", "Kreuzberg", "Le Marais", "Vesterbro", "Williamsburg", "Shimokitazawa"],
    occupations: ["Music Producer", "Brand Strategist", "Art Director", "Content Designer"],
    educations: ["Media Studies", "Design School", "Music Business", "Visual Communication"],
    bioFocus: ["concert-hopping", "finding new playlists", "turning memories into photo dumps"]
  },
  {
    famousPersons: ["Zendaya", "Timothee Chalamet", "Greta Gerwig", "Pedro Pascal", "Florence Pugh", "Christopher Nolan", "Anya Taylor-Joy"],
    interests: ["Cinema", "Scriptwriting", "Indie Films", "Museum Nights", "Coffee Tastings", "Film Photography", " एक्टिंग"],
    events: ["Cannes Film Festival", "Locarno Film Festival", "Berlinale", "Viennale", "Sundance", "TIFF"],
    places: ["Montmartre", "Soho", "Brera", "Neukolln", "Echo Park", "West Village"],
    occupations: ["Film Editor", "Creative Producer", "Copywriter", "Set Designer"],
    educations: ["Film Studies", "Journalism", "Communications", "Art History"],
    bioFocus: ["arguing over favorite scenes", "collecting cinema tickets", "chasing new exhibits"]
  },
  {
    famousPersons: ["Anthony Bourdain", "Diane von Furstenberg", "Emma Chamberlain", "David Attenborough", "Padma Lakshmi", "Gordon Ramsay", "Samin Nosrat"],
    interests: ["Food Tours", "Travel Hacking", "Street Photography", "Baking", "City Guides", "Fermentation", "Natural Wine"],
    events: ["Taste of Paris", "Lisbon Travel Market", "Madrid Fusion", "Zurich Food Festival", "Identity Cairo", "Omnivore World Tour"],
    places: ["Alfama", "El Born", "Navigli", "Jordaan", "Gracia", "Trastevere"],
    occupations: ["Product Marketer", "Travel Writer", "Hospitality Consultant", "UX Researcher"],
    educations: ["Hospitality Management", "Marketing", "Anthropology", "Business School"],
    bioFocus: ["booking weekend escapes", "tracking the next restaurant opening", "building map pins"]
  },
  {
    famousPersons: ["Elon Musk", "Lex Fridman", "Sara Blakely", "Sam Altman", "Marques Brownlee", "Vitalik Buterin", "Jensen Huang"],
    interests: ["Startups", "AI", "Podcasts", "Product Design", "Hackathons", "Crypto", "Biohacking"],
    events: ["Web Summit", "Slush", "Tech Open Air", "Startup Nights", "CES", "SXSW"],
    places: ["Silicon Allee", "Dogpatch", "Kings Cross", "Europaallee", "Palo Alto", "Station F"],
    occupations: ["Software Engineer", "Product Manager", "Founder", "Data Scientist"],
    educations: ["Computer Science", "Economics", "Human-Computer Interaction", "MBA"],
    bioFocus: ["shipping side projects", "talking through big ideas", "testing every new app"]
  },
  {
    famousPersons: ["Emma Watson", "Lewis Hamilton", "Megan Rapinoe", "Alex Honnold", "Coco Gauff", "Bear Grylls", "Wim Hof"],
    interests: ["Hiking", "Wellness", "Running", "Yoga", "Mindfulness", "Climbing", "Surfing"],
    events: ["UTMB", "Berlin Marathon", "Wanderlust Festival", "Ironman Zurich", "X Games", "The Ocean Race"],
    places: ["Lake Zurich", "Dolomites", "Tyrolean Alps", "Madeira", "Chamonix", "Bali"],
    occupations: ["Physiotherapist", "Nutrition Coach", "Operations Lead", "Project Manager"],
    educations: ["Sports Science", "Psychology", "Public Health", "Business Administration"],
    bioFocus: ["being outside before breakfast", "stacking wellness routines", "planning the next mountain weekend"]
  },
  {
    famousPersons: ["Rihanna", "Virgil Abloh", "Bella Hadid", "Frank Ocean", "Tilda Swinton", "A$AP Rocky", "Iris Apfel"],
    interests: ["Fashion", "Gallery Hopping", "Interior Design", "Editorial Photography", "Vintage Hunting", "Sneaker Culture", "Textile Art"],
    events: ["Paris Fashion Week", "Art Basel", "Milan Design Week", "Frieze London", "Met Gala", "ComplexCon"],
    places: ["Saint-Germain", "NoLIta", "Porta Venezia", "El Raval", "Harajuku", "Marais"],
    occupations: ["Fashion Buyer", "Photographer", "Interior Stylist", "Community Manager"],
    educations: ["Fashion Marketing", "Architecture", "Fine Arts", "Graphic Design"],
    bioFocus: ["finding the best vintage racks", "spending Sundays in galleries", "collecting design references"]
  },
  {
    famousPersons: ["Kylian Mbappe", "Serena Williams", "LeBron James", "Naomi Osaka", "Roger Federer", "Simone Biles", "Tom Brady"],
    interests: ["Football", "Tennis", "Basketball", "Gym Training", "Match Nights", "Padel", "E-sports"],
    events: ["Wimbledon", "US Open", "Champions League Final", "Laver Cup", "Super Bowl", "Olympics"],
    places: ["Wembley", "Roland Garros", "San Siro", "Stamford Bridge", "Santiago Bernabeu", "Madison Square Garden"],
    occupations: ["Sports Analyst", "Account Executive", "Coach", "Sales Lead"],
    educations: ["Finance", "Sports Management", "International Business", "Kinesiology"],
    bioFocus: ["never missing the big game", "keeping a tight training routine", "debating GOAT rankings"]
  },
  {
    famousPersons: ["Sally Rooney", "Barack Obama", "Brene Brown", "Malala Yousafzai", "Trevor Noah", "Chimamanda Ngozi Adichie", "Malcolm Gladwell"],
    interests: ["Reading", "Writing", "Politics", "Community Volunteering", "Book Clubs", "Philosophy", "Public Speaking"],
    events: ["Frankfurt Book Fair", "Hay Festival", "TEDxZurich", "Re:publica", "Southbank Centre Events", "New Yorker Festival"],
    places: ["Bloomsbury", "Prenzlauer Berg", "Canal Saint-Martin", "Josefstadt", "Oxford", "Cambridge Terrace"],
    occupations: ["Policy Analyst", "Editor", "Teacher", "Nonprofit Strategist"],
    educations: ["Political Science", "Literature", "International Relations", "Sociology"],
    bioFocus: ["annotating books", "hosting long dinner conversations", "showing up for local causes"]
  },
  {
    famousPersons: ["Greta Thunberg", "Bill Gates", "Yvon Chouinard", "Jane Goodall", "Al Gore"],
    interests: ["Sustainability", "Permaculture", "Upcycling", "Climate Activism", "Ocean Conservation", "Vegan Cooking"],
    events: ["COP28", "Earth Day Festival", "Ocean Film Festival", "Slow Food Youth Network"],
    places: ["Copenhagen", "Freiburg", "Portland", "Costa Rica", "Vancouver Island"],
    occupations: ["Climate Consultant", "Environmental Engineer", "CSR Manager", "Organic Farmer"],
    educations: ["Environmental Science", "Sustainable Development", "Biology"],
    bioFocus: ["reducing my carbon footprint", "advocating for the planet", "growing my own food"]
  },
  {
    famousPersons: ["Hideo Kojima", "Shroud", "Pokimane", "Faker", "PewDiePie"],
    interests: ["Gaming", "Twitch Streaming", "Cosplay", "Mechanical Keyboards", "Anime", "Manga"],
    events: ["Gamescom", "E3", "TwitchCon", "League of Legends Worlds", "Anime Expo"],
    places: ["Akihabara", "Seoul", "Los Angeles", "Seattle", "Katowice"],
    occupations: ["Game Developer", "Streamer", "Cloud Architect", "Level Designer"],
    educations: ["Game Design", "Software Engineering", "Interactive Media"],
    bioFocus: ["grinding for rank", "exploring open worlds", "building the perfect setup"]
  }
];

function takeCycled(values: string[], start: number, count: number): string[] {
  const picked: string[] = [];

  for (let offset = 0; picked.length < count; offset += 1) {
    const value = values[(start + offset) % values.length];

    if (!picked.includes(value)) {
      picked.push(value);
    }
  }

  return picked;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function buildBio(index: number, famousPerson: string, interest: string, place: string, event: string): string {
  const openers = [
    "Best first date is usually a walk that ends somewhere with great food.",
    "Usually planning the next trip, playlist, or conversation worth staying up for.",
    "I like people who are curious, direct, and excited about their corner of the world.",
    "Most weekends end with either a live event or a long brunch recap."
  ];

  return `${openers[index % openers.length]} Lately I have been into ${interest.toLowerCase()}, talking about ${famousPerson}, meeting friends in ${place}, and trying to make it to ${event}.`;
}

function buildDemoUsers(count: number): DemoUser[] {
  return Array.from({ length: count }, (_, index) => {
    const primaryCluster = CLUSTERS[index % CLUSTERS.length];
    const secondaryCluster = CLUSTERS[(index * 3 + 2) % CLUSTERS.length];
    const tertiaryCluster = CLUSTERS[(index * 5 + 1) % CLUSTERS.length];
    const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
    const lastName = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length];
    const famousPersons = unique([
      ...takeCycled(primaryCluster.famousPersons, index, 3),
      ...takeCycled(secondaryCluster.famousPersons, index + 1, 2)
    ]).slice(0, 5);
    const interests = unique([
      ...takeCycled(primaryCluster.interests, index + 1, 3),
      ...takeCycled(secondaryCluster.interests, index, 2)
    ]).slice(0, 5);
    const events = unique([
      ...takeCycled(primaryCluster.events, index, 2),
      ...takeCycled(secondaryCluster.events, index + 2, 1),
      ...takeCycled(tertiaryCluster.events, index + 3, 1)
    ]).slice(0, 4);
    const places = unique([
      ...takeCycled(primaryCluster.places, index + 2, 2),
      ...takeCycled(secondaryCluster.places, index, 1),
      ...takeCycled(tertiaryCluster.places, index + 1, 1)
    ]).slice(0, 4);
    const gender = GENDERS[index % GENDERS.length];
    const prefGender = PREFERRED_GENDERS[(index * 2) % PREFERRED_GENDERS.length];
    const occupationPool = unique([...primaryCluster.occupations, ...secondaryCluster.occupations]);
    const educationPool = unique([...primaryCluster.educations, ...secondaryCluster.educations]);
    const bioFocusPool = unique([...primaryCluster.bioFocus, ...secondaryCluster.bioFocus]);
    const bioFocus = bioFocusPool[index % bioFocusPool.length];

    return {
      id: `demo-user-${String(index + 1).padStart(3, "0")}`,
      email: `demo.user${String(index + 1).padStart(3, "0")}@muduo.local`,
      name: `${firstName} ${lastName}`,
      bio: `${buildBio(index, famousPersons[0], interests[0], places[0], events[0])} Also into ${bioFocus}.`,
      age: 22 + (index % 15),
      location: LOCATIONS[(index * 5 + primaryCluster.places.length) % LOCATIONS.length],
      role: "user",
      gender,
      prefGender,
      occupation: occupationPool[index % occupationPool.length],
      education: educationPool[(index + 1) % educationPool.length],
      famousPersons,
      interests,
      events,
      places
    };
  });
}

function buildAdminUser(): DemoUser {
  const cluster = CLUSTERS[3];

  return {
    id: "demo-admin-001",
    email: "admin@muduo.local",
    name: "Muduo Admin",
    bio: "Admin demo account for rubric checks, live demos, and operational verification.",
    age: 30,
    location: "Zurich",
    role: "admin",
    gender: "Other",
    prefGender: "Any",
    occupation: "Platform Administrator",
    education: "Computer Science",
    famousPersons: cluster.famousPersons.slice(0, 3),
    interests: cluster.interests.slice(0, 3),
    events: cluster.events.slice(0, 2),
    places: cluster.places.slice(0, 2)
  };
}

export async function seedDemoUsers(): Promise<void> {
  const users = [buildAdminUser(), ...buildDemoUsers(env.demoUsersCount)].map((user) => ({
    ...user,
    shardId: getShardForValue(user.id).id
  }));
  const emails = users.map((user) => user.email);
  const userPasswordHash = await bcrypt.hash(env.demoUserPassword, 10);
  const adminPasswordHash = await bcrypt.hash(env.adminUserPassword, 10);
  const usersByShard = new Map<string, typeof users>();

  for (const shard of shards) {
    usersByShard.set(
      shard.id,
      users.filter((user) => user.shardId === shard.id)
    );
  }

  for (const shard of shards) {
    const shardUsers = usersByShard.get(shard.id) || [];
    const shardEmails = shardUsers.map((user) => user.email);
    const session = openSession(shard);

    try {
      for (const query of SCHEMA_QUERIES) {
        await session.executeWrite((tx) => tx.run(query));
      }

      await session.executeWrite(async (tx) => {
        await tx.run(
          `
          MATCH (u:User)
          WHERE u.seeded = true AND u.seedBatch = $seedBatch AND coalesce(u.shardId, $shardId) = $shardId
            AND NOT u.email IN $emails
          DETACH DELETE u
          `,
          { seedBatch: DEMO_SEED_BATCH, shardId: shard.id, emails: shardEmails }
        );

        await tx.run(
          `
          UNWIND $users AS user
          MERGE (u:User {email: user.email})
          ON CREATE SET u.createdAt = datetime()
          SET u.id = user.id,
              u.passwordHash = CASE WHEN user.role = "admin" THEN $adminPasswordHash ELSE $userPasswordHash END,
              u.role = user.role,
              u.shardId = user.shardId,
              u.name = user.name,
              u.bio = user.bio,
              u.age = user.age,
              u.location = user.location,
              u.gender = user.gender,
              u.prefGender = user.prefGender,
              u.occupation = user.occupation,
              u.education = user.education,
              u.seeded = true,
              u.seedBatch = $seedBatch,
              u.updatedAt = datetime()
          `,
          { users: shardUsers, userPasswordHash, adminPasswordHash, seedBatch: DEMO_SEED_BATCH }
        );

        await tx.run(
          `
          MATCH (u:User)
          WHERE u.seeded = true AND u.seedBatch = $seedBatch AND coalesce(u.shardId, $shardId) = $shardId
          MATCH (u)-[r:LIKES|VISITED|ATTENDED|INTERESTED_IN]->()
          DELETE r
          `,
          { seedBatch: DEMO_SEED_BATCH, shardId: shard.id }
        );

        await tx.run(
          `
          UNWIND $users AS user
          MATCH (u:User {email: user.email})
          UNWIND user.famousPersons AS famousPersonName
          MERGE (person:FamousPerson {key: toLower(famousPersonName)})
          ON CREATE SET person.name = famousPersonName
          SET person.name = famousPersonName
          MERGE (u)-[:LIKES]->(person)
          `,
          { users: shardUsers }
        );

        await tx.run(
          `
          UNWIND $users AS user
          MATCH (u:User {email: user.email})
          UNWIND user.interests AS interestName
          MERGE (interest:Interest {key: toLower(interestName)})
          ON CREATE SET interest.name = interestName
          SET interest.name = interestName
          MERGE (u)-[:INTERESTED_IN]->(interest)
          `,
          { users: shardUsers }
        );

        await tx.run(
          `
          UNWIND $users AS user
          MATCH (u:User {email: user.email})
          UNWIND user.events AS eventName
          MERGE (event:Event {key: toLower(eventName)})
          ON CREATE SET event.name = eventName
          SET event.name = eventName
          MERGE (u)-[:ATTENDED]->(event)
          `,
          { users: shardUsers }
        );

        await tx.run(
          `
          UNWIND $users AS user
          MATCH (u:User {email: user.email})
          UNWIND user.places AS placeName
          MERGE (place:Place {key: toLower(placeName)})
          ON CREATE SET place.name = placeName
          SET place.name = placeName
          MERGE (u)-[:VISITED]->(place)
          `,
          { users: shardUsers }
        );
      });
    } finally {
      await session.close();
    }
  }

  console.log(
    `Seeded ${users.length} demo users across ${shards.length} Neo4j nodes. Demo user: demo.user001@muduo.local / ${env.demoUserPassword}. Admin user: admin@muduo.local / ${env.adminUserPassword}`
  );
}
