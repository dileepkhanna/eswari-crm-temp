import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, XCircle, Clock, Upload } from 'lucide-react';
import { apiClient } from '../../lib/api';

interface LoanDocument {
  id: number;
  loan: number;
  document_type: string;
  document_type_display: string;
  status: string;
  status_display: string;
  file_path: string;
  notes: string;
  verified_by: number | null;
  verified_by_name: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Props {
  loanId: number;
}

export default function LoanDocumentChecklist({ loanId }: Props) {
  const [documents, setDocuments] = useState<LoanDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const documentTypes = [
    { value: 'identity', label: 'Identity Proof (Aadhaar/PAN/Passport)' },
    { value: 'address', label: 'Address Proof' },
    { value: 'income', label: 'Income Proof (Salary Slips/ITR)' },
    { value: 'bank_statement', label: 'Bank Statement (6 months)' },
    { value: 'business_proof', label: 'Business Proof (GST/Registration)' },
    { value: 'property_docs', label: 'Property Documents' },
    { value: 'photo', label: 'Passport Size Photo' },
    { value: 'form16', label: 'Form 16' },
    { value: 'itr', label: 'Income Tax Returns' },
    { value: 'balance_sheet', label: 'Balance Sheet' },
    { value: 'other', label: 'Other' },
  ];

  useEffect(() => {
    fetchDocuments();
  }, [loanId]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/capital/loan-documents/', {
        params: { loan: loanId },
      } as any);
      setDocuments(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const addDocument = async (documentType: string) => {
    try {
      await apiClient.post('/capital/loan-documents/', {
        loan: loanId,
        document_type: documentType,
        status: 'pending',
      });
      fetchDocuments();
    } catch (error) {
      console.error('Error adding document:', error);
    }
  };

  const verifyDocument = async (documentId: number) => {
    try {
      await apiClient.post(`/capital/loan-documents/${documentId}/verify/`);
      fetchDocuments();
    } catch (error) {
      console.error('Error verifying document:', error);
    }
  };

  const rejectDocument = async (documentId: number, notes: string) => {
    try {
      await apiClient.post(`/capital/loan-documents/${documentId}/reject/`, { notes });
      fetchDocuments();
    } catch (error) {
      console.error('Error rejecting document:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'submitted':
        return <Clock className="w-5 h-5 text-blue-600" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800';
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgress = () => {
    if (documents.length === 0) return 0;
    const verified = documents.filter((doc) => doc.status === 'verified').length;
    return Math.round((verified / documents.length) * 100);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const existingTypes = documents.map((doc) => doc.document_type);
  const availableTypes = documentTypes.filter((type) => !existingTypes.includes(type.value));

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Document Checklist</h3>
        <div className="text-sm text-gray-600">
          {documents.filter((d) => d.status === 'verified').length} / {documents.length} verified
        </div>
      </div>

      {documents.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{ width: `${getProgress()}%` }}
              ></div>
            </div>
            <span className="text-sm font-medium text-gray-700">{getProgress()}%</span>
          </div>
        </div>
      )}

      <div className="space-y-3 mb-4">
        {documents.map((doc) => (
          <div key={doc.id} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
            <div className="flex-shrink-0 mt-1">{getStatusIcon(doc.status)}</div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 text-sm">{doc.document_type_display}</h4>
                  {doc.notes && <p className="text-xs text-gray-600 mt-1">{doc.notes}</p>}
                  {doc.verified_at && (
                    <p className="text-xs text-gray-500 mt-1">
                      Verified by {doc.verified_by_name} on{' '}
                      {new Date(doc.verified_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${getStatusColor(doc.status)}`}>
                  {doc.status_display}
                </span>
              </div>

              {doc.status === 'submitted' && (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => verifyDocument(doc.id)}
                    className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Verify
                  </button>
                  <button
                    onClick={() => {
                      const notes = prompt('Rejection reason:');
                      if (notes) rejectDocument(doc.id, notes);
                    }}
                    className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {availableTypes.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Add Document Type
          </label>
          <select
            onChange={(e) => {
              if (e.target.value) {
                addDocument(e.target.value);
                e.target.value = '';
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select document type...</option>
            {availableTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
