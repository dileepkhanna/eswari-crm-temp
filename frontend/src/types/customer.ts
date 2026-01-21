export type CallStatus = 'pending' | 'answered' | 'not_answered' | 'busy' | 'no_response' | 'custom';

export interface Customer {
  id: string;
  name?: string;
  phone: string;
  callStatus: CallStatus;
  customCallStatus?: string; // For custom status
  assignedTo?: string; // Employee ID
  assignedToName?: string; // Employee name
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
  callDate?: Date; // When the call was made
  scheduledDate?: Date; // When this customer is scheduled to be called
  isConverted: boolean; // Whether converted to lead
  convertedLeadId?: string; // ID of the lead if converted
  notes?: string;
}

export interface CallAllocation {
  id: string;
  employeeId: string;
  employeeName: string;
  date: Date;
  totalAllocated: number;
  completed: number;
  pending: number;
  createdBy: string;
  createdAt: Date;
}