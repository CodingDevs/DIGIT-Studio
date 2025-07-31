import React from "react";
import { useTranslation } from "react-i18next";
import { CustomSVG } from "@egovernments/digit-ui-components";

const RoleComp = ({ role, desc, isNew = false, onRoleClick, data }) => {
  const { t } = useTranslation();

  if (isNew) {
    return (
      <div className="state-card new" style={{ width: "225px", height:"220px", margin: "9px", border: "2px dashed #C84C0E",display: "flex", justifyContent: "center" }} onClick={() => onRoleClick(role, desc, isNew, false, false, false)}>
        <div className="state-card-content" style={{ justifyContent: "center", padding: "6px", flexDirection: "column", alignItems: "normal" }}>
          <div className="state-icon" style={{padding: "6px"}}>
            <CustomSVG.AddIcon height="30" width="30" fill="#C84C0E" style={{
                backgroundColor: "beige",
                border: "1px solid beige",
                borderRadius: "5px",
                padding: "3px",
              }}/>
          </div>
          <p className="state-title" style={{ justifyContent: "center", padding: "6px", color: "#363636" }}>{role}</p>
          <p className="state-description" style={{ display: "flex", justifyContent: "center", padding: "6px", color: "#363636"  }}>{desc}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="state-card" style={{ width: "225px", height:"220px", margin: "9px", display: "flex", justifyContent: "center" }} onClick={() => onRoleClick(role, desc, isNew, data?.additionalDetails?.access?.editor || false, data?.additionalDetails?.access?.viewer || false, data?.additionalDetails?.access?.creater || false)}>
      <div className="state-card-content" style={{ justifyContent: "center", padding: "6px", flexDirection: "column", alignItems: "normal" }}>
        <div className="state-icon" style={{padding: "6px"}}>
          <CustomSVG.EditIcon height="30" width="30" fill="#C84C0E" style={{
                backgroundColor: "beige",
                border: "1px solid beige",
                borderRadius: "5px",
                padding: "3px",
              }}/>
        </div>
        <p className="state-title" style={{ justifyContent: "center", padding: "6px", color: "#363636"  }}>{role}</p>
        <p className="state-description" style={{ display: "flex", justifyContent: "center", padding: "6px", color: "#363636"  }}>{desc}</p>
      </div>
    </div>
  );
};


export default RoleComp;