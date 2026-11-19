// Draft Privacy Policy for Australia, written to match what the app actually collects and where it goes.
// A lawyer should review it before launch, together with the Terms (data/terms.js).
import { CONTACT_EMAIL } from './terms.js';

export const PRIVACY_STATUS = 'Draft, 20 November 2026';

// Each section has a title and one or more paragraphs.
export const PRIVACY = [
  {
    title: 'About this policy',
    body: [
      'Nutrichef AI and Co. ("we", "us") runs NutriChef AI. This policy explains how we handle personal information under the Privacy Act 1988 (Cth) and the Australian Privacy Principles.',
    ],
  },
  {
    title: 'What we collect',
    body: [
      'Account details: your first and last name, email address, a securely hashed version of your password, when you accepted the Terms, and whether your email is verified.',
      'Profile details you choose to give: age, sex, height, weight, activity level, fitness goal, calorie and nutrient targets, diet, foods you dislike, and allergies. We do not collect medical diagnoses.',
      'What you do in the app: ingredients and filters you enter, recipes generated for you, your recipe chats, favourites, meals you log and water you track.',
      'Security records: one-time email codes and trusted-device tokens (stored only as scrambled hashes), and your IP address for a short time to limit repeated failed sign-ins.',
    ],
  },
  {
    title: 'Why we use it',
    body: [
      'To run your account, sign you in securely, write and check recipes for you, calculate nutrition, track your progress, and show optional supplement and wellness suggestions. We don\'t sell your information or use it for advertising.',
    ],
  },
  {
    title: 'Sensitive information and consent',
    body: [
      'Height, weight, age and allergies can be health information. We collect them only with your consent, and you can change or remove them at any time on your Profile page ("Remove my health details").',
      'Your allergies are always checked inside NutriChef AI. They, your diet, targets and foods to avoid are sent to our AI provider only if you tick the consent box on your Profile page.',
    ],
  },
  {
    title: 'Who we share it with',
    body: [
      'Anthropic (Claude), our AI provider, receives your ingredients, filters and recipe chats, and, with your consent, your diet, targets and a list of foods to avoid. It does not receive your name, email, age or body details, and we never label anything as an allergy.',
      'Brevo sends our verification and sign-in emails and receives your name and email address to do so.',
      'Our hosting providers store and serve the app: Render (the server, in Singapore), Neon (the database, in Singapore) and Vercel (the website). Some of these providers, including Anthropic, may process information outside Australia, such as in Singapore and the United States.',
    ],
  },
  {
    title: 'How we protect it',
    body: [
      'Connections are encrypted (HTTPS). Passwords are hashed with bcrypt, and email codes and device tokens are stored only as hashes. Sign-in uses an emailed code on new devices, and repeated failed sign-ins are blocked for a while.',
    ],
  },
  {
    title: 'Your browser',
    body: [
      'We store your sign-in tokens, your light or dark mode choice and, if you choose "Keep me signed in", a device token in your browser\'s local storage. We don\'t use advertising or tracking cookies.',
    ],
  },
  {
    title: 'How long we keep it, and deleting it',
    body: [
      'We keep your information while your account is open. You can delete your account and all its data at any time in Settings. Deleted information is removed from our database straight away.',
    ],
  },
  {
    title: 'Access, correction and complaints',
    body: [
      'You can see and correct most of your information on your Profile page. To ask for a copy of your information or to make a privacy complaint, email us at ' + CONTACT_EMAIL + '. We aim to reply within 30 days.',
      'If you\'re not satisfied with our response, you can contact the Office of the Australian Information Commissioner (OAIC) at oaic.gov.au.',
    ],
  },
  {
    title: 'Changes to this policy',
    body: [
      'We may update this policy. We\'ll tell you about important changes before they apply.',
    ],
  },
];
