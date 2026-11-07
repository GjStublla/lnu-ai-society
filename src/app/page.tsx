import { ArrowDown, ArrowUpRight, Coffee, Leaf, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header wrap">
        <a href="#home" className="wordmark" aria-label="WattHabit home">
          <Leaf size={25} aria-hidden="true" /> WattHabit<span>.</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#challenges">Challenges</a>
          <a href="#rewards">Rewards</a>
          <a href="#radar">Radar</a>
        </nav>
        <span className="preview-label">Preview · SE4</span>
      </header>

      <main id="main">
        <section id="home" className="hero wrap" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="intro">A little energy for better habits.</p>
            <h1 id="hero-title">Small habits.<br /><em>Real rewards.</em></h1>
            <p className="hero-description">Make room for smarter energy habits in student life. One small step, one stamp at a time.</p>
            <a href="#challenges" className="action">Explore the preview <ArrowDown size={18} aria-hidden="true" /></a>
            <p className="quiet">No meter connection. No account needed.</p>
          </div>
          <figure className="cup-preview">
            <svg viewBox="0 0 360 310" role="img" aria-labelledby="cup-title cup-description">
              <title id="cup-title">An illustrated cup, three fifths full</title>
              <desc id="cup-description">Example participation progress, not measured electricity savings.</desc>
              <defs>
                <clipPath id="cup-clip"><path d="M83 91h182l-17 142c-3 25-24 42-49 42h-33c-25 0-47-17-50-42Z" /></clipPath>
              </defs>
              <path className="steam" d="M144 65c-18-18 17-27 0-45M183 59c-18-18 17-27 0-45M222 65c-18-18 17-27 0-45" fill="none" stroke="#9c927b" strokeWidth="3" strokeLinecap="round" />
              <path d="M262 115h17c54 0 54 83-9 83h-18" fill="none" stroke="#d6cfb9" strokeWidth="17" />
              <path d="M83 91h182l-17 142c-3 25-24 42-49 42h-33c-25 0-47-17-50-42Z" fill="#fdfbf6" stroke="#d6cfb9" strokeWidth="3" />
              <g clipPath="url(#cup-clip)"><path d="M78 163c44-12 72 11 110 0s64-9 87 0v117H78Z" fill="#467252" /><path d="M80 163c44-12 72 11 110 0s64-9 87 0" stroke="#799a74" strokeWidth="5" fill="none" /></g>
              <path d="M65 286h226" stroke="#c2b99f" strokeWidth="3" strokeLinecap="round" />
              <path d="m165 211 11 11 24-26" fill="none" stroke="#fdfbf6" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <figcaption>
              <strong>Little steps add up.</strong>
              <span>3 of 5 stamps · illustrative progress</span>
              <div className="stamps" aria-hidden="true"><i /><i /><i /><i /><i /></div>
            </figcaption>
          </figure>
        </section>

        <div className="preview-notice wrap"><Sparkles size={18} aria-hidden="true" /><p>You’re exploring an early preview. Live prices, the coach and saved progress are coming next.</p></div>

        <section id="challenges" className="section wrap" aria-labelledby="challenges-title">
          <div className="section-heading"><h2 id="challenges-title">A habit for your everyday.</h2><span>01 / Challenges</span></div>
          <div className="challenge-layout">
            <div>
              <p className="status">Price feed not connected · Europe/Stockholm</p>
              <h3>Find a flexible moment.</h3>
              <p>Could laundry or charging fit another part of your day? Start with an activity that works around your schedule.</p>
              <p className="small-copy">Personalized price windows will appear here once live prices are connected. No price recommendation is available in this preview.</p>
            </div>
            <details className="coach-preview">
              <summary>Why move an activity to another time?</summary>
              <p>A lower spot price may lower the cost of the same electricity use if your tariff follows those prices. Moving an activity changes when you use energy; it does not automatically reduce kWh.</p>
              <p className="small-copy">Preview explanation · written guidance, no AI request.</p>
            </details>
          </div>
        </section>

        <section id="rewards" className="section rewards-section" aria-labelledby="rewards-title">
          <div className="wrap">
            <div className="section-heading"><h2 id="rewards-title">Something to look forward to.</h2><span>02 / Rewards</span></div>
            <div className="reward-layout">
              <article className="reward-card">
                <Coffee size={26} aria-hidden="true" />
                <h3>Your next little treat.</h3>
                <p>A coffee is one possibility. Think student discounts and campus experiences, too.</p>
                <strong className="demo-label">DEMO — NOT REDEEMABLE</strong>
                <p className="small-copy">Illustration only. No merchant offer or partnership is in place.</p>
              </article>
              <div className="premium-preview"><h3>Keep the good habits free.</h3><p>Energy tips and digital achievements are planned for everyone.</p><p><strong>Proposed premium · about $5/month</strong></p><p className="small-copy">Coming soon: future negotiated local perks. No subscription or payment is available.</p></div>
            </div>
          </div>
        </section>

        <section id="radar" className="section wrap" aria-labelledby="radar-title">
          <div className="section-heading"><h2 id="radar-title">A useful place to start.</h2><span>03 / Radar</span></div>
          <a className="source-link" href="https://www.elprisetjustnu.se/elpris-api" target="_blank" rel="noopener noreferrer">
            <div><span className="status">Public reference · not a promotional offer</span><h3>Get to know Swedish spot prices.</h3><p>Read about the public price source behind WattHabit’s planned price windows.</p><span className="small-copy">Elpriset just nu.se · API documentation · opens in a new tab</span></div><ArrowUpRight size={24} aria-hidden="true" />
          </a>
          <p className="small-copy radar-note">The sourced and dated opportunity feed is not connected yet. No verified offers are shown.</p>
        </section>
      </main>

      <footer className="site-footer wrap"><a href="#home" className="wordmark"><Leaf size={20} aria-hidden="true" /> WattHabit.</a><p>Stamps reflect participation, not verified electricity savings. Spot prices exclude VAT, taxes, grid charges and retailer margins. Your tariff determines whether shifting usage affects your bill.</p><span>Made for student life in Sweden.</span></footer>
    </>
  );
}
