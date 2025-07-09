import React from "react";
import { CustomSVG } from "@egovernments/digit-ui-components";

const StateComp = ({ onStateClick, type, State, desc, icon, disabled=false }) => {

  return (
    <div className={`state-card ${disabled ? "state-card-disabled" : ""}`}
      onClick={() => !disabled && onStateClick(type)}
    >
      <div className="state-card-content">
        <div className="state-icon">
          {icon || <CustomSVG.EditIcon />}
        </div>
        <div className="text-section">
          <h3 className="state-title">{State}</h3>
          <p className="state-description">{desc}</p>
          <div className="state-addtoclick">Click to add</div>
        </div>
      </div>
    </div>

  );
};

export default StateComp;