export interface ProjectWithOwner {
  ownerId?: string | null;
}

/** Project owner acts as the project manager for assignment permissions. */
export function isProjectManager(
  project: ProjectWithOwner | null | undefined,
  userId: string | null | undefined,
): boolean {
  if (!project?.ownerId || !userId) return false;
  return project.ownerId === userId;
}

export function canAssignToUser(
  project: ProjectWithOwner | null | undefined,
  actingUserId: string | null | undefined,
  targetUserId: string | null | undefined,
): boolean {
  if (!targetUserId) return true;
  if (!actingUserId) return false;
  if (targetUserId === actingUserId) return true;
  return isProjectManager(project, actingUserId);
}
