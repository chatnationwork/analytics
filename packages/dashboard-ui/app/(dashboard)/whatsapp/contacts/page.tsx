
import { whatsappServerApi } from '@/lib/whatsapp-api-server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default async function ContactsPage(props: {
  searchParams?: Promise<{ page?: string }>;
}) {
  const searchParams = await props.searchParams;
  const currentPage = Number(searchParams?.page) || 1;
  const limit = 20;

  const contactsData = await whatsappServerApi.getContacts(currentPage, limit).catch(() => null);
  const contacts = contactsData?.data || [];
  const total = contactsData?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/whatsapp/customer-insights">
           <Button variant="ghost" size="icon">
             <ArrowLeft className="h-4 w-4" />
           </Button>
        </Link>
        <div>
           <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
             Contacts
           </h1>
           <p className="text-gray-500 text-sm">
             Total Contacts: {total}
           </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Contacts</CardTitle>
          <CardDescription>
            List of all contacts from your CRM.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No contacts found.
                    </TableCell>
                  </TableRow>
                ) : (
                  contacts.map((contact: any) => (
                    <TableRow key={contact.id || contact.whatsapp_number}>
                      <TableCell className="font-medium">
                        {contact.name?.first_name 
                          ? `${contact.name.first_name} ${contact.name.last_name || ''}`
                          : (contact.profile?.whatsapp?.name || 'Unknown')}
                      </TableCell>
                      <TableCell>
                          {contact.whatsapp_number || contact.profile?.whatsapp?.identifier || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700">
                          {contact.status || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {contact.createdAt ? new Date(contact.createdAt).toLocaleDateString() : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-end space-x-2 py-4">
            <div className="text-sm text-gray-500">
              Page {currentPage} of {totalPages || 1}
            </div>
            <div className="space-x-2">
              <Link
                href={currentPage > 1 ? `/whatsapp/contacts?page=${currentPage - 1}` : '#'}
                scroll={false}
              >
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
              </Link>
              <Link
                href={currentPage < totalPages ? `/whatsapp/contacts?page=${currentPage + 1}` : '#'}
                scroll={false}
              >
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
