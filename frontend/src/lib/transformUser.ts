/**
 * Shared utility to transform a raw Django API user object into the DBUser shape.
 * Use this in UserList, AdminASEEmployees, AdminCapitalEmployees, AdminEswariEmployees
 * so all panels stay in sync automatically.
 */
export function transformUser(user: any) {
  return {
    id: user.id.toString(),
    user_id: user.username,
    name: `${user.first_name} ${user.last_name}`.trim() || user.username,
    email: user.email,
    phone: user.phone || null,
    address: null,
    designation: user.designation || null,
    joining_date: user.joining_date || null,
    role: user.role,
    // Derive status from actual backend flags
    status: user.is_active ? 'active' : (user.pending_approval ? 'pending' : 'inactive'),
    manager_id: user.manager?.toString() || null,
    manager_name: user.manager_name || null,
    company: user.company_info || user.company,
    company_name: user.company_info?.name || null,
    created_at: user.created_at,
    updated_at: user.created_at,
    // Personal & banking details
    permanent_address: user.permanent_address || null,
    present_address: user.present_address || null,
    bank_name: user.bank_name || null,
    bank_account_number: user.bank_account_number || null,
    bank_ifsc: user.bank_ifsc || null,
    blood_group: user.blood_group || null,
    aadhar_number: user.aadhar_number || null,
    // Emergency contacts
    emergency_contact1_name: user.emergency_contact1_name || null,
    emergency_contact1_phone: user.emergency_contact1_phone || null,
    emergency_contact1_relation: user.emergency_contact1_relation || null,
    emergency_contact2_name: user.emergency_contact2_name || null,
    emergency_contact2_phone: user.emergency_contact2_phone || null,
    emergency_contact2_relation: user.emergency_contact2_relation || null,
  };
}
