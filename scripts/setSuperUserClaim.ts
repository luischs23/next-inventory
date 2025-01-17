import { auth } from '../src/services/firebase/firebase-admin';

const email = 'luisc.herreras@gmail.com'; // Replace with your superuser's email

async function setSuperUserClaim() {
  try {
    const user = await auth.getUserByEmail(email);
    await auth.setCustomUserClaims(user.uid, { superuser: true });
    console.log('Superuser claim set successfully');
  } catch (error) {
    console.error('Error setting superuser claim:', error);
  }
}

setSuperUserClaim();