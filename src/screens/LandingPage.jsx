import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      {/* Header/Navigation */}
      <header className="landing-header">
        <div className="header-container">
          <div className="logo">
            <span className="logo-icon"></span>
            <span className="logo-text">Anchor</span>
          </div>
          
          <nav className="nav-links">
            <a href="#features" className="nav-link">Features</a>
            <a href="#how-it-works" className="nav-link">How It Works</a>
            <a href="#upcoming" className="nav-link">Upcoming</a>
            <a href="#contact" className="nav-link">Contact</a>
          </nav>
          
          <div className="header-actions">
            <button className="btn btn-ghost" onClick={() => navigate('/auth', { state: { isLogin: true } })}>
              Sign In
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/auth', { state: { isLogin: false } })}>
              Get Started
            </button>
          </div>
          
          <button className="mobile-menu-btn">☰</button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">
              Anchor Your<br />
              <span className="highlight">Financial Future</span>
            </h1>
            <p className="hero-subtitle">
              Take control of your money with intelligent tracking, 
              smart budgeting, and powerful insights. Build wealth with confidence.
            </p>
            <div className="hero-actions">
              <button className="btn btn-primary btn-large" onClick={() => navigate('/auth', { state: { isLogin: false } })}>
                Start Free Trial
              </button>
              <button className="btn btn-outline btn-large" onClick={() => document.getElementById('how-it-works').scrollIntoView({ behavior: 'smooth' })}>
                Learn More
              </button>
            </div>
            <p className="hero-note">No credit card required • Free forever plan</p>
          </div>
          <div className="hero-image">
            <img src="/auth-bg.png" alt="Financial Growth" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Everything You Need to Master Your Money</h2>
            <p className="section-subtitle">Powerful tools designed to help you track, plan, and grow your wealth.</p>
          </div>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon"></div>
              <h3>Net Worth Tracking</h3>
              <p>See your total wealth at a glance. Track assets, liabilities, and watch your net worth grow over time.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3>Smart Budgeting</h3>
              <p>Set monthly budgets for categories and get alerts when you're approaching your limits.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">📈</div>
              <h3>Expense Analytics</h3>
              <p>Beautiful charts show exactly where your money goes. Identify spending patterns and optimize.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">👨‍👩‍👧</div>
              <h3>Family Support</h3>
              <p>Manage support for family members with individual budgets and tracking.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">💰</div>
              <h3>Goal Setting</h3>
              <p>Save for what matters—emergency fund, vacation, car, or house. Track progress visually.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon"></div>
              <h3>Multi-Currency</h3>
              <p>Track Naira and Dollar holdings with real-time exchange rate conversion.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="how-it-works-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Simple, Powerful, Effective</h2>
            <p className="section-subtitle">Get started in minutes, not hours.</p>
          </div>
          
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3>Create Your Account</h3>
              <p>Sign up in seconds. No credit card required.</p>
            </div>
            
            <div className="step-card">
              <div className="step-number">2</div>
              <h3>Set Your Starting Balance</h3>
              <p>Enter your current savings and monthly income.</p>
            </div>
            
            <div className="step-card">
              <div className="step-number">3</div>
              <h3>Track Every Transaction</h3>
              <p>Log income and expenses in seconds. Categorize automatically.</p>
            </div>
            
            <div className="step-card">
              <div className="step-number">4</div>
              <h3>Watch Your Wealth Grow</h3>
              <p>See insights, adjust budgets, and hit your goals faster.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming Features */}
      <section id="upcoming" className="upcoming-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Coming Soon</h2>
            <p className="section-subtitle">We're constantly improving. Here's what's next:</p>
          </div>
          
          <div className="features-grid">
            <div className="feature-card upcoming">
              <div className="feature-icon">📱</div>
              <h3>Mobile Apps</h3>
              <p>Native iOS and Android apps for tracking on the go.</p>
              <span className="badge">In Development</span>
            </div>
            
            <div className="feature-card upcoming">
              <div className="feature-icon"></div>
              <h3>Bank Sync</h3>
              <p>Automatically import transactions from your bank accounts.</p>
              <span className="badge">Planned</span>
            </div>
            
            <div className="feature-card upcoming">
              <div className="feature-icon">📧</div>
              <h3>Email Reports</h3>
              <p>Weekly and monthly financial summaries sent to your inbox.</p>
              <span className="badge">Planned</span>
            </div>
            
            <div className="feature-card upcoming">
              <div className="feature-icon">🔔</div>
              <h3>Smart Alerts</h3>
              <p>Get notified about unusual spending or bill due dates.</p>
              <span className="badge">Planned</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to Take Control?</h2>
            <p>Join thousands of users who are building wealth with Anchor.</p>
            <button className="btn btn-primary btn-large" onClick={() => navigate('/auth', { state: { isLogin: false } })}>
              Get Started Free
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="landing-footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="logo">
                <span className="logo-icon"></span>
                <span className="logo-text">Anchor</span>
              </div>
              <p>Empowering you to build wealth and achieve financial freedom.</p>
            </div>
            
            <div className="footer-links">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#upcoming">Roadmap</a>
              <a href="#">Pricing</a>
            </div>
            
            <div className="footer-links">
              <h4>Company</h4>
              <a href="#">About</a>
              <a href="#">Blog</a>
              <a href="#contact">Contact</a>
            </div>
            
            <div className="footer-links">
              <h4>Legal</h4>
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
              <a href="#">Security</a>
            </div>
          </div>
          
          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} Anchor Finance. All rights reserved.</p>
            <div className="social-links">
              <a href="#">Twitter</a>
              <a href="#">LinkedIn</a>
              <a href="#">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}