export type Level = { id: string; start: string; end: string; min_moves: number; solution: string[] };
export type Bundle = { levels: Level[]; words: Set<string>; demo: boolean };

export const demo: Bundle = {
  levels: [{ id: "demo-001", start: "кот", end: "год", min_moves: 2, solution: ["кот", "код", "год"] }],
  words: new Set(["кот", "код", "год", "кит", "кид", "рот", "род", "бот", "бог"]),
  demo: true,
};

export function oneLetterApart(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return [...a].reduce((count, char, i) => count + Number(char !== [...b][i]), 0) === 1;
}

export function checkMove(input: string, previous: string, words: Set<string>): string | null {
  const word = input.trim().toLocaleLowerCase("ru");
  if (!word) return "Введите слово.";
  if (!words.has(word)) return "Такого слова нет в игровом словаре.";
  if (!oneLetterApart(previous, word)) return "Измени ровно одну букву.";
  return null;
}

export async function loadBundle(): Promise<Bundle> {
  const [levelsResponse, wordsResponse] = await Promise.all([
    fetch("/game-data/levels.json"), fetch("/game-data/words.json"),
  ]);
  if (!levelsResponse.ok || !wordsResponse.ok) throw new Error("Не удалось загрузить игровые данные.");
  const levelsJson: unknown = await levelsResponse.json();
  const wordsJson: unknown = await wordsResponse.json();
  if (!isObject(levelsJson) || levelsJson.version !== 1 || !Array.isArray(levelsJson.levels) ||
      !isObject(wordsJson) || wordsJson.version !== 1 || !Array.isArray(wordsJson.words) ||
      !wordsJson.words.every((w: unknown) => typeof w === "string")) {
    throw new Error("Неподдерживаемый формат игровых данных.");
  }
  const levels = levelsJson.levels;
  if (!levels.every((level: unknown) => isObject(level) &&
    typeof level.id === "string" && typeof level.start === "string" &&
    typeof level.end === "string" && typeof level.min_moves === "number" &&
    Array.isArray(level.solution) && level.solution.every((w: unknown) => typeof w === "string"))) {
    throw new Error("Некорректный каталог уровней.");
  }
  if (!levels.length) throw new Error("Каталог уровней пуст.");
  return { levels: levels as Level[], words: new Set(wordsJson.words as string[]), demo: false };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
