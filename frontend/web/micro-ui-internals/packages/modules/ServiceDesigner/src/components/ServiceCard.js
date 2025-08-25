import { CustomSVG, Button, PopUp, TextInput, TextBlock, AlertCard } from "@egovernments/digit-ui-components";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { useDuplicateServiceAPI } from "../hooks/useDuplicateServiceAPI";

const ServiceCard = ({ icon, cardHeader, cardBody, createdDate, link, className, onClick, module, service }) => {
  const history = useHistory();
  const { t } = useTranslation();
  const [showConfigButton, setShowConfigButton] = useState(false);
  const [showDuplicatePopup, setShowDuplicatePopup] = useState(false);
  const [newModuleName, setNewModuleName] = useState("");
  const [newServiceName, setNewServiceName] = useState("");
  const [isDuplicating, setIsDuplicating] = useState(false);

  const { duplicateServiceConfig } = useDuplicateServiceAPI();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (link) {
      history.push(`/${window.contextPath}/${link}`);
    }
  };

  const handleConfigClick = (e) => {
    e.stopPropagation();
    console.log("Service Config for:", cardHeader, "Module:", module, "Service:", service);
    setShowDuplicatePopup(true);
  };

  const handleDuplicateService = async () => {
    if (!newModuleName.trim() || !newServiceName.trim() || !module || !service) {
      return;
    }

    setIsDuplicating(true);
    try {
      const sanitizedNewModule = newModuleName.trim().replace(/\s+/g, "_");
      const sanitizedNewService = newServiceName.trim().replace(/\s+/g, "_");
      await duplicateServiceConfig.mutateAsync({
        originalModule: module,
        originalService: service,
        newModule: sanitizedNewModule,
        newService: sanitizedNewService,
      });

      console.log("Service duplicated successfully");
      
      // Close the popup and reset form
      setShowDuplicatePopup(false);
      setNewModuleName("");
      setNewServiceName("");
      
      // Navigate to the new service builder
      const url = `employee/servicedesigner/Service-Builder-Home?module=${encodeURIComponent(
        sanitizedNewModule
      )}&service=${encodeURIComponent(sanitizedNewService)}`;
    
      history.push(`/${window.contextPath}/${url}`);
      
    } catch (error) {
      console.error("Error duplicating service:", error);
      // You might want to show an error message to the user here
    } finally {
      setIsDuplicating(false);
    }
  };

  return (
    <React.Fragment>
      <div
        className={`service-card ${className || ""}`}
        style={{ 
          cursor: link ? "pointer" : "default", 
          height:"15rem",
          position: "relative"
        }}
        onClick={handleClick}
        onMouseEnter={() => setShowConfigButton(true)}
        onMouseLeave={() => setShowConfigButton(false)}
      >
        {showConfigButton && module && service && (
          <div
            style={{
              position: "absolute",
              top: "8px",
              right: "8px",
              zIndex: 10,
            }}
          >
            <Button
              style={{
                minWidth: "auto",
                height:"auto",
                padding: "0px 0px",
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
              onClick={handleConfigClick}
              title="Duplicate Service"
              label={<CustomSVG.DuplicateIcon height="20" width="20" styles={{fill :"#c84c0e"}} fill="#c84c0e" viewBox="0 0 40 40" />}
            />
          </div>
        )}
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

      {showDuplicatePopup && (
        <PopUp
          header={t("DUPLICATE_SERVICE")}
          headerBarMain={t("ENTER_NEW_SERVICE_DETAILS")}
          actionCancelLabel={t("CANCEL")}
          actionCancelOnSubmit={() => setShowDuplicatePopup(false)}
          onClose={() => setShowDuplicatePopup(false)}
          children={[
            <div>
               <TextBlock
                header={t("CREATE_DUPLICATE_SERVICE_HEADER")}
                subHeader={t("CREATE_DUPLICATE_SERVICE_SUB_HEADER")}
                subHeaderClasName="header-popup"
                className="typography heading-m"
              />
              {/* <div style={{ marginBottom: "1rem" }}>
                <TextInput
                  label={t("ORIGINAL_MODULE")}
                  value={module || ""}
                  disabled
                  style={{ marginBottom: "1rem" }}
                />
                <TextInput
                  label={t("ORIGINAL_SERVICE")}
                  value={service || ""}
                  disabled
                  style={{ marginBottom: "1rem" }}
                />
              </div> */}
              <div style={{ marginTop: "1.5rem", marginBottom: "1.5rem" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "1rem",
                    gap: "1rem",
                  }}
                >
                  <label style={{ minWidth: "200px", fontWeight: "500", color: "#333" }}>
                    {t("NEW_MODULE_NAME")}
                  </label>
                  <TextInput
                    value={newModuleName}
                    onChange={(e) => setNewModuleName(e.target.value)}
                    style={{ flex: 1 }}
                    placeholder={t("ENTER_NEW_MODULE_NAME")}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  <label style={{ minWidth: "200px", fontWeight: "500", color: "#333" }}>
                    {t("NEW_SERVICE_NAME")}
                  </label>
                  <TextInput
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                    style={{ flex: 1 }}
                    placeholder={t("ENTER_NEW_SERVICE_NAME")}
                  />
                </div>
              </div>
              <AlertCard label={t("DUPLICATE_INFO")} text={t("DUPLICATE_INFO_DEFINITION")} />
            </div>,
          ]}
          footerChildren={[
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.5rem",
              }}
            >
              <Button
                variation="secondary"
                label={t("CANCEL")}
                onClick={() => setShowDuplicatePopup(false)}
                disabled={isDuplicating}
              />
              <Button
                variation="primary"
                label={isDuplicating ? t("DUPLICATING") : t("DUPLICATE")}
                onClick={handleDuplicateService}
                disabled={!newModuleName.trim() || !newServiceName.trim() || isDuplicating}
              />
            </div>,
          ]}
        />
      )}
    </React.Fragment>
  );
};

export default ServiceCard;