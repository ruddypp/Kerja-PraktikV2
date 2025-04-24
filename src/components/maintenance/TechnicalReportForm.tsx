"use client";

import { useState } from "react";
import { Plus, Trash2, Upload } from "lucide-react";
import { toast } from "react-hot-toast";

interface TechnicalReportPart {
  itemNumber: number;
  namaUnit: string;
  description: string;
  quantity: number;
  unitPrice: number | undefined;
  totalPrice: number | undefined;
}

interface TechnicalReportFormProps {
  data: any;
  setData: (data: any) => void;
  parts: TechnicalReportPart[];
  setParts: (parts: TechnicalReportPart[]) => void;
}

export default function TechnicalReportForm({
  data,
  setData,
  parts,
  setParts,
}: TechnicalReportFormProps) {
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setData({ ...data, [name]: value });
  };

  const addPart = () => {
    const newItemNumber = parts.length > 0 ? Math.max(...parts.map(p => p.itemNumber)) + 1 : 1;
    setParts([
      ...parts,
      { 
        itemNumber: newItemNumber, 
        namaUnit: "", 
        description: "", 
        quantity: 1, 
        unitPrice: undefined, 
        totalPrice: undefined 
      },
    ]);
  };

  const updatePart = (index: number, field: keyof TechnicalReportPart, value: any) => {
    const updatedParts = [...parts];
    
    if (field === "quantity" || field === "unitPrice") {
      const numValue = value === "" ? undefined : Number(value);
      updatedParts[index] = { ...updatedParts[index], [field]: numValue };
      
      // Update totalPrice if both quantity and unitPrice are available
      const part = updatedParts[index];
      if (part.quantity && part.unitPrice) {
        updatedParts[index].totalPrice = part.quantity * part.unitPrice;
      } else {
        updatedParts[index].totalPrice = undefined;
      }
    } else {
      updatedParts[index] = { ...updatedParts[index], [field]: value };
    }
    
    setParts(updatedParts);
  };

  const removePart = (index: number) => {
    setParts(parts.filter((_, i) => i !== index));
  };

  const handleBeforeFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBeforeFile(file);
      
      // Upload file and get URL
      const formData = new FormData();
      formData.append("file", file);
      
      try {
        // Show loading state
        toast.loading("Mengupload foto...");
        
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        
        if (!response.ok) throw new Error("Upload failed");
        
        const responseData = await response.json();
        
        if (!responseData.success) {
          throw new Error(responseData.error || "Upload failed");
        }
        
        // Use the full URL to ensure it works in all contexts
        setData({ ...data, beforePhotoUrl: responseData.fullUrl || responseData.url });
        
        // Dismiss loading toast and show success
        toast.dismiss();
        toast.success("Foto berhasil diupload");
      } catch (error) {
        console.error("Error uploading before photo:", error);
        toast.dismiss();
        toast.error("Gagal mengupload foto");
      }
    }
  };

  const handleAfterFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAfterFile(file);
      
      // Upload file and get URL
      const formData = new FormData();
      formData.append("file", file);
      
      try {
        // Show loading state
        toast.loading("Mengupload foto...");
        
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        
        if (!response.ok) throw new Error("Upload failed");
        
        const responseData = await response.json();
        
        if (!responseData.success) {
          throw new Error(responseData.error || "Upload failed");
        }
        
        // Use the full URL to ensure it works in all contexts
        setData({ ...data, afterPhotoUrl: responseData.fullUrl || responseData.url });
        
        // Dismiss loading toast and show success
        toast.dismiss();
        toast.success("Foto berhasil diupload");
      } catch (error) {
        console.error("Error uploading after photo:", error);
        toast.dismiss();
        toast.error("Gagal mengupload foto");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CSR Number
          </label>
          <input
            type="text"
            name="csrNumber"
            value={data.csrNumber}
            onChange={handleChange}
            placeholder="090/CSR-PBI/IX/24"
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Delivery To
          </label>
          <input
            type="text"
            name="deliveryTo"
            value={data.deliveryTo}
            onChange={handleChange}
            placeholder="PT. Archroma Indonesia"
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            QUO No
          </label>
          <input
            type="text"
            name="quoNumber"
            value={data.quoNumber}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date Report
          </label>
          <input
            type="date"
            name="dateReport"
            value={data.dateReport}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Technical Support
          </label>
          <input
            type="text"
            name="techSupport"
            value={data.techSupport}
            onChange={handleChange}
            placeholder="Herry Sutiawan"
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date In
          </label>
          <input
            type="date"
            name="dateIn"
            value={data.dateIn}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason For Return
          </label>
          <input
            type="text"
            name="reasonForReturn"
            value={data.reasonForReturn}
            onChange={handleChange}
            placeholder="Maintenance & calibration"
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estimate Work
          </label>
          <input
            type="text"
            name="estimateWork"
            value={data.estimateWork}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Findings <span className="text-red-500">*</span>
        </label>
        <textarea
          name="findings"
          value={data.findings}
          onChange={handleChange}
          rows={3}
          placeholder="QRAE 3 SN: M02A053250, Unit perlu kalibrasi ulang, Sensor CO Fail saat dikalibrasi ulang."
          className="w-full p-2 border border-gray-300 rounded-md"
          required
        ></textarea>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Foto Sebelum Maintenance
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              {data.beforePhotoUrl ? (
                <div>
                  <img
                    src={data.beforePhotoUrl}
                    alt="Before Maintenance"
                    className="mx-auto h-32 w-auto"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Klik untuk mengganti foto
                  </p>
                </div>
              ) : (
                <div>
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="text-xs text-gray-500">
                    Upload foto kondisi sebelum maintenance
                  </p>
                </div>
              )}
              <input
                id="before-file-upload"
                name="beforePhotoUrl"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleBeforeFileChange}
              />
              <label
                htmlFor="before-file-upload"
                className="cursor-pointer text-blue-600 hover:text-blue-500 text-sm"
              >
                {data.beforePhotoUrl ? "Ganti foto" : "Upload Foto"}
              </label>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Foto Setelah Maintenance
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              {data.afterPhotoUrl ? (
                <div>
                  <img
                    src={data.afterPhotoUrl}
                    alt="After Maintenance"
                    className="mx-auto h-32 w-auto"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Klik untuk mengganti foto
                  </p>
                </div>
              ) : (
                <div>
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="text-xs text-gray-500">
                    Upload foto kondisi setelah maintenance
                  </p>
                </div>
              )}
              <input
                id="after-file-upload"
                name="afterPhotoUrl"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleAfterFileChange}
              />
              <label
                htmlFor="after-file-upload"
                className="cursor-pointer text-blue-600 hover:text-blue-500 text-sm"
              >
                {data.afterPhotoUrl ? "Ganti foto" : "Upload Foto"}
              </label>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium">Daftar Unit</h3>
          <button
            type="button"
            onClick={addPart}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <Plus className="h-4 w-4 mr-1" /> Tambah Unit
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                  No
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                  Nama Unit
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                  Description
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                  QTY
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                  Unit Price
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                  Total Price
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {parts.map((part, index) => (
                <tr key={index}>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {part.itemNumber}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={part.namaUnit}
                      onChange={(e) =>
                        updatePart(index, "namaUnit", e.target.value)
                      }
                      placeholder="QRAE 3"
                      className="w-full p-1 border border-gray-300 rounded-md"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={part.description}
                      onChange={(e) =>
                        updatePart(index, "description", e.target.value)
                      }
                      placeholder="Kalibrasi"
                      className="w-full p-1 border border-gray-300 rounded-md"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={part.quantity || ""}
                      onChange={(e) =>
                        updatePart(index, "quantity", e.target.value)
                      }
                      min="1"
                      className="w-16 p-1 border border-gray-300 rounded-md"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={part.unitPrice || ""}
                      onChange={(e) =>
                        updatePart(index, "unitPrice", e.target.value)
                      }
                      placeholder="0"
                      className="w-24 p-1 border border-gray-300 rounded-md"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={part.totalPrice || ""}
                      readOnly
                      className="w-24 p-1 border border-gray-300 rounded-md bg-gray-50"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => removePart(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Terms and Conditions
        </label>
        <textarea
          name="termsConditions"
          value={data.termsConditions}
          onChange={handleChange}
          rows={3}
          placeholder="1. Price above exclude PPN 11%
2. Delivery: 2 weeks
3. Payment:
4. Franco:"
          className="w-full p-2 border border-gray-300 rounded-md"
        ></textarea>
      </div>
    </div>
  );
} 