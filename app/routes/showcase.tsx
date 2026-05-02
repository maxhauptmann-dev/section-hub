import { LoaderFunctionArgs, useLoaderData, useSearchParams } from "react-router";
import { getAllSections, getSectionCategories } from "../lib/sections.server";
import type { SectionMeta } from "../lib/sections.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category") ?? "All";
  const query = url.searchParams.get("q") ?? "";

  const allSections = await getAllSections();
  const categories = await getSectionCategories();

  let sections = allSections;

  if (category !== "All") {
    sections = sections.filter((s) =>
      Array.isArray(s.category)
        ? s.category.some((c) => c.toLowerCase() === category.toLowerCase())
        : s.category.toLowerCase() === category.toLowerCase()
    );
  }

  if (query) {
    sections = sections.filter(
      (s) =>
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.description.toLowerCase().includes(query.toLowerCase()) ||
        s.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
    );
  }

  return {
    sections,
    categories: ["All", ...categories],
    activeCategory: category,
    query,
  };
}

type LoaderData = Awaited<ReturnType<typeof loader>>;

export default function ShowcasePage() {
  const { sections, categories, activeCategory, query } =
    useLoaderData<LoaderData>();
  const [searchParams, setSearchParams] = useSearchParams();

  const handleCategoryChange = (cat: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("category", cat);
    params.delete("q");
    setSearchParams(params);
  };

  const handleSearch = (q: string) => {
    const params = new URLSearchParams(searchParams);
    if (q) {
      params.set("q", q);
    } else {
      params.delete("q");
    }
    setSearchParams(params);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerLeft}>
            <h1 style={styles.title}>SectionIQ</h1>
            <p style={styles.subtitle}>Browse {sections.length} Premium Shopify Sections</p>
          </div>
          <a
            href="https://apps.shopify.com/sectioniq"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.ctaButton}
          >
            Install App
          </a>
        </div>

        {/* Search Bar */}
        <div style={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search sections..."
            defaultValue={query}
            onChange={(e) => handleSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>
      </header>

      {/* Category Filter */}
      <nav style={styles.filterNav}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategoryChange(cat)}
            style={{
              ...styles.filterButton,
              ...(activeCategory === cat ? styles.filterButtonActive : {}),
            }}
          >
            {cat}
          </button>
        ))}
      </nav>

      {/* Sections Grid */}
      <div style={styles.grid}>
        {sections.map((section) => (
          <SectionCard key={section.id} section={section} />
        ))}
      </div>

      {sections.length === 0 && (
        <div style={styles.emptyState}>
          <p>No sections found. Try a different search or category.</p>
        </div>
      )}
    </div>
  );
}

function SectionCard({ section }: { section: SectionMeta }) {
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

  const displayName = section.name.replace(/^SIQ\s*-\s*/, "");
  const previewSrc = section.previews?.[0]?.src || `/previews/${section.id}/default.webp`;

  return (
    <a href={`/showcase/${section.id}`} style={styles.card}>
      <div style={styles.cardImageContainer}>
        <img
          src={previewSrc}
          alt={section.name}
          style={styles.cardImage}
          onError={(e) => {
            (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='120'%3E%3Crect fill='%23f3f4f6' width='200' height='120'/%3E%3Ctext x='50%' y='50%' font-size='12' fill='%239ca3af' text-anchor='middle' dominant-baseline='middle'%3EPreview unavailable%3C/text%3E%3C/svg%3E";
          }}
        />
      </div>

      <div style={styles.cardContent}>
        <h3 style={styles.cardTitle}>{displayName}</h3>

        <div style={styles.cardMeta}>
          <span
            style={{
              ...styles.tierBadge,
              backgroundColor: tierBadgeColor,
            }}
          >
            {tierLabel}
          </span>
          {section.price?.type === "one_time" && section.price?.amount && section.price.amount > 0 && (
            <span style={styles.priceLabel}>
              €{section.price.amount.toFixed(2)}
            </span>
          )}
        </div>

        {section.tags && section.tags.length > 0 && (
          <div style={styles.cardTags}>
            {section.tags.slice(0, 2).map((tag) => (
              <span key={tag} style={styles.tag}>
                {tag}
              </span>
            ))}
            {section.tags.length > 2 && (
              <span style={styles.tag}>+{section.tags.length - 2}</span>
            )}
          </div>
        )}
      </div>
    </a>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "2rem 1rem",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
    color: "#1f2937",
  },
  header: {
    marginBottom: "3rem",
  },
  headerContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "2rem",
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: "2.5rem",
    fontWeight: "800",
    margin: "0 0 0.5rem 0",
    color: "#111827",
  },
  subtitle: {
    fontSize: "1.125rem",
    color: "#6b7280",
    margin: "0",
  },
  ctaButton: {
    padding: "0.75rem 1.5rem",
    backgroundColor: "#000",
    color: "#fff",
    border: "none",
    borderRadius: "0.5rem",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-block",
    transition: "background-color 0.2s",
  },
  searchContainer: {
    display: "flex",
    gap: "0.5rem",
  },
  searchInput: {
    flex: 1,
    padding: "0.75rem 1rem",
    fontSize: "1rem",
    border: "1px solid #d1d5db",
    borderRadius: "0.5rem",
    outline: "none",
  },
  filterNav: {
    display: "flex",
    gap: "0.75rem",
    overflowX: "auto",
    marginBottom: "2rem",
    paddingBottom: "0.5rem",
    WebkitOverflowScrolling: "touch",
  },
  filterButton: {
    padding: "0.5rem 1rem",
    backgroundColor: "#f3f4f6",
    border: "1px solid #d1d5db",
    borderRadius: "0.375rem",
    fontSize: "0.95rem",
    fontWeight: "500",
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all 0.2s",
  },
  filterButtonActive: {
    backgroundColor: "#000",
    color: "#fff",
    borderColor: "#000",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "1.5rem",
  },
  card: {
    textDecoration: "none",
    color: "inherit",
    border: "1px solid #e5e7eb",
    borderRadius: "0.75rem",
    overflow: "hidden",
    transition: "all 0.2s",
    cursor: "pointer",
  },
  cardImageContainer: {
    width: "100%",
    paddingBottom: "60%",
    position: "relative",
    backgroundColor: "#f9fafb",
    overflow: "hidden",
  },
  cardImage: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  cardContent: {
    padding: "1rem",
  },
  cardTitle: {
    fontSize: "0.95rem",
    fontWeight: "600",
    margin: "0 0 0.75rem 0",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  cardMeta: {
    display: "flex",
    gap: "0.5rem",
    alignItems: "center",
    marginBottom: "0.75rem",
  },
  tierBadge: {
    padding: "0.25rem 0.5rem",
    color: "#fff",
    fontSize: "0.75rem",
    fontWeight: "600",
    borderRadius: "0.25rem",
    display: "inline-block",
  },
  priceLabel: {
    fontSize: "0.75rem",
    fontWeight: "600",
    color: "#6b7280",
  },
  cardTags: {
    display: "flex",
    gap: "0.5rem",
    flexWrap: "wrap",
  },
  tag: {
    fontSize: "0.7rem",
    padding: "0.25rem 0.5rem",
    backgroundColor: "#f3f4f6",
    borderRadius: "0.25rem",
    color: "#4b5563",
  },
  emptyState: {
    textAlign: "center",
    padding: "3rem 1rem",
    color: "#6b7280",
  },
};

const cssString = `
  a:hover[style*="border: 1px solid #e5e7eb"] {
    border-color: #bfdbfe !important;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1) !important;
    transform: translateY(-2px) !important;
  }

  button:hover[style*="backgroundColor: #f3f4f6"] {
    background-color: #e5e7eb !important;
  }

  a[href*="apps.shopify.com"]:hover {
    background-color: #1f2937 !important;
  }

  input[type="text"]:focus {
    border-color: #3b82f6 !important;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
  }
`;
