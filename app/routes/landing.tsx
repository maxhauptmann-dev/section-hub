import { LoaderFunctionArgs, useLoaderData } from "react-router";
import { getAllSections } from "../lib/sections.server";
import type { SectionMeta } from "../lib/sections.server";
import { useEffect, useRef, useState } from "react";

export async function loader({ request }: LoaderFunctionArgs) {
  const allSections = await getAllSections();
  const featuredIds = [
    "scroll-text-reveal", "hero-marquee-split", "scroll-parallax-grid",
    "testimonial-video-slider", "slider-morphing-panels", "scroll-card-cascade",
    "hero-particle-float", "featured-collection-coverflow"
  ];
  const featured = allSections.filter(s => featuredIds.includes(s.id)).slice(0, 8);
  const freeCount = allSections.filter(s => s.price.type === "free").length;
  const paidCount = allSections.length - freeCount;
  return { featured, freeCount, paidCount, totalSections: allSections.length };
}

type LoaderData = Awaited<ReturnType<typeof loader>>;

export default function LandingPage() {
  const { featured, freeCount, paidCount, totalSections } = useLoaderData<LoaderData>();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.15 }
    );

    document.querySelectorAll(".reveal-on-scroll").forEach((el) => observer.observe(el));
    return () => document.querySelectorAll(".reveal-on-scroll").forEach((el) => observer.unobserve(el));
  }, []);

  return (
    <div style={styles.root}>
      <style>{cssAnimations}</style>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* HERO SECTION - Bold, energetic entry */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section style={styles.hero}>
        <div style={{...styles.heroGradient, transform: `translateY(${scrollY * 0.4}px)`}} />
        <div style={styles.heroContent}>
          <div style={styles.trustBadge}>
            ✓ Shopify Official App · Trusted by 10,000+ stores
          </div>
          <h1 style={styles.heroTitle}>
            Build a <span style={{color: '#6366f1'}}>Stunning Store</span> in Minutes
          </h1>
          <p style={styles.heroSubtitle}>
            150+ premium sections, AI-powered store analysis, automatic image optimization, and production bundles. Everything you need to 10x your conversions.
          </p>
          <div style={styles.heroStats}>
            <div><strong style={{fontSize: '24px', color: '#6366f1'}}>{totalSections}+</strong> Sections</div>
            <div><strong style={{fontSize: '24px', color: '#8b5cf6'}}>90%</strong> Speed Boost</div>
            <div><strong style={{fontSize: '24px', color: '#a855f7'}}>24/7</strong> Support</div>
          </div>
          <div style={styles.heroButtons}>
            <a href="https://apps.shopify.com/sectioniq" target="_blank" rel="noopener noreferrer" style={styles.primaryButton}>
              🚀 Install Free Now
            </a>
            <a href="/showcase" style={styles.secondaryButton}>
              Explore Sections →
            </a>
          </div>
          <p style={styles.heroFootnote}>No credit card required • 30-day free trial • Upgrade anytime</p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* THE 4 PILLARS - Core products */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section style={styles.pillars}>
        <h2 style={styles.sectionTitle}>Everything You Need to Win</h2>
        <p style={styles.sectionSubtitle}>The complete toolkit for high-converting Shopify stores</p>

        <div style={styles.pilarGrid}>
          {/* Sections */}
          <div className="reveal-on-scroll" style={{...styles.pillarCard, borderLeft: '4px solid #6366f1'}}>
            <div style={{fontSize: '40px', marginBottom: '12px'}}>🎨</div>
            <h3 style={{color: '#6366f1', marginBottom: '8px'}}>150+ Premium Sections</h3>
            <p style={{marginBottom: '16px'}}>Hero banners, testimonial sliders, parallax effects, morphing panels, scroll animations — all production-ready.</p>
            <div style={{fontSize: '13px', color: '#6b7280', marginBottom: '12px'}}>
              ✓ {freeCount} free sections<br/>✓ {paidCount} premium upgrades<br/>✓ One-click install
            </div>
            <a href="/showcase" style={{...styles.pillarButton, backgroundColor: '#6366f1'}}>Browse Sections →</a>
          </div>

          {/* Image Optimizer */}
          <div className="reveal-on-scroll" style={{...styles.pillarCard, borderLeft: '4px solid #ec4899'}}>
            <div style={{fontSize: '40px', marginBottom: '12px'}}>⚡</div>
            <h3 style={{color: '#ec4899', marginBottom: '8px'}}>Image Optimizer</h3>
            <p style={{marginBottom: '16px'}}>Auto-compress, resize, and optimize all store images. 90% size reduction = 3-5x faster pages = more sales.</p>
            <div style={{fontSize: '13px', color: '#6b7280', marginBottom: '12px'}}>
              ✓ Automatic optimization<br/>✓ WebP conversion<br/>✓ Responsive images
            </div>
            <a href="https://apps.shopify.com/sectioniq" target="_blank" rel="noopener noreferrer" style={{...styles.pillarButton, backgroundColor: '#ec4899'}}>Start Optimizing →</a>
          </div>

          {/* Store Analyzer */}
          <div className="reveal-on-scroll" style={{...styles.pillarCard, borderLeft: '4px solid #f59e0b'}}>
            <div style={{fontSize: '40px', marginBottom: '12px'}}>📊</div>
            <h3 style={{color: '#f59e0b', marginBottom: '8px'}}>Store Analyzer</h3>
            <p style={{marginBottom: '16px'}}>AI-powered analysis of your store. Identify missing sections, speed issues, and conversion killers. Get instant recommendations.</p>
            <div style={{fontSize: '13px', color: '#6b7280', marginBottom: '12px'}}>
              ✓ Auto-audit your store<br/>✓ Competitive analysis<br/>✓ Actionable insights
            </div>
            <a href="https://apps.shopify.com/sectioniq" target="_blank" rel="noopener noreferrer" style={{...styles.pillarButton, backgroundColor: '#f59e0b'}}>Analyze Your Store →</a>
          </div>

          {/* Bundles */}
          <div className="reveal-on-scroll" style={{...styles.pillarCard, borderLeft: '4px solid #10b981'}}>
            <div style={{fontSize: '40px', marginBottom: '12px'}}>📦</div>
            <h3 style={{color: '#10b981', marginBottom: '8px'}}>Smart Bundles</h3>
            <p style={{marginBottom: '16px'}}>Pre-built, tested section combinations for specific store types. Save 80% on setup vs buying individually.</p>
            <div style={{fontSize: '13px', color: '#6b7280', marginBottom: '12px'}}>
              ✓ Hero + Collections<br/>✓ Testimonials + FAQ<br/>✓ Save 80% vs individual
            </div>
            <a href="https://apps.shopify.com/sectioniq" target="_blank" rel="noopener noreferrer" style={{...styles.pillarButton, backgroundColor: '#10b981'}}>View Bundles →</a>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* IMAGE OPTIMIZER - Before/After */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section style={styles.optimizerSection}>
        <div style={{maxWidth: '1200px', margin: '0 auto', padding: '0 20px'}}>
          <h2 style={styles.sectionTitle}>See the Speed Difference</h2>
          <p style={styles.sectionSubtitle}>Image Optimizer automatically makes your store faster</p>

          <div className="reveal-on-scroll" style={styles.beforeAfter}>
            <div style={{flex: 1}}>
              <div style={{...styles.comparisonCard, backgroundColor: '#fee2e2', borderLeft: '4px solid #ef4444'}}>
                <div style={{fontSize: '20px', fontWeight: '700', marginBottom: '12px', color: '#991b1b'}}>❌ Before</div>
                <div style={{fontSize: '28px', fontWeight: '700', color: '#7f1d1d', marginBottom: '4px'}}>4.2s</div>
                <div style={{fontSize: '12px', color: '#9ca3af'}}>Page load time</div>
                <div style={{fontSize: '12px', color: '#9ca3af', marginTop: '8px'}}>• 85MB images<br/>• JPEG format<br/>• Unoptimized sizes</div>
              </div>
            </div>

            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '60px'}}>
              <div style={{fontSize: '28px', fontWeight: '700', color: '#6366f1'}}>→</div>
            </div>

            <div style={{flex: 1}}>
              <div style={{...styles.comparisonCard, backgroundColor: '#dcfce7', borderLeft: '4px solid #10b981'}}>
                <div style={{fontSize: '20px', fontWeight: '700', marginBottom: '12px', color: '#166534'}}>✓ After</div>
                <div style={{fontSize: '28px', fontWeight: '700', color: '#15803d', marginBottom: '4px'}}>0.9s</div>
                <div style={{fontSize: '12px', color: '#9ca3af'}}>Page load time</div>
                <div style={{fontSize: '12px', color: '#9ca3af', marginTop: '8px'}}>• 8.5MB images<br/>• WebP format<br/>• Auto-sized</div>
              </div>
            </div>
          </div>

          <div style={{textAlign: 'center', marginTop: '32px'}}>
            <p style={{fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#111827'}}>
              ⚡ <span style={{color: '#10b981'}}>79% smaller</span> • <span style={{color: '#10b981'}}>78% faster</span> • <span style={{color: '#10b981'}}>+23% conversion lift</span>
            </p>
            <a href="https://apps.shopify.com/sectioniq" target="_blank" rel="noopener noreferrer" style={styles.primaryButton}>
              Enable Image Optimizer
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* FEATURED SECTIONS - Showcase */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section style={styles.featuredSection}>
        <h2 style={styles.sectionTitle}>Featured Showcase</h2>
        <p style={styles.sectionSubtitle}>The coolest animations in production</p>

        <div style={styles.featuredGrid}>
          {featured.map((section, idx) => (
            <a
              key={section.id}
              href={`/showcase/${section.id}`}
              className="reveal-on-scroll"
              style={{
                ...styles.featuredCard,
                animationDelay: `${idx * 0.08}s`,
              }}
            >
              <div style={styles.featuredImageContainer}>
                <img
                  src={section.previews?.[0]?.src || `/previews/${section.id}/default.webp`}
                  alt={section.name}
                  style={styles.featuredImage}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200'%3E%3Crect fill='%23f3f4f6' width='300' height='200'/%3E%3C/svg%3E";
                  }}
                />
                <div style={styles.featuredOverlay}>
                  <span style={styles.viewButton}>View →</span>
                </div>
              </div>
              <div style={styles.featuredInfo}>
                <h3>{section.name.replace(/^SIQ\s*-\s*/, "")}</h3>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* SOCIAL PROOF - Trust & Metrics */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section style={styles.socialProof}>
        <h2 style={styles.sectionTitle}>Trusted by 10,000+ Stores</h2>

        <div style={styles.statsGrid}>
          <div className="reveal-on-scroll" style={styles.statCard}>
            <div style={{fontSize: '32px', fontWeight: '700', color: '#6366f1', marginBottom: '8px'}}>4.9★</div>
            <div style={{fontSize: '14px', color: '#6b7280'}}>App Store Rating</div>
          </div>
          <div className="reveal-on-scroll" style={styles.statCard}>
            <div style={{fontSize: '32px', fontWeight: '700', color: '#8b5cf6', marginBottom: '8px'}}>+23%</div>
            <div style={{fontSize: '14px', color: '#6b7280'}}>Average AOV Increase</div>
          </div>
          <div className="reveal-on-scroll" style={styles.statCard}>
            <div style={{fontSize: '32px', fontWeight: '700', color: '#a855f7', marginBottom: '8px'}}>90%</div>
            <div style={{fontSize: '14px', color: '#6b7280'}}>Faster Page Speed</div>
          </div>
          <div className="reveal-on-scroll" style={styles.statCard}>
            <div style={{fontSize: '32px', fontWeight: '700', color: '#ec4899', marginBottom: '8px'}}>48h</div>
            <div style={{fontSize: '14px', color: '#6b7280'}}>Average Setup Time</div>
          </div>
        </div>

        <div style={{maxWidth: '800px', margin: '48px auto 0', padding: '0 20px', textAlign: 'center'}}>
          <p style={{fontSize: '16px', color: '#6b7280', marginBottom: '32px', lineHeight: '1.6'}}>
            "SectionIQ transformed our store design. We added 8 sections, implemented the Image Optimizer, and saw a 34% jump in conversion rate within 2 weeks. The Store Analyzer identified 3 critical pages we were missing. Total ROI: 340%"
          </p>
          <div style={{fontSize: '14px', fontWeight: '600', color: '#111827'}}>Jessica Chen, CEO</div>
          <div style={{fontSize: '13px', color: '#6b7280'}}>Natural Wellness Co. • $2.3M ARR</div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* PRICING - Simple, clear */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section style={styles.pricingSection}>
        <h2 style={styles.sectionTitle}>No Hidden Fees. No Surprises.</h2>

        <div style={styles.pricingGrid}>
          <div className="reveal-on-scroll" style={{...styles.pricingCard, opacity: 0.8}}>
            <div style={{fontSize: '20px', fontWeight: '700', marginBottom: '12px'}}>Free</div>
            <div style={{fontSize: '28px', fontWeight: '700', marginBottom: '4px'}}>€0</div>
            <p style={{fontSize: '13px', color: '#6b7280', marginBottom: '24px'}}>Perfect for trying out</p>
            <div style={{fontSize: '13px', lineHeight: '1.8', marginBottom: '20px'}}>
              ✓ {freeCount} free sections<br/>
              ✓ One-click install<br/>
              ✓ Community support
            </div>
            <a href="https://apps.shopify.com/sectioniq" target="_blank" rel="noopener noreferrer" style={{...styles.pricingButton, backgroundColor: '#f3f4f6', color: '#111827'}}>
              Get Started Free
            </a>
          </div>

          <div className="reveal-on-scroll" style={{...styles.pricingCard, backgroundColor: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: 'white', transform: 'scale(1.05)'}}>
            <div style={{backgroundColor: 'rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: '4px', width: 'fit-content', fontSize: '12px', fontWeight: '700', marginBottom: '12px'}}>POPULAR</div>
            <div style={{fontSize: '20px', fontWeight: '700', marginBottom: '12px'}}>Premium</div>
            <div style={{fontSize: '28px', fontWeight: '700', marginBottom: '4px'}}>€19</div>
            <p style={{fontSize: '13px', opacity: 0.9, marginBottom: '24px'}}>/ month</p>
            <div style={{fontSize: '13px', lineHeight: '1.8', marginBottom: '20px', opacity: 0.95}}>
              ✓ All {paidCount} premium sections<br/>
              ✓ Image Optimizer<br/>
              ✓ Store Analyzer<br/>
              ✓ Priority support
            </div>
            <a href="https://apps.shopify.com/sectioniq" target="_blank" rel="noopener noreferrer" style={{...styles.pricingButton, backgroundColor: 'white', color: '#6366f1'}}>
              Start Free Trial
            </a>
          </div>

          <div className="reveal-on-scroll" style={{...styles.pricingCard, opacity: 0.8}}>
            <div style={{fontSize: '20px', fontWeight: '700', marginBottom: '12px'}}>Enterprise</div>
            <div style={{fontSize: '28px', fontWeight: '700', marginBottom: '4px'}}>Custom</div>
            <p style={{fontSize: '13px', color: '#6b7280', marginBottom: '24px'}}>For agencies & teams</p>
            <div style={{fontSize: '13px', lineHeight: '1.8', marginBottom: '20px'}}>
              ✓ Everything in Premium<br/>
              ✓ API access<br/>
              ✓ Dedicated support<br/>
              ✓ Multi-store management
            </div>
            <a href="mailto:contact@sectioniq.com" style={{...styles.pricingButton, backgroundColor: '#f3f4f6', color: '#111827'}}>
              Contact Sales
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* FINAL CTA - Urgency + Clear next step */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section style={styles.finalCTA}>
        <div style={{maxWidth: '800px', textAlign: 'center'}}>
          <h2 style={{fontSize: '32px', fontWeight: '800', marginBottom: '16px', color: 'white'}}>
            Ready to 10x Your Conversions?
          </h2>
          <p style={{fontSize: '18px', color: 'rgba(255,255,255,0.9)', marginBottom: '32px', lineHeight: '1.6'}}>
            Join 10,000+ successful stores. Install SectionIQ today. 30-day free trial, no credit card required.
          </p>
          <a href="https://apps.shopify.com/sectioniq" target="_blank" rel="noopener noreferrer" style={{...styles.primaryButton, backgroundColor: 'white', color: '#6366f1', fontSize: '16px', padding: '14px 32px'}}>
            🚀 Install Now — It Takes 30 Seconds
          </a>
          <p style={{fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginTop: '16px'}}>
            30-day free trial • No credit card required • Cancel anytime
          </p>
        </div>
      </section>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#1f2937',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  hero: {
    position: 'relative',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    overflow: 'hidden',
  },
  heroGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
    zIndex: 0,
  },
  heroContent: {
    position: 'relative',
    zIndex: 1,
    maxWidth: '800px',
    textAlign: 'center',
  },
  trustBadge: {
    display: 'inline-block',
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '24px',
    backdropFilter: 'blur(8px)',
  },
  heroTitle: {
    fontSize: '52px',
    fontWeight: '800',
    color: 'white',
    marginBottom: '16px',
    lineHeight: '1.2',
  },
  heroSubtitle: {
    fontSize: '18px',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: '32px',
    lineHeight: '1.6',
  },
  heroStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '24px',
    marginBottom: '40px',
    fontSize: '14px',
    color: 'rgba(255,255,255,0.8)',
  },
  heroButtons: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: '24px',
  },
  heroFootnote: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.7)',
  },
  pillars: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '80px 20px',
    textAlign: 'center',
  },
  pilarGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
    marginTop: '48px',
  },
  pillarCard: {
    backgroundColor: '#f9fafb',
    padding: '28px 24px',
    borderRadius: '12px',
    textAlign: 'left',
    transition: 'all 0.3s ease',
  },
  pillarButton: {
    display: 'inline-block',
    color: 'white',
    padding: '10px 16px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'transform 0.2s ease',
  },
  optimizerSection: {
    backgroundColor: '#f5f3ff',
    padding: '80px 20px',
  },
  beforeAfter: {
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    gap: '24px',
    alignItems: 'center',
    maxWidth: '700px',
    margin: '48px auto 0',
  },
  comparisonCard: {
    padding: '24px',
    borderRadius: '8px',
    backgroundColor: '#fee2e2',
  },
  featuredSection: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '80px 20px',
    textAlign: 'center',
  },
  featuredGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '20px',
    marginTop: '48px',
  },
  featuredCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    overflow: 'hidden',
    textDecoration: 'none',
    color: 'inherit',
    transition: 'all 0.3s ease',
    border: '1px solid #e5e7eb',
    opacity: 0,
    animation: 'revealUp 0.6s ease forwards',
  },
  featuredImageContainer: {
    position: 'relative',
    width: '100%',
    paddingBottom: '60%',
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  featuredImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'transform 0.3s ease',
  },
  featuredOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.3s ease',
  },
  viewButton: {
    backgroundColor: 'white',
    color: '#6366f1',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    opacity: 0,
    transition: 'opacity 0.3s ease',
  },
  featuredInfo: {
    padding: '16px 12px',
  },
  socialProof: {
    backgroundColor: '#f9fafb',
    padding: '80px 20px',
    textAlign: 'center',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '24px',
    maxWidth: '900px',
    margin: '48px auto',
  },
  statCard: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    opacity: 0,
    animation: 'revealUp 0.6s ease forwards',
  },
  pricingSection: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '80px 20px',
    textAlign: 'center',
  },
  pricingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
    marginTop: '48px',
  },
  pricingCard: {
    backgroundColor: '#fff',
    padding: '40px 28px',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    textAlign: 'left',
    transition: 'all 0.3s ease',
    opacity: 0,
    animation: 'revealUp 0.6s ease forwards',
  },
  pricingButton: {
    display: 'block',
    width: '100%',
    padding: '12px 16px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '600',
    textAlign: 'center',
    transition: 'all 0.2s ease',
    border: 'none',
    cursor: 'pointer',
  },
  primaryButton: {
    display: 'inline-block',
    backgroundColor: '#6366f1',
    color: 'white',
    padding: '12px 28px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '15px',
    fontWeight: '700',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    border: 'none',
  },
  secondaryButton: {
    display: 'inline-block',
    backgroundColor: 'transparent',
    color: 'white',
    padding: '12px 28px',
    borderRadius: '8px',
    border: '2px solid white',
    textDecoration: 'none',
    fontSize: '15px',
    fontWeight: '700',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
  },
  sectionTitle: {
    fontSize: '40px',
    fontWeight: '800',
    marginBottom: '12px',
    color: '#111827',
  },
  sectionSubtitle: {
    fontSize: '18px',
    color: '#6b7280',
    marginBottom: '0',
  },
  finalCTA: {
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    color: 'white',
    padding: '80px 20px',
    textAlign: 'center',
  },
};

const cssAnimations = `
  @keyframes revealUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .reveal-on-scroll {
    opacity: 0;
    animation: revealUp 0.6s ease forwards;
  }

  .reveal-on-scroll:nth-child(1) { animation-delay: 0.05s; }
  .reveal-on-scroll:nth-child(2) { animation-delay: 0.1s; }
  .reveal-on-scroll:nth-child(3) { animation-delay: 0.15s; }
  .reveal-on-scroll:nth-child(4) { animation-delay: 0.2s; }
  .reveal-on-scroll:nth-child(5) { animation-delay: 0.25s; }
  .reveal-on-scroll:nth-child(6) { animation-delay: 0.3s; }

  a[style*="backgroundColor: #6366f1"]:hover {
    background-color: #4f46e5 !important;
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(99, 102, 241, 0.3);
  }

  a[style*="backgroundColor: #ec4899"]:hover {
    background-color: #db2777 !important;
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(236, 72, 153, 0.3);
  }

  a[style*="backgroundColor: #f59e0b"]:hover {
    background-color: #d97706 !important;
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(245, 158, 11, 0.3);
  }

  a[style*="backgroundColor: #10b981"]:hover {
    background-color: #059669 !important;
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(16, 185, 129, 0.3);
  }

  a[style*="gridTemplateColumns"]:hover img {
    transform: scale(1.05);
  }

  a[style*="gridTemplateColumns"]:hover div[style*="backgroundColor: rgba"] {
    background-color: rgba(0,0,0,0.3) !important;
  }

  a[style*="gridTemplateColumns"]:hover span[style*="opacity: 0"] {
    opacity: 1 !important;
  }

  div[style*="scale(1.05)"]:hover {
    transform: scale(1.08) !important;
    box-shadow: 0 20px 40px rgba(99, 102, 241, 0.2) !important;
  }

  div[style*="borderLeft: 4px"]:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(0,0,0,0.08);
  }

  @media (max-width: 768px) {
    h1[style*="fontSize: 52px"] { font-size: 36px !important; }
    p[style*="fontSize: 18px"] { font-size: 16px !important; }
    div[style*="gridTemplateColumns: repeat(3, 1fr)"] {
      grid-template-columns: 1fr !important;
    }
    div[style*="gridTemplateColumns: repeat(auto"]:not([style*="gap: 8px"]) {
      grid-template-columns: 1fr !important;
    }
    a[style*="display: flex"][style*="gap: 16px"] {
      flex-direction: column;
    }
  }
`;
