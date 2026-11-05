import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { checkMove, demo, loadBundle, type Bundle } from "./game";

const STORAGE_KEY = "doublets-game:completed:v1";

function readCompleted(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  } catch { return []; }
}

export default function App() {
  const [bundle, setBundle] = useState<Bundle>(demo);
  const [dataNotice, setDataNotice] = useState("Загружаем игровые данные…");
  const [index, setIndex] = useState(0);
  const [chain, setChain] = useState<string[]>([demo.levels[0].start]);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState<string[]>(readCompleted);
  const [levelPickerOpen, setLevelPickerOpen] = useState(false);
  const [levelFilter, setLevelFilter] = useState<"all" | "open" | "done">("all");

  useEffect(() => {
    let active = true;
    loadBundle().then((loaded) => {
      if (!active) return;
      setBundle(loaded);
      setIndex(0);
      setChain([loaded.levels[0].start]);
      setDataNotice("");
    }).catch(() => {
      if (active) setDataNotice("Демо-режим: подключи JSON в public/game-data, чтобы играть в утверждённые уровни.");
    });
    return () => { active = false; };
  }, []);

  const level = bundle.levels[index];
  const won = chain.at(-1) === level.end;
  const moves = chain.length - 1;
  const currentWord = chain.at(-1)!;
  const matchingPositions = [...level.end].map((letter, i) => letter === [...currentWord][i]);
  const matchingCount = matchingPositions.filter(Boolean).length;

  useEffect(() => {
    if (!won && !levelPickerOpen) inputRef.current?.focus();
  }, [index, won, levelPickerOpen, bundle]);

  function chooseLevel(next: number) {
    setIndex(next);
    setChain([bundle.levels[next].start]);
    setInput("");
    setError("");
    setLevelPickerOpen(false);
  }

  function undoMove() {
    if (chain.length <= 1 || won) return;
    setChain((previous) => previous.slice(0, -1));
    setInput("");
    setError("");
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (won) return;
    const word = input.trim().toLocaleLowerCase("ru");
    if (chain.includes(word)) { setError("Это слово уже есть в цепочке."); return; }
    const issue = checkMove(word, chain.at(-1)!, bundle.words);
    if (issue) { setError(issue); return; }
    setChain((previous) => [...previous, word]);
    setInput("");
    setError("");
    if (word === level.end && !bundle.demo) {
      setCompleted((previous) => {
        if (previous.includes(level.id)) return previous;
        const next = [...previous, level.id];
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* Storage unavailable */ }
        return next;
      });
    }
  }

  return (
    <div className="app">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Doublets — главная">doublets<span className="brand-dot">.</span></a>
        <span className="header-note">Слова меняются. Правила — нет.</span>
      </header>
      <main className="layout">
        <section className="intro" aria-labelledby="game-title">
          <p className="intro-meta">Словесная игра</p>
          <h1 id="game-title">От одного слова<br />к другому.</h1>
          <p className="intro-copy">Меняй одну букву за ход. Каждое новое слово должно существовать. Найди свой путь к цели.</p>
          <div className="rules"><span>Одна буква</span><span>Настоящие слова</span><span>Твой маршрут</span></div>
          {dataNotice && <p className="notice" role="status">{dataNotice}</p>}
        </section>
        <section className="play-area" aria-label="Игровое поле">
          <div className="play-top">
            <div><span className="overline">Уровень</span><strong>{String(index + 1).padStart(2, "0")} <span className="muted">/ {bundle.levels.length}</span></strong></div>
            <div className="play-top-right"><span className="overline">Ходов</span><strong>{moves} <span className="muted">/ мин. {level.min_moves}</span></strong></div>
          </div>
          <div className="target-label">Преврати</div>
          <div className="word word-start" aria-label={`Начальное слово: ${level.start}`}>{[...level.start].map((letter, i) => <span className="letter" key={i}>{letter.toUpperCase()}</span>)}</div>
          <div className="route" aria-live="polite">
            {chain.slice(1).map((word, i) => <div className="route-step" key={i}><span className="route-number">{i + 1}</span><span className="route-letters">{[...word].map((letter, j) => <span key={j} className={letter !== [...chain[i]][j] ? "route-changed" : ""}>{letter.toUpperCase()}</span>)}</span></div>)}

          </div>
          {!won && (
            <form className="move-form tile-move-form" onSubmit={submit}>
              <label htmlFor="next-word">Твой следующий ход</label>
              <div className="tile-input-row">
                <div className="letter-input-wrap" onClick={() => inputRef.current?.focus()}>
                  <div className="letter-input-tiles" aria-hidden="true">{Array.from({ length: level.start.length }, (_, i) => <span className={`input-tile ${i === Math.min(input.length, level.start.length - 1) ? "input-tile-active" : ""}`} key={i}>{[...input][i] || ""}</span>)}</div>
                  <input ref={inputRef} id="next-word" className="letter-input-native" type="text" inputMode="text" value={input} onChange={(event) => { setInput([...event.target.value.toLocaleUpperCase("ru").replace(/[^А-ЯЁ]/g, "")].slice(0, level.start.length).join("")); setError(""); }} maxLength={level.start.length} autoComplete="off" autoCapitalize="characters" spellCheck={false} aria-label={`Следующее слово, ${level.start.length} букв`} aria-invalid={Boolean(error)} aria-describedby={error ? "move-error" : undefined} />
                </div>
                <button type="submit" className="tile-submit" disabled={input.length !== level.start.length}>Ход <span aria-hidden="true">→</span></button>
              </div>
              {error && <p id="move-error" className="error" role="alert">{error}</p>}
            </form>
          )}
          <div className="target-heading"><span className="target-label">В слово</span><span className="match-progress" aria-live="polite">{matchingCount} из {level.end.length} букв на месте</span></div>
          <div className={`word word-end ${won ? "word-complete word-celebrate" : ""}`} aria-label={`Целевое слово: ${level.end}`}>{[...level.end].map((letter, i) => <span className={`letter ${matchingPositions[i] ? "letter-matched" : ""}`} key={i} style={{ "--letter-index": i } as CSSProperties}>{letter.toUpperCase()}</span>)}</div>
          {won && (
            <div className="win win-celebrate" role="status">
              <div className="win-symbol" aria-hidden="true">✓</div><h2>Получилось!</h2>
              <p>{moves === level.min_moves ? "Идеальный маршрут — кратчайший путь." : `Цель достигнута за ${moves} ходов. Кратчайший путь — ${level.min_moves}.`}</p>
              <button onClick={() => chooseLevel((index + 1) % bundle.levels.length)}>{index + 1 < bundle.levels.length ? "Следующий уровень" : "Играть сначала"} <span aria-hidden="true">→</span></button>
            </div>
          )}
          <div className="play-footer">
            <div className="move-actions"><button className="text-button" onClick={undoMove} disabled={chain.length <= 1 || won}>Отменить ход</button><button className="text-button" onClick={() => { setChain([level.start]); setInput(""); setError(""); }} disabled={chain.length <= 1}>Начать заново</button></div>
            <button className="level-picker-trigger" onClick={() => setLevelPickerOpen(true)}>Все уровни <span aria-hidden="true">↗</span></button>
          </div>
        </section>
        {levelPickerOpen && <div className="picker-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setLevelPickerOpen(false); }}>
          <section className="level-picker" role="dialog" aria-modal="true" aria-labelledby="picker-title" onKeyDown={(event) => { if (event.key === "Escape") setLevelPickerOpen(false); }}>
            <div className="picker-header"><div><h2 id="picker-title">Выбери уровень</h2><p>{completed.filter((id) => bundle.levels.some((item) => item.id === id)).length} из {bundle.levels.length} пройдено</p></div><button className="picker-close" aria-label="Закрыть выбор уровней" onClick={() => setLevelPickerOpen(false)}>×</button></div>
            <div className="picker-filters" role="group" aria-label="Фильтр уровней">{([["all", "Все"], ["open", "Не пройдены"], ["done", "Пройдены"]] as const).map(([value, label]) => <button key={value} className={levelFilter === value ? "filter-active" : ""} aria-pressed={levelFilter === value} onClick={() => setLevelFilter(value)}>{label}</button>)}</div>
            <div className="level-grid">{bundle.levels.map((item, i) => { const done = completed.includes(item.id); if ((levelFilter === "done" && !done) || (levelFilter === "open" && done)) return null; return <button key={item.id} className={`level-tile ${i === index ? "tile-current" : ""} ${done ? "tile-done" : ""}`} aria-label={`Уровень ${i + 1}: ${item.start} — ${item.end}${done ? ", пройден" : ""}`} aria-current={i === index ? "true" : undefined} onClick={() => chooseLevel(i)}><strong>{i + 1}</strong><span>{item.start} → {item.end}</span>{done && <span className="tile-check" aria-hidden="true">✓</span>}</button>; })}</div>
            {levelFilter === "done" && !bundle.levels.some((item) => completed.includes(item.id)) && <p className="picker-empty">Пока нет пройденных уровней. Самое время начать!</p>}
          </section>
        </div>}
      </main>
      <footer className="site-footer"><span>DOUBLETS · Слово за словом</span><span>Без спешки. С удовольствием.</span></footer>
    </div>
  );
}
