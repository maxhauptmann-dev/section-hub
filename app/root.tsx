import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import "@shopify/polaris/build/esm/styles.css";

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link rel="dns-prefetch" href="https://cdn.shopify.com/" />
        <link rel="preconnect" href="https://section-hub-app.fly.dev/" />
        <link
          rel="preload"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
          as="style"
        />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
        <style>{`
          @media (max-width: 640px) {
            .Polaris-Page {
              padding-left: 16px !important;
              padding-right: 16px !important;
            }
          }
        `}</style>
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
