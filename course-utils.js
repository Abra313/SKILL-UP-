(() => {
  function normalizeModules(value) {
    const source = Array.isArray(value) ? value : String(value || "").split(/\r?\n/);
    return source.map((module) => String(module || "").trim()).filter(Boolean);
  }

  function inferMaterialType(path) {
    if (/\.pdf$/i.test(path)) return "application/pdf";
    if (/\.webm$/i.test(path)) return "video/webm";
    if (/\.mov$/i.test(path)) return "video/quicktime";
    if (/\.mp4$/i.test(path)) return "video/mp4";
    return "";
  }

  function normalizeModuleMaterials(value, moduleCount, courseId) {
    const materials = Array.isArray(value) ? value : [];
    return Array.from({ length: moduleCount }, (_, index) => {
      const source = materials[index];
      if (!source) return null;
      if (typeof source === "object" && source.provider === "bunny") {
        const videoId = typeof source.videoId === "string" ? source.videoId : "";
        if (!/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(videoId)) return null;
        const fileName = source.fileName ? String(source.fileName) : "lesson-video";
        const mimeType = source.mimeType ? String(source.mimeType) : inferMaterialType(fileName);
        if (!mimeType.startsWith("video/")) return null;
        return {
          provider: "bunny",
          videoId,
          fileName,
          mimeType,
          size: Number.isFinite(Number(source.size)) ? Number(source.size) : 0
        };
      }
      const path = typeof source === "string" ? source : source.path;
      if (typeof path !== "string" || !path) return null;
      const normalizedPath = path.replace(/^course-videos\//i, "");
      if (!courseId || !normalizedPath.startsWith(`${courseId}/`)) return null;
      const fileName = typeof source === "object" && source.fileName
        ? String(source.fileName)
        : normalizedPath.split("/").pop();
      const mimeType = typeof source === "object" && source.mimeType
        ? String(source.mimeType)
        : inferMaterialType(fileName);
      return {
        provider: "supabase",
        path: normalizedPath,
        fileName,
        mimeType,
        size: typeof source === "object" && Number.isFinite(Number(source.size))
          ? Number(source.size)
          : 0
      };
    });
  }

  function normalizeCourse(course) {
    const modules = normalizeModules(course.modules);
    const normalized = { ...course };
    delete normalized.moduleResources;
    return {
      ...normalized,
      modules: modules.join("\n"),
      moduleMaterials: normalizeModuleMaterials(course.moduleMaterials, modules.length, course.id)
    };
  }

  window.skillUpCourseUtils = Object.freeze({ normalizeModules, normalizeCourse });
})();
