import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { getSectionWithFiles } from "../lib/sections.server";

/**
 * API Route: Section ins Theme installieren
 * POST /app/api/install-section
 * Body: { sectionId: string }
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  // Request Body parsen
  const formData = await request.formData();
  const sectionId = formData.get("sectionId") as string;

  if (!sectionId) {
    return Response.json({ success: false, error: "Section ID fehlt" }, { status: 400 });
  }

  // Section-Dateien laden
  const section = getSectionWithFiles(sectionId);
  if (!section) {
    return Response.json({ success: false, error: "Section nicht gefunden" }, { status: 404 });
  }

  try {
    // 1. Alle Themes abrufen und das Main-Theme finden
    const themesResponse = await admin.graphql(`
      query {
        themes(first: 10) {
          nodes {
            id
            name
            role
          }
        }
      }
    `);

    const themesData = await themesResponse.json();
    const themes = themesData.data?.themes?.nodes || [];
    const mainTheme = themes.find((t: { role: string }) => t.role === "MAIN");

    if (!mainTheme) {
      return Response.json({ success: false, error: "Kein aktives Theme gefunden" }, { status: 400 });
    }

    // Theme ID aus GID extrahieren (gid://shopify/Theme/123456789 -> 123456789)
    const themeId = mainTheme.id.split("/").pop();

    // 2. Section Liquid-Datei ins Theme hochladen
    const sectionFileName = `section-${sectionId}.liquid`;
    
    // CSS in die Liquid-Datei einbetten (inline)
    const liquidWithStyles = `{% comment %}
  Section Hub - ${section.name}
  Version: ${section.version}
  Installiert via Section Hub App
{% endcomment %}

<style>
${section.cssContent}
</style>

${section.liquidContent}`;

    // Asset erstellen via REST API (fetch)
    const shop = session.shop;
    const accessToken = session.accessToken;
    
    const assetResponse = await fetch(
      `https://${shop}/admin/api/2024-10/themes/${themeId}/assets.json`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken || "",
        },
        body: JSON.stringify({
          asset: {
            key: `sections/${sectionFileName}`,
            value: liquidWithStyles,
          },
        }),
      }
    );

    if (!assetResponse.ok) {
      const errorData = await assetResponse.json();
      console.error("Asset upload error:", errorData);
      return Response.json({ 
        success: false, 
        error: "Fehler beim Hochladen der Section" 
      }, { status: 500 });
    }

    return Response.json({ 
      success: true, 
      message: `${section.name} wurde erfolgreich installiert!`,
      sectionFileName,
      themeName: mainTheme.name,
    });

  } catch (error) {
    console.error("Install section error:", error);
    return Response.json({ 
      success: false, 
      error: "Ein Fehler ist aufgetreten" 
    }, { status: 500 });
  }
};
