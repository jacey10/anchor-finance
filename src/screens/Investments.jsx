import React from 'react';
import { Crown, ShieldCheck, Clock3, ArrowRight, BriefcaseBusiness, TrendingUp, PieChart, Activity } from 'lucide-react';

const FEATURES = [
  { icon: BriefcaseBusiness, title: 'Portfolio Tracking', description: 'Bring your investments together in one consolidated view.' },
  { icon: TrendingUp, title: 'Performance Analytics', description: 'Track gains, losses, and portfolio returns over time.' },
  { icon: PieChart, title: 'Asset Allocation', description: 'Understand how your investments are distributed.' },
  { icon: Activity, title: 'Live Price Updates', description: 'Get real-time price updates for your stocks, mutual funds, and index funds.' }
];

export default function Investments() {
  const scrollToFeatures = () => {
    document.getElementById('upcoming-features')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="screen investments-screen">
      <div className="investments-header">
        <div>
          <div className="investments-title-row">
            <h1 className="screen-title">Investments</h1>
            <span className="pro-badge-large">PRO</span>
          </div>
          <p className="screen-sub">Your investment portfolio, all in one place.</p>
        </div>
      </div>

      <div className="investments-status">
        <span className="status-badge">
          <span className="status-dot"></span>
          In Development
        </span>
      </div>

      <section className="investments-hero">
        <div className="hero-content">
          <div className="hero-badge">
            <Crown size={15} />
            Exclusive to Pro
          </div>
          <h2 className="hero-headline">
            Your wealth deserves <span className="text-gold">a bigger picture.</span>
          </h2>
          <p className="hero-text">
            A more powerful way to track your investments is on the way. Get ready to monitor your portfolio, analyse performance, and understand how your assets grow—all in one place.
          </p>
          <div className="hero-actions">
            <span className="btn-coming-soon">
              <Clock3 size={17} />
              Coming Soon
            </span>
            <button type="button" onClick={scrollToFeatures} className="btn-explore">
              Explore What's Coming
              <ArrowRight size={17} />
            </button>
          </div>
          <p className="hero-footer">
            <ShieldCheck size={15} />
            An upcoming addition to your Pro membership
          </p>
        </div>
        <div className="hero-preview">
          <img src="/assets/investment-preview-light.png" alt="Investment Dashboard Preview (Light)" className="preview-image preview-light" />
          <img src="/assets/investment-preview-dark.png" alt="Investment Dashboard Preview (Dark)" className="preview-image preview-dark" />
        </div>
      </section>

      <section id="upcoming-features" className="investments-features">
        <div className="features-header">
          <div>
            <p className="features-eyebrow">The Pro experience</p>
            <h2 className="features-title">Upcoming Pro Features</h2>
            <p className="features-sub">Everything you need to make smarter investment decisions.</p>
          </div>
        </div>
        <div className="features-grid">
          {FEATURES.map((feature, index) => (
            <article key={feature.title} className="feature-card">
              <div className="feature-icon-wrap">
                <feature.icon size={22} />
              </div>
              <div className="feature-content">
                <div className="feature-title-row">
                  <h3>{feature.title}</h3>
                  <span className="feature-number">0{index + 1}</span>
                </div>
                <p>{feature.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="investments-banner">
        <div className="banner-icon-wrap">
          <Crown size={23} />
        </div>
        <div className="banner-content">
          <h2>More clarity. Better visibility. Smarter investing.</h2>
          <p>We're building a more complete investment experience for Pro members. Your portfolio deserves more than a snapshot.</p>
        </div>
      </section>
    </div>
  );
}