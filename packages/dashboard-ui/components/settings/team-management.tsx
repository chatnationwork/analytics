
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Mail, Trash2, Check, Copy } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/api';
import { useCan } from '@/components/auth/PermissionContext';

interface Member {
  userId: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  token: string;
  createdAt: string;
}

export function TeamManagement({ tenantId }: { tenantId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  
  const canManage = useCan('teams.manage');

  // Fetch members (doesn't need tenantId)
  const fetchMembers = async () => {
    try {
      const data = await fetchWithAuth('/tenants/current/members');
      setMembers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to fetch members', e);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch invitations (needs tenantId)
  const fetchInvitations = async () => {
    if (!tenantId) return;
    try {
      const data = await fetchWithAuth(`/tenants/${tenantId}/invitations`);
      console.log('Invitations response:', data);
      setInvitations(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to fetch invitations', e);
      setInvitations([]);
    }
  };

  // Fetch members on mount
  useEffect(() => {
    fetchMembers();
  }, []);

  // Fetch invitations when tenantId becomes available
  useEffect(() => {
    if (tenantId) fetchInvitations();
  }, [tenantId]);

  const handleInvite = async () => {
    if (!inviteEmail) return;
    if (!tenantId) {
      toast.error('Workspace not loaded. Please refresh the page.');
      return;
    }

    try {
      await fetchWithAuth(`/tenants/${tenantId}/invitations`, {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      toast.success('Invitation created!');
      setInviteEmail('');
      setIsInviteOpen(false);
      fetchMembers();
      fetchInvitations();
    } catch (e: any) {
      toast.error(e.message || 'Could not create invitation');
    }
  };

  const copyInviteLink = (token: string) => {
      // In a real app, this would be a full URL like https://app.com/invite/accept?token=...
      const link = `${window.location.origin}/invite/accept?token=${token}`;
      navigator.clipboard.writeText(link);
      toast.success('Invite link copied to clipboard');
  };

  const revokeInvite = async (id: string) => {
      if (!confirm('Are you sure you want to revoke this invitation?')) return;
      
      try {
          await fetchWithAuth(`/tenants/${tenantId}/invitations/${id}`, { method: 'DELETE' });
          toast.success('Invitation revoked');
          fetchInvitations();
      } catch(e) {
          toast.error('Failed to revoke');
      }
  };

  if (loading) return <div>Loading team...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Team Members</h2>
          <p className="text-sm text-gray-500">Manage who has access to this workspace.</p>
        </div>
        {canManage && (
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite User</DialogTitle>
              <DialogDescription>
                Send an invitation to join your workspace.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label>Email Address</label>
                <Input 
                    placeholder="colleague@company.com" 
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <label>Role</label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="admin">Admin (Manage Workspace)</SelectItem>
                        <SelectItem value="auditor">Auditor (View Only)</SelectItem>
                        <SelectItem value="member">Member (Standard Access)</SelectItem>
                    </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleInvite}>Send Invitation</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.userId}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                         <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">
                             {m.name?.[0] || m.email[0].toUpperCase()}
                         </div>
                         <div>
                             <div className="font-medium">{m.name || 'Unknown'}</div>
                             <div className="text-xs text-gray-500">{m.email}</div>
                         </div>
                    </div>
                  </TableCell>
                  <TableCell>
                      <Badge variant="outline" className="capitalize">{m.role}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                      {new Date(m.joinedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                      {/* Only show remove for others */}
                      {canManage && <Button variant="ghost" size="sm" disabled>Remove</Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
          <div className="mt-8">
              <h3 className="text-md font-medium mb-4">Pending Invitations</h3>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Sent</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invitations.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-medium text-gray-600">
                              <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4 text-gray-400" />
                                  {inv.email}
                              </div>
                          </TableCell>
                          <TableCell>
                              <Badge variant="secondary" className="capitalize">{inv.role}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                              {new Date(inv.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                  <Button variant="outline" size="sm" onClick={() => copyInviteLink(inv.token)}>
                                      <Copy className="h-3 w-3 mr-1" /> Copy Link
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => revokeInvite(inv.id)}>
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                              </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
          </div>
      )}
    </div>
  );
}
