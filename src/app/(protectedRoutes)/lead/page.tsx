import PageHeader from '@/components/ReusableComponent/PageHeader';
import { Webcam, GitFork, Users } from 'lucide-react';
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { prismaClient } from '@/lib/prismaClient';
import { LeadTypeEnum } from '@prisma/client';
import ManualFollowUpButton from './_components/ManualFollowUpButton';

const leadTypeStyles: Record<LeadTypeEnum, string> = {
  HOT: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  WARM: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  COLD: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  UNKNOWN: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40',
};

const page = async () => {
  const leads = await prismaClient.attendee.findMany({
    orderBy: {
      lastConversationAt: 'desc',
    },
    take: 200,
    include: {
      Attendance: {
        include: {
          webinar: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
    },
  });

  return (
    <div className="w-full h-screen flex flex-col px-6 md:px-8 lg:px-10 xl:px-12">
      <div className="w-full flex flex-col">
        <PageHeader
          leftIcon={<Webcam className="w-3 h-3" />}
          mainIcon={<Users className="w-12 h-12" />}
          rightIcon={<GitFork className="w-3 h-3" />}
          heading="The home to all your customers"
          placeholder="Search customer..."
        />
      </div>

      <div className="flex-grow overflow-y-auto mt-6"> 
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-sm text-muted-foreground">Name</TableHead>
              <TableHead className="text-sm text-muted-foreground">Email</TableHead>
              <TableHead className="text-sm text-muted-foreground">Lead Type</TableHead>
              <TableHead className="text-sm text-muted-foreground">Reason</TableHead>
              <TableHead className="text-right text-sm text-muted-foreground">Webinars</TableHead>
              <TableHead className="text-right text-sm text-muted-foreground">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads?.map((lead) => (
              <TableRow key={lead.id} className="border-0">
                <TableCell className="font-medium">{lead.name}</TableCell>
                <TableCell>{lead.email}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={leadTypeStyles[lead.leadType]}
                  >
                    {lead.leadType}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[280px] truncate text-muted-foreground">
                  {lead.leadReason || '—'}
                </TableCell>
                <TableCell className="text-right">
                  {lead.Attendance.slice(0, 2).map((attendance) => (
                    <Badge key={`${lead.id}-${attendance.id}`} variant="outline">
                      {attendance.webinar.title}
                    </Badge>
                  ))}
                </TableCell>
                <TableCell className="text-right">
                  <ManualFollowUpButton
                    attendeeId={lead.id}
                    webinarId={lead.Attendance[0]?.webinar.id}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default page;
