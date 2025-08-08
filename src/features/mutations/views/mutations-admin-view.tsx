"use client";

import { Mutation } from "../actions/get-all-mutations";
import { MutationsAdminTable } from "../components/mutations-admin-table";

export function MutationsAdminView({ mutations }: { mutations: Mutation[] }) {
  return <MutationsAdminTable mutations={mutations} />;
}
