import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { Resend } from "resend";

const SUPPORT_EMAIL = "maximilian.hauptmannl@gmail.com";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const formData = await request.formData();
  const name = String(formData.get("name") || "").trim();
  const topic = String(formData.get("topic") || "general").trim();
  const message = String(formData.get("message") || "").trim();
  const shop = session.shop || "";

  if (!message) {
    return Response.json({ error: "Message is required" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set");
    return Response.json({ error: "Email service not configured" }, { status: 500 });
  }

  const topicLabels: Record<string, string> = {
    general: "General Question",
    bug: "Bug Report",
    feature: "Feature Request",
    billing: "Billing / Refund",
    section: "Section Help",
  };

  const subject = `[SectionIQ] ${topicLabels[topic] || "Support"} from ${name || "Customer"}`;

  const resend = new Resend(apiKey);

  try {
    await resend.emails.send({
      from: "SectionIQ <onboarding@resend.dev>",
      to: [SUPPORT_EMAIL],
      replyTo: undefined, // We don't have the customer's email
      subject,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 24px 32px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 20px;">📬 New Support Message</h1>
          </div>
          <div style="background: #f9fafb; padding: 24px 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 100px;">Name:</td>
                <td style="padding: 8px 0; font-size: 14px; font-weight: 600;">${escapeHtml(name || "Not provided")}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Topic:</td>
                <td style="padding: 8px 0; font-size: 14px;">
                  <span style="background: #d1fae5; color: #065f46; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                    ${escapeHtml(topicLabels[topic] || topic)}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Shop:</td>
                <td style="padding: 8px 0; font-size: 14px;">${escapeHtml(shop || "Unknown")}</td>
              </tr>
            </table>
            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; white-space: pre-wrap; font-size: 14px; line-height: 1.6;">
${escapeHtml(message)}
            </div>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">
              Sent via SectionIQ Help Center
            </p>
          </div>
        </div>
      `,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to send email:", error);
    return Response.json({ error: "Failed to send message" }, { status: 500 });
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
