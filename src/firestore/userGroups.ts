import { db } from '../app/api/user/initFirebase'

interface UserGroup {
  id: string
  name: string
  companyId: string
  members: string[] // Array of user UIDs
}

export async function createUserGroup(groupData: Omit<UserGroup, 'id'>): Promise<string> {
  const docRef = await db.collection('userGroups').add(groupData)
  return docRef.id
}

export async function addUserToGroup(groupId: string, userId: string): Promise<void> {
  await db.collection('userGroups').doc(groupId).update({
    members: admin.firestore.FieldValue.arrayUnion(userId)
  })
}

export async function removeUserFromGroup(groupId: string, userId: string): Promise<void> {
  await db.collection('userGroups').doc(groupId).update({
    members: admin.firestore.FieldValue.arrayRemove(userId)
  })
}

export async function getUserGroups(userId: string): Promise<UserGroup[]> {
  const snapshot = await db.collection('userGroups')
    .where('members', 'array-contains', userId)
    .get()

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserGroup))
}

export async function getGroupMembers(groupId: string): Promise<string[]> {
  const doc = await db.collection('userGroups').doc(groupId).get()
  return doc.exists ? doc.data()?.members || [] : []
}

