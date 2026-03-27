// muduo Cypher reference queries
// The running backend uses three Neo4j shard nodes. The current user's profile
// is loaded first, then these per-shard queries are executed against each node
// and aggregated in the backend.

// 1) Find users with common interests on one shard
MATCH (candidate:User)
WHERE candidate.id <> $userId
OPTIONAL MATCH (candidate)-[:INTERESTED_IN]->(interest:Interest)
WHERE interest.name IN $interests
WITH candidate, collect(DISTINCT interest.name) AS commonInterests
WHERE size(commonInterests) > 0
RETURN candidate.id AS userId,
       candidate.name AS name,
       candidate.shardId AS shardId,
       commonInterests
ORDER BY size(commonInterests) DESC, name ASC
LIMIT 25;

// 2) Calculate weighted match score on one shard
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
     (size(commonFamousPersons) * 4 +
      size(commonInterests) * 3 +
      size(commonEvents) * 5 +
      size(commonPlaces) * 2) AS score
WHERE score > 0
RETURN candidate.id AS userId,
       candidate.name AS name,
       candidate.shardId AS shardId,
       score,
       commonFamousPersons,
       commonInterests,
       commonEvents,
       commonPlaces
ORDER BY score DESC, name ASC
LIMIT 25;

// 3) Explain match connections for one candidate
MATCH (candidate:User {id: $candidateId})
OPTIONAL MATCH (candidate)-[:LIKES]->(person:FamousPerson)
WHERE person.name IN $famousPersons
WITH candidate, collect(DISTINCT person.name) AS commonFamousPersons
OPTIONAL MATCH (candidate)-[:ATTENDED]->(event:Event)
WHERE event.name IN $events
WITH candidate, commonFamousPersons, collect(DISTINCT event.name) AS commonEvents
OPTIONAL MATCH (candidate)-[:VISITED]->(place:Place)
WHERE place.name IN $places
WITH candidate, commonFamousPersons, commonEvents, collect(DISTINCT place.name) AS commonPlaces
OPTIONAL MATCH (candidate)-[:INTERESTED_IN]->(interest:Interest)
WHERE interest.name IN $interests
WITH candidate, commonFamousPersons, commonEvents, commonPlaces, collect(DISTINCT interest.name) AS commonInterests
RETURN candidate.id AS userId,
       candidate.name AS name,
       candidate.shardId AS shardId,
       commonFamousPersons,
       commonEvents,
       commonPlaces,
       commonInterests,
       (size(commonFamousPersons) * 4 +
        size(commonInterests) * 3 +
        size(commonEvents) * 5 +
        size(commonPlaces) * 2) AS score;
