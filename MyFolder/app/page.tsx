"use client";

import {
  AreaChart, Bell, BookOpen, Bot, CalendarDays, ChevronDown, CircleHelp,
  Eye, Flag, GraduationCap, LayoutDashboard, LineChart, Menu, MessageCircle,
  MoreHorizontal, Pencil, Play, Plus, Search, Settings, Sparkles,
  Target, Trophy, Users, Wallet, X,
} from "lucide-react";
import { useMemo, useState } from "react";

const prices = [183,181,179,176,177,173,168,171,166,160,162,157,153,158,154,159,166,164,170,168,174,176,172,180,186,184,188,192,190,197,200,198,206,204,211,208,216,213,221,218,224,230,228,235,232,240];
const watchlist = [
  { ticker: "NVDA", name: "NVIDIA", price: "182.42", change: "+2.51%", up: true },
  { ticker: "AAPL", name: "Apple", price: "224.19", change: "+0.84%", up: true },
  { ticker: "TSLA", name: "Tesla", price: "338.72", change: "−1.32%", up: false },
  { ticker: "BTC", name: "Bitcoin", price: "111,840", change: "+3.17%", up: true },
];
const nav = [
  [LayoutDashboard, "Overview"], [LineChart, "Trade"], [GraduationCap, "Learn"],
  [Wallet, "Portfolio"], [Trophy, "Achievements"], [Users, "Community"],
  [CalendarDays, "Calendar"], [MessageCircle, "Forum"],
] as const;

function Logo() {
  return <div className="brand"><span className="logo-mark"><i /><i /><i /></span><strong>YAMBOL</strong><small>LEARN • TRADE • GROW</small></div>;
}

function MiniChart({ up }: { up: boolean }) {
  return <svg className="mini" viewBox="0 0 72 25" aria-hidden="true"><path d={up ? "M1 20 L12 17 L22 19 L33 10 L43 13 L54 5 L71 2" : "M1 4 L12 8 L22 6 L33 14 L43 11 L54 20 L71 22"} fill="none" stroke={up ? "#40d69c" : "#ff667c"} strokeWidth="2" /></svg>;
}

function MarketChart({ interval }: { interval: string }) {
  const points = useMemo(() => prices.map((p, i) => `${(i / (prices.length - 1)) * 1000},${315 - (p - 150) * 3.2}`).join(" "), []);
  const area = `M 0 315 L ${points.replaceAll(" ", " L ")} L 1000 365 L 0 365 Z`;
  return (
    <div className="chart-wrap">
      <div className="chart-grid" />
      <svg className="chart" viewBox="0 0 1000 365" preserveAspectRatio="none" role="img" aria-label={`Interactive NVIDIA ${interval} price chart`}>
        <defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4ed9a3" stopOpacity=".24"/><stop offset="1" stopColor="#4ed9a3" stopOpacity="0"/></linearGradient></defs>
        <path d={area} fill="url(#chartFill)"/><polyline points={points} fill="none" stroke="#50daa6" strokeWidth="3" vectorEffect="non-scaling-stroke" />
        <line x1="0" y1="158" x2="1000" y2="158" stroke="#8191a7" strokeDasharray="5 7" opacity=".35" />
        <line x1="690" y1="0" x2="690" y2="365" stroke="#8191a7" strokeDasharray="5 7" opacity=".35" />
        <circle cx="690" cy="158" r="7" fill="#0e171b" stroke="#50daa6" strokeWidth="3" />
      </svg>
      <div className="price-tag">$182.42</div><div className="time-tag">AUG 25 · 11:42 AM</div>
      <div className="axis-labels"><span>9:30 AM</span><span>11:00 AM</span><span>1:00 PM</span><span>3:00 PM</span><span>4:00 PM</span></div>
    </div>
  );
}

export default function Home() {
  const [active, setActive] = useState("Trade");
  const [interval, setInterval] = useState("1D");
  const [tool, setTool] = useState("cursor");
  const [balance, setBalance] = useState(25000);
  const [notice, setNotice] = useState("");
  const [sidebar, setSidebar] = useState(true);
  const trade = (side: "Bought" | "Sold") => { setBalance(v => side === "Bought" ? v - 182.42 : v + 182.42); setNotice(`${side} 1 NVDA at $182.42 — paper order filled`); setTimeout(() => setNotice(""), 3500); };

  return <main>
    <header><button className="icon-btn mobile" onClick={() => setSidebar(!sidebar)} aria-label="Toggle menu"><Menu /></button><Logo />
      <div className="search"><Search size={17}/><input aria-label="Search assets" placeholder="Search stocks, crypto or lessons…"/><kbd>⌘ K</kbd></div>
      <div className="header-actions"><button className="market"><span/> Market open <b>4h 18m left</b></button><button className="icon-btn"><Bell size={19}/><em>3</em></button><button className="profile">JA</button></div>
    </header>
    <div className="shell">
      <aside className={sidebar ? "sidebar" : "sidebar hidden"}>
        <nav>{nav.map(([Icon, label]) => <button key={label} onClick={() => setActive(label)} className={active === label ? "active" : ""}><Icon size={19}/>{label}{label === "Learn" && <span className="pill">12%</span>}</button>)}</nav>
        <div className="progress-card"><div><Target size={18}/><span>Daily goal</span><b>2/3</b></div><div className="bar"><i/></div><small>One lesson to keep your streak!</small></div>
        <div className="side-bottom"><button><CircleHelp size={18}/>Help center</button><button><Settings size={18}/>Settings</button><div className="user"><span>JA</span><div><b>Jamie Arden</b><small>Level 4 • 1,240 XP</small></div><MoreHorizontal size={18}/></div></div>
      </aside>

      <section className="workspace">
        <div className="welcome"><div><p className="eyebrow">PAPER TRADING DESK</p><h1>Good morning, Jamie <span>✦</span></h1><p>Practice the market. Learn the math. Build your edge.</p></div><div className="balance"><small>AVAILABLE CASH <Eye size={14}/></small><strong>${balance.toLocaleString(undefined,{minimumFractionDigits:2})}</strong><span>+$1,248.30 <em>this month</em></span></div></div>
        <div className="ticker-strip"><span>MARKET PULSE</span><div><b>S&amp;P 500</b> 6,465.94 <i>+0.41%</i></div><div><b>NASDAQ</b> 21,544.27 <i>+0.63%</i></div><div><b>DOW</b> 45,282.47 <i>+0.18%</i></div><div><b>VIX</b> 14.72 <i className="red">−2.19%</i></div></div>

        <div className="content-grid">
          <div className="main-column">
            <article className="chart-card">
              <div className="asset-head"><div className="asset-icon">N</div><div><h2>NVIDIA <small>NVDA · NASDAQ</small></h2><p><strong>$182.42</strong><span>+$4.47 (2.51%)</span> today</p></div><button className="watch"><Plus size={16}/> Watchlist</button><button className="icon-btn"><MoreHorizontal/></button></div>
              <div className="chart-controls"><div className="tools"><button onClick={() => setTool("cursor")} className={tool === "cursor" ? "selected" : ""}>↖</button><button onClick={() => setTool("line")} className={tool === "line" ? "selected" : ""}><Pencil size={16}/></button><button onClick={() => setTool("text")} className={tool === "text" ? "selected" : ""}>T</button><button onClick={() => setTool("fibo")} className={tool === "fibo" ? "selected" : ""}>Fib</button><button onClick={() => setTool("alert")} className={tool === "alert" ? "selected" : ""}><Bell size={15}/></button></div><div className="intervals">{["10s","1m","5m","30m","1D","1W","1M","1Y"].map(x=><button onClick={()=>setInterval(x)} className={interval===x?"on":""} key={x}>{x}</button>)}</div><button className="indicator"><Sparkles size={15}/> Indicators <ChevronDown size={14}/></button></div>
              <MarketChart interval={interval}/>
              <div className="chart-footer"><span><i className="live-dot"/> LIVE · Delayed 15 sec</span><button>Linear</button><button>Log</button><button>Auto</button></div>
            </article>

            <div className="lower-grid">
              <article className="lesson-card"><div className="lesson-art"><span>LESSON 4 OF 8</span><AreaChart size={58}/></div><div><p className="eyebrow">CONTINUE LEARNING</p><h3>Reading price trends</h3><p>Use slope and rate of change to understand momentum.</p><div className="lesson-meta"><span><BookOpen size={14}/> 8 min</span><span>+150 XP</span></div><button><Play size={15} fill="currentColor"/> Continue lesson</button></div></article>
              <article className="ai-card"><div className="card-title"><span><Bot size={18}/></span><div><h3>Yambol AI insight</h3><small>Educational analysis · Not financial advice</small></div></div><p>NVDA is trading above its 20-day moving average with rising volume. Momentum is positive, but RSI is nearing overbought territory.</p><div className="signal"><span>AI SIGNAL</span><b>MODERATE BUY</b><i>68% confidence</i></div><button>Ask your AI tutor <span>→</span></button></article>
            </div>
          </div>

          <aside className="right-column">
            <article className="watchlist"><div className="card-heading"><div><p className="eyebrow">MY WATCHLIST</p><h3>Daily movers</h3></div><button><Plus size={17}/></button></div>{watchlist.map(w=><div className="stock" key={w.ticker}><button aria-label={`Flag ${w.ticker}`}><Flag size={14}/></button><div className="stock-logo">{w.ticker[0]}</div><div><b>{w.ticker}</b><small>{w.name}</small></div><MiniChart up={w.up}/><div className="quote"><b>${w.price}</b><span className={w.up?"":"down"}>{w.change}</span></div></div>)}<button className="view-all">View full watchlist <span>→</span></button></article>
            <article className="order-card"><div className="tabs"><button className="on">Trade</button><button>Position</button></div><label>Order type<select><option>Market order</option><option>Limit order</option></select></label><div className="order-row"><label>Quantity<input defaultValue="1" type="number" min="1"/></label><label>Estimated value<div className="fake-input">$182.42</div></label></div><div className="buying-power"><span>Buying power</span><b>${balance.toLocaleString(undefined,{maximumFractionDigits:2})}</b></div><div className="trade-buttons"><button onClick={()=>trade("Bought")}>Buy NVDA</button><button onClick={()=>trade("Sold")}>Sell</button></div><small className="disclaimer">Virtual funds only. Orders simulate real market conditions.</small></article>
          </aside>
        </div>
      </section>
    </div>
    <button className="ai-fab"><Bot size={21}/><span>Ask Yambol AI</span></button>
    {notice && <div className="toast"><span>✓</span>{notice}<button onClick={()=>setNotice("")}><X size={16}/></button></div>}
  </main>;
}
