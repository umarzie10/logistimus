"use client";

import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { FileText, Upload, Download, Trash2, ShieldCheck, Plus, X, CheckCircle2 } from "lucide-react";

interface DocumentItem {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedAt: string;
  category: "CMR / Bill of Lading" | "Customs Declaration" | "Driver License" | "Inspection Certificate";
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [docName, setDocName] = useState("");
  const [category, setCategory] = useState<DocumentItem["category"]>("CMR / Bill of Lading");

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim()) return;

    const newDoc: DocumentItem = {
      id: `DOC-${Math.floor(1000 + Math.random() * 9000)}`,
      name: docName.trim(),
      type: "PDF Document",
      size: "1.4 MB",
      uploadedAt: "Just now",
      category: category,
    };

    setDocuments((prev) => [newDoc, ...prev]);
    setDocName("");
    setUploadOpen(false);
  };

  const handleDelete = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <AppShell
      title="Document Vault & Consignment Records"
      subtitle="Encrypted document storage, e-CMR waybills, customs manifests, and driver credentials"
    >
      <div className="max-w-5xl space-y-6">
        {/* Metric Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE]">
            <div className="text-xs font-semibold text-[#061336] uppercase tracking-wider">Archived Documents</div>
            <div className="text-2xl font-light tabular-nums text-[#061336] mt-1">{documents.length} Files</div>
            <div className="text-xs text-[#3F5C96] mt-0.5">Workspace Vault</div>
          </div>
          <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE]">
            <div className="text-xs font-semibold text-[#061336] uppercase tracking-wider">Storage Engine</div>
            <div className="text-2xl font-light tabular-nums text-royal mt-1">S3 Private</div>
            <div className="text-xs text-muted mt-0.5 font-medium">Encrypted at Rest</div>
          </div>
          <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE]">
            <div className="text-xs font-semibold text-[#061336] uppercase tracking-wider">Presigned Access</div>
            <div className="text-2xl font-light tabular-nums text-[#0E2F76] mt-1">10 min TTL</div>
            <div className="text-xs text-[#3F5C96] mt-0.5">Signed URLs</div>
          </div>
          <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE]">
            <div className="text-xs font-semibold text-[#061336] uppercase tracking-wider">Tenant Scope</div>
            <div className="text-2xl font-light tabular-nums text-royal mt-1">Isolated</div>
            <div className="text-xs text-muted mt-0.5 font-medium">Postgres RLS Guarded</div>
          </div>
        </div>

        {/* Action Header */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0E2F76] hover:bg-[#061336] text-xs font-medium text-[#FFFFFF] transition-colors"
          >
            <Upload className="w-4 h-4" /> Upload Document
          </button>
        </div>

        {/* Documents Table or Empty State */}
        <div className="p-6 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] space-y-4">
          <div className="flex items-center justify-between border-b border-[#CFDBEE] pb-3">
            <div>
              <h2 className="font-light text-base text-[#061336]">Uploaded Consignment Documents</h2>
              <p className="text-xs text-[#3F5C96]">Encrypted PDF waybills, bills of lading, and inspection sheets</p>
            </div>
            <span className="text-xs font-mono text-[#3F5C96]">{documents.length} files stored</span>
          </div>

          {documents.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#F4FEFF] border border-[#CFDBEE] text-[#0E2F76] flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-base font-light text-[#061336]">No Documents in Workspace Vault</h3>
              <p className="text-xs text-[#3F5C96] max-w-sm mx-auto leading-relaxed">
                Upload your CMR waybills, driver medical certificates, customs declarations, or insurance cards. Files are stored private in S3 object storage with time-limited signed URLs.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setUploadOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0E2F76] text-white text-xs font-medium hover:bg-[#061336]"
                >
                  <Upload className="w-3.5 h-3.5" /> Upload First Document
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#CFDBEE] text-[10px] font-mono uppercase text-[#3F5C96]">
                    <th className="pb-3">Document Name</th>
                    <th className="pb-3">Category</th>
                    <th className="pb-3">Format & Size</th>
                    <th className="pb-3">Uploaded</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#CFDBEE]/50">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-[#F4FEFF] transition-colors">
                      <td className="py-3 font-medium text-[#061336] flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#0E2F76]" />
                        <div>
                          <div>{doc.name}</div>
                          <div className="text-[10px] font-mono text-[#3F5C96]">{doc.id}</div>
                        </div>
                      </td>
                      <td className="py-3 text-[11px] text-[#3F5C96]">{doc.category}</td>
                      <td className="py-3 font-mono text-[11px] text-[#3F5C96]">
                        {doc.type} · {doc.size}
                      </td>
                      <td className="py-3 text-[11px] text-[#3F5C96]">{doc.uploadedAt}</td>
                      <td className="py-3 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => alert(`Generating signed URL for ${doc.name}...`)}
                          className="p-1.5 rounded-full text-[#0E2F76] hover:bg-[#dbe9f5] transition-colors"
                          title="Download Document"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(doc.id)}
                          className="p-1.5 rounded-full text-danger hover:bg-danger/15 transition-colors"
                          title="Delete Document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Upload Modal */}
        {uploadOpen && (
          <div className="fixed inset-0 z-50 bg-[#061336]/65 flex items-center justify-center p-4">
            <div className="bg-[#FFFFFF] w-full max-w-md rounded-card border border-[#CFDBEE] p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#CFDBEE]">
                <h3 className="font-light text-base text-[#061336]">Upload Consignment Document</h3>
                <button type="button" onClick={() => setUploadOpen(false)} className="text-[#3F5C96]">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleUpload} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-[#061336] mb-1">Document Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CMR Waybill Tashkent - Samarkand"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    className="w-full p-2.5 rounded-input border border-[#CFDBEE] bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#061336] mb-1">Document Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full p-2.5 rounded-input border border-[#CFDBEE] bg-white"
                  >
                    <option value="CMR / Bill of Lading">CMR / Bill of Lading</option>
                    <option value="Customs Declaration">Customs Declaration</option>
                    <option value="Driver License">Driver License</option>
                    <option value="Inspection Certificate">Inspection Certificate</option>
                  </select>
                </div>
                <div className="p-4 border-2 border-dashed border-[#CFDBEE] rounded-input text-center text-xs text-[#3F5C96]">
                  <Upload className="w-5 h-5 text-[#0E2F76] mx-auto mb-1" />
                  <span>Drag and drop PDF or scan (Max 10 MB)</span>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-[#CFDBEE]">
                  <button type="button" onClick={() => setUploadOpen(false)} className="px-3 py-1.5 rounded-full border border-[#CFDBEE] text-[#3F5C96]">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-1.5 rounded-full bg-[#0E2F76] text-white font-medium hover:bg-[#061336]">
                    Confirm Upload
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
