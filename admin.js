(async () => {
const currentUser = await window.skillUpAuth.requireRole("admin");
if (!currentUser) return;
const supabaseClient = window.skillUpSupabase;
const adminDisplayName = currentUser.name?.trim() || currentUser.email;
const adminInitials = adminDisplayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
document.querySelector("#admin-profile-name").textContent = adminDisplayName;
document.querySelector("#admin-profile-initials").textContent = adminInitials;

const mainContent = document.querySelector("#main-content");
const modalLayer = document.querySelector("#modal-layer");
const modalTitle = document.querySelector("#modal-title");
const modalBody = document.querySelector("#modal-body");
const sidebar = document.querySelector("#sidebar");
const navButtons = [...document.querySelectorAll(".nav-item")];
const pageNames = {
  dashboard: "Dashboard",
  courses: "Courses",
  students: "Students",
  finance: "Payments & finance",
  referrals: "Referrals",
  mentorship: "Mentorship",
  settings: "Settings & security"
};
const today = new Date();
const day = (offset) => {
  const date = new Date(today);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
};
const initialState = () => ({
  catalogInitialized: false,
  courses: [
    { id: "c-fullstack", title: "Full Stack Development", category: "Development", price: 5000, instructor: "Tunde Adebayo", status: "Published", enrolled: 182, completion: 64, description: "Build complete websites and web applications with frontend, backend and database skills.", modules: "Web fundamentals\nFrontend foundations\nBackend APIs\nDatabases and deployment", materials: "https://example.com/fullstack-guide.pdf", requirements: "Complete all core modules and submit the portfolio project.", assignments: "Build and deploy a responsive portfolio website.", quizzes: "Web fundamentals quiz\nJavaScript and API quiz", thumbnail: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80", banner: "", createdAt: day(-120) },
    { id: "c-frontend", title: "Frontend Development", category: "Development", price: 5000, instructor: "Ada Okafor", status: "Published", enrolled: 146, completion: 71, description: "Master HTML, CSS and JavaScript to create beautiful, responsive websites.", modules: "HTML and accessibility\nCSS and responsive layouts\nJavaScript fundamentals\nModern frontend projects", materials: "", requirements: "Complete all core lessons and submit the final website project.", assignments: "Create a responsive product landing page.", quizzes: "HTML and accessibility quiz\nCSS layout quiz", thumbnail: "https://images.unsplash.com/photo-1547658719-da2b51169166?auto=format&fit=crop&w=800&q=80", banner: "", createdAt: day(-105) },
    { id: "c-ai", title: "AI Automation", category: "Artificial Intelligence", price: 5000, instructor: "Ifeanyi Okoro", status: "Published", enrolled: 129, completion: 53, description: "Use AI tools and automation platforms to build intelligent workflows.", modules: "AI foundations\nWorkflow automation\nConnecting business tools\nBuild an automation project", materials: "", requirements: "Submit one working automation and complete the final quiz.", assignments: "Create an automated lead follow-up workflow.", quizzes: "Workflow automation fundamentals", thumbnail: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80", banner: "", createdAt: day(-89) },
    { id: "c-voice", title: "AI Voice Agent", category: "Artificial Intelligence", price: 5000, instructor: "Chika Nwosu", status: "Published", enrolled: 87, completion: 46, description: "Create voice agents that communicate, help customers and automate conversations.", modules: "Voice AI fundamentals\nConversation design\nAgent integrations\nTesting and deployment", materials: "", requirements: "Build, test and document a working voice-agent prototype.", assignments: "Design a helpful customer-support voice agent.", quizzes: "Voice agent safety and conversation design", thumbnail: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=800&q=80", banner: "", createdAt: day(-70) },
    { id: "c-vibe", title: "Vibe Coding & Google AdSense", category: "Development", price: 5000, instructor: "Tunde Adebayo", status: "Published", enrolled: 94, completion: 39, description: "Build digital products with AI-assisted coding and explore website monetization.", modules: "AI-assisted prototyping\nCreate a web product\nContent and publishing\nMonetization basics", materials: "", requirements: "Publish a simple project and complete the monetization knowledge check.", assignments: "Build and publish a small useful website.", quizzes: "Content quality and AdSense policy quiz", thumbnail: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80", banner: "", createdAt: day(-55) },
    { id: "c-ux", title: "UI/UX Design", category: "Design", price: 5000, instructor: "Ada Okafor", status: "Published", enrolled: 118, completion: 68, description: "Learn wireframing, prototyping and user-friendly digital product design.", modules: "Design thinking\nResearch and personas\nWireframes and prototypes\nUsability and handoff", materials: "", requirements: "Submit a case study and a clickable prototype.", assignments: "Redesign a familiar mobile app flow.", quizzes: "Accessibility and usability quiz", thumbnail: "https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?auto=format&fit=crop&w=800&q=80", banner: "", createdAt: day(-44) },
    { id: "c-graphics", title: "Graphics Design", category: "Design", price: 5000, instructor: "Zainab Musa", status: "Published", enrolled: 103, completion: 62, description: "Develop creative skills in branding, social media graphics and visual communication.", modules: "Design fundamentals\nColor and typography\nBranding projects\nSocial media campaigns", materials: "", requirements: "Submit a mini brand kit with three design assets.", assignments: "Design a social media campaign for a local business.", quizzes: "Color, typography and visual hierarchy", thumbnail: "https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=800&q=80", banner: "", createdAt: day(-31) },
    { id: "c-mobile", title: "Mobile App Development", category: "Development", price: 5000, instructor: "Ifeanyi Okoro", status: "Draft", enrolled: 0, completion: 0, description: "Create mobile applications and turn ideas into functional Android and iOS experiences.", modules: "Mobile app foundations\nInterface and navigation\nConnect to APIs\nBuild and test an app", materials: "", requirements: "Complete the core lessons and submit a tested mobile app prototype.", assignments: "Build an app with navigation and one data-driven screen.", quizzes: "Mobile app fundamentals", thumbnail: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=800&q=80", banner: "", createdAt: day(-12) },
    { id: "c-cybersecurity", title: "Cybersecurity Fundamentals", category: "Cybersecurity", price: 5000, instructor: "Chika Nwosu", status: "Published", enrolled: 0, completion: 0, description: "Learn ethical, defensive security practices for protecting accounts, networks and digital information.", modules: "Security foundations and ethics\nThreat modeling and risk management\nIdentity, access and network defense\nSecure software and data protection\nIncident response and recovery\nSecurity awareness capstone", materials: "", requirements: "Complete the core lessons and submit a defensive security plan.", assignments: "Create a security awareness and incident response plan for a small organization.", quizzes: "Security foundations and safe practice", thumbnail: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80", banner: "", createdAt: day(0) }
  ].concat((window.skillUpAICourses || []).map((course) => ({
    ...course,
    price: 5000,
    instructor: "SKILL-UP Team",
    status: "Published",
    enrolled: 0,
    completion: 0,
    thumbnail: course.thumbnail,
    banner: "",
    materials: "",
    requirements: "Complete the course modules and submit the final project.",
    assignments: "Create a practical project that applies the skills from this course.",
    quizzes: "Course fundamentals"
  }))),
  categories: ["Development", "Artificial Intelligence", "Design", "Digital marketing"],
  students: [
    { id: "s-1001", name: "Amara Okafor", email: "amara.okafor@example.com", joined: day(-1), status: "Active", courses: ["c-fullstack", "c-frontend"], progress: 68, initials: "AO", certificate: "In progress", activity: "Completed a project lesson; last active today." },
    { id: "s-1002", name: "Emeka Nnamdi", email: "emeka.n@example.com", joined: day(-2), status: "Active", courses: ["c-ai"], progress: 42, initials: "EN", certificate: "In progress", activity: "Submitted an AI automation assignment." },
    { id: "s-1003", name: "Zainab Musa", email: "zainab.m@example.com", joined: day(-3), status: "Active", courses: ["c-ux", "c-graphics"], progress: 76, initials: "ZM", certificate: "Eligible", activity: "Completed a design portfolio lesson." },
    { id: "s-1004", name: "Daniel Eze", email: "daniel.eze@example.com", joined: day(-4), status: "Suspended", courses: ["c-fullstack"], progress: 23, initials: "DE", certificate: "Not eligible", activity: "Account suspended in sample data." },
    { id: "s-1005", name: "Kemi Balogun", email: "kemi.b@example.com", joined: day(-5), status: "Active", courses: ["c-vibe"], progress: 35, initials: "KB", certificate: "In progress", activity: "Viewed the latest course announcement." },
    { id: "s-1006", name: "Tobi Adeyemi", email: "tobi.a@example.com", joined: day(-7), status: "Active", courses: ["c-frontend"], progress: 89, initials: "TA", certificate: "Eligible", activity: "Completed the responsive website project." },
    { id: "s-1007", name: "Chinwe Obi", email: "chinwe.o@example.com", joined: day(-9), status: "Active", courses: ["c-ai", "c-voice"], progress: 51, initials: "CO", certificate: "In progress", activity: "Booked a mentorship session." },
    { id: "s-1008", name: "Bola Yusuf", email: "bola.y@example.com", joined: day(-12), status: "Active", courses: ["c-mobile"], progress: 8, initials: "BY", certificate: "Not eligible", activity: "Started the mobile app course." },
    { id: "s-1009", name: "Femi Johnson", email: "femi.j@example.com", joined: day(-16), status: "Active", courses: ["c-fullstack"], progress: 57, initials: "FJ", certificate: "In progress", activity: "Last signed in two days ago." },
    { id: "s-1010", name: "Ngozi Eze", email: "ngozi.e@example.com", joined: day(-22), status: "Active", courses: ["c-graphics"], progress: 92, initials: "NE", certificate: "Issued", activity: "Certificate issued after course completion." }
  ],
  opportunityInterests: [
    { id: "INT-01", student: "Amara Okafor", opportunity: "Junior Frontend Developer", date: day(-1) },
    { id: "INT-02", student: "Tobi Adeyemi", opportunity: "Product Design Internship", date: day(-2) }
  ],
  payments: [
    { id: "TXN-80421", studentId: "s-1001", courseId: "c-fullstack", amount: 5000, fee: 175, status: "Successful", date: day(0), method: "Card" },
    { id: "TXN-80420", studentId: "s-1002", courseId: "c-ai", amount: 5000, fee: 175, status: "Successful", date: day(0), method: "Transfer" },
    { id: "TXN-80419", studentId: "s-1003", courseId: "c-ux", amount: 5000, fee: 175, status: "Successful", date: day(-1), method: "Card" },
    { id: "TXN-80418", studentId: "s-1005", courseId: "c-vibe", amount: 5000, fee: 175, status: "Pending", date: day(-1), method: "Transfer" },
    { id: "TXN-80417", studentId: "s-1006", courseId: "c-frontend", amount: 5000, fee: 175, status: "Successful", date: day(-2), method: "Card" },
    { id: "TXN-80416", studentId: "s-1007", courseId: "c-voice", amount: 5000, fee: 175, status: "Failed", date: day(-2), method: "Card" },
    { id: "TXN-80415", studentId: "s-1008", courseId: "c-mobile", amount: 5000, fee: 175, status: "Successful", date: day(-3), method: "Transfer" },
    { id: "TXN-80414", studentId: "s-1009", courseId: "c-fullstack", amount: 5000, fee: 175, status: "Successful", date: day(-4), method: "Card" },
    { id: "TXN-80413", studentId: "s-1010", courseId: "c-graphics", amount: 5000, fee: 175, status: "Successful", date: day(-5), method: "Card" },
    { id: "TXN-80412", studentId: "s-1003", courseId: "c-graphics", amount: 5000, fee: 175, status: "Successful", date: day(-7), method: "Transfer" }
  ],
  enrollmentRequests: [],
  referrals: [
    { id: "REF-2101", name: "Kemi Balogun", email: "kemi.b@example.com", code: "KEMI-LEARN", referrals: 18, conversions: 12, commission: 36000, status: "Active" },
    { id: "REF-2102", name: "Tobi Adeyemi", email: "tobi.a@example.com", code: "TOBI-SKILL", referrals: 11, conversions: 8, commission: 24000, status: "Active" },
    { id: "REF-2103", name: "Amara Okafor", email: "amara.okafor@example.com", code: "AMARA-UP", referrals: 7, conversions: 5, commission: 15000, status: "Active" },
    { id: "REF-2104", name: "Femi Johnson", email: "femi.j@example.com", code: "FEMI-TECH", referrals: 3, conversions: 1, commission: 3000, status: "Review" }
  ],
  withdrawals: [
    { id: "WDR-0931", partner: "Kemi Balogun", amount: 12000, requested: day(-1), status: "Pending", account: "•••• 4812" },
    { id: "WDR-0930", partner: "Tobi Adeyemi", amount: 8000, requested: day(-2), status: "Pending", account: "•••• 2901" },
    { id: "WDR-0929", partner: "Amara Okafor", amount: 5000, requested: day(-5), status: "Approved", account: "•••• 6673" }
  ],
  sessions: [
    { id: "MNT-301", title: "Getting started with frontend projects", mentor: "Ada Okafor", student: "Amara Okafor", date: day(1), time: "14:00", type: "1:1 mentorship", status: "Scheduled", link: "" },
    { id: "MNT-302", title: "AI automation: live Q&A", mentor: "Ifeanyi Okoro", student: "Group session", date: day(2), time: "16:30", type: "Live training", status: "Scheduled", link: "" },
    { id: "MNT-303", title: "Portfolio project review", mentor: "Tunde Adebayo", student: "Emeka Nnamdi", date: day(-1), time: "11:00", type: "Assignment review", status: "Completed", link: "" }
  ],
  reviews: [
    { id: "REV-401", type: "Assignment", title: "Responsive portfolio project", student: "Amara Okafor", course: "Frontend Development", submitted: day(-1), status: "Pending review", feedback: "" },
    { id: "REV-402", type: "Question", title: "How do I structure reusable API routes?", student: "Emeka Nnamdi", course: "Full Stack Development", submitted: day(-2), status: "Pending response", feedback: "" },
    { id: "REV-403", type: "Assignment", title: "Automation workflow project", student: "Chinwe Obi", course: "AI Automation", submitted: day(-3), status: "Reviewed", feedback: "Clear workflow. Add error handling for failed steps." }
  ],
  jobs: [
    { id: "JOB-501", title: "Junior Frontend Developer", company: "Northstar Digital", type: "Remote role", location: "Remote · Nigeria", verified: true, status: "Published", date: day(-2), link: "https://example.com/opportunity" },
    { id: "JOB-502", title: "Product Design Internship", company: "Open Canvas Studio", type: "Internship", location: "Remote · Africa", verified: true, status: "Published", date: day(-6), link: "https://example.com/internship" },
    { id: "JOB-503", title: "No-code Automation Project", company: "Community listing", type: "Freelance", location: "Remote", verified: false, status: "Draft", date: day(-1), link: "https://example.com/freelance" }
  ],
  resources: [
    { id: "RES-701", title: "CV template for early-career developers", category: "CV template", link: "https://example.com/cv-template", status: "Published" },
    { id: "RES-702", title: "Technical interview preparation guide", category: "Interview preparation", link: "https://example.com/interview-guide", status: "Published" },
    { id: "RES-703", title: "Freelance application checklist", category: "Application guide", link: "https://example.com/freelance-guide", status: "Draft" }
  ],
  faqs: [
    { id: "FAQ-01", question: "How do I get started?", answer: "Explore the courses, choose a skill that matches your goals and follow the enrolment steps to begin learning.", status: "Published" },
    { id: "FAQ-02", question: "Do I need previous experience?", answer: "Many of our courses can accommodate beginners. Check the individual course requirements before enrolling.", status: "Published" },
    { id: "FAQ-03", question: "Will I receive mentorship?", answer: "Mentorship and learning support are part of the SKILL-UP learning experience, according to the support arrangements for each programme.", status: "Published" },
    { id: "FAQ-04", question: "Can SKILL-UP help me secure remote jobs?", answer: "We provide career preparation and support for finding opportunities. Employment is not guaranteed.", status: "Published" }
  ],
  admins: [
    { id: currentUser.id, name: currentUser.name, email: currentUser.email, role: "Super admin", status: "Active" }
  ],
  testimonials: [
    { id: "TST-01", name: "Amara O.", quote: "The project feedback helped me understand how to improve my portfolio.", role: "Frontend learner", status: "Published" },
    { id: "TST-02", name: "Kemi B.", quote: "Having a clear learning path made it easier to keep moving forward.", role: "Digital skills learner", status: "Draft" }
  ],
  campaigns: [],
  announcements: [],
  siteContent: { headline: "Learn digital skills. Get mentored. Build your career.", announcement: "", bannerUrl: "", contactEmail: "hello@skill-up.ng", privacyPolicy: "", terms: "" },
  activity: [
    { id: "ACT-01", message: "Course published: UI/UX Design", by: "Site Admin", date: day(0) },
    { id: "ACT-02", message: "Withdrawal request submitted by Kemi Balogun", by: "Referral programme", date: day(-1) },
    { id: "ACT-03", message: "New mentorship session scheduled", by: "Ada Okafor", date: day(-1) }
  ],
  settings: { referralRate: 15, gateway: "Paystack (demo)", emailNotifications: true, maintenanceMode: false },
  audit: [{ id: "LOG-001", action: "Sample workspace initialized", by: "Site Admin", date: day(0) }]
});

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

async function readData(source, learnerWorkspaces) {
  const defaults = initialState();
  source ||= defaults;
  const loaded = Object.fromEntries(Object.keys(defaults).map((key) => [key, source[key] ?? defaults[key]]));
  if (!source.catalogInitialized) {
    const savedCourseIds = new Set(loaded.courses.map((course) => course.id));
    loaded.courses.push(...defaults.courses.filter((course) => !savedCourseIds.has(course.id)));
    loaded.catalogInitialized = true;
  }
  removedSeedRecords = removeSeedRecords(loaded);
  const learnersById = new Map(learnerWorkspaces.map((workspace) => [
    workspace.workspace_key.slice("learner:".length),
    workspace.data
  ]));
  const { data: accounts, error: profilesError } = await supabaseClient.client
    .from("profiles")
    .select("id,email,full_name,role,created_at")
    .order("created_at", { ascending: false });
  if (profilesError) throw profilesError;
  const courseById = new Map(loaded.courses.map((course) => [course.id, course]));
  const learnerSessions = [];
  const learnerReviews = [];
  const learnerRequests = new Map((loaded.enrollmentRequests || []).map((request) => [request.id, request]));

  for (const account of accounts.filter((item) => ["learner", "user"].includes(item?.role) && item.id && item.email)) {
    const userId = account.id;
    const learner = learnersById.get(userId) || {};
    const purchasesByCourse = new Map((learner?.purchases || []).map((purchase) => [purchase.courseId, purchase]));
    for (const payment of loaded.payments.filter((item) => item.userId === userId || item.studentId === userId)) {
      purchasesByCourse.set(payment.courseId, {
        courseId: payment.courseId,
        purchasedAt: payment.date,
        amount: payment.amount,
        status: payment.status,
        receipt: payment.id
      });
    }
    const purchases = [...purchasesByCourse.values()];
    const progressEntries = Object.entries(learner?.progress || {});
    const student = loaded.students.find((item) => item.id === userId) || {
      id: userId, joined: day(0), status: "Active", courses: [], progress: 0
    };
    Object.assign(student, {
      name: account.full_name,
      email: account.email,
      joined: account.created_at?.slice(0, 10) || student.joined,
      courses: purchases.filter((purchase) => purchase.status === "Successful").map((purchase) => purchase.courseId),
      progress: progressEntries.length ? Math.round(progressEntries.reduce((sum, [courseId, item]) => {
        if (item.completed) return sum + 100;
        const lessonCount = (courseById.get(courseId)?.modules || "").split("\n").filter(Boolean).length;
        return sum + (lessonCount ? Math.round(((item.completedLessons || []).length / lessonCount) * 100) : 0);
      }, 0) / progressEntries.length) : 0,
      source: "supabase"
    });
    if (!loaded.students.includes(student)) loaded.students.unshift(student);

    for (const purchase of purchases) {
      const payment = {
        id: purchase.receipt || `ENR-${userId}-${purchase.courseId}`,
        userId,
        studentId: userId,
        courseId: purchase.courseId,
        amount: Number(purchase.amount) || 0,
        fee: 0,
        status: purchase.status,
        date: purchase.purchasedAt || day(0),
        method: "Enrollment record"
      };
      const paymentIndex = loaded.payments.findIndex((item) => item.userId === userId && item.courseId === payment.courseId);
      if (paymentIndex < 0) loaded.payments.unshift(payment);
      else loaded.payments[paymentIndex] = { ...loaded.payments[paymentIndex], ...payment };
    }

    for (const request of learner?.enrollmentRequests || []) {
      learnerRequests.set(request.id, {
        ...request,
        user_id: userId,
        studentId: userId,
        student: account.full_name,
        email: account.email,
        course: courseById.get(request.course_id)?.title || request.course_id
      });
    }
    for (const session of learner?.sessions || []) {
      learnerSessions.push({
        ...session,
        id: `${userId}:${session.id}`,
        userId,
        sourceSessionId: session.id,
        student: account.full_name,
        source: "learner"
      });
    }
    for (const question of learner?.questions || []) {
      learnerReviews.push({
        id: `question:${userId}:${question.id}`,
        userId,
        questionId: question.id,
        type: "Question",
        title: question.title,
        student: account.full_name,
        course: courseById.get(question.courseId)?.title || "Course",
        submitted: question.date,
        status: question.answer ? "Responded" : question.status,
        feedback: question.answer || "",
        source: "learner"
      });
    }
    for (const [courseId, item] of Object.entries(learner?.progress || {})) {
      if (!item.assignment) continue;
      learnerReviews.push({
        id: `assignment:${userId}:${courseId}`,
        userId,
        courseId,
        type: "Assignment",
        title: item.assignment,
        student: account.full_name,
        course: courseById.get(courseId)?.title || "Course",
        submitted: item.assignmentDate || "",
        status: item.feedback ? "Reviewed" : "Pending review",
        feedback: item.feedback || "",
        source: "learner"
      });
    }
  }
  loaded.enrollmentRequests = [...learnerRequests.values()];
  loaded.sessions = [...loaded.sessions.filter((session) => session.source !== "learner"), ...learnerSessions];
  loaded.reviews = [...loaded.reviews.filter((review) => review.source !== "learner"), ...learnerReviews];
  return loaded;
}
const seedRecordIds = {
  students: new Set(Array.from({ length: 10 }, (_, index) => `s-${1001 + index}`)),
  opportunityInterests: new Set(["INT-01", "INT-02"]),
  payments: new Set(Array.from({ length: 10 }, (_, index) => `TXN-${80421 - index}`)),
  referrals: new Set(["REF-2101", "REF-2102", "REF-2103", "REF-2104"]),
  withdrawals: new Set(["WDR-0931", "WDR-0930", "WDR-0929"]),
  sessions: new Set(["MNT-301", "MNT-302", "MNT-303"]),
  reviews: new Set(["REV-401", "REV-402", "REV-403"]),
  jobs: new Set(["JOB-501", "JOB-502", "JOB-503"]),
  resources: new Set(["RES-701", "RES-702", "RES-703"]),
  faqs: new Set(["FAQ-01", "FAQ-02", "FAQ-03", "FAQ-04"]),
  testimonials: new Set(["TST-01", "TST-02"]),
  activity: new Set(["ACT-01", "ACT-02", "ACT-03"]),
  audit: new Set(["LOG-001"])
};
const seedRecordMatches = {
  students: (item) => String(item.email || "").endsWith("@example.com"),
  opportunityInterests: (item) => ["Amara Okafor", "Tobi Adeyemi"].includes(item.student),
  payments: (item) => /^s-10\d{2}$/.test(item.studentId || "") && item.amount === 5000,
  referrals: (item) => ["KEMI-LEARN", "TOBI-SKILL", "AMARA-UP", "FEMI-TECH"].includes(item.code)
    && String(item.email || "").endsWith("@example.com"),
  withdrawals: (item) => ["•••• 4812", "•••• 2901", "•••• 6673"].includes(item.account),
  sessions: (item) => ["Getting started with frontend projects", "AI automation: live Q&A", "Portfolio project review"].includes(item.title),
  reviews: (item) => ["Responsive portfolio project", "How do I structure reusable API routes?", "Automation workflow project"].includes(item.title),
  jobs: (item) => String(item.link || "").startsWith("https://example.com/")
    && ["Northstar Digital", "Open Canvas Studio", "Community listing"].includes(item.company),
  resources: (item) => String(item.link || "").startsWith("https://example.com/")
    && ["CV template for early-career developers", "Technical interview preparation guide", "Freelance application checklist"].includes(item.title),
  faqs: (item) => ["How do I get started?", "Do I need previous experience?", "Will I receive mentorship?", "Can SKILL-UP help me secure remote jobs?"].includes(item.question),
  testimonials: (item) => ["Amara O.", "Kemi B."].includes(item.name),
  activity: (item) => ["Course published: UI/UX Design", "Withdrawal request submitted by Kemi Balogun", "New mentorship session scheduled"].includes(item.message),
  audit: (item) => item.action === "Sample workspace initialized" && item.by === "Site Admin"
};
let removedSeedRecords = false;
function removeSeedRecords(workspace) {
  let removed = false;
  Object.entries(seedRecordIds).forEach(([collection, ids]) => {
    workspace[collection] = (workspace[collection] || []).filter((item) => {
      if (!ids.has(item.id) || !seedRecordMatches[collection]?.(item)) return true;
      removed = true;
      return false;
    });
  });
  return removed;
}
let state;
try {
  const [remoteAdmin, learnerWorkspaces] = await Promise.all([
    supabaseClient.loadWorkspace("admin"),
    supabaseClient.loadLearnerWorkspaces()
  ]);
  state = await readData(remoteAdmin || initialState(), learnerWorkspaces);
  const syllabusDefaults = new Map((window.skillUpAICourses || []).map((course) => [course.id, course]));
  const sharedThumbnail = "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=800&q=80";
  const thumbnailDefaults = new Map([
    ...syllabusDefaults,
    ["c-ai", { thumbnail: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80" }]
  ]);
  let hasCourseDefaultsUpdate = false;
  state.courses.forEach((course) => {
    const defaults = syllabusDefaults.get(course.id);
    const thumbnailDefault = thumbnailDefaults.get(course.id)?.thumbnail;
    if (!defaults && !thumbnailDefault) return;
    let updated = false;
    if (defaults) {
      ["introduction", "objectives", "modules"].forEach((fieldName) => {
        if (!String(course[fieldName] || "").trim() && defaults[fieldName]) {
          course[fieldName] = defaults[fieldName];
          updated = true;
        }
      });
    }
    if (defaults && !Object.prototype.hasOwnProperty.call(course, "featured")) {
      course.featured = Boolean(defaults.featured);
      updated = true;
    }
    if (thumbnailDefault && (!course.thumbnail || course.thumbnail === sharedThumbnail)) {
      course.thumbnail = thumbnailDefault;
      updated = true;
    }
    hasCourseDefaultsUpdate ||= updated;
  });
  const hasNewCourses = state.courses.some((course) => !remoteAdmin?.courses?.some((saved) => saved.id === course.id));
  const hasCourseCatalogUpdate = !remoteAdmin?.catalogInitialized;
  if (!remoteAdmin || hasNewCourses || hasCourseDefaultsUpdate || hasCourseCatalogUpdate || removedSeedRecords) {
    await supabaseClient.saveWorkspace("admin", state);
  }
  const remotePublic = await supabaseClient.loadWorkspace("public");
  if (!remoteAdmin || !remotePublic || !remotePublic.catalogInitialized || hasNewCourses || hasCourseDefaultsUpdate || hasCourseCatalogUpdate || removedSeedRecords) await supabaseClient.saveWorkspace("public", publicWorkspace(state));
  removedSeedRecords = false;
} catch (error) {
  mainContent.innerHTML = `<section class="panel"><div class="panel-body"><h2>Could not load Supabase data</h2><p>${escapeHTML(error.message || "Check the Supabase project setup and try again.")}</p></div></section>`;
  return;
}
let activeView = "dashboard";
let chartRange = "week";
let activeFilters = { search: "", status: "All" };
let modalPreviousFocus = null;

let persistedState = JSON.parse(JSON.stringify(state));
let persistRevision = 0;
function publicWorkspace(workspace) {
  return {
    catalogInitialized: true,
    courses: workspace.courses.filter((item) => item.status === "Published"),
    jobs: workspace.jobs.filter((item) => item.status === "Published"),
    resources: workspace.resources.filter((item) => item.status === "Published"),
    announcements: workspace.announcements.filter((item) => item.status === "Published"),
    faqs: workspace.faqs.filter((item) => item.status === "Published"),
    testimonials: workspace.testimonials.filter((item) => item.status === "Published"),
    siteContent: workspace.siteContent
  };
}
function persist(message) {
  const revision = ++persistRevision;
  const snapshot = JSON.parse(JSON.stringify(state));
  void supabaseClient.saveWorkspace("admin", snapshot)
    .then(() => supabaseClient.saveWorkspace("public", publicWorkspace(snapshot)))
    .then(() => {
      if (revision !== persistRevision) return;
      persistedState = snapshot;
      if (message) notify(`${message} Synced with Supabase.`);
    })
    .catch((error) => {
      if (revision !== persistRevision) return;
      state = persistedState;
      render();
      notify(`Could not save this change to Supabase: ${error.message}`, "error");
    });
  return true;
}
function commit(mutator, message) {
  mutator();
  persist(message);
  render();
  return true;
}

async function refreshDashboard() {
  const refreshButton = mainContent.querySelector('[data-action="refresh-dashboard"]');
  if (refreshButton) refreshButton.disabled = true;
  try {
    const [remoteAdmin, learnerWorkspaces] = await Promise.all([
      supabaseClient.loadWorkspace("admin"),
      supabaseClient.loadLearnerWorkspaces()
    ]);
    const refreshedState = await readData(remoteAdmin || initialState(), learnerWorkspaces);
    const hasNewCourses = refreshedState.courses.some((course) => !remoteAdmin?.courses?.some((saved) => saved.id === course.id));
    const hasCourseCatalogUpdate = !remoteAdmin?.catalogInitialized;
    if (!remoteAdmin || hasNewCourses || hasCourseCatalogUpdate || removedSeedRecords) {
      await supabaseClient.saveWorkspace("admin", refreshedState);
    }
    const remotePublic = await supabaseClient.loadWorkspace("public");
    if (!remotePublic || !remotePublic.catalogInitialized || hasNewCourses || hasCourseCatalogUpdate || removedSeedRecords) {
      await supabaseClient.saveWorkspace("public", publicWorkspace(refreshedState));
    }
    removedSeedRecords = false;
    state = refreshedState;
    persistedState = JSON.parse(JSON.stringify(refreshedState));
    render();
    notify("Dashboard data refreshed from Supabase.");
  } catch (error) {
    if (refreshButton?.isConnected) refreshButton.disabled = false;
    notify(`Could not refresh dashboard data from Supabase: ${error.message}`, "error");
  }
}

async function updateLearnerSession(session, remove = false) {
  const workspace = await supabaseClient.loadWorkspace(`learner:${session.userId}`);
  if (!workspace) throw new Error("The learner workspace for this session no longer exists.");
  const sessions = workspace.sessions || [];
  const sessionIndex = sessions.findIndex((item) => item.id === session.sourceSessionId);
  if (sessionIndex < 0) throw new Error("The learner session could not be found.");
  if (remove) sessions.splice(sessionIndex, 1);
  else sessions[sessionIndex].status = "Completed";
  workspace.sessions = sessions;
  await supabaseClient.saveWorkspace(`learner:${session.userId}`, workspace);
}
async function updateLearnerEnrollment(userId, courseId, status, payment) {
  if (!userId) return;
  const workspace = await supabaseClient.loadWorkspace(`learner:${userId}`);
  if (!workspace) throw new Error("The learner's Supabase workspace could not be found.");
  workspace.enrollmentRequests = (workspace.enrollmentRequests || []).map((request) =>
    request.course_id === courseId ? { ...request, status } : request);
  if (payment) {
    const purchases = workspace.purchases || [];
    const purchase = {
      courseId,
      purchasedAt: payment.date,
      amount: Number(payment.amount) || 0,
      status: payment.status,
      receipt: payment.id
    };
    const index = purchases.findIndex((item) => item.courseId === courseId);
    if (index < 0) purchases.push(purchase);
    else purchases[index] = { ...purchases[index], ...purchase };
    workspace.purchases = purchases;
  }
  await supabaseClient.saveWorkspace(`learner:${userId}`, workspace);
}
function notify(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast${type === "error" ? " error" : ""}`;
  toast.textContent = message;
  document.querySelector("#toast-region").append(toast);
  window.setTimeout(() => toast.remove(), 4200);
}

function money(value) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(Number(value) || 0);
}

function compact(value) {
  return new Intl.NumberFormat("en-NG", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value) || 0);
}

function dateLabel(value) {
  if (!value) return "—";
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? escapeHTML(value) : new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric" }).format(parsed);
}

function relativeDate(value) {
  if (!value) return "";
  const days = Math.round((new Date(`${value}T00:00:00`) - new Date(`${day(0)}T00:00:00`)) / 86400000);
  if (days === 0) return "Today";
  if (days === -1) return "Yesterday";
  return days < 0 ? `${Math.abs(days)} days ago` : `In ${days} days`;
}

function statusBadge(status) {
  const className = String(status).toLowerCase().replace(/[^a-z]+/g, "-");
  return `<span class="status-badge status-${escapeHTML(className)}">${escapeHTML(status)}</span>`;
}

function initials(name) {
  return String(name || "").split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
}

function avatar(name, variant = "") {
  return `<span class="avatar ${variant}">${escapeHTML(initials(name))}</span>`;
}

function courseById(id) { return state.courses.find((item) => item.id === id); }
function studentById(id) { return state.students.find((item) => item.id === id); }
function courseName(id) { return courseById(id)?.title || "Course unavailable"; }
function studentName(id) { return studentById(id)?.name || "Student unavailable"; }

function heading(title, description, actions = "") {
  return `<div class="page-heading"><div><p class="heading-eyebrow">SKILL-UP ADMIN WORKSPACE</p><h1>${escapeHTML(title)}</h1>${description ? `<p>${description}</p>` : ""}</div><div class="page-actions">${actions}</div></div>`;
}

function tableShell(toolbar, columns, rows, emptyMessage = "Nothing to show yet.") {
  return `<div class="panel data-panel"><div class="table-toolbar">${toolbar}</div><div class="table-wrap"><table class="data-table"><thead><tr>${columns.map((column) => `<th>${column}</th>`).join("")}</tr></thead><tbody>${rows || `<tr><td class="table-empty" colspan="${columns.length}">${emptyMessage}</td></tr>`}</tbody></table></div></div>`;
}

function chartValues() {
  const count = chartRange === "day" ? 1 : chartRange === "week" ? 7 : 12;
  const monthDates = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - (11 - index), 1);
    return date;
  });
  const labels = chartRange === "day"
    ? ["Today"]
    : chartRange === "week"
      ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      : monthDates.map((date) => new Intl.DateTimeFormat("en-NG", { month: "short" }).format(date));
  const values = Array.from({ length: count }, (_, index) => {
    if (chartRange === "month") {
      const month = monthDates[index];
      return state.payments.filter((payment) => {
        const paymentDate = new Date(`${payment.date}T00:00:00`);
        return payment.status === "Successful" && paymentDate.getFullYear() === month.getFullYear() && paymentDate.getMonth() === month.getMonth();
      }).reduce((sum, payment) => sum + payment.amount, 0);
    }
    const date = new Date(today);
    date.setDate(date.getDate() + (chartRange === "day" ? 0 : index - 6));
    if (chartRange === "day") {
      return state.payments.filter((payment) => payment.status === "Successful" && payment.date === day(0)).reduce((sum, payment) => sum + payment.amount, 0);
    }
    return state.payments.filter((payment) => payment.status === "Successful" && payment.date === date.toISOString().slice(0, 10)).reduce((sum, payment) => sum + payment.amount, 0);
  });
  return { labels, values };
}

function chartMarkup() {
  const { labels, values } = chartValues();
  const maximum = Math.max(10000, ...values);
  const width = 620, height = 190, pad = { left: 36, right: 12, top: 12, bottom: 24 };
  const plotWidth = width - pad.left - pad.right, plotHeight = height - pad.top - pad.bottom;
  const points = values.map((value, index) => ({
    x: pad.left + (values.length < 2 ? plotWidth / 2 : (index * plotWidth) / (values.length - 1)),
    y: pad.top + plotHeight - (value / maximum) * plotHeight
  }));
  const line = points.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ");
  const area = `${line} L${points.at(-1).x},${pad.top + plotHeight} L${points[0].x},${pad.top + plotHeight} Z`;
  const grid = [0, 1, 2, 3].map((index) => {
    const y = pad.top + index * (plotHeight / 3);
    return `<line class="chart-gridline" x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}"></line><text class="chart-label" x="0" y="${y + 3}">${compact(Math.round(maximum * (1 - index / 3)))}</text>`;
  }).join("");
  const labelMarkup = labels.map((label, index) => `<text class="chart-label" text-anchor="middle" x="${points[index].x}" y="${height - 3}">${escapeHTML(label)}</text>`).join("");
  const circles = points.map((point) => `<circle class="chart-point" cx="${point.x}" cy="${point.y}" r="3.2"></circle>`).join("");
  return `<svg class="revenue-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Enrollment value trend for the selected period"><defs><linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#00a88f" stop-opacity=".2"></stop><stop offset="100%" stop-color="#00a88f" stop-opacity="0"></stop></linearGradient></defs>${grid}<path class="chart-area" d="${area}"></path><path class="chart-path" d="${line}"></path>${circles}${labelMarkup}</svg>`;
}

function renderDashboard() {
  const enrolledStudents = state.students.filter((item) => item.courses.length > 0).length;
  const revenue = state.payments.filter((item) => item.status === "Successful").reduce((sum, item) => sum + item.amount, 0);
  const commission = state.referrals.reduce((sum, item) => sum + item.commission, 0);
  const pendingWithdrawals = state.withdrawals.filter((item) => item.status === "Pending").length;
  const successfulPayments = state.payments.filter((item) => item.status === "Successful").length;
  const statData = [
    ["Registered learners", state.students.length, "♙", "Learner accounts and workspace records", ""],
    ["Enrolled learners", enrolledStudents, "↗", "At least one approved enrollment", "coral"],
    ["Referral partners", state.referrals.length, "◎", "Registered partner accounts", "violet"],
    ["Available courses", state.courses.filter((item) => item.status === "Published").length, "▤", `${state.courses.length} total in course library`, "amber"],
    ["Approved enrollments", successfulPayments, "⌑", "Recorded enrollment activity", ""],
    ["Enrolled course value", money(revenue), "↗", "Not verified payment revenue", "coral"],
    ["Referral commissions", money(commission), "✳", "Recorded partner commissions", "violet"],
    ["Pending withdrawals", pendingWithdrawals, "◷", "Requests awaiting review", "amber"]
  ];
  const stats = statData.map(([label, value, icon, foot, color]) => `<article class="stat-card"><div class="stat-top"><span class="stat-label">${label}</span><span class="stat-icon ${color}">${icon}</span></div><strong class="stat-value">${value}</strong><div class="stat-foot"><span>${foot}</span></div></article>`).join("");
  const transactions = [...state.payments].sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))).slice(0, 5).map((payment, index) => `<div class="activity-item">${avatar(studentName(payment.studentId), ["", "avatar-rose", "avatar-blue", "avatar-violet", "avatar-amber"][index])}<div class="activity-copy"><strong>${escapeHTML(studentName(payment.studentId))} · ${escapeHTML(courseName(payment.courseId))}</strong><small>${escapeHTML(payment.id)} · ${relativeDate(payment.date)}</small></div><span class="activity-amount">${payment.status === "Successful" ? money(payment.amount) : statusBadge(payment.status)}</span></div>`).join("");
  const registrations = [...state.students].sort((a, b) => b.joined.localeCompare(a.joined)).slice(0, 5).map((student, index) => `<div class="activity-item">${avatar(student.name, ["avatar-blue", "avatar-rose", "avatar-violet", "avatar-amber", ""][index])}<div class="activity-copy"><strong>${escapeHTML(student.name)}</strong><small>${escapeHTML(student.email)}</small></div><span class="muted">${relativeDate(student.joined)}</span></div>`).join("");
  const rangeLabel = { day: "Today", week: "This week", month: "This month" }[chartRange];
  return `${heading("Dashboard overview", `Welcome back, ${escapeHTML(adminDisplayName)}. Here's what's happening across your learning platform today.`, `<button class="button button-soft" data-action="refresh-dashboard"><span class="button-icon">↻</span> Refresh data</button><button class="button button-soft" data-action="export-report"><span class="button-icon">↓</span> Export report</button>`)}
    <section class="stats-grid" aria-label="Platform totals">${stats}</section>
    <div class="dashboard-grid">
      <section class="panel"><div class="panel-header"><div><h2>Enrollment value</h2><p>${rangeLabel} approved enrollment records · not payment revenue</p></div><div class="chart-controls" role="group" aria-label="Chart time range">${["day", "week", "month"].map((range) => `<button class="chart-range${chartRange === range ? " active" : ""}" data-range="${range}">${{ day: "Daily", week: "Weekly", month: "Monthly" }[range]}</button>`).join("")}</div></div><div class="panel-body"><div class="chart-legend"><span><i class="legend-dot"></i>Recorded enrollment value</span><span class="muted">NGN</span></div><div class="chart-wrap">${chartMarkup()}</div></div></section>
      <section class="panel"><div class="panel-header"><div><h2>Performance snapshot</h2><p>${rangeLabel} platform health</p></div></div><div class="panel-body"><div class="insights-list">
        <div class="insight-row"><span>Approved enrollments</span><strong>${successfulPayments}</strong></div><div class="insight-row"><span>Pending enrollment requests</span><strong>${state.enrollmentRequests.filter((item) => item.status === "Pending").length}</strong></div><div class="insight-row"><span>Rejected enrollment requests</span><strong>${state.enrollmentRequests.filter((item) => item.status === "Rejected").length}</strong></div><div class="insight-row"><span>Average learner progress</span><strong>${state.students.length ? Math.round(state.students.reduce((sum, item) => sum + item.progress, 0) / state.students.length) : 0}%</strong></div></div><div class="insight-note"><b>↗</b><span>Enrollment approval records course access. Payment must be verified independently until a gateway is integrated.</span></div></div></section>
    </div>
    <div class="two-panels">
      <section class="panel"><div class="panel-header"><div><h2>Recent enrollments</h2><p>Latest approved course access records</p></div><button class="view-all" data-view="finance">View all →</button></div><div class="panel-body"><div class="activity-list">${transactions || `<div class="empty-state">No enrollments recorded yet.</div>`}</div></div></section>
      <section class="panel"><div class="panel-header"><div><h2>New student registrations</h2><p>Latest learner accounts</p></div><button class="view-all" data-view="students">View all →</button></div><div class="panel-body"><div class="activity-list">${registrations || `<div class="empty-state">No students registered yet.</div>`}</div></div></section>
    </div>`;
}

function renderCourses() {
  const categories = state.categories;
  const search = activeFilters.search.toLowerCase();
  const filtered = state.courses.filter((course) => (`${course.title} ${course.category} ${course.instructor}`).toLowerCase().includes(search)
    && (activeFilters.status === "All" || course.status === activeFilters.status));
  const cards = filtered.map((course) => `<article class="course-admin-card"><div class="course-banner">${course.banner || course.thumbnail ? `<img src="${escapeHTML(course.banner || course.thumbnail)}" alt="" loading="lazy">` : ""}${statusBadge(course.status)}</div><div class="course-card-body"><div class="course-card-meta"><span>${escapeHTML(course.category)}</span><strong>${money(course.price)}</strong></div><h3>${escapeHTML(course.title)}</h3><p>${escapeHTML(course.description)}</p><div class="course-card-stats"><span>Enrolled <strong>${course.enrolled}</strong></span><span>Avg. progress <strong>${course.completion}%</strong></span></div><div class="course-card-meta"><span>Instructor</span><strong>${escapeHTML(course.instructor)}</strong></div><div class="course-featured-status${course.featured ? " is-featured" : ""}">${course.featured ? "Shown on landing page" : "Explore courses only"}</div><div class="course-card-actions"><button class="text-button" data-action="course-details" data-id="${course.id}">Details</button><button class="text-button" data-action="edit-course" data-id="${course.id}">Edit</button><button class="text-button" data-action="toggle-course" data-id="${course.id}">${course.status === "Published" ? "Unpublish" : "Publish"}</button><button class="text-button danger" data-action="archive-course" data-id="${course.id}">${course.status === "Archived" ? "Delete" : "Archive"}</button></div></div></article>`).join("");
  const toolbar = `<div class="toolbar-left"><div class="search-field"><input type="search" data-filter="search" placeholder="Search courses…" value="${escapeHTML(activeFilters.search)}" aria-label="Search courses"></div><select class="field-control" data-filter="status" aria-label="Filter course status"><option>All</option>${["Published", "Draft", "Archived"].map((item) => `<option${activeFilters.status === item ? " selected" : ""}>${item}</option>`).join("")}</select></div><div class="toolbar-right"><span class="muted">${filtered.length} courses shown · ${categories.length} categories</span></div>`;
  return `${heading("Course management", "Create and organize your courses, learning materials, instructors and publishing status.", `<button class="button button-soft" data-action="add-category"><span class="button-icon">＋</span> Add category</button><button class="button button-primary" data-action="add-course"><span class="button-icon">＋</span> Create course</button>`)}
    <div class="panel data-panel"><div class="table-toolbar">${toolbar}</div></div>
    <div class="course-list">${cards || `<div class="panel empty-state"><strong>No matching courses</strong>Try a different search or create a course.</div>`}</div>`;
}

function renderStudents() {
  const search = activeFilters.search.toLowerCase();
  const filtered = state.students.filter((student) => (`${student.name} ${student.email} ${student.id}`).toLowerCase().includes(search)
    && (activeFilters.status === "All" || student.status === activeFilters.status));
  const rows = filtered.map((student) => `<tr><td><div class="cell-primary">${avatar(student.name)}<span><strong>${escapeHTML(student.name)}</strong><small>${student.source === "supabase" ? "Registered account" : "Sample record"}</small></span></div></td><td>${escapeHTML(student.email)}</td><td>${dateLabel(student.joined)}</td><td>${student.courses.length}</td><td><strong>${student.progress}%</strong></td><td>${statusBadge(student.status)}</td><td><button class="text-button" data-action="student-details" data-id="${escapeHTML(student.id)}">Profile</button></td></tr>`).join("");
  const toolbar = `<div class="toolbar-left"><div class="search-field"><input type="search" data-filter="search" placeholder="Search students…" value="${escapeHTML(activeFilters.search)}" aria-label="Search students"></div><select class="field-control" data-filter="status" aria-label="Filter student status"><option>All</option><option${activeFilters.status === "Registered" ? " selected" : ""}>Registered</option></select></div><div class="toolbar-right"><button class="button button-soft button-small" data-action="export-students">↓ Export CSV</button></div>`;
  return `${heading("Student management", "Review registered accounts, enrollment records and progress synced with Supabase.", `<span class="button button-soft">${state.students.length} records</span>`)}
    <div class="summary-cards"><div class="summary-card"><span>Learner profiles</span><strong>${state.students.length}</strong><small>Accounts and learner records</small></div><div class="summary-card"><span>Enrolled learners</span><strong>${state.students.filter((student) => student.courses.length > 0).length}</strong><small>At least one approved enrollment</small></div><div class="summary-card"><span>Average learning progress</span><strong>${state.students.length ? Math.round(state.students.reduce((sum, student) => sum + student.progress, 0) / state.students.length) : 0}%</strong><small>Calculated from learner records</small></div></div>
    ${tableShell(toolbar, ["Student", "Email", "Joined", "Courses", "Progress", "Status", "Actions"], rows, "No students match these filters.")}`;
}

function renderFinance() {
  const successful = state.payments.filter((payment) => payment.status === "Successful");
  const pendingRequests = state.enrollmentRequests.filter((request) => request.status === "Pending").length;
  const totals = [
    ["Enrolled value", money(successful.reduce((sum, payment) => sum + payment.amount, 0)), `${successful.length} enrollment records`],
    ["Payment processing", "Not connected", "No gateway transactions are recorded"],
    ["Pending enrollment requests", pendingRequests, "Awaiting manual payment verification"]
  ];
  const search = activeFilters.search.toLowerCase();
  const filtered = state.payments.filter((payment) => (`${payment.id} ${studentName(payment.studentId)} ${courseName(payment.courseId)} ${payment.method}`).toLowerCase().includes(search)
    && (activeFilters.status === "All" || payment.status === activeFilters.status));
  const rows = filtered.map((payment) => `<tr><td><strong>${escapeHTML(payment.id)}</strong></td><td>${escapeHTML(studentName(payment.studentId))}<small class="muted"><br>${escapeHTML(studentById(payment.studentId)?.email || "")}</small></td><td>${escapeHTML(courseName(payment.courseId))}</td><td><strong>${money(payment.amount)}</strong></td><td>${escapeHTML(payment.method)}</td><td>${dateLabel(payment.date)}</td><td>${statusBadge(payment.status)}</td><td><div class="table-actions">${payment.status === "Successful" ? `<button class="text-button danger" data-action="refund-payment" data-id="${payment.id}">Revoke access</button>` : "—"}</div></td></tr>`).join("");
  const requestRows = state.enrollmentRequests.map((request) => `<tr><td><strong>${escapeHTML(request.student)}</strong><small class="muted"><br>${escapeHTML(request.email)}</small></td><td>${escapeHTML(request.course)}</td><td>${dateLabel(request.requested_at?.slice(0, 10))}</td><td>${statusBadge(request.status)}</td><td><div class="table-actions">${request.status === "Pending" ? `<button class="text-button" data-action="approve-enrollment-request" data-id="${escapeHTML(request.id)}">Verify &amp; approve</button><button class="text-button danger" data-action="reject-enrollment-request" data-id="${escapeHTML(request.id)}">Reject</button>` : "—"}</div></td></tr>`).join("");
  const toolbar = `<div class="toolbar-left"><div class="search-field"><input type="search" data-filter="search" placeholder="Search transactions…" value="${escapeHTML(activeFilters.search)}" aria-label="Search transactions"></div><select class="field-control" data-filter="status" aria-label="Filter payment status"><option>All</option>${["Successful", "Pending", "Failed", "Refunded"].map((item) => `<option${activeFilters.status === item ? " selected" : ""}>${item}</option>`).join("")}</select></div><div class="toolbar-right"><button class="button button-soft button-small" data-action="export-payments">↓ Financial CSV</button></div>`;
  return `${heading("Payments & finance", "Review enrollment records and requests. Verify payments outside the app before granting course access.", `<span class="button button-soft">Payment gateway not connected</span>`)}
    <div class="inline-note"><span>ⓘ</span><div><strong>Manual verification required.</strong> Approving an enrollment request records the course price and grants access; it does not charge a learner or verify a payment. Only approve after confirming payment independently. Marking an enrollment refunded revokes access but does not process a refund.</div></div>
    <div class="summary-cards">${totals.map(([label, value, foot]) => `<div class="summary-card"><span>${label}</span><strong>${value}</strong><small>${foot}</small></div>`).join("")}</div>
    ${tableShell(toolbar, ["Enrollment record", "Student", "Course", "Recorded value", "Record type", "Date", "Status", "Action"], rows, "No enrollment records match these filters.")}
    <section class="panel data-panel"><div class="panel-header"><div><h2>Enrollment requests</h2><p>${pendingRequests} awaiting review</p></div></div><div class="inline-note"><span>ⓘ</span><div>Verify any payment independently before approving. Rejected requests can be resubmitted by the learner.</div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Learner</th><th>Course</th><th>Requested</th><th>Status</th><th>Actions</th></tr></thead><tbody>${requestRows || `<tr><td class="table-empty" colspan="5">No enrollment requests.</td></tr>`}</tbody></table></div></section>`;
}

function renderReferrals() {
  const rows = [...state.referrals].sort((a, b) => b.conversions - a.conversions).map((referral) => `<tr><td><div class="cell-primary">${avatar(referral.name)}<span><strong>${escapeHTML(referral.name)}</strong><small>${escapeHTML(referral.email)}</small></span></div></td><td><strong>${escapeHTML(referral.code)}</strong></td><td>${referral.referrals}</td><td>${referral.conversions}</td><td><strong>${money(referral.commission)}</strong></td><td>${statusBadge(referral.status)}</td><td><div class="table-actions"><button class="text-button" data-action="referral-details" data-id="${referral.id}">Details</button><button class="text-button" data-action="adjust-commission" data-id="${referral.id}">Adjust</button></div></td></tr>`).join("");
  const withdrawals = state.withdrawals.map((request) => `<tr><td><strong>${escapeHTML(request.id)}</strong></td><td>${escapeHTML(request.partner)}</td><td><strong>${money(request.amount)}</strong></td><td>${escapeHTML(request.account)}</td><td>${dateLabel(request.requested)}</td><td>${statusBadge(request.status)}</td><td><div class="table-actions">${request.status === "Pending" ? `<button class="text-button" data-action="approve-withdrawal" data-id="${request.id}">Approve</button><button class="text-button danger" data-action="reject-withdrawal" data-id="${request.id}">Reject</button>` : "—"}</div></td></tr>`).join("");
  const campaigns = state.campaigns.map((campaign) => `<tr><td><strong>${escapeHTML(campaign.name)}</strong><small class="muted"><br>${escapeHTML(campaign.id)}</small></td><td>${campaign.rate}%</td><td>${dateLabel(campaign.createdAt)}</td><td>${statusBadge(campaign.status)}</td><td><div class="table-actions"><button class="text-button" data-action="toggle-campaign" data-id="${campaign.id}">${campaign.status === "Active" ? "Pause" : "Activate"}</button><button class="text-button danger" data-action="delete-campaign" data-id="${campaign.id}">Delete</button></div></td></tr>`).join("");
  const totalCommission = state.referrals.reduce((sum, referral) => sum + referral.commission, 0);
  return `${heading("Referral management", "Monitor partner referrals, commission totals and withdrawal requests.", `<button class="button button-primary" data-action="referral-campaign"><span class="button-icon">＋</span> New campaign</button>`)}
    <div class="summary-cards"><div class="summary-card"><span>Referral partners</span><strong>${state.referrals.length}</strong><small>Registered demo accounts</small></div><div class="summary-card"><span>Successful referrals</span><strong>${state.referrals.reduce((sum, referral) => sum + referral.conversions, 0)}</strong><small>Sample course conversions</small></div><div class="summary-card"><span>Commissions recorded</span><strong>${money(totalCommission)}</strong><small>Unverified demo balance</small></div></div>
    <section class="panel data-panel"><div class="panel-header"><div><h2>Referral partners & leaderboard</h2><p>Ranked by successful sample conversions</p></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Partner</th><th>Referral code</th><th>Clicks</th><th>Conversions</th><th>Commission</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows || `<tr><td class="table-empty" colspan="7">No referral partners yet.</td></tr>`}</tbody></table></div></section>
    <section class="panel data-panel"><div class="panel-header"><div><h2>Referral campaigns</h2><p>Local campaign rules and commission rate</p></div><span class="muted">Current default: ${state.settings.referralRate}%</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Campaign</th><th>Commission</th><th>Created</th><th>Status</th><th>Actions</th></tr></thead><tbody>${campaigns || `<tr><td class="table-empty" colspan="5">No campaigns created. Add one to configure the default rate.</td></tr>`}</tbody></table></div></section>
    <section class="panel data-panel"><div class="panel-header"><div><h2>Withdrawal requests</h2><p>${state.withdrawals.filter((request) => request.status === "Pending").length} awaiting review</p></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Request</th><th>Partner</th><th>Amount</th><th>Account</th><th>Requested</th><th>Status</th><th>Actions</th></tr></thead><tbody>${withdrawals || `<tr><td class="table-empty" colspan="7">No withdrawal requests.</td></tr>`}</tbody></table></div></section>`;
}

function renderMentorship() {
  const rows = state.sessions.map((session) => `<tr><td><strong>${escapeHTML(session.title)}</strong><small class="muted"><br>${escapeHTML(session.type)}</small></td><td>${escapeHTML(session.mentor)}</td><td>${escapeHTML(session.student)}</td><td>${dateLabel(session.date)}<small class="muted"><br>${escapeHTML(session.time)}</small></td><td>${session.link ? `<a class="view-all" href="${escapeHTML(session.link)}" target="_blank" rel="noopener noreferrer">Open link ↗</a>` : "—"}</td><td>${statusBadge(session.status)}</td><td><div class="table-actions">${session.status === "Scheduled" ? `<button class="text-button" data-action="complete-session" data-id="${session.id}">Complete</button>` : ""}<button class="text-button danger" data-action="delete-session" data-id="${session.id}">Remove</button></div></td></tr>`).join("");
  const reviewRows = state.reviews.map((review) => `<tr><td>${statusBadge(review.type)}</td><td><strong>${escapeHTML(review.title)}</strong><small class="muted"><br>${escapeHTML(review.course)}</small></td><td>${escapeHTML(review.student)}</td><td>${dateLabel(review.submitted)}</td><td>${statusBadge(review.status)}</td><td><button class="text-button" data-action="review-submission" data-id="${review.id}">${review.status === "Reviewed" || review.status === "Responded" ? "View feedback" : review.type === "Question" ? "Respond" : "Review"}</button></td></tr>`).join("");
  const toolbar = `<div class="toolbar-left"><span class="muted">${state.sessions.filter((session) => session.status === "Scheduled").length} scheduled sessions · ${state.sessions.filter((session) => session.status === "Completed").length} completed</span></div>`;
  return `${heading("Mentorship management", "Schedule mentor sessions, live training and assignment-review appointments.", `<button class="button button-primary" data-action="add-session"><span class="button-icon">＋</span> Schedule session</button>`)}
    ${tableShell(toolbar, ["Session", "Mentor", "Student / group", "Date & time", "Session link", "Status", "Actions"], rows, "No mentorship sessions scheduled.")}
    <section class="panel data-panel"><div class="panel-header"><div><h2>Student questions & assignment reviews</h2><p>Respond to learner questions and review practical submissions</p></div><button class="button button-soft button-small" data-action="add-review">＋ Add submission</button></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Type</th><th>Submission</th><th>Student</th><th>Submitted</th><th>Status</th><th>Action</th></tr></thead><tbody>${reviewRows || `<tr><td class="table-empty" colspan="6">No submissions waiting for review.</td></tr>`}</tbody></table></div></section>`;
}

function renderCareers() {
  const rows = state.jobs.map((job) => `<tr><td><strong>${escapeHTML(job.title)}</strong><small class="muted"><br>${escapeHTML(job.id)}</small></td><td>${escapeHTML(job.company)}</td><td>${escapeHTML(job.type)}</td><td>${escapeHTML(job.location)}</td><td>${job.verified ? statusBadge("Verified") : statusBadge("External listing")}</td><td>${statusBadge(job.status)}</td><td>${dateLabel(job.date)}</td><td><div class="table-actions"><button class="text-button" data-action="edit-job" data-id="${job.id}">Edit</button><button class="text-button" data-action="toggle-job" data-id="${job.id}">${job.status === "Published" ? "Unpublish" : "Publish"}</button><button class="text-button danger" data-action="delete-job" data-id="${job.id}">Delete</button></div></td></tr>`).join("");
  const resourceRows = state.resources.map((resource) => `<tr><td><strong>${escapeHTML(resource.title)}</strong></td><td>${escapeHTML(resource.category)}</td><td>${resource.link ? `<a class="view-all" href="${escapeHTML(resource.link)}" target="_blank" rel="noopener noreferrer">Open resource ↗</a>` : "—"}</td><td>${statusBadge(resource.status)}</td><td><div class="table-actions"><button class="text-button" data-action="edit-resource" data-id="${resource.id}">Edit</button><button class="text-button" data-action="toggle-resource" data-id="${resource.id}">${resource.status === "Published" ? "Unpublish" : "Publish"}</button><button class="text-button danger" data-action="delete-resource" data-id="${resource.id}">Delete</button></div></td></tr>`).join("");
  const toolbar = `<div class="toolbar-left"><span class="muted">${state.jobs.filter((job) => job.status === "Published").length} published opportunities</span></div><div class="toolbar-right"><span class="muted">Vacancies must be verified before publishing</span></div>`;
  const interests = state.opportunityInterests.map((item) => `<tr><td>${escapeHTML(item.student)}</td><td>${escapeHTML(item.opportunity)}</td><td>${dateLabel(item.date)}</td></tr>`).join("");
  return `${heading("Careers & opportunities", "Manage remote roles, internships, freelance opportunities and career resources.", `<button class="button button-primary" data-action="add-job"><span class="button-icon">＋</span> Add opportunity</button>`)}
    <div class="inline-note"><span>ⓘ</span><div><strong>Publish genuine opportunities only.</strong> Verify each vacancy and clearly distinguish confirmed opportunities from external listings. Published opportunities and career resources appear on the public website and learner dashboard.</div></div>
    ${tableShell(toolbar, ["Opportunity", "Organization", "Type", "Location", "Verification", "Status", "Added", "Actions"], rows, "No career opportunities added yet.")}
    <section class="panel data-panel"><div class="panel-header"><div><h2>Career resources</h2><p>CV templates, interview prep and application guides</p></div><button class="button button-soft button-small" data-action="add-resource">＋ Add resource</button></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Resource</th><th>Category</th><th>Link</th><th>Status</th><th>Actions</th></tr></thead><tbody>${resourceRows || `<tr><td class="table-empty" colspan="5">No career resources added.</td></tr>`}</tbody></table></div></section>
    <section class="panel data-panel"><div class="panel-header"><div><h2>Student interest</h2><p>Sample interest in listed opportunities—not submitted job applications</p></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Student</th><th>Opportunity</th><th>Interest recorded</th></tr></thead><tbody>${interests || `<tr><td class="table-empty" colspan="3">No student interest recorded.</td></tr>`}</tbody></table></div></section>`;
}

function renderContent() {
  const faqRows = state.faqs.map((faq) => `<article class="faq-content-item"><strong>${escapeHTML(faq.question)}</strong><p>${escapeHTML(faq.answer)}</p><div class="table-actions"><button class="text-button" data-action="edit-faq" data-id="${faq.id}">Edit</button><button class="text-button" data-action="toggle-faq" data-id="${faq.id}">${faq.status === "Published" ? "Unpublish" : "Publish"}</button><button class="text-button danger" data-action="delete-faq" data-id="${faq.id}">Delete</button>${statusBadge(faq.status)}</div></article>`).join("");
  const recentAnnouncements = state.announcements.slice(0, 5).map((item) => `<div class="activity-item"><span class="stat-icon">✉</span><div class="activity-copy"><strong>${escapeHTML(item.title)}</strong><small>${dateLabel(item.date)} · ${escapeHTML(item.status)}</small><p>${escapeHTML(item.body)}</p></div></div>`).join("");
  const testimonials = state.testimonials.map((item) => `<article class="faq-content-item"><strong>${escapeHTML(item.name)} · ${escapeHTML(item.role)}</strong><p>“${escapeHTML(item.quote)}”</p><div class="table-actions"><button class="text-button" data-action="edit-testimonial" data-id="${item.id}">Edit</button><button class="text-button" data-action="toggle-testimonial" data-id="${item.id}">${item.status === "Published" ? "Unpublish" : "Publish"}</button><button class="text-button danger" data-action="delete-testimonial" data-id="${item.id}">Delete</button>${statusBadge(item.status)}</div></article>`).join("");
  return `${heading("Website & content", "Update website FAQs and draft platform announcements.", `<button class="button button-primary" data-action="add-faq"><span class="button-icon">＋</span> Add FAQ</button>`)}
    <div class="inline-note"><span>ⓘ</span><div>Published FAQs and announcements sync to Supabase and appear on the public website after it is refreshed.</div></div>
    <div class="content-grid">    <section class="panel"><div class="panel-header"><div><h2>Homepage content</h2><p>Hero, banner and contact information</p></div><button class="button button-soft button-small" data-action="edit-homepage">Edit content</button></div><div class="panel-body"><div class="detail-block"><h3>Hero headline</h3><p>${escapeHTML(state.siteContent.headline)}</p></div><div class="detail-block"><h3>Announcement banner</h3><p>${escapeHTML(state.siteContent.announcement || "No announcement banner.")}</p></div><div class="detail-block"><h3>Promotional banner image</h3><p>${escapeHTML(state.siteContent.bannerUrl || "No promotional banner image.")}</p></div><div class="detail-block"><h3>Contact email</h3><p>${escapeHTML(state.siteContent.contactEmail)}</p></div><div class="detail-block"><h3>Privacy policy & terms</h3><p>${state.siteContent.privacyPolicy || state.siteContent.terms ? "Policy content saved to Supabase." : "No legal page content saved."}</p><div class="table-actions"><button class="text-button" data-action="edit-legal">Edit legal pages</button></div></div></div></section>
    <section class="panel"><div class="panel-header"><div><h2>Frequently asked questions</h2><p>${state.faqs.length} content items</p></div><button class="button button-soft button-small" data-action="add-faq">＋ Add FAQ</button></div><div class="panel-body">${faqRows || `<div class="empty-state">No FAQs have been added.</div>`}</div></section>
    <section class="panel"><div class="panel-header"><div><h2>Testimonials</h2><p>Manage learner stories and publishing status</p></div><button class="button button-soft button-small" data-action="add-testimonial">＋ Add testimonial</button></div><div class="panel-body">${testimonials || `<div class="empty-state">No testimonials have been added.</div>`}</div></section>
    <section class="panel"><div class="panel-header"><div><h2>Announcements</h2><p>Published notices on the website; no email is sent</p></div><button class="button button-soft button-small" data-action="announcement">＋ Publish</button></div><div class="panel-body"><div class="activity-list">${recentAnnouncements || `<div class="empty-state">No announcements published.</div>`}</div></div></section></div>`;
}

function renderSettings() {
  const audit = state.audit.slice(0, 8).map((item) => `<div class="activity-item"><span class="stat-icon violet">◷</span><div class="activity-copy"><strong>${escapeHTML(item.action)}</strong><small>${escapeHTML(item.by)} · ${dateLabel(item.date)}</small></div></div>`).join("");
  return `${heading("Settings & security", "")}
    <div class="settings-grid">
      <section class="settings-card"><h2>Connected services</h2><p>Platform profiles and workspace data are stored in Supabase. No payment or email services are connected.</p>
        <div class="setting-row"><div><strong>Course enrollment</strong><small>Enrollment requests and approvals sync to Supabase</small></div>${statusBadge("Supabase")}</div>
        <div class="setting-row"><div><strong>Online payments</strong><small>No payment provider is connected</small></div>${statusBadge("Not connected")}</div>
        <div class="setting-row"><div><strong>Email notifications</strong><small>No email provider is connected</small></div>${statusBadge("Not connected")}</div>
      </section>
      <section class="settings-card"><h2>Recent activity</h2><p>Administrative changes synced to Supabase.</p><div class="activity-list">${audit || `<div class="empty-state">No activity recorded yet.</div>`}</div></section>
    </div>`;
}
function render() {
  document.querySelector("#current-page").textContent = pageNames[activeView];
  navButtons.forEach((button) => {
    const active = button.dataset.view === activeView;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  activeFilters.search = activeFilters.search || "";
  mainContent.innerHTML = ({
    dashboard: renderDashboard,
    courses: renderCourses,
    students: renderStudents,
    finance: renderFinance,
    referrals: renderReferrals,
    mentorship: renderMentorship,
    settings: renderSettings
  })[activeView]();
}

function navigate(view) {
  if (!pageNames[view]) return;
  activeView = view;
  activeFilters = { search: "", status: "All" };
  sidebar.classList.remove("open");
  document.querySelector(".mobile-menu").setAttribute("aria-expanded", "false");
  render();
  mainContent.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openModal(title, content) {
  modalPreviousFocus = document.activeElement;
  modalTitle.textContent = title;
  modalBody.innerHTML = content;
  modalLayer.hidden = false;
  document.body.style.overflow = "hidden";
  window.setTimeout(() => modalBody.querySelector("input, select, textarea, button")?.focus(), 0);
}

function closeModal() {
  modalLayer.hidden = true;
  document.body.style.overflow = "";
  modalBody.replaceChildren();
  modalPreviousFocus?.focus?.();
}

function field(label, name, value = "", options = {}) {
  const { type = "text", full = false, required = false, placeholder = "", help = "", choices = [], rows = 4, min, max, step } = options;
  if (type === "checkbox") {
    return `<div class="form-field${full ? " full" : ""} checkbox-field"><label for="field-${name}"><input id="field-${name}" name="${name}" type="checkbox" value="true"${value ? " checked" : ""}><span>${label}</span></label>${help ? `<span class="help-text">${help}</span>` : ""}</div>`;
  }
  const labelMarkup = `<label for="field-${name}">${label}${required ? " *" : ""}</label>`;
  let input;
  if (type === "select") {
    input = `<select id="field-${name}" name="${name}"${required ? " required" : ""}>${choices.map((choice) => `<option value="${escapeHTML(choice)}"${String(value) === String(choice) ? " selected" : ""}>${escapeHTML(choice)}</option>`).join("")}</select>`;
  } else if (type === "textarea") {
    input = `<textarea id="field-${name}" name="${name}" rows="${rows}" placeholder="${escapeHTML(placeholder)}"${required ? " required" : ""}>${escapeHTML(value)}</textarea>`;
  } else {
    input = `<input id="field-${name}" name="${name}" type="${type}" value="${escapeHTML(value)}" placeholder="${escapeHTML(placeholder)}"${required ? " required" : ""}${min !== undefined ? ` min="${min}"` : ""}${max !== undefined ? ` max="${max}"` : ""}${step !== undefined ? ` step="${step}"` : ""}>`;
  }
  return `<div class="form-field${full ? " full" : ""}">${labelMarkup}${input}${help ? `<span class="help-text">${help}</span>` : ""}</div>`;
}

function formModal(title, kind, id, fields, submitText = "Save changes") {
  openModal(title, `<form data-form="${kind}" data-id="${escapeHTML(id || "")}"><div class="form-grid">${fields}</div><div class="form-actions"><button type="button" class="button button-soft" data-close-modal>Cancel</button><button type="submit" class="button button-primary">${submitText}</button></div></form>`);
}

function courseForm(course = {}) {
  return [
    field("Course title", "title", course.title || "", { required: true }),
    field("Category", "category", course.category || state.categories[0] || "", { required: true, placeholder: "Create or select a category" }),
    field("Price (NGN)", "price", course.price ?? 5000, { type: "number", min: 0, required: true }),
    field("Instructor", "instructor", course.instructor || "", { required: true }),
    field("Status", "status", course.status || "Draft", { type: "select", choices: ["Draft", "Published"] }),
    field("Show this course on the landing page", "featured", Boolean(course.featured), { type: "checkbox", full: true, help: "Featured courses appear on the public homepage. All published courses remain in Explore courses." }),
    field("Thumbnail image", "thumbnailFile", "", { type: "file", full: true, help: "Optional image upload, stored as a small data URL in this browser. Maximum 1 MB." }),
    field("Thumbnail URL", "thumbnail", course.thumbnail || "", { type: "url", full: true, placeholder: "https://…" }),
    field("Banner image URL", "banner", course.banner || "", { type: "url", full: true, placeholder: "https://…" }),
    field("Course description", "description", course.description || "", { type: "textarea", full: true, required: true, rows: 3 }),
    field("Introduction", "introduction", course.introduction || "", { type: "textarea", full: true, rows: 3 }),
    field("Learning objectives", "objectives", course.objectives || "", { type: "textarea", full: true, rows: 4, placeholder: "One objective per line" }),
    field("Modules and lessons", "modules", course.modules || "", { type: "textarea", full: true, rows: 4, placeholder: "One module or lesson per line" }),
    field("Assignments", "assignments", course.assignments || "", { type: "textarea", full: true, rows: 2, placeholder: "One assignment per line" }),
    field("Quizzes", "quizzes", course.quizzes || "", { type: "textarea", full: true, rows: 2, placeholder: "One quiz per line" }),
    field("Completion requirements", "requirements", course.requirements || "", { type: "textarea", full: true, rows: 2 }),
    field("Learning materials / video links", "materials", course.materials || "", { type: "textarea", full: true, rows: 3, placeholder: "Add resource URLs, one per line", help: "This prototype stores links only. It does not host video or PDF files." })
  ].join("");
}

function studentDetails(student) {
  const purchased = state.payments.filter((payment) => payment.studentId === student.id);
  const courses = student.courses.map((id) => {
    const course = courseById(id);
    return course ? `<div class="insight-row"><span>${escapeHTML(course.title)}</span><strong>${student.progress}%</strong></div>` : "";
  }).join("");
  const payments = purchased.map((payment) => `<div class="insight-row"><span>${escapeHTML(payment.id)} · ${dateLabel(payment.date)}</span><strong>${money(payment.amount)} · ${escapeHTML(payment.status)}</strong></div>`).join("");
  openModal("Student profile", `<div class="detail-grid"><div class="detail-cell"><span>Name</span><strong>${escapeHTML(student.name)}</strong></div><div class="detail-cell"><span>Email</span><strong>${escapeHTML(student.email)}</strong></div><div class="detail-cell"><span>Profile</span><strong>${escapeHTML(student.status)}</strong></div><div class="detail-cell"><span>Joined</span><strong>${dateLabel(student.joined)}</strong></div><div class="detail-cell"><span>Enrolled courses</span><strong>${student.courses.length}</strong></div><div class="detail-cell"><span>Learning progress</span><strong>${student.progress}% average</strong></div></div><div class="detail-block"><h3>Courses & progress</h3>${courses || `<p>No course enrollments recorded.</p>`}</div><div class="detail-block"><h3>Enrollment records</h3>${payments || `<p>No approved enrollments recorded.</p>`}</div><div class="form-actions"><button class="button button-soft" data-close-modal>Close</button></div>`);
}

function courseDetails(course) {
  const objectives = (course.objectives || "").split("\n").filter(Boolean).map((item) => `<div class="insight-row"><span>${escapeHTML(item)}</span><strong>Objective</strong></div>`).join("");
  const lessons = (course.modules || "").split("\n").filter(Boolean).map((item) => `<div class="insight-row"><span>${escapeHTML(item)}</span><strong>Lesson</strong></div>`).join("");
  openModal("Course overview", `<div class="detail-grid"><div class="detail-cell"><span>Category</span><strong>${escapeHTML(course.category)}</strong></div><div class="detail-cell"><span>Price</span><strong>${money(course.price)}</strong></div><div class="detail-cell"><span>Instructor</span><strong>${escapeHTML(course.instructor)}</strong></div><div class="detail-cell"><span>Publishing status</span><strong>${escapeHTML(course.status)}</strong></div><div class="detail-cell"><span>Enrolled students</span><strong>${course.enrolled}</strong></div><div class="detail-cell"><span>Average progress</span><strong>${course.completion}%</strong></div></div><div class="detail-block"><h3>Introduction</h3><p>${escapeHTML(course.introduction || course.description)}</p></div><div class="detail-block"><h3>Description</h3><p>${escapeHTML(course.description)}</p></div><div class="detail-block"><h3>Learning objectives</h3>${objectives || `<p>No learning objectives added.</p>`}</div><div class="detail-block"><h3>Modules & lessons</h3>${lessons || `<p>No modules added.</p>`}</div><div class="detail-block"><h3>Assignments</h3><p>${escapeHTML(course.assignments || "No assignments added.")}</p></div><div class="detail-block"><h3>Quizzes</h3><p>${escapeHTML(course.quizzes || "No quizzes added.")}</p></div><div class="detail-block"><h3>Completion requirements</h3><p>${escapeHTML(course.requirements || "No completion requirements set.")}</p></div><div class="detail-block"><h3>Materials and links</h3><p>${escapeHTML(course.materials || "No resource links added.")}</p></div>`);
}

function addAudit(action) {
  state.audit.unshift({ id: `LOG-${Date.now()}`, action, by: "Site Admin", date: day(0) });
  state.audit = state.audit.slice(0, 50);
  state.activity.unshift({ id: `ACT-${Date.now()}`, message: action, by: "Site Admin", date: day(0) });
  state.activity = state.activity.slice(0, 30);
}

function exportCsv(filename, headers, rows) {
  const quote = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const contents = [headers, ...rows].map((row) => row.map(quote).join(",")).join("\r\n");
  const blob = new Blob(["\ufeff", contents], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  notify(`${filename} downloaded.`);
}

function confirmAction(message) {
  return window.confirm(message);
}

async function handleAction(action, id) {
  const course = state.courses.find((item) => item.id === id);
  const student = state.students.find((item) => item.id === id);
  const payment = state.payments.find((item) => item.id === id);
  const enrollmentRequest = state.enrollmentRequests.find((item) => item.id === id);
  const withdrawal = state.withdrawals.find((item) => item.id === id);
  const session = state.sessions.find((item) => item.id === id);
  const job = state.jobs.find((item) => item.id === id);
  const faq = state.faqs.find((item) => item.id === id);
  const referral = state.referrals.find((item) => item.id === id);

  switch (action) {
    case "refresh-dashboard": refreshDashboard(); break;
    case "add-course": formModal("Create a course", "course", "", courseForm(), "Create course"); break;
    case "add-category": formModal("Add course category", "category", "", field("Category name", "name", "", { required: true, full: true }), "Add category"); break;
    case "edit-course": if (course) formModal("Edit course", "course", id, courseForm(course)); break;
    case "course-details": if (course) courseDetails(course); break;
    case "toggle-course":
      if (course) commit(() => { course.status = course.status === "Published" ? "Draft" : "Published"; addAudit(`${course.title} ${course.status === "Published" ? "published" : "unpublished"}`); }, `Course ${course.status === "Published" ? "published" : "unpublished"}.`);
      break;
    case "archive-course":
      if (course?.status === "Archived" && state.payments.some((item) => item.courseId === id)) {
        notify("This course has enrollment records and cannot be deleted. Keep it archived to preserve learner data.", "error");
      } else if (course && confirmAction(course.status === "Archived" ? "Permanently delete this archived course? This cannot be undone." : "Archive this course? Existing learner enrollments will be preserved.")) {
        if (course.status === "Archived") commit(() => { state.courses = state.courses.filter((item) => item.id !== id); addAudit(`Course removed: ${course.title}`); }, "Course removed from this browser.");
        else commit(() => { course.status = "Archived"; addAudit(`Course archived: ${course.title}`); }, "Course archived.");
      }
      break;
    case "student-details": if (student) studentDetails(student); break;
    case "refund-payment":
      if (payment && confirmAction(`Mark this enrollment as refunded? This revokes course access but does not process a payment refund.`)) {
        const saved = commit(() => {
          payment.status = "Refunded";
          addAudit(`Enrollment marked refunded: ${payment.id}`);
        }, "Enrollment status updated. No payment refund was processed.");
        if (saved) {
          try { await updateLearnerEnrollment(payment.userId, payment.courseId, "Refunded", payment); }
          catch (error) { notify(`Enrollment updated, but learner access could not be synced: ${error.message}`, "error"); }
        }
      }
      break;
    case "approve-enrollment-request":
      if (enrollmentRequest?.status === "Pending" && confirmAction(`Confirm that you independently verified payment for ${enrollmentRequest.student}'s ${enrollmentRequest.course} request? This grants course access but does not process a payment.`)) {
        const course = state.courses.find((item) => item.id === enrollmentRequest.course_id);
        const paymentRecord = {
          id: `MANUAL-${enrollmentRequest.course_id}-${Date.now()}`,
          userId: enrollmentRequest.user_id || "local-learner",
          studentId: enrollmentRequest.user_id || "local-learner",
          courseId: enrollmentRequest.course_id,
          amount: Number(course?.price) || 0,
          fee: 0,
          status: "Successful",
          date: day(0),
          method: "Manual verification"
        };
        const saved = commit(() => {
          enrollmentRequest.status = "Approved";
          enrollmentRequest.reviewed_at = new Date().toISOString();
          const existingPayment = state.payments.find((item) => item.userId === paymentRecord.userId && item.courseId === paymentRecord.courseId);
          if (existingPayment) Object.assign(existingPayment, paymentRecord);
          else state.payments.unshift(paymentRecord);
          const learner = state.students.find((item) => item.id === paymentRecord.studentId);
          if (learner && !learner.courses.includes(enrollmentRequest.course_id)) learner.courses.push(enrollmentRequest.course_id);
          addAudit(`Enrollment approved after manual payment verification: ${enrollmentRequest.student} · ${enrollmentRequest.course}`);
        }, "Enrollment approved and course access granted. No payment was processed.");
        if (saved) {
          try { await updateLearnerEnrollment(paymentRecord.userId, paymentRecord.courseId, "Approved", paymentRecord); }
          catch (error) { notify(`Enrollment approved, but learner access could not be synced: ${error.message}`, "error"); }
        }
      }
      break;
    case "reject-enrollment-request":
      if (enrollmentRequest?.status === "Pending" && confirmAction(`Reject ${enrollmentRequest.student}'s request for ${enrollmentRequest.course}?`)) {
        const saved = commit(() => {
          enrollmentRequest.status = "Rejected";
          enrollmentRequest.reviewed_at = new Date().toISOString();
          addAudit(`Enrollment request rejected: ${enrollmentRequest.student} · ${enrollmentRequest.course}`);
        }, "Enrollment request rejected. The learner can submit a new request.");
        if (saved) {
          try { await updateLearnerEnrollment(enrollmentRequest.user_id || enrollmentRequest.studentId, enrollmentRequest.course_id, "Rejected"); }
          catch (error) { notify(`Request rejected, but learner data could not be synced: ${error.message}`, "error"); }
        }
      }
      break;
    case "export-payments":
      exportCsv("skill-up-demo-financial-report.csv", ["Transaction ID", "Student", "Course", "Amount NGN", "Gateway fee NGN", "Method", "Date", "Status"], state.payments.map((item) => [item.id, studentName(item.studentId), courseName(item.courseId), item.amount, item.fee, item.method, item.date, item.status]));
      break;
    case "export-students":
      exportCsv("skill-up-demo-students.csv", ["Student ID", "Name", "Email", "Joined", "Status", "Courses", "Progress"], state.students.map((item) => [item.id, item.name, item.email, item.joined, item.status, item.courses.map(courseName).join("; "), `${item.progress}%`]));
      break;
    case "export-report":
      exportCsv("skill-up-demo-dashboard.csv", ["Metric", "Value"], [["Registered students", state.students.length], ["Active students", state.students.filter((item) => item.status === "Active").length], ["Published courses", state.courses.filter((item) => item.status === "Published").length], ["Successful payments", state.payments.filter((item) => item.status === "Successful").length], ["Demo gross revenue NGN", state.payments.filter((item) => item.status === "Successful").reduce((sum, item) => sum + item.amount, 0)], ["Pending demo withdrawals", state.withdrawals.filter((item) => item.status === "Pending").length]]);
      break;
    case "approve-withdrawal":
    case "reject-withdrawal":
      if (withdrawal && confirmAction(`${action === "approve-withdrawal" ? "Approve" : "Reject"} ${withdrawal.id}? No payout will be made.`)) commit(() => { withdrawal.status = action === "approve-withdrawal" ? "Approved" : "Rejected"; addAudit(`Demo withdrawal ${withdrawal.status.toLowerCase()}: ${withdrawal.id}`); }, `Withdrawal marked ${withdrawal.status.toLowerCase()} in Supabase.`);
      break;
    case "referral-details":
      if (referral) openModal("Referral partner", `<div class="detail-grid"><div class="detail-cell"><span>Partner</span><strong>${escapeHTML(referral.name)}</strong></div><div class="detail-cell"><span>Email</span><strong>${escapeHTML(referral.email)}</strong></div><div class="detail-cell"><span>Referral code</span><strong>${escapeHTML(referral.code)}</strong></div><div class="detail-cell"><span>Conversions</span><strong>${referral.conversions}</strong></div><div class="detail-cell"><span>Referral visits</span><strong>${referral.referrals}</strong></div><div class="detail-cell"><span>Commission</span><strong>${money(referral.commission)}</strong></div></div><div class="detail-block"><h3>Campaigns & activity</h3><p>Campaign attribution and referral activity are not connected.</p></div>`);
      break;
    case "adjust-commission":
      if (referral) formModal("Adjust demo commission", "commission", id, field("Adjustment amount (NGN)", "amount", 0, { type: "number", required: true }) + field("Reason", "reason", "", { full: true, required: true, placeholder: "Explain the adjustment" }), "Record adjustment");
      break;
    case "referral-campaign":
      formModal("Create referral campaign", "campaign", "", field("Campaign name", "name", "", { required: true }) + field("Commission rate (%)", "rate", state.settings.referralRate, { type: "number", min: 0, max: 100, required: true }) + field("Campaign notes", "notes", "", { type: "textarea", full: true }), "Save campaign");
      break;
    case "toggle-campaign": {
      const campaign = state.campaigns.find((item) => item.id === id);
      if (campaign) commit(() => { campaign.status = campaign.status === "Active" ? "Paused" : "Active"; addAudit(`Referral campaign ${campaign.status.toLowerCase()}: ${campaign.name}`); }, `Campaign ${campaign.status.toLowerCase()}.`);
      break;
    }
    case "delete-campaign": {
      const campaign = state.campaigns.find((item) => item.id === id);
      if (campaign && confirmAction(`Delete referral campaign "${campaign.name}"?`)) commit(() => { state.campaigns = state.campaigns.filter((item) => item.id !== id); addAudit(`Referral campaign deleted: ${campaign.name}`); }, "Campaign deleted.");
      break;
    }
    case "add-session": formModal("Schedule mentorship session", "session", "", sessionForm(), "Schedule session"); break;
    case "add-review": formModal("Add student question or assignment", "review", "", reviewForm(), "Add to review queue"); break;
    case "review-submission": {
      const review = state.reviews.find((item) => item.id === id);
      if (review) {
        const isQuestion = review.type === "Question";
        openModal(isQuestion ? "Respond to student question" : "Review assignment", `<div class="detail-grid"><div class="detail-cell"><span>Student</span><strong>${escapeHTML(review.student)}</strong></div><div class="detail-cell"><span>Course</span><strong>${escapeHTML(review.course)}</strong></div><div class="detail-cell"><span>Type</span><strong>${escapeHTML(review.type)}</strong></div><div class="detail-cell"><span>Submitted</span><strong>${dateLabel(review.submitted)}</strong></div></div><div class="detail-block"><h3>${escapeHTML(review.title)}</h3><p>${escapeHTML(review.feedback || "Sample submission. Attachments are not connected in this prototype.")}</p></div><form data-form="review-feedback" data-id="${review.id}">${field("Mentor feedback / response", "feedback", review.feedback || "", { type: "textarea", full: true, required: true, rows: 5 })}<div class="form-actions"><button type="button" class="button button-soft" data-close-modal>Close</button><button type="submit" class="button button-primary">Save feedback</button></div></form>`);
      }
      break;
    }
    case "complete-session":
      if (session) {
        try {
          if (session.source === "learner") await updateLearnerSession(session);
          commit(() => { session.status = "Completed"; addAudit(`Mentorship session completed: ${session.title}`); }, "Session marked completed.");
        } catch (error) { notify(`Could not update the session: ${error.message}`, "error"); }
      }
      break;
    case "delete-session":
      if (session && confirmAction(`Remove the session "${session.title}"?`)) {
        try {
          if (session.source === "learner") await updateLearnerSession(session, true);
          commit(() => { state.sessions = state.sessions.filter((item) => item.id !== id); addAudit(`Session removed: ${session.title}`); }, "Session removed.");
        } catch (error) { notify(`Could not remove the session: ${error.message}`, "error"); }
      }
      break;
    case "add-job": formModal("Add career opportunity", "job", "", jobForm(), "Save opportunity"); break;
    case "edit-job": if (job) formModal("Edit career opportunity", "job", id, jobForm(job)); break;
    case "toggle-job":
      if (job) commit(() => { job.status = job.status === "Published" ? "Draft" : "Published"; addAudit(`Opportunity ${job.status.toLowerCase()}: ${job.title}`); }, `Opportunity ${job.status.toLowerCase()}.`);
      break;
    case "delete-job":
      if (job && confirmAction(`Delete "${job.title}"?`)) commit(() => { state.jobs = state.jobs.filter((item) => item.id !== id); addAudit(`Opportunity deleted: ${job.title}`); }, "Opportunity deleted.");
      break;
    case "add-resource": formModal("Add career resource", "resource", "", resourceForm(), "Save resource"); break;
    case "edit-resource": {
      const resource = state.resources.find((item) => item.id === id);
      if (resource) formModal("Edit career resource", "resource", id, resourceForm(resource));
      break;
    }
    case "toggle-resource": {
      const resource = state.resources.find((item) => item.id === id);
      if (resource) commit(() => { resource.status = resource.status === "Published" ? "Draft" : "Published"; addAudit(`Career resource ${resource.status.toLowerCase()}: ${resource.title}`); }, `Resource ${resource.status.toLowerCase()}.`);
      break;
    }
    case "delete-resource": {
      const resource = state.resources.find((item) => item.id === id);
      if (resource && confirmAction(`Delete the resource "${resource.title}"?`)) commit(() => { state.resources = state.resources.filter((item) => item.id !== id); addAudit(`Career resource deleted: ${resource.title}`); }, "Career resource deleted.");
      break;
    }
    case "add-faq": formModal("Add FAQ", "faq", "", faqForm(), "Add FAQ"); break;
    case "edit-faq": if (faq) formModal("Edit FAQ", "faq", id, faqForm(faq)); break;
    case "toggle-faq":
      if (faq) commit(() => { faq.status = faq.status === "Published" ? "Draft" : "Published"; addAudit(`FAQ ${faq.status.toLowerCase()}: ${faq.question}`); }, `FAQ ${faq.status.toLowerCase()}.`);
      break;
    case "delete-faq":
      if (faq && confirmAction("Delete this FAQ from local content records?")) commit(() => { state.faqs = state.faqs.filter((item) => item.id !== id); addAudit(`FAQ deleted: ${faq.question}`); }, "FAQ deleted.");
      break;
    case "edit-homepage":
      formModal("Edit homepage content", "homepage", "", field("Hero headline", "headline", state.siteContent.headline, { full: true, required: true }) + field("Announcement banner", "announcement", state.siteContent.announcement, { full: true, placeholder: "Leave blank to hide the banner" }) + field("Banner image URL", "bannerUrl", state.siteContent.bannerUrl || "", { type: "url", full: true, placeholder: "https://…" }) + field("Contact email", "contactEmail", state.siteContent.contactEmail, { type: "email", required: true }), "Save homepage content");
      break;
    case "edit-legal":
      formModal("Edit privacy policy & terms", "legal", "", field("Privacy policy", "privacyPolicy", state.siteContent.privacyPolicy, { type: "textarea", full: true, rows: 6 }) + field("Terms and conditions", "terms", state.siteContent.terms, { type: "textarea", full: true, rows: 6 }), "Save legal content");
      break;
    case "add-testimonial": formModal("Add testimonial", "testimonial", "", testimonialForm(), "Save testimonial"); break;
    case "edit-testimonial": {
      const testimonial = state.testimonials.find((item) => item.id === id);
      if (testimonial) formModal("Edit testimonial", "testimonial", id, testimonialForm(testimonial));
      break;
    }
    case "toggle-testimonial": {
      const testimonial = state.testimonials.find((item) => item.id === id);
      if (testimonial) commit(() => { testimonial.status = testimonial.status === "Published" ? "Draft" : "Published"; addAudit(`Testimonial ${testimonial.status.toLowerCase()}: ${testimonial.name}`); }, `Testimonial ${testimonial.status.toLowerCase()}.`);
      break;
    }
    case "delete-testimonial": {
      const testimonial = state.testimonials.find((item) => item.id === id);
      if (testimonial && confirmAction(`Delete testimonial from ${testimonial.name}?`)) commit(() => { state.testimonials = state.testimonials.filter((item) => item.id !== id); addAudit(`Testimonial deleted: ${testimonial.name}`); }, "Testimonial deleted.");
      break;
    }
    case "announcement": formModal("Draft announcement", "announcement", "", field("Announcement title", "title", "", { required: true }) + field("Message", "message", "", { type: "textarea", full: true, required: true, rows: 5 }) + `<div class="inline-note full">Draft only. Email sending is not configured.</div>`, "Save draft"); break;
    default: break;
  }
}

function sessionForm(session = {}) {
  const mentors = [...new Set([...state.courses.map((course) => course.instructor).filter(Boolean), session.mentor].filter(Boolean))];
  const students = ["Group session", ...state.students.map((student) => student.name)];
  return [
    field("Session title", "title", session.title || "", { required: true, full: true }),
    field("Mentor", "mentor", session.mentor || mentors[0], { type: "select", choices: mentors }),
    field("Student / group", "student", session.student || students[0], { type: "select", choices: students }),
    field("Session type", "type", session.type || "1:1 mentorship", { type: "select", choices: ["1:1 mentorship", "Live training", "Assignment review", "Group Q&A"] }),
    field("Date", "date", session.date || day(1), { type: "date", required: true }),
    field("Time", "time", session.time || "14:00", { type: "time", required: true }),
    field("Meeting link", "link", session.link || "", { type: "url", full: true, placeholder: "https://…" })
  ].join("");
}

function jobForm(job = {}) {
  return [
    field("Opportunity title", "title", job.title || "", { required: true }),
    field("Organization", "company", job.company || "", { required: true }),
    field("Opportunity type", "type", job.type || "Remote role", { type: "select", choices: ["Remote role", "Freelance", "Internship", "External listing"] }),
    field("Location / work mode", "location", job.location || "Remote", { required: true }),
    field("Application link", "link", job.link || "", { type: "url", full: true, required: true }),
    field("Verification", "verified", job.verified === false ? "External listing" : "Verified", { type: "select", choices: ["Verified", "External listing"], full: true }),
    field("Status", "status", job.status || "Draft", { type: "select", choices: ["Draft", "Published"] })
  ].join("");
}

function faqForm(faq = {}) {
  return field("Question", "question", faq.question || "", { required: true, full: true })
    + field("Answer", "answer", faq.answer || "", { type: "textarea", full: true, required: true, rows: 5 })
    + field("Status", "status", faq.status || "Draft", { type: "select", choices: ["Draft", "Published"], full: true });
}

function resourceForm(resource = {}) {
  return field("Resource title", "title", resource.title || "", { full: true, required: true })
    + field("Category", "category", resource.category || "CV template", { type: "select", choices: ["CV template", "Interview preparation", "Application guide", "Career resource"] })
    + field("Status", "status", resource.status || "Draft", { type: "select", choices: ["Draft", "Published"] })
    + field("Resource link", "link", resource.link || "", { type: "url", full: true, required: true, placeholder: "https://…" });
}

function testimonialForm(testimonial = {}) {
  return field("Learner name", "name", testimonial.name || "", { required: true })
    + field("Learner role", "role", testimonial.role || "", { required: true })
    + field("Testimonial", "quote", testimonial.quote || "", { type: "textarea", full: true, rows: 4, required: true })
    + field("Status", "status", testimonial.status || "Draft", { type: "select", choices: ["Draft", "Published"], full: true });
}

function reviewForm() {
  return field("Submission type", "type", "Assignment", { type: "select", choices: ["Assignment", "Question"] })
    + field("Student", "student", state.students[0]?.name || "", { type: "select", choices: state.students.map((student) => student.name), required: true })
    + field("Course", "course", state.courses[0]?.title || "", { type: "select", choices: state.courses.map((course) => course.title), required: true })
    + field("Title / question", "title", "", { full: true, required: true })
    + field("Submission details", "feedback", "", { type: "textarea", full: true, rows: 4, placeholder: "Optional context. File uploads are not connected." });
}

async function handleFormSubmit(form) {
  const values = Object.fromEntries(new FormData(form).entries());
  const kind = form.dataset.form;
  const id = form.dataset.id;
  const existing = (list) => list.find((item) => item.id === id);

  if (kind === "course") {
    const current = existing(state.courses);
    const file = form.querySelector('[name="thumbnailFile"]').files[0];
    if (file && (!file.type.startsWith("image/") || file.size > 1024 * 1024)) {
      notify("Choose an image file under 1 MB to fit local browser storage.", "error");
      return;
    }
    const save = (uploadedImage = "") => {
      const courseData = {
        title: values.title.trim(), category: values.category, price: Number(values.price),
        instructor: values.instructor.trim(), status: values.status, featured: values.featured === "true", thumbnail: uploadedImage || values.thumbnail.trim(),
        banner: values.banner.trim(), description: values.description.trim(), introduction: values.introduction.trim(),
        objectives: values.objectives.trim(), modules: values.modules.trim(),
        materials: values.materials.trim(), assignments: values.assignments.trim(), quizzes: values.quizzes.trim(),
        requirements: values.requirements.trim()
      };
      if (!courseData.title || !courseData.instructor || !courseData.description || !Number.isFinite(courseData.price) || courseData.price < 0) {
        notify("Complete the required course fields with a valid price.", "error");
        return;
      }
      const saved = commit(() => {
        if (current) Object.assign(current, courseData);
        else state.courses.unshift({ ...courseData, id: `CRS-${Date.now()}`, enrolled: 0, completion: 0, createdAt: day(0) });
          if (!state.categories.includes(courseData.category)) state.categories.push(courseData.category);
          addAudit(`${current ? "Course updated" : "Course created"}: ${courseData.title}`);
      }, current ? "Course changes saved." : "Course created.");
      if (saved) closeModal();
    };
    if (file) {
      const reader = new FileReader();
      reader.addEventListener("load", () => save(String(reader.result)));
      reader.addEventListener("error", () => notify("Could not read this image file.", "error"));
      reader.readAsDataURL(file);
    } else save();
    return;
  }
  if (kind === "session") {
    const sessionData = { title: values.title.trim(), mentor: values.mentor, student: values.student, type: values.type, date: values.date, time: values.time, link: values.link.trim(), status: "Scheduled" };
    if (!sessionData.title || !sessionData.date || !sessionData.time) { notify("Complete the required session details.", "error"); return; }
    if (commit(() => { state.sessions.unshift({ ...sessionData, id: `MNT-${Date.now()}` }); addAudit(`Mentorship session scheduled: ${sessionData.title}`); }, "Session saved.")) closeModal();
    return;
  }
  if (kind === "job") {
    const current = existing(state.jobs);
    const jobData = { title: values.title.trim(), company: values.company.trim(), type: values.type, location: values.location.trim(), link: values.link.trim(), verified: values.verified === "Verified", status: values.status, date: current?.date || day(0) };
    if (!jobData.title || !jobData.company || !jobData.location || !jobData.link) { notify("Complete the required opportunity fields.", "error"); return; }
    if (jobData.status === "Published" && !jobData.verified && !confirmAction("This is an external listing and is not marked verified. Clearly label it as external when published. Continue?")) return;
    if (commit(() => { if (current) Object.assign(current, jobData); else state.jobs.unshift({ ...jobData, id: `JOB-${Date.now()}` }); addAudit(`${current ? "Opportunity updated" : "Opportunity added"}: ${jobData.title}`); }, "Opportunity saved.")) closeModal();
    return;
  }
  if (kind === "faq") {
    const current = existing(state.faqs);
    const faqData = { question: values.question.trim(), answer: values.answer.trim(), status: values.status };
    if (!faqData.question || !faqData.answer) { notify("Enter both a question and an answer.", "error"); return; }
    if (commit(() => { if (current) Object.assign(current, faqData); else state.faqs.unshift({ ...faqData, id: `FAQ-${Date.now()}` }); addAudit(`${current ? "FAQ updated" : "FAQ added"}: ${faqData.question}`); }, "FAQ saved.")) closeModal();
    return;
  }
  if (kind === "category") {
    const name = values.name.trim();
    if (!name) { notify("Enter a category name.", "error"); return; }
    if (state.categories.some((category) => category.toLowerCase() === name.toLowerCase())) { notify("That category already exists.", "error"); return; }
    if (commit(() => { state.categories.push(name); addAudit(`Course category added: ${name}`); }, "Course category added.")) closeModal();
    return;
  }
  if (kind === "resource") {
    const current = existing(state.resources);
    const resourceData = { title: values.title.trim(), category: values.category, link: values.link.trim(), status: values.status };
    if (!resourceData.title || !resourceData.link) { notify("Complete the resource title and link.", "error"); return; }
    if (commit(() => { if (current) Object.assign(current, resourceData); else state.resources.unshift({ ...resourceData, id: `RES-${Date.now()}` }); addAudit(`Career resource ${current ? "updated" : "added"}: ${resourceData.title}`); }, "Career resource saved.")) closeModal();
    return;
  }
  if (kind === "testimonial") {
    const current = existing(state.testimonials);
    const item = { name: values.name.trim(), role: values.role.trim(), quote: values.quote.trim(), status: values.status };
    if (!item.name || !item.role || !item.quote) { notify("Complete the testimonial fields.", "error"); return; }
    if (commit(() => { if (current) Object.assign(current, item); else state.testimonials.unshift({ ...item, id: `TST-${Date.now()}` }); addAudit(`Testimonial ${current ? "updated" : "added"}: ${item.name}`); }, "Testimonial saved locally.")) closeModal();
    return;
  }
  if (kind === "homepage") {
    const content = { headline: values.headline.trim(), announcement: values.announcement.trim(), bannerUrl: values.bannerUrl.trim(), contactEmail: values.contactEmail.trim(), privacyPolicy: state.siteContent.privacyPolicy, terms: state.siteContent.terms };
    if (!content.headline || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(content.contactEmail)) { notify("Enter a homepage headline and valid contact email.", "error"); return; }
    if (commit(() => { state.siteContent = content; addAudit("Homepage copy updated locally"); }, "Homepage content saved locally.")) closeModal();
    return;
  }
  if (kind === "legal") {
    if (commit(() => { state.siteContent.privacyPolicy = values.privacyPolicy.trim(); state.siteContent.terms = values.terms.trim(); addAudit("Privacy policy and terms updated locally"); }, "Legal page content saved locally.")) closeModal();
    return;
  }
  if (kind === "commission") {
    const referral = existing(state.referrals);
    const amount = Number(values.amount);
    if (!referral || !Number.isFinite(amount) || !values.reason.trim()) { notify("Enter a valid adjustment amount and reason.", "error"); return; }
    if (commit(() => { referral.commission = Math.max(0, referral.commission + amount); addAudit(`Demo commission adjustment for ${referral.name}: ${money(amount)} (${values.reason.trim()})`); }, "Commission adjustment recorded locally.")) closeModal();
    return;
  }
  if (kind === "campaign") {
    const rate = Number(values.rate);
    if (!values.name.trim() || !Number.isFinite(rate) || rate < 0 || rate > 100) { notify("Enter a campaign name and a commission rate from 0 to 100.", "error"); return; }
    if (commit(() => { state.settings.referralRate = rate; state.campaigns.unshift({ id: `CMP-${Date.now()}`, name: values.name.trim(), rate, notes: values.notes.trim(), status: "Active", createdAt: day(0) }); addAudit(`Demo referral campaign created: ${values.name.trim()} (${rate}%)`); }, "Campaign configuration saved locally.")) closeModal();
    return;
  }
  if (kind === "review-feedback") {
    const review = existing(state.reviews);
    if (!review || !values.feedback.trim()) { notify("Add feedback before saving this review.", "error"); return; }
    if (review.source === "learner" && review.userId) {
      let learnerData;
      try {
        learnerData = await supabaseClient.loadWorkspace(`learner:${review.userId}`);
      } catch (error) {
        notify(`Could not load the learner submission: ${error.message}`, "error");
        return;
      }
      if (!learnerData) { notify("The learner workspace for this submission no longer exists.", "error"); return; }
      if (review.type === "Question") {
        const question = (learnerData.questions || []).find((item) => item.id === review.questionId);
        if (!question) { notify("The learner question could not be found.", "error"); return; }
        question.answer = values.feedback.trim();
        question.status = "Answered";
      } else {
        const progress = learnerData.progress?.[review.courseId];
        if (!progress) { notify("The learner assignment could not be found.", "error"); return; }
        progress.feedback = values.feedback.trim();
        progress.feedbackDate = day(0);
      }
      try {
        await supabaseClient.saveWorkspace(`learner:${review.userId}`, learnerData);
      } catch (error) {
        notify(`Could not save feedback to the learner workspace: ${error.message}`, "error");
        return;
      }
    }
    if (commit(() => { review.feedback = values.feedback.trim(); review.status = review.type === "Question" ? "Responded" : "Reviewed"; addAudit(`${review.type} ${review.status.toLowerCase()}: ${review.title}`); }, "Feedback saved.")) closeModal();
    return;
  }
  if (kind === "review") {
    const student = state.students.find((item) => item.name === values.student);
    const course = state.courses.find((item) => item.title === values.course);
    if (!student || !course || !values.title.trim()) { notify("Complete the submission details.", "error"); return; }
    const type = values.type;
    if (commit(() => { state.reviews.unshift({ id: `REV-${Date.now()}`, type, title: values.title.trim(), student: student.name, course: course.title, submitted: day(0), status: type === "Question" ? "Pending response" : "Pending review", feedback: values.feedback.trim() }); addAudit(`${type} added to review queue: ${values.title.trim()}`); }, "Item added to the mentorship review queue.")) closeModal();
    return;
  }
  if (kind === "announcement") {
    if (!values.title.trim() || !values.message.trim()) { notify("Enter an announcement title and message.", "error"); return; }
    if (commit(() => { state.announcements.unshift({ id: `ANN-${Date.now()}`, title: values.title.trim(), body: values.message.trim(), date: day(0), status: "Published" }); addAudit(`Announcement published: ${values.title.trim()}`); }, "Announcement published to the website. No email was sent.")) closeModal();
    return;
  }
  if (kind === "admin") {
    const email = values.email.trim().toLowerCase();
    if (!values.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { notify("Enter a name and a valid email address.", "error"); return; }
    if (state.admins.some((admin) => admin.email.toLowerCase() === email)) { notify("An administrator record with that email already exists.", "error"); return; }
    if (commit(() => { state.admins.push({ id: `ADM-${Date.now()}`, name: values.name.trim(), email, role: values.role, status: "Active" }); addAudit(`Local administrator record added: ${email}`); }, "Administrator record added. No login account was created.")) closeModal();
  }
}

navButtons.forEach((button) => button.addEventListener("click", () => navigate(button.dataset.view)));
document.querySelector("#main-content").addEventListener("click", (event) => {
  const navigation = event.target.closest("[data-view]");
  if (navigation) {
    navigate(navigation.dataset.view);
    return;
  }
  const range = event.target.closest("[data-range]");
  if (range) {
    chartRange = range.dataset.range;
    render();
    return;
  }
  const actionElement = event.target.closest("[data-action]");
  if (actionElement) handleAction(actionElement.dataset.action, actionElement.dataset.id);
});

mainContent.addEventListener("input", (event) => {
  if (event.target.dataset.filter === "search") {
    activeFilters.search = event.target.value;
    const start = event.target.selectionStart;
    const current = event.target.value;
    render();
    const replacement = mainContent.querySelector('[data-filter="search"]');
    replacement?.focus();
    replacement?.setSelectionRange(start, start);
    if (replacement && replacement.value !== current) replacement.value = current;
  }
});

mainContent.addEventListener("change", (event) => {
  if (event.target.dataset.filter === "status") {
    activeFilters.status = event.target.value;
    render();
  }
});

modalLayer.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-modal]")) closeModal();
});

modalLayer.addEventListener("submit", (event) => {
  if (event.target.matches("[data-form]")) {
    event.preventDefault();
    handleFormSubmit(event.target);
  }
});

document.querySelector(".mobile-menu").addEventListener("click", (event) => {
  const isOpen = sidebar.classList.toggle("open");
  event.currentTarget.setAttribute("aria-expanded", String(isOpen));
  event.currentTarget.setAttribute("aria-label", isOpen ? "Close admin navigation" : "Open admin navigation");
});

document.querySelector("#topbar-date").title = new Intl.DateTimeFormat("en-NG", { dateStyle: "full" }).format(today);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modalLayer.hidden) closeModal();
  if (event.key === "Escape") sidebar.classList.remove("open");
});

render();
})();
