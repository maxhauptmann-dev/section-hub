import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { getSectionWithFiles } from "../lib/sections.server";
import prisma from "../db.server";

/**
 * API Route: Try a section before purchasing
 *
 * Strategy (like competitor "Section Store"):
 * 1. Reuse or create a lightweight "SectionIQ Demo" theme (unpublished).
 * 2. Upload the section + overwrite the index template so the section
 *    is the ONLY thing the merchant sees → instant preview.
 * 3. Deep-link the merchant into the Theme Editor for that theme.
 * 4. Track the preview in DB with a 7-day expiry for auto-cleanup.
 *
 * POST /app/api/try-section
 * Body: { sectionId: string }
 */

const DEMO_THEME_NAME = "SectionIQ Demo";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  const formData = await request.formData();
  const sectionId = formData.get("sectionId") as string;

  if (!sectionId) {
    return Response.json(
      { success: false, error: "Section ID is missing" },
      { status: 400 },
    );
  }

  const section = getSectionWithFiles(sectionId);
  if (!section) {
    return Response.json(
      { success: false, error: "Section not found" },
      { status: 404 },
    );
  }

  const shop = session.shop;

  try {
    // ----------------------------------------------------------------
    // 1. Fetch all themes – look for an existing demo theme
    // ----------------------------------------------------------------
    const themesResponse = await admin.graphql(`
      query {
        themes(first: 50) {
          nodes {
            id
            name
            role
          }
        }
      }
    `);

    const themesData = await themesResponse.json();
    const themes: { id: string; name: string; role: string }[] =
      themesData.data?.themes?.nodes || [];

    // Helper: create a new demo theme by duplicating the main theme
    async function createDemoTheme() {
      const mainTheme = themes.find((t) => t.role === "MAIN");
      if (!mainTheme) {
        return { error: "No active theme found." };
      }

      console.log("Creating demo theme by duplicating:", mainTheme.name);

      const duplicateResponse = await admin.graphql(
        `mutation themeDuplicate($id: ID!, $name: String!) {
          themeDuplicate(id: $id, name: $name) {
            newTheme {
              id
              name
              role
            }
            userErrors {
              field
              message
            }
          }
        }`,
        {
          variables: {
            id: mainTheme.id,
            name: DEMO_THEME_NAME,
          },
        },
      );

      const duplicateData = await duplicateResponse.json();
      const dupErrors =
        duplicateData.data?.themeDuplicate?.userErrors || [];

      if (dupErrors.length > 0) {
        const msg = dupErrors
          .map((e: { message: string }) => e.message)
          .join(", ");
        return { error: `Could not create demo theme: ${msg}` };
      }

      const newTheme = duplicateData.data?.themeDuplicate?.newTheme;
      if (!newTheme) {
        return { error: "Could not create demo theme." };
      }

      console.log("Demo theme created:", newTheme.id);
      // Wait for Shopify to finish duplicating (can take several seconds)
      await new Promise((resolve) => setTimeout(resolve, 6000));
      return { theme: newTheme };
    }

    // Helper: delete a theme by GID
    async function deleteDemoTheme(themeGid: string) {
      try {
        console.log("Deleting stale demo theme:", themeGid);
        await admin.graphql(
          `mutation themeDelete($id: ID!) {
            themeDelete(id: $id) {
              deletedThemeId
              userErrors { field message }
            }
          }`,
          { variables: { id: themeGid } },
        );
      } catch (e) {
        console.error("Failed to delete stale demo theme:", e);
      }
    }

    // Helper: verify theme is accessible via REST (quick HEAD/GET check)
    async function verifyThemeAccessible(themeId: string, token: string): Promise<boolean> {
      try {
        const resp = await fetch(
          `https://${shop}/admin/api/2024-10/themes/${themeId}.json`,
          {
            method: "GET",
            headers: { "X-Shopify-Access-Token": token },
          },
        );
        const data = await resp.json().catch(() => ({}));
        console.log("Try-section: verifyThemeAccessible", {
          themeId,
          status: resp.status,
          ok: resp.ok,
          themeRole: data?.theme?.role,
          themeProcessing: data?.theme?.processing,
        });
        if (!resp.ok) return false;
        // Also try a GET on assets to make sure assets endpoint works
        const assetsResp = await fetch(
          `https://${shop}/admin/api/2024-10/themes/${themeId}/assets.json?asset[key]=config/settings_schema.json`,
          {
            method: "GET",
            headers: { "X-Shopify-Access-Token": token },
          },
        );
        console.log("Try-section: assets endpoint check", {
          themeId,
          assetsStatus: assetsResp.status,
          assetsOk: assetsResp.ok,
        });
        return assetsResp.ok;
      } catch (e) {
        console.error("Try-section: verifyThemeAccessible error", e);
        return false;
      }
    }

    // Reuse existing demo theme if available
    let demoTheme = themes.find(
      (t) => t.name === DEMO_THEME_NAME && t.role === "UNPUBLISHED",
    );

    const accessToken = session.accessToken || "";

    // ----------------------------------------------------------------
    // 2. Verify or create demo theme
    // ----------------------------------------------------------------
    if (demoTheme) {
      // Verify the existing demo theme is actually accessible via REST
      const numericId = demoTheme.id.split("/").pop()!;
      const isAccessible = await verifyThemeAccessible(numericId, accessToken);
      if (!isAccessible) {
        console.log("Demo theme exists in GraphQL but is NOT accessible via REST – deleting and recreating");
        await deleteDemoTheme(demoTheme.id);
        demoTheme = undefined;
      }
    }

    if (!demoTheme) {
      const result = await createDemoTheme();
      if (result.error) {
        return Response.json(
          { success: false, error: result.error },
          { status: result.error === "No active theme found." ? 400 : 500 },
        );
      }
      demoTheme = result.theme!;
    }

    // At this point demoTheme is guaranteed to exist
    const verifiedDemoTheme = demoTheme!;

    // ----------------------------------------------------------------
    // 3. Build section file with embedded CSS
    // ----------------------------------------------------------------
    const sectionFileName = `section-${sectionId}.liquid`;

    const liquidWithStyles = `{% comment %}
  SectionIQ – ${section.name}
  Version: ${section.version}
  ⚠️ PREVIEW MODE – This is a temporary trial.
  Purchase the section to install it permanently on your live theme.
{% endcomment %}

<style>
${section.cssContent || ""}
</style>

${section.liquidContent || ""}`;

    // ----------------------------------------------------------------
    // 4. Override index.json so the section is IMMEDIATELY visible
    //    when the merchant opens the Theme Editor
    // ----------------------------------------------------------------
    const demoIndexTemplate = JSON.stringify(
      {
        sections: {
          [`sh-${sectionId}`]: {
            type: `section-${sectionId}`,
            settings: {},
          },
        },
        order: [`sh-${sectionId}`],
      },
      null,
      2,
    );

    // Upload section file + overwrite index template via REST Asset API

    const numericDemoThemeId = verifiedDemoTheme.id.split("/").pop();

    console.log("Try-section: uploading to theme", { themeGid: verifiedDemoTheme.id, numericId: numericDemoThemeId, shop, hasToken: !!accessToken });

    // Step 1: Upload the section file
    const sectionAssetResponse = await fetch(
      `https://${shop}/admin/api/2024-10/themes/${numericDemoThemeId}/assets.json`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          asset: { key: `sections/${sectionFileName}`, value: liquidWithStyles },
        }),
      }
    );

    if (!sectionAssetResponse.ok) {
      const errData = await sectionAssetResponse.json().catch(() => ({}));
      console.error("Try-section: section upload error:", errData, "Status:", sectionAssetResponse.status);
      return Response.json(
        { success: false, error: "Error uploading section to demo theme." },
        { status: 500 },
      );
    }

    // Wait for Shopify to process the section file
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Step 2: Now upload the index template that references the section
    const templateAssetResponse = await fetch(
      `https://${shop}/admin/api/2024-10/themes/${numericDemoThemeId}/assets.json`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          asset: { key: "templates/index.json", value: demoIndexTemplate },
        }),
      }
    );

    if (!templateAssetResponse.ok) {
      const errData = await templateAssetResponse.json().catch(() => ({}));
      console.error("Try-section: template upload error:", errData);
      return Response.json(
        { success: false, error: "Error setting up demo template." },
        { status: 500 },
      );
    }

    // ----------------------------------------------------------------
    // 5. Build Theme Editor deep-link
    // ----------------------------------------------------------------
    const numericThemeId = verifiedDemoTheme.id.split("/").pop();
    const editorUrl = `https://${shop}/admin/themes/${numericThemeId}/editor`;

    // ----------------------------------------------------------------
    // 6. Save preview in DB (1-day demo)
    // ----------------------------------------------------------------
    const TRIAL_DAYS = 1;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + TRIAL_DAYS);

    await prisma.sectionPreview.upsert({
      where: {
        shop_sectionId: { shop, sectionId },
      },
      update: {
        themeId: verifiedDemoTheme.id,
        themeName: verifiedDemoTheme.name,
        sectionFileName,
        expiresAt,
        removed: false,
        removedAt: null,
      },
      create: {
        shop,
        sectionId,
        themeId: verifiedDemoTheme.id,
        themeName: verifiedDemoTheme.name,
        sectionFileName,
        expiresAt,
      },
    });

    console.log("Try-section success:", {
      section: section.name,
      theme: verifiedDemoTheme.name,
      shop,
      expiresAt,
      editorUrl,
    });

    return Response.json({
      success: true,
      message: `"${section.name}" is ready to preview! The Theme Editor will open with your section.`,
      editorUrl,
      themeName: verifiedDemoTheme.name,
      sectionFileName,
      trialDays: TRIAL_DAYS,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Try-section error:", error);
    return Response.json(
      {
        success: false,
        error: `An error occurred: ${error instanceof Error ? error.message : "Unknown"}`,
      },
      { status: 500 },
    );
  }
};
