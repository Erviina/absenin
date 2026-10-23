"use client";

import React from "react";
import { PlatformAdminErrorView } from "@/components/platform-admin/PlatformAdminErrorView";

export default function PlatformAdminNotFound() {
  return <PlatformAdminErrorView type="404" />;
}
