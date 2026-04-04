import { useEffect, useState } from "react";
import { loadPublicBranchesCached } from "../lib/lookups";
import { navigate } from "../lib/router";
import type { PublicBranch } from "../lib/types";

const FALLBACK_BRANCHES = ["Main St Studio", "Broadway flagship"];

export function LandingPage() {
  const [branches, setBranches] = useState<string[]>(FALLBACK_BRANCHES);

  useEffect(() => {
    let cancelled = false;

    async function loadBranches() {
      try {
        const data = await loadPublicBranchesCached();
        if (!cancelled && data.length > 0) {
          setBranches(resolveBranchLabels(data));
        }
      } catch {
        if (!cancelled) {
          setBranches(FALLBACK_BRANCHES);
        }
      }
    }

    void loadBranches();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <section className="ve-landing-hero ve-section">
        <div className="ve-landing-copy">
          <p className="ve-eyebrow">Precision Is An Art</p>
          <h1 className="ve-landing-title">
            The Sculpted
            <br />
            <span>Standard</span>
          </h1>
          <p className="ve-landing-body">
            Experience a brow studio that reads like a curated lifestyle journal. We specialize in the architectural beauty of
            your face through master threading and waxing.
          </p>
          <div className="ve-landing-actions">
            <button className="ve-button ve-button-primary" onClick={() => navigate("/services")}>
              Explore Services
            </button>
            <button className="ve-landing-link" onClick={() => scrollToAbout()}>
              Our Story
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </div>
        <div className="ve-landing-visual">
          <div className="ve-landing-image-card">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDx3--W7mAZXicO7VqDfMTVKS3CIPKiZtyW-4swHhsFJERmcebv7vzZTrbVJ3DlqexBpndxhvU1wk4tH8Wf3MkSTjuLpgmadrJXwElaVs3cB6gWv22q10Zn35ktIZSZovacgXcdV5jgrjP8-XeUpVVMmJ9ODi1zkcDakdB0Db4G5PWUgADwqJ8x3vOD9TaHk2vjVlsH199glq3qeTN4dVTXJWHwUQ1lNmBetU_3wzKLU712SYHw9PvucVe0Zzvos_UOaS_LCqO0Nuc"
              alt="Close-up of a perfectly groomed eyebrow and eye."
            />
          </div>
        </div>
      </section>

      <section className="ve-landing-treatments">
        <div className="ve-landing-section-head">
          <h2>Curated Treatments</h2>
          <p>Techniques tailored to your unique facial architecture.</p>
        </div>
        <div className="ve-treatment-grid">
          <article className="ve-treatment-card ve-treatment-card-feature">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAsh8hP5gwEnIUm5FEnE3pj7v2_37xqcYja2zuonBkBi3EAmD9-Hprn-S7z4rhP0FGGzJXDZ8XlUrOTrkmowv9hTCMlPh7ZC1Md8T1A1MjwfdDO509EweceqS81ndGPorHoeeCz6_Ws7Nn6J1FtzFD2lrqau94pKKNuB_0s98pg2ZQOgnnaeRFZO1-YtvYCjMXydgpKk6KtZsKt5UeZbpQbXjlAS7vKJfQX_84ay7okqUOzWi0HapFMPa5FCW9Vxbog32pDuGTB_CE"
              alt="Master threading treatment in progress."
            />
            <div className="ve-treatment-overlay" />
            <div className="ve-treatment-content">
              <h3>Master Threading</h3>
              <p>Ancient precision meets modern aesthetics for ultra-sharp definition.</p>
              <button className="ve-landing-link ve-landing-link-light" onClick={() => navigate("/book")}>
                From $25
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </article>

          <article className="ve-treatment-card ve-treatment-card-note">
            <div className="ve-treatment-icon">
              <span className="material-symbols-outlined">auto_fix</span>
            </div>
            <h3>Velvet Waxing</h3>
            <p>Our proprietary low-temp wax is designed for the most sensitive complexions.</p>
            <button className="ve-text-link" onClick={() => navigate("/services")}>
              Learn More
            </button>
          </article>

          <article className="ve-treatment-card ve-treatment-card-note">
            <div className="ve-treatment-icon">
              <span className="material-symbols-outlined">palette</span>
            </div>
            <h3>Editorial Tint</h3>
            <p>Custom-blended pigments that add depth, volume, and lasting character.</p>
            <button className="ve-text-link" onClick={() => navigate("/services")}>
              Learn More
            </button>
          </article>

          <article className="ve-treatment-card ve-treatment-card-map">
            <div className="ve-treatment-map" />
            <div className="ve-treatment-map-copy">
              <h3>Visit Our Studios</h3>
              <p>Find us in the heart of Main St and Broadway&apos;s cultural hubs.</p>
              <div className="ve-chip-row">
                {branches.slice(0, 2).map((branch) => (
                  <span key={branch} className="ve-chip ve-chip-white">
                    {branch}
                  </span>
                ))}
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="ve-landing-quote" id="about">
        <p className="ve-landing-quote-kicker">Verified Elegance</p>
        <blockquote>
          “The attention to detail here is unmatched. It’s not just a service, it’s a moment of calm precision in a chaotic
          world.”
        </blockquote>
        <div className="ve-landing-quote-author">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuC2iLktSrwMZkZnkPaCqp24nc-V5TdpB6bz3jZRk4Dz-nhctrgTRz6855UHvsRUuVYheFspq8Q3kejRmD4eFWUiMzm5KDP1xqkmVuB_TUYtUdJX1bTQOK47FQqX1nqW0Zh8QUFo7uf1jp8VXJJH3pJDbvjpgkeBRFMG7VTgdiu6XtThsQytp1uXrDnjRnK6zHBd7OsjI_4qDrel_Fm77HLdQWxiLs2m1sO-plYovso3G3nYRADIRtgN8SIVio5bvbrvSVM1X66gkW4"
            alt="Portrait of Sienna Moretti."
          />
          <div>
            <strong>Sienna Moretti</strong>
            <span>Editorial Stylist</span>
          </div>
        </div>
      </section>

      <button className="ve-book-fab" onClick={() => navigate("/book")} aria-label="Book now">
        <span className="material-symbols-outlined">event_available</span>
      </button>
    </>
  );
}

function resolveBranchLabels(branches: PublicBranch[]) {
  return branches.slice(0, 2).map((branch) => branch.name);
}

function scrollToAbout() {
  document.getElementById("about")?.scrollIntoView({ behavior: "smooth", block: "start" });
}
