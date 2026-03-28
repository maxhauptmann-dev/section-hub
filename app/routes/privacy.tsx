export default function PrivacyPolicy() {
  return (
    <div
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "48px 24px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: "#1a1a1a",
        lineHeight: 1.7,
      }}
    >
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
        Privacy Policy
      </h1>
      <p style={{ color: "#6b7280", marginBottom: 32 }}>
        Last updated: March 5, 2026
      </p>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
          1. Introduction
        </h2>
        <p>
          SectionIQ ("we", "us", "our") is a Shopify app that provides
          premium theme sections for Shopify stores. This Privacy Policy
          explains how we collect, use, and protect your information when you
          use our app.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
          2. Information We Collect
        </h2>
        <p>When you install and use SectionIQ, we collect:</p>
        <ul style={{ paddingLeft: 24, marginTop: 8 }}>
          <li>
            <strong>Shop information:</strong> Your Shopify store URL (myshopify
            domain), which is provided automatically by the Shopify platform
            during authentication.
          </li>
          <li>
            <strong>Theme data:</strong> We read your active theme's section
            structure to provide store analysis features. We write section
            template files to your theme when you install a section.
          </li>
          <li>
            <strong>Purchase records:</strong> We store records of which
            sections you have purchased to manage your access.
          </li>
          <li>
            <strong>Contact information:</strong> If you reach out through our
            Help Center or Suggest Idea form, we receive the message content
            you submit.
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
          3. How We Use Your Information
        </h2>
        <ul style={{ paddingLeft: 24 }}>
          <li>To authenticate your Shopify session and provide app functionality.</li>
          <li>To install purchased sections into your active theme.</li>
          <li>To analyze your store's section coverage and provide recommendations.</li>
          <li>To process purchases through Shopify's Billing API.</li>
          <li>To respond to support requests submitted through the app.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
          4. Data Sharing
        </h2>
        <p>
          We do <strong>not</strong> sell, rent, or share your personal data
          with third parties. We use the following services to operate the app:
        </p>
        <ul style={{ paddingLeft: 24, marginTop: 8 }}>
          <li>
            <strong>Shopify:</strong> For authentication, billing, and theme
            management (governed by{" "}
            <a
              href="https://www.shopify.com/legal/privacy"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#6366f1" }}
            >
              Shopify's Privacy Policy
            </a>
            ).
          </li>
          <li>
            <strong>Fly.io:</strong> For hosting the application.
          </li>
          <li>
            <strong>Resend:</strong> For sending transactional emails (support
            messages).
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
          5. Data Retention
        </h2>
        <p>
          We retain your shop data and purchase records as long as the app is
          installed. When you uninstall SectionIQ, your session data is
          automatically deleted. Purchase records may be retained for
          accounting purposes.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
          6. Data Security
        </h2>
        <p>
          We use industry-standard security measures including encrypted
          connections (HTTPS), secure authentication via Shopify OAuth, and
          access-controlled infrastructure on Fly.io.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
          7. Your Rights
        </h2>
        <p>You have the right to:</p>
        <ul style={{ paddingLeft: 24, marginTop: 8 }}>
          <li>Request access to your stored data.</li>
          <li>Request deletion of your data.</li>
          <li>Uninstall the app at any time, which removes your session data.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
          8. Changes to This Policy
        </h2>
        <p>
          We may update this Privacy Policy from time to time. Changes will be
          reflected by updating the "Last updated" date at the top of this
          page.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
          9. Contact Us
        </h2>
        <p>
          If you have any questions about this Privacy Policy or your data,
          please contact us at:{" "}
          <a
            href="mailto:maximilian.hauptmannl@gmail.com"
            style={{ color: "#6366f1" }}
          >
            maximilian.hauptmannl@gmail.com
          </a>
        </p>
      </section>

      <div
        style={{
          marginTop: 48,
          paddingTop: 24,
          borderTop: "1px solid #e5e7eb",
          color: "#9ca3af",
          fontSize: 14,
        }}
      >
        © {new Date().getFullYear()} SectionIQ. All rights reserved.
      </div>
    </div>
  );
}
