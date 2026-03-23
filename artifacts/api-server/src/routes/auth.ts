import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import { db, users } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();
const SALT_ROUNDS = 10;

declare module "express-session" {
  interface SessionData {
    userId: number;
    firstName: string;
  }
}

router.post("/register", async (req, res) => {
  try {
    const { firstName, password, email } = req.body as {
      firstName?: string;
      password?: string;
      email?: string;
    };

    if (!firstName?.trim() || !password) {
      res.status(400).json({ error: "First name and password are required" });
      return;
    }

    if (!email?.trim()) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    const normalizedName = firstName.trim();
    const normalizedEmail = email.trim().toLowerCase();

    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail));
    if (existing) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const [user] = await db
      .insert(users)
      .values({
        firstName: normalizedName,
        passwordHash,
        email: normalizedEmail,
      })
      .returning();

    req.session.userId = user.id;
    req.session.firstName = user.firstName;

    res.status(201).json({ id: user.id, firstName: user.firstName, email: user.email });
  } catch (err) {
    req.log.error({ err }, "Registration failed");
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email?.trim() || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail));

    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    req.session.userId = user.id;
    req.session.firstName = user.firstName;

    res.json({ id: user.id, firstName: user.firstName, email: user.email });
  } catch (err) {
    req.log.error({ err }, "Login failed");
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: "Logout failed" });
      return;
    }
    res.clearCookie("lucy.sid");
    res.json({ ok: true });
  });
});

router.get("/me", (req, res) => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json({ id: req.session.userId, firstName: req.session.firstName });
});

export default router;
