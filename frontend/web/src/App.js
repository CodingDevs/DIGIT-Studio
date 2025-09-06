import React from "react";
import { initLibraries } from "@egovernments/digit-ui-libraries";
import { DigitUI } from "@egovernments/digit-ui-module-core";
import { UICustomizations } from "./Customisations/UICustomizations";
import { initPublicServiceComponents } from "@egovernments/digit-ui-module-public-services";
import { initOpenPaymentComponents } from "@egovernments/digit-ui-module-open-payment";
import { initServiceDesignerComponents } from "@egovernments/digit-ui-module-service-designer";
import { initHRMSComponents } from "@egovernments/digit-ui-module-hrms";
import { initWorkbenchComponents } from "@egovernments/digit-ui-module-workbench";


window.contextPath = window?.globalConfigs?.getConfig("CONTEXT_PATH");

const enabledModules = [
  "DSS",
  "NDSS",
  "Utilities",
  // "HRMS",
  "Engagement",
  "Workbench",
  "HCMWORKBENCH",
  "PublicServices",
  "OpenPayment",
  "ServiceDesigner",
  "HRMS"

];

const moduleReducers = (initData) => ({
  initData,
});

const initDigitUI = () => {
  window.Digit.ComponentRegistryService.setupRegistry({});
  window.Digit.Customizations = {
    PGR: {},
    commonUiConfig: UICustomizations,
  };
  initPublicServiceComponents();
  initOpenPaymentComponents();
  initServiceDesignerComponents();
  initHRMSComponents();
  initWorkbenchComponents();

};

initLibraries().then(() => {
  initDigitUI();
});

function App() {
  window.contextPath = window?.globalConfigs?.getConfig("CONTEXT_PATH");
  const stateCode =
    window.globalConfigs?.getConfig("STATE_LEVEL_TENANT_ID") ||
    process.env.REACT_APP_STATE_LEVEL_TENANT_ID;
  if (!stateCode) {
    return <h1>stateCode is not defined</h1>;
  }
  return (
    <DigitUI
      stateCode={stateCode}
      enabledModules={enabledModules}
      moduleReducers={moduleReducers}
      defaultLanding="employee"
    />
  );
}

export default App;
