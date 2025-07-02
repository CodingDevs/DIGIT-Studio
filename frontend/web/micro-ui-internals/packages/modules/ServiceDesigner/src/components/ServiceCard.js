import { CustomSVG } from "@egovernments/digit-ui-components";
import React from "react";
import { useHistory } from "react-router-dom";

const ServiceCard = ({ icon, cardHeader, cardBody, createdDate, link }) => {
  const history = useHistory();

  const handleClick = () => {
    if (link) {
      history.push(link);
    }
  };

  return (
    <div
      className="service-card"
      style={{ cursor: link ? "pointer" : "default" }}
      onClick={handleClick}
    >
      <div className="service-card-header">
        <div className="service-icon" style={{ fill: "darkorange" }}>
          {icon || <CustomSVG.PTIcon />}
        </div>
      </div>
      <div className="service-card-body">
        <h3 className="service-title">{cardHeader || "Property Tax"}</h3>
        <p className="service-description">
          {cardBody ||
            "Property tax assessment and payment system for Mumbai Municipal Corporation"}
        </p>
        {createdDate && (
          <div className="service-created-date">Created: {createdDate}</div>
        )}
      </div>
    </div>
  );
};

export default ServiceCard;