import React from "react";
import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@egovernments/digit-ui-react-components";
import { useHistory, useLocation } from "react-router-dom";
import { Loader } from "@egovernments/digit-ui-react-components";
import { FieldV1 } from "@egovernments/digit-ui-components";
import { Toast } from "@egovernments/digit-ui-components";
import { CardHeader } from "@egovernments/digit-ui-react-components";
import { Button } from "@egovernments/digit-ui-components";
import { LabelFieldPair, HeaderComponent, Chip } from "@egovernments/digit-ui-components";
import generateNotifPayload from "../../../config/NotificationConfig";
import { useNotificationConfigAPI } from "../../../hooks/useNotificationConfigAPI";
import { useServiceConfigAPI } from "../../../hooks/useServiceConfigAPI";

const CreateNotification = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const tenantId = Digit.ULBService.getCurrentTenantId();
  const searchParams = new URLSearchParams(location.search);
  const roleModule = searchParams.get("module") || "Studio";
  const roleService = searchParams.get("service") || "Service";
  const Category = `${roleModule.toUpperCase()}_${roleService.toUpperCase()}`;
  const { type, data, isUpdate } = location.state || {};
  const workflowNodes = localStorage.getItem("canvasElements") !== "undefined" ? JSON.parse(localStorage.getItem("canvasElements")) : [];
  const [showToast, setShowToast] = useState(null);
  const MDMS_CONTEXT_PATH = window?.globalConfigs?.getConfig("MDMS_CONTEXT_PATH") || "egov-mdms-service";
  const history = useHistory();

  // Use the new notification config API hook
  const { searchNotificationConfigs, saveNotificationConfig, updateNotificationConfig } = useNotificationConfigAPI();
  const { data: notificationConfigs, isLoading } = searchNotificationConfigs(roleModule, roleService);

  // Fetch service configuration for dynamic variables
  const { fetchServiceConfig } = useServiceConfigAPI();
  const { data: serviceConfig, isLoading: serviceConfigLoading } = fetchServiceConfig(roleModule, roleService);

  const [stateData, setStateData] = useState(isUpdate ? {
    title: data?.title,
    messageBody: data?.messageBody,
    subject: data?.subject,
    workflow: data?.workflow,
  }:{
    title: t(data?.title),
    messageBody: t(data?.messageBody),
    subject: t(data?.subject),
    workflow: data?.workflow,
  }
);

  // State for dynamic personalize variables
  const [selectedForm, setSelectedForm] = useState("");

  const onDataChange = (e) => {
    if (e?.target) {
      const { name, value } = e.target;
      setStateData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    else {
      setStateData(prev => ({
        ...prev,
        workflow: e
      }));
    }
  }

  const generateNotificationPayload = (notificationData) => {
    return {
      module: roleModule,
      service: roleService,
      title: notificationData.title,
      messageBody: notificationData.messageBody,
      subject: notificationData.subject || "",
      type: type,
      additionalDetails: {
        workflow: notificationData.workflow || [],
        createdDate: Date.now(), // Add current timestamp in milliseconds
        category: Category
      }
    };
  };

  const updateworkflowNodes = () => {
    const updated = workflowNodes?.map((node) => {
      const match = stateData.workflow?.find(w => w.name === node.name);
      if (match) {
        const alreadyExists = node.sendnotif.some(n => n.code === stateData.title && n.name === stateData.title);
        if (!alreadyExists) {
          node.sendnotif.push({ code: stateData.title, name: stateData.title });
        }
      }
      return node;
    });
    localStorage.setItem("canvasElements", JSON.stringify(updated));
  }

  const onSubmit = async (e) => {
    if (stateData.title != "" && stateData.messageBody != "") {
      try {
        if (isUpdate === false || isUpdate === "false") {
          // Check for duplicate title only when creating new notification
          const existingNotification = notificationConfigs?.find(notification => 
            notification.title === stateData.title && 
            notification.additionalDetails?.category === Category
          );
          
          if (existingNotification) {
            setShowToast({ key: true, type: "error", label: t("NOTIF_NAME_EXISTS") });
            return;
          }
          
          const notificationPayload = generateNotificationPayload(stateData);
          const response = await saveNotificationConfig.mutateAsync(notificationPayload);
          
          if (response?.mdms) {
            updateworkflowNodes();
            setShowToast({ key: true, type: "success", label: t("NOTIF_ADDED_SUCCESSFULLY") });
            setTimeout(() => {
              history.push(`/${window.contextPath}/employee/servicedesigner/notifications?module=${roleModule}&service=${roleService}`);
            }, 3000);
            return;
          } else {
            setShowToast({ key: true, type: "error", label: t("ERROR_OCCURED_DURING_NOTIF_CREATION") });
            setTimeout(() => {
              window.history.back();
            }, 3000);
          }
        } else {
          const notificationPayload = {
            ...generateNotificationPayload(stateData),
            originalTitle: data?.title // For update, we need the original title
          };
          const response = await updateNotificationConfig.mutateAsync(notificationPayload);
          
          if (response?.mdms) {
            updateworkflowNodes();
            setShowToast({ key: true, type: "success", label: t("NOTIFICATION_UPDATED_SUCCESSFULLY") });
            setTimeout(() => {
              window.history.back();
            }, 3000);
          } else {
            setShowToast({ key: true, type: "error", label: t("ERROR_OCCURED_DURING_UPDATION") });
            setTimeout(() => {
              window.history.back();
            }, 3000);
          }
        }
      } catch (error) {
        console.error("Notification operation failed:", error);
        setShowToast({ key: true, type: "error", label: t("ERROR_OCCURED_DURING_NOTIF_CREATION") });
        setTimeout(() => {
          window.history.back();
        }, 3000);
      }
    } else {
      if (stateData.title == "") {
        setShowToast({ key: true, type: "error", label: t("TITLE_IS_REQUIRED") });
      } else {
        setShowToast({ key: true, type: "error", label: t("MSG_BODY_IS_REQUIRED") });
      }
    }
  }

  // Generate variables from uiforms
  const generateVariablesFromUiforms = useMemo(() => {
    if (!serviceConfig?.data?.uiforms) return [];

    const variables = [];
    
    serviceConfig.data.uiforms.forEach(form => {
      if (form.formConfig?.screens) {
        form.formConfig.screens.forEach(screen => {
          if (screen.cards) {
            screen.cards.forEach(card => {
              if (card.fields) {
                card.fields.forEach(field => {
                  if (field.active && field.jsonPath) {
                    let path = "";
                    let sectionName = "";
                    
                    // Get section name from headerFields
                    if (card.headerFields && card.headerFields.length > 0) {
                      // Look for the screen heading field
                      const screenHeadingField = card.headerFields?.find(hf => 
                        hf.label === "SCREEN_HEADING" || hf.jsonPath === "ScreenHeading"
                      );
                      if (screenHeadingField && screenHeadingField.value) {
                        sectionName = screenHeadingField.value.replace(/\s+/g, '');
                      }
                    }
                    
                    // If no headerFields value, fallback to card.header
                    if (!sectionName) {
                      sectionName = card.header ? card.header.replace(/\s+/g, '') : "serviceDetails";
                    }
                    
                    // Determine the path based on field type/location
                    if (field.jsonPath.includes("Address")) {
                      // Address fields
                      path = `PublicService.address.${field.label.replace(/\s+/g, '')}`;
                    } else if (field.jsonPath.includes("Applicant")) {
                      // Applicant fields
                      path = `PublicService.applicants[0].${field.label.replace(/\s+/g, '')}`;
                    } else {
                      // Other service details fields
                      path = `PublicService.serviceDetails.${sectionName}.${field.label.replace(/\s+/g, '')}`;
                    }
                    
                    variables.push({
                      label: field.label || field.jsonPath,
                      path: path,
                      formName: form.formName
                    });
                  }
                });
              }
            });
          }
        });
      }
    });
    
    return variables;
  }, [serviceConfig]);

  // Get form options for dropdown
  const formOptions = useMemo(() => {
    if (!serviceConfig?.data?.uiforms) return [];
    return serviceConfig.data.uiforms.map(form => ({
      code: form.formName,
      name: form.formName
    }));
  }, [serviceConfig]);

  // Filter variables based on selected form
  const filteredVariables = useMemo(() => {
    console.log("Selected form:", selectedForm);
    console.log("Available variables:", generateVariablesFromUiforms);
    
    // If no form is selected or "ALL_FORMS" is selected (empty string), show all variables
    if (!selectedForm || selectedForm === "" || selectedForm === t("ALL_FORMS")) {
      return generateVariablesFromUiforms;
    }
    
    if(selectedForm?.name === t("ALL_FORMS")){
      return generateVariablesFromUiforms;
    }
    // Filter by form name
    console.log(selectedForm,"kkkk");
    console.log(generateVariablesFromUiforms,"kkkk");
    const filtered = generateVariablesFromUiforms.filter(variable => variable.formName === selectedForm?.name);
    console.log("Filtered variables:", filtered);
    return filtered;
  }, [selectedForm, generateVariablesFromUiforms, t]);

  const onTagClick = (e, variablePath) => {
    // Get the active textarea element
    const textarea = document.querySelector('textarea[name="messageBody"]');
    if (!textarea) return;

    // Get cursor position
    const cursorPos = textarea.selectionStart;
    const textBefore = stateData.messageBody.substring(0, cursorPos);
    const textAfter = stateData.messageBody.substring(cursorPos);

    // Insert variable at cursor position
    const variableToInsert = ` {${variablePath}} `;
    const newMessageBody = textBefore + variableToInsert + textAfter;
    
    setStateData(prev => ({
      ...prev,
      messageBody: newMessageBody
    }));

    // Set cursor position after the inserted variable
    setTimeout(() => {
      const newCursorPos = cursorPos + variableToInsert.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    }, 0);
  }

  if (isLoading) {
    return <Loader />
  }
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <CardHeader>{data?.header ? t(data.header) : t("EDIT") + " " + data?.title}</CardHeader>
      </div>
      <FieldV1
        label={t("NOTIFICATION_TITLE")}
        onChange={(e) => onDataChange(e)}
        populators={{
          name: "title",
          //alignFieldPairVerically: true,
          fieldPairClassName: "workflow-field-pair",
        }}
        props={{
          fieldStyle: { width: "100%" }
        }}
        required
        infoMessage={t("NOTIFICATION_TITLE_INFO")}
        type="text"
        value={stateData.title}
      />
      {type == "email" && <FieldV1
        label={t("NOTIFICATION_SUBJECT")}
        onChange={(e) => onDataChange(e)}
        populators={{
          name: "subject",
          //alignFieldPairVerically: true,
          fieldPairClassName: "workflow-field-pair",
        }}
        props={{
          fieldStyle: { width: "100%" }
        }}
        required
        infoMessage={t("NOTIFICATION_SUBJECT_INFO")}
        type="text"
        value={stateData.subject}
      />
      }
      <FieldV1
        label={t("NOTIFICATION_MSG_BODY")}
        onChange={(e) => onDataChange(e)}
        populators={{
          name: "messageBody",
          //alignFieldPairVerically: true,
          fieldPairClassName: "workflow-field-pair",
          validation: {
            maxlength: data?.charLimit
          }
        }}
        props={{
          fieldStyle: { width: "100%" }
        }}
        required
        infoMessage={t("NOTIFICATION_TITLE_INFO")}
        charCount={true}
        type="textarea"
        value={stateData.messageBody}
      />
      <LabelFieldPair removeMargin={true} style={{ margin: "6px",  marginBottom:"1.5rem" }}>
        <HeaderComponent className={`label`}>
          <div className={`label-container`}>
            <label className={`label-styles`}>{t("PERSONALIZATION_VARIABLES")}</label>
          </div>
        </HeaderComponent>
        
        <div className="digit-field" style={{
          width: "100%",
          padding: "4px",
          display: "flex",
          flexDirection: "column",
          gap: "1rem"
        }}>
          {/* Form Selection Dropdown */}
          {formOptions.length > 0 && (
            <div style={{ 
              marginLeft:"-35.5%",
              marginBottom: "0.5rem"
            }}>
              <FieldV1
                label={t(" ")}
                onChange={(e) => {
                  // Handle both event object and direct value
                  const value = e?.target?.value || e;
                  setSelectedForm(value);
                }}
                populators={{
                  name: "selectedForm",
                  options: [
                    { code: "", name: t("ALL_FORMS") },
                    ...formOptions
                  ],
                  optionsKey: "name"
                }}
                props={{
                  fieldStyle: { width: "100%" }
                }}
                type="dropdown"
                value={selectedForm}
              />
            </div>
          )}

          {/* Variable Tags */}
          <div style={{
            display: "flex",
            justifyContent: "flex-start",
            flexWrap: "wrap",
            gap: "0.5rem",
            width: "45%"
          }}>
            {serviceConfigLoading ? (
              <div style={{ fontSize: "12px", color: "#666" }}>{t("LOADING_VARIABLES")}</div>
            ) : filteredVariables.length > 0 ? (
              filteredVariables.map((variable, index) => (
                <Chip
                  key={index}
                  hideClose={false}
                  text={variable.label}
                  isErrorTag={true}
                  onTagClick={(e) => onTagClick(e, variable.path)}
                  extraStyles={{
                    tagStyles: {
                      background: "lightgray",
                      padding: "4px 8px",
                      display: "flex",
                      alignItems: "center",
                      borderRadius: "1rem",
                      gap: "0.5rem",
                      cursor: "pointer",
                      fontSize: "12px"
                    }
                  }}
                />
              ))
            ) : (
              <div style={{ fontSize: "12px", color: "#666" }}>
                {serviceConfig ? t("NO_VARIABLES_FOUND") : t("NO_SERVICE_CONFIG_FOUND")}
              </div>
            )}
          </div>
        </div>
        
        {/* <div style={{ fontSize: "12px", color: "#666", marginTop: "4px", fontStyle: "italic" }}>
          {t("PERSONALIZATION_VARIABLES_INFO")}
        </div> */}
      </LabelFieldPair>
      {/* <FieldV1
        label={t("WORKFLOW_INTEGRATION")}
        onChange={(e) => onDataChange(e)}
        populators={{
          name: "workflow",
          isSearchable: true,
          //alignFieldPairVerically: true,
          fieldPairClassName: "workflow-field-pair",
          optionsKey: "name",
          isSearchable: true,
          options: workflowNodes?.map(item => ({ code: String(item.id), name: item.name })),
        }}
        props={{
          fieldStyle: { width: "100%" }
        }}
        type="multiselectdropdown"
        infoMessage={t("WORKFLOW_INFO")}
        value={stateData.workflow}
      /> */}
      <div style={{ display: "flex", width: "100%" }}>
          <Button
            variation="primary"
            label={t("SAVE")}
            type="button"
            className="primary-button"
            style={{ margin: "0 8px", borderRadius: "6px", width: "100%" }}
            onClick={(e) => onSubmit(e)}
          />
          <Button
            variation="secondary"
            label={t("PREVIEW")}
            type="button"
            isDisabled={true}
            className="secondary-button"
            style={{ margin: "0 8px", borderRadius: "6px", width: "100%" }}
            onClick={(e) => console.log("preview")}
          />
        </div>
      {showToast && (
        <Toast
          type={showToast?.type}
          label={t(showToast?.label)}
          onClose={() => {
            setShowToast(null);
          }}
          isDleteBtn={showToast?.isDleteBtn}
          style={{ zIndex: 9999 }}
        />
      )}
    </Card>
  );
};

export default CreateNotification;
