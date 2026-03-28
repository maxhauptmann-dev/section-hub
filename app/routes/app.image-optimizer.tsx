import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, useFetcher, useNavigate } from "react-router";
import { authenticate } from "../shopify.server";
import {
  Page,
  Card,
  BlockStack,
  Text,
  Button,
  Banner,
} from "@shopify/polaris";

// ─── Types ───
interface ImageIssue {
  url: string;
  filename: string;
  source: string; // "theme" | "product" | "collection"
  sourceFile?: string;
  currentSize?: number; // bytes
  width?: number;
  height?: number;
  format?: string;
  issues: string[];
  fixes: string[];
  severity: "critical" | "warning" | "info";
  optimizedUrl?: string;
  savings?: number; // estimated % savings
}

interface ScanResult {
  totalImages: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  estimatedSavings: string;
  images: ImageIssue[];
  themeName: string;
  score: number;
  autoFixableCount: number;
}

interface OptimizeResult {
  filesUpdated: number;
  totalChanges: number;
  changedFiles: string[];
  themeName?: string;
}

// ─── Loader ───
export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return { scanned: false };
};

// ─── Helpers ───
function analyzeImageUrl(url: string): { format: string; hasSize: boolean; width?: number; height?: number } {
  const format = url.match(/\.(png|jpg|jpeg|gif|webp|avif|svg|bmp|tiff)(\?|$)/i)?.[1]?.toLowerCase() || "unknown";
  const widthMatch = url.match(/[?&]width=(\d+)/);
  const heightMatch = url.match(/[?&]height=(\d+)/);
  const sizeMatch = url.match(/_(\d+)x(\d+)\./);
  return {
    format,
    hasSize: !!(widthMatch || sizeMatch),
    width: widthMatch ? parseInt(widthMatch[1]) : sizeMatch ? parseInt(sizeMatch[1]) : undefined,
    height: heightMatch ? parseInt(heightMatch[1]) : sizeMatch ? parseInt(sizeMatch[2]) : undefined,
  };
}

function analyzeLiquidForImages(content: string, filename: string): ImageIssue[] {
  const issues: ImageIssue[] = [];
  const seen = new Set<string>();

  // Match Shopify image_url filter usage
  const imgUrlMatches = content.matchAll(/\{\{[^}]*\|\s*image_url[^}]*\}\}/g);
  for (const match of imgUrlMatches) {
    const tag = match[0];
    const hasWidth = /width:\s*\d+/.test(tag);
    const hasFormat = /format:\s*['"]?(webp|avif)/i.test(tag);
    const widthMatch = tag.match(/width:\s*(\d+)/);
    const width = widthMatch ? parseInt(widthMatch[1]) : undefined;

    const tagIssues: string[] = [];
    const tagFixes: string[] = [];
    let severity: "critical" | "warning" | "info" = "info";

    if (!hasWidth) {
      tagIssues.push("No width constraint — full-size image loaded");
      tagFixes.push("Add | image_url: width: 800 (adjust to max display size)");
      severity = "critical";
    } else if (width && width > 2000) {
      tagIssues.push(`Width ${width}px is very large — most displays need ≤1200px`);
      tagFixes.push("Reduce width to 1200 or less for better performance");
      severity = "warning";
    }

    if (!hasFormat) {
      tagIssues.push("Not using modern format (WebP/AVIF)");
      tagFixes.push("Shopify CDN auto-serves WebP when browser supports it — no action needed");
      severity = severity === "critical" ? "critical" : "info";
    }

    if (tagIssues.length > 0) {
      const key = `${filename}:${tag.slice(0, 60)}`;
      if (!seen.has(key)) {
        seen.add(key);
        issues.push({
          url: tag,
          filename: tag.length > 80 ? tag.slice(0, 77) + "..." : tag,
          source: "theme",
          sourceFile: filename,
          issues: tagIssues,
          fixes: tagFixes,
          severity,
          savings: !hasWidth ? 60 : width && width > 2000 ? 40 : 10,
        });
      }
    }
  }

  // Match <img> tags without loading="lazy"
  const imgTagMatches = content.matchAll(/<img\s[^>]*>/gi);
  for (const match of imgTagMatches) {
    const tag = match[0];
    const hasLazy = /loading\s*=\s*["']lazy["']/i.test(tag);
    const hasSrcset = /srcset\s*=/i.test(tag);
    const hasWidthAttr = /width\s*=\s*["']\d+["']/i.test(tag);
    const srcMatch = tag.match(/src\s*=\s*["']([^"']+)["']/i);

    const tagIssues: string[] = [];
    const tagFixes: string[] = [];
    let severity: "critical" | "warning" | "info" = "info";

    if (!hasLazy) {
      tagIssues.push("Missing loading=\"lazy\" — blocks page render");
      tagFixes.push("Add loading=\"lazy\" to defer offscreen images");
      severity = "warning";
    }

    if (!hasSrcset && !hasWidthAttr) {
      tagIssues.push("No srcset or width — browser can't pick optimal size");
      tagFixes.push("Add width/height attributes or use srcset for responsive images");
      severity = severity === "warning" ? "warning" : "info";
    }

    if (srcMatch && tagIssues.length > 0) {
      const key = `${filename}:img:${srcMatch[1].slice(0, 40)}`;
      if (!seen.has(key)) {
        seen.add(key);
        issues.push({
          url: srcMatch[1],
          filename: srcMatch[1].split("/").pop() || "image",
          source: "theme",
          sourceFile: filename,
          issues: tagIssues,
          fixes: tagFixes,
          severity,
          savings: !hasLazy ? 20 : 5,
        });
      }
    }
  }

  // Match img_tag without size
  const imgTagFilterMatches = content.matchAll(/\{\{[^}]*\|\s*img_tag[^}]*\}\}/g);
  for (const match of imgTagFilterMatches) {
    const key = `${filename}:img_tag:${match[0].slice(0, 40)}`;
    if (!seen.has(key)) {
      seen.add(key);
      issues.push({
        url: match[0],
        filename: match[0].length > 80 ? match[0].slice(0, 77) + "..." : match[0],
        source: "theme",
        sourceFile: filename,
        issues: ["Using deprecated img_tag filter"],
        fixes: ["Replace with image_url + image_tag for better performance control"],
        severity: "warning",
        savings: 30,
      });
    }
  }

  return issues;
}

// ─── Optimization transforms ───
function optimizeLiquidContent(content: string): { optimized: string; changeCount: number } {
  let result = content;
  let changeCount = 0;

  // 1. Add width constraint to image_url without one
  // e.g. {{ image | image_url }} → {{ image | image_url: width: 1200 }}
  // e.g. {{ section.settings.image | image_url: height: 400 }} → {{ section.settings.image | image_url: width: 1200, height: 400 }}
  result = result.replace(
    /(\{\{[^}]*\|\s*image_url)(?!:[^}]*width\s*:)(\s*\}\})/g,
    (match, before, after) => {
      changeCount++;
      return `${before}: width: 1200${after}`;
    }
  );
  result = result.replace(
    /(\{\{[^}]*\|\s*image_url\s*:\s*)(?!.*width\s*:)([^}]+)(\}\})/g,
    (match, before, params, after) => {
      changeCount++;
      return `${before}width: 1200, ${params}${after}`;
    }
  );

  // 2. Reduce oversized width constraints (> 2000px → 1200px)
  result = result.replace(
    /(\|\s*image_url[^}]*width\s*:\s*)([2-9]\d{3}|[1-9]\d{4,})/g,
    (match, before, widthStr) => {
      const w = parseInt(widthStr);
      if (w > 2000) {
        changeCount++;
        return `${before}1200`;
      }
      return match;
    }
  );

  // 3. Add loading="lazy" to <img> tags that don't have it
  result = result.replace(
    /<img(\s)(?![^>]*loading\s*=)/gi,
    (match, space) => {
      changeCount++;
      return `<img loading="lazy"${space}`;
    }
  );

  // 4. Replace deprecated img_tag with image_url + image_tag
  // {{ product.image | img_tag }} → {{ product.image | image_url: width: 800 | image_tag: loading: 'lazy' }}
  result = result.replace(
    /(\{\{[^}|]+)\|\s*img_tag\s*(\}\})/g,
    (match, before, after) => {
      changeCount++;
      return `${before}| image_url: width: 800 | image_tag: loading: 'lazy' ${after}`;
    }
  );

  return { optimized: result, changeCount };
}

// ─── Action ───
export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("actionType")?.toString() || "scan";

  try {
    // Get main theme
    const themesResp = await admin.graphql(
      `query { themes(first: 10) { nodes { id name role } } }`
    );
    const themesData = (await themesResp.json()) as any;
    const mainTheme = (themesData.data?.themes?.nodes || []).find(
      (t: { role: string }) => t.role === "MAIN"
    );
    if (!mainTheme) return { success: false, error: "No main theme found" };

    // ─── OPTIMIZE ACTION ───
    if (actionType === "optimize") {
      // Read all liquid files
      const allLiquidResp = await admin.graphql(
        `query($themeId: ID!) {
          theme(id: $themeId) {
            sections: files(first: 250, filenames: ["sections/*.liquid"]) {
              nodes { filename body { ... on OnlineStoreThemeFileBodyText { content } } }
            }
            snippets: files(first: 250, filenames: ["snippets/*.liquid"]) {
              nodes { filename body { ... on OnlineStoreThemeFileBodyText { content } } }
            }
            layouts: files(first: 10, filenames: ["layout/*.liquid"]) {
              nodes { filename body { ... on OnlineStoreThemeFileBodyText { content } } }
            }
          }
        }`,
        { variables: { themeId: mainTheme.id } }
      );
      const allLiquidData = (await allLiquidResp.json()) as any;
      const allFiles = [
        ...(allLiquidData.data?.theme?.sections?.nodes || []),
        ...(allLiquidData.data?.theme?.snippets?.nodes || []),
        ...(allLiquidData.data?.theme?.layouts?.nodes || []),
      ];

      const filesToUpdate: Array<{ filename: string; body: { type: string; value: string } }> = [];
      let totalChanges = 0;
      const changedFiles: string[] = [];

      for (const file of allFiles) {
        const content = file.body?.content;
        if (!content) continue;

        const { optimized, changeCount } = optimizeLiquidContent(content);
        if (changeCount > 0) {
          filesToUpdate.push({
            filename: file.filename,
            body: { type: "TEXT", value: optimized },
          });
          totalChanges += changeCount;
          changedFiles.push(`${file.filename} (${changeCount} fixes)`);
        }
      }

      if (filesToUpdate.length === 0) {
        return { success: true, optimizeResult: { filesUpdated: 0, totalChanges: 0, changedFiles: [] } };
      }

      // Batch upload via REST Asset API
      let filesUpdated = 0;
      const themeId = mainTheme.id.split("/").pop();

      for (const fileToUpdate of filesToUpdate) {
        const assetResponse = await fetch(
          `https://${session.shop}/admin/api/2024-10/themes/${themeId}/assets.json`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "X-Shopify-Access-Token": session.accessToken || "",
            },
            body: JSON.stringify({
              asset: {
                key: fileToUpdate.filename,
                value: fileToUpdate.body.value,
              },
            }),
          }
        );
        if (assetResponse.ok) {
          filesUpdated++;
        } else {
          console.error("Image optimizer REST error for:", fileToUpdate.filename);
        }
      }

      return {
        success: true,
        optimizeResult: {
          filesUpdated,
          totalChanges,
          changedFiles,
          themeName: mainTheme.name,
        },
      };
    }

    // ─── SCAN ACTION ───
    // Read all liquid section files from the theme
    const sectionsResp = await admin.graphql(
      `query($themeId: ID!) {
        theme(id: $themeId) {
          files(first: 250, filenames: ["sections/*.liquid"]) {
            nodes {
              filename
              body { ... on OnlineStoreThemeFileBodyText { content } }
            }
          }
        }
      }`,
      { variables: { themeId: mainTheme.id } }
    );
    const sectionsData = (await sectionsResp.json()) as any;
    const sectionFiles = sectionsData.data?.theme?.files?.nodes || [];

    // Read template files
    const templatesResp = await admin.graphql(
      `query($themeId: ID!) {
        theme(id: $themeId) {
          files(first: 250, filenames: ["templates/*.liquid", "layout/*.liquid", "snippets/*.liquid"]) {
            nodes {
              filename
              body { ... on OnlineStoreThemeFileBodyText { content } }
            }
          }
        }
      }`,
      { variables: { themeId: mainTheme.id } }
    );
    const templatesData = (await templatesResp.json()) as any;
    const templateFiles = templatesData.data?.theme?.files?.nodes || [];

    // Analyze all files for image issues
    const allFiles = [...sectionFiles, ...templateFiles];
    const allIssues: ImageIssue[] = [];

    for (const file of allFiles) {
      const content = file.body?.content;
      if (!content) continue;
      const fileIssues = analyzeLiquidForImages(content, file.filename);
      allIssues.push(...fileIssues);
    }

    // Also check product images via GraphQL
    const productsResp = await admin.graphql(
      `query {
        products(first: 50) {
          nodes {
            title
            featuredImage { url width height }
            images(first: 10) {
              nodes { url width height }
            }
          }
        }
      }`
    );
    const productsData = (await productsResp.json()) as any;
    const products = productsData.data?.products?.nodes || [];
    
    for (const product of products) {
      for (const img of product.images?.nodes || []) {
        const imgIssues: string[] = [];
        const imgFixes: string[] = [];
        let severity: "critical" | "warning" | "info" = "info";

        if (img.width && img.width > 4000) {
          imgIssues.push(`Original image is ${img.width}x${img.height}px — very large`);
          imgFixes.push("Re-upload at max 2048px wide for faster loading");
          severity = "critical";
        } else if (img.width && img.width > 2500) {
          imgIssues.push(`Image is ${img.width}x${img.height}px — larger than needed`);
          imgFixes.push("Consider re-uploading at ≤2048px wide");
          severity = "warning";
        }

        if (imgIssues.length > 0) {
          allIssues.push({
            url: img.url,
            filename: product.title,
            source: "product",
            width: img.width,
            height: img.height,
            issues: imgIssues,
            fixes: imgFixes,
            severity,
            savings: img.width > 4000 ? 50 : img.width > 2500 ? 25 : 5,
          });
        }
      }
    }

    // Calculate score — proportional to total images
    const criticalCount = allIssues.filter((i) => i.severity === "critical").length;
    const warningCount = allIssues.filter((i) => i.severity === "warning").length;
    const infoCount = allIssues.filter((i) => i.severity === "info").length;
    const totalImages = allFiles.reduce((count, file) => {
      const content = file.body?.content || "";
      return count + (content.match(/image_url|img_tag|<img\s/gi) || []).length;
    }, 0) + products.reduce((count: number, p: any) => count + (p.images?.nodes?.length || 0), 0);

    // Score: ratio of issues to total images (weighted)
    const issueWeight = criticalCount * 3 + warningCount * 1.5 + infoCount * 0.5;
    const maxPossibleWeight = Math.max(totalImages * 3, 1);
    const issueRatio = Math.min(issueWeight / maxPossibleWeight, 1);
    const score = Math.max(0, Math.round(100 * (1 - issueRatio)));

    const avgSavings = allIssues.length > 0
      ? Math.round(allIssues.reduce((s, i) => s + (i.savings || 0), 0) / allIssues.length)
      : 0;

    // Count how many theme issues can be auto-fixed
    const autoFixableCount = allIssues.filter((i) => i.source === "theme").length;

    allIssues.sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 };
      return order[a.severity] - order[b.severity];
    });

    const result: ScanResult = {
      totalImages,
      criticalCount,
      warningCount,
      infoCount,
      estimatedSavings: `${avgSavings}%`,
      images: allIssues.slice(0, 100),
      themeName: mainTheme.name,
      score,
      autoFixableCount,
    };

    return { success: true, result };
  } catch (err) {
    console.error("Image optimizer error:", err);
    return { success: false, error: `Failed: ${err instanceof Error ? err.message : "Unknown error"}` };
  }
};

// ─── UI ───
export default function ImageOptimizerPage() {
  const navigate = useNavigate();
  useLoaderData<typeof loader>();
  const fetcher = useFetcher<any>();
  const optimizeFetcher = useFetcher<any>();
  const isScanning = fetcher.state === "submitting" || fetcher.state === "loading";
  const isOptimizing = optimizeFetcher.state === "submitting" || optimizeFetcher.state === "loading";
  const result: ScanResult | null = fetcher.data?.result || null;
  const optimizeResult: OptimizeResult | null = optimizeFetcher.data?.optimizeResult || null;
  const error = fetcher.data?.error || optimizeFetcher.data?.error;

  const scoreColor = (s: number) => s >= 80 ? "#22c55e" : s >= 50 ? "#f59e0b" : "#ef4444";
  const scoreLabel = (s: number) => s >= 80 ? "Great" : s >= 50 ? "Needs Work" : "Poor";
  const ringOffset = (score: number) => 188 - (188 * score / 100);

  return (
    <Page
      title="Image Optimizer"
      subtitle="Scan and optimize your theme images with one click"
      backAction={{ onAction: () => navigate("/app") }}
    >
      <style>{`
        @keyframes io-gradient{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        @keyframes io-ring-fill{0%{stroke-dashoffset:188}100%{stroke-dashoffset:var(--io-ring-target)}}
        @keyframes io-scan{0%{width:0%}50%{width:60%}100%{width:100%}}
        @keyframes io-fade-up{0%{opacity:0;transform:translateY(12px)}100%{opacity:1;transform:translateY(0)}}

        .io-hero{
          background:linear-gradient(-45deg,#eff6ff,#dbeafe,#c7d2fe,#e0e7ff);
          background-size:300% 300%;animation:io-gradient 8s ease infinite;
          border-radius:20px;padding:32px;margin-bottom:20px;
          position:relative;overflow:hidden;
        }
        .io-hero::after{
          content:'';position:absolute;top:0;left:0;right:0;bottom:0;
          background:radial-gradient(circle at 80% 20%,rgba(99,102,241,.08),transparent 60%);pointer-events:none;
        }
        .io-score-ring{animation:io-ring-fill 1.5s ease-out forwards}
        .io-scan-bar{
          height:4px;border-radius:4px;background:#e2e8f0;overflow:hidden;margin-top:12px;
        }
        .io-scan-bar-fill{
          height:100%;background:linear-gradient(90deg,#6366f1,#818cf8);
          animation:io-scan 3s ease-in-out infinite;border-radius:4px;
        }
        .io-stat-card{
          background:rgba(255,255,255,.7);backdrop-filter:blur(12px);
          border:1px solid rgba(226,232,240,.5);border-radius:14px;
          padding:20px 24px;text-align:center;flex:1;min-width:140px;
        }
        .io-result-grid{
          display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;
          margin-top:16px;
        }
        .io-file-item{
          background:#f8fafc;border-radius:10px;padding:12px 16px;
          font-size:13px;color:#475569;animation:io-fade-up .4s ease both;
        }
        .io-file-item strong{color:#1e293b}

        /* Mobile Responsiveness */
        @media(max-width:640px){
          .io-hero{padding:20px 16px;border-radius:14px}
          .io-glass{padding:14px 16px}
        }
      `}</style>

      <BlockStack gap="400">
        {/* Hero */}
        <div className="io-hero">
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 28 }}>🖼️</span>
                  <Text as="h1" variant="headingXl">Image Optimizer</Text>
                </div>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Find unoptimized images in your theme and fix them automatically for faster page speed.
                </Text>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <fetcher.Form method="post">
                  <input type="hidden" name="actionType" value="scan" />
                  <Button
                    variant="primary"
                    size="large"
                    loading={isScanning}
                    submit
                  >
                    {isScanning ? "Scanning..." : result ? "🔍 Re-Scan" : "🔍 Scan Images"}
                  </Button>
                </fetcher.Form>
                {result && result.autoFixableCount > 0 && !optimizeResult && (
                  <optimizeFetcher.Form method="post">
                    <input type="hidden" name="actionType" value="optimize" />
                    <Button
                      variant="primary"
                      tone="success"
                      size="large"
                      loading={isOptimizing}
                      submit
                    >
                      {isOptimizing ? "Optimizing..." : "🔧 Optimize Now"}
                    </Button>
                  </optimizeFetcher.Form>
                )}
              </div>
            </div>

            {(isScanning || isOptimizing) && (
              <div className="io-scan-bar">
                <div className="io-scan-bar-fill" />
              </div>
            )}
          </div>
        </div>

        {error && (
          <Banner tone="critical">
            <p>{error}</p>
          </Banner>
        )}

        {/* ── Optimize Success ── */}
        {optimizeResult && optimizeResult.filesUpdated > 0 && (
          <Card>
            <BlockStack gap="400">
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <span style={{ fontSize: 48 }}>✅</span>
                <div style={{ marginTop: 12 }}>
                  <Text as="h2" variant="headingXl">Optimization Complete!</Text>
                </div>
                <div style={{ marginTop: 8 }}>
                  <Text as="p" variant="bodyLg" tone="subdued">
                    {optimizeResult.totalChanges} image{optimizeResult.totalChanges !== 1 ? "s" : ""} optimized across {optimizeResult.filesUpdated} file{optimizeResult.filesUpdated !== 1 ? "s" : ""} in "{optimizeResult.themeName}"
                  </Text>
                </div>
              </div>

              {/* Stats after optimize */}
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <div className="io-stat-card">
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#22c55e" }}>{optimizeResult.totalChanges}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>Images Optimized</div>
                </div>
                <div className="io-stat-card">
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#6366f1" }}>{optimizeResult.filesUpdated}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>Files Updated</div>
                </div>
                <div className="io-stat-card">
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#f59e0b" }}>~30-60%</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>Faster Loading</div>
                </div>
              </div>

              {/* Changed files list */}
              {optimizeResult.changedFiles.length > 0 && (
                <div>
                  <Text as="h3" variant="headingSm">Updated Files:</Text>
                  <div className="io-result-grid">
                    {optimizeResult.changedFiles.map((f, i) => (
                      <div key={i} className="io-file-item" style={{ animationDelay: `${i * 0.05}s` }}>
                        📄 <strong>{f.split(" (")[0]}</strong>
                        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                          {f.match(/\((.+)\)/)?.[1] || ""}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ textAlign: "center", paddingTop: 8 }}>
                <Text as="p" variant="bodySm" tone="subdued">
                  Click "Re-Scan" to verify your new image score.
                </Text>
              </div>
            </BlockStack>
          </Card>
        )}

        {optimizeResult && optimizeResult.filesUpdated === 0 && (
          <Banner tone="info">
            <p>All theme images are already optimized! Product image issues (oversized uploads) need to be fixed manually in Shopify Admin → Products.</p>
          </Banner>
        )}

        {/* ── Scan Results ── */}
        {result && !optimizeResult && (
          <>
            {/* Score + Summary */}
            <Card>
              <div style={{ display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap", padding: "8px 0" }}>
                {/* Score Ring */}
                <div style={{ position: "relative", width: 100, height: 100, flexShrink: 0 }}>
                  <svg viewBox="0 0 64 64" style={{ width: 100, height: 100, transform: "rotate(-90deg)" }}>
                    <circle cx="32" cy="32" r="30" fill="none" stroke="#e2e8f0" strokeWidth="5" />
                    <circle
                      cx="32" cy="32" r="30" fill="none"
                      stroke={scoreColor(result.score)}
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray="188"
                      strokeDashoffset={ringOffset(result.score)}
                      className="io-score-ring"
                      style={{ "--io-ring-target": ringOffset(result.score) } as any}
                    />
                  </svg>
                  <div style={{
                    position: "absolute", top: "50%", left: "50%",
                    transform: "translate(-50%,-50%)",
                    textAlign: "center",
                  }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: scoreColor(result.score) }}>{result.score}</div>
                  </div>
                </div>

                <div style={{ flex: 1 }}>
                  <Text as="h2" variant="headingLg">
                    Image Score: {scoreLabel(result.score)}
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Theme: "{result.themeName}"
                  </Text>
                </div>
              </div>
            </Card>

            {/* Summary Stats */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <div className="io-stat-card">
                <div style={{ fontSize: 28, fontWeight: 800, color: "#6366f1" }}>{result.totalImages}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>Images Found</div>
              </div>
              <div className="io-stat-card">
                <div style={{ fontSize: 28, fontWeight: 800, color: result.autoFixableCount > 0 ? "#ef4444" : "#22c55e" }}>
                  {result.autoFixableCount}
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>Can Be Optimized</div>
              </div>
              <div className="io-stat-card">
                <div style={{ fontSize: 28, fontWeight: 800, color: "#f59e0b" }}>
                  {result.images.filter(i => i.source === "product").length}
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>Product Issues</div>
              </div>
              <div className="io-stat-card">
                <div style={{ fontSize: 28, fontWeight: 800, color: "#22c55e" }}>~{result.estimatedSavings}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>Potential Savings</div>
              </div>
            </div>

            {/* Score 100 = All good */}
            {result.score === 100 && (
              <Banner tone="success">
                <p>🎉 All images are well optimized! Your store's image performance is excellent.</p>
              </Banner>
            )}

            {/* Optimize CTA */}
            {result.autoFixableCount > 0 && (
              <Card>
                <div style={{ textAlign: "center", padding: "16px 0" }}>
                  <span style={{ fontSize: 36 }}>⚡</span>
                  <div style={{ marginTop: 8 }}>
                    <Text as="h2" variant="headingMd">
                      {result.autoFixableCount} theme image{result.autoFixableCount !== 1 ? "s" : ""} can be automatically optimized
                    </Text>
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <Text as="p" variant="bodySm" tone="subdued">
                      We'll add width constraints, enable lazy loading, and replace deprecated filters to speed up your pages.
                    </Text>
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <optimizeFetcher.Form method="post">
                      <input type="hidden" name="actionType" value="optimize" />
                      <Button
                        variant="primary"
                        tone="success"
                        size="large"
                        loading={isOptimizing}
                        submit
                      >
                        {isOptimizing ? "Optimizing..." : "🔧 Optimize Now"}
                      </Button>
                    </optimizeFetcher.Form>
                  </div>
                </div>
              </Card>
            )}

            {/* Product image hint */}
            {result.images.filter(i => i.source === "product").length > 0 && (
              <Banner tone="warning">
                <p>
                  <strong>{result.images.filter(i => i.source === "product").length} product image issue{result.images.filter(i => i.source === "product").length !== 1 ? "s" : ""} found</strong> (oversized images). These need to be fixed manually in Shopify Admin → Products.
                </p>
              </Banner>
            )}
          </>
        )}

        {/* ── Empty State ── */}
        {!result && !isScanning && !optimizeResult && (
          <Card>
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <span style={{ fontSize: 48 }}>🖼️</span>
              <div style={{ marginTop: 16 }}>
                <Text as="h2" variant="headingLg">Optimize Your Store's Images</Text>
              </div>
              <div style={{ marginTop: 8, maxWidth: 500, margin: "8px auto 24px" }}>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Images account for 50–80% of page weight. We'll scan your theme and product images, 
                  then optimize them with one click for faster loading and better page speed scores.
                </Text>
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 32, flexWrap: "wrap", marginTop: 20 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 32 }}>�</div>
                  <Text as="p" variant="bodySm" fontWeight="semibold">Scan</Text>
                  <Text as="p" variant="bodySm" tone="subdued">Find unoptimized images</Text>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 32 }}>�</div>
                  <Text as="p" variant="bodySm" fontWeight="semibold">Optimize</Text>
                  <Text as="p" variant="bodySm" tone="subdued">One-click auto-fix</Text>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 32 }}>⚡</div>
                  <Text as="p" variant="bodySm" fontWeight="semibold">Faster Store</Text>
                  <Text as="p" variant="bodySm" tone="subdued">Better Core Web Vitals</Text>
                </div>
              </div>
            </div>
          </Card>
        )}
      </BlockStack>
    </Page>
  );
}
