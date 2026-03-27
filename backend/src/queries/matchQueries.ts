export const MATCHES_QUERY = `
MATCH (candidate:User)
WHERE candidate.id <> $userId
OPTIONAL MATCH (candidate)-[:LIKES]->(person:FamousPerson)
WHERE person.name IN $famousPersons
WITH candidate, collect(DISTINCT person.name) AS commonFamousPersons
OPTIONAL MATCH (candidate)-[:INTERESTED_IN]->(interest:Interest)
WHERE interest.name IN $interests
WITH candidate, commonFamousPersons, collect(DISTINCT interest.name) AS commonInterests
OPTIONAL MATCH (candidate)-[:ATTENDED]->(event:Event)
WHERE event.name IN $events
WITH candidate, commonFamousPersons, commonInterests, collect(DISTINCT event.name) AS commonEvents
OPTIONAL MATCH (candidate)-[:VISITED]->(place:Place)
WHERE place.name IN $places
WITH candidate,
     commonFamousPersons,
     commonInterests,
     commonEvents,
     collect(DISTINCT place.name) AS commonPlaces
WITH candidate,
     commonFamousPersons,
     commonInterests,
     commonEvents,
     commonPlaces,
     (size(commonFamousPersons) * 4 + size(commonInterests) * 3 + size(commonEvents) * 5 + size(commonPlaces) * 2) AS score
WHERE score > 0
RETURN candidate { .id, .email, .role, .name, .bio, .age, .location, .gender, .prefGender, .occupation, .education, .shardId } AS user,
       score,
       commonFamousPersons,
       commonInterests,
       commonEvents,
       commonPlaces
ORDER BY score DESC, user.name ASC
`;

export const MATCH_EXPLANATION_QUERY = `
MATCH (candidate:User {id: $candidateId})
OPTIONAL MATCH (candidate)-[:LIKES]->(person:FamousPerson)
WHERE person.name IN $famousPersons
WITH candidate, collect(DISTINCT person.name) AS commonFamousPersons
OPTIONAL MATCH (candidate)-[:INTERESTED_IN]->(interest:Interest)
WHERE interest.name IN $interests
WITH candidate, commonFamousPersons, collect(DISTINCT interest.name) AS commonInterests
OPTIONAL MATCH (candidate)-[:ATTENDED]->(event:Event)
WHERE event.name IN $events
WITH candidate, commonFamousPersons, commonInterests, collect(DISTINCT event.name) AS commonEvents
OPTIONAL MATCH (candidate)-[:VISITED]->(place:Place)
WHERE place.name IN $places
WITH candidate,
     commonFamousPersons,
     commonInterests,
     commonEvents,
     collect(DISTINCT place.name) AS commonPlaces
RETURN candidate { .id, .email, .role, .name, .bio, .age, .location, .gender, .prefGender, .occupation, .education, .shardId } AS user,
       commonFamousPersons,
       commonInterests,
       commonEvents,
       commonPlaces,
       (size(commonFamousPersons) * 4 + size(commonInterests) * 3 + size(commonEvents) * 5 + size(commonPlaces) * 2) AS score
`;
