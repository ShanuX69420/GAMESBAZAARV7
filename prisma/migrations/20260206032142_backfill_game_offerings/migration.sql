INSERT INTO "GameOffering" ("id", "gameId", "categoryId", "name", "createdAt", "updatedAt")
SELECT
    lower(hex(randomblob(16))),
    gc."gameId",
    gc."categoryId",
    trim(g."name" || ' ' || c."name"),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "GameCategory" gc
INNER JOIN "Game" g ON g."id" = gc."gameId"
INNER JOIN "Category" c ON c."id" = gc."categoryId"
LEFT JOIN "GameOffering" go ON go."gameId" = gc."gameId" AND go."categoryId" = gc."categoryId"
WHERE go."id" IS NULL;
