import { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "../lib/format";
import { loadPublicServicesCached } from "../lib/lookups";
import { navigate } from "../lib/router";
import type { PublicService } from "../lib/types";

export function ServicesPage() {
  const [services, setServices] = useState<PublicService[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const data = await loadPublicServicesCached();
        if (!cancelled) {
          setServices(data);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load public services");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, PublicService[]>();
    services.forEach((service) => {
      const key = service.categoryName || "Studio Service";
      const current = map.get(key) ?? [];
      current.push(service);
      map.set(key, current);
    });
    return Array.from(map.entries());
  }, [services]);

  return (
    <section className="ve-section">
      <div className="ve-section-head">
        <div>
          <p className="ve-eyebrow">Service Menu</p>
          <h1 className="ve-display-lg">Browse signature services, transparent pricing</h1>
        </div>
        <button className="ve-button ve-button-primary" onClick={() => navigate("/book")}>
          Start Booking
        </button>
      </div>

      {loading ? (
        <div className="ve-card-grid ve-card-grid-services">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="ve-service-card ve-skeleton-card" />
          ))}
        </div>
      ) : null}

      {!loading && error ? (
        <div className="ve-panel ve-panel-warning">
          <p className="ve-panel-title">The public services endpoint is not ready yet.</p>
          <p className="ve-panel-copy">{error}</p>
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="ve-service-groups">
          {grouped.map(([category, items]) => (
            <section key={category} className="ve-service-group">
              <div className="ve-service-group-head">
                <h2 className="ve-display-sm">{category}</h2>
                <span>{items.length} services</span>
              </div>
              <div className="ve-service-list">
                {items.map((service) => (
                  <article key={service.id} className="ve-service-row">
                    <div>
                      <h3>{service.name}</h3>
                      <p>{service.durationMinutes ? `${service.durationMinutes} minutes` : "Duration confirmed on booking"}</p>
                    </div>
                    <div className="ve-service-row-side">
                      <strong>{formatCurrency(service.price)}</strong>
                      <button className="ve-text-link" onClick={() => navigate("/book")}>
                        Book
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </section>
  );
}
