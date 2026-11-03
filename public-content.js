(() => {
  const client = window.skillUpSupabase;
  if (!client) return;

  const faqList = document.querySelector("#public-faq-list");
  const announcements = document.querySelector("#public-announcements");
  client.from("public_content").select("kind,data").eq("status", "Published").then(({ data, error }) => {
    if (error) {
      if (faqList) faqList.innerHTML = '<div class="empty-state" role="status">FAQs are temporarily unavailable.</div>';
      return;
    }

    const content = data || [];
    const homepage = content.find((item) => item.kind === "homepage")?.data;
    const headline = document.querySelector("#public-hero-headline");
    if (headline && homepage?.headline) headline.textContent = homepage.headline;

    const contactLink = document.querySelector('a[href^="mailto:"]');
    if (contactLink && homepage?.contactEmail) {
      contactLink.href = `mailto:${encodeURIComponent(homepage.contactEmail)}`;
      contactLink.textContent = homepage.contactEmail;
    }

    if (announcements) {
      const notices = content.filter((item) => item.kind === "announcement").map((item) => item.data);
      announcements.replaceChildren(...notices.map((notice) => {
        const article = document.createElement("article");
        article.className = "public-announcement";
        const title = document.createElement("strong");
        title.textContent = notice.title || "Announcement";
        const message = document.createElement("p");
        message.textContent = notice.body || "";
        article.append(title, message);
        return article;
      }));
      announcements.hidden = notices.length === 0;
    }

    if (!faqList) return;
    const faqs = content.filter((item) => item.kind === "faq").map((item) => item.data);
    if (!faqs.length) {
      faqList.innerHTML = '<div class="empty-state" role="status">No FAQs have been published yet.</div>';
      return;
    }
    faqList.replaceChildren(...faqs.map((faq, index) => {
      const details = document.createElement("details");
      details.className = "faq-item";
      details.open = index === 0;
      const summary = document.createElement("summary");
      summary.append(document.createTextNode(faq.question || ""));
      const icon = document.createElement("span");
      icon.className = "faq-plus";
      icon.setAttribute("aria-hidden", "true");
      summary.append(icon);
      const answer = document.createElement("p");
      answer.textContent = faq.answer || "";
      details.append(summary, answer);
      return details;
    }));
  });
})();
