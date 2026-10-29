import React, { useState } from 'react';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Download,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  FileText,
  AlertCircle,
  Database,
} from 'lucide-react';
import {
  parseSpreadsheetFile,
  autoMapColumns,
  validateAndStageImport,
  downloadRejectedRowsReport,
  downloadSampleTemplate,
  commitImportedRows,
  type ImportRecordType,
  type StagedImportResult,
  type StagedRow,
} from '../../services/importService';
import { useAuth } from '../../context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

interface ImportWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRecordType?: ImportRecordType;
}

type WizardStep =
  | 'upload_and_type' // Step 1 & 2: Select file and record type
  | 'mapping'         // Step 3: Preview and adjust column mapping
  | 'validation'      // Step 4, 5, 6, 7: Validate, duplicate check, invalid rows review, rejected report download
  | 'summary';        // Step 8 & 9: Confirm & Import summary

export const ImportWizardModal: React.FC<ImportWizardModalProps> = ({
  isOpen,
  onClose,
  defaultRecordType = 'products',
}) => {
  const { currentBusiness } = useAuth();
  const queryClient = useQueryClient();

  // State
  const [currentStep, setCurrentStep] = useState<WizardStep>('upload_and_type');
  const [recordType, setRecordType] = useState<ImportRecordType>(defaultRecordType);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<{ headers: string[]; rows: Record<string, any>[] } | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [stagedResult, setStagedResult] = useState<StagedImportResult | null>(null);
  const [selectedFilterTab, setSelectedFilterTab] = useState<'all' | 'valid' | 'invalid'>('all');
  
  // Loading & Execution states
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [committedSummary, setCommittedSummary] = useState<{ importedCount: number; failedCount: number } | null>(null);

  if (!isOpen) return null;

  // Step 1: File selection & parsing
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrorMsg(null);
    setIsProcessing(true);

    try {
      const parsed = await parseSpreadsheetFile(selectedFile);
      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        throw new Error('The uploaded spreadsheet contains no data or header rows.');
      }
      setParsedData(parsed);

      // Automatically map columns based on header aliases
      const initialMapping = autoMapColumns(recordType, parsed.headers);
      setColumnMapping(initialMapping);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to parse file. Please provide a valid CSV or XLSX file.');
      setFile(null);
      setParsedData(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // Step 2 -> 3 transition: Move to Mapping
  const handleProceedToMapping = () => {
    if (!file || !parsedData) {
      setErrorMsg('Please select a valid CSV or XLSX file first.');
      return;
    }
    setErrorMsg(null);
    // Refresh mapping in case record type changed
    const mapping = autoMapColumns(recordType, parsedData.headers);
    setColumnMapping(mapping);
    setCurrentStep('mapping');
  };

  // Step 3 -> 4: Validate and stage records
  const handleProceedToValidation = async () => {
    if (!parsedData || !currentBusiness) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const result = await validateAndStageImport({
        businessId: currentBusiness.id,
        recordType,
        rawRows: parsedData.rows,
        columnMapping,
      });
      setStagedResult(result);
      setCurrentStep('validation');
    } catch (err: any) {
      setErrorMsg(err.message || 'Validation failed. Check your data and mappings.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Step 8 -> 9: Commit import
  const handleConfirmImport = async () => {
    if (!stagedResult || !currentBusiness) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const summary = await commitImportedRows(currentBusiness.id, recordType, stagedResult.validRows);
      setCommittedSummary(summary);
      setCurrentStep('summary');

      // Invalidate relevant React Query caches
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    } catch (err: any) {
      setErrorMsg(err.message || 'Import failed while writing rows to database.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset and restart
  const handleReset = () => {
    setCurrentStep('upload_and_type');
    setFile(null);
    setParsedData(null);
    setColumnMapping({});
    setStagedResult(null);
    setCommittedSummary(null);
    setErrorMsg(null);
  };

  // Filter staged rows for preview table
  const displayedRows: StagedRow[] = stagedResult
    ? stagedResult.allRows.filter((r) => {
        if (selectedFilterTab === 'valid') return r.status === 'valid';
        if (selectedFilterTab === 'invalid') return r.status === 'invalid';
        return true;
      })
    : [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 rounded-xl">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Data Import Wizard</h2>
              <p className="text-xs text-slate-500">
                Safely validate and stage spreadsheet records into StockFlow
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Progress Steps Bar */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-medium">
          <div className="flex items-center space-x-6">
            <div
              className={`flex items-center space-x-2 ${
                currentStep === 'upload_and_type' ? 'text-blue-600 font-semibold' : 'text-slate-400'
              }`}
            >
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs border border-current">
                1
              </span>
              <span>Upload & Type</span>
            </div>
            <span className="text-slate-300">→</span>
            <div
              className={`flex items-center space-x-2 ${
                currentStep === 'mapping' ? 'text-blue-600 font-semibold' : 'text-slate-400'
              }`}
            >
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs border border-current">
                2
              </span>
              <span>Column Mapping</span>
            </div>
            <span className="text-slate-300">→</span>
            <div
              className={`flex items-center space-x-2 ${
                currentStep === 'validation' ? 'text-blue-600 font-semibold' : 'text-slate-400'
              }`}
            >
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs border border-current">
                3
              </span>
              <span>Validation & Review</span>
            </div>
            <span className="text-slate-300">→</span>
            <div
              className={`flex items-center space-x-2 ${
                currentStep === 'summary' ? 'text-emerald-600 font-semibold' : 'text-slate-400'
              }`}
            >
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs border border-current">
                4
              </span>
              <span>Summary</span>
            </div>
          </div>
        </div>

        {/* Error notification banner */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-center space-x-3 text-rose-700 dark:text-rose-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Modal Body / Steps */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* STEP 1: Select Type & Upload File */}
          {currentStep === 'upload_and_type' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  1. Select Record Type
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { type: 'products' as ImportRecordType, label: 'Products & Inventory', desc: 'SKU, name, category, pricing, stock' },
                    { type: 'customers' as ImportRecordType, label: 'Customers', desc: 'Customer codes, names, phones, GSTIN' },
                    { type: 'suppliers' as ImportRecordType, label: 'Suppliers', desc: 'Supplier codes, names, contact info' },
                  ].map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setRecordType(item.type)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        recordType === item.type
                          ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-600/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <p className="font-semibold text-sm text-slate-900 dark:text-white">{item.label}</p>
                      <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    2. Upload Spreadsheet (.xlsx or .csv)
                  </label>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-400">Download Template:</span>
                    <button
                      type="button"
                      onClick={() => downloadSampleTemplate(recordType, 'xlsx')}
                      className="text-xs text-blue-600 hover:underline flex items-center space-x-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>XLSX</span>
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => downloadSampleTemplate(recordType, 'csv')}
                      className="text-xs text-blue-600 hover:underline flex items-center space-x-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>CSV</span>
                    </button>
                  </div>
                </div>

                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-2xl p-8 text-center transition-all bg-slate-50/50 dark:bg-slate-800/20">
                  <UploadCloud className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {file ? file.name : 'Click to select or drag and drop your spreadsheet here'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Supports Microsoft Excel (.xlsx) and CSV (.csv)</p>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                    id="spreadsheet-file-input"
                  />
                  <label
                    htmlFor="spreadsheet-file-input"
                    className="mt-4 inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 cursor-pointer shadow-xs"
                  >
                    Browse Files
                  </label>
                </div>
              </div>

              {parsedData && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between text-emerald-800 dark:text-emerald-300 text-sm">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>
                      Successfully read <strong>{parsedData.rows.length}</strong> rows and{' '}
                      <strong>{parsedData.headers.length}</strong> columns.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Column Mapping */}
          {currentStep === 'mapping' && parsedData && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                  Map Spreadsheet Columns to StockFlow Fields
                </h3>
                <p className="text-xs text-slate-500">
                  We automatically matched recognized headers. Confirm or adjust the mappings below.
                </p>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Spreadsheet Column Header</th>
                      <th className="px-4 py-3">Sample Value (Row 1)</th>
                      <th className="px-4 py-3">Map to StockFlow Field</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {parsedData.headers.map((hdr) => {
                      const sampleVal = parsedData.rows[0]?.[hdr];
                      const currentMappedField = columnMapping[hdr] || '';

                      return (
                        <tr key={hdr} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                            {hdr}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500 font-mono">
                            {sampleVal !== undefined && sampleVal !== null ? String(sampleVal) : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={currentMappedField}
                              onChange={(e) => {
                                const val = e.target.value;
                                setColumnMapping((prev) => {
                                  const updated = { ...prev };
                                  if (val) {
                                    updated[hdr] = val;
                                  } else {
                                    delete updated[hdr];
                                  }
                                  return updated;
                                });
                              }}
                              className="w-full text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-2 text-slate-800 dark:text-slate-200"
                            >
                              <option value="">— Do Not Import —</option>
                              {recordType === 'products' && (
                                <>
                                  <option value="name">Product Name *</option>
                                  <option value="sku">SKU *</option>
                                  <option value="category">Category</option>
                                  <option value="brand">Brand</option>
                                  <option value="unit">Unit of Measure (pcs, kg, box, etc.)</option>
                                  <option value="selling_price">Selling Price *</option>
                                  <option value="purchase_price">Purchase Price</option>
                                  <option value="current_stock">Initial Stock Quantity</option>
                                  <option value="min_stock_level">Min Stock Alert Level</option>
                                  <option value="hsn_code">HSN Code</option>
                                  <option value="tax_rate">Tax Rate %</option>
                                </>
                              )}
                              {(recordType === 'customers' || recordType === 'suppliers') && (
                                <>
                                  <option value="name">Party Name *</option>
                                  <option value="code">Party Code</option>
                                  <option value="phone">Phone Number *</option>
                                  <option value="email">Email Address</option>
                                  <option value="gstin">GSTIN</option>
                                  <option value="address">Address</option>
                                  <option value="city">City</option>
                                  <option value="state">State</option>
                                  <option value="credit_limit">Credit Limit (₹)</option>
                                  <option value="payment_terms">Payment Terms (e.g. net_30)</option>
                                </>
                              )}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 3: Staging & Validation Results */}
          {currentStep === 'validation' && stagedResult && (
            <div className="space-y-4">
              {/* Validation Summary Cards */}
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-500 font-medium">Total Rows</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{stagedResult.totalRows}</p>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <p className="text-xs text-emerald-600 font-medium">Valid Ready to Import</p>
                  <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                    {stagedResult.validRows.length}
                  </p>
                </div>
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800">
                  <p className="text-xs text-rose-600 font-medium">Invalid / Rejected</p>
                  <p className="text-xl font-bold text-rose-700 dark:text-rose-400 mt-1">
                    {stagedResult.invalidRows.length}
                  </p>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-amber-600 font-medium">Duplicates Flagged</p>
                  <p className="text-xl font-bold text-amber-700 dark:text-amber-400 mt-1">
                    {stagedResult.duplicateCount}
                  </p>
                </div>
              </div>

              {/* Actionable Error & Rejection Export */}
              {stagedResult.invalidRows.length > 0 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-3 text-amber-800 dark:text-amber-300 text-sm">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <span>
                      {stagedResult.invalidRows.length} rows have missing required fields, invalid formats, or duplicate SKUs.
                      You can download a detailed rejection report to correct them.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadRejectedRowsReport(recordType, stagedResult.invalidRows)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 shadow-xs flex-shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Rejected Rows</span>
                  </button>
                </div>
              )}

              {/* Table Tabs */}
              <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                <button
                  type="button"
                  onClick={() => setSelectedFilterTab('all')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    selectedFilterTab === 'all'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  All Rows ({stagedResult.totalRows})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFilterTab('valid')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    selectedFilterTab === 'valid'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Valid Rows ({stagedResult.validRows.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFilterTab('invalid')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    selectedFilterTab === 'invalid'
                      ? 'bg-rose-600 text-white'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Invalid Rows ({stagedResult.invalidRows.length})
                </button>
              </div>

              {/* Rows Preview Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 text-slate-500 font-semibold uppercase">
                    <tr>
                      <th className="px-3 py-2 w-16">Row #</th>
                      <th className="px-3 py-2 w-24">Status</th>
                      <th className="px-3 py-2">Identifier / Key</th>
                      <th className="px-3 py-2">Name / Description</th>
                      <th className="px-3 py-2">Actionable Error / Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {displayedRows.slice(0, 50).map((row) => (
                      <tr
                        key={row.rowNumber}
                        className={
                          row.status === 'invalid'
                            ? 'bg-rose-50/40 dark:bg-rose-950/20'
                            : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                        }
                      >
                        <td className="px-3 py-2 text-slate-500 font-mono">{row.rowNumber}</td>
                        <td className="px-3 py-2">
                          {row.status === 'valid' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                              Rejected
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono font-medium">
                          {row.data.sku || row.data.code || row.data.phone || '—'}
                        </td>
                        <td className="px-3 py-2 truncate max-w-xs">{row.data.name || '—'}</td>
                        <td className="px-3 py-2 text-rose-600 dark:text-rose-400">
                          {row.errors.join('; ') || 'Ready for import'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 4: Import Summary Receipt */}
          {currentStep === 'summary' && committedSummary && (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Import Successfully Executed!</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                StockFlow has safely staged and committed{' '}
                <strong className="text-emerald-600 dark:text-emerald-400">
                  {committedSummary.importedCount}
                </strong>{' '}
                new records into the database.
              </p>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 max-w-sm mx-auto text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Record Type:</span>
                  <span className="font-semibold uppercase">{recordType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Rows Written:</span>
                  <span className="font-semibold text-emerald-600">{committedSummary.importedCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Failed / Skipped:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {committedSummary.failedCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Audit Status:</span>
                  <span className="font-semibold text-blue-600">Logged to System</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer / Navigation Buttons */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            {currentStep !== 'upload_and_type' && currentStep !== 'summary' && (
              <button
                type="button"
                onClick={() => {
                  if (currentStep === 'mapping') setCurrentStep('upload_and_type');
                  if (currentStep === 'validation') setCurrentStep('mapping');
                }}
                disabled={isProcessing}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {currentStep === 'upload_and_type' && (
              <button
                type="button"
                onClick={handleProceedToMapping}
                disabled={!file || !parsedData || isProcessing}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-xs transition-colors"
              >
                <span>Continue to Column Mapping</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {currentStep === 'mapping' && (
              <button
                type="button"
                onClick={handleProceedToValidation}
                disabled={isProcessing}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-xs transition-colors"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Validating Records...</span>
                  </>
                ) : (
                  <>
                    <span>Validate & Check Duplicates</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}

            {currentStep === 'validation' && (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={!stagedResult || stagedResult.validRows.length === 0 || isProcessing}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-xs transition-colors"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Committing Records...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4" />
                    <span>
                      Confirm & Import {stagedResult?.validRows.length ?? 0} Records
                    </span>
                  </>
                )}
              </button>
            )}

            {currentStep === 'summary' && (
              <button
                type="button"
                onClick={() => {
                  handleReset();
                  onClose();
                }}
                className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-semibold shadow-xs"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
