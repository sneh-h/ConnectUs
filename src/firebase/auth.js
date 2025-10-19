import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  sendEmailVerification
} from 'firebase/auth';
import { auth } from './config';

export const signUp = async (email, password) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(userCredential.user);
  return userCredential;
};

export const signIn = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const resendVerification = async () => {
  if (auth.currentUser) {
    await sendEmailVerification(auth.currentUser);
  }
};

export const logout = () => {
  return signOut(auth);
};

export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};