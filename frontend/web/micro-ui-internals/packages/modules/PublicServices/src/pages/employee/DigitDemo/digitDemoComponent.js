import { FormComposerV2, Stepper, Toast } from "@egovernments/digit-ui-components";
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useParams } from "react-router-dom";
import { serviceConfigPGR } from "../../../configs/serviceConfigurationPGR";
import { serviceConfig } from "../../../configs/serviceConfiguration";
import { generateFormConfig } from "../../../utils/generateFormConfigFromSchemaUtil";
import { transformToApplicationPayload } from "../../../utils";
import { Loader } from "@egovernments/digit-ui-react-components";

const DigitDemoComponent = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const [showToast, setShowToast] = useState(null);
  const { module, service } = useParams();
  const serviceCode = `${module.toUpperCase()}_${service.toUpperCase()}`;
  const tenantId = Digit.ULBService.getCurrentTenantId();
  const queryStrings = Digit.Hooks.useQueryParams();

  // Load from localStorage
  const savedStep = parseInt(localStorage.getItem("currentStep"), 10) || 1;
   let savedFormData = JSON.parse(localStorage.getItem("formData") || "{}");

  const [currentStep, setCurrentStep] = useState(savedStep);
  const [formData, setFormData] = useState(savedFormData);
  const [sessionData, setSessionData] = useState(savedFormData);

  const requestCriteria = {
    url: "/egov-mdms-service/v2/_search",
    body: {
      MdmsCriteria: {
        tenantId: tenantId,
        schemaCode: "Studio.ServiceConfiguration",
      },
    },
  };

  const { isLoading: moduleListLoading, data } = Digit.Hooks.useCustomAPIHook(requestCriteria);

  const config = data?.mdms?.find((item) =>
    item?.uniqueIdentifier.toLowerCase() === `${module}.${service}`.toLowerCase()
  );
  const workflowrequestCriteria = {
    url: "/egov-workflow-v2/egov-wf/businessservice/_search",
    params: {
      tenantId: tenantId,
      businessServices : config?.data?.workflow?.businessService,
    },
    config:{
      enabled : config?.data?.workflow?.businessService ? true : false
    }
  };

  const { isLoading: workflowDetailsLoading, data : workflowDetails } = Digit.Hooks.useCustomAPIHook(workflowrequestCriteria);

  const Updatedconfig = {
    ServiceConfiguration: [config?.data],
    tenantId,
    module,
  };

  // const configMap = {
  //   pgr: serviceConfigPGR,
  //   TradeLicense: serviceConfig
  // };
  // console.log(configMap[module],"configMap")

  const rawConfig = generateFormConfig(Updatedconfig, module.toUpperCase(), service?.toUpperCase());
  console.log(rawConfig,"rawconfig");
  const steps = rawConfig.map((config) => config.head || config.label || "Untitled Section");
  const currentFormConfig = rawConfig[currentStep - 1];
  const schemaCode = queryStrings?.serviceCode;

  const reqCreate = {
    url: `/public-service/v1/application/${schemaCode}`,
    params: {},
    body: {},
    method: "POST",
    headers: {},
    config: {
      enable: false,
    },
  };

  const mutation = Digit.Hooks.useCustomAPIMutationHook(reqCreate);

  const persistData = (updatedFormData, updatedStep) => {
    localStorage.setItem("formData", JSON.stringify(updatedFormData));
    localStorage.setItem("currentStep", updatedStep.toString());
    sessionStorage.setItem("formData", JSON.stringify(updatedFormData));
    setSessionData(updatedFormData);
  };

  const onSubmit = async (data) => {
    const sectionName = currentFormConfig.name || `section_${currentStep}`;
    const updatedFormData =
      currentFormConfig?.type === "multiChildForm" || currentFormConfig?.type === "documents"
        ? { ...formData, ...data }
        : { ...formData, [sectionName]: data };

    const isLastStep = currentStep === rawConfig.length;

    setFormData(updatedFormData);
    persistData(updatedFormData, currentStep);
    if (!isLastStep) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      persistData(updatedFormData, nextStep);
    } else {
      // Final Submit
      await mutation.mutate(
        {
          url: `/public-service/v1/application/${schemaCode}`,
          params: {},
          headers: { "x-tenant-id": tenantId },
          method: "POST",
          body: transformToApplicationPayload(updatedFormData, Updatedconfig, service, tenantId, config, workflowDetails),
          config: {
            enable: true,
          },
        },
        {
          onSuccess: (data) => {
            localStorage.removeItem("formData");
            localStorage.removeItem("currentStep");
            sessionStorage.removeItem("formData");
            history.push({
              pathname: `/${window.contextPath}/employee/publicservices/${module}/${service}/response`,
              search: "?isSuccess=true",
              state: {
                message: "Application Created Successfully",
                showID: true,
                applicationNumber: data?.Application?.applicationNumber,
                redirectionUrl: `/${window.contextPath}/employee/publicservices/${module}/${service}/ViewScreen?applicationNumber=${data?.Application?.applicationNumber}&serviceCode=${schemaCode}`,
              },
            });
          },
          onError: () => {
            history.push({
              pathname: `/${window.contextPath}/employee/publicservices/${module}/response`,
              search: "?isSuccess=false",
              state: {
                message: "Application Creation Failed",
                showID: false,
              },
            });
          },
        }
      );
    }
  };

  const onStepperClick = (stepIndex) => {
    const clickedStepIndex = stepIndex + 1;
    const clickedHead = rawConfig[stepIndex].name;
    if (Object.keys(formData).includes(clickedHead)) {
      setCurrentStep(clickedStepIndex);
      localStorage.setItem("currentStep", clickedStepIndex.toString());
    }
  };

  const onFormValueChange = (_, updatedData) => {
    const sectionName = currentFormConfig.name || `section_${currentStep}`;
    const updatedSectionData = updatedData[sectionName] || updatedData;

    const updatedFormData = { ...formData, [sectionName]: updatedSectionData };

    // Compare current with session data
    const sessionSectionData = sessionData?.[sectionName];
    const hasChanged = JSON.stringify(sessionSectionData) !== JSON.stringify(updatedSectionData);

    if (hasChanged) {
      setFormData(updatedFormData);
      persistData(updatedFormData, currentStep);
    }
  };

  const closeToast = () => {
    setShowToast(false);
  };

  if (moduleListLoading || workflowDetailsLoading) {
    return <Loader />;
  }

  return (
    <React.Fragment>
      <Stepper
        customSteps={steps}
        currentStep={currentStep}
        onStepClick={onStepperClick}
        activeSteps={currentStep}
      />
      <FormComposerV2
        key={currentFormConfig?.name}
        heading={t(`${serviceCode}_HEADING`)}
        label={currentStep === steps.length ? t(`${serviceCode}_SUBMIT`) : t(`${serviceCode}_NEXT`)}
        config={[
          {
            ...currentFormConfig,
            body: currentFormConfig?.body?.filter((a) => !a.hideInEmployee),
          },
        ]}
        defaultValues={currentFormConfig?.type === "multiChildForm"? {...formData} : { ...formData[currentFormConfig?.name || `section_${currentStep}`] || {} }}
        onSubmit={onSubmit}
        fieldStyle={{ marginRight: 0 }}
        onFormValueChange={onFormValueChange}
      />
      {showToast && (
        <Toast
          style={{ zIndex: "10000" }}
          error={showToast?.error}
          label={t(showToast?.message)}
          onClose={closeToast}
          isDleteBtn={true}
        />
      )}
    </React.Fragment>
  );
};

export default DigitDemoComponent;
