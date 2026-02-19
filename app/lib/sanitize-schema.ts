// ─── Sanitize Shopify Schema — fix common AI generation mistakes ───
// Shared module used by both Section AI generator and My Sections installer.

// Allowed attributes PER setting type in Shopify
// This is the single source of truth — anything not listed here gets stripped.
const SETTING_ATTRS_BY_TYPE: Record<string, Set<string>> = {
  // Input types
  text:              new Set(["type", "id", "label", "default", "info", "placeholder"]),
  textarea:          new Set(["type", "id", "label", "default", "info", "placeholder"]),
  richtext:          new Set(["type", "id", "label", "default", "info"]),
  inline_richtext:   new Set(["type", "id", "label", "default", "info"]),
  number:            new Set(["type", "id", "label", "default", "info", "placeholder"]),
  range:             new Set(["type", "id", "label", "default", "info", "min", "max", "step", "unit"]),

  // Selection types
  select:            new Set(["type", "id", "label", "default", "info", "options"]),
  radio:             new Set(["type", "id", "label", "default", "info", "options"]),
  checkbox:          new Set(["type", "id", "label", "default", "info"]),

  // Color types
  color:             new Set(["type", "id", "label", "default", "info"]),
  color_background:  new Set(["type", "id", "label", "default", "info"]),
  color_scheme:      new Set(["type", "id", "label", "default", "info"]),
  color_scheme_group:new Set(["type", "id", "label", "default", "info"]),

  // Media / resource types
  image_picker:      new Set(["type", "id", "label", "info"]),
  video_url:         new Set(["type", "id", "label", "info", "accept", "placeholder"]),
  url:               new Set(["type", "id", "label", "info"]),

  // Resource types
  product:           new Set(["type", "id", "label", "info"]),
  collection:        new Set(["type", "id", "label", "info"]),
  page:              new Set(["type", "id", "label", "info"]),
  blog:              new Set(["type", "id", "label", "info"]),
  article:           new Set(["type", "id", "label", "info"]),
  link_list:         new Set(["type", "id", "label", "info"]),
  font_picker:       new Set(["type", "id", "label", "default", "info"]),

  // Specialized
  html:              new Set(["type", "id", "label", "info"]),
  liquid:            new Set(["type", "id", "label", "info"]),
  product_list:      new Set(["type", "id", "label", "info", "limit"]),
  collection_list:   new Set(["type", "id", "label", "info", "limit"]),

  // Sidebar / decorative (no id required)
  header:            new Set(["type", "content", "info"]),
  paragraph:         new Set(["type", "content"]),
};

// Fallback: if type is unknown, only allow the most basic keys
const FALLBACK_ATTRS = new Set(["type", "id", "label", "default", "info"]);

function sanitizeSetting(setting: any, noDefaultTypes: Set<string>, supportedTypes: Set<string>): any {
  if (!setting || !setting.type) return setting;

  // 1. Determine allowed attributes for this specific type
  const allowedKeys = SETTING_ATTRS_BY_TYPE[setting.type] || FALLBACK_ATTRS;

  // 2. Strip ALL attributes not allowed for this type
  for (const key of Object.keys(setting)) {
    if (!allowedKeys.has(key)) {
      delete setting[key];
    }
  }

  // 3. header and paragraph use "content" instead of "label" and don't need "id"
  if (setting.type === "header" || setting.type === "paragraph") {
    return setting;
  }

  // 4. Remove "default" from types that don't support it
  if (noDefaultTypes.has(setting.type) && setting.default !== undefined) {
    delete setting.default;
  }

  // 5. Type-specific default fixes
  if (setting.type === "richtext" && setting.default && typeof setting.default === "string") {
    if (!setting.default.startsWith("<p>")) {
      setting.default = `<p>${setting.default}</p>`;
    }
  }

  if (setting.type === "inline_richtext" && setting.default !== undefined) {
    setting.default = String(setting.default);
  }

  if (setting.type === "textarea" && setting.default !== undefined) {
    setting.default = String(setting.default);
  }

  if (setting.type === "text" && setting.default !== undefined) {
    setting.default = String(setting.default);
  }

  // range: validate min, max, step, default, unit
  if (setting.type === "range") {
    const min = typeof setting.min === "number" ? setting.min : 0;
    const max = typeof setting.max === "number" ? setting.max : 100;
    const step = typeof setting.step === "number" && setting.step > 0 ? setting.step : 1;
    setting.min = min;
    setting.max = max;
    setting.step = step;

    // Fix empty or missing unit — Shopify requires it to be a non-empty string
    if (!setting.unit || typeof setting.unit !== "string" || setting.unit.trim() === "") {
      setting.unit = "px"; // Default unit
    }

    if (setting.default !== undefined) {
      let def = typeof setting.default === "number" ? setting.default : min;
      def = Math.max(min, Math.min(max, def));
      const steps = Math.round((def - min) / step);
      def = min + steps * step;
      def = Math.min(def, max);
      setting.default = def;
    }
  }

  // number: default must be a number
  if (setting.type === "number" && setting.default !== undefined) {
    setting.default = Number(setting.default) || 0;
  }

  // checkbox: default must be boolean
  if (setting.type === "checkbox" && setting.default !== undefined) {
    setting.default = Boolean(setting.default);
  }

  // select / radio: default must match one of the option values
  if ((setting.type === "select" || setting.type === "radio") && Array.isArray(setting.options) && setting.options.length > 0) {
    // Sanitize options: only allow "value" and "label"
    setting.options = setting.options.map((o: any) => ({
      value: String(o.value ?? ""),
      label: String(o.label ?? o.value ?? ""),
    }));
    const validValues = setting.options.map((o: any) => o.value);
    if (setting.default !== undefined && !validValues.includes(setting.default)) {
      setting.default = setting.options[0].value;
    }
  }

  // video_url: ensure accept is valid
  if (setting.type === "video_url") {
    if (!Array.isArray(setting.accept) || setting.accept.length === 0) {
      setting.accept = ["youtube", "vimeo"];
    }
  }

  // 6. Convert unsupported types to text
  if (!supportedTypes.has(setting.type)) {
    const textKeys = SETTING_ATTRS_BY_TYPE["text"]!;
    for (const key of Object.keys(setting)) {
      if (!textKeys.has(key)) {
        delete setting[key];
      }
    }
    setting.type = "text";
    if (setting.default !== undefined) {
      setting.default = String(setting.default);
    }
  }

  return setting;
}

export function sanitizeShopifySchema(liquid: string): string {
  const schemaMatch = liquid.match(/\{%[-\s]*schema\s*[-]?%\}([\s\S]*?)\{%[-\s]*endschema\s*[-]?%\}/);
  if (!schemaMatch) return liquid;

  // ─── STEP 0: Extract schema block and ensure it's at the TOP LEVEL ───
  // Shopify requires {% schema %} to NOT be nested inside any other Liquid tags.
  // Remove the schema block from wherever it is and append it at the very end.
  const fullSchemaTag = schemaMatch[0];
  let liquidWithoutSchema = liquid.replace(fullSchemaTag, "").trim();

  // Close any unclosed Liquid tags that the schema might have been nested inside
  // Common AI mistake: placing schema inside {%- style -%}...{%- endstyle -%} or {% comment %}
  const unclosedTags = [
    { open: /\{%-?\s*style\s*-?%\}/g, close: /\{%-?\s*endstyle\s*-?%\}/g, closeTag: "{% endstyle %}" },
    { open: /\{%-?\s*stylesheet\s*-?%\}/g, close: /\{%-?\s*endstylesheet\s*-?%\}/g, closeTag: "{% endstylesheet %}" },
    { open: /\{%-?\s*javascript\s*-?%\}/g, close: /\{%-?\s*endjavascript\s*-?%\}/g, closeTag: "{% endjavascript %}" },
  ];
  for (const tag of unclosedTags) {
    const opens = (liquidWithoutSchema.match(tag.open) || []).length;
    const closes = (liquidWithoutSchema.match(tag.close) || []).length;
    if (opens > closes) {
      liquidWithoutSchema += `\n${tag.closeTag}`;
    }
  }

  try {
    const schemaJson = JSON.parse(schemaMatch[1]);

    // Types that MUST NOT have a "default" value
    const noDefaultTypes = new Set([
      "url",
      "image_picker",
      "video_url", 
      "product",
      "collection",
      "page",
      "blog",
      "article",
      "link_list",
      "font_picker",
      "html",
    ]);

    const supportedTypes = new Set([
      "text", "textarea", "richtext", "url", "color", "image_picker",
      "range", "select", "checkbox", "number", "header", "paragraph",
      "video_url", "product", "collection", "page", "blog", "article",
      "link_list", "font_picker", "html", "color_background",
      "color_scheme", "inline_richtext", "radio",
    ]);

    // Remove top-level invalid attributes
    const validTopLevel = new Set([
      "name", "tag", "class", "limit", "settings", "blocks", "presets",
      "default", "max_blocks", "templates", "enabled_on", "disabled_on",
    ]);
    for (const key of Object.keys(schemaJson)) {
      if (!validTopLevel.has(key)) {
        delete schemaJson[key];
      }
    }

    // Fix settings
    if (Array.isArray(schemaJson.settings)) {
      schemaJson.settings = schemaJson.settings
        .map((s: any) => sanitizeSetting(s, noDefaultTypes, supportedTypes))
        .filter(Boolean);
    }

    // Sanitize block settings
    if (Array.isArray(schemaJson.blocks)) {
      schemaJson.blocks = schemaJson.blocks.map((block: any) => {
        const validBlockKeys = new Set(["type", "name", "settings", "limit"]);
        for (const key of Object.keys(block)) {
          if (!validBlockKeys.has(key)) {
            delete block[key];
          }
        }
        if (Array.isArray(block.settings)) {
          block.settings = block.settings
            .map((s: any) => sanitizeSetting(s, noDefaultTypes, supportedTypes))
            .filter(Boolean);
        }
        return block;
      });
    }

    // Ensure presets exist and sanitize them
    if (!Array.isArray(schemaJson.presets) || schemaJson.presets.length === 0) {
      schemaJson.presets = [{ name: schemaJson.name || "AI Section" }];
    } else {
      // Build a map of setting id -> type so we can sanitize preset values
      const settingTypeMap: Record<string, string> = {};
      if (Array.isArray(schemaJson.settings)) {
        for (const s of schemaJson.settings) {
          if (s.id && s.type) settingTypeMap[s.id] = s.type;
        }
      }

      schemaJson.presets = schemaJson.presets.map((preset: any) => {
        const clean: any = { name: preset.name || schemaJson.name || "AI Section" };

        // Sanitize preset setting values — remove values for types that require special URLs
        if (preset.settings && typeof preset.settings === "object") {
          const cleanSettings: Record<string, any> = {};
          for (const [key, value] of Object.entries(preset.settings)) {
            const settingType = settingTypeMap[key];
            if (settingType && noDefaultTypes.has(settingType)) continue;
            if (typeof value === "string" && (value.includes("example.com") || value.includes("placeholder") || value.includes("shopify"))) continue;
            cleanSettings[key] = value;
          }
          if (Object.keys(cleanSettings).length > 0) {
            clean.settings = cleanSettings;
          }
        }

        // Sanitize block preset values the same way
        if (Array.isArray(preset.blocks)) {
          clean.blocks = preset.blocks.map((block: any) => {
            if (!block.type) return block;
            const cleanBlock: any = { type: block.type };
            if (block.settings && typeof block.settings === "object") {
              const blockDef = (schemaJson.blocks || []).find((b: any) => b.type === block.type);
              const blockSettingTypeMap: Record<string, string> = {};
              if (blockDef && Array.isArray(blockDef.settings)) {
                for (const s of blockDef.settings) {
                  if (s.id && s.type) blockSettingTypeMap[s.id] = s.type;
                }
              }
              const cleanBlockSettings: Record<string, any> = {};
              for (const [key, value] of Object.entries(block.settings)) {
                const settingType = blockSettingTypeMap[key];
                if (settingType && noDefaultTypes.has(settingType)) continue;
                if (typeof value === "string" && (value.includes("example.com") || value.includes("placeholder") || value.includes("shopify"))) continue;
                cleanBlockSettings[key] = value;
              }
              if (Object.keys(cleanBlockSettings).length > 0) {
                cleanBlock.settings = cleanBlockSettings;
              }
            }
            return cleanBlock;
          });
        }

        return clean;
      });
    }

    // Rebuild: liquid code (without schema) + sanitized schema at the very end
    const sanitizedSchema = JSON.stringify(schemaJson, null, 2);
    return `${liquidWithoutSchema}\n\n{% schema %}\n${sanitizedSchema}\n{% endschema %}`;
  } catch (err) {
    console.error("Schema sanitization failed:", err);
    let fixed = liquid;
    fixed = fixed.replace(/"type"\s*:\s*"url"[\s\S]*?"default"\s*:\s*"[^"]*"\s*,?/g, (match) => {
      return match.replace(/"default"\s*:\s*"[^"]*"\s*,?/, "");
    });
    return fixed;
  }
}
