(() => {
  const grid = document.querySelector(".course-grid");
  const client = window.skillUpSupabase;
  if (!grid || !client) return;
  grid.innerHTML = '<div class="empty-state" role="status">Loading published courses…</div>';

  const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
  const imageStyles = ["", "image-cyan", "image-violet", "image-coral", "image-amber", "image-lilac", "image-teal", "image-blue"];

  client.from("courses").select("data").eq("status", "Published").then(({ data, error }) => {
    if (error) {
      grid.innerHTML = '<div class="empty-state" role="status">Courses are temporarily unavailable. Please try again later.</div>';
      return;
    }
    if (!data?.length) {
      grid.innerHTML = '<div class="empty-state" role="status">No published courses are available yet.</div>';
      return;
    }
    grid.innerHTML = data.map(({ data: course }, index) => {
      const image = /^https?:\/\//i.test(course.thumbnail || "")
        ? `<img src="${escapeHTML(course.thumbnail)}" alt="" loading="lazy">`
        : "";
      const slug = String(course.title || "course").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const url = `auth.html?mode=signup&course=${encodeURIComponent(slug)}`;
      const number = String(index + 1).padStart(2, "0");
      return `<article class="course-card"><a class="course-image ${imageStyles[index % imageStyles.length]}" href="${url}" aria-label="Register or log in to learn ${escapeHTML(course.title)}">${image}<span class="course-number">${number}</span><span class="course-art-tag">${escapeHTML(course.category || "COURSE").toUpperCase()} / ${number}</span></a><div class="course-content"><div class="course-topline"><span>${escapeHTML(course.category || "SKILL-UP COURSE").toUpperCase()}</span></div><h3>${escapeHTML(course.title)}</h3><p>${escapeHTML(course.description || "Explore the course syllabus and learning outcomes.")}</p><a class="course-link" href="${url}">Register or log in <span>↗</span></a></div></article>`;
    }).join("");
  });
})();
