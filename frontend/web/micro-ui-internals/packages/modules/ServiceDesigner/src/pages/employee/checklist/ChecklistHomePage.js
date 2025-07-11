import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardSectionHeader,
} from "@egovernments/digit-ui-react-components";

import { Toggle } from "@egovernments/digit-ui-components";

// Tab Component
const Tabs = ({ tabs, activeTab, setActiveTab }) => {
    const { t } = useTranslation();
    return (
      <div className="campaign-tabs" style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
        {tabs.map((tab, index) => (
          <button
            key={index}
            type="button"
            className={`campaign-tab-head ${tab === activeTab ? "active" : ""}`}
            style={{
              padding: "8px 16px",
              borderBottom: tab === activeTab ? "2px solid #000" : "2px solid transparent",
              background: "none",
              cursor: "pointer",
              fontWeight: tab === activeTab ? "bold" : "normal",
            }}
            onClick={() => setActiveTab(tab)}
          >
            {t(tab)}
          </button>
        ))}
      </div>
    );
  };

const ChecklistHomePage = () => {
  const [selectedTab, setSelectedTab] = useState("MY_CHECKLIST");

  const checklistData = [
    {
      id: 1,
      name: "Health Facility Worker Checklist",
      description: "Warehouse health facility operations",
      questions: 12,
      createdDate: "2024-05-15",
      status: "Published",
    },
    {
      id: 2,
      name: "Equipment Maintenance Checklist",
      description: "Daily equipment inspection routine",
      questions: 8,
      createdDate: "2024-05-10",
      status: "Published",
    },
    {
      id: 3,
      name: "Safety Protocol Checklist",
      description: "Standard safety procedures",
      questions: 15,
      createdDate: "2024-05-08",
      status: "Published",
    },
  ];

  const columns = [
    {
      name: "S.No",
      selector: (_, index) => index + 1,
      width: "80px",
    },
    {
      name: "Checklist Name",
      cell: (row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.name}</div>
          <div style={{ fontSize: "12px", color: "#6b7280" }}>{row.description}</div>
        </div>
      ),
      sortable: true,
    },
    {
      name: "Questions",
      selector: (row) => row.questions,
      sortable: true,
    },
    {
      name: "Created Date",
      selector: (row) => row.createdDate,
      sortable: true,
    },
    {
      name: "Status",
      cell: (row) => (
        <span
          style={{
            backgroundColor: "#dcfce7",
            color: "#15803d",
            fontSize: "12px",
            padding: "4px 8px",
            borderRadius: "12px",
          }}
        >
          {row.status}
        </span>
      ),
    },
    {
      name: "Actions",
      cell: () => (
        <Button label="View" onButtonClick={() => alert("Viewing checklist")} />
      ),
    },
  ];


  const tabOptions = [
    { name: "My Checklists", code:"MY_CHECKLIST" },
    { name: "Drafts", code:"DRAFTS" }
  ];

  return (
    <React.Fragment>
    <Card style={{ padding: "2rem" }}>
      {/* Section: Create New Checklist */}
      <CardSectionHeader>Create New Checklist</CardSectionHeader>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center"}}>
          <button
            onClick={() => window.location.href = `/${window?.contextPath}/employee/servicedesigner/create-checklist`}
            style={{
              border: "1px dashed gray",
              padding: "8px 16px",
              borderRadius: "6px",
              cursor: "pointer",
              width:"100%", height:"3rem",
              backgroundColor:"white"
            }}
          >
            + Create New Checklist
          </button>
        </div>
    </Card>
    <Card>
      {/* Section Header and Toggle */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "2rem",
          marginBottom: "1rem",
          alignItems: "center",
        }}
      >
        <Toggle
          name="tabs"
          numberOfToggleItems={tabOptions.length}
          options={tabOptions}
          optionsKey="name"
          selectedOption={selectedTab}
          onSelect={(val) => {
            console.log(val);
            setSelectedTab(val)}}
          type="toggle"
        />
      </div>

      {/* Table-like Layout */}
      {selectedTab === "MY_CHECKLIST" ? (
        <div className="checklist-table" style={{ marginTop: "1rem" }}>
          <div
            className="checklist-table-header"
            style={{
              display: "grid",
              gridTemplateColumns: "50px 1fr 100px 150px 100px 100px",
              fontWeight: "bold",
              backgroundColor: "#f0f0f0",
              padding: "10px",
              borderRadius: "4px",
            }}
          >
            <div>S.No.</div>
            <div>Checklist Name</div>
            <div>Questions</div>
            <div>Created Date</div>
            <div>Status</div>
            <div>Actions</div>
          </div>

          {checklistData.map((item, index) => (
            <div
              key={item.id}
              className="checklist-table-row"
              style={{
                display: "grid",
                gridTemplateColumns: "50px 1fr 100px 150px 100px 100px",
                padding: "10px",
                borderBottom: "1px solid #e0e0e0",
              }}
            >
              <div>{index + 1}</div>
              <div>
                <div style={{ fontWeight: "600" }}>{item.name}</div>
                <div style={{ fontSize: "12px", color: "#555" }}>{item.description}</div>
              </div>
              <div>{item.questions}</div>
              <div>{item.createdDate}</div>
              <div>
                <span
                  style={{
                    background: "#dcfce7",
                    color: "#15803d",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                  }}
                >
                  {item.status}
                </span>
              </div>
              <div>
                <button style={{ color: "#2563eb", fontSize: "14px" }}>View</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: "1rem", color: "#666" }}>No drafts available.</div>
      )}
    </Card>
    </React.Fragment>
  );
};

export default ChecklistHomePage;
