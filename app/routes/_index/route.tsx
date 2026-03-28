import type { LoaderFunctionArgs } from "react-router";
import { redirect, Form, useLoaderData } from "react-router";

import { login } from "../../shopify.server";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>SectionIQ</h1>
        <p className={styles.text}>
          Premium Shopify sections — browse, install, and customize with one click.
        </p>
        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span>Shop domain</span>
              <input className={styles.input} type="text" name="shop" />
              <span>e.g: my-shop-domain.myshopify.com</span>
            </label>
            <button className={styles.button} type="submit">
              Log in
            </button>
          </Form>
        )}
        <ul className={styles.list}>
          <li>
            <strong>100+ Premium Sections</strong>. Hand-crafted, responsive Shopify sections ready to install.
          </li>
          <li>
            <strong>One-Click Install</strong>. Add sections directly to your theme — no code required.
          </li>
          <li>
            <strong>Image Optimizer</strong>. Scan and auto-fix your theme images for faster loading.
          </li>
        </ul>
      </div>
    </div>
  );
}
