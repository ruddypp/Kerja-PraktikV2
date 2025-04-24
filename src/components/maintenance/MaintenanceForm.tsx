"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ServiceReportForm from "./ServiceReportForm";
import TechnicalReportForm from "./TechnicalReportForm";

interface MaintenanceFormProps {
  maintenance: any;
  onSuccess: () => void;
}

export default function MaintenanceForm({
  maintenance,
  onSuccess,
}: MaintenanceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("service");
  
  // Service Report Data
  const [serviceReportData, setServiceReportData] = useState({
    reportNumber: "",
    customer: maintenance.item.customer?.name || "",
    location: "",
    brand: "",
    model: "",
    serialNumber: maintenance.itemSerial,
    dateIn: new Date(maintenance.startDate).toISOString().split("T")[0],
    reasonForReturn: "",
    findings: "",
    action: "",
    sensorCO: false,
    sensorH2S: false,
    sensorO2: false,
    sensorLEL: false,
    lampClean: false,
    lampReplace: false,
    pumpTested: false,
    pumpRebuilt: false,
    pumpReplaced: false,
    pumpClean: false,
    instrumentCalibrate: false,
    instrumentUpgrade: false,
    instrumentCharge: false,
    instrumentClean: false,
    instrumentSensorAssembly: false,
  });
  
  // Service Report Parts
  const [serviceReportParts, setServiceReportParts] = useState<Array<{
    itemNumber: number;
    description: string;
    snPnOld: string;
    snPnNew: string;
  }>>([]);
  
  // Technical Report Data
  const [technicalReportData, setTechnicalReportData] = useState({
    csrNumber: "",
    deliveryTo: maintenance.item.customer?.name || "",
    quoNumber: "",
    dateReport: new Date().toISOString().split("T")[0],
    techSupport: "",
    dateIn: new Date(maintenance.startDate).toISOString().split("T")[0],
    estimateWork: "",
    reasonForReturn: "Maintenance & calibration",
    findings: "",
    beforePhotoUrl: "",
    afterPhotoUrl: "",
    termsConditions: "",
  });
  
  // Technical Report Parts
  const [technicalReportParts, setTechnicalReportParts] = useState<Array<{
    itemNumber: number;
    namaUnit: string;
    description: string;
    quantity: number;
    unitPrice: number | undefined;
    totalPrice: number | undefined;
  }>>([{ 
    itemNumber: 1, 
    namaUnit: "", 
    description: "", 
    quantity: 1, 
    unitPrice: undefined, 
    totalPrice: undefined 
  }]);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      // Validate required fields
      if (!serviceReportData.reasonForReturn || !serviceReportData.findings || !serviceReportData.action) {
        toast.error("Lengkapi semua field yang diperlukan pada form Service Report");
        setActiveTab("service");
        setIsSubmitting(false);
        return;
      }
      
      if (!technicalReportData.findings) {
        toast.error("Lengkapi temuan pada form Technical Report");
        setActiveTab("technical");
        setIsSubmitting(false);
        return;
      }
      
      // Submit the form
      const response = await fetch(`/api/user/maintenance/${maintenance.id}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serviceReportData,
          technicalReportData,
          serviceReportParts,
          technicalReportParts,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Gagal menyelesaikan maintenance");
      }
      
      toast.success("Maintenance berhasil diselesaikan");
      onSuccess();
    } catch (error: any) {
      console.error("Error submitting maintenance form:", error);
      toast.error(error.message || "Gagal menyelesaikan maintenance");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-4">Lapor Hasil Maintenance</h2>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="service">Customer Service Report</TabsTrigger>
          <TabsTrigger value="technical">Technical Report</TabsTrigger>
        </TabsList>
        
        <TabsContent value="service">
          <ServiceReportForm
            data={serviceReportData}
            setData={setServiceReportData}
            parts={serviceReportParts}
            setParts={setServiceReportParts}
          />
        </TabsContent>
        
        <TabsContent value="technical">
          <TechnicalReportForm
            data={technicalReportData}
            setData={setTechnicalReportData}
            parts={technicalReportParts}
            setParts={setTechnicalReportParts}
          />
        </TabsContent>
      </Tabs>
      
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Menyimpan..." : "Selesaikan Maintenance"}
        </button>
      </div>
    </div>
  );
} 