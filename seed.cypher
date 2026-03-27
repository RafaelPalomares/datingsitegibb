// Seed Interests
UNWIND ["Photography", "Hiking", "Cooking", "Gaming", "Yoga", "Travel", "Reading", "Music", "Fitness", "Art", "Dancing", "Movies", "Tech", "History", "Nature", "Cycling", "Swimming", "Chess", "Writing", "Painting"] AS name
MERGE (i:Interest {key: toLower(name)}) ON CREATE SET i.name = name;

// Seed Places
UNWIND ["Berlin", "London", "Paris", "New York", "Tokyo", "Sydney", "Rome", "Barcelona", "Amsterdam", "Prague", "Vienna", "Lisbon", "Madrid", "Munich", "Hamburg", "Zurich", "Oslo", "Stockholm", "Copenhagen", "Dublin"] AS name
MERGE (p:Place {key: toLower(name)}) ON CREATE SET p.name = name;

// Seed Famous Persons
UNWIND ["Elon Musk", "Lionel Messi", "Leonardo DiCaprio", "Albert Einstein", "Serena Williams", "Cristiano Ronaldo", "Steve Jobs", "Taylor Swift", "Ed Sheeran", "The Weeknd", "Dua Lipa", "Drake", "Rihanna", "Beyoncé", "Justin Bieber", "Ariana Grande", "Eminem", "Kanye West", "Post Malone", "Billie Eilish"] AS name
MERGE (a:FamousPerson {key: toLower(name)}) ON CREATE SET a.name = name;

// Seed Events
UNWIND ["Sziget Festival", "Coachella", "Tomorrowland", "Glastonbury", "Burning Man", "Lollapalooza", "Roskilde Festival", "Reading Festival", "Primavera Sound", "Rock am Ring", "Montreux Jazz Festival", "Wacken Open Air", "SXSW", "Web Summit", "CES", "TechCrunch Disrupt", "TED Talk", "Art Basel", "Comic-Con", "Oktoberfest"] AS name
MERGE (e:Event {key: toLower(name)}) ON CREATE SET e.name = name;

// Seed 20 Users with expanded attributes
UNWIND range(1, 20) AS i
CREATE (u:User {
    id: "user-id-" + i,
    email: "user" + i + "@example.com",
    name: "User " + i,
    bio: "Bio for user " + i,
    age: 20 + (i % 30),
    location: "Berlin",
    gender: CASE WHEN i % 2 = 0 THEN "Male" ELSE "Female" END,
    prefGender: "Any",
    occupation: CASE WHEN i % 3 = 0 THEN "Engineer" ELSE "Designer" END,
    education: "University",
    createdAt: datetime()
});
