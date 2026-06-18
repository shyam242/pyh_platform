import passport from "passport";
import dotenv from "dotenv";
import { Strategy as OpenIDConnectStrategy } from "passport-openidconnect";
import pool from "./db.js";

dotenv.config();

passport.use(
  "linkedin",
  new OpenIDConnectStrategy(
    {
      issuer: "https://www.linkedin.com",
      authorizationURL:
        "https://www.linkedin.com/oauth/v2/authorization",
      tokenURL:
        "https://www.linkedin.com/oauth/v2/accessToken",
      userInfoURL:
        "https://api.linkedin.com/v2/userinfo",

      clientID: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,

      callbackURL:
        process.env.BACKEND_URL + "/api/auth/linkedin/callback" || "https://api.pickyourhire.com/api/auth/linkedin/callback",
    },

    // 🔥 VERIFY CALLBACK
    async (issuer, profile, done) => {
      try {
        console.log("LinkedIn Profile:", profile);

        const linkedinId = profile.id;
        const name = profile.displayName || "LinkedIn User";

        // 🔎 Check user
        let user = await pool.query(
          "SELECT * FROM users WHERE linkedin_id=$1",
          [linkedinId]
        );

        // 👤 Create if not exists
        if (user.rows.length === 0) {
          const newUser = await pool.query(
            "INSERT INTO users(name, linkedin_id, role) VALUES($1,$2,$3) RETURNING *",
            [name, linkedinId, "referrer"]
          );
          return done(null, newUser.rows[0]);
        }

        return done(null, user.rows[0]);
      } catch (err) {
        console.error("Passport Error:", err);
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));
