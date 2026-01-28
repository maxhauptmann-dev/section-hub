/// <reference types="vite/client" />
/// <reference types="@react-router/node" />
/// <reference types="@shopify/polaris-types" />

// Shopify App Bridge Web Components (Polaris Web Components)
declare namespace JSX {
  interface IntrinsicElements {
    "s-app-nav": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    "s-link": React.DetailedHTMLProps<React.AnchorHTMLAttributes<HTMLAnchorElement> & { href?: string }, HTMLAnchorElement>;
    "s-page": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { heading?: string }, HTMLElement>;
    "s-section": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { heading?: string; slot?: string }, HTMLElement>;
    "s-paragraph": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    "s-text": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    "s-button": React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; loading?: boolean; slot?: string }, HTMLButtonElement>;
    "s-stack": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { direction?: string; gap?: string }, HTMLElement>;
    "s-box": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { padding?: string; borderWidth?: string; borderRadius?: string; background?: string }, HTMLElement>;
    "s-heading": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    "s-unordered-list": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    "s-list-item": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
  }
}
