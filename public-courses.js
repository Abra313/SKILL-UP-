(async () => {
  const grid = document.querySelector(".course-grid");
  if (!grid) return;

  let courses;
  try {
    const workspace = await window.skillUpSupabase.loadWorkspace("public");
    courses = (workspace?.courses || []).filter((course) => course.status === "Published" && course.featured);
  } catch (error) {
    grid.innerHTML = '<div class="empty-state" role="status">Could not load courses from Supabase. Check the project setup and try again.</div>';
    console.error("Could not load Supabase course data:", error);
    return;
  }
  if (!courses?.length) {
    grid.innerHTML = '<div class="empty-state" role="status">No featured courses are available yet. Explore the full course catalogue after signing in.</div>';
    return;
  }

  const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
  const lines = (value) => String(value || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const imageStyles = ["", "image-cyan", "image-violet", "image-coral", "image-amber", "image-lilac", "image-teal", "image-blue"];
  grid.innerHTML = courses.map((course, index) => {
    const image = /^https?:\/\//i.test(course.thumbnail || "")
      ? `<img src="${escapeHTML(course.thumbnail)}" alt="" loading="lazy">`
      : "";
    const number = String(index + 1).padStart(2, "0");
    const objectives = lines(course.objectives);
    const modules = lines(course.modules);
    const courseOutline = `<details class="course-outline"><summary>Course outline</summary><div class="course-outline-content"><h4>Introduction</h4><p>${escapeHTML(course.introduction || course.description || "Introduction coming soon.")}</p><h4>Learning objectives</h4>${objectives.length ? `<ul>${objectives.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul>` : "<p>Learning objectives coming soon.</p>"}<h4>Modules</h4>${modules.length ? `<ul>${modules.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul>` : "<p>Course modules coming soon.</p>"}</div></details>`;
    return `<article class="course-card"><a class="course-image ${imageStyles[index % imageStyles.length]}" href="auth.html?mode=register" aria-label="Explore ${escapeHTML(course.title)}">${image}<span class="course-number">${number}</span><span class="course-art-tag">${escapeHTML(course.category || "COURSE").toUpperCase()} / ${number}</span></a><div class="course-content"><div class="course-topline"><span>${escapeHTML(course.category || "SKILL-UP COURSE").toUpperCase()}</span></div><h3>${escapeHTML(course.title)}</h3><p>${escapeHTML(course.description || "Explore the course syllabus and learning outcomes.")}</p>${courseOutline}<a class="course-link" href="auth.html?mode=register">Explore this course <span>↗</span></a></div></article>`;
  }).join("");
})();
