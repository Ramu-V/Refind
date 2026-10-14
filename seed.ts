import "dotenv/config";
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  users,
  items,
  matches,
  claims,
  messages,
  notifications,
} from "../src/db/schema";
import { calculateMatch, keywordsOf } from "../src/lib/utils";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
});
const db = drizzle(pool);

const PASSWORD = "refind123";
const day = (n: number) => new Date(Date.now() - n * 86400000);

const PEOPLE = [
  {
    name: "Aarav Sharma",
    email: "aarav@college.edu",
    role: "student" as const,
    department: "Computer Science",
    accent: "#1e3a8a",
    phone: "+91 98200 11223",
    bio: "2nd year CS student. Usually in Library or Science block.",
  },
  {
    name: "Meera Iyer",
    email: "meera@college.edu",
    role: "student" as const,
    department: "Biotechnology",
    accent: "#be185d",
    phone: "+91 98200 44556",
    bio: "Biotech major. Active in student council.",
  },
  {
    name: "Rohan Gupta",
    email: "rohan@college.edu",
    role: "student" as const,
    department: "Mechanical Engg.",
    accent: "#0f9d6e",
    phone: "+91 98200 33445",
    bio: "Final year Mech student. Often in workshop area.",
  },
  {
    name: "Dr. Kavita Rao",
    email: "kavita@college.edu",
    role: "teacher" as const,
    department: "Physics",
    accent: "#7c3aed",
    phone: "+91 98200 77889",
    bio: "Associate Professor, Department of Physics.",
  },
  {
    name: "Imran Qureshi",
    email: "imran@college.edu",
    role: "staff" as const,
    department: "Library Services",
    accent: "#b45309",
    phone: "+91 98200 99001",
    bio: "Head of Circulation & Campus Lost Property Desk.",
  },
  {
    name: "Sneha Patil",
    email: "sneha@college.edu",
    role: "student" as const,
    department: "Architecture",
    accent: "#3161b8",
    phone: "",
    bio: "Architecture 3rd year. Always carrying art tubes.",
  },
  {
    name: "Vikram Nair",
    email: "vikram@college.edu",
    role: "student" as const,
    department: "Commerce",
    accent: "#244b99",
    phone: "+91 98200 88990",
    bio: "2nd year B.Com student.",
  },
  {
    name: "Ananya Bose",
    email: "ananya@college.edu",
    role: "staff" as const,
    department: "Sports Complex",
    accent: "#0f766e",
    phone: "+91 98200 22334",
    bio: "Sports Complex Manager & Campus Athletics.",
  },
];

type ItemSeed = {
  by: number;
  kind: "lost" | "found";
  title: string;
  description: string;
  category: string;
  color?: string;
  brand?: string;
  location: string;
  campusArea?: string;
  ago: number;
  image?: string;
  status?: "open" | "claimed" | "returned" | "closed";
  preferredContact?: string;
};

const PX = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=520&w=800`;

const ITEMS: ItemSeed[] = [
  /* ── Pair 1: Navy water bottle in lab ── */
  {
    by: 0,
    kind: "lost",
    title: "Navy blue steel water bottle",
    description:
      "Navy blue insulated steel bottle, approx 1 litre. Has a small dent near the bottom rim and a faded chemistry club sticker on the side. Had it during morning lab practical.",
    category: "Water bottles",
    color: "Navy",
    brand: "Milton",
    location: "Science & Physics Lab",
    campusArea: "Physics Lab 2nd floor",
    ago: 3,
    image: PX(8611290),
    preferredContact: "chat",
  },
  {
    by: 3,
    kind: "found",
    title: "Dark blue steel bottle found on bench",
    description:
      "Found a dark blue insulated metal bottle on the back bench after the second-year physics lab session. Has a dent at the base and a club sticker. Deposited at the Physics staff room.",
    category: "Water bottles",
    color: "Navy",
    brand: "Milton",
    location: "Science & Physics Lab",
    campusArea: "Physics Lab rear row",
    ago: 2,
    image: PX(8611246),
    preferredContact: "desk",
  },

  /* ── Pair 2: Earbuds in Library ── */
  {
    by: 1,
    kind: "lost",
    title: "White wireless earbuds charging case",
    description:
      "White wireless earbuds in charging case. There is a tiny hairline crack on the top lid hinge. Was studying on the 1st floor reading hall near the journals.",
    category: "Electronics",
    color: "White",
    brand: "boAt",
    location: "Central Library",
    campusArea: "1st floor reading area",
    ago: 4,
    image: PX(3921817),
    status: "claimed",
  },
  {
    by: 4,
    kind: "found",
    title: "White wireless earbuds handed to library desk",
    description:
      "A white earbud charging case was handed in at the circulation counter. Both buds inside, charges normally. Small crack on lid. Collect from library desk with proof.",
    category: "Electronics",
    color: "White",
    brand: "boAt",
    location: "Central Library",
    campusArea: "Main Circulation Desk",
    ago: 3,
    image: PX(3945697),
    status: "claimed",
  },

  /* ── Pair 3: Student ID in Canteen ── */
  {
    by: 6,
    kind: "lost",
    title: "Student ID Card — Vikram Nair",
    description:
      "Lost my college ID card with a blue lanyard between the main canteen and commerce block. Roll number ends in 4172. Need it urgently for semester hall ticket verification.",
    category: "Student ID cards",
    color: "Blue",
    location: "Main Canteen / Cafeteria",
    campusArea: "Outdoor seating table 6",
    ago: 1,
    preferredContact: "chat",
  },
  {
    by: 5,
    kind: "found",
    title: "Student ID card found on canteen table",
    description:
      "Found a student ID card on a corner table in the main canteen around 1:30pm. Has a blue college lanyard. Safe with me — describe the name and course to claim.",
    category: "Student ID cards",
    color: "Blue",
    location: "Main Canteen / Cafeteria",
    campusArea: "Corner booth table",
    ago: 1,
    preferredContact: "chat",
  },

  /* ── Pair 4: Keys near parking ── */
  {
    by: 5,
    kind: "lost",
    title: "Bunch of 3 keys with red tag",
    description:
      "Three brass keys on a ring with a red plastic tag labelled 212. Contains my hostel room key and cupboard key. Lost around parking lot or hostel walkway.",
    category: "Keys",
    color: "Red",
    location: "Hostel Block A",
    campusArea: "Pathway to Parking Area",
    ago: 2,
    image: PX(15440419),
    preferredContact: "chat",
  },
  {
    by: 4,
    kind: "found",
    title: "Keys found near parking gate",
    description:
      "Found three keys on a ring with a coloured tag on the ground close to the two-wheeler parking gate. Deposited at the admin reception.",
    category: "Keys",
    color: "Red",
    location: "Parking Area",
    campusArea: "Gate 2 parking entrance",
    ago: 1,
    image: PX(15440419),
    preferredContact: "desk",
  },

  /* ── Resolved / Returned item ── */
  {
    by: 2,
    kind: "lost",
    title: "Grey laptop backpack",
    description:
      "Grey Wildcraft backpack with padded laptop sleeve, broken front pocket zipper, and small keychain clipped to the top strap. Contained engineering drawing sheets and calculator.",
    category: "Bags and backpacks",
    color: "Grey",
    brand: "Wildcraft",
    location: "Lecture Hall A",
    campusArea: "Row 5 seat 12",
    ago: 12,
    image: PX(10076380),
    status: "returned",
  },

  /* ── Standalone listings ── */
  {
    by: 7,
    kind: "found",
    title: "Black digital sports watch at Gym",
    description:
      "Found a black digital sports watch near the treadmill area in the sports complex. Strap has slight wear. Kept at sports office — claim by describing the display mode.",
    category: "Accessories",
    color: "Black",
    brand: "Casio",
    location: "Sports Complex & Gym",
    campusArea: "Treadmill cardio section",
    ago: 2,
    image: PX(1697570),
    preferredContact: "desk",
  },
  {
    by: 3,
    kind: "found",
    title: "Prescription glasses in brown case",
    description:
      "A pair of prescription reading glasses in a brown hardcase was left behind after the Thursday physics lecture. Thin metallic frame. Available at Physics staff room.",
    category: "Accessories",
    color: "Brown",
    location: "Lecture Hall B",
    campusArea: "Front podium desk",
    ago: 5,
    image: PX(5408854),
  },
  {
    by: 1,
    kind: "lost",
    title: "Geometry instrument box",
    description:
      "Lost my blue metal drawing instrument box containing compasses, dividers and set squares. Initials MI are scratched inside the lid.",
    category: "Other",
    color: "Blue",
    location: "Lecture Hall B",
    campusArea: "Back corner desk",
    ago: 6,
  },
  {
    by: 0,
    kind: "found",
    title: "Compact folding umbrella in Computer Lab",
    description:
      "A black compact folding umbrella was left under desk 18 in computer lab 2 after the heavy rains on Monday. Has a curved wooden handle. Still with the lab assistant.",
    category: "Other",
    color: "Black",
    location: "Computer Lab",
    campusArea: "Lab 2 Desk 18",
    ago: 7,
    image: PX(11585797),
  },
  {
    by: 6,
    kind: "lost",
    title: "Accountancy textbook with revision notes",
    description:
      "Thick financial accountancy textbook with handwritten summary notes tucked in the final chapters. Front cover has a small tape repair.",
    category: "Books and notebooks",
    color: "White",
    location: "Central Library",
    campusArea: "Commerce reference rack 3",
    ago: 8,
    image: PX(5386433),
  },
  {
    by: 7,
    kind: "found",
    title: "Navy blue hoodie outside Auditorium",
    description:
      "Someone left a navy blue fleece hoodie (size M) on the stone bench outside the auditorium entrance after the cultural event rehearsal. Cleaned and kept at sports office.",
    category: "Clothing",
    color: "Navy",
    location: "Auditorium",
    campusArea: "Outdoor stone bench",
    ago: 9,
    image: PX(2108816),
  },
  {
    by: 2,
    kind: "lost",
    title: "Black formal tie with college badge",
    description:
      "Lost my black college tie with the attached gold house badge during the rehearsal in the main auditorium. Left it near the stage green room.",
    category: "Clothing",
    color: "Black",
    location: "Auditorium",
    campusArea: "Stage green room",
    ago: 10,
  },
];

async function main() {
  console.log("🌱 Resetting ReFind database & seeding rich campus data...");

  // Cascade delete
  await db.delete(messages);
  await db.delete(notifications);
  await db.delete(claims);
  await db.delete(matches);
  await db.delete(items);
  await db.delete(users);

  /* 1. Users */
  const hash = await bcrypt.hash(PASSWORD, 10);
  const createdUsers = [];
  for (const p of PEOPLE) {
    const [u] = await db
      .insert(users)
      .values({
        name: p.name,
        email: p.email,
        password: hash,
        role: p.role,
        department: p.department,
        phone: p.phone || null,
        bio: p.bio,
        accent: p.accent,
      })
      .returning();
    createdUsers.push(u);
  }
  console.log(`✅ Created ${createdUsers.length} campus users`);

  /* 2. Items */
  const createdItems: (typeof items.$inferSelect)[] = [];
  for (const it of ITEMS) {
    const [row] = await db
      .insert(items)
      .values({
        ownerId: createdUsers[it.by].id,
        kind: it.kind,
        title: it.title,
        description: it.description,
        category: it.category,
        color: it.color ?? null,
        brand: it.brand ?? null,
        location: it.location,
        campusArea: it.campusArea ?? null,
        occurredOn: day(it.ago),
        imageUrl: it.image ?? null,
        status: it.status ?? "open",
        preferredContact: it.preferredContact ?? "chat",
        keywords: keywordsOf(
          `${it.title} ${it.description} ${it.brand ?? ""} ${it.category} ${it.location}`
        ),
      })
      .returning();
    createdItems.push(row);
  }
  console.log(`✅ Created ${createdItems.length} lost & found reports`);

  /* 3. Compute and save Potential Matches */
  const lostList = createdItems.filter((i) => i.kind === "lost" && i.status !== "returned");
  const foundList = createdItems.filter((i) => i.kind === "found" && i.status !== "returned");
  let matchCount = 0;

  for (const l of lostList) {
    for (const f of foundList) {
      if (l.ownerId === f.ownerId) continue;
      const analysis = calculateMatch(l, f);
      if (analysis.score >= 40) {
        await db.insert(matches).values({
          lostItemId: l.id,
          foundItemId: f.id,
          score: analysis.score,
          explanation: analysis.explanation,
          signals: analysis.signals,
          status: "suggested",
        });
        matchCount++;
      }
    }
  }
  console.log(`✅ Generated ${matchCount} potential matches in database`);

  const findItem = (t: string) => createdItems.find((c) => c.title === t)!;

  /* 4. Approved Claim + Conversation on the Earbuds */
  const earbudFound = findItem("White wireless earbuds handed to library desk");
  const [earbudClaim] = await db
    .insert(claims)
    .values({
      itemId: earbudFound.id,
      claimantId: createdUsers[1].id, // Meera
      message:
        "Hi Imran! I believe this is my case — it has a hairline crack on the lid hinge and faint scratch on the right bud. I lost them in the reading hall on Tuesday.",
      proof: "I can show the Bluetooth device connection history and original receipt on my phone.",
      status: "approved",
    })
    .returning();

  const earbudMessages: [number, string][] = [
    [4, "Hello Meera — your description matches the case exactly. I have it safe at the library circulation desk."],
    [1, "That is such a relief, thank you so much! What time can I come by to collect it?"],
    [4, "I am at the desk until 6:00 PM today, and from 9:00 AM tomorrow morning."],
    [1, "I will come around 5:00 PM after my biotech lecture. Thank you!"],
    [4, "See you then. Please bring your college ID card for verification."],
  ];

  for (const [who, body] of earbudMessages) {
    await db.insert(messages).values({
      claimId: earbudClaim.id,
      senderId: createdUsers[who].id,
      body,
      seen: true,
    });
  }
  console.log("✅ Created active conversation thread on approved claim");

  /* 5. Pending Claims */
  const idFound = findItem("Student ID card found on canteen table");
  await db.insert(claims).values({
    itemId: idFound.id,
    claimantId: createdUsers[6].id, // Vikram
    message:
      "That is mine — name is Vikram Nair, 2nd year B.Com, roll number ends in 4172, with the orientation week blue lanyard.",
    proof: "My student portal profile matches the photo and details.",
    status: "pending",
  });

  const keysFound = findItem("Keys found near parking gate");
  await db.insert(claims).values({
    itemId: keysFound.id,
    claimantId: createdUsers[5].id, // Sneha
    message:
      "I lost three keys with a red plastic tag labelled 212 near the hostel walkway two days ago. One key is for my hostel room 212.",
    status: "pending",
  });
  console.log("✅ Created pending verification requests");

  /* 6. Notifications */
  const notifData = [
    {
      who: 4,
      kind: "claim_received" as const,
      title: "New verification request",
      body: "Meera Iyer submitted a claim for \"White wireless earbuds handed to library desk\".",
      href: "/app/requests",
      seen: true,
    },
    {
      who: 1,
      kind: "claim_approved" as const,
      title: "Verification request approved!",
      body: "Imran Qureshi approved your claim. Private chat is now open to arrange handover.",
      href: `/app/messages/${earbudClaim.id}`,
      seen: true,
    },
    {
      who: 1,
      kind: "new_message" as const,
      title: "New message from Imran Qureshi",
      body: "See you then. Please bring your college ID card for verification.",
      href: `/app/messages/${earbudClaim.id}`,
      seen: false,
    },
    {
      who: 5,
      kind: "claim_received" as const,
      title: "New verification request",
      body: "Vikram Nair submitted a claim for \"Student ID card found on canteen table\".",
      href: "/app/requests",
      seen: false,
    },
    {
      who: 4,
      kind: "claim_received" as const,
      title: "New verification request",
      body: "Sneha Patil submitted a claim for \"Keys found near parking gate\".",
      href: "/app/requests",
      seen: false,
    },
    {
      who: 0,
      kind: "possible_match" as const,
      title: "Potential match detected (85%)",
      body: "\"Dark blue steel bottle found on bench\" matches your lost water bottle.",
      href: "/app/matches",
      seen: false,
    },
    {
      who: 3,
      kind: "possible_match" as const,
      title: "Potential match detected (85%)",
      body: "\"Navy blue steel water bottle\" matches the bottle you reported found.",
      href: "/app/matches",
      seen: true,
    },
    {
      who: 2,
      kind: "item_returned" as const,
      title: "Report completed",
      body: "Your listing \"Grey laptop backpack\" was marked as returned.",
      href: "/app/my-items",
      seen: true,
    },
  ];

  for (const n of notifData) {
    await db.insert(notifications).values({
      userId: createdUsers[n.who].id,
      kind: n.kind,
      title: n.title,
      body: n.body,
      href: n.href,
      seen: n.seen,
    });
  }
  console.log(`✅ Created ${notifData.length} persistent notifications`);

  console.log("\n🎉 ReFind seeding complete! Ready for end-to-end testing.");
  await pool.end();
}

main().catch(async (e) => {
  console.error("❌ Seed error:", e);
  await pool.end();
  process.exit(1);
});
