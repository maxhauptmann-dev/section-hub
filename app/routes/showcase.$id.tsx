import { LoaderFunctionArgs, useLoaderData, Link } from "react-router";
import { getSectionWithFiles } from "../lib/sections.server";

export async function loader({ params }: LoaderFunctionArgs) {
  const section = await getSectionWithFiles(params.id!);
  if (!section) {
    throw new Response("Section not found", { status: 404 });
  }
  return { section };
}

type LoaderData = Awaited<ReturnType<typeof loader>>;

export default function SectionDetailPage() {
  const { section } = useLoaderData<LoaderData>();

  const displayName = section.name.replace(/^SIQ\s*-\s*/, "");
  const previewSrc = section.previews?.[0]?.src || `/previews/${section.id}/default.webp`;

  const tierLabel = {
    basic: "Free",
    advanced: "Advanced",
    premium: "Premium",
  }[(section.tier as "basic" | "advanced" | "premium") || "basic"] || "Free";

  const tierBadgeColor = {
    basic: "#10b981",
    advanced: "#3b82f6",
    premium: "#f59e0b",
  }[(section.tier as "basic" | "advanced" | "premium") || "basic"] || "#10b981";

  return (
    <div style={styles.container}>
      {/* Back Link */}
      <Link to="/showcase" style={styles.backLink}>
        ← All Sections
      </Link>

      {/* Main Content */}
      <div style={styles.contentWrapper}>
        {/* Preview Image */}
        <div style={styles.previewSection}>
          <img
            src={previewSrc}
            alt={section.name}
            style={styles.previewImage}
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23f3f4f6' width='400' height='300'/%3E%3Ctext x='50%' y='50%' font-size='16' fill='%239ca3af' text-anchor='middle' dominant-baseline='middle'%3EPreview unavailable%3C/text%3E%3C/svg%3E";
            }}
          />
        </div>

        {/* Details Sidebar */}
        <div style={styles.detailsSection}>
          <h1 style={styles.title}>{displayName}</h1>

          <div style={styles.meta}>
            <span
              style={{
                ...styles.tierBadge,
                backgroundColor: tierBadgeColor,
              }}
            >
              {tierLabel}
            </span>

            {section.price?.type === "one_time" && section.price?.amount && section.price.amount > 0 && (
              <span style={styles.price}>€{section.price.amount.toFixed(2)}</span>
            )}
          </div>

          <p style={styles.description}>{section.description}</p>

          {/* CTA Button */}
          <a
            href="https://apps.shopify.com/sectioniq"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.ctaButton}
          >
            Install SectionIQ
          </a>

          {/* Tags */}
          {section.tags && section.tags.length > 0 && (
            <div style={styles.tagsSection}>
              <h3 style={styles.sectionHeading}>Tags</h3>
              <div style={styles.tagsList}>
                {section.tags.map((tag) => (
                  <span key={tag} style={styles.tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Compatibility */}
          {section.compatibility?.themes && section.compatibility.themes.length > 0 && (
            <div style={styles.compatSection}>
              <h3 style={styles.sectionHeading}>Compatible Themes</h3>
              <div style={styles.themesList}>
                {section.compatibility.themes.map((theme) => (
                  <span key={theme} style={styles.theme}>
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Changelog */}
          {section.changelog && section.changelog.length > 0 && (
            <div style={styles.changelogSection}>
              <h3 style={styles.sectionHeading}>Changelog</h3>
              <div style={styles.changelogList}>
                {section.changelog.map((entry) => (
                  <div key={entry.version} style={styles.changelogEntry}>
                    <div style={styles.changelogVersion}>
                      <strong>v{entry.version}</strong>
                      <span style={styles.changelogDate}>{entry.date}</span>
                    </div>
                    <ul style={styles.changesList}>
                      {entry.changes.map((change) => (
                        <li key={change} style={styles.changeItem}>
                          {change}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "2rem 1rem",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
    color: "#1f2937",
  },
  backLink: {
    display: "inline-block",
    marginBottom: "2rem",
    color: "#3b82f6",
    textDecoration: "none",
    fontSize: "0.95rem",
    fontWeight: "500",
    transition: "color 0.2s",
  },
  contentWrapper: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "3rem",
  },
  previewSection: {
    aspectRatio: "16/12",
    backgroundColor: "#f9fafb",
    borderRadius: "0.75rem",
    overflow: "hidden",
    border: "1px solid #e5e7eb",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  detailsSection: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  title: {
    fontSize: "2rem",
    fontWeight: "800",
    margin: "0",
    color: "#111827",
  },
  meta: {
    display: "flex",
    gap: "1rem",
    alignItems: "center",
  },
  tierBadge: {
    padding: "0.5rem 1rem",
    color: "#fff",
    fontSize: "0.875rem",
    fontWeight: "600",
    borderRadius: "0.375rem",
    display: "inline-block",
    width: "fit-content",
  },
  price: {
    fontSize: "1.5rem",
    fontWeight: "700",
    color: "#111827",
  },
  description: {
    fontSize: "1rem",
    lineHeight: "1.6",
    color: "#4b5563",
    margin: "0.5rem 0 1rem 0",
  },
  ctaButton: {
    padding: "0.875rem 1.5rem",
    backgroundColor: "#000",
    color: "#fff",
    border: "none",
    borderRadius: "0.5rem",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-block",
    textAlign: "center",
    transition: "background-color 0.2s",
    width: "100%",
  },
  tagsSection: {
    marginTop: "1rem",
  },
  tagsList: {
    display: "flex",
    gap: "0.75rem",
    flexWrap: "wrap",
  },
  tag: {
    padding: "0.5rem 0.75rem",
    backgroundColor: "#f3f4f6",
    borderRadius: "0.375rem",
    fontSize: "0.875rem",
    color: "#4b5563",
    fontWeight: "500",
  },
  sectionHeading: {
    fontSize: "0.95rem",
    fontWeight: "700",
    margin: "0 0 0.75rem 0",
    color: "#111827",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  compatSection: {
    marginTop: "1rem",
  },
  themesList: {
    display: "flex",
    gap: "0.75rem",
    flexWrap: "wrap",
  },
  theme: {
    padding: "0.5rem 0.75rem",
    backgroundColor: "#e0e7ff",
    color: "#3730a3",
    borderRadius: "0.375rem",
    fontSize: "0.875rem",
    fontWeight: "500",
  },
  changelogSection: {
    marginTop: "1.5rem",
    paddingTop: "1.5rem",
    borderTop: "1px solid #e5e7eb",
  },
  changelogList: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  changelogEntry: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  changelogVersion: {
    display: "flex",
    gap: "1rem",
    alignItems: "center",
  },
  changelogDate: {
    fontSize: "0.875rem",
    color: "#6b7280",
  },
  changesList: {
    margin: "0.5rem 0 0 0",
    paddingLeft: "1.25rem",
    color: "#4b5563",
    fontSize: "0.95rem",
  },
  changeItem: {
    marginBottom: "0.25rem",
    lineHeight: "1.5",
  },
};

const cssString = `
  a:hover[style*="color: #3b82f6"] {
    color: #2563eb !important;
  }

  a[href*="apps.shopify.com"]:hover {
    background-color: #1f2937 !important;
  }

  @media (max-width: 768px) {
    div[style*="gridTemplateColumns: 1fr 1fr"] {
      grid-template-columns: 1fr !important;
      gap: 2rem !important;
    }

    h1[style*="fontSize: 2rem"] {
      font-size: 1.5rem !important;
    }
  }
`;
