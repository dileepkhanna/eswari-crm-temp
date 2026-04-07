import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, XCircle, AlertCircle, Play } from 'lucide-react';
import { apiClient } from '../../lib/api';

interface ApprovalStage {
  id: number;
  loan: number;
  stage: string;
  stage_display: string;
  status: string;
  status_display: string;
  assigned_to: number | null;
  assigned_to_name: string | null;
  notes: string;
  completed_by: number | null;
  completed_by_name: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Props {
  loanId: number;
}

export default function LoanApprovalWorkflow({ loanId }: Props) {
  const [stages, setStages] = useState<ApprovalStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState<ApprovalStage | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchStages();
  }, [loanId]);

  const fetchStages = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/capital/loan-approval-stages/', {
        params: { loan: loanId },
      });
      setStages(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching approval stages:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeWorkflow = async () => {
    try {
      await apiClient.post('/capital/loan-approval-stages/initialize_workflow/', {
        loan_id: loanId,
      });
      fetchStages();
    } catch (error) {
      console.error('Error initializing workflow:', error);
    }
  };

  const completeStage = async (stageId: number) => {
    try {
      await apiClient.post(`/capital/loan-approval-stages/${stageId}/complete/`, {
        notes,
      });
      setSelectedStage(null);
      setNotes('');
      fetchStages();
    } catch (error) {
      console.error('Error completing stage:', error);
    }
  };

  const rejectStage = async (stageId: number) => {
    try {
      await apiClient.post(`/capital/loan-approval-stages/${stageId}/reject/`, {
        notes,
      });
      setSelectedStage(null);
      setNotes('');
      fetchStages();
    } catch (error) {
      console.error('Error rejecting stage:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'in_progress':
        return <Play className="w-6 h-6 text-blue-600" />;
      case 'rejected':
        return <XCircle className="w-6 h-6 text-red-600" />;
      case 'on_hold':
        return <AlertCircle className="w-6 h-6 text-yellow-600" />;
      default:
        return <Clock className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'on_hold':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (stages.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Loan Approval Workflow</h3>
        <p className="text-gray-600 mb-4">No approval workflow initialized for this loan.</p>
        <button
          onClick={initializeWorkflow}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Initialize Workflow
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-6">Loan Approval Workflow</h3>

      <div className="space-y-4">
        {stages.map((stage, index) => (
          <div key={stage.id} className="relative">
            {index < stages.length - 1 && (
              <div className="absolute left-3 top-12 bottom-0 w-0.5 bg-gray-200"></div>
            )}
            
            <div className="flex gap-4">
              <div className="flex-shrink-0">{getStatusIcon(stage.status)}</div>
              
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900">{stage.stage_display}</h4>
                    {stage.assigned_to_name && (
                      <p className="text-sm text-gray-600">Assigned to: {stage.assigned_to_name}</p>
                    )}
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(stage.status)}`}>
                    {stage.status_display}
                  </span>
                </div>

                {stage.notes && (
                  <p className="text-sm text-gray-600 mb-2">{stage.notes}</p>
                )}

                {stage.completed_at && (
                  <p className="text-xs text-gray-500">
                    Completed by {stage.completed_by_name} on{' '}
                    {new Date(stage.completed_at).toLocaleDateString()}
                  </p>
                )}

                {stage.status === 'pending' && (
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => setSelectedStage(stage)}
                      className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                    >
                      Update Status
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedStage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Update Stage: {selectedStage.stage_display}</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={4}
                placeholder="Add notes about this stage..."
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => completeStage(selectedStage.id)}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Complete
              </button>
              <button
                onClick={() => rejectStage(selectedStage.id)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Reject
              </button>
              <button
                onClick={() => {
                  setSelectedStage(null);
                  setNotes('');
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
