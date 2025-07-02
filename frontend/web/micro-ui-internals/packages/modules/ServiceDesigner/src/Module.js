import { Loader } from "@egovernments/digit-ui-components";
import React, { useEffect, useState } from "react";
import { useRouteMatch } from "react-router-dom";
import { default as EmployeeApp } from "./pages/employee";
import ServiceDesignerCard from "./components/ServiceDesignerCard";

export const ServiceDesignerModule = ({ stateCode, userType, tenants }) => {
  const { path } = useRouteMatch();
  const language = Digit.StoreData.getCurrentLanguage();

  let moduleCode = ["sample", "common", "workflow", "servicedesigner"];

  const { isLoading: storeLoading, data: store } = Digit.Services.useStore({
    stateCode,
    moduleCode,
    language,
  });

  if (storeLoading) {
    return <Loader page={true} variant={"PageLoader"} />;
  }
  
  return <EmployeeApp path={path} stateCode={stateCode} userType={userType} tenants={tenants} />;
};

const componentsToRegister = {
  ServiceDesignerModule,
  ServiceDesignerCard,
};

export const initServiceDesignerComponents = () => {
  //updateCustomConfigs();
  Object.entries(componentsToRegister).forEach(([key, value]) => {
    Digit.ComponentRegistryService.setComponent(key, value);
  });
};
