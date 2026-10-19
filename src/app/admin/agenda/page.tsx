"use client";

import AgendaPage, {
  isAgendaUrl,
  formatAgendaUrl,
  getAgendaCategoryColor,
  LocationPinIcon,
  sortAgendaCategories,
  countWords
} from "@/app/agenda/page";

export {
  isAgendaUrl,
  formatAgendaUrl,
  getAgendaCategoryColor,
  LocationPinIcon,
  sortAgendaCategories,
  countWords
};

export default function AdminAgendaPage() {
  return <AgendaPage isAdminMode={true} />;
}
