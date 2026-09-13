"use client"

import * as React from "react"
import Link from "next/link"
import {
  Activity,
  Users,
  Calendar,
  Beaker,
  ShieldCheck,
  Stethoscope,
  Lock,
  LifeBuoy,
  FileSpreadsheet,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { StaffUser } from "@/types"
import { STAFF_PRESETS, PHYSICIAN_PRESETS } from "@/lib/api"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  currentStaff?: StaffUser
  onRoleSelect?: (staff: StaffUser) => void
  onLock?: () => void
}

export function AppSidebar({
  currentStaff = STAFF_PRESETS.find((s) => s.role === 'RECEPTIONIST') || STAFF_PRESETS[0],
  onRoleSelect,
  onLock,
  ...props
}: AppSidebarProps) {
  const navMain = [
    {
      title: "Patient Admissions",
      url: "/",
      icon: Users,
      isActive: true,
      items: [
        {
          title: "Front Desk Overview",
          url: "/",
        },
        {
          title: "Admissions & Registry",
          url: "/patients",
        },
      ],
    },
    {
      title: "Consultation Scheduling",
      url: "/appointments",
      icon: Calendar,
      isActive: true,
      items: [
        {
          title: "Daily Outpatient Queue",
          url: "/appointments",
        },
      ],
    },
    {
      title: "Diagnostic Services",
      url: "/labs",
      icon: Beaker,
      items: [
        {
          title: "Lab Requisitions & Worklist",
          url: "/labs",
        },
      ],
    },
  ]

  const examSuites = PHYSICIAN_PRESETS.map((doc) => ({
    name: `${doc.defaultRoom} • ${doc.name.split(',')[0]}`,
    url: "/appointments",
    icon: Stethoscope,
    badge: doc.specialty,
  }))

  const isAdmin = currentStaff.role === 'ADMINISTRATOR'

  const navSecondary = [
    ...(isAdmin
      ? [
          {
            title: "Compliance Audit Logs",
            url: "/audit-logs",
            icon: ShieldCheck,
          },
        ]
      : []),
    {
      title: "Lock Workstation",
      url: "#",
      icon: Lock,
      onClick: onLock,
    },
  ]

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold shadow-xs">
                  <Activity className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <div className="truncate font-bold flex items-center gap-1.5 text-slate-900">
                    <span>CareSync</span>
                    <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono text-blue-700 bg-blue-50 border-blue-200">
                      INTAKE
                    </Badge>
                  </div>
                  <span className="truncate text-[11px] text-muted-foreground">
                    Admissions & Clinic OS
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={navMain} label="Admissions & Clinical Care" />
        <NavProjects projects={examSuites} label="Doctor Examination Suites" />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>

      <SidebarFooter>
        <NavUser
          user={{
            name: currentStaff.fullName,
            email: currentStaff.email,
            role: currentStaff.role,
            department: currentStaff.department,
          }}
          onRoleSelect={onRoleSelect}
          onLock={onLock}
        />
      </SidebarFooter>
    </Sidebar>
  )
}
