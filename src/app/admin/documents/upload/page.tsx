"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function UploadDocumentPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    description: "",
    file: null as File | null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFormData((prev) => ({
        ...prev,
        file: e.target.files![0],
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.file) {
      setError("Please select a file to upload");
      return;
    }
    
    if (!formData.name || !formData.category) {
      setError("Name and category are required");
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // In a real implementation, you would upload the file to a storage service
      // This is a simplified mock implementation
      
      // Step 1: Create a mock file URL (in a real app, upload to storage first)
      const mockFileUrl = URL.createObjectURL(formData.file);
      
      // Step 2: Create the document record
      const response = await fetch("/api/admin/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          fileUrl: mockFileUrl, // In a real app, this would be the URL from your storage service
          category: formData.category,
          description: formData.description || null,
          // In a real app, get the user ID from the session
          uploadedById: "user-1", 
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to create document record");
      }
      
      // Navigate back to documents page
      router.push("/admin/documents");
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during upload");
    } finally {
      setLoading(false);
    }
  };

  // Sample document categories
  const documentCategories = [
    "Manual",
    "Procedure",
    "Certificate",
    "Report",
    "Specification",
    "Other",
  ];

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Upload New Document</h1>
          <Link
            href="/admin/documents"
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Back to Documents
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Document Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full border rounded p-2"
                placeholder="Enter document name"
              />
            </div>
            
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                id="category"
                name="category"
                required
                value={formData.category}
                onChange={handleChange}
                className="w-full border rounded p-2"
              >
                <option value="">Select a category</option>
                {documentCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="w-full border rounded p-2"
                rows={4}
                placeholder="Enter document description (optional)"
              />
            </div>
            
            <div>
              <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-1">
                Document File *
              </label>
              <input
                type="file"
                id="file"
                name="file"
                required
                onChange={handleFileChange}
                className="w-full border rounded p-2"
              />
              <p className="text-sm text-gray-500 mt-1">
                Supported file types: PDF, DOCX, XLSX, TXT, etc.
              </p>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 rounded text-white ${
                loading ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loading ? "Uploading..." : "Upload Document"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 