import React, { useState, useEffect, use } from "react";
import {
  Card,
  CardSectionHeader,
} from "@egovernments/digit-ui-react-components";
import { Button, Loader, Toggle } from "@egovernments/digit-ui-components";
import { useHistory } from "react-router-dom";
import { useTranslation } from "react-i18next";

const FormHomePage = () => {
  const history = useHistory();
  const { t } = useTranslation();
  const tenantId = Digit.ULBService.getCurrentTenantId();
  const [selectedTab, setSelectedTab] = useState("MY_FORMS");
  const [formData, setFormsData] = useState([]);
  const {module, service} = Digit.Hooks.useQueryParams();

  const requestCriteria = {
    url: "/egov-mdms-service/v2/_search",
    body: {
      MdmsCriteria: {
        tenantId: tenantId,
        schemaCode: "Studio.Forms"
      },
    },
  };
  const { isLoading: moduleListLoading, data } = Digit.Hooks.useCustomAPIHook(requestCriteria);

  useEffect(() => {
    if(data)
    {
      const formatted = data?.mdms?.filter((ob) => ob?.data?.module.toUpperCase() === module.toUpperCase() && ob?.data?.service.toUpperCase() === service.toUpperCase()).map((item, index) => ({
                id: item.id || index,
                name: item.data?.formName,
                description: item?.data?.formDescription || "-",
                createdDate: Digit.DateUtils.ConvertEpochToDate(item?.auditDetails?.createdTime) || "N/A",
                item: item
              }));
      
              setFormsData(formatted);
    }
  },[data])

  const tabOptions = [
    { name: "My Forms", code: "MY_FORMS", i18nKey: t("STUDIO_MY_FORMS") },
  ];

  if(moduleListLoading){
    return <Loader />
  }

  return (
    <React.Fragment>
      <Card style={{ padding: "2rem" }}>
        <CardSectionHeader>{t("STUDIO_CREATE_NEW_FORMS")}</CardSectionHeader>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Button
              // className="custom-class"
              //icon="Delete"
              //iconFill=""
              label={t(`STUDIO_CREATE_NEW_FORMS_SUB_HEADER`)}
              onClick={() =>
                (window.location.href = `/${window?.contextPath}/employee/servicedesigner/form-builder?variant=app&masterName=FormBuilder&fieldType=FieldTypeMappingConfig&prefix=CMP-2025-07-24-006759&localeModule=APPONE&tenantId=dev&campaignNumber=CMP-2025-07-24-006759&formId=default&projectType=Bednet&module=${module}&service=${service}`)
              }
              size="medium"
              style={{width: "100%", height: "5rem"}}
              title=""
              variation="secondary"
            />
        </div>
      </Card>
      <Card style={{paddingLeft:"2rem"}}>
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
            optionsKey="i18nKey"
            selectedOption={selectedTab}
            onSelect={(val) => setSelectedTab(val)}
            type="toggle"
          />
        </div>

        {moduleListLoading ? (
          <div style={{ padding: "1rem" }}>Loading...</div>
        ) : selectedTab === "MY_FORMS" ? (
          formData.length > 0 ? (
            <div className="checklist-table" style={{ marginTop: "1rem" }}>
              <div
                className="checklist-table-header"
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "50px 0.75fr 150px 150px 100px",
                  fontWeight: "200",
                  backgroundColor: "#f0f0f0",
                  padding: "20px",
                  borderRadius: "4px",
                }}
              >
                <div>{t("STUDIO_SNO")}</div>
                <div>{t("STUDIO_FORMS_NAME")}</div>
                <div>{t("STUDIO_CREATED_DATE")}</div>
                <div>{t("STUDIO_CREATED_ACTIONS")}</div>
              </div>

              {formData.map((item, index) => (
                <div
                  key={item.id}
                  className="checklist-table-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "50px 0.75fr 150px 150px 100px",
                    padding: "20px",
                    borderBottom: "1px solid #e0e0e0",
                  }}
                >
                  <div>{index + 1}</div>
                  <div>
                    <div style={{ fontWeight: "400" }}>{item.name}</div>
                    <div
                      style={{ fontSize: "12px", color: "#555" }}
                    >
                      {item.description}
                    </div>
                  </div>
                  <div>{item.createdDate}</div>
                  <div>
                    <button
                      style={{ color: "#c84c0e", fontSize: "14px", width:"4rem" }}
                      onClick={() => history.push(`/${window.contextPath}/employee/servicedesigner/form-builder?variant=app&masterName=FormBuilder&fieldType=FieldTypeMappingConfig&prefix=CMP-2025-07-24-006759&localeModule=APPONE&tenantId=dev&campaignNumber=CMP-2025-07-24-006759&formId=default&projectType=Bednet&module=${item?.item?.data?.module}&service=${item?.item?.data?.service}&formName=${item?.name}&editMode=true`)}
                    >
                      {t("STUDIO_EDIT")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: "1rem" }}>{t("STUDIO_NO_FORMS_AVAILABLE")}</div>
          )
        ) : (
          <div style={{ padding: "1rem", color: "#666" }}>
           {t("STUDIO_NO_DATA_AVAILABLE")}
          </div>
        )}
      </Card>
    </React.Fragment>
  );
};

export default FormHomePage;
