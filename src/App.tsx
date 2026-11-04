import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
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
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState<string[]>(readCompleted);

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

  function chooseLevel(next: number) {
    setIndex(next);
    setChain([bundle.levels[next].start]);
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
            {!won && <div className="route-hint">↓ <span>Следующее слово</span></div>}
          </div>
          <div className="target-heading"><span className="target-label">В слово</span><span className="match-progress" aria-live="polite">{matchingCount} из {level.end.length} букв на месте</span></div>
          <div className={`word word-end ${won ? "word-complete word-celebrate" : ""}`} aria-label={`Целевое слово: ${level.end}`}>{[...level.end].map((letter, i) => <span className={`letter ${matchingPositions[i] ? "letter-matched" : ""}`} key={i} style={{ "--letter-index": i } as CSSProperties}>{letter.toUpperCase()}</span>)}</div>
          {won ? (
            <div className="win win-celebrate" role="status">
              <div className="win-symbol" aria-hidden="true">✓</div><h2>Получилось!</h2>
              <p>{moves === level.min_moves ? "Идеальный маршрут — кратчайший путь." : `Цель достигнута за ${moves} ходов. Кратчайший путь — ${level.min_moves}.`}</p>
              <button onClick={() => chooseLevel((index + 1) % bundle.levels.length)}>{index + 1 < bundle.levels.length ? "Следующий уровень" : "Играть сначала"} <span aria-hidden="true">→</span></button>
            </div>
          ) : (
            <form className="move-form" onSubmit={submit}>
              <label htmlFor="next-word">Твой следующий ход</label>
              <div className="input-row"><input id="next-word" value={input} onChange={(event) => { setInput(event.target.value); setError(""); }} placeholder="Введи слово" maxLength={level.start.length} autoComplete="off" autoCapitalize="none" spellCheck={false} /><button type="submit">Ход <span aria-hidden="true">→</span></button></div>
              {error && <p className="error" role="alert">{error}</p>}
            </form>
          )}
          <div className="play-footer">
            <button className="text-button" onClick={() => { setChain([level.start]); setInput(""); setError(""); }}>Начать заново</button>
            <label className="level-select-label" htmlFor="level-select">Выбрать уровень <select id="level-select" value={index} onChange={(event) => chooseLevel(Number(event.target.value))}>{bundle.levels.map((item, i) => <option value={i} key={item.id}>{i + 1}{completed.includes(item.id) ? " ✓" : ""} — {item.start} → {item.end}</option>)}</select></label>
          </div>
        </section>
      </main>
      <footer className="site-footer"><span>DOUBLETS · Слово за словом</span><span>Без спешки. С удовольствием.</span></footer>
    </div>
  );
}
