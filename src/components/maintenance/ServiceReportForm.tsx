"use client";

import { Plus, Trash2 } from "lucide-react";

interface ServiceReportPart {
  itemNumber: number;
  description: string;
  snPnOld: string;
  snPnNew: string;
}

interface ServiceReportData {
  reportNumber: string;
  customer: string;
  location: string;
  brand: string;
  model: string;
  serialNumber: string;
  dateIn: string;
  reasonForReturn: string;
  findings: string;
  action: string;
}

interface ServiceReportFormProps {
  data: ServiceReportData;
  setData: (data: ServiceReportData) => void;
  parts: ServiceReportPart[];
  setParts: (parts: ServiceReportPart[]) => void;
}

export default function ServiceReportForm({
  data,
  setData,
  parts,
  setParts,
}: ServiceReportFormProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setData({ ...data, [name]: value });
  };

  const addPart = () => {
    const newItemNumber = parts.length > 0 ? Math.max(...parts.map(p => p.itemNumber)) + 1 : 1;
    setParts([
      ...parts,
      { itemNumber: newItemNumber, description: "", snPnOld: "", snPnNew: "" },
    ]);
  };

  const updatePart = (index: number, field: keyof ServiceReportPart, value: string) => {
    const updatedParts = [...parts];
    updatedParts[index] = { ...updatedParts[index], [field]: value };
    setParts(updatedParts);
  };

  const removePart = (index: number) => {
    setParts(parts.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Report Number
          </label>
          <input
            type="text"
            name="reportNumber"
            value={data.reportNumber}
            onChange={handleChange}
            placeholder="___/CSR-PBI/___/2023"
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Customer
          </label>
          <input
            type="text"
            name="customer"
            value={data.customer}
            onChange={handleChange}
            placeholder="PT. Pertamina EP Cepu Zona 13"
            className="w-full p-2 border border-gray-300 rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <input
            type="text"
            name="location"
            value={data.location}
            onChange={handleChange}
            placeholder="WK Donggi Matindok Field"
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="serialNumber">
            Serial Number
          </label>
          <input
            type="text"
            id="serialNumber"
            name="serialNumber"
            value={data.serialNumber}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md bg-gray-100"
            readOnly
            title="Serial Number"
            placeholder="Serial Number"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Brand
          </label>
          <input
            type="text"
            name="brand"
            value={data.brand}
            onChange={handleChange}
            placeholder="RAE Systems"
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Model
          </label>
          <input
            type="text"
            name="model"
            value={data.model}
            onChange={handleChange}
            placeholder="MeshGuard"
            className="w-full p-2 border border-gray-300 rounded-md"
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
            placeholder="Date In"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="reasonForReturn">
          Reason For Return <span className="text-red-500">*</span>
        </label>
        <textarea
          id="reasonForReturn"
          name="reasonForReturn"
          value={data.reasonForReturn}
          onChange={handleChange}
          rows={2}
          className="w-full p-2 border border-gray-300 rounded-md"
          required
          title="Reason For Return"
          placeholder="Explain the reason for return"
        ></textarea>
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
          className="w-full p-2 border border-gray-300 rounded-md"
          required
          title="Findings"
          placeholder="Describe findings during maintenance"
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
          className="w-full p-2 border border-gray-300 rounded-md"
          required
          title="Action"
          placeholder="Explain the action taken"
        ></textarea>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium">Parts List</h3>
          <button
            type="button"
            onClick={addPart}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <Plus className="h-4 w-4 mr-1" /> Tambah Part
          </button>
        </div>

        {parts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                    Item
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                    Description
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                    SN/PN/OLD
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                    SN/PN/NEW
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
                        value={part.description}
                        onChange={(e) =>
                          updatePart(index, "description", e.target.value)
                        }
                        className="w-full p-1 border border-gray-300 rounded-md"
                        placeholder="Part description"
                        title="Part description"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={part.snPnOld}
                        onChange={(e) =>
                          updatePart(index, "snPnOld", e.target.value)
                        }
                        className="w-full p-1 border border-gray-300 rounded-md"
                        placeholder="SN/PN/OLD"
                        title="SN/PN/OLD"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={part.snPnNew}
                        onChange={(e) =>
                          updatePart(index, "snPnNew", e.target.value)
                        }
                        className="w-full p-1 border border-gray-300 rounded-md"
                        placeholder="SN/PN/NEW"
                        title="SN/PN/NEW"
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
        ) : (
          <p className="text-gray-500 text-sm italic">
            Belum ada part yang ditambahkan
          </p>
        )}
      </div>
    </div>
  );
} 