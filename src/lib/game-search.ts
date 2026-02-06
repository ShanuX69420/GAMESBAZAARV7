export type GameCategoryPair = {
  gameName: string;
  categoryName: string;
  offeringName?: string;
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function compactText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function tokenize(value: string) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return [];
  }
  return normalized.split(" ").filter(Boolean);
}

function acronym(value: string) {
  const parts = tokenize(value);
  return parts.map((part) => part[0] ?? "").join("");
}

export function buildPairLabel(pair: GameCategoryPair) {
  const offeringName = pair.offeringName?.trim();
  if (offeringName) {
    return offeringName;
  }
  return `${pair.gameName} ${pair.categoryName}`;
}

export function scoreGameCategoryPair(
  pair: GameCategoryPair,
  query: string,
): number {
  const normalizedQuery = normalizeText(query);
  const compactQuery = compactText(query);

  if (!normalizedQuery || !compactQuery) {
    return 0;
  }

  const gameName = normalizeText(pair.gameName);
  const categoryName = normalizeText(pair.categoryName);
  const label = normalizeText(buildPairLabel(pair));
  const gameCompact = compactText(pair.gameName);
  const categoryCompact = compactText(pair.categoryName);
  const labelCompact = compactText(buildPairLabel(pair));
  const gameAcronym = acronym(pair.gameName);
  const gameAcronymLettersOnly = gameAcronym.replace(/\d+/g, "");
  const labelAcronym = acronym(buildPairLabel(pair));

  const queryTokens = tokenize(query);
  const tokenMatches = queryTokens.filter(
    (token) =>
      gameName.includes(token) ||
      categoryName.includes(token) ||
      labelCompact.includes(token),
  ).length;

  const allTokensMatch =
    queryTokens.length > 0 &&
    queryTokens.every(
      (token) =>
        gameName.includes(token) ||
        categoryName.includes(token) ||
        labelCompact.includes(token),
    );

  const directMatch =
    label.includes(normalizedQuery) ||
    gameName.includes(normalizedQuery) ||
    categoryName.includes(normalizedQuery) ||
    labelCompact.includes(compactQuery) ||
    gameCompact.includes(compactQuery) ||
    categoryCompact.includes(compactQuery);

  const acronymMatch =
    gameAcronym === compactQuery ||
    gameAcronym.startsWith(compactQuery) ||
    gameAcronymLettersOnly === compactQuery ||
    gameAcronymLettersOnly.startsWith(compactQuery) ||
    labelAcronym.startsWith(compactQuery);

  if (!directMatch && !acronymMatch && !allTokensMatch) {
    return 0;
  }

  let score = 0;

  if (gameAcronymLettersOnly === compactQuery) {
    score += 190;
  }
  if (gameAcronym === compactQuery) {
    score += 170;
  }
  if (gameAcronym.startsWith(compactQuery)) {
    score += 120;
  }
  if (gameAcronymLettersOnly.startsWith(compactQuery)) {
    score += 120;
  }
  if (labelAcronym.startsWith(compactQuery)) {
    score += 70;
  }
  if (label.startsWith(normalizedQuery)) {
    score += 115;
  }
  if (gameName.startsWith(normalizedQuery)) {
    score += 105;
  }
  if (categoryName.startsWith(normalizedQuery)) {
    score += 85;
  }
  if (label.includes(normalizedQuery)) {
    score += 70;
  }
  if (gameName.includes(normalizedQuery)) {
    score += 60;
  }
  if (categoryName.includes(normalizedQuery)) {
    score += 50;
  }
  if (labelCompact.includes(compactQuery)) {
    score += 40;
  }
  if (gameCompact.includes(compactQuery)) {
    score += 25;
  }
  if (categoryCompact.includes(compactQuery)) {
    score += 20;
  }
  if (allTokensMatch) {
    score += 45;
  }
  score += tokenMatches * 20;

  return score;
}
