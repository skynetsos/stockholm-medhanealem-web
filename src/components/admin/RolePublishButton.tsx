"use client";

import { PublishButton, useAuth } from "@payloadcms/ui";
import type { ComponentProps } from "react";

import { hasRole, type Role } from "../../access/roles";

type Props = ComponentProps<typeof PublishButton> & { publisherRoles?: Role[] };

/**
 * Payload's Publish button, shown only to roles allowed to publish this collection. The server
 * enforces the same rule (contentAccess.publishersOnly); this just avoids offering a button that
 * would be refused. Everyone else uses "Save Draft".
 */
export function RolePublishButton({ publisherRoles = [], ...props }: Props) {
  const { user } = useAuth();
  if (!hasRole(user as { roles?: string[] } | null, ...publisherRoles)) return null;
  return <PublishButton {...props} />;
}
