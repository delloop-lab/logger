import { redirect } from 'next/navigation';

/** Old /landing URL — marketing home now lives at /. */
export default function LandingRedirect() {
  redirect('/');
}
