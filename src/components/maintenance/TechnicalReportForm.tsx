"use client";

import { useCallback } from "react";
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

interface TechnicalReportData {
  csrNumber: string;
  deliveryTo: string;
  quoNumber: string;
  dateReport: string;
  techSupport: string;
  dateIn: string;
  estimateWork: string;
  reasonForReturn: string;
  findings: string;
  action: string;
  beforePhotoUrl: string;
  afterPhotoUrl: string;
}

interface TechnicalReportFormProps {
  data: TechnicalReportData;
  setData: (data: TechnicalReportData) => void;
  parts: TechnicalReportPart[];
  setParts: (parts: TechnicalReportPart[]) => void;
}

export default function TechnicalReportForm({
  data,
  setData,
  parts,
  setParts,
}: TechnicalReportFormProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    console.log(`Field changed: ${name} = ${value}`);
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

  const updatePart = (index: number, field: keyof TechnicalReportPart, value: string | number) => {
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

  const handleBeforeFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Upload file and get URL
      const formData = new FormData();
      formData.append("file", file);
      
      try {
        // Show loading state
        toast.loading("Mengupload foto...");
        console.log("Uploading before photo...");
        
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        
        if (!response.ok) throw new Error("Upload failed");
        
        const responseData = await response.json();
        console.log("Upload response data:", responseData);
        
        if (!responseData.success) {
          throw new Error(responseData.error || "Upload failed");
        }
        
        // Use the relative URL (path only) to ensure it works in all contexts
        const photoPath = responseData.url;
        console.log("Setting before photo URL to:", photoPath);
        setData({ ...data, beforePhotoUrl: photoPath });
        
        // Dismiss loading toast and show success
        toast.dismiss();
        toast.success("Foto berhasil diupload");
      } catch (error) {
        console.error("Error uploading before photo:", error);
        toast.dismiss();
        toast.error("Gagal mengupload foto");
      }
    }
  }, [data, setData]);

  const handleAfterFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Upload file and get URL
      const formData = new FormData();
      formData.append("file", file);
      
      try {
        // Show loading state
        toast.loading("Mengupload foto...");
        console.log("Uploading after photo...");
        
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        
        if (!response.ok) throw new Error("Upload failed");
        
        const responseData = await response.json();
        console.log("Upload response data:", responseData);
        
        if (!responseData.success) {
          throw new Error(responseData.error || "Upload failed");
        }
        
        // Use the relative URL (path only) to ensure it works in all contexts
        const photoPath = responseData.url;
        console.log("Setting after photo URL to:", photoPath);
        setData({ ...data, afterPhotoUrl: photoPath });
        
        // Dismiss loading toast and show success
        toast.dismiss();
        toast.success("Foto berhasil diupload");
      } catch (error) {
        console.error("Error uploading after photo:", error);
        toast.dismiss();
        toast.error("Gagal mengupload foto");
      }
    }
  }, [data, setData]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="csrNumber">
            CSR Number
          </label>
          <input
            type="text"
            id="csrNumber"
            name="csrNumber"
            value={data.csrNumber}
            onChange={handleChange}
            placeholder="090/CSR-PBI/IX/24"
            className="w-full p-2 border border-gray-300 rounded-md"
            title="CSR Number"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="deliveryTo">
            Delivery To
          </label>
          <input
            type="text"
            id="deliveryTo"
            name="deliveryTo"
            value={data.deliveryTo}
            onChange={handleChange}
            placeholder="PT. Archroma Indonesia"
            className="w-full p-2 border border-gray-300 rounded-md"
            title="Delivery To"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="quoNumber">
            QUO No
          </label>
          <input
            type="text"
            id="quoNumber"
            name="quoNumber"
            value={data.quoNumber}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            title="QUO Number"
            placeholder="Enter QUO Number"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="dateReport">
            Date Report
          </label>
          <input
            type="date"
            id="dateReport"
            name="dateReport"
            value={data.dateReport}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            title="Date Report"
            placeholder="Select Report Date"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="techSupport">
            Technical Support
          </label>
          <input
            type="text"
            id="techSupport"
            name="techSupport"
            value={data.techSupport}
            onChange={handleChange}
            placeholder="Herry Sutiawan"
            className="w-full p-2 border border-gray-300 rounded-md"
            title="Technical Support"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="dateIn">
            Date In
          </label>
          <input
            type="date"
            id="dateIn"
            name="dateIn"
            value={data.dateIn}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            title="Date In"
            placeholder="Select Date In"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="reasonForReturn">
            Reason For Return
          </label>
          <input
            type="text"
            id="reasonForReturn"
            name="reasonForReturn"
            value={data.reasonForReturn}
            onChange={handleChange}
            placeholder="Maintenance & calibration"
            className="w-full p-2 border border-gray-300 rounded-md"
            title="Reason For Return"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="estimateWork">
            Estimate Work
          </label>
          <input
            type="text"
            id="estimateWork"
            name="estimateWork"
            value={data.estimateWork}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            title="Estimate Work"
            placeholder="Enter estimate work details"
          />
        </div>
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
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="findings">
          Findings <span className="text-red-500">*</span>
        </label>
        <textarea
          id="findings"
          name="findings"
          value={data.findings}
          onChange={handleChange}
          rows={3}
          placeholder="QRAE 3 SN: M02A053250, Unit perlu kalibrasi ulang, Sensor CO Fail saat dikalibrasi ulang."
          className="w-full p-2 border border-gray-300 rounded-md"
          required
          title="Findings"
        ></textarea>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="action">
          Action <span className="text-red-500">*</span>
        </label>
        <textarea
          id="action"
          name="action"
          value={data.action}
          onChange={handleChange}
          rows={3}
          placeholder="Tindakan yang dilakukan untuk perbaikan"
          className="w-full p-2 border border-gray-300 rounded-md"
          required
          title="Action"
        ></textarea>
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
                      title="Unit Name"
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
                      title="Description"
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
                      title="Quantity"
                      placeholder="Quantity"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => removePart(index)}
                      className="text-red-500 hover:text-red-700"
                      title="Remove part"
                      aria-label="Remove part"
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
    </div>
  );
} 