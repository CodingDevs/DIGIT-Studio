import React from "react";
import { useState } from "react";
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
        workflow: notificationData.workflow || []
      }
    };
  };

  const updateworkflowNodes = () => {
    const updated = workflowNodes?.map((node) => {
      const match = stateData.workflow.find(w => w.name === node.name);
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
        if (isUpdate == false) {
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

  const onTagClick = (e, type) => {
    if (type == "num") {
      setStateData(prev => ({
        ...prev,
        messageBody: stateData.messageBody + " {PublicService.applicationNo} "
      }));
    }
    else {
      setStateData(prev => ({
        ...prev,
        messageBody: stateData.messageBody + " {PublicService.applicants[0].name} "
      }));
    }
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
      <LabelFieldPair removeMargin={true} style={{ margin: "6px", alignItems:"center", marginBottom:"1.5rem" }}>
        <HeaderComponent className={`label`}>
          <div className={`label-container`}>
            <label className={`label-styles`}>{t("PERSONALIZATION_VARIABLES")}</label>
          </div>
        </HeaderComponent>
        <div className="digit-field" style={{
          width: "100%",
          padding: "4px",
          display: "flex",
          justifyContent: "flex-start"
        }}>
          <div style={{ display: "flex", gap:"1rem" }}>
            <Chip
              hideClose={false}
              text={t("USER_NAME")}
              //className="multiselectdropdown-tag"
              isErrorTag={true}
              onTagClick={(e) => onTagClick(e, "name")}
              extraStyles={{
                tagStyles: {
                  //margin: "6px",
                  background: "lightgray",
                  padding: "4px 8px",
                  display:"flex",
                  alignItems:"center",
                  borderRadius: "1rem",
                  gap:"0.5rem"
                }
              }}
            />
            <Chip
              hideClose={false}
              text={t("APP_NO")}
              //className="multiselectdropdown-tag"
              isErrorTag={true}
              onTagClick={(e) => onTagClick(e, "num")}
              extraStyles={{
                tagStyles: {
                  //margin: "6px",
                  background: "lightgray",
                  padding: "4px 8px",
                  display:"flex",
                  alignItems:"center",
                  borderRadius: "1rem",
                  gap:"0.5rem"
                }
              }}
            />
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
