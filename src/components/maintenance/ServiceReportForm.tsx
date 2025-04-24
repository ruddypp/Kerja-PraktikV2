"use client";

import { Plus, Trash2 } from "lucide-react";

interface ServiceReportPart {
  itemNumber: number;
  description: string;
  snPnOld: string;
  snPnNew: string;
}

interface ServiceReportFormProps {
  data: any;
  setData: (data: any) => void;
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

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setData({ ...data, [name]: checked });
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Serial Number
          </label>
          <input
            type="text"
            name="serialNumber"
            value={data.serialNumber}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md bg-gray-100"
            readOnly
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
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Reason For Return <span className="text-red-500">*</span>
        </label>
        <textarea
          name="reasonForReturn"
          value={data.reasonForReturn}
          onChange={handleChange}
          rows={2}
          className="w-full p-2 border border-gray-300 rounded-md"
          required
        ></textarea>
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
          className="w-full p-2 border border-gray-300 rounded-md"
          required
        ></textarea>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Action <span className="text-red-500">*</span>
        </label>
        <textarea
          name="action"
          value={data.action}
          onChange={handleChange}
          rows={3}
          className="w-full p-2 border border-gray-300 rounded-md"
          required
        ></textarea>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border p-3 rounded-md">
          <h3 className="font-medium mb-2">Sensor Replacement</h3>
          <div className="space-y-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="sensorCO"
                name="sensorCO"
                checked={data.sensorCO}
                onChange={handleCheckboxChange}
                className="h-4 w-4 mr-2"
              />
              <label htmlFor="sensorCO">CO</label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="sensorH2S"
                name="sensorH2S"
                checked={data.sensorH2S}
                onChange={handleCheckboxChange}
                className="h-4 w-4 mr-2"
              />
              <label htmlFor="sensorH2S">H2S</label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="sensorO2"
                name="sensorO2"
                checked={data.sensorO2}
                onChange={handleCheckboxChange}
                className="h-4 w-4 mr-2"
              />
              <label htmlFor="sensorO2">O2</label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="sensorLEL"
                name="sensorLEL"
                checked={data.sensorLEL}
                onChange={handleCheckboxChange}
                className="h-4 w-4 mr-2"
              />
              <label htmlFor="sensorLEL">LEL</label>
            </div>
          </div>
        </div>

        <div className="border p-3 rounded-md">
          <h3 className="font-medium mb-2">Lamp Service</h3>
          <div className="space-y-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="lampClean"
                name="lampClean"
                checked={data.lampClean}
                onChange={handleCheckboxChange}
                className="h-4 w-4 mr-2"
              />
              <label htmlFor="lampClean">Clean</label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="lampReplace"
                name="lampReplace"
                checked={data.lampReplace}
                onChange={handleCheckboxChange}
                className="h-4 w-4 mr-2"
              />
              <label htmlFor="lampReplace">Replace</label>
            </div>
          </div>
        </div>

        <div className="border p-3 rounded-md">
          <h3 className="font-medium mb-2">Pump Service</h3>
          <div className="space-y-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="pumpTested"
                name="pumpTested"
                checked={data.pumpTested}
                onChange={handleCheckboxChange}
                className="h-4 w-4 mr-2"
              />
              <label htmlFor="pumpTested">Tested</label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="pumpRebuilt"
                name="pumpRebuilt"
                checked={data.pumpRebuilt}
                onChange={handleCheckboxChange}
                className="h-4 w-4 mr-2"
              />
              <label htmlFor="pumpRebuilt">Rebuilt</label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="pumpReplaced"
                name="pumpReplaced"
                checked={data.pumpReplaced}
                onChange={handleCheckboxChange}
                className="h-4 w-4 mr-2"
              />
              <label htmlFor="pumpReplaced">Replaced</label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="pumpClean"
                name="pumpClean"
                checked={data.pumpClean}
                onChange={handleCheckboxChange}
                className="h-4 w-4 mr-2"
              />
              <label htmlFor="pumpClean">Clean</label>
            </div>
          </div>
        </div>

        <div className="border p-3 rounded-md">
          <h3 className="font-medium mb-2">Instrument Service</h3>
          <div className="space-y-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="instrumentCalibrate"
                name="instrumentCalibrate"
                checked={data.instrumentCalibrate}
                onChange={handleCheckboxChange}
                className="h-4 w-4 mr-2"
              />
              <label htmlFor="instrumentCalibrate">Calibrate</label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="instrumentUpgrade"
                name="instrumentUpgrade"
                checked={data.instrumentUpgrade}
                onChange={handleCheckboxChange}
                className="h-4 w-4 mr-2"
              />
              <label htmlFor="instrumentUpgrade">Upgrade</label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="instrumentCharge"
                name="instrumentCharge"
                checked={data.instrumentCharge}
                onChange={handleCheckboxChange}
                className="h-4 w-4 mr-2"
              />
              <label htmlFor="instrumentCharge">Charge</label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="instrumentClean"
                name="instrumentClean"
                checked={data.instrumentClean}
                onChange={handleCheckboxChange}
                className="h-4 w-4 mr-2"
              />
              <label htmlFor="instrumentClean">Clean</label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="instrumentSensorAssembly"
                name="instrumentSensorAssembly"
                checked={data.instrumentSensorAssembly}
                onChange={handleCheckboxChange}
                className="h-4 w-4 mr-2"
              />
              <label htmlFor="instrumentSensorAssembly">Sensor Assembly</label>
            </div>
          </div>
        </div>
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
        ) : (
          <p className="text-gray-500 text-sm italic">
            Belum ada part yang ditambahkan
          </p>
        )}
      </div>
    </div>
  );
} 