import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, User } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  collection,
  addDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  increment,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import {
  CivicCartItem,
  CivicComment,
  CommentFlag,
  Report311,
  ResidentPulse,
  UserAlertPreference,
  VolunteerSignup,
  WatchlistEntry,
} from './types';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
export const googleProvider = new GoogleAuthProvider();

export const BOOTSTRAP_MODERATOR_EMAIL = 'smalltownbigcityent@gmail.com';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
}

export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign Out Error:', error);
  }
}

export async function checkIsModerator(user: User | null): Promise<boolean> {
  if (!user || !user.emailVerified) return false;
  if (user.email?.toLowerCase() === BOOTSTRAP_MODERATOR_EMAIL.toLowerCase()) {
    return true;
  }
  try {
    const adminSnap = await getDoc(doc(db, 'admins', user.uid));
    return adminSnap.exists();
  } catch {
    return false;
  }
}

// 311 Reports Subscriptions & Mutations
export function subscribeReports(onUpdate: (reports: Report311[]) => void) {
  const path = 'reports';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: Report311[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Report311, 'id'>),
      }));
      onUpdate(items);
    },
    (error) => {
      console.warn('Firestore reports listener fallback:', error.message);
    }
  );
}

export async function createCloudReport(
  report: Omit<Report311, 'id'>
): Promise<Report311> {
  const path = 'reports';
  try {
    const payload: Record<string, any> = {
      category: report.category,
      location: report.location.slice(0, 160),
      description: report.description.slice(0, 1000),
      status: 'Submitted' as const,
      submittedDate: report.submittedDate.slice(0, 60),
      upvotes: 1,
      reporterName: report.reporterName.slice(0, 80),
      authorUid: auth.currentUser?.uid || 'anonymous',
      communityId: report.communityId || 'ashtabula-oh',
    };
    if (typeof report.mapX === 'number') payload.mapX = report.mapX;
    if (typeof report.mapY === 'number') payload.mapY = report.mapY;
    if (report.photoUrl && report.photoUrl.trim()) {
      payload.photoUrl = report.photoUrl.trim().slice(0, 300);
      payload.photoModerationStatus =
        report.photoModerationStatus === 'pending_review' ? 'pending_review' : 'approved';
      payload.photoFlagCount = 0;
      if (report.photoModerationNote && report.photoModerationNote.trim()) {
        payload.photoModerationNote = report.photoModerationNote.trim().slice(0, 240);
      }
    }
    const ref = await addDoc(collection(db, path), payload);
    return { id: ref.id, ...(payload as Omit<Report311, 'id'>) };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function upvoteCloudReport(reportId: string) {
  const path = `reports/${reportId}`;
  try {
    await updateDoc(doc(db, 'reports', reportId), {
      upvotes: increment(1),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateCloudReportStatus(
  reportId: string,
  status: Report311['status'],
  afterPhotoUrl?: string
) {
  const path = `reports/${reportId}`;
  try {
    const updatePayload: Record<string, any> = { status };
    if (status === 'Resolved') {
      updatePayload.resolvedDate = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
    if (afterPhotoUrl && afterPhotoUrl.trim()) {
      updatePayload.afterPhotoUrl = afterPhotoUrl.trim().slice(0, 300);
    }
    await updateDoc(doc(db, 'reports', reportId), updatePayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function respondToCloudReport(
  reportId: string,
  status: Report311['status'],
  officialResponse: string,
  officialResponderName: string,
  afterPhotoUrl?: string
) {
  const path = `reports/${reportId}`;
  try {
    const updatePayload: Record<string, any> = {
      status,
      officialResponse: officialResponse.trim().slice(0, 600),
      officialResponderName: officialResponderName.trim().slice(0, 100),
      officialRespondedAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
    };
    if (status === 'Resolved') {
      updatePayload.resolvedDate = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
    if (afterPhotoUrl && afterPhotoUrl.trim()) {
      updatePayload.afterPhotoUrl = afterPhotoUrl.trim().slice(0, 300);
    }
    await updateDoc(doc(db, 'reports', reportId), updatePayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteCloudReport(reportId: string) {
  const path = `reports/${reportId}`;
  try {
    await deleteDoc(doc(db, 'reports', reportId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function flagCloudReportPhoto(
  reportId: string,
  reason: string
) {
  if (!auth.currentUser) {
    throw new Error('Please sign in with Google to flag an uploaded photo.');
  }
  const path = `reports/${reportId}`;
  try {
    await updateDoc(doc(db, 'reports', reportId), {
      photoFlagCount: increment(1),
      photoModerationStatus: 'flagged',
      photoModerationNote: reason.trim().slice(0, 240) || 'Flagged by resident for review',
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function moderateCloudReportPhoto(
  reportId: string,
  photoModerationStatus: 'approved' | 'removed',
  photoModerationNote?: string
) {
  const path = `reports/${reportId}`;
  try {
    const updatePayload: Record<string, any> = {
      photoModerationStatus,
    };
    if (photoModerationNote !== undefined) {
      updatePayload.photoModerationNote = photoModerationNote.trim().slice(0, 240);
    }
    await updateDoc(doc(db, 'reports', reportId), updatePayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Moderated Comments Subscriptions & Actions
export function subscribeApprovedComments(
  civicItemId: string,
  onUpdate: (comments: CivicComment[]) => void
) {
  const path = 'comments';
  const q = query(
    collection(db, path),
    where('civicItemId', '==', civicItemId),
    where('moderationStatus', '==', 'approved')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const items: CivicComment[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<CivicComment, 'id'>),
      }));
      onUpdate(items);
    },
    (error) => {
      console.warn('Firestore approved comments listener fallback:', error.message);
    }
  );
}

export function subscribeOwnPendingComments(
  civicItemId: string,
  userId: string,
  onUpdate: (comments: CivicComment[]) => void
) {
  const path = 'comments';
  const q = query(
    collection(db, path),
    where('civicItemId', '==', civicItemId),
    where('authorUid', '==', userId)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const items: CivicComment[] = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...(d.data() as Omit<CivicComment, 'id'>),
        }))
        .filter((c) => c.moderationStatus !== 'approved' && c.moderationStatus !== 'removed');
      onUpdate(items);
    },
    (error) => {
      console.warn('Firestore own comments listener fallback:', error.message);
    }
  );
}

export async function postCloudComment(
  comment: Omit<CivicComment, 'id' | 'authorUid' | 'flagCount'>
): Promise<CivicComment> {
  const path = 'comments';
  if (!auth.currentUser) {
    throw new Error('Please sign in with Google to post a public comment.');
  }
  try {
    const payload: Record<string, any> = {
      civicItemId: comment.civicItemId.slice(0, 128),
      authorUid: auth.currentUser.uid,
      authorName: (
        comment.authorName ||
        auth.currentUser.displayName ||
        'Ashtabula Resident'
      ).slice(0, 80),
      stance: comment.stance,
      body: comment.body.slice(0, 1000),
      createdAtLabel: comment.createdAtLabel.slice(0, 60),
      moderationStatus: comment.moderationStatus,
      flagCount: 0,
    };
    if (comment.moderationNote) {
      payload.moderationNote = comment.moderationNote.slice(0, 240);
    }
    if (comment.isOfficialResponse) {
      payload.isOfficialResponse = true;
      payload.officialRole = (comment.officialRole || 'Verified Official Update').slice(0, 80);
    }
    const ref = await addDoc(collection(db, path), payload);
    return { id: ref.id, ...(payload as Omit<CivicComment, 'id'>) };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteOwnCloudComment(commentId: string) {
  const path = `comments/${commentId}`;
  try {
    await deleteDoc(doc(db, 'comments', commentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function flagCloudComment(
  comment: CivicComment,
  reason: CommentFlag['reason'],
  details?: string
) {
  if (!auth.currentUser) {
    throw new Error('Please sign in to report a comment.');
  }
  const flagRef = doc(collection(db, 'commentFlags'));
  const commentRef = doc(db, 'comments', comment.id);
  const batch = writeBatch(db);

  const flagPayload: Record<string, any> = {
    commentId: comment.id,
    civicItemId: comment.civicItemId,
    reporterUid: auth.currentUser.uid,
    reason,
    createdAtLabel: new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    status: 'open',
  };
  if (details && details.trim()) {
    flagPayload.details = details.trim().slice(0, 300);
  }

  batch.set(flagRef, flagPayload);
  batch.update(commentRef, {
    flagCount: increment(1),
    moderationStatus: 'flagged',
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `comments/${comment.id}`);
  }
}

// Moderator Subscriptions & Decisions
export function subscribeModerationComments(
  onUpdate: (comments: CivicComment[]) => void
) {
  const path = 'comments';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: CivicComment[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<CivicComment, 'id'>),
      }));
      onUpdate(items);
    },
    (error) => {
      console.warn('Firestore moderator comments listener:', error.message);
    }
  );
}

export function subscribeCommentFlags(onUpdate: (flags: CommentFlag[]) => void) {
  const path = 'commentFlags';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: CommentFlag[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<CommentFlag, 'id'>),
      }));
      onUpdate(items);
    },
    (error) => {
      console.warn('Firestore comment flags listener:', error.message);
    }
  );
}

export async function moderateCloudComment(
  commentId: string,
  moderationStatus: CivicComment['moderationStatus'],
  moderationNote?: string
) {
  const path = `comments/${commentId}`;
  try {
    const updateData: Record<string, any> = { moderationStatus };
    if (moderationNote !== undefined) {
      updateData.moderationNote = moderationNote.slice(0, 240);
    }
    await updateDoc(doc(db, 'comments', commentId), updateData);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function resolveCommentFlag(flagId: string) {
  const path = `commentFlags/${flagId}`;
  try {
    await updateDoc(doc(db, 'commentFlags', flagId), { status: 'reviewed' });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Watchlist & Action Queue Subscriptions
export function subscribeWatchlist(
  userId: string,
  onUpdate: (entries: WatchlistEntry[]) => void
) {
  const q = query(collection(db, 'users', userId, 'watchlist'), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const entries: WatchlistEntry[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<WatchlistEntry, 'id'>),
      }));
      onUpdate(entries);
    },
    (error) => {
      console.warn('Firestore watchlist listener:', error.message);
    }
  );
}

export async function addToCloudWatchlist(
  userId: string,
  entry: Omit<WatchlistEntry, 'id' | 'userId'>
) {
  const path = `users/${userId}/watchlist/${entry.itemId}`;
  try {
    await setDoc(doc(db, 'users', userId, 'watchlist', entry.itemId), {
      userId,
      itemId: entry.itemId.slice(0, 128),
      title: entry.title.slice(0, 200),
      category: entry.category.slice(0, 60),
      status: entry.status.slice(0, 60),
      department: entry.department.slice(0, 120),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function removeFromCloudWatchlist(userId: string, itemId: string) {
  const path = `users/${userId}/watchlist/${itemId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'watchlist', itemId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeUserActions(
  userId: string,
  onUpdate: (actions: CivicCartItem[]) => void
) {
  const q = query(collection(db, 'users', userId, 'actions'), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: CivicCartItem[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<CivicCartItem, 'id'>),
      }));
      onUpdate(items);
    },
    (error) => {
      console.warn('Firestore actions listener:', error.message);
    }
  );
}

export async function createCloudAction(
  userId: string,
  action: Omit<CivicCartItem, 'id' | 'userId'>
): Promise<CivicCartItem> {
  const path = `users/${userId}/actions`;
  try {
    const payload: Record<string, any> = {
      userId,
      title: action.title.slice(0, 200),
      actionType: action.actionType,
      targetEntity: action.targetEntity.slice(0, 160),
      status: action.status,
    };
    if (action.civicItemId) payload.civicItemId = action.civicItemId.slice(0, 128);
    if (action.dueDate) payload.dueDate = action.dueDate.slice(0, 100);
    const ref = await addDoc(collection(db, 'users', userId, 'actions'), payload);
    return { id: ref.id, ...(payload as Omit<CivicCartItem, 'id'>) };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function completeCloudAction(userId: string, actionId: string) {
  const path = `users/${userId}/actions/${actionId}`;
  try {
    await updateDoc(doc(db, 'users', userId, 'actions', actionId), {
      status: 'Completed',
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteCloudAction(userId: string, actionId: string) {
  const path = `users/${userId}/actions/${actionId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'actions', actionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// User Topic & Jurisdiction Alert Preferences
export function subscribeAlertPreferences(
  userId: string,
  onUpdate: (pref: UserAlertPreference | null) => void
) {
  return onSnapshot(
    doc(db, 'users', userId, 'alertPreferences', 'settings'),
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as UserAlertPreference);
      } else {
        onUpdate(null);
      }
    },
    (error) => {
      console.warn('Firestore alert preferences listener:', error.message);
    }
  );
}

export async function saveAlertPreferences(
  userId: string,
  pref: Omit<UserAlertPreference, 'userId' | 'updatedAtLabel'>
) {
  const path = `users/${userId}/alertPreferences/settings`;
  try {
    const payload: Record<string, any> = {
      userId,
      communityId: pref.communityId.slice(0, 64),
      topics: pref.topics.slice(0, 10).map((t) => String(t).slice(0, 60)),
      emailDigestEnabled: Boolean(pref.emailDigestEnabled),
      updatedAtLabel: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
    };
    if (pref.digestEmail && pref.digestEmail.trim()) {
      payload.digestEmail = pref.digestEmail.trim().slice(0, 120);
    }
    await setDoc(doc(db, 'users', userId, 'alertPreferences', 'settings'), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Before-the-Vote Resident Pulse (Public Aggregate, Zero PII)
export function subscribeResidentPulses(
  civicItemId: string,
  onUpdate: (pulses: ResidentPulse[]) => void
) {
  const q = query(collection(db, 'pulses'), where('civicItemId', '==', civicItemId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: ResidentPulse[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ResidentPulse, 'id'>),
      }));
      onUpdate(items);
    },
    (error) => {
      console.warn('Firestore pulses listener:', error.message);
    }
  );
}

export async function submitResidentPulse(
  civicItemId: string,
  stance: ResidentPulse['stance'],
  reason?: string
): Promise<void> {
  if (!auth.currentUser) {
    throw new Error('Please sign in with Google to share your Resident Pulse.');
  }
  const uid = auth.currentUser.uid;
  const safeItemId = civicItemId.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 80);
  const pulseId = `${safeItemId}__${uid}`;
  const path = `pulses/${pulseId}`;
  try {
    const payload: Record<string, any> = {
      civicItemId: safeItemId,
      userId: uid,
      stance,
      updatedAtLabel: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
    };
    if (reason && reason.trim()) {
      payload.reason = reason.trim().slice(0, 240);
    }
    await setDoc(doc(db, 'pulses', pulseId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Open Boards & Local Volunteer Signups
export function subscribeVolunteerSignups(
  userId: string,
  onUpdate: (signups: VolunteerSignup[]) => void
) {
  const q = query(
    collection(db, 'users', userId, 'volunteerSignups'),
    where('userId', '==', userId)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const items: VolunteerSignup[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<VolunteerSignup, 'id'>),
      }));
      onUpdate(items);
    },
    (error) => {
      console.warn('Firestore volunteer signups listener:', error.message);
    }
  );
}

export async function saveVolunteerSignup(
  userId: string,
  signup: Omit<VolunteerSignup, 'id' | 'userId' | 'createdAtLabel'>
): Promise<void> {
  const path = `users/${userId}/volunteerSignups/${signup.opportunityId}`;
  try {
    await setDoc(doc(db, 'users', userId, 'volunteerSignups', signup.opportunityId), {
      userId,
      opportunityId: signup.opportunityId.slice(0, 128),
      title: signup.title.slice(0, 160),
      communityName: signup.communityName.slice(0, 80),
      kind: signup.kind,
      status: signup.status,
      createdAtLabel: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function removeVolunteerSignup(
  userId: string,
  opportunityId: string
): Promise<void> {
  const path = `users/${userId}/volunteerSignups/${opportunityId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'volunteerSignups', opportunityId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

