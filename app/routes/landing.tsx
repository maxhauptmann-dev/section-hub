import { LoaderFunctionArgs, useLoaderData } from "react-router";
import { getAllSections } from "../lib/sections.server";
import type { SectionMeta } from "../lib/sections.server";
import { useEffect, useRef } from "react";

export async function loader({ request }: LoaderFunctionArgs) {
  const allSections = await getAllSections();

  // Featured sections: coolste mit Scroll/Animation Effekten
  const featuredIds = [
    "scroll-text-reveal",
    "hero-marquee-split",
    "scroll-parallax-grid",
    "testimonial-video-slider",
    "slider-morphing-panels",
    "scroll-card-cascade",
    "hero-particle-float",
    "featured-collection-coverflow"
  ];

  const featured = allSections.filter(s => featuredIds.includes(s.id)).slice(0, 8);
  const freeCount = allSections.filter(s => s.price.type === "free").length;
  const paidCount = allSections.length - freeCount;

  return { featured, freeCount, paidCount, totalSections: allSections.length };
}

type LoaderData = Awaited<ReturnType<typeof loader>>;

export default function LandingPage() {
  const { featured, freeCount, paidCount, totalSections } = useLoaderData<LoaderData>();
  const heroRef = useRef<HTMLDivElement>(null);
  const featuredRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll parallax für Hero
    const handleScroll = () => {
      if (heroRef.current) {
        const scrollY = window.scrollY;
        heroRef.current.style.transform = `translateY(${scrollY * 0.5}px)`;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    // Reveal on scroll für Featured Cards
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1 }
    );

    const cards = document.querySelectorAll(".featured-card");
    cards.forEach((card) => observer.observe(card));

    return () => {
      cards.forEach((card) => observer.unobserve(card));
    };
  }, [featured]);

  return (
    <div style={styles.root}>
      <style>{cssAnimations}</style>

      {/* HERO SECTION */}
      <section style={styles.hero}>
        <div ref={heroRef} style={styles.heroBackground} />
        <div style={styles.heroContent}>
          <div style={styles.trustBadge}>
            ✓ Just approved by Shopify · Free to install
          </div>
          <h1 style={styles.heroTitle}>
            150+ Premium Shopify Sections
          </h1>
          <p style={styles.heroSubtitle}>
            One-click install. No coding. No theme rebuilds. Just stunning sections that instantly improve your store.
          </p>
          <div style={styles.heroButtons}>
            <a href="https://apps.shopify.com/sectioniq" target="_blank" rel="noopener noreferrer" style={styles.primaryButton}>
              Install Free on Shopify
            </a>
            <a href="/showcase" style={styles.secondaryButton}>
              Browse all sections →
            </a>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section style={styles.features}>
        <h2 style={styles.sectionTitle}>Why SectionIQ?</h2>
        <div style={styles.featureGrid}>
          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>✨</div>
            <h3>One-Click Install</h3>
            <p>Add stunning sections to your theme in seconds. No code required.</p>
          </div>
          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>💎</div>
            <h3>Free + Premium Mix</h3>
            <p>{freeCount} free sections, premium upgrades available. You choose what you need.</p>
          </div>
          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>🎨</div>
            <h3>Scroll Effects</h3>
            <p>Parallax, reveal, morphing animations. Sections that move and impress.</p>
          </div>
        </div>
      </section>

      {/* FEATURED SECTIONS - WITH SCROLL EFFECTS */}
      <section ref={featuredRef} style={styles.featuredSection}>
        <h2 style={styles.sectionTitle}>Featured Sections</h2>
        <p style={styles.sectionSubtitle}>The coolest animations & interactions</p>

        <div style={styles.featuredGrid}>
          {featured.map((section, idx) => (
            <a
              key={section.id}
              href={`/showcase/${section.id}`}
              className="featured-card"
              style={{
                ...styles.featuredCard,
                animationDelay: `${idx * 0.1}s`,
              }}
            >
              <div style={styles.featuredImageContainer}>
                <img
                  src={section.previews?.[0]?.src || `/previews/${section.id}/default.webp`}
                  alt={section.name}
                  style={styles.featuredImage}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200'%3E%3Crect fill='%23f3f4f6' width='300' height='200'/%3E%3C/svg%3E";
                  }}
                />
                <div style={styles.featuredOverlay}>
                  <span style={styles.viewButton}>View →</span>
                </div>
              </div>
              <div style={styles.featuredInfo}>
                <h3>{section.name.replace(/^SIQ\s*-\s*/, "")}</h3>
                <p>{section.description.substring(0, 60)}...</p>
              </div>
            </a>
          ))}
        </div>

        <div style={styles.browseAll}>
          <a href="/showcase" style={styles.browseButton}>
            Explore all {totalSections} sections →
          </a>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section style={styles.pricing}>
        <h2 style={styles.sectionTitle}>Flexible Pricing</h2>
        <div style={styles.pricingGrid}>
          <div style={styles.pricingCard}>
            <div style={{ ...styles.pricingBadge, backgroundColor: "#10b981" }}>Free</div>
            <h3>Get Started</h3>
            <p style={styles.price}>€0</p>
            <ul style={styles.priceFeatures}>
              <li>✓ {freeCount} free sections</li>
              <li>✓ One-click install</li>
              <li>✓ Full customization</li>
              <li>✓ Responsive design</li>
            </ul>
            <a href="https://apps.shopify.com/sectioniq" target="_blank" rel="noopener noreferrer" style={styles.pricingButton}>
              Install Free
            </a>
          </div>

          <div style={{ ...styles.pricingCard, border: "2px solid #000" }}>
            <div style={{ ...styles.pricingBadge, backgroundColor: "#f59e0b" }}>Premium</div>
            <h3>Unlock Everything</h3>
            <p style={styles.price}>€9.99–€19.99</p>
            <ul style={styles.priceFeatures}>
              <li>✓ All premium sections</li>
              <li>✓ Advanced animations</li>
              <li>✓ Priority updates</li>
              <li>✓ Premium support</li>
            </ul>
            <a href="https://apps.shopify.com/sectioniq" target="_blank" rel="noopener noreferrer" style={{...styles.pricingButton, backgroundColor: "#000", color: "#fff"}}>
              Explore Premium
            </a>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section style={styles.socialProof}>
        <div style={styles.statGrid}>
          <div style={styles.stat}>
            <div style={styles.statNumber}>{totalSections}+</div>
            <div style={styles.statLabel}>Premium Sections</div>
          </div>
          <div style={styles.stat}>
            <div style={styles.statNumber}>{freeCount}</div>
            <div style={styles.statLabel}>Free Sections</div>
          </div>
          <div style={styles.stat}>
            <div style={styles.statNumber}>✓</div>
            <div style={styles.statLabel}>Shopify Approved</div>
          </div>
        </div>
      </section>

      {/* FOOTER CTA */}
      <section style={styles.footerCta}>
        <h2 style={styles.ctaTitle}>Ready to build your dream store?</h2>
        <p style={styles.ctaSubtitle}>Install SectionIQ free today and start building</p>
        <a href="https://apps.shopify.com/sectioniq" target="_blank" rel="noopener noreferrer" style={styles.ctaButton}>
          Install Free on Shopify
        </a>
      </section>

      {/* SIMPLE FOOTER */}
      <footer style={styles.footer}>
        <p>© 2026 SectionIQ. All rights reserved.</p>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: "#1f2937",
    backgroundColor: "#fff",
    overflowX: "hidden",
  },
  hero: {
    position: "relative",
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    background: "linear-gradient(135deg, #000 0%, #1f2937 100%)",
    color: "#fff",
  },
  heroBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundImage: "radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)",
    pointerEvents: "none",
  },
  heroContent: {
    position: "relative",
    zIndex: 1,
    textAlign: "center",
    maxWidth: "800px",
    padding: "2rem",
  },
  trustBadge: {
    display: "inline-block",
    padding: "0.75rem 1.5rem",
    backgroundColor: "rgba(255,255,255, 0.1)",
    borderRadius: "2rem",
    fontSize: "0.9rem",
    marginBottom: "2rem",
    backdropFilter: "blur(10px)",
  },
  heroTitle: {
    fontSize: "4rem",
    fontWeight: "800",
    margin: "0 0 1rem 0",
    lineHeight: "1.1",
  },
  heroSubtitle: {
    fontSize: "1.25rem",
    color: "#d1d5db",
    margin: "0 0 3rem 0",
    lineHeight: "1.6",
  },
  heroButtons: {
    display: "flex",
    gap: "1rem",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  primaryButton: {
    padding: "1rem 2rem",
    backgroundColor: "#fff",
    color: "#000",
    textDecoration: "none",
    borderRadius: "0.5rem",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "transform 0.2s",
  },
  secondaryButton: {
    padding: "1rem 2rem",
    backgroundColor: "transparent",
    color: "#fff",
    border: "2px solid #fff",
    textDecoration: "none",
    borderRadius: "0.5rem",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  features: {
    padding: "6rem 2rem",
    maxWidth: "1200px",
    margin: "0 auto",
  },
  sectionTitle: {
    fontSize: "2.5rem",
    fontWeight: "800",
    margin: "0 0 3rem 0",
    textAlign: "center",
  },
  sectionSubtitle: {
    fontSize: "1.125rem",
    color: "#6b7280",
    textAlign: "center",
    marginBottom: "3rem",
  },
  featureGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "2rem",
  },
  featureCard: {
    padding: "2rem",
    backgroundColor: "#f9fafb",
    borderRadius: "1rem",
    border: "1px solid #e5e7eb",
    textAlign: "center",
  },
  featureIcon: {
    fontSize: "2.5rem",
    marginBottom: "1rem",
  },
  featuredSection: {
    padding: "6rem 2rem",
    backgroundColor: "#f3f4f6",
    margin: "4rem 0 0 0",
  },
  featuredGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: "2rem",
    maxWidth: "1400px",
    margin: "3rem auto",
  },
  featuredCard: {
    textDecoration: "none",
    color: "inherit",
    borderRadius: "0.75rem",
    overflow: "hidden",
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    cursor: "pointer",
    transition: "all 0.3s",
  },
  featuredImageContainer: {
    position: "relative",
    width: "100%",
    paddingBottom: "66.66%",
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
  },
  featuredImage: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  featuredOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.3s",
  },
  viewButton: {
    color: "#fff",
    fontSize: "1rem",
    fontWeight: "600",
    opacity: 0,
  },
  featuredInfo: {
    padding: "1.5rem",
  },
  browseAll: {
    textAlign: "center",
    marginTop: "3rem",
  },
  browseButton: {
    display: "inline-block",
    padding: "1rem 2rem",
    backgroundColor: "#000",
    color: "#fff",
    textDecoration: "none",
    borderRadius: "0.5rem",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  pricing: {
    padding: "6rem 2rem",
    maxWidth: "1000px",
    margin: "0 auto",
  },
  pricingGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "2rem",
  },
  pricingCard: {
    padding: "2.5rem",
    border: "1px solid #e5e7eb",
    borderRadius: "1rem",
    position: "relative",
  },
  pricingBadge: {
    position: "absolute",
    top: "-12px",
    left: "20px",
    padding: "0.5rem 1rem",
    color: "#fff",
    fontSize: "0.75rem",
    fontWeight: "700",
    borderRadius: "0.375rem",
  },
  price: {
    fontSize: "2.5rem",
    fontWeight: "700",
    margin: "1.5rem 0",
  },
  priceFeatures: {
    listStyle: "none",
    margin: "2rem 0",
    padding: 0,
  },
  pricingButton: {
    display: "block",
    padding: "1rem",
    backgroundColor: "#f3f4f6",
    color: "#000",
    textDecoration: "none",
    textAlign: "center",
    borderRadius: "0.5rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  socialProof: {
    padding: "4rem 2rem",
    backgroundColor: "#1f2937",
    color: "#fff",
    textAlign: "center",
  },
  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "2rem",
    maxWidth: "800px",
    margin: "0 auto",
  },
  stat: {
    padding: "2rem",
  },
  statNumber: {
    fontSize: "2.5rem",
    fontWeight: "800",
    marginBottom: "0.5rem",
  },
  statLabel: {
    fontSize: "1rem",
    color: "#d1d5db",
  },
  footerCta: {
    padding: "6rem 2rem",
    backgroundColor: "#000",
    color: "#fff",
    textAlign: "center",
  },
  ctaTitle: {
    fontSize: "2.5rem",
    fontWeight: "800",
    margin: "0 0 1rem 0",
  },
  ctaSubtitle: {
    fontSize: "1.125rem",
    color: "#d1d5db",
    margin: "0 0 2rem 0",
  },
  ctaButton: {
    display: "inline-block",
    padding: "1rem 2rem",
    backgroundColor: "#fff",
    color: "#000",
    textDecoration: "none",
    borderRadius: "0.5rem",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  footer: {
    padding: "2rem",
    textAlign: "center",
    color: "#6b7280",
    borderTop: "1px solid #e5e7eb",
  },
};

const cssAnimations = `
  .featured-card {
    animation: slideUp 0.6s ease-out both;
    opacity: 0;
  }

  .featured-card.visible {
    animation: slideUp 0.6s ease-out forwards;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  a[style*="primaryButton"]:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2) !important;
  }

  a[style*="secondaryButton"]:hover {
    background-color: rgba(255,255,255,0.1) !important;
  }

  a[style*="browseButton"]:hover {
    background-color: #1f2937 !important;
    transform: translateY(-2px) !important;
  }

  a[style*="ctaButton"]:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2) !important;
  }

  a[style*="featuredCard"]:hover > div[style*="featuredOverlay"] {
    background-color: rgba(0,0,0,0.6) !important;
  }

  a[style*="featuredCard"]:hover span[style*="viewButton"] {
    opacity: 1 !important;
  }

  a[style*="pricingButton"]:hover {
    background-color: #e5e7eb !important;
    transform: translateY(-2px) !important;
  }

  @media (max-width: 768px) {
    h1 { font-size: 2.5rem !important; }
    .featured-grid { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)) !important; }
  }
`;
