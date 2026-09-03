// Small helper for building "share via WhatsApp" links.
// We never send WhatsApp messages ourselves — we just open a wa.me link
// pre-filled with a message, and the recruiter/admin sends it from their
// own WhatsApp. If a phone number is available it's used to open a chat
// with that contact directly; otherwise wa.me opens a "pick a contact" flow.

const FRONTEND_URL =
  (typeof window !== "undefined" && window.location.origin) ||
  process.env.NEXT_PUBLIC_FRONTEND_URL ||
  "https://pyh-platform.vercel.app";

/** Digits-only phone number (with country code) for the wa.me path segment. */
const digitsOnly = (phone) => (phone || "").replace(/[^\d]/g, "");

/**
 * Build a wa.me share link.
 * @param {string} phone - candidate's contact number (any format), optional.
 * @param {string} message - pre-filled message text.
 */
export function buildWhatsAppLink(phone, message) {
  const num = digitsOnly(phone);
  const base = num ? `https://wa.me/${num}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(message)}`;
}

/** Generic self-registration link — anyone can open this and create their own profile. */
export function buildSignupLink() {
  return `${FRONTEND_URL}/signin`;
}

/**
 * Link for a specific candidate whose profile was bulk-uploaded by admin.
 * Opening it (then signing in with the same email) auto-claims their
 * existing profile instead of starting from a blank form.
 */
export function buildClaimLink(email) {
  const url = `${FRONTEND_URL}/signin`;
  return email ? `${url}?email=${encodeURIComponent(email)}` : url;
}

/** Opens the WhatsApp share dialog for a general "create your profile" invite. */
export function shareSignupViaWhatsApp(phone) {
  const message =
    `Hi! You're invited to join PickYourHire and create your candidate profile.\n\n` +
    `${buildSignupLink()}\n\n` +
    `It only takes a couple of minutes — sign in with your email and fill in your details.`;
  window.open(buildWhatsAppLink(phone, message), "_blank", "noopener,noreferrer");
}

/** Opens the WhatsApp share dialog inviting a bulk-uploaded candidate to claim/edit their profile. */
export function shareClaimViaWhatsApp({ name, email, phone }) {
  const message =
    `Hi ${name || "there"}! Your profile is already on PickYourHire.\n\n` +
    `Tap the link below and sign in with ${email || "your email"} to view and edit it:\n` +
    `${buildClaimLink(email)}\n\n` +
    `We'll send a one-time code to verify it's you.`;
  window.open(buildWhatsAppLink(phone, message), "_blank", "noopener,noreferrer");
}
