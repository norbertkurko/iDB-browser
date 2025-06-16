import React from 'react';
import { X, Save, Trash2, Eye, Copy } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
  maxWidth?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title, maxWidth = 'max-w-2xl' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />
        
        <div className={`inline-block w-full ${maxWidth} p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};

interface ViewRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: any;
  onEdit?: (record: any) => void;
  onDelete?: (record: any) => void;
}

export const ViewRecordModal: React.FC<ViewRecordModalProps> = ({
  isOpen,
  onClose,
  record,
  onEdit,
  onDelete
}) => {
  const [expandedKeys, setExpandedKeys] = React.useState<Set<string>>(new Set());

  const toggleExpanded = (key: string) => {
    const newExpanded = new Set(expandedKeys);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedKeys(newExpanded);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const renderValue = (value: any, key: string, depth = 0): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400 italic">null</span>;
    }

    if (typeof value === 'boolean') {
      return <span className={value ? 'text-green-600' : 'text-red-600'}>{String(value)}</span>;
    }

    if (typeof value === 'number') {
      if (key.toLowerCase().includes('time') || key.toLowerCase().includes('date')) {
        const date = value > 1000000000000 ? new Date(value) : new Date(value * 1000);
        return <span>{date.toLocaleString()}</span>;
      }
      return <span>{value.toLocaleString()}</span>;
    }

    if (typeof value === 'object') {
      const isExpanded = expandedKeys.has(key);
      const jsonString = JSON.stringify(value, null, 2);
      
      return (
        <div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleExpanded(key)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              {isExpanded ? '▼' : '▶'} {Array.isArray(value) ? 'Array' : 'Object'} ({Object.keys(value).length} items)
            </button>
            <button
              onClick={() => copyToClipboard(jsonString)}
              className="text-gray-400 hover:text-gray-600"
              title="Copy JSON"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          {isExpanded && (
            <pre className="mt-2 p-3 bg-gray-50 rounded-lg text-sm overflow-x-auto border text-gray-700">
              {jsonString}
            </pre>
          )}
        </div>
      );
    }

    const stringValue = String(value);
    if (stringValue.length > 200) {
      const isExpanded = expandedKeys.has(key);
      return (
        <div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleExpanded(key)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              {isExpanded ? 'Show less' : 'Show more'} ({stringValue.length} chars)
            </button>
            <button
              onClick={() => copyToClipboard(stringValue)}
              className="text-gray-400 hover:text-gray-600"
              title="Copy text"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-1">
            {isExpanded ? (
              <pre className="whitespace-pre-wrap text-sm">{stringValue}</pre>
            ) : (
              <span>{stringValue.substring(0, 200)}...</span>
            )}
          </div>
        </div>
      );
    }

    return <span>{stringValue}</span>;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="View Record" maxWidth="max-w-4xl">
      <div className="space-y-4">
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 w-1/4">Field</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {Object.entries(record || {}).map(([key, value]) => (
                <tr key={key} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 align-top">
                    {key}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {renderValue(value, key)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          {onEdit && (
            <button
              onClick={() => {
                onEdit(record);
                onClose();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Eye className="w-4 h-4" />
              Edit Record
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => {
                onDelete(record);
                onClose();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Record
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

interface EditRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: any;
  schema?: any;
  onSave: (updatedRecord: any) => void;
  isCreating?: boolean;
}

export const EditRecordModal: React.FC<EditRecordModalProps> = ({
  isOpen,
  onClose,
  record,
  schema,
  onSave,
  isCreating = false
}) => {
  const [formData, setFormData] = React.useState<any>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (isOpen) {
      setFormData(isCreating ? {} : { ...record });
      setErrors({});
    }
  }, [isOpen, record, isCreating]);

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSave = () => {
    // Basic validation
    const newErrors: Record<string, string> = {};
    
    // Required field validation (if schema available)
    if (schema?.keyPath && !formData[schema.keyPath]) {
      newErrors[schema.keyPath] = 'This field is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave(formData);
    onClose();
  };

  const renderFormField = (key: string, value: any): React.ReactNode => {
    const hasError = errors[key];

    if (typeof value === 'boolean' || (value === undefined && key.toLowerCase().includes('enabled'))) {
      return (
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData[key] || false}
              onChange={(e) => handleFieldChange(key, e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">{key}</span>
          </label>
          {hasError && <p className="text-red-600 text-sm mt-1">{hasError}</p>}
        </div>
      );
    }

    if (typeof value === 'number' || key.toLowerCase().includes('count') || key.toLowerCase().includes('id')) {
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{key}</label>
          <input
            type="number"
            value={formData[key] || ''}
            onChange={(e) => handleFieldChange(key, Number(e.target.value))}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              hasError ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {hasError && <p className="text-red-600 text-sm mt-1">{hasError}</p>}
        </div>
      );
    }

    if (typeof value === 'object') {
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{key} (JSON)</label>
          <textarea
            value={formData[key] ? JSON.stringify(formData[key], null, 2) : ''}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleFieldChange(key, parsed);
              } catch {
                handleFieldChange(key, e.target.value);
              }
            }}
            rows={4}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm ${
              hasError ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {hasError && <p className="text-red-600 text-sm mt-1">{hasError}</p>}
        </div>
      );
    }

    // String or default
    const stringValue = String(formData[key] || '');
    const isLongText = stringValue.length > 100;

    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{key}</label>
        {isLongText ? (
          <textarea
            value={stringValue}
            onChange={(e) => handleFieldChange(key, e.target.value)}
            rows={3}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              hasError ? 'border-red-300' : 'border-gray-300'
            }`}
          />
        ) : (
          <input
            type="text"
            value={stringValue}
            onChange={(e) => handleFieldChange(key, e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              hasError ? 'border-red-300' : 'border-gray-300'
            }`}
          />
        )}
        {hasError && <p className="text-red-600 text-sm mt-1">{hasError}</p>}
      </div>
    );
  };

  const fields = isCreating 
    ? [...new Set([...Object.keys(record || {}), ...(schema?.keyPath ? [schema.keyPath] : [])])]
    : Object.keys(record || {});

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={isCreating ? 'Create New Record' : 'Edit Record'}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        <div className="max-h-96 overflow-y-auto space-y-4">
          {fields.map((key) => (
            <div key={key}>
              {renderFormField(key, formData[key])}
            </div>
          ))}
          
          {isCreating && (
            <div>
              <button
                type="button"
                onClick={() => {
                  const fieldName = prompt('Enter field name:');
                  if (fieldName && !fields.includes(fieldName)) {
                    handleFieldChange(fieldName, '');
                  }
                }}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                + Add Field
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            {isCreating ? 'Create' : 'Save Changes'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: any;
  onConfirm: (record: any) => void;
  keyField?: string;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  record,
  onConfirm,
  keyField = 'id'
}) => {
  const recordKey = record?.[keyField] || 'Unknown';
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm Delete" maxWidth="max-w-md">
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
          <Trash2 className="w-6 h-6 text-red-600" />
          <div>
            <p className="text-sm font-medium text-red-800">
              Are you sure you want to delete this record?
            </p>
            <p className="text-sm text-red-600">
              Record: {recordKey}
            </p>
          </div>
        </div>
        
        <p className="text-sm text-gray-600">
          This action cannot be undone. The record will be permanently removed from the database.
        </p>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm(record);
              onClose();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Record
          </button>
        </div>
      </div>
    </Modal>
  );
};