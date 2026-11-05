(async () => {
  const faqList = document.querySelector("#public-faq-list");
  const announcements = document.querySelector("#public-announcements");
  const opportunities = document.querySelector("#public-opportunities");
  const jobList = document.querySelector("#public-job-list");
  const resourceList = document.querySelector("#public-resource-list");
  const testimonialsSection = document.querySelector("#public-testimonials");
  const testimonialList = document.querySelector("#public-testimonial-list");
  const legalDialog = document.querySelector("#legal-dialog");
  let homepage = {};
  let publicContent = [];
  try {
    const workspace = await window.skillUpSupabase.loadWorkspace("public");
    if (workspace) {
      publicContent = [
        { kind: "homepage", status: "Published", data: workspace.siteContent },
        ...[
          ["faqs", "faq"],
          ["jobs", "job"],
          ["resources", "resource"],
          ["testimonials", "testimonial"],
          ["announcements", "announcement"]
        ].flatMap(([key, kind]) => (workspace[key] || []).map((item) => ({
          kind,
          status: item.status || "Draft",
          data: item
        })))
      ].filter((item) => item.status === "Published");
    }
  } catch (error) {
    console.error("Could not load Supabase website content:", error);
    if (faqList) faqList.innerHTML = '<div class="empty-state" role="status">Website updates could not be loaded from Supabase. Check the project setup and try again.</div>';
    return;
  }

  const safeUrl = (value) => {
    try {
      const url = new URL(value, window.location.href);
      return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
    } catch {
      return "";
    }
  };

  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };

  function renderAnnouncements(items) {
    if (!announcements) return;
    const notices = items.map((item) => item.data);
    if (homepage.announcement) notices.unshift({ title: "SKILL-UP update", body: homepage.announcement });
    announcements.replaceChildren(...notices.map((notice) => {
      const article = element("article", "public-announcement");
      article.append(
        element("strong", "", notice.title || "Announcement"),
        element("p", "", notice.body || "")
      );
      return article;
    }));
    announcements.hidden = notices.length === 0;
  }

  function renderOpportunities(items) {
    const jobs = items.filter((item) => item.kind === "job").map((item) => item.data);
    const resources = items.filter((item) => item.kind === "resource").map((item) => item.data);
    if (opportunities) opportunities.hidden = jobs.length + resources.length === 0;

    if (jobList) {
      jobList.replaceChildren(...jobs.map((job) => {
        const card = element("article", "public-content-card");
        card.append(
          element("p", "eyebrow", job.verified ? "Verified opportunity" : "External listing"),
          element("h3", "", job.title || "Opportunity"),
          element("p", "public-content-meta", [job.company, job.type, job.location].filter(Boolean).join(" · ")),
          element("p", "", job.description || "")
        );
        const url = safeUrl(job.link);
        if (url) {
          const link = element("a", "text-link", "View opportunity ↗");
          link.href = url;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          card.append(link);
        }
        return card;
      }));
    }

    if (resourceList) {
      resourceList.replaceChildren(...resources.map((resource) => {
        const card = element("article", "public-content-card");
        card.append(
          element("p", "eyebrow", resource.category || "Career resource"),
          element("h3", "", resource.title || "Resource"),
          element("p", "", resource.description || "")
        );
        const url = safeUrl(resource.link);
        if (url) {
          const link = element("a", "text-link", "Open resource ↗");
          link.href = url;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          card.append(link);
        }
        return card;
      }));
    }
  }

  function renderTestimonials(items) {
    const testimonials = items.filter((item) => item.kind === "testimonial").map((item) => item.data);
    if (!testimonialsSection || !testimonialList) return;
    testimonialsSection.hidden = testimonials.length === 0;
    testimonialList.replaceChildren(...testimonials.map((testimonial) => {
      const card = element("figure", "public-content-card public-testimonial-card");
      card.append(
        element("blockquote", "", testimonial.quote || ""),
        element("figcaption", "", [testimonial.name, testimonial.role].filter(Boolean).join(" · "))
      );
      return card;
    }));
  }

  const content = publicContent;
    homepage = content.find((item) => item.kind === "homepage")?.data || {};
    const headline = document.querySelector("#public-hero-headline");
    if (headline && homepage.headline) {
      headline.replaceChildren(...homepage.headline.split(/\r?\n/).flatMap((line, index) => {
        const nodes = index ? [document.createElement("br")] : [];
        nodes.push(document.createTextNode(line));
        return nodes;
      }));
    }

    const contactLink = document.querySelector('a[href^="mailto:"]');
    if (contactLink && homepage.contactEmail) {
      contactLink.href = `mailto:${homepage.contactEmail}`;
      contactLink.textContent = homepage.contactEmail;
    }

    const bannerUrl = safeUrl(homepage.bannerUrl);
    const heroImage = document.querySelector(".hero-photo img");
    if (bannerUrl && heroImage) heroImage.src = bannerUrl;

    renderAnnouncements(content.filter((item) => item.kind === "announcement"));
    renderOpportunities(content);
    renderTestimonials(content);

    if (faqList) {
      const faqs = content.filter((item) => item.kind === "faq").map((item) => item.data);
      if (!faqs.length) {
        faqList.innerHTML = '<div class="empty-state" role="status">No FAQs have been published yet.</div>';
      } else {
        faqList.replaceChildren(...faqs.map((faq, index) => {
          const details = element("details", "faq-item");
          details.open = index === 0;
          const summary = element("summary", "", faq.question || "");
          const icon = element("span", "faq-plus");
          icon.setAttribute("aria-hidden", "true");
          summary.append(icon);
          details.append(summary, element("p", "", faq.answer || ""));
          return details;
        }));
      }
    }
  document.querySelectorAll("[data-legal]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const key = link.dataset.legal;
      const title = key === "privacyPolicy" ? "Privacy policy" : "Terms and conditions";
      document.querySelector("#legal-dialog-title").textContent = title;
      document.querySelector("#legal-dialog-content").textContent = homepage[key] || `${title} have not been published yet.`;
      legalDialog?.showModal();
    });
  });
})();
