import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function Page({ title, subtitle, actions, children }: Props) {
  return (
    <section className="st-page">
      <header className="st-page-header">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {actions ? <div className="st-page-actions">{actions}</div> : null}
      </header>
      <div className="st-page-body">{children}</div>
    </section>
  );
}

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <article className="st-card">
      {title ? <h3>{title}</h3> : null}
      {children}
    </article>
  );
}
