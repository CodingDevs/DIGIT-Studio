import { CustomSVG } from "@egovernments/digit-ui-components";
import React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

const ServiceCard = ({ icon, cardHeader, cardBody, createdDate, link, className }) => {
  const history = useHistory();
  const { t } = useTranslation();

  const handleClick = () => {
    if (link) {
      history.push(link);
    }
  };

  return (
    <div
      className={`service-card ${className || ""}`}
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
            t("STUDIO_CREATE_SERVICE_DESCRIPTION")}
        </p>
        {createdDate && (
          <div className="service-created-date">Created: {createdDate}</div>
        )}
      </div>
    </div>
  );
};

export default ServiceCard;