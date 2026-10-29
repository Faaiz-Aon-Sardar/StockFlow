import React, { useState } from 'react';
import {
  ShieldCheck,
  Plus,
  Users,
  Check,
  X,
  Lock,
  Database,
  ExternalLink,
  ShieldAlert,
  UserCheck,
  Trash2
} from 'lucide-react';
import { StaffMember, StaffRole } from '../types';
import { storage } from '../services/storage';
import { Modal } from '../components/ui/Modal';

interface StaffPageProps {
  activeRole: StaffRole;
  onChangeRole: (role: StaffRole) => void;
}

export const StaffPage: React.FC<StaffPageProps> = ({ activeRole, onChangeRole }) => {
  const [staff, setStaff] = useState<StaffMember[]>(storage.getStaff());
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<StaffRole>('sales');
  const [department, setDepartment] = useState('Sales & Marketing');

  const reloadData = () => {
    setStaff(storage.getStaff());
  };

  const handleOpenAdd = () => {
    setEditingStaff(null);
    setName('');
    setEmail('');
    setPhone('');
    setRole('sales');
    setDepartment('Sales & Marketing');
    setShowAddModal(true);
  };

  const handleOpenEdit = (member: StaffMember) => {
    setEditingStaff(member);
    setName(member.name);
    setEmail(member.email);
    setPhone(member.phone);
    setRole(member.role);
    setDepartment(member.department);
    setShowAddModal(true);
  };

  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    storage.saveStaff({
      id: editingStaff ? editingStaff.id : undefined,
      name,
      email,
      phone,
      role,
      department
    });

    reloadData();
    setShowAddModal(false);
  };

  const handleDeleteStaff = (member: StaffMember) => {
    if (member.role === 'owner') {
      alert('The primary business Owner account cannot be deleted.');
      return;
    }
    if (window.confirm(`Are you sure you want to remove ${member.name} from staff permissions?`)) {
      storage.deleteStaff(member.id);
      reloadData();
    }
  };

  // Permission Matrix Definition
  const permissionsMatrix = [
    { module: 'Operations Dashboard & Financial KPIs', owner: true, sales: true, store: true, accounts: true },
    { module: 'Catalog & Wholesale Tiers (View)', owner: true, sales: true, store: true, accounts: true },
    { module: 'Catalog & Purchase Cost (Edit)', owner: true, sales: false, store: false, accounts: false },
    { module: 'Physical Stock Adjustments (Audit Log)', owner: true, sales: false, store: true, accounts: false },
    { module: 'Customer Accounts & Credit Limits', owner: true, sales: true, store: false, accounts: true },
    { module: 'Supplier Accounts & Vendor Dues', owner: true, sales: false, store: true, accounts: true },
    { module: 'Create & Confirm Sales Orders', owner: true, sales: true, store: false, accounts: false },
    { module: 'Vendor Purchase Orders', owner: true, sales: false, store: true, accounts: true },
    { module: 'Inward Goods Receipt (Stock +)', owner: true, sales: false, store: true, accounts: false },
    { module: 'Warehouse Dispatches (Stock -)', owner: true, sales: true, store: true, accounts: false },
    { module: 'GST Tax Invoicing & Locking', owner: true, sales: true, store: false, accounts: true },
    { module: 'Record Payments & Invoice Allocation', owner: true, sales: false, store: false, accounts: true },
    { module: 'Export Financial Ledgers & Audits', owner: true, sales: false, store: true, accounts: true },
    { module: 'Staff Permissions & Business Settings', owner: true, sales: false, store: false, accounts: false }
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Notice on Prototype vs Supabase Security */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
        <Database className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 leading-relaxed">
          <p className="font-bold text-sm">Supabase Auth & Row Level Security (RLS) Prepared</p>
          <p className="mt-1">
            This prototype demonstrates business role segmentation and UI permission gating. In production, this architecture maps directly to Supabase Auth UUIDs and PostgreSQL RLS policies where staff queries are validated server-side by JWT claims rather than client-only state.
          </p>
        </div>
      </div>

      {/* Staff Directory & Role Quick Switch */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Wholesale Staff & Assigned Roles</h3>
            <p className="text-xs text-slate-500">
              Click "Switch Perspective" on any employee to test the dashboard through their role's permissions
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-2xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Team Member</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {staff.map((m) => {
            const isCurrent = activeRole === m.role;
            return (
              <div
                key={m.id}
                className={`p-4 rounded-lg border text-xs space-y-3 transition-all ${
                  isCurrent
                    ? 'border-blue-500 bg-blue-50/40 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="capitalize font-mono font-semibold px-2 py-0.5 bg-slate-100 rounded text-[11px] text-slate-700 border border-slate-200">
                    {m.role}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded">
                      Active
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{m.name}</h4>
                  <p className="text-slate-500 text-[11px] mt-0.5">{m.department}</p>
                </div>

                <div className="space-y-1 text-slate-600 text-[11px] font-mono">
                  <p className="truncate">{m.email}</p>
                  <p>{m.phone}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(m)}
                      className="text-xs text-slate-500 hover:text-slate-700"
                    >
                      Edit
                    </button>
                    {m.role !== 'owner' && (
                      <button
                        onClick={() => handleDeleteStaff(m)}
                        className="text-xs text-rose-500 hover:text-rose-700 p-0.5"
                        title="Remove employee record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => onChangeRole(m.role)}
                    className={`px-2 py-1 text-[11px] font-semibold rounded transition-colors ${
                      isCurrent
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {isCurrent ? 'Current View' : 'Switch Perspective'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Role-Based Permissions Matrix Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-900">Enterprise Role-Based Access Control (RBAC) Matrix</h3>
          <p className="text-xs text-slate-500">
            Granular access boundaries enforced across operations, catalog, orders, and financial records
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-medium border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Operational Capability / Action</th>
                <th className="py-2.5 px-4 text-center">Owner (Admin)</th>
                <th className="py-2.5 px-4 text-center">Sales Staff</th>
                <th className="py-2.5 px-4 text-center">Store Staff</th>
                <th className="py-2.5 px-4 text-center">Accounts Staff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {permissionsMatrix.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 font-medium text-slate-900">{row.module}</td>
                  <td className="py-2.5 px-4 text-center">
                    {row.owner ? (
                      <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-slate-300 mx-auto" />
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    {row.sales ? (
                      <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-slate-300 mx-auto" />
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    {row.store ? (
                      <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-slate-300 mx-auto" />
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    {row.accounts ? (
                      <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-slate-300 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Staff Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={editingStaff ? 'Edit Staff Profile' : 'Add Team Member'}
        subtitle="Manage business staff member credentials and functional role assignment"
        maxWidth="md"
      >
        <form onSubmit={handleSaveStaff} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Pooja Verma"
              className="w-full px-3 py-1.5 border border-slate-200 rounded-md"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@stockflowhub.com"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98200 00000"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Operational Role *</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as StaffRole)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-white capitalize"
              >
                <option value="owner">Owner (Full Admin)</option>
                <option value="sales">Sales Staff</option>
                <option value="store">Store Staff (Warehouse)</option>
                <option value="accounts">Accounts Staff (Billing)</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-2xs"
            >
              {editingStaff ? 'Update Member' : 'Add Member'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
